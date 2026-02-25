/**
 * Utility functions for displaying loyalty points/BakePoints
 * This is a Qatar-based website - all users see "BakePoints"
 * Redemption: 50 BakePoints = 1 QAR, valid for 12 months
 */

export interface PointsInfo {
  label: string;
  rate: number; // How many points = 1 currency unit in discount
  expiryMonths: number;
  currency: string;
  currencySymbol: string;
}

export const getPointsLabel = (countryId?: string | null): string => {
  // This is a Qatar-based website, so BakePoints is the default for all users
  return 'BakePoints';
};

export const getPointsRedemptionInfo = (countryId?: string | null): PointsInfo => {
  // Default to QAR/BakePoints (this website's default for all users)
  return {
    label: 'BakePoints',
    rate: 50, // 50 points = 1 QAR
    expiryMonths: 12,
    currency: 'QAR',
    currencySymbol: 'ر.ق'
  };
  
  // Note: If you expand to other countries in future, add conditional logic here
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
  return 'QAR'; // Qatar-only website
};

export const getCurrencySymbol = (countryId?: string): string => {
  return 'ر.ق'; // QAR symbol - Qatar-only website
};
