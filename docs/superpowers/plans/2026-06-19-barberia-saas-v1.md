# Barbería SaaS v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single-tenant barbershop app into a concierge-ready multi-tenant SaaS with the no-show wedge (seña + manual WhatsApp reminders), so 1–3 real shops can be onboarded and the first subscription charged.

**Architecture:** Salon resolution already funnels through `getCurrentSalonId()` and the booking write-path already derives `salonId` from the chosen barber. We add a `salonMembers` table, make `getCurrentSalonId()` resolve by the logged-in user's membership, replace the single-`OWNER_EMAIL` gate with a membership gate, close the two public read-path leaks (`getPublicBarbers` `limit(1)`, unscoped `getServices`), and add a per-shop public booking route `/[slug]/book`. Deposit enforcement reuses the existing MercadoPago preference flow; reminders are zero-infra `wa.me` links.

**Tech Stack:** Next.js 16 (App Router, RSC), Drizzle ORM + Neon Postgres, BetterAuth magic-link, MercadoPago, Resend, Vitest (node env, pure-function unit tests), Tailwind + shadcn/ui.

## Global Constraints

- **Design source of truth:** `docs/superpowers/specs/2026-06-19-barberia-saas-v1-design.md`.
- **Testing reality:** no DB/integration harness exists. TDD the pure helpers (Vitest, `src/**/*.test.ts`, node env); verify schema/route/UI via `pnpm typecheck` + `pnpm lint` + manual run. Do **not** introduce a DB test harness in this plan (YAGNI).
- **After any `db:push`** re-run `pnpm tsx --env-file .env scripts/apply-booking-constraint.ts` (drizzle-kit cannot express the exclusion constraint).
- **Money is integer cents** (`priceCents`, `amountCents`). Never use floats.
- **`server-only`** modules must keep the `import "server-only"` pragma.
- **Follow existing patterns:** Server Actions return modeled errors as values (`{ success, error }`), not throws; guard clauses + early returns; interfaces over types; no enums in app code (Drizzle `pgEnum` is fine for the DB).
- **Commit after each task.** Conventional commit messages.
- **Branch:** do all work on `feat/multi-tenancy-foundation` (do not commit to `main`).

---

## Milestone 1 — Multi-tenancy foundation (this plan)

Outcome: a second and third real shop can be onboarded and booked independently; each shop owner logs into their own dashboard scoped to their salon. This is the prerequisite for Milestones 2–4.

### Task 1: `salonMembers` table + member role enum

**Files:**
- Modify: `src/drizzle/schema.ts` (add enum, table, relations, types near the AUTH section, after `verification`)
- Run: `pnpm db:push` then `pnpm tsx --env-file .env scripts/apply-booking-constraint.ts`

**Interfaces:**
- Produces: `memberRoleEnum`, `salonMembers` table, `SalonMember` / `InsertSalonMember` types, `salonMembersRelations`.
- The join is `user.id` (text) ↔ `salonMembers.userId` (text) and `salons.id` (serial) ↔ `salonMembers.salonId` (integer).

- [ ] **Step 1: Add the enum** (place beside the other `pgEnum` declarations at the top of `schema.ts`)

```ts
export const memberRoleEnum = pgEnum("member_role", ["owner", "admin", "staff"]);
```

- [ ] **Step 2: Add the table + types** (after the `verification` table, before the RELATIONS section)

```ts
export const salonMembers = pgTable(
  "salon_members",
  {
    id: serial("id").primaryKey(),
    salonId: integer("salon_id")
      .references(() => salons.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    role: memberRoleEnum("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("salon_members_salon_user_idx").on(table.salonId, table.userId),
    index("salon_members_user_idx").on(table.userId),
  ],
);

export type SalonMember = typeof salonMembers.$inferSelect;
export type InsertSalonMember = typeof salonMembers.$inferInsert;
```

- [ ] **Step 3: Add relations** (in the RELATIONS section; also add `members: many(salonMembers)` to `salonsRelations`)

