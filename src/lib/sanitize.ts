/**
 * Input sanitization utilities to prevent XSS and injection attacks
 */

/**
 * Sanitizes HTML by removing potentially dangerous tags and attributes
 * @param input - Raw HTML string
 * @returns Sanitized string
 */
export function sanitizeHtml(input: string): string {
  if (!input) return "";

  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove dangerous attributes
  sanitized = sanitized.replace(/\s*(on\w+|javascript:)[^"\s>]*/gi, "");

  // Remove iframe, object, embed tags
  sanitized = sanitized.replace(/<(iframe|object|embed)[^>]*>.*?<\/\1>/gi, "");

  return sanitized.trim();
}

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
 * Sanitizes URL to prevent javascript: and data: protocols
 * @param url - URL string
 * @returns Safe URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url) return "";

  const trimmed = url.trim();

  // Block dangerous protocols
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return "";
  }

  // Only allow http, https, mailto, tel
  if (!/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
    return "";
  }

  return trimmed;
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

/**
 * Generic sanitizer that removes special characters and limits length
 * @param input - Raw input string
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (!input) return "";

  let sanitized = sanitizeText(input);
  sanitized = sanitized.slice(0, maxLength);

  return sanitized;
}
