/**
 * Date formatting utilities for Australian timezone (AEST/AEDT)
 * Uses Luxon for consistent timezone handling
 */

import { DateTime } from 'luxon';

const TIMEZONE = 'Australia/Sydney';

/**
 * Format a date string to Australian format: DD/MM/YYYY HH:MM AEST/AEDT
 */
export function formatDateTimeAU(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  
  try {
    const dt = DateTime.fromISO(dateString, { zone: TIMEZONE });
    if (!dt.isValid) return 'Invalid date';
    
    return dt.toFormat('dd/MM/yyyy HH:mm ZZZZ');
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format a date string to Australian date only: DD/MM/YYYY
 */
export function formatDateOnlyAU(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  
  try {
    const dt = DateTime.fromISO(dateString, { zone: TIMEZONE });
    if (!dt.isValid) return 'Invalid date';
    
    return dt.toFormat('dd/MM/yyyy');
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format a date string to display format: DD MMM YYYY (e.g., 05 Nov 2025)
 */
export function formatDateAU(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  
  try {
    const dt = DateTime.fromISO(dateString, { zone: TIMEZONE });
    if (!dt.isValid) return 'Invalid date';
    
    return dt.toFormat('dd MMM yyyy');
  } catch (error) {
    return 'Invalid date';
  }
}

