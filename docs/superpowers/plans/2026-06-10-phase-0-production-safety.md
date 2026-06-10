# Phase 0: Production Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the barbershop app safe to run for one real paying barbershop: close auth/tenancy holes, secure the MercadoPago webhook, make double-booking impossible, fix timezone bugs, stop PII enumeration, and add tests + CI.

**Architecture:** Single-tenant-but-secure: only `OWNER_EMAIL` can access dashboard data (real multi-tenancy is Phase 1). All mutations go through authenticated server actions or DB-constrained public booking. Payment confirmation flows exclusively through a signature-verified webhook. Booking integrity is guaranteed by a Postgres `EXCLUDE` constraint, not application checks alone.

**Tech Stack:** Next.js 16 (App Router), Drizzle ORM + Neon Postgres, Clerk, MercadoPago SDK, Resend, Vitest (new), GitHub Actions (new).

**Conventions for this repo:**
- Package manager: `pnpm`
- Run all commands from repo root: `/Users/facuperezm/Documents/personal-projects/barberia`
- DB schema changes are applied with `pnpm db:push` (this repo's migration folder is inconsistent; cleaning it up is Phase 1 work). The one constraint `db:push` can't express (Task 9) is applied by an idempotent script.
- Commit after every task. Keep commits scoped to the task.

**Manual prerequisites (user must do, not the engineer):**
1. Set `MERCADOPAGO_WEBHOOK_SECRET` in `.env` (from MercadoPago Dashboard → Webhooks → secret key). Task 11 makes it required.
2. Ensure `NEXT_PUBLIC_APP_URL` is set in `.env` (e.g. `http://localhost:3000` locally, production URL on Vercel).
3. Mirror both into Vercel project env vars before deploying.

---

### Task 1: Test infrastructure, typecheck script, and CI

**Files:**
- Create: `vitest.config.ts`
- Create: `.github/workflows/ci.yml`
- Modify: `package.json` (scripts)
- Modify: `src/env.ts` (skipValidation escape hatch)
- Test: `src/lib/dates.test.ts` (bootstrap test)

- [ ] **Step 1: Install vitest**

```bash
pnpm add -D vitest
```

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:

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

- [ ] **Step 3: Add scripts to package.json**

In `package.json`, replace the `"scripts"` block's `"lint"` line and add three scripts so the block contains:

```json
    "lint": "oxlint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 4: Add skipValidation to env.ts**

In `src/env.ts`, add one property to the `createEnv({...})` object, after the `experimental__runtimeEnv` block:

```ts
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
```

- [ ] **Step 5: Write a bootstrap test for an existing pure function**

Create `src/lib/dates.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeTime } from "@/lib/dates";

describe("normalizeTime", () => {
  it("strips seconds from HH:mm:ss", () => {
    expect(normalizeTime("09:30:00")).toBe("09:30");
  });

  it("passes through HH:mm", () => {
    expect(normalizeTime("14:00")).toBe("14:00");
  });
});
```

- [ ] **Step 6: Run the test suite and typecheck**

Run: `pnpm test`
Expected: 2 tests pass.

Run: `pnpm typecheck`
Expected: exits 0. If pre-existing type errors surface, fix them only if trivial (< 5 min); otherwise report them before proceeding.

- [ ] **Step 7: Create CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
```

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts .github/workflows/ci.yml package.json src/env.ts src/lib/dates.test.ts pnpm-lock.yaml
git commit -m "chore: add vitest, typecheck script, and CI workflow"
```

---

### Task 2: Real owner authentication (auth helper, salon context, middleware, layout)

The core vulnerability: `getCurrentSalonId()` in `src/lib/salon-context.ts` grants the first salon to **any** signed-in Clerk user. Also `src/proxy.ts` only matches `/dashboard` exactly and relies on a `sessionClaims.email` claim that Clerk doesn't populate by default.

**Files:**
- Create: `src/lib/auth.ts`
- Rewrite: `src/lib/salon-context.ts`
- Rewrite: `src/proxy.ts`
- Modify: `src/app/(dashboard)/dashboard/layout.tsx`

- [ ] **Step 1: Create the auth helper**

Create `src/lib/auth.ts`:

```ts
import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { env } from "@/env";

/**
 * The app is single-tenant in Phase 0: exactly one owner, identified by
 * OWNER_EMAIL, may access dashboard data. Replace with salon memberships
 * in Phase 1.
 */
export async function isOwner(): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;

  const ownerEmail = env.OWNER_EMAIL.toLowerCase();
  return user.emailAddresses.some(
    (address) => address.emailAddress.toLowerCase() === ownerEmail,
  );
}

export async function requireOwner(): Promise<void> {
  if (!(await isOwner())) {
    throw new Error("Unauthorized");
  }
}
```

- [ ] **Step 2: Rewrite salon-context to deny non-owners**

Replace the entire contents of `src/lib/salon-context.ts`. Note the change from `"use server"` to `import "server-only"` — these helpers must not be public server-action endpoints:

```ts
import "server-only";
import { db } from "@/drizzle";
import { salons } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { requireOwner } from "@/lib/auth";

export async function getCurrentSalonId(): Promise<number> {
  await requireOwner();

  const [salon] = await db.select().from(salons).limit(1);
  if (!salon) {
    throw new Error("No salon configured");
  }
  return salon.id;
}

export async function validateSalonAccess(salonId: number): Promise<boolean> {
  try {
    const currentSalonId = await getCurrentSalonId();
    return currentSalonId === salonId;
  } catch {
    return false;
  }
}

export async function getSalonContext() {
  const salonId = await getCurrentSalonId();
  const [salon] = await db
    .select()
    .from(salons)
    .where(eq(salons.id, salonId))
    .limit(1);

  if (!salon) {
    throw new Error(`Salon with ID ${salonId} not found`);
  }

  return { salonId, salon };
}
```

- [ ] **Step 3: Fix the middleware**

Replace the `isProtectedRoute` definition and the `proxy` export in `src/proxy.ts` (keep the existing `config` matcher block unchanged). Ownership is enforced server-side (layout + actions), so middleware only needs to require sign-in:

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export const proxy = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});
```

Also remove the now-unused `import { env } from "./env";` line.

- [ ] **Step 4: Harden the dashboard layout**

In `src/app/(dashboard)/dashboard/layout.tsx`, the current check only looks at `user.emailAddresses[0]` (a user can add a second email). Replace the auth section. The full new file:

```tsx
import { RedirectToSignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import { isOwner } from "@/lib/auth";
import LayoutLoading from "./_components/layout-loading";
import { SidebarProvider } from "@/components/ui/sidebar";
import HeaderNav from "./_components/nav-menu";
import { AppSidebar } from "./_components/app-sidebar";
import { cookies } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isOwner())) {
    return <RedirectToSignIn />;
  }

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true";
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <main className="flex w-full flex-col">
        <HeaderNav />
        <Suspense fallback={<LayoutLoading />}>{children}</Suspense>
      </main>
    </SidebarProvider>
  );
}
```

- [ ] **Step 5: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all pass.

