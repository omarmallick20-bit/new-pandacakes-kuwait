/**
 * Retry utility with exponential backoff for Supabase operations
 * 
 * Implements smart retry logic that:
 * - Retries network errors, timeouts, and 5xx errors
 * - Skips RLS policy violations and auth errors (won't succeed on retry)
 * - Uses exponential backoff (1s, 2s, 4s)
 * - Logs retry attempts for debugging
 */

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  shouldRetry?: (error: any) => boolean;
  operationName?: string;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry'>> = {
  maxRetries: 2,
  initialDelayMs: 300,
  operationName: 'Supabase operation',
};

/**
 * Determines if an error should be retried based on its type
 */
function isRetryableError(error: any): boolean {
  // Network errors
  if (error?.message?.includes('network') || 
      error?.message?.includes('fetch') ||
      error?.message?.includes('timeout')) {
    return true;
  }

  // Supabase error codes
  if (error?.code) {
    // RLS policy violation - don't retry
    if (error.code === '42501' || error.code === 'PGRST301') {
      console.log(`🔒 RLS policy violation detected - not retrying`);
      return false;
    }

    // Auth errors - don't retry
    if (error.code === 'PGRST204' || error.message?.includes('JWT')) {
      console.log(`🔐 Auth error detected - not retrying`);
      return false;
    }

    // Client errors (4xx) - don't retry
    if (error.code?.startsWith('4')) {
      return false;
    }

    // Server errors (5xx) - retry
    if (error.code?.startsWith('5')) {
      return true;
    }
  }

  // HTTP status codes
  if (error?.status) {
    // Don't retry 4xx client errors
    if (error.status >= 400 && error.status < 500) {
      return false;
    }
    
    // Retry 5xx server errors
    if (error.status >= 500) {
      return true;
    }
  }

  // Aborted requests - don't retry
  if (error?.name === 'AbortError') {
    return false;
  }

  // Default to retry for unknown errors
  return true;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a Supabase operation with exponential backoff
 * 
 * @example
 * const { data, error } = await retryWithBackoff(
 *   () => supabase.from('table').select('*'),
 *   { operationName: 'fetchData' }
 * );
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries,
    initialDelayMs,
    operationName,
  } = { ...DEFAULT_OPTIONS, ...options };

  const shouldRetryFn = options.shouldRetry || isRetryableError;

  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      
      // If this was a retry that succeeded, log it
      if (attempt > 0) {
        console.log(`✅ [${operationName}] Succeeded on attempt ${attempt + 1}/${maxRetries + 1}`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if we should retry this error
      const shouldRetry = shouldRetryFn(error);
      
      // If this is the last attempt or we shouldn't retry, throw
      if (attempt === maxRetries || !shouldRetry) {
        if (shouldRetry) {
          console.error(`❌ [${operationName}] Failed after ${attempt + 1} attempts:`, error);
        }
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delayMs = initialDelayMs * Math.pow(2, attempt);
      
      console.log(`🔄 [${operationName}] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delayMs}ms...`);
      
      await sleep(delayMs);
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError;
}
