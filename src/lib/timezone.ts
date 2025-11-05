import { format as formatDate, parseISO } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

/**
 * New Zealand timezone utilities
 * All analytics and date operations should use NZ time (Pacific/Auckland)
 */

export const NZ_TIMEZONE = 'Pacific/Auckland';

/**
 * Get current date/time in NZ timezone
 */
export function getNZDate(): Date {
  return toZonedTime(new Date(), NZ_TIMEZONE);
}

/**
 * Convert a date to NZ timezone
 */
export function toNZTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return toZonedTime(dateObj, NZ_TIMEZONE);
}

/**
 * Get start of day in NZ timezone
 */
export function getNZStartOfDay(date?: Date | string): Date {
  const dateObj = date
    ? (typeof date === 'string' ? parseISO(date) : date)
    : new Date();

  const nzDate = toZonedTime(dateObj, NZ_TIMEZONE);
  nzDate.setHours(0, 0, 0, 0);
  return nzDate;
}

/**
 * Format a date in NZ timezone
 * @param date - Date to format
 * @param formatString - Format string (defaults to 'yyyy-MM-dd HH:mm:ss')
 */
export function formatNZDate(date: Date | string, formatString: string = 'yyyy-MM-dd HH:mm:ss'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, NZ_TIMEZONE, formatString);
}

/**
 * Get NZ date in YYYY-MM-DD format
 */
export function getNZDateString(date?: Date | string): string {
  const dateObj = date
    ? (typeof date === 'string' ? parseISO(date) : date)
    : new Date();

  return formatInTimeZone(dateObj, NZ_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Format a date for display in NZ locale
 */
export function formatNZDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, NZ_TIMEZONE, 'dd/MM/yyyy h:mm a');
}

/**
 * Format a date for display (short format)
 */
export function formatNZDateShort(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, NZ_TIMEZONE, 'dd/MM/yyyy');
}

/**
 * Check if a date is today in NZ timezone
 */
export function isNZToday(date: Date | string): boolean {
  const today = getNZDateString();
  const checkDate = getNZDateString(date);
  return today === checkDate;
}

/**
 * Subtract days from a date in NZ timezone
 */
export function subtractNZDays(date: Date | string, days: number): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const nzDate = toZonedTime(dateObj, NZ_TIMEZONE);
  nzDate.setDate(nzDate.getDate() - days);
  return nzDate;
}
