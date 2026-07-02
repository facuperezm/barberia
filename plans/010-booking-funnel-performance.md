# Plan 010: Remove the booking-funnel waterfall and bound the appointments table

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat bc98614..HEAD -- "src/app/[slug]/book/page.tsx" src/app/book/_steps/ src/server/actions/appointments.ts "src/app/(dashboard)/dashboard/_components/recent-bookings.tsx" src/drizzle/schema.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW-MED (pagination changes what the dashboard table shows; the
  hydration change touches the revenue funnel's first paint)
- **Depends on**: recommended after plans/005-dashboard-stats-and-cache.md
  (both touch dashboard data flow; no hard file conflict)
- **Category**: perf
- **Planned at**: commit `bc98614`, 2026-07-01

## Why this matters

Two unbounded/waterfall patterns, one on each side of the product:

1. **Booking funnel (revenue path)**: `/[slug]/book` server-renders only the
   salon name, then the first wizard step client-fetches barbers via a server
   action behind skeletons — an avoidable extra round-trip on the page that
   converts visitors into bookings. The data (barbers, services) is public,
   stable, and already reachable during the server render.
2. **Dashboard appointments table**: `getAppointments()` selects every
   appointment the salon ever had (no `limit`, no pagination) with three
   joins, ships it to the browser, and renders every row. Cost grows linearly
   with salon lifetime, forever. There is also no `(salonId, appointmentAt)`
   composite index backing the salon-scoped ordered scan.

## Current state

- `src/app/[slug]/book/page.tsx` (26 lines) — server component:

  ```tsx
  const { slug } = await params;
  const salon = await getPublicSalonBySlug(slug);
  if (!salon) notFound();

  return (
    ...
        <BookingProvider salonId={salon.id}>
          <BookingForm />
        </BookingProvider>
    ...
  );
  ```

- `src/app/book/_steps/barber-step.tsx:16-20` — client fetch:

  ```tsx
  const { data: barbers, isLoading } = useQuery<Barber[]>({
    queryKey: ["barbers", "book", salonId],
    queryFn: () => getPublicBarbers(salonId),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
  ```

  `src/app/book/_steps/service-step.tsx` has the analogous
  `["services", "book", salonId]` query (open it and copy the exact key +
  queryFn — the prefetch in Step 1 must mirror both **exactly**).

- Data sources: `getPublicBarbers(salonId)` in `src/server/actions/barbers.ts:203-213`
  (active barbers, name-ordered); `getPublicServices(salonId)` in
  `src/server/queries/services.ts:19-29` (active services). Both are plain
  async DB reads, callable from a server component.

- Query client: `src/app/providers.tsx` uses the TanStack SSR-safe pattern
  (`isServer` branch); the app is wrapped in `QueryClientProvider`, so
  `HydrationBoundary` works anywhere below it.

- `src/server/actions/appointments.ts:21-57` — `getAppointments()`: joined
  select `where(eq(appointments.salonId, salonId))`,
  `.orderBy(appointments.appointmentAt)` (ascending), **no limit**; returns
  `{ success: true, appointments }` or `{ success: false, error }`.

- `src/app/(dashboard)/dashboard/_components/recent-bookings.tsx` — client
  component; `useQuery({ queryKey: ["bookings"], queryFn: () => getAppointments() })`,
  filters in memory (day dropdown + search) and renders every row (`:129`).
  Mutations invalidate `["bookings"]`
  (`src/app/book/_components/appointment-actions.tsx:33`).

- `src/drizzle/schema.ts:326-346` appointments indexes — relevant subset:
  `appointments_salon_id_idx (salonId)`, `appointments_appointment_at_idx
  (appointmentAt)`, `appointments_barber_date_idx (barberId, appointmentAt)`,
  `appointments_salon_status_idx (salonId, status)` — **no**
  `(salonId, appointmentAt)`.

- Repo rule: after any `pnpm db:push`, re-run
  `pnpm tsx --env-file .env scripts/apply-booking-constraint.ts`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Unit tests | `pnpm test` | all pass |
| Push schema | `pnpm db:push` | exit 0 |
| Re-apply constraint | `pnpm tsx --env-file .env scripts/apply-booking-constraint.ts` | applied |
| Manual | `pnpm dev` | see step verifies |

## Scope

**In scope** (the only files you should modify):
- `src/app/[slug]/book/page.tsx`
- `src/server/actions/appointments.ts` (`getAppointments` only)
- `src/app/(dashboard)/dashboard/_components/recent-bookings.tsx` (caption only)
- `src/drizzle/schema.ts` (one new index)

**Out of scope** (do NOT touch, even though they look related):
- The wizard step components — their query keys are the contract; the page
  adapts to them, not vice versa.
- `src/app/book/page.tsx` (legacy redirect) — separate product decision (F21
  in `plans/README.md` backlog).
- `src/app/api/availability/route.ts` — plan 002 owns it (including its
  parallel fetches).
- Dashboard stats (`dashboard/page.tsx`) — plan 005.
- True cursor pagination UI — out of scope; this plan bounds the fetch with a
  window (see Step 3 rationale).

## Git workflow

- Branch: `advisor/010-funnel-performance`
- Conventional commits, e.g. `perf(booking): server-prefetch wizard data into the query cache`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Server-prefetch barbers + services into the wizard's query cache

First open `src/app/book/_steps/service-step.tsx` and note its exact
`queryKey` and `queryFn` import. Then rewrite
`src/app/[slug]/book/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import {
  QueryClient,
  dehydrate,
  HydrationBoundary,
} from "@tanstack/react-query";
import { getPublicSalonBySlug, getPublicBarbers } from "@/server/actions/barbers";
import { getPublicServices } from "@/server/queries/services";
import { BookingForm } from "@/app/book/_components/booking-form";
import { BookingProvider } from "@/app/book/_components/booking-provider";

export default async function SalonBookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salon = await getPublicSalonBySlug(slug);
  if (!salon) notFound();

  // Warm the wizard's client cache during the server render: the first two
  // steps paint instantly instead of skeleton → action round-trip.
  // Keys MUST mirror barber-step.tsx / service-step.tsx exactly.
  const queryClient = new QueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["barbers", "book", salon.id],
      queryFn: () => getPublicBarbers(salon.id),
    }),
    queryClient.prefetchQuery({
      queryKey: ["services", "book", salon.id],
      queryFn: () => getPublicServices(salon.id),
    }),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl py-10">
        <h1 className="mb-6 text-center text-2xl font-bold">{salon.name}</h1>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <BookingProvider salonId={salon.id}>
            <BookingForm />
          </BookingProvider>
        </HydrationBoundary>
      </div>
    </div>
  );
}
```

If `service-step.tsx`'s key or fn differs from `["services", "book", salonId]`
/ `getPublicServices`, mirror what the step actually uses.

**Verify**: `pnpm typecheck` → exit 0. Manual: `pnpm db:up && pnpm dev`, open
`/elite-barbershop/book` with the browser network tab open — the barber list
renders **without** a skeleton phase and without a POST to the
`getPublicBarbers` server action on initial load; advancing to the service
step likewise shows no fetch.

### Step 2: Add the composite index

In `src/drizzle/schema.ts`, in the appointments index list (after
`appointments_salon_status_idx`, around line 340), add:

```ts
    // Salon-scoped, time-ordered scans (dashboard table, stats)
    index("appointments_salon_appointment_at_idx").on(
      table.salonId,
      table.appointmentAt,
    ),
```

Apply: `pnpm db:push`, then re-apply the exclusion constraint (repo rule):
`pnpm tsx --env-file .env scripts/apply-booking-constraint.ts`.

**Verify**: `pnpm db:push` exit 0; constraint script prints applied. Note in
your report that production needs the same push + re-apply at deploy.

### Step 3: Bound `getAppointments` to a recent window

Rationale: the component's title is "Recent Bookings" and its filters are a
current-week dropdown and a search box — an unbounded all-history fetch serves
neither. A `limit` with newest-first ordering preserves the UI contract while
capping cost. (Full pagination UI is deliberately out of scope.)

In `src/server/actions/appointments.ts`, `getAppointments()`:

- add `desc` to the drizzle-orm import;
- change the ordering/limit:

```ts
      .where(eq(appointments.salonId, salonId))
      .orderBy(desc(appointments.appointmentAt))
      .limit(100);
```

Keep the return shape `{ success: true, appointments }` — the client already
consumes it. In `recent-bookings.tsx`, add a caption under the `CardTitle`
(match existing muted-text styling, e.g.
`<p className="text-sm text-muted-foreground">Showing the latest 100 bookings</p>`)
so the bound is visible, and note that search/day filters apply within that
window.

**Verify**: `pnpm typecheck && pnpm lint` → exit 0. Manual: `/dashboard` table
still renders rows newest-first; day-filter and search still work.

## Test plan

- No new automated tests: the changed surfaces are a server-component render
  path and a query `limit` (the repo has no component-test infrastructure;
  `getAppointments` gains integration coverage in plan 001/008's suites if
  those landed).
- Manual checks are specified per step (network-tab assertion for the
  prefetch; table behavior for the bound).
- Full existing suite stays green: `pnpm typecheck && pnpm lint && pnpm test`.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `grep -n "HydrationBoundary" "src/app/[slug]/book/page.tsx"` matches
- [ ] `grep -n "limit(100)" src/server/actions/appointments.ts` matches
- [ ] `grep -n "appointments_salon_appointment_at_idx" src/drizzle/schema.ts` matches
- [ ] Local `db:push` + constraint re-apply done
- [ ] Manual network-tab check performed and described in the report
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The wizard steps' query keys don't match the documented pattern (someone
  changed them since `bc98614`) — mirror the live keys or stop if ambiguous.
- After hydration, the network tab still shows a `getPublicBarbers` POST on
  first paint — the dehydrated state isn't being picked up (key mismatch or a
  providers change); debug the key first, stop if it's structural.
- The `limit(100)` visibly breaks a consumer that relied on seeing ancient
  bookings (check the week-filter dropdown still has data) — the window size
  is an operator call.

## Maintenance notes

- If the dashboard ever needs full history (reports, exports), build it as a
  separate paginated query — do not remove the limit from this one.
- The composite index also serves plan 005's `getDashboardStats` filter scans.
- When plan 011 (seña) adds deposit state to the table, the payload per row
  grows — the 100-row bound is what keeps that cheap.
- Reviewer focus: the prefetch keys mirroring the step components — a silent
  key mismatch degrades gracefully (falls back to client fetch) and is easy to
  miss without the network-tab check.
