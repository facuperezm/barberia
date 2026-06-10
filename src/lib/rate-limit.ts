import "server-only";
import { db } from "@/drizzle";
import { sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Postgres-backed fixed-window rate limiter. Atomic via upsert, shared
 * across serverless instances. Fails open: a limiter outage must not
 * take down booking.
 */
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 10, windowSeconds: 60 },
): Promise<RateLimitResult> {
  const key = `${identifier}:${config.windowSeconds}`;

  try {
    const result = await db.execute(sql`
      INSERT INTO rate_limits (key, count, reset_at)
      VALUES (${key}, 1, now() + make_interval(secs => ${config.windowSeconds}))
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.reset_at < now() THEN 1
          ELSE rate_limits.count + 1
        END,
        reset_at = CASE
          WHEN rate_limits.reset_at < now()
            THEN now() + make_interval(secs => ${config.windowSeconds})
          ELSE rate_limits.reset_at
        END
      RETURNING count, reset_at
    `);

    // Opportunistic cleanup of stale windows (~1% of requests)
    if (Math.random() < 0.01) {
      db.execute(
        sql`DELETE FROM rate_limits WHERE reset_at < now() - interval '1 day'`,
      ).catch(() => {});
    }

    const row = result.rows[0] as { count: number; reset_at: string };
    const count = Number(row.count);
    const resetTime = new Date(row.reset_at).getTime();

    return {
      success: count <= config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      resetTime,
    };
  } catch (error) {
    logger.error("Rate limiter failed — failing open", error as Error, {
      key,
    });
    return { success: true, remaining: 1, resetTime: Date.now() };
  }
}

export function getClientIdentifier(request: Request): string {
  // On Vercel, x-real-ip is platform-set; in x-forwarded-for the trustworthy
  // client IP is the LAST entry (left entries are client-spoofable)
  const realIp = request.headers.get("x-real-ip");
  const forwarded = request.headers.get("x-forwarded-for");
  return realIp || forwarded?.split(",").at(-1)?.trim() || "unknown";
}
