# Plan 004: Allow same-day booking and show the full 7-day schedule week

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat bc98614..HEAD -- src/app/book/_steps/date-time-step.tsx src/server/actions/schedule.ts src/lib/dates.ts src/lib/dates.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (coordinate with plan 002, which edits a *different*
  function in `src/lib/dates.ts` — execute sequentially, not in parallel)
- **Category**: bug
- **Planned at**: commit `bc98614`, 2026-07-01

## Why this matters

Two small bugs with outsized product impact for a walk-in-heavy trade:

1. **Customers can never book for today.** The wizard's calendar disables any
   day cell `< new Date()`. Day cells are midnight-of-day, so today's cell
   (00:00) is always before "now" and stays disabled — even though the server
   explicitly allows future-of-today times. Same-day bookings are a
   barbershop's bread and butter.
2. **The dashboard weekly schedule never shows Saturday** — typically the
   busiest day. The week window queries 7 days but renders 6, and it anchors
   on Sunday (date-fns default) while the code comments and a special case
   clearly intend Monday.

## Current state

- `src/app/book/_steps/date-time-step.tsx:52-60` — the calendar:

  ```tsx
      <Calendar
        mode="single"
        selected={state.date ?? undefined}
        onSelect={(date) => {
          setState({ date, time: "" }); // Reset time when date changes
        }}
        className="rounded-md border"
        disabled={(date) => date < new Date()}
      />
  ```

  The component is a client component. Slots for a selected day come from
  `GET /api/availability` (fetched via TanStack Query above this excerpt);
  plan 002 makes that endpoint filter out already-past slots for today. The
  server action independently rejects past date-times
  (`src/server/actions/bookings.ts:102-104`), so enabling today is safe even
  if plan 002 hasn't landed yet — a stale past slot would fail with "Cannot
  book a time in the past".

- `src/lib/dates.ts:206-214`:

  ```ts
  /**
   * Get start of week for a date in Argentina timezone
   * Week starts on Sunday (default in Argentina)
   */
  export function startOfWeek(date: TZDate | Date): TZDate {
    const tzDate = date instanceof TZDate ? date : toArgentinaDate(date);
    const result = dateFnsStartOfWeek(tzDate);
    return toArgentinaDate(result);
  }
  ```

  `dateFnsStartOfWeek` without options defaults to Sunday. `startOfWeek` has
  exactly two callers: `getWeekDays` in the same file (`dates.ts:220-231`,
  feeds the Recent Bookings day-filter dropdown — its behavior must NOT
  change) and `getWeeklySchedule` below.

- `src/server/actions/schedule.ts:27-38` and `:76`:

  ```ts
  export async function getWeeklySchedule(
    employeeId: number,
  ): Promise<DaySchedule[]> {
    const salonId = await getCurrentSalonId();
    const todayDate = today();
    // If it's Sunday (day 0), start from tomorrow (Monday)
    // Otherwise start from the beginning of the week (Monday)
    const weekStart =
      todayDate.getDay() === 0
        ? addDays(todayDate, 1)
        : startOfWeek(todayDate);
    const weekEnd = addDays(weekStart, 6);
    ...
    const schedule: DaySchedule[] = Array.from({ length: 6 }).map((_, index) => {
  ```

  The DB query spans `weekStart..weekEnd` (7 calendar days, via
  `between(appointments.date, formatDateISO(weekStart), formatDateISO(weekEnd))`),
  but only 6 days are rendered — and on Mon–Sat, `weekStart` is the *past*
  Sunday, so the visible window is Sun..Fri: Saturday is queried, then
  silently discarded.

- Tests: `src/lib/dates.test.ts` is the pattern (plain vitest). Existing tests
  pin `parseDateTime` to Argentina UTC-3; nothing covers `startOfWeek`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Unit tests | `pnpm test` | all pass |
| Manual check | `pnpm db:up && pnpm dev` | app on :3000 |

## Scope

**In scope** (the only files you should modify):
- `src/app/book/_steps/date-time-step.tsx` (the `disabled` prop only)
- `src/lib/dates.ts` (`startOfWeek` signature only)
- `src/lib/dates.test.ts` (add `startOfWeek` cases)
- `src/server/actions/schedule.ts` (week window + render length + stale comment)

**Out of scope** (do NOT touch, even though they look related):
- `getWeekDays` and its dropdown consumers — Sunday-start there is fine and
  changing it silently shifts the Recent Bookings filter.
- `generateTimeSlots` in `dates.ts` — plan 002 owns it.
- The hardcoded `totalSlots = 8` in `schedule.ts:80` — known debt, separate
  concern (real capacity comes from working hours; leave as-is).
- Browser-timezone date submission in `booking-form.tsx:69-74` — acceptable
  for the Argentina-only v1; recorded as future work in plan 011/`plans/README.md`.