Manual check (if dev server + a non-owner Clerk account are available): sign in with a non-owner account, visit `/dashboard/services` → must redirect to sign-in/home, and no data may render.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/lib/salon-context.ts src/proxy.ts "src/app/(dashboard)/dashboard/layout.tsx"
git commit -m "fix(auth): enforce owner-only access in salon context, middleware, and dashboard layout"
```

---

### Task 3: Lock down unauthenticated server actions

`getBarberSchedule`/`updateBarberSchedule` (in `src/server/actions/barbers.ts`) and `getWeeklySchedule` (in `src/server/actions/schedule.ts`) have no auth. `src/server/actions/payments.ts` exposes `handlePaymentSuccess` which confirms any appointment without payment — and the whole file has zero callers.

**Files:**
- Modify: `src/server/actions/barbers.ts:240-286`
- Modify: `src/server/actions/schedule.ts`
- Delete: `src/server/actions/payments.ts`

- [ ] **Step 1: Delete the dead payments actions file**

```bash
rm src/server/actions/payments.ts
```

Verify nothing imports it:

Run: `grep -rn "actions/payments" src`
Expected: no output.

- [ ] **Step 2: Protect getBarberSchedule and updateBarberSchedule**

In `src/server/actions/barbers.ts`, replace the two functions at the bottom of the file (`getBarberSchedule` and `updateBarberSchedule`) with:

```ts
export async function getBarberSchedule(barberId: number) {
  const salonId = await getCurrentSalonId();

  const [barber] = await db
    .select({ id: barbers.id })
    .from(barbers)
    .where(and(eq(barbers.id, barberId), eq(barbers.salonId, salonId)))
    .limit(1);

  if (!barber) {
    return [];
  }

  return db
    .select()
    .from(workingHours)
    .where(eq(workingHours.barberId, barberId));
}

export async function updateBarberSchedule(
  barberId: number,
  schedule: Record<
    number,
    { isWorking: boolean; slots: { start: string; end: string }[] }
  >,
) {
  const salonId = await getCurrentSalonId();

  const [barber] = await db
    .select({ id: barbers.id })
    .from(barbers)
    .where(and(eq(barbers.id, barberId), eq(barbers.salonId, salonId)))
    .limit(1);

  if (!barber) {
    return { success: false, error: "Barber not found or access denied" };
  }

  const valuesToInsert = Object.entries(schedule).map(
    ([dayOfWeek, daySchedule]) => {
      const slots = daySchedule.slots;
      const hasSlots = daySchedule.isWorking && slots.length > 0;

      return {
        barberId,
        dayOfWeek: Number(dayOfWeek),
        isWorking: daySchedule.isWorking,
        // Primary slot for backwards compatibility
        startTime: hasSlots ? slots[0].start : "09:00",
        endTime: hasSlots ? slots[0].end : "17:00",
        // All slots stored in JSONB for full fidelity
        availableSlots: hasSlots ? slots : null,
      };
    },
  );

  if (valuesToInsert.length === 0) {
    return { success: false, error: "No schedule data provided" };
  }

  await db.transaction(async (tx) => {
    await tx.delete(workingHours).where(eq(workingHours.barberId, barberId));
    await tx.insert(workingHours).values(valuesToInsert);
  });

  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/team");
  return { success: true };
}
```

Note: `getCurrentSalonId` now throws for non-owners (Task 2), so these are owner-only. `getBarberSchedule` throwing for anonymous users is fine — it's only called from dashboard components.

- [ ] **Step 3: Protect getWeeklySchedule**

In `src/server/actions/schedule.ts`, add the import at the top:

```ts
import { getCurrentSalonId } from "@/lib/salon-context";
```

Then at the start of `getWeeklySchedule`, before `const todayDate = today();`, add salon scoping:

```ts
  const salonId = await getCurrentSalonId();
```

And add the salon filter to the query — replace the `.where(...)` clause with:

```ts
    .where(
      and(
        eq(appointments.salonId, salonId),
        eq(appointments.barberId, employeeId),
        between(
          appointments.date,
          formatDateISO(weekStart),
          formatDateISO(weekEnd),
        ),
      ),
    );
```

- [ ] **Step 4: Verify and commit**

Run: `pnpm typecheck && pnpm lint`
Expected: pass. (If the dashboard schedule page calls `getBarberSchedule` and now gets `[]` for a wrong-salon barber, that's correct behavior.)

```bash
git add -A src/server/actions
git commit -m "fix(auth): require owner on schedule actions, remove unauthenticated payment actions"
```

---

### Task 4: Delete dead and dangerous API routes

`/api/send-email` (open email relay) and `/api/appointments` have **zero callers** in the codebase (verified by grep). `createAppointmentFromFormData` exists only for the dead route.

**Files:**
- Delete: `src/app/api/send-email/route.ts`
- Delete: `src/app/api/appointments/route.ts`
- Modify: `src/server/actions/appointments.ts:185-207` (remove `createAppointmentFromFormData`)

- [ ] **Step 1: Delete the routes**

```bash
rm -r src/app/api/send-email src/app/api/appointments
```

- [ ] **Step 2: Remove the orphaned wrapper**

In `src/server/actions/appointments.ts`, delete the entire `createAppointmentFromFormData` function (the `/** Legacy wrapper... */` comment block through its closing brace, lines ~185-207).

- [ ] **Step 3: Verify no references remain**

Run: `grep -rn "send-email\|createAppointmentFromFormData\|api/appointments" src`
Expected: only the commented-out line in `src/proxy.ts` if it still exists — delete that comment line too if present.

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix(security): remove open email relay and dead appointments API route"
```

---

### Task 5: Timezone-correct booking datetime (TDD)

`createBookingAction` builds `new Date(\`${date}T${time}\`)` — parsed in the *server's* timezone (UTC on Vercel), storing appointments 3 hours off. Add `parseDateTime` to the existing Argentina-TZ utilities, plus characterization tests for the slot helpers we'll rely on in Task 10.

**Files:**
- Modify: `src/lib/dates.ts` (add `parseDateTime`)
- Test: `src/lib/dates.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/dates.test.ts`:

```ts
import { generateTimeSlots, isSlotBlocked, parseDateTime } from "@/lib/dates";

describe("parseDateTime", () => {
  it("interprets date+time as Argentina wall time (UTC-3)", () => {
    const result = parseDateTime("2026-06-10", "14:30");
    expect(result.toISOString()).toBe("2026-06-10T17:30:00.000Z");
  });

  it("is correct in January too (Argentina has no DST)", () => {
    const result = parseDateTime("2026-01-15", "09:00");
    expect(result.toISOString()).toBe("2026-01-15T12:00:00.000Z");
  });
});

describe("generateTimeSlots", () => {
  it("generates slots stepped by duration", () => {
    expect(generateTimeSlots("09:00", "11:00", 30)).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
    ]);
  });
});

describe("isSlotBlocked", () => {
  it("blocks a slot overlapped by a longer existing appointment", () => {
    // existing 60-min appointment at 10:00 must block a 30-min slot at 10:30
    expect(isSlotBlocked("10:30", 30, "10:00", 60)).toBe(true);
  });

  it("does not block back-to-back slots", () => {
    expect(isSlotBlocked("11:00", 30, "10:00", 60)).toBe(false);
  });
});
```

