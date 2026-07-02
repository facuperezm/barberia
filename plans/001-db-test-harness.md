# Plan 001: Stand up a database-backed integration test harness

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat bc98614..HEAD -- vitest.config.ts package.json .github/workflows/ci.yml src/drizzle/index.ts src/test/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `bc98614`, 2026-07-01

## Why this matters

Every dangerous code path in this app — the double-booking transaction, payment
application, the tenancy gate — touches Postgres through Drizzle, and none of it
has a single test. The 8 existing test files are all pure-function unit tests
that never construct a `db`. Plans 002 (booking schedule enforcement) and 003
(payment idempotency) change exactly those risky paths and need integration
tests to land safely. This plan builds the harness they will use: a way to run
vitest suites against the real local Postgres stack, with per-test cleanup and
the production exclusion constraint applied.

## Current state

- Test config: `vitest.config.ts` (entire file):

  ```ts
  import { defineConfig } from "vitest/config";
  import path from "node:path";

  export default defineConfig({
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  });
  ```

- DB client: `src/drizzle/index.ts` — the app uses `drizzle-orm/neon-serverless`
  with a `Pool`. When `DATABASE_URL`'s hostname is `db.localtest.me` **and**
  `NODE_ENV !== "production"`, it routes WebSockets through the local Neon proxy
  (`neonConfig.wsProxy = (host) => \`${host}:4444/v2\``). Any other host goes to
  real Neon. Do not modify this file.

- Local stack: `docker-compose.yml` runs `postgres:17` on `:5432` (user/pass/db:
  `postgres`/`postgres`/`barbershop`) and `ghcr.io/timowilhelm/local-neon-http-proxy`
  on `:4444` pointed at that database. `pnpm db:up` starts it; `pnpm db:setup`
  additionally pushes the schema, applies the booking exclusion constraint, and
  seeds.

