# BetterAuth Migration — Design Spec

**Date:** 2026-06-14
**Branch:** `feat/betterauth-migration`
**Status:** Approved (design), pending implementation

## Goal

Replace Clerk with [BetterAuth](https://better-auth.com) as the authentication
provider, using **passwordless magic-link** sign-in over the existing Resend
email setup. Preserve the current **single-owner** authorization model
(`OWNER_EMAIL` gate). This branch is the foundation for the subsequent
multi-tenant phase, where `salonId` will be wired to a BetterAuth Organization.

## Non-goals (explicitly deferred)

- BetterAuth **Organization plugin** / multi-tenancy → next branch.
- Migrating existing user accounts → **greenfield**, only the owner's account
  exists; we drop Clerk cleanly and the owner re-registers via magic link.
- Email/password, Google social, or OTP sign-in → **magic link only**.

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Existing users | Greenfield — no migration code |
| Sign-in method | Magic link (email) only, via Resend |
| Org plugin | Deferred to next phase |
| Auth tables location | Inline in `src/drizzle/schema.ts` (matches "single file" convention) |
| Non-owner who signs in | Redirected to `/sign-in` with a toast; no "request access" page yet |

## Authentication vs Authorization

- **AuthN (BetterAuth magic link):** anyone can request a link and establish a
  session. This is fine — they must control the inbox to complete sign-in.
- **AuthZ (`OWNER_EMAIL` gate):** only the owner's email may reach `/dashboard`
  and mutate data. `isOwner()` / `requireOwner()` remain the authoritative
  check, now reading the BetterAuth session instead of Clerk's `currentUser()`.

## Architecture

### New files

| File | Purpose |
|------|---------|
| `src/lib/auth.ts` (rewrite) | `betterAuth({...})` server instance: Drizzle adapter (provider `pg`) + `magicLink` plugin. Re-exports `isOwner()` / `requireOwner()`. |
| `src/lib/auth-client.ts` | `createAuthClient({ plugins: [magicLinkClient()] })` for client components. |
| `src/app/api/auth/[...all]/route.ts` | `toNextJsHandler(auth)` — the endpoint the client and magic-link emails hit. |
| `src/components/emails/magic-link.tsx` | React Email template for the sign-in link, matching existing email style. |

### Auth tables (added to `src/drizzle/schema.ts`)

Generated via `npx @better-auth/cli@latest generate` and reconciled into the
existing schema file: `user`, `session`, `account`, `verification`. Applied with
`pnpm db:push`. **After push, re-apply the booking exclusion constraint**
(`pnpm tsx --env-file .env scripts/apply-booking-constraint.ts`) per CLAUDE.md.

> Implementation note: verify the exact generated columns and the BetterAuth
> API surface (`toNextJsHandler`, `getSessionCookie`, `magicLink` options,
> `auth.api.getSession`) against the **installed** `better-auth` version — do
> not rely on memorized APIs.

### Touchpoints replaced (the 10)

| # | File | From | To |
|---|------|------|----|
| 1 | `src/proxy.ts` | `clerkMiddleware` + `auth.protect()` | optimistic `getSessionCookie(req)` check; redirect unauth `/dashboard(.*)` → `/sign-in`. Keep matcher. |
| 2 | `src/app/layout.tsx` | `<ClerkProvider>` wrapper | removed |
| 3 | `src/env.ts` | `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `BETTER_AUTH_SECRET`; base URL reuses `NEXT_PUBLIC_APP_URL` |
| 4 | `src/app/(dashboard)/dashboard/layout.tsx` | `<RedirectToSignIn>` | `redirect("/sign-in")` (next/navigation); keep `isOwner()` gate |
| 5 | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Clerk `<SignIn>` | custom magic-link form: email → `authClient.signIn.magicLink({ email, callbackURL: "/dashboard" })` → "check your inbox" state. Simplify route to `/sign-in`. |
| 6 | `src/app/(dashboard)/dashboard/_components/app-sidebar.tsx` | `useUser()` | `authClient.useSession()`; map name/email/avatar with graceful fallbacks (magic-link users may lack name/avatar) |
| 7 | `src/server/actions/{appointments,services,barbers,schedule-overrides}.ts` | `auth()` → `{ userId }` guard returning `{ success:false, error:"Unauthorized access." }` | shared `requireOwnerAction()` helper preserving the same return shape |
| 8 | `src/lib/auth.ts` | `currentUser()` | `auth.api.getSession({ headers: await headers() })` |
| 9 | `src/app/(dashboard)/dashboard/_components/sidebar-nav-user.tsx` | "Cerrar sesión" item (currently **no onClick** — never wired) | wire to `authClient.signOut()` then redirect `/sign-in` |
| 10 | `package.json` | `@clerk/nextjs` | `better-auth` |

Also: `.env.example` and any auth references in docs/README swap Clerk vars for
`BETTER_AUTH_SECRET`.

## Data flow (magic link)

1. Owner visits `/sign-in`, enters email, submits.
2. Client → `authClient.signIn.magicLink({ email, callbackURL: "/dashboard" })`
   → `POST /api/auth/...`.
3. BetterAuth stores a token in `verification`, invokes our `sendMagicLink({ email, url })`
   → Resend delivers the email.
4. Owner clicks link → `/api/auth/[...all]` verifies, creates `user` + `session`,
   sets the session cookie, redirects to `callbackURL`.
5. `src/proxy.ts` sees the session cookie → allows the request.
6. `dashboard/layout.tsx` calls `isOwner()`; session email === `OWNER_EMAIL` →
   render. Otherwise `redirect("/sign-in")` with a toast.

## Environment variables

- **Remove:** `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- **Add:** `BETTER_AUTH_SECRET` (random 32+ char secret).
- **Reuse:** `NEXT_PUBLIC_APP_URL` as the BetterAuth base URL; keep
  `OWNER_EMAIL`, `RESEND_API_KEY`.
- Update `src/env.ts` (`@t3-oss/env-nextjs` schema) accordingly.

## Testing & verification

- **Unit (vitest):** `isOwner()` — mock `auth.api.getSession` so a session with
  `OWNER_EMAIL` passes and any other email is rejected.
- **Build gates:** `pnpm typecheck`, `pnpm lint`, `pnpm test` all green.
- **Manual e2e:** request magic link → email arrives → click → land on
  `/dashboard`. Confirm a non-owner email is bounced to `/sign-in`. Confirm
  sign-out returns to `/sign-in`.

## Execution strategy (sequential spine → parallel leaves)

**Phase A — sequential spine (must land first, single worker):**
1. `pnpm add better-auth`; remove `@clerk/nextjs`.
2. Auth tables in `schema.ts` + `db:push` + re-apply booking constraint.
3. `src/lib/auth.ts` (server instance + isOwner/requireOwner) and
   `src/lib/auth-client.ts`.
4. `src/app/api/auth/[...all]/route.ts`.
5. `src/components/emails/magic-link.tsx` + Resend sender wiring.
6. `src/env.ts` updates.

**Phase B — parallel leaves (after spine compiles):**
- **Leaf 1:** `src/proxy.ts` middleware + `/sign-in` page UI.
- **Leaf 2:** root `layout.tsx` (drop ClerkProvider) + `app-sidebar.tsx`
  (`useSession`) + `sidebar-nav-user.tsx` (sign-out).
- **Leaf 3:** 4 server actions → `requireOwnerAction()` + `dashboard/layout.tsx`.
- **Leaf 4:** vitest test for `isOwner()` + `.env.example`/docs.

## Risks

- BetterAuth API drift vs memorized usage → verify against installed version.
- `db:push` must be followed by re-applying the booking exclusion constraint.
- Missing `BETTER_AUTH_SECRET` / base URL → runtime error; validate via `env.ts`.
- Magic-link deliverability depends entirely on Resend (already in use).
