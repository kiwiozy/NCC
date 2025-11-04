/**
 * Date formatting utilities for Australian timezone (Australia/Sydney)
 * 
 * This ensures all dates are displayed consistently in Australian Eastern Time,
 * regardless of the user's browser timezone settings.
 */

import { DateTime } from 'luxon';

// Australian timezone constant
export const AUSTRALIA_TIMEZONE = 'Australia/Sydney';

/**
 * Format a date string or Date object to Australian timezone
 * 
 * @param date - ISO string, Date object, or DateTime object
 * @param format - Format string (default: 'DD/MM/YYYY h:mm:ss a')
 * @returns Formatted date string in Australian timezone
 */
export function formatDateAU(
  date: string | Date | DateTime | null | undefined,
  format: string = 'DD/MM/YYYY h:mm:ss a'
): string {
  if (!date) return '';

  try {
    let dateTime: DateTime;

    if (date instanceof DateTime) {
      dateTime = date;
    } else if (date instanceof Date) {
      dateTime = DateTime.fromJSDate(date);
    } else if (typeof date === 'string') {
      // Check if date string contains letters (month names) - don't parse formatted dates
      if (/[A-Za-z]{3}/.test(date)) {
        console.warn('formatDateAU called on already-formatted date:', date);
        return ''; // Return empty to prevent corruption
      }
      // Assume ISO string
      dateTime = DateTime.fromISO(date);
    } else {
      return '';
    }

    // Check if DateTime is valid before formatting
    if (!dateTime.isValid) {
      console.warn('Invalid DateTime created from:', date);
      return '';
    }

    // Convert to Australian timezone and format
    return dateTime.setZone(AUSTRALIA_TIMEZONE).toFormat(format);
  } catch (error) {
    console.error('Error formatting date:', error, 'input:', date);
    return '';
  }
}

/**
 * Format date only (no time) in Australian timezone
 * 
 * @param date - ISO string, Date object, or DateTime object
 * @returns Formatted date string (DD/MM/YYYY)
 */
export function formatDateOnlyAU(date: string | Date | DateTime | null | undefined): string {
  // CRITICAL: If date is a string with letters (month names), don't process it
  // This prevents formatDateOnlyAU from being called on already-formatted dates
  if (typeof date === 'string' && /[A-Za-z]{3}/.test(date.trim())) {
    console.error('formatDateOnlyAU called on already-formatted date:', date);
    return ''; // Return empty to prevent corruption
  }
  return formatDateAU(date, 'DD/MM/YYYY');
}

/**
 * Format time only in Australian timezone
 * 
 * @param date - ISO string, Date object, or DateTime object
 * @returns Formatted time string (h:mm:ss a)
 */
export function formatTimeOnlyAU(date: string | Date | DateTime | null | undefined): string {
  return formatDateAU(date, 'h:mm:ss a');
}

/**
 * Format date and time in a user-friendly format for Australian timezone
 * 
 * @param date - ISO string, Date object, or DateTime object
 * @returns Formatted date string (e.g., "03/11/2024 2:05:00 PM")
 */
export function formatDateTimeAU(date: string | Date | DateTime | null | undefined): string {
  return formatDateAU(date, 'DD/MM/YYYY h:mm:ss a');
}

/**
 * Format date in a short format for Australian timezone
 * 
 * @param date - ISO string, Date object, or DateTime object
 * @returns Formatted date string (DD/MM/YYYY HH:mm)
 */
export function formatShortDateTimeAU(date: string | Date | DateTime | null | undefined): string {
  return formatDateAU(date, 'DD/MM/YYYY HH:mm');
}

/**
 * Get current date/time in Australian timezone
 * 
 * @returns DateTime object set to Australian timezone
 */
export function getCurrentTimeAU(): DateTime {
  return DateTime.now().setZone(AUSTRALIA_TIMEZONE);
}

/**
 * Parse a date string and convert to Australian timezone
 * 
 * @param dateString - ISO date string
 * @returns DateTime object in Australian timezone
 */
export function parseToAUTimezone(dateString: string): DateTime {
  return DateTime.fromISO(dateString).setZone(AUSTRALIA_TIMEZONE);
}

/**
 * Get relative time (e.g., "2 hours ago") in Australian timezone
 * 
 * @param date - ISO string, Date object, or DateTime object
 * @returns Relative time string
 */
export function getRelativeTimeAU(date: string | Date | DateTime | null | undefined): string {
  if (!date) return '';

  try {
    let dateTime: DateTime;

    if (date instanceof DateTime) {
      dateTime = date;
    } else if (date instanceof Date) {
      dateTime = DateTime.fromJSDate(date);
    } else {
      dateTime = DateTime.fromISO(date);
    }

    const auDateTime = dateTime.setZone(AUSTRALIA_TIMEZONE);
    const now = getCurrentTimeAU();
    return auDateTime.toRelative({ base: now }) || '';
  } catch (error) {
    console.error('Error getting relative time:', error);
    return '';
  }
}

