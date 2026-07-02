# Plan 005: Make the dashboard stat cards correct, fresh, and cheap

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat bc98614..HEAD -- "src/app/(dashboard)/dashboard/page.tsx" src/server/queries/appointments.ts src/server/actions/appointments.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/001-db-test-harness.md (for the integration test only;
  steps 1–4 don't need it)
- **Category**: bug + perf
- **Planned at**: commit `bc98614`, 2026-07-01

## Why this matters

The dashboard's four stat cards are wrong three different ways at once:

1. **Wrong numbers**: "Total Bookings — Last 30 days" renders
   `appointments.length` of a query with **no date filter** (all-time), and
   "Active Bookings" counts `status === "pending"`, which in this system means
   *unpaid checkout holds*, not active bookings.
2. **Stale numbers**: both queries are wrapped in `unstable_cache` with
   `revalidate: 3600` and tags that **no code ever revalidates**
   (`revalidateTag` appears nowhere in the repo; one mutation revalidates the
   nonexistent path `/dashboard/appointments`). Meanwhile the Recent Bookings
   table below the cards is client-fetched and fresh — so cards and table
   visibly disagree for up to an hour.
3. **Expensive numbers**: producing two integers fetches every appointment the
   salon has ever had — 19 columns and 3 joins — growing forever.

Bonus defect: the underlying query swallows DB errors into `[]`
(`console.error` + return empty), so an outage renders as "0 bookings" instead
of an error.

The fix: replace the fetch-everything-and-count approach with one aggregate
query, drop `unstable_cache` entirely (a dynamic page reading session headers
gains nothing from a 1-hour data cache it can't invalidate), and point the dead
revalidation at the real path.

## Current state

- `src/app/(dashboard)/dashboard/page.tsx` (117 lines):
  - Lines 12–30: `getCachedAppointments` / `getCachedServices` wrap
    `unstable_cache(..., ["appointments"|"services", String(salonId)],
    { revalidate: 3600, tags: ["appointments"|"services"] })`.
  - Lines 33–35: `const salonId = await getCurrentSalonId();` then the two
    cached calls, awaited sequentially.
  - Lines 37–39: `if (!appointments || !services) return <CardSkeleton />;` —
    dead branch (both queries return `[]` on error, never null/undefined).
  - Line 57: `{appointments.length}` under "Total Bookings" / "Last 30 days".
  - Lines 69–75: pending-count under "Active Bookings" / "Last 30 days".
  - Lines 84, 96–107: services count and average duration computed from the
    `services` array (these two are fine — keep them).
  - Line 112: `<RecentBookings />` — client component, fetches its own data;
    **not** this plan's concern (plan 010 owns it).

- `src/server/queries/appointments.ts` — `getAppointments(salonId)`: 19-column
  select with 3 left joins, `where(eq(appointments.salonId, salonId))`, no
  limit, and:

  ```ts
    } catch (error) {
      console.error("Error fetching appointments:", error);
      return [];
    }
  ```

  Its **only** consumer is the dashboard page (verify in Step 4).

- `src/server/actions/appointments.ts:160` — `updateAppointmentStatus`
  revalidates a route that does not exist:

  ```ts
      revalidatePath("/dashboard/appointments");
  ```

  (The dashboard lives at `/dashboard`; there is no `appointments` segment.)

- Writers already calling `revalidatePath("/dashboard")`:
  `src/server/actions/bookings.ts:233`.

- Schema facts for the aggregate: `appointments.appointmentAt` is a nullable
  `timestamp with time zone`; `appointments.status` is the
  `appointment_status` enum (`pending | confirmed | in_progress | completed |
  cancelled | no_show`); index `appointments_salon_status_idx` on
  (salonId, status) exists.

- Convention: queries live in `src/server/queries/`, are **not** marked
  `"use server"` in this file (correct — keep it that way), and the dashboard
  is a server component.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Unit tests | `pnpm test` | all pass |
| Integration tests | `pnpm db:up && pnpm db:push && pnpm test:integration` | all pass |
| Manual | `pnpm dev` → `/dashboard` | cards render |

## Scope

**In scope** (the only files you should modify/create):
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/server/queries/appointments.ts`
- `src/server/actions/appointments.ts` (one line: the dead revalidate path)
- `src/test/integration/dashboard-stats.itest.ts` (create)

**Out of scope** (do NOT touch, even though they look related):
- `src/app/(dashboard)/dashboard/_components/recent-bookings.tsx` and
  `src/server/actions/appointments.ts#getAppointments` — plan 010 paginates
  them; only the `revalidatePath` line in that file is yours.
- `src/server/queries/services.ts` — its error-swallowing is known; plan 008
  territory (action-boundary cleanup).
- Any `unstable_cache` usage elsewhere (there is none).

## Git workflow

- Branch: `advisor/005-dashboard-stats`
- Conventional commits, e.g. `fix(dashboard): aggregate stat queries, drop stale unstable_cache`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add an aggregate stats query

In `src/server/queries/appointments.ts`, add (keeping the existing imports
style; you will need `sql` from `drizzle-orm`):

```ts
export interface DashboardStats {
  last30DaysCount: number;
  upcomingConfirmedCount: number;
}

/**
 * Aggregate stats for the dashboard cards. Computed in the database — never
 * fetch rows to count them. Errors propagate: a DB outage must surface as an
 * error page, not as zeros.
 */
export async function getDashboardStats(
  salonId: number,
): Promise<DashboardStats> {
  const [row] = await db
    .select({
      last30Days: sql<string>`count(*) filter (where ${appointments.appointmentAt} >= now() - interval '30 days')`,
      upcomingConfirmed: sql<string>`count(*) filter (where ${appointments.status} = 'confirmed' and ${appointments.appointmentAt} >= now())`,
    })
    .from(appointments)
    .where(eq(appointments.salonId, salonId));

  return {
    last30DaysCount: Number(row?.last30Days ?? 0),
    upcomingConfirmedCount: Number(row?.upcomingConfirmed ?? 0),
  };
}
```

(Postgres returns `count(*)` as bigint → string; the `Number(...)` coercion is
required.)

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Rewire the dashboard page

In `src/app/(dashboard)/dashboard/page.tsx`:

1. Delete the `getCachedAppointments` and `getCachedServices` wrappers (lines
   12–30) and the `unstable_cache` import.
2. Replace the data loading (lines 33–39) with:

```ts
  const salonId = await getCurrentSalonId();
  const [stats, services] = await Promise.all([
    getDashboardStats(salonId),
    getServices(salonId),
  ]);
```

   Import `getDashboardStats` from `@/server/queries/appointments` (replacing
   the `getAppointments` import). Delete the dead
   `if (!appointments || !services)` skeleton branch entirely.
3. Card values:
   - "Total Bookings": `{stats.last30DaysCount}` — the "Last 30 days" label is
     now true; keep it.
   - "Active Bookings": rename the title to `Upcoming Bookings`, value
     `{stats.upcomingConfirmedCount}`, and change its caption from
     "Last 30 days" to `Confirmed, from today`.
   - "Services" and "Avg. Duration" cards: unchanged (still driven by
     `services`).

**Verify**: `pnpm typecheck && pnpm lint` → exit 0. Manual: `pnpm dev` →
`/dashboard` (dev sign-in) → four cards render with plausible numbers; change
an appointment's status in Recent Bookings → after the row updates, reload the
page → "Upcoming Bookings" reflects the change immediately (no 1-hour lag).

### Step 3: Fix the dead revalidation path

In `src/server/actions/appointments.ts:160`, change:

```ts
    revalidatePath("/dashboard/appointments");
```

to:

```ts
    revalidatePath("/dashboard");
```

**Verify**: `grep -rn "dashboard/appointments" src` → no matches.

### Step 4: Delete the now-dead heavy query (if truly dead)

Run `grep -rn "queries/appointments" src --include='*.ts' --include='*.tsx'`.
Expected: only `src/app/(dashboard)/dashboard/page.tsx` (now importing
`getDashboardStats`). If `getAppointments` from
`src/server/queries/appointments.ts` has **zero remaining importers**, delete
that function (keep the file and `getDashboardStats`). If any other importer
appears, leave it and note it in your report.

**Verify**: `pnpm typecheck` → exit 0.

### Step 5: Integration test

Create `src/test/integration/dashboard-stats.itest.ts` (harness from plan 001;
factories from plans 001/003 — requires `createTestAppointment` from plan 003;
if it doesn't exist yet, inline the appointment insert following the same
shape):

Cases:
1. Empty salon → both counts 0.
2. One confirmed appointment tomorrow + one confirmed 40 days ago + one
   pending tomorrow → `last30DaysCount: 2` (tomorrow's two are within the
   window; the 40-day-old one is not) and `upcomingConfirmedCount: 1`.
3. Tenant isolation: appointments in salon B don't affect salon A's counts.

**Verify**: `pnpm test:integration` → all pass.

## Test plan

- Integration: the three cases above in
  `src/test/integration/dashboard-stats.itest.ts`, modeled on
  `src/test/integration/harness.itest.ts`.
- Manual: the freshness check in Step 2's verify.
- Verification: `pnpm test` (unchanged) and `pnpm test:integration` green.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm test:integration` exits 0 with the 3 new stats cases
- [ ] `grep -n "unstable_cache" "src/app/(dashboard)/dashboard/page.tsx"` returns nothing
- [ ] `grep -rn "dashboard/appointments" src` returns nothing
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts don't match the live code (drift since `bc98614`).
- `getAppointments` in `src/server/queries/appointments.ts` turns out to have
  another importer you can't account for (Step 4).
- The `count(*) filter` syntax fails through the neon driver (it should not —
  it's plain Postgres) — report the error rather than switching to
  fetch-and-count.
- Removing `unstable_cache` visibly regresses dashboard latency in dev beyond
  ~a second — the aggregate should be fast; if it isn't, the missing composite
  index belongs to plan 010's schema step, report instead of adding it here.

## Maintenance notes

- The dashboard is now always-fresh and cheap; if a cache is ever reintroduced,
  it must be salon-scoped **and** every appointment/service mutation must call
  the matching `revalidateTag` — the previous setup had tags nobody fired.
- Plan 010 paginates Recent Bookings and adds a `(salonId, appointmentAt)`
  composite index; that index also benefits `getDashboardStats`.
- Plan 012 ("Hoy" agenda) can reuse the `getDashboardStats` pattern for a
  today-scoped aggregate.
- Reviewer focus: the definition of "Upcoming" (confirmed AND in the future) —
  product may prefer including `in_progress`; the query makes that a one-line
  change.
