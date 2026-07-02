# Plan 012: "Hoy" agenda with manual WhatsApp reminder buttons

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat bc98614..HEAD -- "src/app/(dashboard)/dashboard/_components/app-sidebar.tsx" src/server/queries/appointments.ts src/lib/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3 (direction — the other half of the v1 wedge)
- **Effort**: M
- **Risk**: LOW (additive page; no existing behavior changes)
- **Depends on**: none hard; integration-test step uses plan 001's harness if
  present
- **Category**: direction
- **Planned at**: commit `bc98614`, 2026-07-01

## Why this matters

The approved v1 strategy (`docs/superpowers/specs/2026-06-19-barberia-saas-v1-design.md`,
§2 "Owner dashboard — Hoy" and §3.3) defines the screen the owner lives in:
today's appointments, each with a **Send WhatsApp reminder** button opening a
pre-filled `wa.me` link — deliberately manual (no WhatsApp Business API, no
Meta approval) to validate the no-show wedge cheaply. As of `bc98614` none of
it exists: `grep -ri "wa.me\|whatsapp\|hoy" src` returns nothing. Customer
phone numbers are already captured on every appointment. This is the
highest-retention feature per invested hour in the spec: two taps to remind
each client.

## Current state

- Sidebar nav —
  `src/app/(dashboard)/dashboard/_components/app-sidebar.tsx:19-41`:

  ```tsx
  // Menu items.
  const items = [
    { title: "Overview", url: "/dashboard", icon: Home },
    { title: "Team", url: "/dashboard/team", icon: Users },
    { title: "Schedule", url: "/dashboard/schedule", icon: Calendar },
    { title: "Services", url: "/dashboard/services", icon: Scissors },
  ];
  ```

  (icons from `lucide-react`; active state via `pathname === item.url`).

- Page pattern to copy —
  `src/app/(dashboard)/dashboard/services/page.tsx`: a server component that
  awaits `getCurrentSalonId()`, fetches, and renders inside
  `<DashboardShell>` + `<DashboardHeader heading description>`; cards/tables
  from `@/components/ui/*`.

- Data available per appointment (schema `appointments` + joins used
  elsewhere, e.g. `src/server/actions/appointments.ts:31-51`): `appointmentAt`
  (timestamptz), `status`, legacy `customerName`/`customerPhone` (populated on
  every booking by `bookings.ts:222-226`), joined `barbers.name`,
  `services.name`, `services.durationMinutes`.

- Date helpers (`src/lib/dates.ts`): `today()` (start of day, Argentina),
  `addDays`, `formatTime` (Date → `"HH:mm"`), `toArgentinaDate`. Convention:
  all wall-clock math goes through this module.

- Query conventions: `src/server/queries/appointments.ts` (plain server-side
  module, **no** `"use server"` — keep it that way; plan 005 may have added
  `getDashboardStats` here).

- Status enum: `pending | confirmed | in_progress | completed | cancelled |
  no_show`. For "Hoy", show everything still relevant today:
  `confirmed`, `pending`, `in_progress`, `completed`; exclude `cancelled`,
  `no_show`.

- Pure-helper test convention: module + `*.test.ts` beside it
  (`src/lib/slug.ts` / `slug.test.ts` is a good exemplar of a small
  string-manipulation helper with table-style tests).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Unit tests | `pnpm test` | all pass |
| Manual | `pnpm db:up && pnpm dev` → dev sign-in → `/dashboard/hoy` | agenda renders |

## Scope

**In scope** (the only files you should modify/create):
- `src/lib/whatsapp.ts` (create — pure helper)
- `src/lib/whatsapp.test.ts` (create)
- `src/server/queries/appointments.ts` (add `getTodayAgenda`)
- `src/app/(dashboard)/dashboard/hoy/page.tsx` (create)
- `src/app/(dashboard)/dashboard/_components/app-sidebar.tsx` (one nav item)

**Out of scope** (do NOT touch, even though they look related):
- Automated reminders / WhatsApp Business API — explicitly deferred to Phase 2
  by the strategy spec.
