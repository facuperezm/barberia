# Plan 002: Enforce working hours server-side and fix slot generation

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat bc98614..HEAD -- src/server/actions/bookings.ts src/app/api/availability/route.ts src/lib/dates.ts src/lib/dates.test.ts src/server/booking/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (touches the booking hot path; wrong range math would reject legitimate bookings)
- **Depends on**: plans/001-db-test-harness.md (for the integration tests)
- **Category**: bug
- **Planned at**: commit `bc98614`, 2026-07-01

## Why this matters

The booking server action (`createBookingAction`) never consults
`working_hours` or `schedule_overrides`. The only schedule check in the whole
system is the *advisory* `GET /api/availability` that the client wizard uses to
render buttons. A direct POST to the server action (or a stale client) can book
any barber at 03:17 on their day off — and for paid services, proceed to charge
via MercadoPago. Two related integrity holes ride along: `generateTimeSlots`
bounds only the slot *start*, so services whose duration doesn't divide the
range get a final slot that overruns closing time; and the availability route
accepts unvalidated `parseInt` params, silently substitutes a 30-minute
duration for unknown services, and offers already-past slots for today.

After this plan: the schedule window is enforced inside the booking
transaction using the exact same pure logic the availability route uses, slots
never overrun closing, the route validates its inputs, and same-day past slots
are filtered out.

## Current state

- `src/server/actions/bookings.ts` — `createBookingAction` (lines 47–289).
  Imports only `appointments, barbers, customers, services` from the schema
  (line 4) — **no schedule tables**. Inside `db.transaction` (line 106) it:
  loads the active barber (107–115), loads the active service scoped to the
  barber's salon (117–131), computes `endDateTime` (133–135), releases expired
  pending holds overlapping the slot (142–153), checks range overlap against
  non-cancelled appointments (158–172), upserts the customer (175–208), and
  inserts the appointment with `status: service.priceCents > 0 ? "pending" :
  "confirmed"` (210–228). Zod schema at lines 23–31 constrains `date` to
  `YYYY-MM-DD` and `time` to `HH:mm`. Expected errors are thrown as
  `class BookingError extends Error {}` (line 45) and mapped to
  `{ success: false, error }` in the catch (279–281).

- `src/app/api/availability/route.ts` — `GET` handler:
  - Params read as raw strings, used via `parseInt(barberId)` /
    `parseInt(serviceId)` (lines 55, 77, 111, 137); only a presence check
    (37–43).
  - Schedule resolution (49–99): override for the exact date wins; if
    `override.isWorkingDay && override.availableSlots?.length` those ranges are
    used, otherwise the day yields nothing; with no override, the weekly
    `working_hours` row for `getDayOfWeek(dateStr)` is used —
    `availableSlots` JSONB preferred, else `[{start: startTime, end: endTime}]`;
    missing row → not working.
  - Unknown `serviceId` silently defaults duration to 30 (lines 107–114).
  - `existingAppointments` are fetched *after* the service (sequential
    independent awaits, 108–140), filtered through `isHoldExpired`, and slots
    are marked available/blocked via `isSlotBlocked`.
  - No filter removes slots earlier than the current time on today's date.

- `src/lib/dates.ts` — `generateTimeSlots(start, end, durationMinutes)`
  (lines 146–167):

  ```ts
  let current = dateFnsParse(normalizedStart, "HH:mm", new Date(2000, 0, 1));
  const endTime = dateFnsParse(normalizedEnd, "HH:mm", new Date(2000, 0, 1));

  while (isBefore(current, endTime)) {
    slots.push(dateFnsFormat(current, "HH:mm"));
    current = addMinutes(current, durationMinutes);
  }
  ```

  The loop admits a slot whose start is before `endTime` even when
  `start + duration` exceeds it. Also exported and relevant: `normalizeTime`
  (130–141), `getDayOfWeek` (79–82), `formatTime` (118–124), `now()` (56–58),
  `formatDateISO` (87–89). All date math is Argentina-fixed by design for v1.

- `src/lib/dates.test.ts:40-49` — the existing `generateTimeSlots` test uses
  `("09:00", "11:00", 30)` → `["09:00","09:30","10:00","10:30"]`. The last slot
  ends exactly at 11:00, so the end-bound fix below does **not** change this
  expectation.

- Schema shapes (`src/drizzle/schema.ts`): `workingHours` (207–244) has
  `barberId`, `dayOfWeek` int 0–6 (0 = Sunday), `startTime`/`endTime` (Postgres
  `time`, arrives as `"HH:mm:ss"` strings), `availableSlots` JSONB
  `{start,end}[] | null`, `isWorking` bool. `scheduleOverrides` (253–279) has
  `barberId`, `date` (`YYYY-MM-DD` string), `isWorkingDay`, `availableSlots`
  JSONB, unique on (barberId, date).

