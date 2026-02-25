/**
 * Currency helper utilities
 * Uses dynamic currency from country config
 */

import { DEFAULT_CURRENCY, DEFAULT_CURRENCY_SYMBOL, CURRENCY_DECIMALS } from '@/config/country';

export const CURRENCY_CODE = DEFAULT_CURRENCY;
export const CURRENCY_SYMBOL = DEFAULT_CURRENCY_SYMBOL;

const DECIMAL_FACTOR = Math.pow(10, CURRENCY_DECIMALS); // 1000 for KWD, 100 for QAR

/**
 * Format amount with proper formatting
 */
export function formatCurrency(amount: number, includeSymbol: boolean = true): string {
  const formatted = amount.toFixed(CURRENCY_DECIMALS);
  return includeSymbol ? `${formatted} ${CURRENCY_CODE}` : formatted;
}

/**
 * Validate that an amount is valid (correct decimal places, positive)
 */
export function validateAmount(amount: number): boolean {
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    return false;
  }
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  return decimalPlaces <= CURRENCY_DECIMALS;
}

/**
 * Round amount to correct decimal places
 */
export function roundToCurrency(amount: number): number {
  return Math.round(amount * DECIMAL_FACTOR) / DECIMAL_FACTOR;
}

/**
 * Convert to fils/smallest unit
 */
export function convertToFils(amount: number): number {
  return Math.round(amount * DECIMAL_FACTOR);
}

/**
 * Convert from fils/smallest unit
 */
export function convertFromFils(fils: number): number {
  return roundToCurrency(fils / DECIMAL_FACTOR);
}

/**
 * Parse a string to currency amount
 */
export function parseCurrencyAmount(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed) || !validateAmount(parsed)) {
    return null;
  }
  return roundToCurrency(parsed);
}

/**
 * Format amount for display in forms (without currency code)
 */
export function formatCurrencyInput(amount: number): string {
  return amount.toFixed(CURRENCY_DECIMALS);
}

// Backward-compatible aliases
export const formatQAR = formatCurrency;
export const validateQARAmount = validateAmount;
export const roundToQAR = roundToCurrency;
export const convertToQARFils = convertToFils;
export const convertFromQARFils = convertFromFils;
export const parseQARAmount = parseCurrencyAmount;
export const formatQARInput = formatCurrencyInput;
