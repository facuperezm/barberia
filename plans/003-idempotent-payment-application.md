# Plan 003: Make payment application idempotent and safe for late/out-of-order events

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat bc98614..HEAD -- src/server/payments/ src/drizzle/schema.ts scripts/ src/app/api/mercadopago/webhooks/route.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (money path; schema unique index requires a dedupe pass on existing data)
- **Depends on**: plans/001-db-test-harness.md
- **Category**: bug
- **Planned at**: commit `bc98614`, 2026-07-01

## Why this matters

`applyMercadoPagoPayment` is invoked from **two concurrent paths**: the
MercadoPago webhook (`src/app/api/mercadopago/webhooks/route.ts:55`) and the
success-page reconciliation fallback
(`src/server/actions/appointments.ts:100-108` →
`src/server/payments/reconcile.ts:34-36`). Right after a customer pays, both
typically fire within the same second. The function's doc comment claims it is
"idempotent", but it is check-then-act with no transaction and no unique
constraint, so the race produces **duplicate payment rows** and **two
confirmation emails**. Three adjacent defects share the fix:

1. A late `rejected` notification arriving after `approved` overwrites
   `payments.status = "succeeded"` with `"failed"` (the downgrade guard only
   protects against `pending`/`processing`).
2. A slow-settling payment (Argentine boleto/ticket) that approves *after* the
   30-minute hold expired and another customer took the slot re-confirms the
   `cancelled` appointment with a bare `UPDATE`, which violates the
   `appointments_no_double_booking` exclusion constraint → throws → the
   webhook returns 500 → MercadoPago retries indefinitely, and the paying
   customer stays cancelled with no operator signal.
3. `paymentId` can be the empty string (`String(paymentData.id ?? "")`),
   which would make unrelated broken payloads collide once a unique index
   exists.

## Current state

- `src/server/payments/apply-payment.ts` (189 lines). Key excerpts:

  ```ts
  // :51-52
  const appointmentId = parseInt(externalReference.replace("appointment-", ""));
  const paymentId = String(paymentData.id ?? "");

  // :80-93 — check-then-act, no transaction
  const [existingPayment] = await db
    .select({ id: payments.id, status: payments.status })
    .from(payments)
    .where(eq(payments.mercadopagoPaymentId, paymentId))
    .limit(1);

  const isDowngrade =
    existingPayment &&
    (existingPayment.status === "succeeded" ||
      existingPayment.status === "refunded") &&
    (paymentStatus === "pending" || paymentStatus === "processing");
  const effectiveStatus = isDowngrade ? existingPayment.status : paymentStatus;

  // :113-128 — UPDATE or INSERT depending on the pre-read

  // :154-160 — unconditional confirm + pre-read email guard
  if (outcome === "confirm") {
    const wasAlreadyConfirmed = appointmentRow.status === "confirmed";
    await db
      .update(appointments)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(eq(appointments.id, appointmentId));
    if (!wasAlreadyConfirmed && appointmentRow.customerEmail && ...) {
      await sendAppointmentConfirmation({ ... });   // :168
    }
  } else if (outcome === "cancel") {                 // :183-188
    await db.update(appointments).set({ status: "cancelled", ... })
      .where(eq(appointments.id, appointmentId));
  }
  ```

  `paymentFields` (`:95-111`) carries `status: effectiveStatus` plus the
  MercadoPago metadata columns and `updatedAt`.

- `src/server/payments/payment-status.ts` — pure, unit-tested
  (`payment-status.test.ts`). `decidePaymentOutcome` (lines 40–59):

  ```ts
  if (paymentStatus === "succeeded") {
    if (amountCents < servicePriceCents) return "amount_mismatch";
    return "confirm";                    // ← ignores appointmentStatus
  }
  if (paymentStatus === "failed" && appointmentStatus === "pending") {
    return "cancel";
  }
  return "noop";
  ```

  `PaymentOutcome = "confirm" | "cancel" | "amount_mismatch" | "noop"`.

