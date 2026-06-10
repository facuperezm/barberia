/**
 * Input sanitization utilities to prevent XSS and injection attacks
 */

/**
 * Sanitizes a plain text string by removing HTML tags
 * @param input - Raw text string
 * @returns Plain text without HTML tags
 */
export function sanitizeText(input: string): string {
  if (!input) return "";
  return input.replace(/<[^>]*>/g, "").trim();
}

/**
 * Sanitizes email input
 * @param email - Email string
 * @returns Sanitized and normalized email
 */
export function sanitizeEmail(email: string): string {
  if (!email) return "";
  return email.toLowerCase().trim();
}

/**
 * Sanitizes phone number by removing non-numeric characters
 * @param phone - Phone number string
 * @returns Numeric phone string
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

/**
 * Validates and sanitizes a date string
 * @param date - Date string (YYYY-MM-DD format)
 * @returns Sanitized date string or empty if invalid
 */
export function sanitizeDate(date: string): string {
  if (!date) return "";

  // Validate YYYY-MM-DD format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return "";
  }

  // Check if it's a valid date
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return "";
  }

  return date;
}

/**
 * Validates and sanitizes a time string
 * @param time - Time string (HH:mm or HH:mm:ss format)
 * @returns Sanitized time string or empty if invalid
 */
export function sanitizeTime(time: string): string {
  if (!time) return "";

  // Validate HH:mm or HH:mm:ss format
  if (!/^([0-1]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(time)) {
    return "";
  }

  return time;
}