- `src/server/booking/` currently holds `hold-expiry.ts` (+ test) — a pure
  module with its unit test beside it. **That is the pattern to match** for the
  new pure module.

- Test conventions: plain vitest `describe`/`it` (see
  `src/server/booking/hold-expiry.test.ts`). Integration tests use the plan-001
  harness (`*.itest.ts`, factories in `src/test/integration/factories.ts`).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Unit tests | `pnpm test` | all pass |
| Integration tests | `pnpm db:up && pnpm db:push && pnpm test:integration` | all pass |

## Scope

**In scope** (the only files you should modify/create):
- `src/server/booking/schedule-window.ts` (create — pure helpers)
- `src/server/booking/schedule-window.test.ts` (create)
- `src/lib/dates.ts` (fix `generateTimeSlots` end bound only)
- `src/lib/dates.test.ts` (add cases)
- `src/server/actions/bookings.ts` (schedule enforcement inside the transaction)
- `src/app/api/availability/route.ts` (validation, shared helper, past-slot filter, parallel fetch)
- `src/server/actions/bookings.itest.ts` or `src/test/integration/bookings.itest.ts` (create — prefer the latter, next to the harness)

**Out of scope** (do NOT touch, even though they look related):
- `salons.timezone` handling — all math stays Argentina-fixed (documented v1
  decision; see `docs/superpowers/specs/2026-06-19-barberia-saas-v1-design.md`).
- The hold-expiry logic and `HOLD_TTL_MS` — unchanged.
- Payment/preference code (`src/server/payments/*`) — plan 003's territory.
- The booking wizard UI (`src/app/book/**`) — plan 004 fixes the calendar.
- `startOfWeek`/`getWeekDays` in `dates.ts` — plan 004 edits those functions;
  touch only `generateTimeSlots` here.

## Git workflow

- Branch: `advisor/002-enforce-schedule-server-side`
- Conventional commits (repo style), e.g. `fix(booking): enforce working hours inside the booking transaction`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Fix the `generateTimeSlots` end bound

In `src/lib/dates.ts`, change the loop (only this) so a slot is emitted only
when it *ends* within the range:

```ts
  while (!isAfter(addMinutes(current, durationMinutes), endTime)) {
    slots.push(dateFnsFormat(current, "HH:mm"));
    current = addMinutes(current, durationMinutes);
  }
```

(`isAfter` is already imported.) Add to `src/lib/dates.test.ts`, inside the
existing `describe("generateTimeSlots")`:

```ts
  it("never emits a slot that would end past the range end", () => {
    // 45-min service in a 2h window: 10:30 would end 11:15 — excluded
    expect(generateTimeSlots("09:00", "11:00", 45)).toEqual(["09:00", "09:45"]);
  });

  it("keeps a slot that ends exactly at the range end", () => {
    expect(generateTimeSlots("10:00", "11:00", 60)).toEqual(["10:00"]);
  });
```

**Verify**: `pnpm test` → all pass, including the existing
`generates slots stepped by duration` case unchanged.

### Step 2: Create the shared pure schedule-window module

Create `src/server/booking/schedule-window.ts`:

```ts
import { generateTimeSlots, normalizeTime } from "@/lib/dates";

export interface TimeRange {
  start: string;
  end: string;
}

interface OverrideDay {
  isWorkingDay: boolean;
  availableSlots: TimeRange[] | null;
}

interface WeeklyDay {
  isWorking: boolean;
  startTime: string;
  endTime: string;
  availableSlots: TimeRange[] | null;
}

/**
 * Resolve the bookable time ranges for one barber-day. An override for the
 * exact date always wins (a working override with no explicit slots yields
 * nothing — matching the availability endpoint's behavior); otherwise the
 * weekly schedule applies, preferring the JSONB slot list over the legacy
 * start/end pair. No override and no weekly row means the day is closed.
 */
export function resolveDayRanges(
  override: OverrideDay | undefined,
  weekly: WeeklyDay | undefined,
): TimeRange[] {
  if (override) {
    if (!override.isWorkingDay) return [];
    return override.availableSlots ?? [];
  }
  if (!weekly || !weekly.isWorking) return [];
  if (weekly.availableSlots && weekly.availableSlots.length > 0) {
    return weekly.availableSlots;
  }
  return [{ start: weekly.startTime, end: weekly.endTime }];
}

/**
 * A slot is bookable only when it is one of the exact slots the schedule
 * offers for that duration — this enforces both containment (the appointment
 * fits inside an open range) and alignment (no 03:17-style offsets).
 */
export function isBookableSlot(
  ranges: TimeRange[],
  time: string,
  durationMinutes: number,
): boolean {
  const requested = normalizeTime(time);
  return ranges.some((range) =>
    generateTimeSlots(range.start, range.end, durationMinutes).includes(requested),
  );
}
```

