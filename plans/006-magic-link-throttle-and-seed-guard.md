# Plan 006: Throttle magic-link sends and guard the destructive seed

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat bc98614..HEAD -- src/lib/auth.ts src/drizzle/seed/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `bc98614`, 2026-07-01

## Why this matters

Two cheap pieces of insurance against expensive incidents:

1. **Magic-link mail-bombing.** The sign-in endpoint sends a Resend email to
   any address, unthrottled. The app's Postgres rate limiter protects booking
   creation and the availability API but not auth; BetterAuth's built-in
   limiter defaults to in-memory storage, which is per-instance (≈ ineffective)
   on Vercel's serverless runtime. Anyone can script sign-in requests to flood
   a victim's inbox from your verified domain — burning Resend quota and sender
   reputation. (Open self-serve signup is a documented, accepted decision;
   *unmetered email sending* is not part of that decision.)
2. **Seed pointed at the wrong database.** `pnpm db:seed` unconditionally
   `DELETE`s every row of all eleven business tables (plus auth tables) of
   whatever `DATABASE_URL` is in `.env`. One day that variable points at
   production — the runbook has humans switching envs around deploys — and all
   tenant data is gone. The seed must refuse non-local targets unless
   explicitly overridden.

## Current state

- `src/lib/auth.ts` (50 lines) — the magic-link plugin:

  ```ts
  // :31-40
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url, token }) => {
        if (isDevAuthEnabled && email === DEV_TEST_EMAIL) {
          captureDevMagicToken(token);
          return; // never email the local test account
        }
        await sendMagicLinkEmail({ email, url });
      },
    }),
    // nextCookies must be the LAST plugin so cookies set during sign-in are
    // persisted from server actions / route handlers.
    nextCookies(),
  ],
  ```

  No `rateLimit` config is passed to `betterAuth(...)`.

- `src/lib/rate-limit.ts` — the existing limiter to reuse. Signature:
  `rateLimit(identifier: string, config?: { maxRequests: number; windowSeconds: number })`
  → `Promise<{ success: boolean; remaining: number; resetTime: number }>`.
  Postgres-backed (atomic upsert on the `rate_limits` table), shared across
  serverless instances, **fails open** on limiter DB errors (deliberate,
  documented in-code — keep that behavior).

- Existing limiter call sites to imitate: `src/server/actions/bookings.ts:57-60`
  (`rateLimit(\`booking:${clientIp}\`, { maxRequests: 5, windowSeconds: 60 })`).

- `src/drizzle/seed/seed.ts` — top of the transaction (≈ lines 27–41):

  ```ts
      // **1. Clear Existing Data**
      await tx.delete(payments);
      await tx.delete(ratings);
      await tx.delete(appointments);
      await tx.delete(scheduleOverrides);
      await tx.delete(workingHours);
      await tx.delete(customers);
      await tx.delete(services);
      await tx.delete(barbers);
      await tx.delete(salonMembers);
      await tx.delete(salons);
      await tx.delete(user);
  ```

  `seed()` starts at line 18 with a `try` + `console.log("🚀 Starting...")`.
  It is executed by `pnpm db:seed` → `tsx --env-file .env src/drizzle/seed/seed.ts`,
  so `process.env.DATABASE_URL` is whatever `.env` holds. There is **no**
  environment or hostname guard anywhere in the file.

- Local-stack hostnames considered safe: `db.localtest.me`, `localhost`,
  `127.0.0.1` (see `docker-compose.yml` and `.env.example`).

- Test conventions: pure-helper-with-test-beside-it, e.g.
  `src/server/booking/hold-expiry.ts` + `hold-expiry.test.ts`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Unit tests | `pnpm test` | all pass |
| Local seed | `pnpm db:up && pnpm db:setup` | seed completes |
| Manual auth check | `pnpm dev` → `/sign-in` | see Step 1 verify |

## Scope

**In scope** (the only files you should modify/create):
- `src/lib/auth.ts`
- `src/drizzle/seed/seed-guard.ts` (create)
- `src/drizzle/seed/seed-guard.test.ts` (create)
- `src/drizzle/seed/seed.ts` (add the guard call at the top of `seed()`)

**Out of scope** (do NOT touch, even though they look related):
- `src/lib/rate-limit.ts` — reuse as-is, including its fail-open behavior.
- BetterAuth global `rateLimit` configuration — a broader hardening question
  (storage table, per-path rules) deferred; note it in your report.
- `src/lib/dev-auth.ts` and the dev sign-in action — their `NODE_ENV` gating
  is correct and deliberate.
- `.env.example` — no new required vars (the override flag is optional).

## Git workflow

- Branch: `advisor/006-authmail-throttle-seed-guard`
- Conventional commits, e.g. `feat(auth): throttle magic-link sends per email+window`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Throttle magic-link sends

In `src/lib/auth.ts`, import the limiter and gate the send. The dev-account
shortcut stays above the throttle (it never emails):

```ts
import { rateLimit } from "@/lib/rate-limit";
```

