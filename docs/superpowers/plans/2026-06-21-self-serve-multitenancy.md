# Self-Serve Multi-Tenancy + Dev Test Account — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any signed-in user create and own a salon, remove the dead `OWNER_EMAIL` gate, and add a seeded local test owner with one-click dev sign-in so the dashboard can be exercised end-to-end.

**Architecture:** Authorization already runs through `salon_members` (`requireSalonMember`/`getCurrentSalonId`). We delete the unused `OWNER_EMAIL` code, make `requireSalonMember` throw typed errors so the dashboard can redirect a membership-less session to a new `/onboarding` page, add a `createSalon` server action (salon + `owner` membership in one transaction), and add a dev-only sign-in that mints a real BetterAuth session for a seeded test owner.

**Tech Stack:** Next.js 16 (App Router, RSC + server actions), Drizzle ORM (Neon/Postgres), BetterAuth ^1.6.18 (magic-link), Zod, Vitest.

## Global Constraints

- TypeScript strict; `pnpm typecheck`, `pnpm lint` (oxlint), and `pnpm test` (vitest) must stay green.
- Server-only modules keep `import "server-only"`; pure helpers stay free of it so they unit-test in node.
- Dev sign-in MUST be impossible in production: gate every dev-auth entry point on `process.env.NODE_ENV !== "production"`; the server action is the security boundary, the hidden button is convenience only.
- New salons set `role: "owner"` **explicitly** on the `salon_members` insert (schema default is `staff`).
- Spec: `docs/superpowers/specs/2026-06-21-self-serve-multitenancy-design.md`.
- Test owner email constant: `owner@test.local`.

---

### Task 1: Remove the dead `OWNER_EMAIL` gate

**Files:**
- Modify: `src/lib/auth.ts` (delete `isOwner`, `requireOwner`, update doc comment)
- Delete: `src/lib/owner.ts`, `src/lib/owner.test.ts`
- Modify: `src/env.ts` (remove `OWNER_EMAIL`)
- Modify: `scripts/preflight.ts` (remove the `OWNER_EMAIL` check)
- Modify: `.env.example` (remove `OWNER_EMAIL` line)
- Modify: `docs/deployment/go-live-runbook.md` (drop `OWNER_EMAIL` rows/steps)

**Interfaces:**
- Produces: nothing new. Removes `isOwner`, `requireOwner`, `isOwnerEmail`, and `env.OWNER_EMAIL`.

- [ ] **Step 1: Confirm there are no live callers**

Run: `grep -rn "isOwner\|requireOwner\|isOwnerEmail\|OWNER_EMAIL" src/ scripts/`
Expected: matches only in `src/lib/auth.ts`, `src/lib/owner.ts`, `src/lib/owner.test.ts`, `src/env.ts`, `scripts/preflight.ts` (no dashboard/action callers). If a real caller appears, stop and reassess.

- [ ] **Step 2: Delete the owner module and its test**

Run: `git rm src/lib/owner.ts src/lib/owner.test.ts`

- [ ] **Step 3: Remove the owner gate from `auth.ts`**

In `src/lib/auth.ts`, delete the `import { isOwnerEmail } from "@/lib/owner";` line and the entire `isOwner()` and `requireOwner()` functions. Replace the file's top doc comment block with:

```ts
/**
 * BetterAuth server instance. Passwordless magic-link only — sign-in links are
 * delivered through the existing Resend setup.
 *
 * Authorization is membership-based: a session only grants access to salons the
 * user belongs to (see `requireSalonMember` in `@/lib/salon-context`).
 */
```

- [ ] **Step 4: Remove `OWNER_EMAIL` from env and preflight**

In `src/env.ts`, delete the `OWNER_EMAIL: z.string(),` line from the server schema and any reference to it in the `runtimeEnv` mapping if present.

In `scripts/preflight.ts`, delete the block that reads `process.env.OWNER_EMAIL` and the `"OWNER_EMAIL looks like an email"` check.

In `.env.example`, delete the `OWNER_EMAIL="owner@yourbusiness.com"` line.

In `docs/deployment/go-live-runbook.md`, remove the `OWNER_EMAIL` table row and reword the sign-in smoke-test step to: "go to `/sign-in`, request a magic link with your email, then complete onboarding to create your salon."

- [ ] **Step 5: Verify green**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all pass; the suite count drops by the `owner.test.ts` cases and nothing else fails.