(Keep the existing `normalizeTime` tests and the existing `import { describe, expect, it } from "vitest";` line — merge imports as needed.)

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `pnpm test`
Expected: `parseDateTime` tests FAIL (`parseDateTime` is not exported); slot tests should PASS (characterization). If a slot test fails, stop and investigate `src/lib/dates.ts` before continuing — do not change the test to match a bug.

- [ ] **Step 3: Implement parseDateTime**

In `src/lib/dates.ts`, add after the existing `parseDate` function:

```ts
/**
 * Build the UTC instant for a YYYY-MM-DD date and HH:mm time interpreted
 * as Argentina wall-clock time. Use this for storing appointment timestamps.
 */
export function parseDateTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  return new Date(
    new TZDate(year, month - 1, day, hours, minutes, 0, ARGENTINA_TZ).getTime(),
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dates.ts src/lib/dates.test.ts
git commit -m "feat(dates): add timezone-correct parseDateTime with tests"
```

---

### Task 6: Non-guessable appointment public IDs (anti-IDOR)

Appointment IDs are sequential (`serial`); `getPublicAppointmentById` lets anyone enumerate customer data. Add a `publicId` UUID and use it for all customer-facing lookups.

**Files:**
- Modify: `src/drizzle/schema.ts` (appointments table)
- Modify: `src/server/actions/appointments.ts` (replace `getPublicAppointmentById`)
- Modify: `src/app/book/success/page.tsx`
- Modify: `src/server/actions/bookings.ts` (return publicId)
- Modify: `src/app/book/_components/booking-form.tsx` (use publicId in redirect)

- [ ] **Step 1: Add publicId column to schema**

In `src/drizzle/schema.ts`:

1. Add `uuid` to the `drizzle-orm/pg-core` import list.
2. In the `appointments` table, after the `id` line, add:

```ts
    publicId: uuid("public_id").notNull().defaultRandom(),
```

3. In the appointments index array, add:

```ts
    uniqueIndex("appointments_public_id_idx").on(table.publicId),
```

- [ ] **Step 2: Push the schema change**

Run: `pnpm db:push`
Expected: adds the column; existing rows get backfilled UUIDs via the database default. Confirm the prompt output mentions adding `public_id` and nothing destructive. If `db:push` proposes dropping anything, abort and report.

- [ ] **Step 3: Replace the public lookup action**

In `src/server/actions/appointments.ts`, replace `getPublicAppointmentById` entirely with:

```ts
const publicIdSchema = z.string().uuid();

/**
 * Get appointment details by public UUID (for the booking success page).
 * Uses the non-guessable publicId so appointment data can't be enumerated.
 */
export async function getPublicAppointmentByPublicId(publicId: string) {
  const parsed = publicIdSchema.safeParse(publicId);
  if (!parsed.success) {
    return { success: false as const, error: "Appointment not found" };
  }

  try {
    const [result] = await db
      .select({
        id: appointments.publicId,
        appointmentAt: appointments.appointmentAt,
        barberName: barbers.name,
        serviceName: services.name,
        customerName: appointments.customerName,
      })
      .from(appointments)
      .innerJoin(barbers, eq(appointments.barberId, barbers.id))
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(appointments.publicId, parsed.data))
      .limit(1);

    if (!result) {
      return { success: false as const, error: "Appointment not found" };
    }

    return { success: true as const, appointment: result };
  } catch {
    return { success: false as const, error: "Failed to fetch appointment" };
  }
}
```

- [ ] **Step 4: Update the success page**

In `src/app/book/success/page.tsx`:
- Change the import from `getPublicAppointmentById` to `getPublicAppointmentByPublicId`.
- In the `AppointmentDetails` interface, change `id: number` to `id: string`.
- Where the appointment is fetched (inside the `useEffect`), replace the call `getPublicAppointmentById(parseInt(appointmentId))` (or equivalent) with:

```ts
const result = await getPublicAppointmentByPublicId(appointmentId);
```

- [ ] **Step 5: Return publicId from the booking action**

In `src/server/actions/bookings.ts`:
- In the `BookingResponse` interface, add `publicId?: string;`.
- Change the insert's `.returning(...)` to:

```ts
        .returning({ id: appointments.id, publicId: appointments.publicId });
```

- Add `publicId: result.appointment.publicId` to both success return objects (the payment branch and the no-payment branch).

(Task 8 rewrites this file fully and includes these changes — if executing in order, just make the minimal edits here so the success page works.)

- [ ] **Step 6: Use publicId in the booking form redirect**

In `src/app/book/_components/booking-form.tsx`, change the success redirect line to:

```ts
          router.push(`/book/success?appointment=${result.publicId}`);
```

- [ ] **Step 7: Verify and commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: pass.

Run: `grep -rn "getPublicAppointmentById" src`
Expected: no output.

```bash
git add src/drizzle/schema.ts src/server/actions/appointments.ts src/server/actions/bookings.ts src/app/book
git commit -m "fix(security): replace enumerable appointment IDs with public UUIDs"
```

---

### Task 7: Direct MercadoPago preference creation (kill the HTTP self-call)

`createBookingAction` calls its own `/api/mercadopago/preferences` route over HTTP with a `localhost:3000` fallback. Extract a plain server function; delete the public route (its only callers were server-side).

**Files:**
- Create: `src/server/payments/mercadopago.ts`
- Modify: `src/env.ts` (add `NEXT_PUBLIC_APP_URL`)
- Delete: `src/app/api/mercadopago/preferences/route.ts`

- [ ] **Step 1: Add NEXT_PUBLIC_APP_URL to env validation**

In `src/env.ts`:
- In the `client` block add:

```ts
    NEXT_PUBLIC_APP_URL: z.string().url(),
```

- In `experimental__runtimeEnv` add:

```ts
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
```