- Deposit/seña state display — plan 011's design decides it; leave a
  column-shaped gap, not an implementation.
- `recent-bookings.tsx` / dashboard Overview — different surface.
- Reminder emails — deleted as dead code by plan 007; do not resurrect.

## Git workflow

- Branch: `advisor/012-hoy-agenda`
- Conventional commits, e.g. `feat(dashboard): Hoy agenda with wa.me reminder links`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Pure WhatsApp link helper

Create `src/lib/whatsapp.ts`:

```ts
/**
 * Build a wa.me deep link with a pre-filled reminder message.
 *
 * Phone normalization is a heuristic for Argentine numbers: wa.me requires
 * country code without "+" or symbols. Numbers stored locally are typically
 * 10 digits (area + number); WhatsApp AR mobiles use 54 9 <area><number>.
 * We prepend "549" to bare 10-digit numbers and pass through anything that
 * already starts with the country code. Wrong guesses degrade gracefully:
 * WhatsApp shows "phone number shared via url is invalid".
 */
export function normalizePhoneForWhatsApp(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.startsWith("54")) return digits;
  if (digits.length === 10) return `549${digits}`;
  return digits;
}

export function buildReminderMessage(params: {
  customerName: string;
  serviceName: string;
  time: string; // "HH:mm"
  salonName: string;
}): string {
  const firstName = params.customerName.trim().split(/\s+/)[0] ?? "";
  return (
    `¡Hola ${firstName}! Te recordamos tu turno de ${params.serviceName} ` +
    `hoy a las ${params.time} hs en ${params.salonName}. ¡Te esperamos!`
  );
}

export function buildWhatsAppReminderUrl(params: {
  phone: string;
  customerName: string;
  serviceName: string;
  time: string;
  salonName: string;
}): string {
  const phone = normalizePhoneForWhatsApp(params.phone);
  const text = encodeURIComponent(buildReminderMessage(params));
  return `https://wa.me/${phone}?text=${text}`;
}
```

Create `src/lib/whatsapp.test.ts` (model on `src/lib/slug.test.ts`) covering:
- normalization: `"11 2233-4455"` → `"5491122334455"`; `"541122334455"`
  passes through; `"+54 9 11 2233 4455"` → `"5491122334455"`; an 8-digit
  landline stays as its digits (documented heuristic edge).
- message: first name only, contains service/time/salon.
- URL: starts with `https://wa.me/549...` and contains an
  `encodeURIComponent`-escaped message (assert `%20` presence and no raw
  spaces).

**Verify**: `pnpm test` → new suite passes.

### Step 2: Today's-agenda query

In `src/server/queries/appointments.ts`, add (reusing the existing import
style; needs `and, asc, eq, gte, lt, notInArray` from drizzle-orm and
`today, addDays` from `@/lib/dates`):

```ts
export async function getTodayAgenda(salonId: number) {
  const dayStart = today();
  const dayEnd = addDays(dayStart, 1);

  return db
    .select({
      id: appointments.id,
      appointmentAt: appointments.appointmentAt,
      status: appointments.status,
      customerName: appointments.customerName,
      customerPhone: appointments.customerPhone,
      barberName: barbers.name,
      serviceName: services.name,
    })
    .from(appointments)
    .innerJoin(barbers, eq(appointments.barberId, barbers.id))
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .where(
      and(
        eq(appointments.salonId, salonId),
        gte(appointments.appointmentAt, dayStart),
        lt(appointments.appointmentAt, dayEnd),
        notInArray(appointments.status, ["cancelled", "no_show"]),
      ),
    )
    .orderBy(asc(appointments.appointmentAt));
}
```

(Let errors propagate — no swallow-to-`[]`; match plan 005's stance if it
landed.) Also add a tiny salon-name fetch if none exists in a query module
yet:

```ts
// in the page (Step 3) — inline select is fine:
// db.select({ name: salons.name }).from(salons).where(eq(salons.id, salonId))
```

**Verify**: `pnpm typecheck` → exit 0.

### Step 3: The page

