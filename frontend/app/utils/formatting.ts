/**
 * Formatting Utilities
 * Common formatting functions for the application
 */

/**
 * Format currency in AUD
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
}

/**
 * Format date in Australian format (DD/MM/YYYY)
 */
export function formatDateAU(date: string | Date): string {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateFormat('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateObj);
}

/**
 * Format datetime in Australian format
 */
export function formatDateTimeAU(datetime: string | Date): string {
  if (!datetime) return '';
  const dateObj = typeof datetime === 'string' ? new Date(datetime) : datetime;
  return new Intl.DateFormat('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Format phone number (Australian)
 */
export function formatPhoneAU(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Format based on length
  if (digits.length === 10) {
    // Mobile: 0412 345 678
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  } else if (digits.length === 8) {
    // Landline: 1234 5678
    return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  }
  
  return phone;
}

/**
 * Format ABN
 */
export function formatABN(abn: string): string {
  if (!abn) return '';
  
  // Remove all non-digit characters
  const digits = abn.replace(/\D/g, '');
  
  // Format as XX XXX XXX XXX
  if (digits.length === 11) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  
  return abn;
}