Confirm `.env` contains `NEXT_PUBLIC_APP_URL` (it's already in `.env.example`); if missing locally, add `NEXT_PUBLIC_APP_URL="http://localhost:3000"` to `.env`.

- [ ] **Step 2: Create the preference module**

Create `src/server/payments/mercadopago.ts`:

```ts
import "server-only";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { db } from "@/drizzle";
import { appointments, barbers, salons, services } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { env } from "@/env";
import { formatDate, formatTime, toArgentinaDate } from "@/lib/dates";

const client = new MercadoPagoConfig({
  accessToken: env.MERCADOPAGO_ACCESS_TOKEN,
});

interface PreferenceResult {
  success: boolean;
  initPoint?: string;
  sandboxInitPoint?: string;
  error?: string;
}

/**
 * Create a MercadoPago checkout preference for an appointment.
 * Called server-side only (from the booking action) — never exposed as a route.
 */
export async function createPreferenceForAppointment(
  appointmentId: number,
): Promise<PreferenceResult> {
  const [row] = await db
    .select({
      appointment: appointments,
      service: services,
      salon: salons,
      barber: barbers,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(salons, eq(appointments.salonId, salons.id))
    .innerJoin(barbers, eq(appointments.barberId, barbers.id))
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!row) {
    return { success: false, error: "Appointment not found" };
  }

  const { appointment, service, salon } = row;

  if (!appointment.appointmentAt || !appointment.customerEmail) {
    return { success: false, error: "Appointment is missing booking data" };
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const localDate = toArgentinaDate(appointment.appointmentAt);

  const preference = new Preference(client);
  const result = await preference.create({
    body: {
      items: [
        {
          id: `appointment-${appointment.id}`,
          title: `${service.name} - ${salon.name}`,
          description: `Turno el ${formatDate(localDate, "full")} a las ${formatTime(localDate)}`,
          quantity: 1,
          unit_price: service.priceCents / 100,
          currency_id: "ARS",
        },
      ],
      payer: {
        name: appointment.customerName ?? undefined,
        email: appointment.customerEmail,
        phone: appointment.customerPhone
          ? { number: appointment.customerPhone }
          : undefined,
      },
      back_urls: {
        success: `${appUrl}/book/success?payment=approved&appointment=${appointment.publicId}`,
        failure: `${appUrl}/book/payment-failed?appointment=${appointment.publicId}`,
        pending: `${appUrl}/book/payment-pending?appointment=${appointment.publicId}`,
      },
      auto_return: "approved" as const,
      external_reference: `appointment-${appointment.id}`,
      notification_url: `${appUrl}/api/mercadopago/webhooks`,
      statement_descriptor: salon.name.substring(0, 22),
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    },
  });

  return {
    success: true,
    initPoint: result.init_point,
    sandboxInitPoint: result.sandbox_init_point,
  };
}
```

- [ ] **Step 3: Delete the public route**

```bash
rm -r src/app/api/mercadopago/preferences
```

Note: `src/server/actions/bookings.ts` still references the deleted route via `fetch` — Task 8 fixes it. Typecheck still passes (the URL is just a string), but do **not** test the booking flow until Task 8 is done.

- [ ] **Step 4: Verify and commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: pass.

```bash
git add src/server/payments/mercadopago.ts src/env.ts
git rm -r src/app/api/mercadopago/preferences 2>/dev/null || git add -A src/app/api
git commit -m "refactor(payments): create MercadoPago preferences directly, remove public preferences route"
```

---

### Task 8: Rewrite createBookingAction (overlap check, customer records, TZ, direct payment)

This is the core fix. The current action: misses overlapping bookings (exact time match only, only `confirmed` status), never creates `customers` rows (breaking the payment join), parses dates in server TZ, and HTTP-calls its own API. Also fix the client-side UTC date bug in the form.

**Files:**
- Rewrite: `src/server/actions/bookings.ts`
- Modify: `src/app/book/_components/booking-form.tsx:86`

- [ ] **Step 1: Rewrite the bookings action**

Replace the entire contents of `src/server/actions/bookings.ts`:

```ts
"use server";

import { db } from "@/drizzle";
import { appointments, barbers, customers, services } from "@/drizzle/schema";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  sanitizeText,
  sanitizeEmail,
  sanitizePhone,
  sanitizeDate,
  sanitizeTime,
} from "@/lib/sanitize";
import { parseDateTime, now, formatTime, toArgentinaDate } from "@/lib/dates";
import { createPreferenceForAppointment } from "@/server/payments/mercadopago";
import { sendAppointmentConfirmation } from "@/lib/email";
import { logger } from "@/lib/logger";

const bookingSchema = z.object({
  barberId: z.number().int().positive("Please select a barber"),
  serviceId: z.number().int().positive("Please select a service"),
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerEmail: z.string().email("Please enter a valid email"),
  customerPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  time: z.string().regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/, "Invalid time format"),
});

export type BookingInput = z.infer<typeof bookingSchema>;

interface BookingResponse {
  success: boolean;
  publicId?: string;
  redirectUrl?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

const BLOCKING_STATUSES_EXCLUDED = ["cancelled", "no_show"] as const;

export async function createBookingAction(
  input: BookingInput,
): Promise<BookingResponse> {
  try {
    const validatedData = bookingSchema.safeParse(input);

    if (!validatedData.success) {
      return {
        success: false,
        errors: validatedData.error.flatten().fieldErrors,
      };
    }

    const { barberId, serviceId, date, time } = validatedData.data;

    const customerName = sanitizeText(validatedData.data.customerName);
    const customerEmail = sanitizeEmail(validatedData.data.customerEmail);
    const customerPhone = sanitizePhone(validatedData.data.customerPhone);
    const sanitizedDate = sanitizeDate(date);
    const sanitizedTime = sanitizeTime(time);

    if (
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      !sanitizedDate ||
      !sanitizedTime
    ) {
      return {
        success: false,
        error: "Invalid input data. Please check your information.",
      };
    }

    // Interpret the requested slot as Argentina wall time
    const appointmentDateTime = parseDateTime(sanitizedDate, sanitizedTime);

    if (appointmentDateTime.getTime() <= now().getTime()) {
      return { success: false, error: "Cannot book a time in the past" };
    }

    const result = await db.transaction(async (tx) => {
      const [barber] = await tx
        .select()
        .from(barbers)
        .where(and(eq(barbers.id, barberId), eq(barbers.isActive, true)))
        .limit(1);

      if (!barber) {
        throw new BookingError("Selected barber not found");
      }

      const [service] = await tx
        .select()
        .from(services)
        .where(
          and(
            eq(services.id, serviceId),
            eq(services.salonId, barber.salonId),
            eq(services.isActive, true),
          ),
        )
        .limit(1);

      if (!service) {
        throw new BookingError("Selected service not found");
      }

      const endDateTime = new Date(
        appointmentDateTime.getTime() + service.durationMinutes * 60000,
      );

      // Range-overlap check against any non-cancelled appointment.
      // The DB exclusion constraint (see scripts/apply-booking-constraint.ts)
      // is the real guarantee; this gives a friendlier error message.
      const [conflict] = await tx
        .select({ id: appointments.id })
        .from(appointments)
        .where(
          and(
            eq(appointments.barberId, barberId),
            notInArray(appointments.status, [...BLOCKING_STATUSES_EXCLUDED]),
            sql`${appointments.appointmentAt} < ${endDateTime} AND ${appointments.endTime} > ${appointmentDateTime}`,
          ),
        )
        .limit(1);

      if (conflict) {
        throw new BookingError("This time slot is no longer available");
      }

      // Find or create the customer record
      const [existingCustomer] = await tx
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.email, customerEmail),
            eq(customers.salonId, barber.salonId),
          ),
        )
        .limit(1);

      let customerId: number;
      if (existingCustomer) {
        customerId = existingCustomer.id;
        await tx
          .update(customers)
          .set({ name: customerName, phone: customerPhone, updatedAt: new Date() })
          .where(eq(customers.id, customerId));
      } else {
        const [newCustomer] = await tx
          .insert(customers)
          .values({
            salonId: barber.salonId,
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
          })
          .returning({ id: customers.id });
        customerId = newCustomer.id;
      }

      const [appointment] = await tx
        .insert(appointments)
        .values({
          salonId: barber.salonId,
          barberId,
          serviceId,
          customerId,
          appointmentAt: appointmentDateTime,
          endTime: endDateTime,
          status: "pending",
          // Legacy fields kept until the Phase 1 schema migration
          date: sanitizedDate,
          time: `${sanitizedTime}:00`,
          customerName,
          customerEmail,
          customerPhone,
        })
        .returning({ id: appointments.id, publicId: appointments.publicId });

      return { appointment, service, barber };
    });

    if (result.service.priceCents > 0) {
      const preference = await createPreferenceForAppointment(
        result.appointment.id,
      );

      if (!preference.success) {
        logger.error("Failed to create payment preference", undefined, {
          appointmentId: result.appointment.id,
        });
        return {
          success: false,
          error: "Could not start the payment. Please try again.",
        };
      }

      return {
        success: true,
        publicId: result.appointment.publicId,
        redirectUrl:
          process.env.NODE_ENV === "production"
            ? preference.initPoint
            : preference.sandboxInitPoint,
      };
    }

    // Free service: confirmed immediately, send confirmation email
    try {
      await sendAppointmentConfirmation({
        customerName,
        customerEmail,
        date: appointmentDateTime,
        time: formatTime(toArgentinaDate(appointmentDateTime)),
        service: result.service.name,
        barberName: result.barber.name,
      });
    } catch (error) {
      logger.error("Failed to send confirmation email", error as Error, {
        appointmentId: result.appointment.id,
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/book");

    return { success: true, publicId: result.appointment.publicId };
  } catch (error) {
    if (error instanceof BookingError) {
      return { success: false, error: error.message };
    }
    // 23P01 = exclusion_violation from the no-double-booking constraint
    if (isPgError(error, "23P01")) {
      return { success: false, error: "This time slot is no longer available" };
    }
    logger.error("Booking creation failed", error as Error);
    return { success: false, error: "Failed to create booking" };
  }
}

class BookingError extends Error {}

function isPgError(error: unknown, code: string): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code === code || candidate.cause?.code === code;
}
```

Note: the old `checkAvailabilityAction` stub (dead code, `slots: []`) is intentionally dropped. Verify nothing imports it:

Run: `grep -rn "checkAvailabilityAction" src`
Expected: no output (if there is a caller, remove the import — the function never returned real data).

- [ ] **Step 2: Check sendAppointmentConfirmation signature matches**

Run: `sed -n '1,45p' src/lib/email.ts`
Expected: `sendAppointmentConfirmation` takes `{ customerName, customerEmail, date: Date, time: string, service: string, barberName: string }`. If the signature differs, adapt the call in Step 1 to match the actual signature — do not change `email.ts`.

- [ ] **Step 3: Fix the UTC date bug in the booking form**

In `src/app/book/_components/booking-form.tsx`, the submit handler converts the selected date with `state.date.toISOString().split("T")[0]` — at 21:00+ Argentina time this yields tomorrow's date. Replace that line with local date formatting:

```ts
          date: [
            state.date.getFullYear(),
            String(state.date.getMonth() + 1).padStart(2, "0"),
            String(state.date.getDate()).padStart(2, "0"),
          ].join("-"),
```

Also update the success redirect (if not already done in Task 6) to use `result.publicId`.

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: pass.

Manual smoke test (requires dev server + seeded DB): `pnpm dev`, complete a booking at `/book` for a free or paid service. For paid: confirm you land on MercadoPago sandbox checkout. Check the DB (`pnpm db:studio`): the appointment row has `appointment_at` 3 hours ahead of the chosen wall time in UTC, a `customer_id`, and a `public_id`.

- [ ] **Step 5: Commit**

```bash
git add src/server/actions/bookings.ts src/app/book/_components/booking-form.tsx
git commit -m "fix(booking): overlap-safe, timezone-correct booking with customer records and direct payment"
```

---

### Task 9: Database-level no-double-booking guarantee

Application checks can race. Add a Postgres `EXCLUDE USING gist` constraint over `(barber_id, tstzrange(appointment_at, end_time))`. `drizzle-kit push` can't express this, so use an idempotent script (Phase 1 will consolidate into real migrations).

**Files:**
- Create: `scripts/apply-booking-constraint.ts`

- [ ] **Step 1: Write the script**

Create `scripts/apply-booking-constraint.ts`:

```ts
/**
 * Applies the no-double-booking exclusion constraint.
 * Idempotent — safe to re-run (e.g. after a db:push that drops it).
 *
 * Run: pnpm tsx --env-file .env scripts/apply-booking-constraint.ts
 */
import { db } from "../src/drizzle";
import { sql } from "drizzle-orm";

async function main() {
  // 1. Report existing overlaps that would block the constraint
  const conflicts = await db.execute(sql`
    SELECT a.id AS appointment_a, b.id AS appointment_b, a.barber_id
    FROM appointments a
    JOIN appointments b
      ON a.barber_id = b.barber_id
     AND a.id < b.id
     AND a.appointment_at < b.end_time
     AND a.end_time > b.appointment_at
    WHERE a.status NOT IN ('cancelled', 'no_show')
      AND b.status NOT IN ('cancelled', 'no_show')
      AND a.appointment_at IS NOT NULL AND a.end_time IS NOT NULL
      AND b.appointment_at IS NOT NULL AND b.end_time IS NOT NULL
  `);

  if (conflicts.rows.length > 0) {
    console.error("Cannot apply constraint: overlapping appointments exist.");
    console.error("Resolve these first (cancel one of each pair):");
    console.table(conflicts.rows);
    process.exit(1);
  }

  // 2. Apply the constraint
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

  console.log("✓ appointments_no_double_booking constraint applied");
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to apply constraint:", error);
  process.exit(1);
});
```

- [ ] **Step 2: Run it against the database**

Run: `pnpm tsx --env-file .env scripts/apply-booking-constraint.ts`
Expected: `✓ appointments_no_double_booking constraint applied`. If it reports conflicts, list them to the user and stop — resolving real appointment conflicts is the owner's call.

- [ ] **Step 3: Prove the constraint works**

Run a deliberate violation (replace `1` with a real barber_id from the DB if needed):

```bash
pnpm tsx --env-file .env -e "
import { db } from './src/drizzle';
import { sql } from 'drizzle-orm';
const r = await db.execute(sql\`SELECT barber_id, salon_id, service_id FROM appointments WHERE appointment_at IS NOT NULL LIMIT 1\`);
if (r.rows.length === 0) { console.log('no appointments to test against — verify manually after first booking'); process.exit(0); }
const { barber_id, salon_id, service_id } = r.rows[0];
try {
  await db.execute(sql\`
    INSERT INTO appointments (salon_id, barber_id, service_id, appointment_at, end_time, status)
    SELECT salon_id, barber_id, service_id, appointment_at, end_time, 'pending'
    FROM appointments WHERE appointment_at IS NOT NULL LIMIT 1\`);
  console.error('✗ insert succeeded — constraint NOT working'); process.exit(1);
} catch (e) {
  console.log('✓ overlapping insert rejected:', e.cause?.code ?? e.code); process.exit(0);
}
"
```

Expected: `✓ overlapping insert rejected: 23P01` (or "no appointments to test against" on an empty DB).

- [ ] **Step 4: Commit**

```bash
git add scripts/apply-booking-constraint.ts
git commit -m "feat(db): enforce no-double-booking with Postgres exclusion constraint"
```

---

### Task 10: Fix availability route correctness

`src/app/api/availability/route.ts` currently: counts cancelled appointments as blocking, and assumes every existing appointment has the *requested* service's duration.

**Files:**
- Modify: `src/app/api/availability/route.ts`

- [ ] **Step 1: Fix the existing-appointments query**

In `src/app/api/availability/route.ts`:

1. Add to the drizzle-orm import: `notInArray` (so it reads `import { and, eq, notInArray } from "drizzle-orm";`).
2. Replace the `existingAppointments` query and the `slotsWithAvailability` mapping with:

```ts
    // Existing non-cancelled appointments for this barber, with their real durations
    const existingAppointments = await db
      .select({
        time: appointments.time,
        durationMinutes: services.durationMinutes,
      })
      .from(appointments)
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .where(
        and(
          eq(appointments.date, formattedDate),
          eq(appointments.barberId, parseInt(barberId)),
          notInArray(appointments.status, ["cancelled", "no_show"]),
        ),
      );

    // Map slots to include availability
    const slotsWithAvailability = timeSlots.map((time) => {
      const blocked = existingAppointments.some((apt) => {
        if (!apt.time) {
          return false;
        }
        return isSlotBlocked(
          time,
          serviceDuration,
          apt.time,
          apt.durationMinutes,
        );
      });

      return { time, available: !blocked };
    });
```

(`isSlotBlocked` already normalizes `HH:mm:ss` → `HH:mm` internally via `normalizeTime` — verified by the Task 5 tests.)

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: pass.

Manual check (dev server + seeded DB): book a 60-min service at 10:00 for a barber, then `curl "http://localhost:3000/api/availability?date=<that-date>&barberId=<id>&serviceId=<30min-service-id>"` — the 10:00 **and 10:30** slots must show `"available": false`. Cancel the appointment in the dashboard; both become available.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/availability/route.ts
git commit -m "fix(availability): use real appointment durations and ignore cancelled bookings"
```

---

### Task 11: Harden the MercadoPago webhook (TDD on signature verification)

Current bugs: signature check skipped when the attacker omits the header; manifest format doesn't match MP's spec (`id:{data.id};request-id:{x-request-id};ts:{ts};`); no timestamp tolerance; processing errors swallowed (returns 200, so MP never retries); no amount verification; no confirmation email.

**Files:**
- Create: `src/server/payments/webhook-signature.ts`
- Test: `src/server/payments/webhook-signature.test.ts`
- Rewrite: `src/app/api/mercadopago/webhooks/route.ts`
- Modify: `src/env.ts` (make `MERCADOPAGO_WEBHOOK_SECRET` required)

- [ ] **Step 1: Write the failing signature tests**

Create `src/server/payments/webhook-signature.test.ts`:

```ts
import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMercadoPagoSignature } from "@/server/payments/webhook-signature";