Create `src/app/(dashboard)/dashboard/hoy/page.tsx`, following the
`services/page.tsx` structure (server component, `DashboardShell` +
`DashboardHeader`). Content:

- `const salonId = await getCurrentSalonId();`
- `Promise.all` of `getTodayAgenda(salonId)` and the salon-name select.
- `DashboardHeader heading="Hoy"` description like
  `"Turnos de hoy y recordatorios por WhatsApp"`.
- Empty state: muted "No hay turnos para hoy." centered card (copy the
  empty-state styling from `recent-bookings.tsx:109-112`).
- One row/card per appointment, time-ordered: `formatTime(toArgentinaDate(appointmentAt))`,
  customer name, service, barber, a status `<Badge>` (reuse the
  `statusColors` mapping idea from `recent-bookings.tsx:29-34` — copy the
  mapping locally, do not import from that client file), and the reminder
  button:

```tsx
{appointment.customerPhone && appointment.appointmentAt ? (
  <Button asChild variant="outline" size="sm">
    <a
      href={buildWhatsAppReminderUrl({
        phone: appointment.customerPhone,
        customerName: appointment.customerName ?? "",
        serviceName: appointment.serviceName,
        time: formatTime(toArgentinaDate(appointment.appointmentAt)),
        salonName,
      })}
      target="_blank"
      rel="noopener noreferrer"
    >
      <MessageCircle className="size-4" />
      Recordar por WhatsApp
    </a>
  </Button>
) : null}
```

(`MessageCircle` from `lucide-react`; plain anchors keep the whole page a
server component — no `"use client"` anywhere in it.)

**Verify**: `pnpm typecheck && pnpm lint` → exit 0.

### Step 4: Sidebar entry

In `app-sidebar.tsx`, add to `items` **right after "Overview"**:

```tsx
  {
    title: "Hoy",
    url: "/dashboard/hoy",
    icon: CalendarCheck,
  },
```

adding `CalendarCheck` to the existing `lucide-react` import.

**Verify**: `pnpm typecheck` → exit 0. Manual: `pnpm db:up && pnpm dev`,
dev sign-in → sidebar shows "Hoy" → page lists today's seeded appointments
(the seed reserves on-the-hour slots; if none land on today, create one via
the booking wizard first) → clicking the button opens
`https://wa.me/549...?text=...` in a new tab with the Spanish message
pre-filled.

## Test plan

- Unit: `src/lib/whatsapp.test.ts` (Step 1 cases) — the helper carries all the
  logic worth locking in.
- If plan 001's harness exists, optionally add
  `src/test/integration/today-agenda.itest.ts`: appointments today vs
  yesterday vs tomorrow → only today's returned; cancelled excluded; foreign
  salon excluded. (Optional — do it if the harness is present, skip silently
  otherwise and say so in the report.)
- Manual: Step 4's end-to-end check.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0 with the new whatsapp suite
- [ ] `/dashboard/hoy` renders (manual check described in report)
- [ ] `grep -rn "wa.me" src/lib/whatsapp.ts` matches; no other file hardcodes wa.me
- [ ] Sidebar shows "Hoy" after Overview
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The sidebar `items` array no longer matches the excerpt (drifted structure).
- `appointmentAt` turns out to be null for rows you must display (legacy
  seed data) — the query filters on it via `gte`, so nulls are excluded by
  SQL semantics; if the page still hits null cases, report rather than
  scattering null-guards.
- Product-copy uncertainty: if the operator wants different message wording,
  that's a one-string change — don't block on it, ship the wording above and
  flag it.

## Maintenance notes

- The phone heuristic (`549` prefix) is the weakest link; when a real shop's
  numbers misfire, the durable fix is capturing phones in E.164 at booking
  time (wizard field validation) — note for the booking-form backlog.
- When plan 011 (seña) ships, this page gains a deposit-state chip per row —
  the design doc owns the decision; the query here just adds the join.
- Phase 2 automation (reminder cron + WhatsApp API) replaces the *button*,
  not the page: "Hoy" stays the owner's operational screen.
- Reviewer focus: the page must stay a server component (anchors, no client
  handlers) — that's what keeps it trivially fast and testable.