Create `src/server/booking/schedule-window.test.ts` (model after
`hold-expiry.test.ts`) covering at minimum:
- closed weekly day → `[]`; missing weekly row → `[]`
- non-working override beats a working weekly row → `[]`
- working override with `availableSlots: null` → `[]`
- weekly `availableSlots` JSONB preferred over start/end; fallback pair used otherwise
- `isBookableSlot`: exact slot true; misaligned `"10:17"` false; slot that
  would overrun the range end false; `"09:00:00"` (seconds form) true via
  normalization; split shifts (two ranges) — a slot in the second range true.

**Verify**: `pnpm test` → new suite passes.

### Step 3: Enforce the window inside `createBookingAction`

In `src/server/actions/bookings.ts`:

1. Extend the schema import (line 4) with `scheduleOverrides, workingHours`,
   import `getDayOfWeek` from `@/lib/dates` (extend the existing import on
   line 16), and import `resolveDayRanges, isBookableSlot` from
   `@/server/booking/schedule-window`.
2. Inside the transaction, immediately **after** the service check (after line
   131, before the `endDateTime` computation), add:

```ts
      // The availability endpoint is advisory; the schedule window must hold
      // here, inside the transaction, or a crafted request books out-of-hours.
      const [override] = await tx
        .select()
        .from(scheduleOverrides)
        .where(
          and(
            eq(scheduleOverrides.barberId, barberId),
            eq(scheduleOverrides.date, sanitizedDate),
          ),
        )
        .limit(1);

      const [weekly] = await tx
        .select()
        .from(workingHours)
        .where(
          and(
            eq(workingHours.barberId, barberId),
            eq(workingHours.dayOfWeek, getDayOfWeek(sanitizedDate)),
          ),
        )
        .limit(1);

      const dayRanges = resolveDayRanges(override, weekly);
      if (!isBookableSlot(dayRanges, sanitizedTime, service.durationMinutes)) {
        throw new BookingError(
          "The selected time is outside this barber's working hours",
        );
      }
```

Notes: the two `tx` selects are cheap point lookups on unique indexes
(`schedule_overrides_barber_date_idx`, `working_hours_barber_day_idx`); keep
them sequential inside the transaction (neon transactions execute statements
serially anyway). The `BookingError` text becomes the client-facing message —
keep it as written.

**Verify**: `pnpm typecheck` → exit 0.

### Step 4: Harden the availability route and reuse the helper

In `src/app/api/availability/route.ts`:

1. Replace the presence check (lines 32–43) with Zod validation:

```ts
import { z } from "zod";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  barberId: z.coerce.number().int().positive(),
  serviceId: z.coerce.number().int().positive(),
});
```

Parse `Object.fromEntries(searchParams)` with `safeParse`; on failure return
`NextResponse.json({ error: "Invalid parameters" }, { status: 400 })`.

2. Fetch the barber and the service **in parallel**, then validate they exist,
   are active, and share a salon:

```ts
    const [[barber], [service]] = await Promise.all([
      db
        .select({ id: barbers.id, salonId: barbers.salonId })
        .from(barbers)
        .where(and(eq(barbers.id, params.barberId), eq(barbers.isActive, true)))
        .limit(1),
      db
        .select({
          id: services.id,
          salonId: services.salonId,
          durationMinutes: services.durationMinutes,
        })
        .from(services)
        .where(and(eq(services.id, params.serviceId), eq(services.isActive, true)))
        .limit(1),
    ]);

    if (!barber || !service || barber.salonId !== service.salonId) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }
```

Add `barbers` to the schema import. Delete the old service lookup block and the
`serviceDuration = 30` default (lines 106–114) — use `service.durationMinutes`.

3. Replace the inline override/weekly branching (lines 60–99) with the shared
   helper: fetch the override row and (only when no override exists you may
   still fetch weekly unconditionally — simplest is to fetch both, mirroring
   Step 3) then `const timeSlotRanges = resolveDayRanges(override, weekly)`.
   Keep the early `return NextResponse.json([])` when `timeSlotRanges.length
   === 0`.

4. After building `timeSlots`, filter out past slots when the requested date is
   today (Argentina time):

```ts
    let candidateSlots = timeSlots;
    if (formattedDate === formatDateISO(now())) {
      const nowHHmm = formatTime(now());
      candidateSlots = candidateSlots.filter((slot) => slot > nowHHmm);
    }
```

