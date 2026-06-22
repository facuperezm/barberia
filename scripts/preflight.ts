/**
 * Production pre-flight check.
 *
 * The build (`@t3-oss/env-nextjs`) already fails on *missing* env vars, so this
 * script does NOT re-check presence. It catches the deploy-specific footguns the
 * build cannot see:
 *   - a MercadoPago TEST credential shipped to production (fake money)
 *   - NEXT_PUBLIC_APP_URL still pointing at localhost / non-https
 *   - the no-double-booking exclusion constraint silently absent (db:push drops it)
 *   - no salon row provisioned (getCurrentSalonId() / public booking need one)
 *
 * Run against the real environment, e.g.:
 *   vercel env pull .env.production
 *   pnpm tsx --env-file .env.production scripts/preflight.ts
 *
 * Exits 0 when launch-ready, 1 when any check fails.
 */
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Running locally via tsx (NODE_ENV unset) → Neon needs a WebSocket impl.
if (process.env.NODE_ENV !== "production") {
  neonConfig.webSocketConstructor = ws;
}

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

const results: CheckResult[] = [];
const record = (name: string, ok: boolean, detail: string) =>
  results.push({ name, ok, detail });

function checkEnvSemantics(): void {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const isHttps = appUrl.startsWith("https://");
  const isLocal = /localhost|127\.0\.0\.1/.test(appUrl);
  record(
    "NEXT_PUBLIC_APP_URL is a public https origin",
    isHttps && !isLocal,
    appUrl || "(unset)",
  );

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN ?? "";
  record(
    "MercadoPago access token is a production credential (APP_USR-)",
    accessToken.startsWith("APP_USR-"),
    accessToken.startsWith("TEST-")
      ? "TEST- token — would take fake money in prod"
      : accessToken
        ? `${accessToken.slice(0, 8)}…`
        : "(unset)",
  );

  const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? "";
  record(
    "MercadoPago public key is a production credential (APP_USR-)",
    publicKey.startsWith("APP_USR-"),
    publicKey.startsWith("TEST-")
      ? "TEST- key"
      : publicKey
        ? `${publicKey.slice(0, 8)}…`
        : "(unset)",
  );

  const secret = process.env.BETTER_AUTH_SECRET ?? "";
  record(
    "BETTER_AUTH_SECRET is at least 32 chars",
    secret.length >= 32,
    secret ? `${secret.length} chars` : "(unset)",
  );

  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "";
  record(
    "MERCADOPAGO_WEBHOOK_SECRET is set",
    webhookSecret.length > 0,
    webhookSecret ? "present" : "(unset) — webhooks will 401",
  );

  record(
    "RESEND_API_KEY is set",
    (process.env.RESEND_API_KEY ?? "").length > 0,
    process.env.RESEND_API_KEY ? "present" : "(unset)",
  );
}

async function checkDatabase(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    record("DATABASE_URL is set", false, "(unset) — skipping DB checks");
    return;
  }

  const pool = new Pool({ connectionString });
  try {
    const constraint = await pool.query(
      `SELECT 1 FROM pg_constraint WHERE conname = 'appointments_no_double_booking' LIMIT 1`,
    );
    record(
      "no-double-booking exclusion constraint exists",
      constraint.rowCount === 1,
      constraint.rowCount === 1
        ? "present"
        : "MISSING — run scripts/apply-booking-constraint.ts",
    );

    const salon = await pool.query(`SELECT count(*)::int AS n FROM salons`);
    const salonCount = salon.rows[0]?.n ?? 0;
    record(
      "at least one salon is provisioned",
      salonCount > 0,
      `${salonCount} salon(s)`,
    );
  } catch (error) {
    record(
      "database reachable",
      false,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  checkEnvSemantics();
  await checkDatabase();

  console.log("\n  Pre-flight check\n  ────────────────");
  for (const { name, ok, detail } of results) {
    console.log(`  ${ok ? "✓" : "✗"} ${name}\n      ${detail}`);
  }

  const failures = results.filter((r) => !r.ok);
  console.log("");
  if (failures.length > 0) {
    console.error(
      `  ✗ Not launch-ready — ${failures.length} check(s) failed.\n`,
    );
    process.exit(1);
  }
  console.log("  ✓ All checks passed — clear for launch.\n");
  process.exit(0);
}

main().catch((error) => {
  console.error("Pre-flight check crashed:", error);
  process.exit(1);
});
