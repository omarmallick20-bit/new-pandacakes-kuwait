/**
 * Currency helper utilities for QAR (Qatari Riyal)
 * All prices in the application are in QAR
 */

export const CURRENCY_CODE = 'QAR';
export const CURRENCY_SYMBOL = 'ر.ق';

/**
 * Format amount as QAR with proper formatting
 * @param amount - The amount to format
 * @param includeSymbol - Whether to include the currency symbol
 * @returns Formatted string like "150.00 QAR" or "150.00"
 */
export function formatQAR(amount: number, includeSymbol: boolean = true): string {
  const formatted = amount.toFixed(2);
  return includeSymbol ? `${formatted} ${CURRENCY_CODE}` : formatted;
}

/**
 * Validate that an amount is a valid QAR amount (2 decimal places, positive)
 * @param amount - The amount to validate
 * @returns true if valid, false otherwise
 */
export function validateQARAmount(amount: number): boolean {
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    return false;
  }
  
  // Check that it has at most 2 decimal places
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  return decimalPlaces <= 2;
}

/**
 * Round amount to 2 decimal places for QAR
 * @param amount - The amount to round
 * @returns Rounded amount
 */
export function roundToQAR(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Convert QAR to fils (cents) - useful for some payment APIs
 * @param amount - The QAR amount
 * @returns Amount in fils (1 QAR = 100 fils)
 */
export function convertToQARFils(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert fils to QAR
 * @param fils - The amount in fils
 * @returns Amount in QAR
 */
export function convertFromQARFils(fils: number): number {
  return roundToQAR(fils / 100);
}

/**
 * Parse a string to QAR amount
 * @param value - String value to parse
 * @returns Parsed QAR amount or null if invalid
 */
export function parseQARAmount(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed) || !validateQARAmount(parsed)) {
    return null;
  }
  
  return roundToQAR(parsed);
}

/**
 * Format QAR amount for display in forms (without currency code)
 * @param amount - The amount to format
 * @returns Formatted string like "150.00"
 */
export function formatQARInput(amount: number): string {
  return amount.toFixed(2);
}