Extend the `@/lib/dates` import with `formatDateISO, formatTime`. Use
`candidateSlots` for the availability mapping (line 150).

**Verify**: `pnpm typecheck && pnpm lint` → exit 0.

### Step 5: Integration tests

Create `src/test/integration/bookings.itest.ts` using the plan-001 harness.
Server actions import `next/headers` and `next/cache`, which need mocking
outside a Next request; put this at the top of the file (before other imports
take effect — `vi.mock` is hoisted):

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-real-ip": "10.0.0.1" }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  unstable_cache: (fn: unknown) => fn,
}));
vi.mock("@/lib/email", () => ({
  sendAppointmentConfirmation: vi.fn(async () => {}),
  sendMagicLinkEmail: vi.fn(async () => {}),
}));
vi.mock("@/server/payments/mercadopago", () => ({
  createPreferenceForAppointment: vi.fn(async () => ({
    success: true,
    initPoint: "https://example.test/pay",
    sandboxInitPoint: "https://example.test/pay-sandbox",
  })),
}));

import { createBookingAction } from "@/server/actions/bookings";
import {
  createTestBarber,
  createTestSalon,
  createTestService,
  createFullWeekHours,
} from "./factories";
```

Cases (use a **free** service — `priceCents` cannot be 0 due to the DB check
constraint `services_price_positive`, so "free" is not representable; use a
priced service and assert on the mocked preference path, or assert
`result.success` plus the row's `status === "pending"`):

1. **Valid in-hours slot succeeds**: full-week 09:00–18:00 hours, book
   tomorrow at `"10:00"` with a 30-min service → `success: true`; appointment
   row exists with `status: "pending"`.
2. **Day off rejected**: insert a `scheduleOverrides` row for the target date
   with `isWorkingDay: false` → `success: false`, error mentions
   "working hours"; no appointment row inserted.
3. **Out-of-hours rejected**: book at `"20:00"` (after 18:00) → rejected.
4. **Misaligned time rejected**: book at `"10:17"` → rejected.
5. **No weekly row rejected**: barber with no `working_hours` at all → rejected.
6. **Overrun rejected**: 45-min service, hours 09:00–10:00, book `"09:30"`
   (would end 10:15) → rejected.

Build the date/time inputs from a fixed future date (e.g.
`const date = "2030-01-15"` — a Tuesday; create the weekly row for every day
via `createFullWeekHours` so weekday choice doesn't matter).

**Verify**: `pnpm db:up && pnpm db:push && pnpm test:integration` → all pass
(including plan 001's harness tests).

## Test plan

- Unit: `schedule-window.test.ts` (Step 2 list) and the two new
  `generateTimeSlots` cases (Step 1). Pattern:
  `src/server/booking/hold-expiry.test.ts`.
- Integration: the six cases in Step 5, in
  `src/test/integration/bookings.itest.ts`.
- Verification: `pnpm test` and `pnpm test:integration` both fully green.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0 (new unit cases included)
- [ ] `pnpm test:integration` exits 0 (six new booking cases pass)
- [ ] `grep -n "serviceDuration = 30" src/app/api/availability/route.ts` returns nothing
- [ ] `grep -n "workingHours" src/server/actions/bookings.ts` shows the new import and query
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts above don't match the live code (drift since `bc98614`).
- The availability route's behavior for "working override with empty/null
  `availableSlots`" turns out to differ from `resolveDayRanges` when you
  compare outputs — the helper must be bug-for-bug identical to the route's
  current resolution before replacing it.
- `vi.mock("next/headers")` fails to take effect (the action still throws
  about request scope) — the Next version may have changed its internals;
  report rather than fighting the mocking.
- You need to touch `src/server/payments/*` to make a test pass.
- Plan 001's harness is not merged yet (`src/test/integration/setup.ts`
  missing) — this plan depends on it.

## Maintenance notes

- The schedule window is now enforced in **two** consumers of one pure module
  (`schedule-window.ts`). Any future change to schedule semantics (buffer
  times, per-service lead time, salon timezone threading) must go through that
  module, never inline in the route or action.
- Plan 011 (seña) will change how paid bookings confirm; it does not alter the
  window check.
- Reviewer focus: the transplanted range-resolution semantics (Step 4.3) — the
  route previously used subtly different branches; the unit tests in Step 2
  encode the agreed behavior.
- Deferred: rejecting bookings when the *barber* belongs to a different salon
  than the page's slug (currently the salon is derived from the barber, which
  is safe); and salon-timezone support (explicit v1 non-goal).