```ts
export const salonMembersRelations = relations(salonMembers, ({ one }) => ({
  salon: one(salons, {
    fields: [salonMembers.salonId],
    references: [salons.id],
  }),
  user: one(user, {
    fields: [salonMembers.userId],
    references: [user.id],
  }),
}));
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (no errors).

- [ ] **Step 5: Push schema + re-apply constraint**

Run: `pnpm db:push && pnpm tsx --env-file .env scripts/apply-booking-constraint.ts`
Expected: push succeeds; constraint script prints success (overlapping insert rejected with `23P01`).

- [ ] **Step 6: Commit**

```bash
git add src/drizzle/schema.ts
git commit -m "feat(tenancy): add salon_members table and member role enum"
```

---

### Task 2: Membership-based salon resolution (pure pick + context)

**Files:**
- Create: `src/lib/membership.ts` (pure helper)
- Create: `src/lib/membership.test.ts`
- Modify: `src/lib/salon-context.ts` (resolve by membership instead of `limit(1)`)

**Interfaces:**
- Produces: `pickActiveSalonId(memberships: { salonId: number }[]): number | null` (pure).
- Produces (changed): `getCurrentSalonId(): Promise<number>` now resolves via the session user's membership; still throws if none.
- Produces: `requireSalonMember(): Promise<{ salonId: number; role: string }>` — the new dashboard/action gate.

- [ ] **Step 1: Write the failing test** — `src/lib/membership.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { pickActiveSalonId } from "@/lib/membership";

