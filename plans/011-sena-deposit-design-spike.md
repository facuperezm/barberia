# Plan 011: Seña (deposit) — design spike

> **Executor instructions**: This is a **design spike, not a build plan**. The
> deliverable is a written design document plus validated answers to the open
> questions below — no production code changes. Follow the steps; if anything
> in "STOP conditions" occurs, stop and report. When done, update the status
> row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat bc98614..HEAD -- src/server/payments/ src/server/actions/bookings.ts src/drizzle/schema.ts`
> Material drift in the payment/booking layer changes this spike's inputs —
> re-read those files before writing the design.

## Status

- **Priority**: P3 (highest-value *direction* item; sequenced after integrity fixes)
- **Effort**: S (the spike itself; the build it specifies is M)
- **Risk**: LOW (no code changes)
- **Depends on**: plans/002-enforce-schedule-server-side.md and
  plans/003-idempotent-payment-application.md — the deposit flow must build on
  enforced schedules and idempotent payments, and the design must reference
  their landed shapes.
- **Category**: direction
- **Planned at**: commit `bc98614`, 2026-07-01

## Why this matters

The approved v1 strategy (`docs/superpowers/specs/2026-06-19-barberia-saas-v1-design.md`)
bets the product on the **no-show killer**: *"cobrá la seña, mandá el
recordatorio, llená la silla."* Its pricing pitch is literally "una seña
recuperada al mes lo paga." As of `bc98614` there is **zero** deposit code —
no schema fields, no toggle, no wizard enforcement (verified:
`grep -ri "deposit\|seña" src` is empty). The spec itself says the build is
"mostly a per-shop toggle + amount, not new payment infra," because
MercadoPago preference creation, the webhook, reconciliation, and the
payment-pending/success/failed routes all exist.

This spike turns that one-liner into a buildable specification: exact schema,
exact touchpoints, and answers to the ambiguities that would otherwise be
decided ad hoc mid-implementation.

## Current state (the facts the design must build on)

- **Payment amount is the full service price today.**
  `src/server/payments/mercadopago.ts:60-92` creates the MP preference with
  `unit_price: service.priceCents / 100` and a 30-minute expiry window
  (`expiration_date_to: now + 30min`, matching `HOLD_TTL_MS` in
  `src/server/booking/hold-expiry.ts:9`).
- **Confirmation is amount-checked against the full price.**
  `src/server/payments/apply-payment.ts` computes
  `amountCents = Math.round(transaction_amount * 100)` and
  `decidePaymentOutcome` (`src/server/payments/payment-status.ts`) returns
  `amount_mismatch` when `amountCents < servicePriceCents`. **A deposit is by
  definition an "amount mismatch" under today's rule** — the expected-amount
  input must become deposit-aware.
- **Paid vs free split.** `src/server/actions/bookings.ts:220`:
  `status: service.priceCents > 0 ? "pending" : "confirmed"` — paid bookings
  hold the slot as `pending` until the webhook confirms. Note the DB check
  constraint `services_price_positive` (`schema.ts:157`) forbids
  `priceCents = 0`, so *every* service is currently "paid".
- **Tenancy config lives on `salons`** (`schema.ts:65-89`): name, slug, owner,
  contact, `timezone` (unused), `isActive`. No settings UI exists yet — the
  spec's non-goals deferred salon settings.
- **Booking result surfaces**: `/book/success` (with reconcile fallback),
  `/book/payment-pending`, `/book/payment-failed` already handle the
  redirect-back states.
- **Refunds are unhandled** by explicit TODO (`apply-payment.ts:130-132`) and
  deferred to Phase 2 — the seña design must not silently depend on refunds
  existing.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Verify absence still holds | `grep -rin "deposit\|seña" src` | empty (else drift) |
| Read the strategy | `docs/superpowers/specs/2026-06-19-barberia-saas-v1-design.md` | context |

## Scope

**In scope**: producing `docs/superpowers/specs/<date>-sena-deposit-design.md`
(match the existing specs' format: Context / Goals / Non-goals / Decisions
table / Design / Risks / Files touched).

**Out of scope**: any change under `src/`; MercadoPago account/dashboard
configuration; building the settings UI (the design may propose one).

## Git workflow

- Branch: `advisor/011-sena-design-spike`
- One commit: `docs(spec): seña deposit design`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Decide the configuration model (recommendation included)

Evaluate and pick one, documenting the rejection reasons for the others:

- **A. Per-salon flat deposit** — `salons.depositCents: integer | null`
  (null = seña off). One knob, matches the concierge pitch ("la seña es
  $5.000"). **Recommended starting point** — smallest surface, one settings
  field later.
- B. Per-service deposit — `services.depositCents` — more control, more UI,
  more migration burden; defer until a real shop asks.
- C. Percentage of service price — rounding + minimum-amount interactions with
  MercadoPago; defer.

The design doc must state: chosen model, column definition (nullable integer
cents on `salons`, CHECK `> 0` when not null), and how a shop with seña OFF
behaves (exactly today's full-price flow? or no payment at all?). **Open
product question to surface, not decide silently**: when seña is ON, does the
customer pay *deposit only* (remainder in person) or *full amount*? The spec's
language ("seña to confirm") implies deposit-only with remainder at the chair
— confirm with the operator.

### Step 2: Trace every touchpoint and specify the change

For each, name the file/function and the exact change the build plan will make:

1. `src/drizzle/schema.ts` — the new column (+ any check constraint).
2. `src/server/actions/bookings.ts` — status decision: with seña ON the
   booking stays `pending` until the *deposit* is paid; with seña OFF decide
   (per Step 1) whether today's full-price flow remains.
3. `src/server/payments/mercadopago.ts` — preference `unit_price` becomes the
   deposit amount; item `title`/`description` must say "Seña — <service>"
   (statement descriptor already carries the salon name); expiry window
   unchanged (30 min, matches hold TTL).
4. `src/server/payments/payment-status.ts` / `apply-payment.ts` — the
   `servicePriceCents` input generalizes to `expectedAmountCents` (deposit
   when seña ON). Must compose with plan 003's monotonic-status and
   conditional-transition machinery, not bypass it.
5. `src/components/emails/appointment-confirmation.tsx` + booking success page
   — show "seña pagada: $X — restante en el local: $Y".
6. Dashboard: where the owner sees deposit state (plan 010's Recent Bookings
   payload and/or plan 012's "Hoy" agenda — coordinate, don't duplicate).
7. Settings surface: minimal owner-facing way to set the deposit (even if v1
   is "operator sets it in the DB during concierge onboarding" — say so
   explicitly).

### Step 3: Specify the failure-mode policy

The design must answer, in writing:

- Customer pays seña, then no-shows → deposit is **kept** (that's the
  product); where does that state live? (Probably: appointment `no_show` +
  payment stays `succeeded` — confirm nothing in plan 003's machinery fights
  it.)
- Shop cancels on the customer → refund is manual via MercadoPago dashboard
  for now (refund automation is Phase 2); the doc must say this out loud.
- Deposit paid but slot released (late payment race, plan 003's
  `paid_but_released` outcome) → same manual-refund path; reference the
  logged signal.
- MercadoPago minimum transaction amount vs tiny deposits — verify the current
  ARS minimum from MP docs and set a floor in validation.

### Step 4: Write the spec + build checklist

Produce the design doc (format per Scope). End it with a build checklist
sized like this repo's other plans (schema → payments → wizard → emails →
settings → tests), each item referencing the touchpoints from Step 2, and an
explicit test list (extend `payment-status.test.ts` for deposit amounts;
integration cases on the plan-001 harness for deposit-confirms-booking and
deposit-mismatch).

**Verify**: the doc exists under `docs/superpowers/specs/`, follows the house
format, answers every question in Steps 1–3, and contains no unresolved
"TBD" without an owner.

## Test plan

Not applicable (no code). The "test" is review: an operator reading only the
produced spec can approve or redirect the deposit design without opening the
codebase.

## Done criteria

- [ ] `docs/superpowers/specs/<date>-sena-deposit-design.md` exists, in the house spec format
- [ ] Configuration model chosen with alternatives recorded (Step 1)
- [ ] All seven touchpoints specified with file paths (Step 2)
- [ ] Failure-mode policy written, including the manual-refund reality (Step 3)
- [ ] Build checklist + test list included (Step 4)
- [ ] No files under `src/` modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plans 002/003 have not landed — the design would specify against a payment
  layer that is about to change under it.
- You find deposit-related code already merged (someone started building) —
  reconcile with what exists instead of designing in parallel.
- The deposit-only vs full-amount question (Step 1) cannot be answered from
  the spec and no operator is available — deliver the doc with both variants
  costed rather than picking silently.

## Maintenance notes

- This spike's output supersedes nothing: the 2026-06-19 strategy spec remains
  the "why"; this doc is the "how".
- The refund/chargeback TODO (`apply-payment.ts:130`) becomes materially more
  urgent once real deposits flow — the design doc should say so and point at
  the Phase 2 roadmap item.
- Plan 012's "Hoy" agenda shows deposit state per appointment; whichever ships
  second wires the display.