const SECRET = "test-secret";

function sign(manifest: string, secret = SECRET): string {
  return crypto.createHmac("sha256", secret).update(manifest).digest("hex");
}

function makeHeader(dataId: string, requestId: string, ts: number): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  return `ts=${ts},v1=${sign(manifest)}`;
}

describe("verifyMercadoPagoSignature", () => {
  const nowMs = 1_750_000_000_000;

  it("accepts a valid signature", () => {
    const ts = Math.floor(nowMs / 1000);
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: makeHeader("12345", "req-1", ts),
        requestId: "req-1",
        dataId: "12345",
        secret: SECRET,
        nowMs,
      }),
    ).toBe(true);
  });

  it("rejects a missing header", () => {
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: null,
        requestId: "req-1",
        dataId: "12345",
        secret: SECRET,
        nowMs,
      }),
    ).toBe(false);
  });

  it("rejects a tampered data id", () => {
    const ts = Math.floor(nowMs / 1000);
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: makeHeader("12345", "req-1", ts),
        requestId: "req-1",
        dataId: "99999",
        secret: SECRET,
        nowMs,
      }),
    ).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const ts = Math.floor(nowMs / 1000);
    const manifest = `id:12345;request-id:req-1;ts:${ts};`;
    const header = `ts=${ts},v1=${sign(manifest, "other-secret")}`;
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header,
        requestId: "req-1",
        dataId: "12345",
        secret: SECRET,
        nowMs,
      }),
    ).toBe(false);
  });

  it("rejects a stale timestamp (replay)", () => {
    const staleTs = Math.floor(nowMs / 1000) - 10 * 60; // 10 minutes old
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: makeHeader("12345", "req-1", staleTs),
        requestId: "req-1",
        dataId: "12345",
        secret: SECRET,
        nowMs,
      }),
    ).toBe(false);
  });

  it("uppercases in data id are lowercased per MP spec", () => {
    const ts = Math.floor(nowMs / 1000);
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: makeHeader("abc123", "req-1", ts),
        requestId: "req-1",
        dataId: "ABC123",
        secret: SECRET,
        nowMs,
      }),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — module `@/server/payments/webhook-signature` does not exist.