describe("pickActiveSalonId", () => {
  it("returns null when the user has no memberships", () => {
    expect(pickActiveSalonId([])).toBeNull();
  });

  it("returns the only salon when the user has one membership", () => {
    expect(pickActiveSalonId([{ salonId: 7 }])).toBe(7);
  });

  it("returns the first salon deterministically for multiple memberships", () => {
    expect(pickActiveSalonId([{ salonId: 3 }, { salonId: 9 }])).toBe(3);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `pnpm vitest run src/lib/membership.test.ts`
Expected: FAIL — cannot find module `@/lib/membership`.

- [ ] **Step 3: Implement the pure helper** — `src/lib/membership.ts`

```ts
/**
 * Pick the salon a user acts on. Concierge v1 = one membership per user, so we
 * deterministically take the first. A future salon-switcher can pass a preferred id.
 */
export function pickActiveSalonId(
  memberships: { salonId: number }[],
): number | null {
  return memberships[0]?.salonId ?? null;
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `pnpm vitest run src/lib/membership.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Rewrite `salon-context.ts` to resolve by membership**

```ts
import "server-only";
import { db } from "@/drizzle";
import { salonMembers } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { pickActiveSalonId } from "@/lib/membership";

/**
 * Resolve the salon the current session acts on, via salon_members.
 * Throws when there is no session or no membership — doubles as an auth gate.
 */
export async function getCurrentSalonId(): Promise<number> {
  const { salonId } = await requireSalonMember();
  return salonId;
}

export async function requireSalonMember(): Promise<{
  salonId: number;
  role: string;
}> {
  const result = await getSession();
  const userId = result?.user?.id;
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const memberships = await db
    .select({ salonId: salonMembers.salonId, role: salonMembers.role })
    .from(salonMembers)
    .where(eq(salonMembers.userId, userId));

  const salonId = pickActiveSalonId(memberships);
  if (salonId === null) {
    throw new Error("No salon membership");
  }

  const role = memberships.find((m) => m.salonId === salonId)?.role ?? "staff";
  return { salonId, role };
}
```

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/membership.ts src/lib/membership.test.ts src/lib/salon-context.ts
git commit -m "feat(tenancy): resolve current salon by user membership"
```

---

### Task 3: Replace the OWNER_EMAIL dashboard gate with a membership gate

**Files:**
- Modify: `src/app/(dashboard)/dashboard/layout.tsx` (swap `isOwner()` → membership)
- Modify (same mechanical swap at each `isOwner()` call site): `src/server/actions/appointments.ts`, `src/server/actions/barbers.ts`, `src/server/actions/services.ts`, `src/server/actions/schedule-overrides.ts`, and any other file flagged by the grep in Step 1.

**Interfaces:**
- Consumes: `requireSalonMember()` from Task 2.
- Pattern: each mutating action currently does `if (!(await isOwner())) return { success:false, error:"Unauthorized" }` immediately followed by `const salonId = await getCurrentSalonId();`. Replace **both** lines with a single `const { salonId } = await requireSalonMember();` wrapped to preserve the existing return-shape on failure.

- [ ] **Step 1: Enumerate call sites**

Run: `grep -rn "isOwner" src --include="*.ts" --include="*.tsx"`
Expected: the dashboard layout plus the action files listed above. Work through each.

- [ ] **Step 2: Update the dashboard layout** — `src/app/(dashboard)/dashboard/layout.tsx`

Replace the import and the guard:

```ts
// before: import { isOwner } from "@/lib/auth";
import { requireSalonMember } from "@/lib/salon-context";
```

```ts
// before: if (!(await isOwner())) { redirect("/sign-in"); }
try {
  await requireSalonMember();
} catch {
  redirect("/sign-in");
}
```
(Keep whatever redirect/target the existing layout uses; only the condition changes.)

- [ ] **Step 3: Update each mutating action** — representative edit (apply the same shape in every action that gated on `isOwner()`):

```ts
// before:
//   if (!(await isOwner())) {
//     return { success: false, error: "Unauthorized" };
//   }
//   const salonId = await getCurrentSalonId();
// after:
let salonId: number;
try {
  ({ salonId } = await requireSalonMember());
} catch {
  return { success: false, error: "Unauthorized" };
}
```

Remove the now-unused `isOwner` import from each file. Leave read-only public actions (`getPublicBarbers`, etc.) untouched — they must stay unauthenticated.

- [ ] **Step 4: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS; no unused-import warnings for `isOwner`.

- [ ] **Step 5: Manual gate check**

Run `pnpm dev`. With NO salon membership for your user, visiting `/dashboard` redirects to sign-in. (You'll create a membership in Task 6 / Milestone 4 onboarding.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(tenancy): gate dashboard and actions on salon membership"
```

---

### Task 4: Salon-scoped public reads (slug resolve + close read leaks)

**Files:**
- Create: `src/lib/slug.ts` (pure normalize/validate)
- Create: `src/lib/slug.test.ts`
- Modify: `src/server/actions/barbers.ts` (`getPublicBarbers(salonId: number)`; add `getPublicSalonBySlug(slug)`)
- Create: `src/server/queries/public.ts` (`getPublicServices(salonId)`) **or** add to existing queries file
- Modify: `src/server/queries/services.ts` (`getServices(salonId: number)` — require the arg) and its two callers (`dashboard/page.tsx`, `dashboard/services/page.tsx`, both already have `salonId` in scope via `getCurrentSalonId()`)

**Interfaces:**
- Produces: `normalizeSlug(input: string): string` (pure; lowercase, spaces→`-`, strip non `[a-z0-9-]`, collapse repeats, trim leading/trailing `-`).
- Produces: `getPublicSalonBySlug(slug: string): Promise<{ id: number; name: string; slug: string } | null>`.
- Produces (changed): `getPublicBarbers(salonId: number): Promise<Barber[]>`.
- Produces: `getPublicServices(salonId: number): Promise<Service[]>` (active only).
- Produces (changed): `getServices(salonId: number): Promise<Service[]>`.

- [ ] **Step 1: Failing test** — `src/lib/slug.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { normalizeSlug } from "@/lib/slug";

describe("normalizeSlug", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(normalizeSlug("Barbería Juan")).toBe("barberia-juan");
  });
  it("strips invalid characters", () => {
    expect(normalizeSlug("El Corte #1!")).toBe("el-corte-1");
  });
  it("collapses repeats and trims edges", () => {
    expect(normalizeSlug("  --Fade   Bros--  ")).toBe("fade-bros");
  });
});
```
(Note: `Barbería`→`barberia` requires stripping diacritics. Implement with `String.prototype.normalize("NFD")` + remove combining marks before filtering.)

- [ ] **Step 2: Run it, verify it fails**

Run: `pnpm vitest run src/lib/slug.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/lib/slug.ts`

```ts
export function normalizeSlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `pnpm vitest run src/lib/slug.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Add `getPublicSalonBySlug` and re-scope `getPublicBarbers`** — `src/server/actions/barbers.ts`

```ts
export async function getPublicSalonBySlug(
  slug: string,
): Promise<{ id: number; name: string; slug: string } | null> {
  const [salon] = await db
    .select({ id: salons.id, name: salons.name, slug: salons.slug })
    .from(salons)
    .where(and(eq(salons.slug, slug), eq(salons.isActive, true)))
    .limit(1);
  return salon ?? null;
}
```

Change `getPublicBarbers()` to take `salonId` and drop the internal `limit(1)` salon lookup:

```ts
export async function getPublicBarbers(salonId: number): Promise<Barber[]> {
  try {
    return await db
      .select()
      .from(barbers)
      .where(and(eq(barbers.salonId, salonId), eq(barbers.isActive, true)))
      .orderBy(asc(barbers.name));
  } catch {
    return [];
  }
}
```

- [ ] **Step 6: Add `getPublicServices` and re-scope `getServices`**

In `src/server/queries/services.ts` make `salonId` required and filter on it + `isActive`:

```ts
export async function getServices(salonId: number): Promise<Service[]> {
  try {
    return await db
      .select()
      .from(services)
      .where(eq(services.salonId, salonId));
  } catch (error) {
    console.error("Error fetching services:", error);
    return [];
  }
}

export async function getPublicServices(salonId: number): Promise<Service[]> {
  try {
    return await db
      .select()
      .from(services)
      .where(and(eq(services.salonId, salonId), eq(services.isActive, true)));
  } catch (error) {
    console.error("Error fetching public services:", error);
    return [];
  }
}
```
(Add `and`/`eq` imports as needed.)

- [ ] **Step 7: Fix `getServices` callers** — pass the salon id they already hold:
  - `src/app/(dashboard)/dashboard/page.tsx`: `cachedServices` → `getCachedServices(salonId)` mirroring the existing `getCachedAppointments(salonId)` pattern; include `salonId` in the cache key.
  - `src/app/(dashboard)/dashboard/services/page.tsx`: call `getServices(await getCurrentSalonId())`.

- [ ] **Step 8: Typecheck**

Run: `pnpm typecheck`
Expected: FAIL first if a public caller (`service-step.tsx`, `barber-step.tsx`) still calls the 0-arg versions — that's fixed in Task 5. If you do Task 5 in the same branch, run typecheck after Task 5 instead. To keep this task green standalone, update the two booking-step callers minimally here to pass a placeholder via Task 5; otherwise proceed directly to Task 5 and typecheck once.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(tenancy): salon-scoped public reads, close getServices leak"
```

---

### Task 5: `/[slug]/book` route + thread salonId through the wizard

**Files:**
- Create: `src/app/[slug]/book/page.tsx` (Server Component: resolve salon by slug, `notFound()` if missing, render the wizard with `salonId`)
- Modify: `src/app/book/_components/booking-provider.tsx` (carry `salonId` in context)
- Modify: `src/app/book/_steps/barber-step.tsx` (read `salonId` from context → `getPublicBarbers(salonId)`)
- Modify: `src/app/book/_steps/service-step.tsx` (read `salonId` from context → `getPublicServices(salonId)`)
- Modify: `src/app/book/page.tsx` (legacy `/book`: resolve the first active salon's slug and `redirect` to `/[slug]/book`, preserving old links)

**Interfaces:**
- Consumes: `getPublicSalonBySlug`, `getPublicBarbers(salonId)`, `getPublicServices(salonId)` (Task 4).
- `BookingProvider` gains a required `salonId: number` prop, exposed via `useBooking().salonId`.

- [ ] **Step 1: Add `salonId` to the booking context** — `booking-provider.tsx`

Add `salonId: number` to `BookingContextType`, accept it as a prop on `BookingProvider({ children, salonId })`, and include it in the context value. Keep `BookingState` (the form fields) unchanged.

- [ ] **Step 2: Scope the barber + service steps** — in `barber-step.tsx` and `service-step.tsx`, read `const { salonId } = useBooking();` and pass it to the fetchers; add `salonId` to each `useQuery` key (`["barbers", "book", salonId]`, `["services", "book", salonId]`).

- [ ] **Step 3: Create the public route** — `src/app/[slug]/book/page.tsx`

```tsx
import { notFound } from "next/navigation";
import { getPublicSalonBySlug } from "@/server/actions/barbers";
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl py-10">
        <h1 className="mb-6 text-center text-2xl font-bold">{salon.name}</h1>
        <BookingProvider salonId={salon.id}>
          <BookingForm />
        </BookingProvider>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Redirect legacy `/book`** — `src/app/book/page.tsx`

Convert to a Server Component that resolves the first active salon and `redirect()`s to `/${slug}/book`; if none exists, render a simple "no salon configured" message. (This removes the old single-tenant client page.)

- [ ] **Step 5: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS (all `getPublicBarbers`/`getServices`/`getPublicServices` calls now pass `salonId`).

- [ ] **Step 6: Manual two-tenant check**

Seed a second salon with its own slug/barbers/services (Drizzle Studio or the Milestone-4 script). Visit `/{slugA}/book` and `/{slugB}/book`; confirm each shows only its own barbers and services, an unknown slug 404s, and a booking still completes end-to-end (including the MercadoPago redirect for priced services).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(tenancy): per-shop /[slug]/book route scoped to the salon"
```

---

### Milestone 1 self-review gate

Run `pnpm test && pnpm typecheck && pnpm lint` — all green. Confirm: a non-member is redirected from `/dashboard`; a member sees only their salon; `/{slug}/book` is tenant-isolated. Then finish the branch (PR or merge) per `superpowers:finishing-a-development-branch`.

---

## Milestone 2 — Seña / deposit (separate plan)

Depends on M1. To be expanded into `docs/superpowers/plans/2026-XX-XX-deposit.md` via the writing-plans skill. Scope:

- **Config:** add `depositEnabled boolean default false` + `depositCents integer` (or `depositPercent`) to `salons` (per-shop default) with optional per-`services` override; dashboard settings UI to toggle/set.
- **Pure helper (TDD):** `resolveDepositCents(service, salon): number` — returns the amount to charge as a seña (0 when disabled). Unit-tested.
- **Enforcement:** in `createBookingAction`, when deposit applies, create the MercadoPago preference for the **deposit amount** (not full price) — reuse `createPreferenceForAppointment`, parameterized by amount; appointment stays `pending` until the webhook confirms.
- **Display:** show "Seña: $X para confirmar" in the wizard's customer/confirm step.
- Verify: manual booking requiring a seña; webhook flips status to `confirmed`.

## Milestone 3 — Manual WhatsApp reminders / "Hoy" view (separate plan)

Depends on M1. Scope:

- **Pure helper (TDD):** `buildWhatsappReminderUrl({ phone, customerName, time, shopName }): string` → `https://wa.me/<digits>?text=<encoded>`; normalizes AR phone numbers (strip non-digits, ensure `54` country code). Unit-tested.
- **"Hoy" dashboard page:** `src/app/(dashboard)/dashboard/today/page.tsx` (or extend the dashboard home) — server-fetch today's appointments for the membership salon (reuse `getAppointments(salonId)` filtered to today, Argentina tz via `src/lib/dates.ts`), render each with a **"Recordar por WhatsApp"** button (`<a href={waUrl} target="_blank">`) and deposit/status badges.
- Verify: open "Hoy", tap a reminder, WhatsApp opens pre-filled.

## Milestone 4 — Concierge onboarding tooling (separate plan)

Depends on M1. Scope:

- **Script:** `scripts/onboard-salon.ts` (run with `tsx --env-file .env`) — given shop name + owner email + barbers + services, it: `normalizeSlug` the name → insert `salons`, `barbers`, `services`; upsert the BetterAuth `user` for the owner email; insert a `salonMembers` row (`role: "owner"`); print the owner's magic-link sign-in URL. Idempotent on re-run.
- Keep `OWNER_EMAIL`/`isOwnerEmail` as the super-admin guard for who may run onboarding.
- Verify: run the script for a new shop; owner signs in via magic link and lands on their scoped dashboard.

---

## Plan self-review

- **Spec §3.1 multi-tenancy lite** → Tasks 1–5 (membership, gate, scoped reads, slug route). ✓
- **Spec §3.2 seña/deposit** → Milestone 2 (scoped; own plan). ✓
- **Spec §3.3 manual WhatsApp reminders** → Milestone 3 (scoped; own plan). ✓
- **Spec §3.4 concierge onboarding** → Milestone 4 (scoped; own plan). ✓
- **Spec §3 non-goals** (self-serve, auto-billing, WhatsApp API, schema migration, Sentry) → untouched. ✓
- **Type consistency:** `requireSalonMember()` / `getCurrentSalonId()` / `pickActiveSalonId()` / `getPublicSalonBySlug()` / `getPublicBarbers(salonId)` / `getPublicServices(salonId)` / `normalizeSlug()` used consistently across tasks. ✓
- **Testing matches repo reality:** pure helpers are TDD'd; schema/route/UI verified by typecheck + manual run; no DB harness introduced. ✓