## Git workflow

- Branch: `advisor/004-same-day-and-saturday`
- Conventional commits, e.g. `fix(booking): allow same-day selection in the wizard calendar`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Enable today in the wizard calendar

In `src/app/book/_steps/date-time-step.tsx`, replace the `disabled` prop:

```tsx
        disabled={(date) => {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          return date < startOfToday;
        }}
```

(Local-midnight comparison matches how the calendar builds its day cells and
how `booking-form.tsx` serializes the chosen day — keep them consistent.)

**Verify**: `pnpm typecheck` → exit 0. Manual: `pnpm dev`, open
`/elite-barbershop/book` (seeded salon), pick a barber → today's date is
selectable; a past date is not.

### Step 2: Give `startOfWeek` an explicit week-start parameter

In `src/lib/dates.ts`, change only the signature/body (keep the JSDoc but
update it):

```ts
/**
 * Get start of week for a date in Argentina timezone.
 * Defaults to Sunday (used by getWeekDays); pass 1 for Monday-based weeks.
 */
export function startOfWeek(
  date: TZDate | Date,
  weekStartsOn: 0 | 1 = 0,
): TZDate {
  const tzDate = date instanceof TZDate ? date : toArgentinaDate(date);
  const result = dateFnsStartOfWeek(tzDate, { weekStartsOn });
  return toArgentinaDate(result);
}
```

Add to `src/lib/dates.test.ts`:

```ts
import { startOfWeek, formatDateISO } from "@/lib/dates"; // merge with existing imports

describe("startOfWeek", () => {
  // 2026-06-24 is a Wednesday
  const wednesday = new Date("2026-06-24T15:00:00Z");

  it("defaults to Sunday", () => {
    expect(formatDateISO(startOfWeek(wednesday))).toBe("2026-06-21");
  });

  it("supports Monday-based weeks", () => {
    expect(formatDateISO(startOfWeek(wednesday, 1))).toBe("2026-06-22");
  });
});
```

**Verify**: `pnpm test` → all pass (existing suites untouched).

### Step 3: Fix the weekly schedule window and render all 7 days

In `src/server/actions/schedule.ts`:

1. Replace lines 32–37 (comment + weekStart) with:

```ts
  // Monday-based week. On Sunday, show the upcoming week starting tomorrow;
  // any other day, show the current week from its Monday.
  const weekStart =
    todayDate.getDay() === 0
      ? addDays(todayDate, 1)
      : startOfWeek(todayDate, 1);
```

2. Change the render loop length from 6 to 7 (line 76):

```ts
  const schedule: DaySchedule[] = Array.from({ length: 7 }).map((_, index) => {
```

3. Confirm the consumers render a length-agnostic list: run
   `grep -rn "getWeeklySchedule" src --include='*.tsx' --include='*.ts'` and
   open each consumer (expected:
   `src/app/(dashboard)/dashboard/schedule/_components/employee-schedule.tsx`
   and/or `manage-schedule.tsx`). They must map over the returned array. If a
   consumer hardcodes a 6-column grid or slices to 6, that is a STOP condition
   (report the file — the fix likely belongs there too, but confirm scope
   first).

**Verify**: `pnpm typecheck && pnpm test` → exit 0 / all pass. Manual:
`pnpm dev` → `/dashboard` (use the dev "login as test owner" button on
`/sign-in`) → Schedule → the week now starts on Monday and includes Saturday
and Sunday (7 cards/rows).

## Test plan

- New unit tests: the two `startOfWeek` cases above (`src/lib/dates.test.ts`,
  modeled on the existing describes in that file).
- Manual verification for the two UI-visible behaviors (steps 1 and 3), since
  component-level rendering has no test infrastructure in this repo.
- Verification: `pnpm test` green.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0, including 2 new `startOfWeek` cases
- [ ] `grep -n "length: 6" src/server/actions/schedule.ts` returns nothing
- [ ] `grep -n "date < new Date()" src/app/book/_steps/date-time-step.tsx` returns nothing
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts don't match the live code (drift since `bc98614`).
- A `getWeeklySchedule` consumer hardcodes a 6-day layout (Step 3.3).
- Making today selectable surfaces availability responses containing past
  times *after* plan 002 is merged (its filter should prevent that — if it
  doesn't, that's a plan-002 regression to report, not to patch here).

## Maintenance notes

- If salon-timezone support ever lands (deferred v1 non-goal), the
  local-midnight comparison in Step 1 and the date serialization in
  `booking-form.tsx:69-74` must both switch to salon-timezone day boundaries —
  they are the two places the browser's clock leaks into booking.
- Reviewer focus: Step 3's window semantics on Sundays (upcoming week, not the
  week that just ended) — that's an intentional behavior choice inherited from
  the existing special case.