- `src/drizzle/schema.ts:438-440` — plain (non-unique) index:

  ```ts
  index("payments_mercadopago_payment_id_idx").on(
    table.mercadopagoPaymentId,
  ),
  ```

  `mercadopagoPaymentId` is nullable `text` (`:406`).

- Webhook route (`src/app/api/mercadopago/webhooks/route.ts:49-63`): any throw
  from `applyMercadoPagoPayment` → `500` (deliberate, so MP retries transient
  failures). That stays; the fix is that a released appointment must **not**
  throw.

- Constraint semantics (`scripts/apply-booking-constraint.ts:38-50`): overlap
  forbidden among rows with `status NOT IN ('cancelled','no_show')` — flipping
  a cancelled row back to `confirmed` while another row holds the range raises
  SQLSTATE `23P01`.

- Repo rule (CLAUDE.md): **after any `pnpm db:push`, re-apply the booking
  constraint** with `pnpm tsx --env-file .env scripts/apply-booking-constraint.ts`.

- Script convention to copy: `scripts/apply-booking-constraint.ts` — a small
  idempotent tsx script using `db.execute(sql\`...\`)`, `process.exit`, and a
  guard that reports conflicts instead of proceeding.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Unit tests | `pnpm test` | all pass |
| Local DB up | `pnpm db:up` | healthy |
| Push schema | `pnpm db:push` | exit 0 |
| Re-apply constraint | `pnpm tsx --env-file .env scripts/apply-booking-constraint.ts` | "constraint applied" |
| Integration tests | `pnpm test:integration` | all pass |

## Scope

**In scope** (the only files you should modify/create):
- `src/drizzle/schema.ts` (one index → uniqueIndex)
- `scripts/dedupe-mp-payments.ts` (create)
- `src/server/payments/apply-payment.ts`
- `src/server/payments/payment-status.ts`
- `src/server/payments/payment-status.test.ts`
- `src/test/integration/factories.ts` (add an appointment factory)
- `src/test/integration/apply-payment.itest.ts` (create)

**Out of scope** (do NOT touch, even though they look related):
- `src/app/api/mercadopago/webhooks/route.ts` — its 401/400/500 semantics are
  correct and stay as-is.
