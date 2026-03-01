/**
 * Utility functions for displaying loyalty points/BakePoints
 * This is a Kuwait-based website - all users see "BakePoints"
 * Redemption: 500 BakePoints = 1 KWD, valid for 12 months
 */

export interface PointsInfo {
  label: string;
  rate: number; // How many points = 1 currency unit in discount
  expiryMonths: number;
  currency: string;
  currencySymbol: string;
}

export const getPointsLabel = (countryId?: string | null): string => {
  // This is a Kuwait-based website, so BakePoints is the default for all users
  return 'BakePoints';
};

export const getPointsRedemptionInfo = (countryId?: string | null): PointsInfo => {
  if (countryId === 'qa') {
    return {
      label: 'BakePoints',
      rate: 50, // 50 points = 1 QAR
      expiryMonths: 12,
      currency: 'QAR',
      currencySymbol: 'ر.ق'
    };
  }
  // Default to KWD/BakePoints (Kuwait)
  return {
    label: 'BakePoints',
    rate: 500, // 500 points = 1 KWD
    expiryMonths: 12,
    currency: 'KWD',
    currencySymbol: 'د.ك'
  };
};

export const calculateDiscount = (points: number, countryId?: string | null): number => {
  const info = getPointsRedemptionInfo(countryId);
  return points / info.rate;
};

export const formatPointsExpiry = (expiryDate: string | Date): string => {
  const date = new Date(expiryDate);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

export const getCurrencyForOrder = (countryId?: string): string => {
  return 'KWD'; // Kuwait-only website
};

export const getCurrencySymbol = (countryId?: string): string => {
  return 'د.ك'; // KWD symbol - Kuwait-only website
};