Run: `grep -rn "OWNER_EMAIL\|isOwner\|requireOwner" src/ scripts/ .env.example`
Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(auth): remove dead OWNER_EMAIL single-owner gate"
```

---

### Task 2: Pure slug-uniqueness helper

**Files:**
- Modify: `src/lib/slug.ts` (add `nextAvailableSlug`)
- Test: `src/lib/slug.test.ts` (add cases)

**Interfaces:**
- Consumes: existing `normalizeSlug(input: string): string` from `src/lib/slug.ts`.
- Produces: `nextAvailableSlug(desired: string, taken: Iterable<string>): string`.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/slug.test.ts`:

```ts
import { nextAvailableSlug } from "./slug";

describe("nextAvailableSlug", () => {
  it("returns the normalized base when free", () => {
    expect(nextAvailableSlug("La Barbería", [])).toBe("la-barberia");
  });

  it("suffixes -2 on collision with the base", () => {
    expect(nextAvailableSlug("Elite Barbershop", ["elite-barbershop"])).toBe(
      "elite-barbershop-2",
    );
  });

  it("skips taken suffixes", () => {
    expect(
      nextAvailableSlug("Elite", ["elite", "elite-2", "elite-3"]),
    ).toBe("elite-4");
  });

  it("falls back to 'salon' when normalization is empty", () => {
    expect(nextAvailableSlug("!!!", [])).toBe("salon");
  });
});
```

