/**
 * Timeout and abort utilities for Supabase queries
 * Prevents infinite loading states from hanging requests
 */

export interface TimeoutOptions {
  timeoutMs?: number;
  operationName?: string;
}

const DEFAULT_TIMEOUT_MS = 8000; // 8 seconds

/**
 * Wraps a Supabase query with timeout and abort signal
 * Returns result or throws on timeout/abort
 */
export async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: TimeoutOptions = {}
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, operationName = 'operation' } = options;
  
  const controller = new AbortController();
  const { signal } = controller;
  
  const timeoutId = setTimeout(() => {
    console.warn(`⏱️ [${operationName}] Timeout after ${timeoutMs}ms - aborting`);
    controller.abort();
  }, timeoutMs);
  
  try {
    const result = await operation(signal);
    return result;
  } catch (error: any) {
    if (error?.name === 'AbortError' || signal.aborted) {
      throw new Error(`${operationName} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Wraps a Supabase query with timeout - auto-manages AbortController internally
 * Use when you want guaranteed timeout without managing AbortController yourself
 */
export async function withTimeoutAutoAbort<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: TimeoutOptions = {}
): Promise<{ data: T | null; timedOut: boolean; error: Error | null }> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, operationName = 'operation' } = options;
  
  const controller = new AbortController();
  const { signal } = controller;
  
  let timedOut = false;
  
  const timeoutId = setTimeout(() => {
    console.warn(`⏱️ [${operationName}] Timeout after ${timeoutMs}ms - aborting`);
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  
  try {
    const result = await operation(signal);
    return { data: result, timedOut: false, error: null };
  } catch (error: any) {
    if (error?.name === 'AbortError' || signal.aborted || timedOut) {
      return { data: null, timedOut: true, error: new Error(`${operationName} timed out after ${timeoutMs}ms`) };
    }
    return { data: null, timedOut: false, error };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Creates a stale request guard to prevent late responses from overwriting state
 * Returns a tuple: [requestId, isStale function]
 */
export function createRequestGuard(): {
  getRequestId: () => number;
  incrementAndGet: () => number;
  isStale: (id: number) => boolean;
} {
  let currentRequestId = 0;
  
  return {
    getRequestId: () => currentRequestId,
    incrementAndGet: () => ++currentRequestId,
    isStale: (id: number) => id !== currentRequestId,
  };
}
