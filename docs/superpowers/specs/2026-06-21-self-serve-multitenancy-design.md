# Open self-serve multi-tenancy + dev test account — design

**Date:** 2026-06-21
**Status:** Approved (pending implementation plan)

## Context

The app already authorizes on `salon_members`: `requireSalonMember()` / `getCurrentSalonId()`
(`src/lib/salon-context.ts`) gate the dashboard and every server action. The legacy
single-owner `OWNER_EMAIL` gate (`isOwner()` / `requireOwner()` in `src/lib/auth.ts`,
`isOwnerEmail()` in `src/lib/owner.ts`) is **dead code** — nothing calls it.

The real gap: **nothing ever inserts a `salon_members` row.** Not signup, not onboarding,
not the seed. So even after a successful magic-link sign-in, `requireSalonMember()` throws
"No salon membership" and the dashboard is unreachable by anyone. This is why the admin area
is currently untestable.

This design makes the app genuinely self-serve multi-tenant (any signed-in user can create a
salon and own it), removes the dead `OWNER_EMAIL` code, and adds a seeded local test account
with one-click dev sign-in so the dashboard can be exercised (manually and by browser tests).

**Deliberate divergence:** `docs/superpowers/plans/2026-06-19-barberia-saas-v1.md` intended to
keep `OWNER_EMAIL` as a super-admin guard on *who may run onboarding*. We are choosing **open
self-serve** instead — onboarding is available to any authenticated user. (Trade-off: anyone
with an inbox can create a salon; acceptable for the current stage and local testing. Abuse
controls — rate limits, email verification on the salon, manual review — are a later concern.)

## Goals

- Remove `OWNER_EMAIL` and all dead owner-gate code.
- A signed-in user with no membership can create a salon and become its `owner` member.
- A seeded local test owner can sign in with one click (dev only) and land on a populated
  dashboard, enabling full admin-surface testing.

## Non-goals (out of scope)

- Salon switcher / multiple salons per user (`pickActiveSalonId` keeps taking the first).
- Inviting additional members, role management UI, ownership transfer.
- Renaming a salon / editing slug after creation (lives in settings later).
- Capturing phone/timezone at onboarding (defaults now; editable in settings later).
- Production-grade abuse controls on open signup.

## Decisions (from brainstorming)

| Question | Decision |
| --- | --- |
| New sign-in with no salon | Redirect to an **onboarding page** (business name → auto-slug) that creates the salon + owner membership, then `/dashboard`. |
| Local test-account auth | **Dev-only instant sign-in** — a button/route that mints a real session for the seeded test owner; hard-gated to non-production. |
| Test owner's salon | Owns the **existing seeded `elite-barbershop`** (has barbers/services/appointments). The fresh-salon path is covered by exercising onboarding during testing. |
| Onboarding form fields | **Business name + URL slug only.** |

## Design

### 1. Remove `OWNER_EMAIL`

- Delete `isOwner()` and `requireOwner()` from `src/lib/auth.ts`; update the stale
  "single-owner (Phase 0)" doc comment to describe membership-based authz.
- Delete `src/lib/owner.ts` and `src/lib/owner.test.ts`.
- Remove `OWNER_EMAIL` from `src/env.ts` (server vars).
- Remove the `OWNER_EMAIL` check from `scripts/preflight.ts`.
- Remove `OWNER_EMAIL` from `.env.example`.
- Update `docs/deployment/go-live-runbook.md` references (smoke test now signs in via magic
  link and onboards a salon, not an `OWNER_EMAIL` allowlist).

### 2. Auth gating: distinguish "no session" from "no membership"

`requireSalonMember()` currently throws a single generic `Error`, and
`dashboard/layout.tsx` redirects all failures to `/sign-in`. Change it to throw **typed
errors** so callers can branch:

- No session → `UnauthorizedError` → redirect `/sign-in`.
- Session but no membership → `NoMembershipError` → redirect `/onboarding`.

`dashboard/layout.tsx` catches both and redirects accordingly. Server actions that call
`getCurrentSalonId()` continue to fail closed (a missing membership is still a hard error
there; only the dashboard layout performs the onboarding redirect).

### 3. Onboarding

**Page** `src/app/onboarding/page.tsx` (server component):
- Not signed in → redirect `/sign-in`.
- Already a member → redirect `/dashboard`.
- Otherwise render the create-salon form (client component for the live slug preview).