- Env validation: `src/env.ts` uses `@t3-oss/env-nextjs`; `skipValidation` is
  controlled by `SKIP_ENV_VALIDATION`. Tests will import app modules that pull
  in `@/env`, so all required env vars must be present in the test process
  (`DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ chars), `MERCADOPAGO_ACCESS_TOKEN`,
  `MERCADOPAGO_WEBHOOK_SECRET`, `RESEND_API_KEY`,
  `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`, `NEXT_PUBLIC_APP_URL`).

- Exclusion constraint: `scripts/apply-booking-constraint.ts` applies
  `appointments_no_double_booking` — `EXCLUDE USING gist (barber_id WITH =,
  tstzrange(appointment_at, end_time) WITH &&) WHERE (appointment_at IS NOT NULL
  AND end_time IS NOT NULL AND status NOT IN ('cancelled', 'no_show'))` — plus
  `CREATE EXTENSION IF NOT EXISTS btree_gist`. `drizzle-kit push` cannot express
  it, so the harness must apply the same SQL itself.

- Schema tables (all in `src/drizzle/schema.ts`): `salons`, `barbers`,
  `services`, `customers`, `working_hours`, `schedule_overrides`,
  `appointments`, `ratings`, `payments`, `rate_limits`, plus BetterAuth tables
  `user`, `session`, `account`, `verification`, and `salon_members`.

- CI: `.github/workflows/ci.yml` runs `pnpm typecheck`, `pnpm lint`, `pnpm test`
  on ubuntu + Node 22 with pnpm. GitHub Actions runners have Docker + compose
  available.

- Repo conventions: TypeScript strict, `@/` path alias, existing tests use
  plain `describe`/`it`/`expect` from vitest (see `src/lib/dates.test.ts`).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Unit tests | `pnpm test` | 54+ tests pass |
| Start local DB | `pnpm db:up` | containers healthy |
| Push schema | `pnpm db:push` | exit 0 |
| Integration tests (new) | `pnpm test:integration` | all pass |

## Scope

**In scope** (the only files you should modify/create):
- `vitest.config.ts` (exclude `*.itest.ts` from the unit run)
- `vitest.integration.config.ts` (create)
- `src/test/integration/setup.ts` (create)
- `src/test/integration/factories.ts` (create)
- `src/test/integration/harness.itest.ts` (create — smoke test)
- `package.json` (add `test:integration` script)
- `.github/workflows/ci.yml` (add integration job)

**Out of scope** (do NOT touch, even though they look related):
- `src/drizzle/index.ts` — the driver/proxy wiring works for tests as-is.
- `src/drizzle/seed/seed.ts` — the demo seed is not the test fixture mechanism.
- Any application source under `src/server/`, `src/app/`, `src/lib/` — this
  plan adds infrastructure only.

## Git workflow

- Branch: `advisor/001-db-test-harness`
- Conventional commits, matching repo style (e.g. `feat(test): integration harness against local Postgres stack`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Split unit and integration configs

Integration tests use the filename convention `*.itest.ts` so `pnpm test`
stays fast and DB-free.

In `vitest.config.ts`, change nothing except adding an explicit exclusion is
NOT needed (the include pattern `src/**/*.test.ts` already excludes
`*.itest.ts`). Verify that assumption:

**Verify**: `pnpm test` → same suite count as before (8 files), all pass.

Create `vitest.integration.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.itest.ts"],
    setupFiles: ["src/test/integration/setup.ts"],
    // DB tests share one database — never run files in parallel.
    fileParallelism: false,
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Add to `package.json` scripts:

```json
"test:integration": "vitest run --config vitest.integration.config.ts",
```

**Verify**: `pnpm test:integration` → "No test files found" (expected at this
point; exit code may be non-zero — that is fine until Step 4). `pnpm typecheck`
→ exit 0.

### Step 2: Write the setup file (env, safety guard, schema, constraint, cleanup)

Create `src/test/integration/setup.ts`:

```ts
import { beforeEach, afterAll } from "vitest";

// ── Env: provide required vars BEFORE any app import pulls in @/env ──────────
process.env.DATABASE_URL ??=
  "postgres://postgres:postgres@db.localtest.me:5432/barbershop";
process.env.BETTER_AUTH_SECRET ??= "integration-test-secret-0123456789abcdef";
process.env.MERCADOPAGO_ACCESS_TOKEN ??= "TEST-integration";
process.env.MERCADOPAGO_WEBHOOK_SECRET ??= "test-webhook-secret";
process.env.RESEND_API_KEY ??= "re_test_integration";
process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ??= "TEST-public";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";

// ── Safety: refuse to run against anything that is not the local stack ──────
const host = new URL(process.env.DATABASE_URL).hostname;
if (host !== "db.localtest.me" && host !== "localhost" && host !== "127.0.0.1") {
  throw new Error(
    `Integration tests refuse to run against non-local database host "${host}". ` +
      `Point DATABASE_URL at the docker-compose stack (see docker-compose.yml).`,
  );
}

// Import AFTER env is in place.
const { db } = await import("@/drizzle");
const { sql } = await import("drizzle-orm");

// ── One-time: ensure the exclusion constraint exists (idempotent, mirrors
//    scripts/apply-booking-constraint.ts) ────────────────────────────────────
await db.execute(sql`CREATE EXTENSION IF NOT EXISTS btree_gist`);
await db.execute(
  sql`ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_no_double_booking`,
);
await db.execute(sql`
  ALTER TABLE appointments
  ADD CONSTRAINT appointments_no_double_booking
  EXCLUDE USING gist (
    barber_id WITH =,
    tstzrange(appointment_at, end_time) WITH &&
  )
  WHERE (
    appointment_at IS NOT NULL
    AND end_time IS NOT NULL
    AND status NOT IN ('cancelled', 'no_show')
  )
`);

// ── Clean slate before every test ────────────────────────────────────────────
export async function resetDb(): Promise<void> {
  await db.execute(sql`
    TRUNCATE TABLE
      payments, ratings, appointments, schedule_overrides, working_hours,
      customers, services, barbers, salon_members, salons,
      session, account, verification, "user", rate_limits
    RESTART IDENTITY CASCADE
  `);
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await resetDb();
});
```

Notes for the executor:
- Top-level `await` is valid here (vitest setup files are ESM).
- `"user"` must stay quoted in the TRUNCATE (reserved word).
- This truncates the **dev database**. That is accepted for this repo: the demo
  data is restored with `pnpm db:seed`. Say so in the final report.

**Verify**: `pnpm typecheck` → exit 0.

### Step 3: Write minimal factories

Create `src/test/integration/factories.ts`:

```ts
import { db } from "@/drizzle";
import {
  salons,
  barbers,
  services,
  workingHours,
} from "@/drizzle/schema";

let counter = 0;
function uniq(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export async function createTestSalon() {
  const slug = uniq("test-salon");
  const [salon] = await db
    .insert(salons)
    .values({
      name: "Test Salon",
      slug,
      ownerName: "Test Owner",
      email: `${slug}@test.local`,
      timezone: "America/Argentina/Buenos_Aires",
      isActive: true,
    })
    .returning();
  return salon!;
}

export async function createTestBarber(salonId: number) {
  const [barber] = await db
    .insert(barbers)
    .values({
      salonId,
      name: uniq("Barber"),
      email: `${uniq("barber")}@test.local`,
      isActive: true,
    })
    .returning();
  return barber!;
}

export async function createTestService(
  salonId: number,
  opts: { priceCents?: number; durationMinutes?: number } = {},
) {
  const [service] = await db
    .insert(services)
    .values({
      salonId,
      name: uniq("Service"),
      priceCents: opts.priceCents ?? 100_00,
      durationMinutes: opts.durationMinutes ?? 30,
      isActive: true,
    })
    .returning();
  return service!;
}

/** Weekly hours for every day of the week, 09:00–18:00. */
export async function createFullWeekHours(barberId: number) {
  await db.insert(workingHours).values(
    Array.from({ length: 7 }, (_, dayOfWeek) => ({
      barberId,
      dayOfWeek,
      startTime: "09:00",
      endTime: "18:00",
      isWorking: true,
    })),
  );
}
```

**Verify**: `pnpm typecheck` → exit 0.

### Step 4: Smoke test proving the harness works

Create `src/test/integration/harness.itest.ts`:

```ts
import { describe, expect, it } from "vitest";
import { db } from "@/drizzle";
import { appointments, salons } from "@/drizzle/schema";
import { createTestBarber, createTestSalon, createTestService } from "./factories";

describe("integration harness", () => {
  it("reads and writes through the real database", async () => {
    const salon = await createTestSalon();
    const rows = await db.select().from(salons);
    expect(rows.map((r) => r.id)).toContain(salon.id);
  });

  it("starts each test from a clean slate", async () => {
    const rows = await db.select().from(salons);
    expect(rows).toHaveLength(0);
  });

  it("enforces the no-double-booking exclusion constraint", async () => {
    const salon = await createTestSalon();
    const barber = await createTestBarber(salon.id);
    const service = await createTestService(salon.id);
    const startsAt = new Date("2030-01-15T14:00:00Z");
    const endsAt = new Date("2030-01-15T14:30:00Z");

    const base = {
      salonId: salon.id,
      barberId: barber.id,
      serviceId: service.id,
      appointmentAt: startsAt,
      endTime: endsAt,
      status: "confirmed" as const,
    };
    await db.insert(appointments).values(base);

    await expect(db.insert(appointments).values(base)).rejects.toMatchObject({
      // exclusion_violation surfaces as code 23P01 (possibly on error.cause)
    });
  });
});
```

For the third test, assert the error code robustly:

```ts
    const error = await db
      .insert(appointments)
      .values(base)
      .then(() => null)
      .catch((e: unknown) => e as { code?: string; cause?: { code?: string } });
    expect(error).not.toBeNull();
    expect(error!.code === "23P01" || error!.cause?.code === "23P01").toBe(true);
```

Use the second form (explicit code check), not the `toMatchObject` sketch.

**Verify** (requires the local stack):
1. `pnpm db:up` → containers healthy
2. `pnpm db:push` → exit 0 (schema present)
3. `pnpm test:integration` → 3 tests pass

### Step 5: CI job

In `.github/workflows/ci.yml`, add a second job after `checks` (keep `checks`
unchanged):

```yaml
  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: docker compose up -d --wait
      - run: pnpm db:push
        env:
          DATABASE_URL: postgres://postgres:postgres@db.localtest.me:5432/barbershop
          SKIP_ENV_VALIDATION: "1"
      - run: pnpm test:integration
        env:
          DATABASE_URL: postgres://postgres:postgres@db.localtest.me:5432/barbershop
```

Note: `db.localtest.me` resolves to `127.0.0.1` publicly, so it works on CI
runners without `/etc/hosts` changes. `db:push` reads `DATABASE_URL` via
`drizzle.config.ts` (dotenv) — the env-level var takes precedence when no `.env`
file exists on CI; `SKIP_ENV_VALIDATION` guards any `@/env` import.

**Verify**: `git add -A && git status` shows only in-scope files; YAML parses
(`docker compose config -q` for compose was untouched; for the workflow, rely on
a YAML-aware editor or `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))"` → no error).

## Test plan

- The harness's own smoke tests (Step 4) are the deliverable: round-trip write,
  clean-slate isolation, exclusion-constraint enforcement.
- Model file structure after `src/lib/dates.test.ts` (plain describe/it).
- Verification: `pnpm test` (unit, unchanged) and `pnpm test:integration` (3 new
  tests) both green.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0 (unchanged unit suite)
- [ ] `pnpm test:integration` exits 0 with 3 passing tests (local stack running)
- [ ] `.github/workflows/ci.yml` contains the `integration` job
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The neon proxy rejects connections from the test process (errors mentioning
  WebSocket/`wsProxy`/`4444`) after `pnpm db:up` reports healthy — the proxy
  image may have changed behavior.
- `TRUNCATE` fails due to a table this plan doesn't list (schema drifted — new
  table added since `bc98614`).
- The exclusion-constraint smoke test fails with the constraint *present*
  (`\d appointments` via `pnpm db:studio` shows it) — that means overlap
  semantics changed and plans 002/003 assumptions are invalid.
- You find yourself wanting to modify `src/drizzle/index.ts` to make tests
  connect — that is out of scope; report instead.

## Maintenance notes

- Every future integration test imports `resetDb` implicitly via the setup
  file; keep new tables appended to the TRUNCATE list when the schema grows.
- Plans 002, 003, and 008 write `*.itest.ts` files that assume this harness's
  factories exist; extend `factories.ts` there rather than duplicating inserts.
- The integration run truncates local dev data by design — `pnpm db:seed`
  restores the demo dataset.
- If the team later provisions a dedicated `barbershop_test` database, only
  `setup.ts`'s default `DATABASE_URL` and the CI env need to change.