(If `slug.test.ts` lacks `describe`/`it`/`expect` imports, add `import { describe, it, expect } from "vitest";` at the top.)

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm vitest run src/lib/slug.test.ts`
Expected: FAIL — `nextAvailableSlug is not a function`.

- [ ] **Step 3: Implement**

Append to `src/lib/slug.ts`:

```ts
export function nextAvailableSlug(
  desired: string,
  taken: Iterable<string>,
): string {
  const base = normalizeSlug(desired) || "salon";
  const set = new Set(taken);
  if (!set.has(base)) return base;
  let n = 2;
  while (set.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `pnpm vitest run src/lib/slug.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/slug.ts src/lib/slug.test.ts
git commit -m "feat(slug): add nextAvailableSlug for collision-safe salon slugs"
```

---

### Task 3: `createSalon` server action

**Files:**
- Create: `src/server/actions/salons.ts`

**Interfaces:**
- Consumes: `getSession` (`@/lib/auth`), `nextAvailableSlug` (`@/lib/slug`), `db` and `salons`/`salonMembers` (`@/drizzle`, `@/drizzle/schema`).
- Produces: `createSalon(formData: FormData): Promise<{ ok: false; error: string } | never>` — returns a validation error object, or redirects to `/dashboard` / `/sign-in` on the success and unauthenticated paths.

- [ ] **Step 1: Implement the action**

Create `src/server/actions/salons.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/drizzle";
import { salons, salonMembers } from "@/drizzle/schema";
import { getSession } from "@/lib/auth";
import { nextAvailableSlug } from "@/lib/slug";

const schema = z.object({
  name: z.string().trim().min(2, "Business name must be at least 2 characters").max(80),
  slug: z.string().trim().min(1, "URL slug is required").max(80),
});

export async function createSalon(
  formData: FormData,
): Promise<{ ok: false; error: string }> {
  const session = await getSession();
  const user = session?.user;
  if (!user) redirect("/sign-in");

  // Idempotent: one salon per user for now. Already a member → dashboard.
  const existing = await db
    .select({ id: salonMembers.id })
    .from(salonMembers)
    .where(eq(salonMembers.userId, user.id));
  if (existing.length > 0) redirect("/dashboard");

  const parsed = schema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const takenRows = await db.select({ slug: salons.slug }).from(salons);
  const slug = nextAvailableSlug(
    parsed.data.slug,
    takenRows.map((r) => r.slug),
  );

  await db.transaction(async (tx) => {
    const [salon] = await tx
      .insert(salons)
      .values({
        name: parsed.data.name,
        slug,
        ownerName: user.name ?? user.email.split("@")[0]!,
        email: user.email,
        timezone: "UTC",
      })
      .returning({ id: salons.id });
    await tx.insert(salonMembers).values({
      salonId: salon!.id,
      userId: user.id,
      role: "owner",
    });
  });

  redirect("/dashboard");
}
```

Note on `redirect`: Next's `redirect()` throws `NEXT_REDIRECT`; because it is never called inside a `try/catch` here it propagates correctly. The `salons.email` unique constraint is a backstop for the rare race where a salon already exists for this email without a membership; the membership pre-check covers the normal idempotent case.

- [ ] **Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: PASS (no errors in `salons.ts`).

- [ ] **Step 3: Commit**

```bash
git add src/server/actions/salons.ts
git commit -m "feat(onboarding): createSalon action (salon + owner membership)"
```

---

### Task 4: Onboarding page + form

**Files:**
- Create: `src/app/onboarding/page.tsx` (server component gate)
- Create: `src/app/onboarding/_components/onboarding-form.tsx` (client form with live slug)

**Interfaces:**
- Consumes: `getSession` (`@/lib/auth`), `db`/`salonMembers` for the membership check, `createSalon` (`@/server/actions/salons`), `normalizeSlug` (`@/lib/slug`), `Button`/`Input`/`Label`/`Card` (`@/components/ui/*`).
- Produces: route `/onboarding`.

- [ ] **Step 1: Build the gate page**

Create `src/app/onboarding/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { salonMembers } from "@/drizzle/schema";
import { getSession } from "@/lib/auth";
import { OnboardingForm } from "./_components/onboarding-form";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  const memberships = await db
    .select({ id: salonMembers.id })
    .from(salonMembers)
    .where(eq(salonMembers.userId, session.user.id));
  if (memberships.length > 0) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <OnboardingForm />
    </div>
  );
}
```

- [ ] **Step 2: Build the client form**

Create `src/app/onboarding/_components/onboarding-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { normalizeSlug } from "@/lib/slug";
import { createSalon } from "@/server/actions/salons";

export function OnboardingForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveSlug = slugEdited ? slug : normalizeSlug(name);

  async function action(formData: FormData) {
    setError(null);
    formData.set("slug", effectiveSlug);
    const result = await createSalon(formData);
    if (result && !result.ok) setError(result.error);
  }

  return (
    <Card className="w-full max-w-md space-y-6 p-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Create your barbershop</h1>
        <p className="text-sm text-muted-foreground">
          Set up your shop to start taking bookings.
        </p>
      </div>
      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Business name</Label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="La Barbería"
            required
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Booking URL</Label>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground">/</span>
            <Input
              id="slug"
              name="slug"
              value={effectiveSlug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(normalizeSlug(e.target.value));
              }}
              placeholder="la-barberia"
            />
            <span className="text-muted-foreground">/book</span>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full">
          Create barbershop
        </Button>
      </form>
    </Card>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/onboarding/
git commit -m "feat(onboarding): /onboarding page and create-salon form"
```

---

### Task 5: Typed auth errors + dashboard onboarding redirect

**Files:**
- Modify: `src/lib/salon-context.ts` (typed errors)
- Modify: `src/app/(dashboard)/dashboard/layout.tsx` (branch redirect)

**Interfaces:**
- Produces: `UnauthorizedError`, `NoMembershipError` (exported from `@/lib/salon-context`). `requireSalonMember` throws these instead of generic `Error`.

- [ ] **Step 1: Add typed errors and throw them**

In `src/lib/salon-context.ts`, add near the top (after imports):

```ts
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export class NoMembershipError extends Error {
  constructor() {
    super("No salon membership");
    this.name = "NoMembershipError";
  }
}
```

In `requireSalonMember`, replace `throw new Error("Unauthorized");` with `throw new UnauthorizedError();` and `throw new Error("No salon membership");` with `throw new NoMembershipError();`.

- [ ] **Step 2: Branch the dashboard layout redirect**

In `src/app/(dashboard)/dashboard/layout.tsx`, replace the existing `try { await requireSalonMember(); } catch { redirect("/sign-in"); }` with:

```tsx
import { requireSalonMember, NoMembershipError } from "@/lib/salon-context";
// ...
  let destination: string | null = null;
  try {
    await requireSalonMember();
  } catch (err) {
    destination = err instanceof NoMembershipError ? "/onboarding" : "/sign-in";
  }
  if (destination) redirect(destination);
```

(`redirect()` is called OUTSIDE the `catch` so its `NEXT_REDIRECT` throw is not swallowed.)

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/salon-context.ts "src/app/(dashboard)/dashboard/layout.tsx"
git commit -m "feat(auth): redirect membership-less sessions to /onboarding"
```

---

### Task 6: Dev-only test sign-in

**Files:**
- Create: `src/lib/dev-auth.ts` (constant + token capture + gate)
- Modify: `src/lib/auth.ts` (capture token for the test email in dev)
- Create: `src/server/actions/dev-auth.ts` (dev sign-in action)
- Modify: `src/app/(auth)/sign-in/page.tsx` (dev button, dev-only)

**Interfaces:**
- Produces: `DEV_TEST_EMAIL`, `isDevAuthEnabled`, `captureDevMagicToken`, `takeDevMagicToken` (`@/lib/dev-auth`); `devSignInAsTestOwner()` server action (`@/server/actions/dev-auth`).

- [ ] **Step 1: Dev-auth module**

Create `src/lib/dev-auth.ts`:

```ts
export const DEV_TEST_EMAIL = "owner@test.local";

/** Dev sign-in is only ever available outside production. */
export const isDevAuthEnabled = process.env.NODE_ENV !== "production";

// Single-slot capture of the magic-link token for the test account so the dev
// sign-in action can verify it without an email round-trip.
let captured: string | null = null;
export function captureDevMagicToken(token: string): void {
  captured = token;
}
export function takeDevMagicToken(): string | null {
  const token = captured;
  captured = null;
  return token;
}
```

- [ ] **Step 2: Capture the token in `auth.ts`**

In `src/lib/auth.ts`, import the helpers:

```ts
import { DEV_TEST_EMAIL, isDevAuthEnabled, captureDevMagicToken } from "@/lib/dev-auth";
```

Replace the `magicLink` plugin's `sendMagicLink` with:

```ts
    magicLink({
      sendMagicLink: async ({ email, url, token }) => {
        if (isDevAuthEnabled && email === DEV_TEST_EMAIL) {
          captureDevMagicToken(token);
          return; // never email the local test account
        }
        await sendMagicLinkEmail({ email, url });
      },
    }),
```

- [ ] **Step 3: Dev sign-in action**

Create `src/server/actions/dev-auth.ts`:

```ts
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  DEV_TEST_EMAIL,
  isDevAuthEnabled,
  takeDevMagicToken,
} from "@/lib/dev-auth";

export async function devSignInAsTestOwner(): Promise<void> {
  if (!isDevAuthEnabled) throw new Error("Dev sign-in is disabled");

  const requestHeaders = await headers();
  // Issues a magic-link token; our sendMagicLink captures it instead of emailing.
  await auth.api.signInMagicLink({
    body: { email: DEV_TEST_EMAIL },
    headers: requestHeaders,
  });
  const token = takeDevMagicToken();
  if (!token) throw new Error("Dev magic-link token was not captured");

  // Verifying establishes the session cookie (persisted by the nextCookies plugin).
  await auth.api.magicLinkVerify({
    query: { token },
    headers: requestHeaders,
  });

  redirect("/dashboard");
}
```

- [ ] **Step 4: Dev button on the sign-in page**

In `src/app/(auth)/sign-in/page.tsx`, render a dev-only button below the existing form. If the page is a server component, add:

```tsx
import { isDevAuthEnabled } from "@/lib/dev-auth";
import { devSignInAsTestOwner } from "@/server/actions/dev-auth";
import { Button } from "@/components/ui/button";
// ... inside the returned JSX, after the magic-link form/card:
{isDevAuthEnabled && (
  <form action={devSignInAsTestOwner} className="mt-4">
    <Button type="submit" variant="outline" className="w-full">
      Dev login as test owner
    </Button>
  </form>
)}
```

If `sign-in/page.tsx` is a client component, import `isDevAuthEnabled` is still fine (the constant is plain), and use the same `<form action={devSignInAsTestOwner}>`; server actions may be passed as form actions from client components.

- [ ] **Step 5: Verify it compiles and the gate holds**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

Run: `NODE_ENV=production pnpm exec tsx -e "import('./src/lib/dev-auth.ts').then(m => console.log('prod isDevAuthEnabled =', m.isDevAuthEnabled))"`
Expected: prints `prod isDevAuthEnabled = false`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/dev-auth.ts src/lib/auth.ts src/server/actions/dev-auth.ts "src/app/(auth)/sign-in/page.tsx"
git commit -m "feat(dev): one-click dev sign-in for seeded test owner"
```

---

### Task 7: Seed the test owner + membership

**Files:**
- Modify: `src/drizzle/seed/seed.ts`

**Interfaces:**
- Consumes: `DEV_TEST_EMAIL` (`@/lib/dev-auth`), `user`/`salonMembers` schema, `mainSalon` (already created in the seed transaction).

- [ ] **Step 1: Extend seed imports**

In `src/drizzle/seed/seed.ts`, add `user` and `salonMembers` to the schema import, and import the constant:

```ts
import {
  salons,
  barbers,
  services,
  customers,
  scheduleOverrides,
  appointments,
  workingHours,
  ratings,
  payments,
  user,
  salonMembers,
} from "@/drizzle/schema";
import { DEV_TEST_EMAIL } from "@/lib/dev-auth";
```

- [ ] **Step 2: Clean prior test rows (idempotent reseed)**

In the cleanup block (where other `tx.delete(...)` calls live, before the salons insert), add — ordered so FKs are satisfied (salon_members first, then user):

```ts
await tx.delete(salonMembers);
await tx.delete(user);
```

- [ ] **Step 3: Insert test owner + owner membership after `mainSalon`**

Immediately after `const mainSalon = insertedSalons[0]!;`:

```ts
const [testOwner] = await tx
  .insert(user)
  .values({
    id: "test-owner",
    name: "Test Owner",
    email: DEV_TEST_EMAIL,
    emailVerified: true,
  })
  .returning({ id: user.id });
await tx.insert(salonMembers).values({
  salonId: mainSalon.id,
  userId: testOwner!.id,
  role: "owner",
});
console.log(`   👤 Seeded test owner ${DEV_TEST_EMAIL} → ${mainSalon.slug}`);
```

- [ ] **Step 4: Run the seed against the local DB**

Run: `pnpm db:up && pnpm db:seed`
Expected: completes; log shows "Seeded test owner owner@test.local → elite-barbershop".

Verify: `pnpm db:studio` (or a quick query) shows one `salon_members` row linking `test-owner` to the elite-barbershop salon with role `owner`.

- [ ] **Step 5: Commit**

```bash
git add src/drizzle/seed/seed.ts
git commit -m "feat(seed): seed test owner with owner membership on elite-barbershop"
```

---

### Task 8: End-to-end verification (Chrome)

**Files:** none (verification only).

- [ ] **Step 1: Start the app on a fresh seed**

Run: `pnpm db:setup` (or `pnpm db:up && pnpm db:seed`), then `pnpm dev`.

- [ ] **Step 2: Dev sign-in → dashboard**

In Google Chrome (Playwright-driven), open `/sign-in`, click "Dev login as test owner". Expected: lands on `/dashboard` showing the seeded elite-barbershop data (barbers, services, appointments). Console: 0 errors.

- [ ] **Step 3: Exercise the admin surface (adversarial)**

Team: add a barber (valid + empty-name rejected), edit, delete (confirm dialog). Services: create + edit (price/duration). Schedule: edit weekly working hours; add a schedule override. Appointments: run status transitions including **cancelled → Reopen** (verifies the earlier precedence fix). Check console errors on every screen.

- [ ] **Step 4: Onboarding path (fresh salon)**

Sign out / clear the session cookie, request a magic link with a NEW email (grab the link from the dev server console since only `owner@test.local` is captured), verify → should land on `/onboarding`. Create a salon with a name that normalizes to an existing slug (e.g. "Elite Barbershop") and confirm the booking URL gets a `-2` suffix; confirm a <2-char name is rejected; confirm success lands on `/dashboard`.

- [ ] **Step 5: Public + regression sweep**

Re-verify the public booking wizard end-to-end, the two earlier bug fixes (single-char name gate, reopen), the `/[slug]/book` route for the newly created salon, and that `/dashboard` redirects to `/sign-in` when logged out.

- [ ] **Step 6: Production gate check**

Run: `pnpm build` then `NODE_ENV=production pnpm start`; confirm the "Dev login as test owner" button is absent on `/sign-in` and that posting to the dev action fails.

---

## Self-Review

**Spec coverage:**
- Remove `OWNER_EMAIL` → Task 1. ✓
- Auth gating (no-session vs no-membership) → Task 5. ✓
- Onboarding page + form → Task 4; `createSalon` → Task 3. ✓
- Slug normalize + uniqueness → Task 2 (helper), used in Task 3. ✓
- Dev-only test sign-in → Task 6; seeded test owner on elite-barbershop → Task 7. ✓
- Testing plan → Task 8. ✓

**Placeholder scan:** No TBD/TODO; every code step contains full code. The BetterAuth dev-session mechanism is concrete (`signInMagicLink` + `magicLinkVerify`) with a verification step in Task 6/8.

**Type consistency:** `nextAvailableSlug(desired, taken)` defined in Task 2, consumed identically in Task 3. `NoMembershipError`/`UnauthorizedError` defined in Task 5, consumed in Task 5's layout. `DEV_TEST_EMAIL`/`captureDevMagicToken`/`takeDevMagicToken`/`isDevAuthEnabled` defined in Task 6, consumed in Tasks 6 and 7. `createSalon(formData)` defined in Task 3, consumed in Task 4.