- [ ] **Step 3: Implement the verifier**

Create `src/server/payments/webhook-signature.ts`:

```ts
import crypto from "node:crypto";

const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000;

interface VerifyArgs {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
  nowMs?: number;
  toleranceMs?: number;
}

/**
 * Verify MercadoPago's x-signature header.
 * Spec: manifest is `id:{data.id};request-id:{x-request-id};ts:{ts};`
 * where data.id is lowercased and segments with missing values are omitted.
 * https://www.mercadopago.com/developers/en/docs/your-integrations/notifications/webhooks
 */
export function verifyMercadoPagoSignature({
  signatureHeader,
  requestId,
  dataId,
  secret,
  nowMs = Date.now(),
  toleranceMs = DEFAULT_TOLERANCE_MS,
}: VerifyArgs): boolean {
  if (!signatureHeader || !secret) return false;

  let ts: string | null = null;
  let v1: string | null = null;
  for (const part of signatureHeader.split(",")) {
    const [key, value] = part.split("=");
    if (key?.trim() === "ts") ts = value?.trim() ?? null;
    if (key?.trim() === "v1") v1 = value?.trim() ?? null;
  }

  if (!ts || !v1) return false;

  const tsMs = Number(ts) * 1000;
  if (!Number.isFinite(tsMs) || Math.abs(nowMs - tsMs) > toleranceMs) {
    return false;
  }

  const segments: string[] = [];
  if (dataId) segments.push(`id:${dataId.toLowerCase()}`);
  if (requestId) segments.push(`request-id:${requestId}`);
  segments.push(`ts:${ts}`);
  const manifest = segments.join(";") + ";";

  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  let providedBuffer: Buffer;
  try {
    providedBuffer = Buffer.from(v1, "hex");
  } catch {
    return false;
  }

  if (expectedBuffer.length !== providedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: all PASS.

- [ ] **Step 5: Make the webhook secret required**

In `src/env.ts`, change:

```ts
    MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),
```

to:

```ts
    MERCADOPAGO_WEBHOOK_SECRET: z.string().min(1),