**Form:** business name (required, 2–80 chars) + URL slug (auto-filled from
`normalizeSlug(name)`, editable, lowercase-kebab).

**Server action** `createSalon` (`src/server/actions/salons.ts`):
1. Require a session (else `UnauthorizedError`).
2. If the user already has a membership → redirect `/dashboard` (idempotent).
3. Zod-validate name + slug; `normalizeSlug` the slug; ensure uniqueness against `salons.slug`
   by appending `-2`, `-3`, … on collision.
4. In a transaction: insert `salons` (`name`, `slug`, `ownerName` = `user.name` || email
   local-part, `email` = `user.email`, `timezone` default `"UTC"`, `isActive` true) and
   `salon_members` (`userId`, `salonId`, **`role: "owner"` set explicitly**).
5. Redirect `/dashboard`.

**`salons.email` is unique.** Each user creates at most one salon and `salon.email = user.email`,
so this holds. If a transaction still hits the unique constraint (race / pre-existing salon for
that email), treat it as "already onboarded" and redirect `/dashboard`.

### 4. Dev-only test account

**Seed (`src/drizzle/seed/seed.ts`):**
- Insert a `user` row: stable id, `name: "Test Owner"`, `email: "owner@test.local"`,
  `emailVerified: true`.
- Insert a `salon_members` row linking that user to the seeded `elite-barbershop` with
  `role: "owner"`. (First time the seed touches the auth `user` table.)

**Dev sign-in:**
- A server action (e.g. `devSignInAsTestOwner`) **hard-gated** by `env.NODE_ENV !== "production"`;
  it refuses (throws / 404) in production.
- It establishes a **real BetterAuth session** for `owner@test.local`. Preferred mechanism:
  drive BetterAuth's own magic-link issue + verify internally (so we never hand-roll or sign
  session cookies). Exact API call is validated during planning; fallback is BetterAuth's
  server-side session creation if the magic-link round-trip is awkward.
- `/sign-in` renders a **"Dev login as test owner"** button only when
  `process.env.NODE_ENV !== "production"` (inlined client-side by Next), so it is absent from
  production builds. The server action's gate is the real security boundary; the hidden button
  is convenience.

### 5. Slug handling

`normalizeSlug(name)` (existing, `src/lib/slug.ts`) → server-side uniqueness check against
`salons.slug` → collision suffix `-2`/`-3`/…. Editable at onboarding; later renames are a
settings concern (out of scope).

## Testing plan (what this unblocks)

After implementation, run a full adversarial pass in **Google Chrome** (Playwright-driven —
confirmed real Chrome; `expect-cli` only drives the OS default browser):

- **Onboarding:** happy path (new user → create salon → dashboard), duplicate slug → suffix,
  empty/too-short name rejected, already-member user redirected to dashboard.
- **Dev sign-in:** one-click login lands on the populated dashboard; button absent in a prod
  build; action refuses outside dev.
- **Team:** add / edit / delete barber, validation, the delete confirmation.
- **Services:** create / edit, price + duration.
- **Schedule:** weekly working hours editor, schedule overrides.
- **Appointments:** status transitions including the **reopen** fix (cancelled → reopen).
- **Regression:** public booking wizard + the two just-fixed bugs (name min-length gate,
  reopen precedence); console-error sweep on every screen.

## Risks

- **Dev sign-in leaking into production** — mitigation: gate on `NODE_ENV` in the server action
  (the boundary), hide the button client-side, and verify in a production build that the button
  is gone and the action refuses.
- **BetterAuth session-creation mechanism** — the exact internal call to mint a session is the
  one unknown; resolved in the implementation plan with a small spike before wiring the button.
- **Open signup abuse** — accepted for now; noted as a future hardening item.

## Files touched

- `src/lib/auth.ts` (remove owner gate, update comment)
- `src/lib/owner.ts`, `src/lib/owner.test.ts` (delete)
- `src/env.ts`, `scripts/preflight.ts`, `.env.example` (drop `OWNER_EMAIL`)
- `src/lib/salon-context.ts` (typed errors)
- `src/app/(dashboard)/dashboard/layout.tsx` (branch redirect)
- `src/app/onboarding/page.tsx` + onboarding form component (new)
- `src/server/actions/salons.ts` (new `createSalon`)
- dev sign-in server action + `/sign-in` page button
- `src/drizzle/seed/seed.ts` (test user + membership)
- `docs/deployment/go-live-runbook.md`
