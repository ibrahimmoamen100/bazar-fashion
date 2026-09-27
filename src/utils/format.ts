/**
 * Formats a number to include commas as thousand separators
 * @param number The number to format
 * @returns The formatted number as a string
 */
export const formatPrice = (number: number): string => {
  const num = Number(number);
  if (isNaN(num) || !isFinite(num)) return "0";
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

/**
 * Formats a number for display with proper thousand separators (no decimals)
 * @param number The number to format
 * @returns The formatted number as a string
 */
export const formatNumber = (number: number): string => {
  const num = Number(number);
  if (isNaN(num) || !isFinite(num)) return "0";
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

/**
 * Formats currency with proper Arabic formatting
 * @param number The number to format
 * @param currency The currency symbol (default: 'ج.م')
 * @returns The formatted currency string
 */
export const formatCurrency = (number: number, currency: string = 'ج.م'): string => {
  const num = Number(number);
  if (isNaN(num) || !isFinite(num)) return `0 ${currency}`;
  return `${formatPrice(num)} ${currency}`;
};

/**
 * Formats large numbers with abbreviations (K, M, B)
 * @param number The number to format
 * @returns The formatted number with abbreviation
 */
export const formatLargeNumber = (number: number): string => {
  const num = Number(number);
  if (isNaN(num) || !isFinite(num)) return "0";
  
  const absNumber = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  if (absNumber >= 1000000000) {
    return `${sign}${(absNumber / 1000000000).toFixed(1)}B`;
  } else if (absNumber >= 1000000) {
    return `${sign}${(absNumber / 1000000).toFixed(1)}M`;
  } else if (absNumber >= 1000) {
    return `${sign}${(absNumber / 1000).toFixed(1)}K`;
  } else {
    return `${sign}${absNumber.toString()}`;
  }
};

/**
 * Formats percentage with proper formatting
 * @param number The percentage number
 * @param decimals Number of decimal places (default: 1)
 * @returns The formatted percentage string
 */
export const formatPercentage = (number: number, decimals: number = 1): string => {
  const num = Number(number);
  if (isNaN(num) || !isFinite(num)) return "0%";
  return `${num.toFixed(decimals)}%`;
};

/**
 * Convert Firestore Timestamp to Date
 * @param timestamp - Firestore Timestamp or Date object
 * @returns Date object
 */
export const convertTimestampToDate = (timestamp: any): Date => {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  
  // Fallback to current date if invalid
  return new Date();
};

/**
 * Format date for display
 * @param timestamp - Firestore Timestamp or Date object
 * @param locale - Locale string (default: 'ar-EG')
 * @returns Formatted date string
 */
export const formatDate = (timestamp: any, locale: string = 'ar-EG'): string => {
  const date = convertTimestampToDate(timestamp);
  return date.toLocaleDateString(locale);
};

/**
 * Format date and time for display
 * @param timestamp - Firestore Timestamp or Date object
 * @param locale - Locale string (default: 'ar-EG')
 * @returns Formatted date and time string
 */
export const formatDateTime = (timestamp: any, locale: string = 'ar-EG'): string => {
  const date = convertTimestampToDate(timestamp);
  return date.toLocaleString(locale);
};