```

Confirm `.env` has a real value (see Manual prerequisites). If it doesn't, stop and ask the user — the app won't boot without it after this change.

- [ ] **Step 6: Rewrite the webhook route**

Replace the entire contents of `src/app/api/mercadopago/webhooks/route.ts`:

```ts
import { type NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { db } from "@/drizzle";
import { payments, appointments, barbers, services } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { env } from "@/env";
import { verifyMercadoPagoSignature } from "@/server/payments/webhook-signature";
import { sendAppointmentConfirmation } from "@/lib/email";
import { formatTime, toArgentinaDate } from "@/lib/dates";
import { logger } from "@/lib/logger";

const client = new MercadoPagoConfig({
  accessToken: env.MERCADOPAGO_ACCESS_TOKEN,
});

export async function POST(request: NextRequest) {
  const body = await request.text();

  // MP sends data.id as a query param; fall back to the body
  let parsedBody: { type?: string; data?: { id?: string | number } } = {};
  try {
    parsedBody = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const dataId =
    request.nextUrl.searchParams.get("data.id") ??
    (parsedBody.data?.id != null ? String(parsedBody.data.id) : null);

  const isValid = verifyMercadoPagoSignature({
    signatureHeader: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId,
    secret: env.MERCADOPAGO_WEBHOOK_SECRET,
  });

  if (!isValid) {
    logger.warn("Rejected webhook with invalid signature", { dataId });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (parsedBody.type !== "payment" || !dataId) {
    // Not a payment event — acknowledge and ignore
    return NextResponse.json({ received: true });
  }

  try {
    await handlePaymentNotification(dataId);
    return NextResponse.json({ received: true });
  } catch (error) {
    // Return 500 so MercadoPago retries the notification
    logger.error("Webhook processing failed", error as Error, {
      paymentId: dataId,
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function handlePaymentNotification(paymentId: string) {
  const payment = new Payment(client);
  const paymentData = await payment.get({ id: paymentId });

  if (!paymentData) {
    throw new Error(`Payment ${paymentId} not found in MercadoPago`);
  }

  const externalReference = paymentData.external_reference;
  if (!externalReference || !externalReference.startsWith("appointment-")) {
    logger.warn("Webhook payment with unknown external reference", {
      paymentId,
      externalReference,
    });
    return;
  }

  const appointmentId = parseInt(externalReference.replace("appointment-", ""));

  const [appointmentRow] = await db
    .select({
      id: appointments.id,
      status: appointments.status,
      appointmentAt: appointments.appointmentAt,
      customerName: appointments.customerName,
      customerEmail: appointments.customerEmail,
      servicePriceCents: services.priceCents,
      serviceName: services.name,
      barberName: barbers.name,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(barbers, eq(appointments.barberId, barbers.id))
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!appointmentRow) {
    logger.warn("Webhook for unknown appointment", { paymentId, appointmentId });
    return;
  }

  const paymentStatus = mapMercadoPagoStatus(paymentData.status);
  const amountCents = Math.round((paymentData.transaction_amount || 0) * 100);

  // Upsert the payment record
  const [existingPayment] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.mercadopagoPaymentId, paymentId))
    .limit(1);

  const paymentFields = {
    status: paymentStatus,
    mercadopagoPaymentMethodId: paymentData.payment_method_id ?? null,
    mercadopagoPaymentType: paymentData.payment_type_id ?? null,
    mercadopagoInstallments: paymentData.installments ?? null,
    mercadopagoCardLastFourDigits: paymentData.card?.last_four_digits ?? null,
    mercadopagoPayerEmail: paymentData.payer?.email ?? null,
    mercadopagoProcessingMode: paymentData.processing_mode ?? null,
    mercadopagoOperationType: paymentData.operation_type ?? null,
    mercadopagoTransactionDetails: paymentData.transaction_details ?? null,
    mercadopagoStatusDetail: paymentData.status_detail ?? null,
    mercadopagoFailureReason:
      paymentData.status === "rejected" ? paymentData.status_detail ?? null : null,
    updatedAt: new Date(),
  };

  if (existingPayment) {
    await db
      .update(payments)
      .set(paymentFields)
      .where(eq(payments.id, existingPayment.id));
  } else {
    await db.insert(payments).values({
      appointmentId,
      amountCents,
      method: "mercadopago",
      mercadopagoPaymentId: paymentId,
      mercadopagoPreferenceId: paymentData.order?.id?.toString() ?? null,
      mercadopagoExternalReference: externalReference,
      ...paymentFields,
    });
  }

  if (paymentStatus === "succeeded") {
    // Verify the paid amount covers the service price before confirming
    if (amountCents < appointmentRow.servicePriceCents) {
      logger.error("Payment amount mismatch — not confirming appointment", undefined, {
        paymentId,
        appointmentId,
        amountCents,
        expected: appointmentRow.servicePriceCents,
      });
      return;
    }

    const wasAlreadyConfirmed = appointmentRow.status === "confirmed";

    await db
      .update(appointments)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(eq(appointments.id, appointmentId));

    if (
      !wasAlreadyConfirmed &&
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
        // Don't fail the webhook over email — payment is already recorded
        logger.error("Failed to send confirmation email", error as Error, {
          appointmentId,
        });
      }
    }
  } else if (paymentStatus === "failed") {
    await db
      .update(appointments)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(appointments.id, appointmentId));
  }
}

function mapMercadoPagoStatus(
  status: string | undefined,
): "pending" | "processing" | "succeeded" | "failed" | "refunded" {
  switch (status) {
    case "approved":
      return "succeeded";
    case "pending":
    case "in_process":
      return "processing";
    case "rejected":
    case "cancelled":
      return "failed";
    case "refunded":
    case "charged_back":
      return "refunded";
    default:
      return "pending";
  }
}
```

- [ ] **Step 7: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: pass.

Manual check: `curl -X POST http://localhost:3000/api/mercadopago/webhooks -H 'Content-Type: application/json' -d '{"type":"payment","data":{"id":"123"}}'`
Expected: `{"error":"Invalid signature"}` with HTTP 401.

End-to-end verification requires MercadoPago's sandbox: complete a sandbox payment and confirm (a) the appointment flips to `confirmed`, (b) a payments row is created, (c) the confirmation email sends. If sandbox credentials aren't configured, flag this as a required pre-launch verification for the user.

- [ ] **Step 8: Commit**

```bash
git add src/server/payments/webhook-signature.ts src/server/payments/webhook-signature.test.ts src/app/api/mercadopago/webhooks/route.ts src/env.ts
git commit -m "fix(payments): verify webhook signatures per MP spec, verify amounts, retry on failure, send confirmation email"
```

---

### Task 12: Serverless-safe rate limiting (DB-backed)

The in-memory limiter resets on every cold start and isn't shared across serverless instances. Replace its internals with an atomic Postgres upsert (volume here is tiny — a DB roundtrip per request is fine; swap for Upstash later if needed). Apply it to the booking action too.

**Files:**
- Modify: `src/drizzle/schema.ts` (add `rateLimits` table)
- Rewrite: `src/lib/rate-limit.ts`
- Modify: `src/app/api/availability/route.ts` (await the now-async limiter)
- Modify: `src/server/actions/bookings.ts` (rate limit booking creation)

- [ ] **Step 1: Add the rate_limits table**

In `src/drizzle/schema.ts`, add before the RELATIONS section:

```ts
//
// ──────────────────────────────────────────────────────────────────────────────
//   RATE LIMITS (serverless-safe request counting)
// ──────────────────────────────────────────────────────────────────────────────
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});
```

Run: `pnpm db:push`
Expected: creates `rate_limits`. Then re-apply the exclusion constraint in case push touched it:

Run: `pnpm tsx --env-file .env scripts/apply-booking-constraint.ts`
Expected: `✓ appointments_no_double_booking constraint applied`

- [ ] **Step 2: Rewrite the limiter**

Replace the entire contents of `src/lib/rate-limit.ts`:

```ts
import "server-only";
import { db } from "@/drizzle";
import { sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Postgres-backed fixed-window rate limiter. Atomic via upsert, shared
 * across serverless instances. Fails open: a limiter outage must not
 * take down booking.
 */
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 10, windowSeconds: 60 },
): Promise<RateLimitResult> {
  const key = `${identifier}:${config.windowSeconds}`;

  try {
    const result = await db.execute(sql`
      INSERT INTO rate_limits (key, count, reset_at)
      VALUES (${key}, 1, now() + make_interval(secs => ${config.windowSeconds}))
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.reset_at < now() THEN 1
          ELSE rate_limits.count + 1
        END,
        reset_at = CASE
          WHEN rate_limits.reset_at < now()
            THEN now() + make_interval(secs => ${config.windowSeconds})
          ELSE rate_limits.reset_at
        END
      RETURNING count, reset_at
    `);

    // Opportunistic cleanup of stale windows (~1% of requests)
    if (Math.random() < 0.01) {
      db.execute(
        sql`DELETE FROM rate_limits WHERE reset_at < now() - interval '1 day'`,
      ).catch(() => {});
    }

    const row = result.rows[0] as { count: number; reset_at: string };
    const count = Number(row.count);
    const resetTime = new Date(row.reset_at).getTime();

    return {
      success: count <= config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      resetTime,
    };
  } catch (error) {
    logger.error("Rate limiter failed — failing open", error as Error, { key });
    return { success: true, remaining: 1, resetTime: Date.now() };
  }
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";
  return ip;
}
```

- [ ] **Step 3: Await the limiter in the availability route**

In `src/app/api/availability/route.ts`, the limiter is now async. Change:

```ts
  const rateLimitResult = rateLimit(identifier, { maxRequests: 30, windowSeconds: 60 });
```

to:

```ts
  const rateLimitResult = await rateLimit(identifier, { maxRequests: 30, windowSeconds: 60 });
```

- [ ] **Step 4: Rate limit the booking action**

In `src/server/actions/bookings.ts`, add the imports:

```ts
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
```

At the top of `createBookingAction`, before input validation, add:

```ts
    const requestHeaders = await headers();
    const clientIp =
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rateLimitResult = await rateLimit(`booking:${clientIp}`, {
      maxRequests: 5,
      windowSeconds: 60,
    });

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: "Too many booking attempts. Please wait a minute and try again.",
      };
    }
```

- [ ] **Step 5: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: pass.

Manual check: `for i in $(seq 1 35); do curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/availability?date=2026-06-15&barberId=1&serviceId=1"; done`
Expected: first 30 → `200`, remaining → `429`. (Restart the dev server and re-run: counts must persist because they live in Postgres — that's the fix.)

- [ ] **Step 6: Commit**

```bash
git add src/drizzle/schema.ts src/lib/rate-limit.ts src/app/api/availability/route.ts src/server/actions/bookings.ts
git commit -m "feat(security): serverless-safe DB-backed rate limiting on availability and booking"
```

---

### Task 13: Cleanup and documentation

**Files:**
- Modify: `package.json` (remove unused deps)
- Modify: `next.config.js` (remove leftover image hosts)
- Delete: `test-db.js`
- Modify: `.env.example`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Remove unused dependencies and the orphaned DB test file**

```bash
rm test-db.js
pnpm remove bcrypt @types/bcrypt @types/jsonwebtoken @types/nodemailer @types/nprogress @types/react-big-calendar
```

Keep `pg`/`@types/pg` — `drizzle-kit` may use the `pg` driver for `db:push`/`db:studio`. Verify nothing broke:

Run: `pnpm typecheck && pnpm build`
Expected: typecheck passes; build completes (build needs a populated `.env`).

- [ ] **Step 2: Prune image hosts**

In `next.config.js`, keep only the hosts the app actually uses (seed data uses Unsplash):

```js
/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "images.unsplash.com",
      },
      {
        hostname: "ik.imagekit.io",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 3: Update .env.example**

Replace the contents of `.env.example`:

```bash
# Database — PostgreSQL connection string (Neon)
DATABASE_URL="postgresql://user:password@host:port/database"

# Clerk authentication — https://dashboard.clerk.com
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."

# Resend (transactional email) — https://resend.com/api-keys
RESEND_API_KEY="re_..."

# Owner email — the only account allowed into /dashboard (Phase 0 single-tenant)
OWNER_EMAIL="owner@yourbusiness.com"

# MercadoPago — https://www.mercadopago.com/developers
MERCADOPAGO_ACCESS_TOKEN="APP_USR-..."
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="APP_USR-..."
# Required: webhook signature secret (MP Dashboard → Webhooks)
MERCADOPAGO_WEBHOOK_SECRET="..."

# Public base URL of the app (payment redirects, webhook notification URL)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- [ ] **Step 4: Update CLAUDE.md commands section**

In `CLAUDE.md`, replace the `## Commands` code block with:

```bash
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm lint             # Run oxlint
pnpm typecheck        # TypeScript type checking (tsc --noEmit)
pnpm test             # Run vitest suite
pnpm test:watch       # Vitest in watch mode

# Database (Drizzle ORM with Neon PostgreSQL)
pnpm db:push          # Push schema to database
pnpm db:studio        # Open Drizzle Studio
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed database (tsx --env-file .env src/drizzle/seed/seed.ts)

# After any db:push, re-apply the booking exclusion constraint:
pnpm tsx --env-file .env scripts/apply-booking-constraint.ts
```

- [ ] **Step 5: Final full verification**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove unused deps and stale config, update env example and docs"
```

---

## Out of scope (deliberately deferred)

- **Sentry / error monitoring** — needs an account + DSN from the user. Recommend immediately after Phase 0.
- **Stale pending appointments** — a pending unpaid booking blocks its slot indefinitely (preference expires after 30 min but the row stays `pending`). Needs a cron (Vercel Cron) to cancel pendings older than ~45 min. Flag for Phase 1.
- **Migration folder cleanup** — duplicate/conflicting migration files; consolidate and adopt `db:migrate` discipline in Phase 1.
- **Multi-tenancy, billing, onboarding** — Phase 1/2 per the roadmap.

## Final acceptance checklist

After all tasks: a non-owner Clerk account cannot read or mutate any salon data; an unsigned webhook request gets 401; overlapping bookings are impossible even under concurrency (DB constraint); appointments store correct UTC instants for Argentina wall time; customer data cannot be enumerated by integer IDs; no unauthenticated email sending exists; CI runs typecheck + lint + tests.
