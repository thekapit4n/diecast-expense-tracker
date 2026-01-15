import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { DateTime } from "luxon"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a Date object to YYYY-MM-DD string for database storage
 * Uses Luxon to ensure dates are interpreted in the specified timezone
 * 
 * @param date - Date object to format (or null/undefined)
 * @param timezone - IANA timezone identifier (defaults to 'Asia/Kuala_Lumpur')
 * @returns Formatted date string (YYYY-MM-DD) or null if date is null/undefined
 */
export function formatDateForDatabase(
  date: Date | null | undefined,
  timezone: string = 'Asia/Kuala_Lumpur'
): string | null {
  if (!date) return null
  
  // Convert JavaScript Date to Luxon DateTime in specified timezone
  const dt = DateTime.fromJSDate(date, { zone: timezone })
  
  // Format as YYYY-MM-DD
  return dt.toFormat('yyyy-MM-dd')
}