- `src/server/payments/reconcile.ts` — the payment-selection heuristic is fine.
- Refund/chargeback appointment handling — the TODO at `apply-payment.ts:130`
  is explicitly deferred (Phase 2 roadmap; see plan 011's maintenance notes).
- `src/server/payments/mercadopago.ts`, `webhook-signature.ts`.

## Git workflow

- Branch: `advisor/003-idempotent-payment-application`
- Conventional commits, e.g. `fix(payments): atomic idempotent payment upsert + monotonic status`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Guard against missing payment ids

In `apply-payment.ts`, replace `const paymentId = String(paymentData.id ?? "");`
(line 52) with:

```ts
  if (paymentData.id == null || String(paymentData.id).length === 0) {
    logger.warn("Payment payload missing id — skipping", { externalReference });
    return;
  }
  const paymentId = String(paymentData.id);
```

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Unique index + data dedupe script

1. In `src/drizzle/schema.ts:438`, change the payments index to:

```ts
    uniqueIndex("payments_mercadopago_payment_id_idx").on(
      table.mercadopagoPaymentId,
    ),
```

(Postgres treats NULLs as distinct in unique indexes, so rows without a MP id
remain unconstrained.)

2. Create `scripts/dedupe-mp-payments.ts` (mirror the structure of
`scripts/apply-booking-constraint.ts` — header comment, `main()`, exit codes):

```ts
/**
 * Prepares the payments table for the unique index on mercadopago_payment_id:
 * empty-string ids become NULL, and duplicate rows per id are removed keeping
 * the oldest. Idempotent. Run BEFORE `pnpm db:push` when applying plan 003.
 *
 * Run: pnpm tsx --env-file .env scripts/dedupe-mp-payments.ts
 */
import { db } from "../src/drizzle";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(
    sql`UPDATE payments SET mercadopago_payment_id = NULL WHERE mercadopago_payment_id = ''`,
  );
  const deleted = await db.execute(sql`
    DELETE FROM payments a
    USING payments b
    WHERE a.mercadopago_payment_id = b.mercadopago_payment_id
      AND a.mercadopago_payment_id IS NOT NULL
      AND a.id > b.id
    RETURNING a.id
  `);
  console.log(`✓ deduped ${deleted.rows.length} duplicate payment row(s)`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Dedupe failed:", error);
  process.exit(1);
});
```

3. Apply locally, in this order:

```
pnpm db:up
pnpm tsx --env-file .env scripts/dedupe-mp-payments.ts
pnpm db:push
pnpm tsx --env-file .env scripts/apply-booking-constraint.ts
```

(`db:push` will create the unique index; the constraint re-apply afterwards is
the standing repo rule.)

**Verify**: `pnpm db:push` exits 0 with the unique index created (no duplicate
errors). Record in your report that **production needs the same three commands
against the prod `DATABASE_URL` at deploy time** — do not run them against
production yourself.

### Step 3: Atomic upsert with monotonic status

In `apply-payment.ts`, delete the pre-read block (the `existingPayment`
select, `isDowngrade`, and `effectiveStatus`, lines 79–93) and the
INSERT-or-UPDATE branch (lines 113–128). Set `status: paymentStatus` inside
`paymentFields`, then replace the write with a single upsert:

```ts
  await db
    .insert(payments)
    .values({
      appointmentId,
      amountCents,
      method: "mercadopago",
      mercadopagoPaymentId: paymentId,
      mercadopagoPreferenceId: paymentData.order?.id?.toString() ?? null,
      mercadopagoExternalReference: externalReference,
      ...paymentFields,
    })
    .onConflictDoUpdate({
      target: payments.mercadopagoPaymentId,
      set: {
        ...paymentFields,
        // Monotonic toward terminal states: refunded is final; succeeded can
        // only advance to refunded; anything else takes the incoming status.
        status: sql`CASE
          WHEN ${payments.status} = 'refunded' THEN ${payments.status}
          WHEN ${payments.status} = 'succeeded' AND excluded.status <> 'refunded'
            THEN ${payments.status}
          ELSE excluded.status
        END`,
      },
    });
```

Add `sql` to the drizzle-orm import (line 4: `import { and, eq, sql } from
"drizzle-orm";` — `and` is used in Step 4). Inside `onConflictDoUpdate`,
`${payments.status}` renders as the target table's current column value and
`excluded.status` is the incoming row — this is the standard Postgres
`ON CONFLICT` idiom. If TypeScript complains about the `SQL` type on the
`status` field, cast the set object value as
`status: sql`…`.as(...)` is NOT needed — drizzle accepts `SQL` in `set`; if it
does not typecheck, use `status: sql.raw("CASE ... END")` with the same text
and report the workaround in your summary.

**Verify**: `pnpm typecheck` → exit 0.

### Step 4: Conditional appointment transition = the idempotency gate

Still in `apply-payment.ts`, replace the confirm/cancel branches (lines
154–188) with transitions that only fire from `pending`, and email only when
*this call* performed the transition:

```ts
  if (outcome === "confirm") {
    const transitioned = await db
      .update(appointments)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(
        and(
          eq(appointments.id, appointmentId),
          eq(appointments.status, "pending"),
        ),
      )
      .returning({ id: appointments.id });

    if (
      transitioned.length > 0 &&
      appointmentRow.customerEmail &&
      appointmentRow.appointmentAt
    ) {
      try {
        await sendAppointmentConfirmation({
          customerName: appointmentRow.customerName ?? "Cliente",
          customerEmail: appointmentRow.customerEmail,
          date: appointmentRow.appointmentAt,
          time: formatTime(toArgentinaDate(appointmentRow.appointmentAt)),
          service: appointmentRow.serviceName,
          barberName: appointmentRow.barberName,
        });
      } catch (error) {
        // Don't fail over email — the payment is already recorded
        logger.error("Failed to send confirmation email", error as Error, {
          appointmentId,
        });
      }
    }
  } else if (outcome === "cancel") {
    await db
      .update(appointments)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(appointments.id, appointmentId),
          eq(appointments.status, "pending"),
        ),
      );
  } else if (outcome === "paid_but_released") {
    logger.error(
      "Approved payment for a released appointment — needs manual review/refund",
      undefined,
      { paymentId, appointmentId, amountCents },
    );
  }
```

Delete the `wasAlreadyConfirmed` variable. Because the UPDATE matches only
`pending` rows, a re-confirm of a `cancelled` appointment matches zero rows —
no exclusion-constraint violation, no webhook 500 loop; the payment row itself
was already persisted as `succeeded` in Step 3 (the audit trail for the manual
refund).

**Verify**: `pnpm typecheck` → exit 0.

### Step 5: New `paid_but_released` outcome in the pure decision

In `src/server/payments/payment-status.ts`:

```ts
export type PaymentOutcome =
  | "confirm"
  | "cancel"
  | "amount_mismatch"
  | "paid_but_released"
  | "noop";
```

and inside `decidePaymentOutcome`, in the `succeeded` branch after the amount
check:

```ts
  if (paymentStatus === "succeeded") {
    if (amountCents < servicePriceCents) return "amount_mismatch";
    if (
      appointmentStatus === "cancelled" ||
      appointmentStatus === "no_show"
    ) {
      return "paid_but_released";
    }
    return "confirm";
  }
```

Update `src/server/payments/payment-status.test.ts` — add cases:
- succeeded + full amount + `appointmentStatus: "cancelled"` → `"paid_but_released"`
- succeeded + full amount + `appointmentStatus: "no_show"` → `"paid_but_released"`
- succeeded + full amount + `appointmentStatus: "confirmed"` → still `"confirm"`
  (idempotent redelivery is resolved by the conditional UPDATE, not here)

**Verify**: `pnpm test` → all pass, including the new cases.

### Step 6: Integration tests

Add to `src/test/integration/factories.ts`:

```ts
import { appointments } from "@/drizzle/schema";

export async function createTestAppointment(params: {
  salonId: number;
  barberId: number;
  serviceId: number;
  appointmentAt: Date;
  durationMinutes?: number;
  status?: "pending" | "confirmed" | "cancelled";
  customerEmail?: string;
}) {
  const duration = params.durationMinutes ?? 30;
  const [appointment] = await db
    .insert(appointments)
    .values({
      salonId: params.salonId,
      barberId: params.barberId,
      serviceId: params.serviceId,
      appointmentAt: params.appointmentAt,
      endTime: new Date(params.appointmentAt.getTime() + duration * 60_000),
      status: params.status ?? "pending",
      customerName: "Test Customer",
      customerEmail: params.customerEmail ?? "customer@test.local",
      customerPhone: "1122334455",
    })
    .returning();
  return appointment!;
}
```

(merge the `appointments` import with the existing schema import line.)

Create `src/test/integration/apply-payment.itest.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email", () => ({
  sendAppointmentConfirmation: vi.fn(async () => {}),
  sendMagicLinkEmail: vi.fn(async () => {}),
}));

import { applyMercadoPagoPayment } from "@/server/payments/apply-payment";
import { sendAppointmentConfirmation } from "@/lib/email";
import { db } from "@/drizzle";
import { appointments, payments } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import {
  createTestAppointment,
  createTestBarber,
  createTestSalon,
  createTestService,
} from "./factories";
```

Helper inside the file: `approvedPayload(appointmentId, amountPesos, overrides?)`
returning a `MercadoPagoPaymentData`-shaped object
(`{ id: 111, external_reference: \`appointment-${appointmentId}\`, status: "approved", transaction_amount: amountPesos }`).
Remember `transaction_amount` is in **pesos** and the service price in cents
(`amountCents = Math.round(transaction_amount * 100)` in the code under test).

Cases (fresh salon/barber/service/appointment in each; service
`priceCents: 100_00` → `transaction_amount: 100`):

1. **Approved confirms + emails once**: apply once → appointment `confirmed`,
   one `payments` row with status `succeeded`, `sendAppointmentConfirmation`
   called exactly once.
2. **Redelivery is a no-op**: apply the same payload twice sequentially →
   still one payments row, email still called exactly once.
3. **Concurrent delivery**: `await Promise.all([apply(p), apply(p)])` → one
   payments row (the unique index serializes; one call may surface a `23505`
   — if `applyMercadoPagoPayment` throws on either promise, that is a FINDING:
   wrap in `Promise.allSettled` and assert at most one rejection, then report
   it in your summary), email called at most once.
4. **Late rejection cannot downgrade**: apply approved, then apply the same
   `id` with `status: "rejected"` → payments row stays `succeeded`,
   appointment stays `confirmed`.
5. **Approved for a released slot**: appointment created with
   `status: "cancelled"`, apply approved → appointment **stays** `cancelled`,
   no throw, payments row `succeeded`, email not called.
6. **Amount mismatch**: `transaction_amount: 50` against `priceCents: 100_00`
   → appointment stays `pending`, no email.

`vi.mocked(sendAppointmentConfirmation).mockClear()` in a `beforeEach`.

**Verify**: `pnpm test:integration` → all pass (with the plan-001 and plan-002
suites, if present).

## Test plan

- Unit: three new `decidePaymentOutcome` cases (Step 5) in
  `payment-status.test.ts` (existing file is the pattern).
- Integration: the six cases in Step 6.
- Verification: `pnpm test` and `pnpm test:integration` green.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0 (new payment-status cases included)
- [ ] `pnpm test:integration` exits 0 (six new apply-payment cases pass)
- [ ] `grep -n "uniqueIndex(\"payments_mercadopago_payment_id_idx\")" src/drizzle/schema.ts` matches
- [ ] `grep -n "wasAlreadyConfirmed" src/server/payments/apply-payment.ts` returns nothing
- [ ] `scripts/dedupe-mp-payments.ts` exists and ran locally before `db:push`
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated (note the prod migration commands in the row's comment or your report)

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts don't match the live code (drift since `bc98614`).
- `pnpm db:push` fails to create the unique index even after the dedupe script
  ran cleanly — inspect what duplicate/empty values remain and report.
- Drizzle rejects the `SQL` value in `onConflictDoUpdate.set.status` and the
  `sql.raw` fallback also fails to typecheck — report the exact error instead
  of restructuring the write path.
- The concurrent-delivery test shows **both** parallel calls failing (not just
  one 23505 loser) — that means the upsert isn't absorbing the conflict and
  the design needs revisiting.
- You feel the need to modify the webhook route's status codes.

## Maintenance notes

- Deploy sequence for production: `dedupe-mp-payments.ts` → `db:push` →
  `apply-booking-constraint.ts`, in that order, against the prod
  `DATABASE_URL`. The operator runs these, not CI.
- `paid_but_released` currently only logs. When observability lands (Phase 2 /
  Sentry) this is the first alert to wire; when refunds land (deferred TODO at
  `apply-payment.ts:130`), this branch should trigger the refund flow.
- Plan 011 (seña) changes the *expected amount* (`servicePriceCents` →
  deposit amount) fed into `decidePaymentOutcome`; the monotonic-status and
  conditional-transition machinery from this plan must not be bypassed there.
- Reviewer focus: the CASE expression in the upsert (status monotonicity) and
  the `WHERE status = 'pending'` gate — those two lines carry the whole fix.
