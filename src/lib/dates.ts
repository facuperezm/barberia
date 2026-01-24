/**
 * Centralized date utilities for Argentina timezone
 * All date operations should use these functions to ensure consistency
 */

import { TZDate } from "@date-fns/tz";
import {
  format as dateFnsFormat,
  parse as dateFnsParse,
  getDay as dateFnsGetDay,
  addMinutes,
  addDays as dateFnsAddDays,
  startOfWeek as dateFnsStartOfWeek,
  isBefore,
  isAfter,
  startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";

// Argentina timezone
export const ARGENTINA_TZ = "America/Argentina/Buenos_Aires";

// Spanish (Argentina) locale for formatting
export const LOCALE = es;

/**
 * Create a date in Argentina timezone from a date string (YYYY-MM-DD)
 */
export function parseDate(dateStr: string): TZDate {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new TZDate(year, month - 1, day, 12, 0, 0, ARGENTINA_TZ);
}

/**
 * Create a date in Argentina timezone from Date object or timestamp
 */
export function toArgentinaDate(date: Date | number): TZDate {
  const timestamp = typeof date === "number" ? date : date.getTime();
  return new TZDate(timestamp, ARGENTINA_TZ);
}

/**
 * Get current date/time in Argentina timezone
 */
export function now(): TZDate {
  return new TZDate(new Date(), ARGENTINA_TZ);
}

/**
 * Get today's date at start of day in Argentina timezone
 */
export function today(): TZDate {
  const current = now();
  return new TZDate(
    current.getFullYear(),
    current.getMonth(),
    current.getDate(),
    0,
    0,
    0,
    ARGENTINA_TZ
  );
}

/**
 * Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
export function getDayOfWeek(date: TZDate | string): number {
  const tzDate = typeof date === "string" ? parseDate(date) : date;
  return dateFnsGetDay(tzDate);
}

/**
 * Format date to YYYY-MM-DD string
 */
export function formatDateISO(date: TZDate | Date): string {
  return dateFnsFormat(date, "yyyy-MM-dd");
}

/**
 * Format date for display in Spanish (Argentina)
 * Examples:
 *   "full" -> "viernes, 30 de enero de 2026"
 *   "long" -> "30 de enero de 2026"
 *   "medium" -> "30 ene 2026"
 *   "short" -> "30/01/2026"
 */
export function formatDate(
  date: TZDate | Date | string,
  style: "full" | "long" | "medium" | "short" = "long"
): string {
  const tzDate = typeof date === "string" ? parseDate(date) : date;

  const formats = {
    full: "EEEE, d 'de' MMMM 'de' yyyy",
    long: "d 'de' MMMM 'de' yyyy",
    medium: "d MMM yyyy",
    short: "dd/MM/yyyy",
  };

  return dateFnsFormat(tzDate, formats[style], { locale: LOCALE });
}

/**
 * Format time for display (24-hour format, common in Argentina)
 */
export function formatTime(time: string | Date): string {
  if (typeof time === "string") {
    // Normalize to HH:mm format (handles HH:mm:ss from database)
    return time.slice(0, 5);
  }
  return dateFnsFormat(time, "HH:mm");
}

/**
 * Normalize time string to HH:mm format
 * Handles: "13:00", "13:00:00", "9:00" -> "09:00"
 */
export function normalizeTime(time: string): string {
  // Remove seconds if present
  const withoutSeconds = time.slice(0, 5);
  // Ensure HH:mm format (pad single digit hours)
  const parts = withoutSeconds.split(":");
  if (parts.length === 2) {
    const hours = parts[0].padStart(2, "0");
    const minutes = parts[1].padStart(2, "0");
    return `${hours}:${minutes}`;
  }
  return withoutSeconds;
}

/**
 * Format day name in Spanish
 */
export function formatDayName(
  dayIndex: number,
  style: "long" | "short" = "long"
): string {
  // Create a date that falls on the correct day of week
  // Jan 4, 2026 is a Sunday (day 0)
  const baseDate = new TZDate(2026, 0, 4 + dayIndex, 12, 0, 0, ARGENTINA_TZ);
  return dateFnsFormat(baseDate, style === "long" ? "EEEE" : "EEE", {
    locale: LOCALE,
  });
}

/**
 * Get day name from day index
 */
export const DAY_NAMES = {
  long: [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ],
  short: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
  initial: ["D", "L", "M", "M", "J", "V", "S"],
} as const;

/**
 * Generate time slots between start and end times
 */
export function generateTimeSlots(
  start: string,
  end: string,
  durationMinutes: number = 30
): string[] {
  const slots: string[] = [];

  // Normalize times to HH:mm format (handles HH:mm:ss from database)
  const normalizedStart = normalizeTime(start);
  const normalizedEnd = normalizeTime(end);

  // Parse times as dates on a reference day
  let current = dateFnsParse(normalizedStart, "HH:mm", new Date(2000, 0, 1));
  const endTime = dateFnsParse(normalizedEnd, "HH:mm", new Date(2000, 0, 1));

  while (isBefore(current, endTime)) {
    slots.push(dateFnsFormat(current, "HH:mm"));
    current = addMinutes(current, durationMinutes);
  }

  return slots;
}

/**
 * Check if a time slot overlaps with an appointment
 */
export function isSlotBlocked(
  slotTime: string,
  slotDuration: number,
  appointmentTime: string,
  appointmentDuration: number
): boolean {
  const refDate = new Date(2000, 0, 1);

  // Normalize times to HH:mm format
  const normalizedSlot = normalizeTime(slotTime);
  const normalizedApt = normalizeTime(appointmentTime);

  const slotStart = dateFnsParse(normalizedSlot, "HH:mm", refDate);
  const slotEnd = addMinutes(slotStart, slotDuration);

  const aptStart = dateFnsParse(normalizedApt, "HH:mm", refDate);
  const aptEnd = addMinutes(aptStart, appointmentDuration);

  // Check for any overlap
  return (
    (isBefore(slotStart, aptEnd) && isAfter(slotEnd, aptStart)) ||
    slotStart.getTime() === aptStart.getTime()
  );
}

/**
 * Check if a date is in the past (before today in Argentina)
 */
export function isPastDate(date: TZDate | string): boolean {
  const tzDate = typeof date === "string" ? parseDate(date) : date;
  const todayStart = startOfDay(today());
  return isBefore(tzDate, todayStart);
}

/**
 * Check if a date is today in Argentina timezone
 */
export function isToday(date: TZDate | string): boolean {
  const tzDate = typeof date === "string" ? parseDate(date) : date;
  const todayDate = today();
  return (
    tzDate.getFullYear() === todayDate.getFullYear() &&
    tzDate.getMonth() === todayDate.getMonth() &&
    tzDate.getDate() === todayDate.getDate()
  );
}

/**
 * Add days to a date, maintaining Argentina timezone
 */
export function addDays(date: TZDate | Date, days: number): TZDate {
  const tzDate = date instanceof TZDate ? date : toArgentinaDate(date);
  const result = dateFnsAddDays(tzDate, days);
  return toArgentinaDate(result);
}

/**
 * Get start of week for a date in Argentina timezone
 * Week starts on Sunday (default in Argentina)
 */
export function startOfWeek(date: TZDate | Date): TZDate {
  const tzDate = date instanceof TZDate ? date : toArgentinaDate(date);
  const result = dateFnsStartOfWeek(tzDate);
  return toArgentinaDate(result);
}

/**
 * Generate week days starting from a date
 * Returns array of {value: "YYYY-MM-DD", label: "full Spanish date"}
 */
export function getWeekDays(startDate?: TZDate | Date): { value: string; label: string }[] {
  const start = startDate ? (startDate instanceof TZDate ? startDate : toArgentinaDate(startDate)) : today();
  const weekStart = startOfWeek(start);

  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      value: formatDateISO(date),
      label: formatDate(date, "full"),
    };
  });
}