```ts
    magicLink({
      sendMagicLink: async ({ email, url, token }) => {
        if (isDevAuthEnabled && email === DEV_TEST_EMAIL) {
          captureDevMagicToken(token);
          return; // never email the local test account
        }
        // Cross-instance throttle: 3 links per address per hour. Protects the
        // target inbox and our Resend sender reputation from scripted sign-in
        // requests. (The limiter fails open by design — an outage must not
        // lock out sign-in.)
        const throttle = await rateLimit(
          `magic-link:${email.trim().toLowerCase()}`,
          { maxRequests: 3, windowSeconds: 3600 },
        );
        if (!throttle.success) {
          throw new Error(
            "Too many sign-in links requested for this address. Try again later.",
          );
        }
        await sendMagicLinkEmail({ email, url });
      },
    }),
```

The thrown error propagates through BetterAuth's route handler as a failed
sign-in response; the sign-in page already renders request failures.

**Verify**:
1. `pnpm typecheck && pnpm lint` → exit 0.
2. Manual: `pnpm db:up && pnpm dev`, open `/sign-in`, submit the same email 4
   times. The 4th attempt must fail with an error response (watch the network
   tab or the dev-server log), and `rate_limits` contains a
   `magic-link:<email>:3600` row (inspect via `pnpm db:studio`).

### Step 2: Pure seed-target guard

Create `src/drizzle/seed/seed-guard.ts`:

```ts
const LOCAL_HOSTS = new Set(["db.localtest.me", "localhost", "127.0.0.1"]);

/**
 * The seed DELETEs every business table. It must only ever run against the
 * local docker stack unless the operator explicitly overrides with
 * ALLOW_DESTRUCTIVE_SEED=1 (e.g. to reset a disposable Neon branch).
 * Throws with an explanation when the target is unsafe.
 */
export function assertSafeSeedTarget(params: {
  databaseUrl: string | undefined;
  nodeEnv: string | undefined;
  allowOverride: string | undefined;
}): void {
  if (params.allowOverride === "1") return;

  if (!params.databaseUrl) {
    throw new Error("Refusing to seed: DATABASE_URL is not set.");
  }

  let host: string;
  try {
    host = new URL(params.databaseUrl).hostname;
  } catch {
    throw new Error("Refusing to seed: DATABASE_URL is not a valid URL.");
  }

  if (params.nodeEnv === "production" || !LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Refusing to run the destructive seed against "${host}" ` +
        `(NODE_ENV=${params.nodeEnv ?? "undefined"}). ` +
        `This command deletes ALL data. Set ALLOW_DESTRUCTIVE_SEED=1 to override.`,
    );
  }
}
```

Create `src/drizzle/seed/seed-guard.test.ts` (model on
`src/server/booking/hold-expiry.test.ts`) covering:
- each of the three local hosts with `nodeEnv: "development"` → does not throw
- a Neon-looking host (`ep-example-123.us-east-2.aws.neon.tech`) → throws
- local host but `nodeEnv: "production"` → throws
- unsafe host with `allowOverride: "1"` → does not throw
- missing and malformed `databaseUrl` → throws

**Verify**: `pnpm test` → new suite passes.

### Step 3: Wire the guard into the seed

In `src/drizzle/seed/seed.ts`, import the guard and call it as the **first
statement inside `seed()`** (before the transaction and before any logging):

```ts
import { assertSafeSeedTarget } from "./seed-guard";
```

```ts
async function seed() {
  assertSafeSeedTarget({
    databaseUrl: process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV,
    allowOverride: process.env.ALLOW_DESTRUCTIVE_SEED,
  });
  try {
    ...
```

**Verify**:
1. `pnpm typecheck` → exit 0.
2. `pnpm db:up && pnpm db:seed` → still seeds successfully (local host passes).
3. Negative check without touching `.env`:
   `DATABASE_URL=postgres://user:pass@ep-fake.neon.tech/db pnpm tsx src/drizzle/seed/seed.ts`
   → exits non-zero printing the "Refusing to run the destructive seed" error
   (env validation may fire first if other vars are missing — prepend
   `SKIP_ENV_VALIDATION=1` if needed; the guard reads `process.env` directly).

## Test plan

- Unit: `src/drizzle/seed/seed-guard.test.ts`, cases listed in Step 2.
- Manual: Step 1's 4-attempt throttle check; Step 3's negative seed check.
- Verification: `pnpm test` green.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0 with the new seed-guard suite
- [ ] `grep -n "rateLimit(" src/lib/auth.ts` matches (throttle present)
- [ ] `grep -n "assertSafeSeedTarget" src/drizzle/seed/seed.ts` matches
- [ ] Local `pnpm db:seed` still succeeds; remote-URL dry run refuses
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts don't match the live code (drift since `bc98614`).
- Throwing inside `sendMagicLink` crashes the sign-in flow in a way the UI
  cannot recover from (blank page rather than an error state) — report; the
  fallback design is returning silently after logging, which trades
  user-visible feedback for robustness, and that's an operator decision.
- The seed guard trips on the CI integration job (it shouldn't — CI uses
  `db.localtest.me`); if it does, report rather than adding hosts.

## Maintenance notes

- The throttle key is per-address. If abuse shifts to many-addresses-one-IP,
  add a second `rateLimit` keyed on client IP — BetterAuth exposes the request
  via plugin hooks; that's the follow-up noted out of scope.
- If a disposable Neon branch ever needs seeding, use
  `ALLOW_DESTRUCTIVE_SEED=1 pnpm db:seed` — document it in the runbook when it
  first happens, not before.
- Reviewer focus: the throttle must sit *after* the dev-account shortcut, or
  local test sign-ins start consuming the budget.
