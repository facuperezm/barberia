/**
 * Simple in-memory rate limiter for API routes
 * For production, consider using Redis or a dedicated service like Upstash
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;
  /**
   * Time window in seconds
   */
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier for the requester (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result with success status and remaining requests
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 10, windowSeconds: 60 }
): RateLimitResult {
  const now = Date.now();
  const key = `${identifier}:${config.windowSeconds}`;

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    Object.keys(store).forEach((k) => {
      if (store[k]!.resetTime < now) {
        delete store[k];
      }
    });
  }

  // Get or create entry
  const entry = store[key];

  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired one
    store[key] = {
      count: 1,
      resetTime: now + config.windowSeconds * 1000,
    };

    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: store[key]!.resetTime,
    };
  }

  // Increment count
  entry.count++;

  if (entry.count > config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Get client identifier from request (IP address or user agent hash)
 * @param request - Next.js request object
 * @returns Client identifier string
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from headers
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "unknown";

  // Include user agent to make identifier more unique
  const userAgent = request.headers.get("user-agent") || "";
  return `${ip}:${userAgent.slice(0, 50)}`;
}
