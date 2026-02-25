/**
 * Country configuration derived from the VITE_COUNTRY_ID environment variable.
 * 
 * Each deployment sets this once:
 *   Qatar  → VITE_COUNTRY_ID=qa
 *   Kuwait → VITE_COUNTRY_ID=kw
 *   Saudi  → VITE_COUNTRY_ID=sa
 */

export const COUNTRY_ID: string = import.meta.env.VITE_COUNTRY_ID || 'qa';

const COUNTRY_MAP: Record<string, { name: string; phoneCode: string; currency: string; currencySymbol: string; defaultCountryLabel: string }> = {
  qa: { name: 'Qatar', phoneCode: '+974', currency: 'QAR', currencySymbol: 'ر.ق', defaultCountryLabel: 'Qatar' },
  kw: { name: 'Kuwait', phoneCode: '+965', currency: 'KWD', currencySymbol: 'د.ك', defaultCountryLabel: 'Kuwait' },
  sa: { name: 'Saudi Arabia', phoneCode: '+966', currency: 'SAR', currencySymbol: 'ر.س', defaultCountryLabel: 'Saudi Arabia' },
};

const current = COUNTRY_MAP[COUNTRY_ID] || COUNTRY_MAP.qa;

export const COUNTRY_NAME = current.name;
export const PHONE_COUNTRY_CODE = current.phoneCode;
export const DEFAULT_CURRENCY = current.currency;
export const DEFAULT_CURRENCY_SYMBOL = current.currencySymbol;
export const DEFAULT_COUNTRY_LABEL = current.defaultCountryLabel;
