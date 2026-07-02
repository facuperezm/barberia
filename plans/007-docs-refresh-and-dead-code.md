# Plan 007: Fix actively-wrong docs and delete the dead email paths

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat bc98614..HEAD -- CLAUDE.md README.md .cursorrules src/lib/email.ts src/components/emails/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs + tech-debt
- **Planned at**: commit `bc98614`, 2026-07-01

## Why this matters

The three files that orient contributors and AI agents are actively wrong —
worse than missing:

- **CLAUDE.md** (the file agents load every session) still describes the auth
  model that was deleted in June 2026 (`OWNER_EMAIL` single-owner gate),
  lists `OWNER_EMAIL` as a required env var, omits four new directories, and
  points the booking flow at the legacy `/book` URL.
- **README.md** claims Next.js 15 (it's 16), a "monorepo" (single package),
  and "automated confirmations and reminders" (reminders were never built —
  the documented product decision is *manual WhatsApp* reminders), and its
  install steps cannot produce a running app (wrong directory name, no
  database step, no `.env.example` mention).
- **.cursorrules** tells editors/agents to follow "React Remix" docs — wrong
  framework, repeated several times.

Riding along: the reminder/feedback email senders and templates are dead code
(zero callers; the feedback URL points at a route that doesn't exist), and
they're exactly what misled the README into claiming reminders exist.

## Current state

- `CLAUDE.md` (repo root). Wrong bits, verbatim:
  - Line ~45 (Tech Stack): `**Auth**: BetterAuth (passwordless magic-link via
    Resend; single-owner gate by \`OWNER_EMAIL\`)` — the owner gate was
    removed in commit `4da6960`; authorization is membership-based
    (`salon_members` via `requireSalonMember()` in `src/lib/salon-context.ts`,
    roles `owner|admin|staff`), with self-serve onboarding at `/onboarding`.
  - "Environment Variables" section: `Server vars: DATABASE_URL,
    BETTER_AUTH_SECRET, OWNER_EMAIL, MERCADOPAGO_ACCESS_TOKEN,
    RESEND_API_KEY.` — `OWNER_EMAIL` no longer exists in `src/env.ts`; the
    actual server vars are `DATABASE_URL`, `BETTER_AUTH_SECRET`,
    `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`,
    `RESEND_API_KEY` (client: `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`,
    `NEXT_PUBLIC_APP_URL`).
  - Project Structure block: missing `src/server/payments/`
    (MercadoPago + apply/reconcile/webhook-signature), `src/server/booking/`
    (hold expiry), `src/app/onboarding/`, `src/app/[slug]/book/`.
  - Booking-flow bullet: says the wizard is "at `/book`"; the real per-shop
    entry is `/[slug]/book` — bare `/book` now just redirects to the first
    active salon.
- `README.md`: line ~27 "Next.js 15"; lines ~9 and ~13 "monorepo
  setup/structure"; line ~22 "Automated confirmations and reminders for
  appointments"; Installation section says `git clone .../barbershop.git`,
  `cd barbershop-app`, `.env` by hand, `pnpm dev` — with no `pnpm db:up` /
  `pnpm db:setup` step the app cannot start locally. The Tools list omits
  BetterAuth, MercadoPago, Neon/Drizzle specifics, and Resend.
- `.cursorrules`: one minified line containing multiple occurrences of
  "React Remix" (e.g. "Favor React Remix Components (RSC)"). CLAUDE.md's
  "Code Style — From `.cursorrules`" section already restates the useful rules
  correctly for this stack.
- Dead email code:
  - `src/lib/email.ts:65-97` `sendAppointmentReminder` and `:99-130`
    `sendFeedbackRequest` — `grep -rn "sendAppointmentReminder\|sendFeedbackRequest" src`
    returns only the definitions.
  - `sendFeedbackRequest` builds `/feedback/${appointmentId}`; no
    `src/app/feedback/` route exists.
  - Templates only they import: `src/components/emails/appointment-reminder.tsx`,
    `src/components/emails/feedback-request.tsx`.
  - Live senders that must NOT be touched: `sendMagicLinkEmail` (:11-29) and
    `sendAppointmentConfirmation` (:31-63) and their two templates.
- Reminders-by-WhatsApp is the decided product direction
  (`docs/superpowers/specs/2026-06-19-barberia-saas-v1-design.md`, "manual
  `wa.me` links"); plan 012 implements it. The deleted senders are not a lost
  feature.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Unit tests | `pnpm test` | all pass |
| Dead-code check | `grep -rn "sendAppointmentReminder\|sendFeedbackRequest\|appointment-reminder\|feedback-request" src` | no matches after Step 3 |

## Scope

**In scope** (the only files you should modify/delete):
- `CLAUDE.md`
- `README.md`
- `.cursorrules`
- `src/lib/email.ts`
- `src/components/emails/appointment-reminder.tsx` (delete)
- `src/components/emails/feedback-request.tsx` (delete)

**Out of scope** (do NOT touch, even though they look related):
- `docs/superpowers/**` — historical design records; point-in-time documents
  are allowed to mention removed things.
- `docs/deployment/go-live-runbook.md` — verified already updated post
  `OWNER_EMAIL` removal.
- `sendMagicLinkEmail`, `sendAppointmentConfirmation`, and their templates.
- `src/env.ts`, `.env.example` — already correct; docs must match *them*.

## Git workflow

- Branch: `advisor/007-docs-refresh`
- Conventional commits, e.g. `docs: align CLAUDE.md/README with the multi-tenant reality`
  and `chore(email): delete dead reminder/feedback senders`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Correct CLAUDE.md

Apply exactly these content changes (keep the file's existing structure/tone):

1. Auth bullet → `**Auth**: BetterAuth (passwordless magic-link via Resend);
   authorization is membership-based — \`salon_members\` roles
   (owner/admin/staff) resolved by \`requireSalonMember()\` in
   \`src/lib/salon-context.ts\`; new users self-serve a salon at \`/onboarding\``.
2. Environment Variables sentence → server vars `DATABASE_URL`,
   `BETTER_AUTH_SECRET`, `MERCADOPAGO_ACCESS_TOKEN`,
   `MERCADOPAGO_WEBHOOK_SECRET`, `RESEND_API_KEY`; client vars prefixed
   `NEXT_PUBLIC_` (matches `src/env.ts`).
3. Project Structure tree: add `onboarding/` and `[slug]/book/` under
   `src/app/`, and `booking/` + `payments/` under `src/server/`, each with a
   one-phrase description consistent with the tree's style.
4. Booking Flow pattern → `Multi-step wizard at /[slug]/book (per-salon;
   legacy /book redirects to the first active salon)...` keeping the steps
   list.
5. Add one line to the Commands section, after the migration commands:
   `# NOTE: migrations are frozen; the workflow is db:push + the constraint
   script. db:generate/db:migrate would produce/apply an outdated history.`

**Verify**: `grep -n "OWNER_EMAIL" CLAUDE.md` → no matches.

### Step 2: Correct README.md

1. "Next.js 15" → "Next.js 16".
2. Remove/replace both "monorepo" claims (it is a single Next.js application).
3. Features list: change "Automated confirmations and reminders" to
   `**Notifications:** Automated booking-confirmation emails (Resend)` — do
   not claim reminders.
4. Tools Used: add BetterAuth (magic-link auth), MercadoPago (payments), Neon
   PostgreSQL + Drizzle ORM, Resend (email); fix the Next.js version there
   too.
5. Installation section — replace steps 2–5 with the real flow:

   ```bash
   cd barberia
   pnpm i
   cp .env.example .env   # fill in the values; local defaults documented inside
   pnpm db:setup          # docker Postgres + schema + constraint + seed
   pnpm dev
   ```

   Keep the clone step; mention Docker as a prerequisite.

**Verify**: `grep -in "monorepo\|next.js 15\|reminders" README.md` → only
acceptable matches (none for monorepo/15; "reminders" absent or clearly
describing the WhatsApp plan).

### Step 3: Delete the dead email path

1. In `src/lib/email.ts`: delete `sendAppointmentReminder` and
   `sendFeedbackRequest` plus the now-unused imports
   `AppointmentReminderEmail` and `FeedbackRequestEmail`.
2. Delete `src/components/emails/appointment-reminder.tsx` and
   `src/components/emails/feedback-request.tsx`.

**Verify**:
`grep -rn "sendAppointmentReminder\|sendFeedbackRequest\|appointment-reminder\|feedback-request" src`
→ no matches; `pnpm typecheck && pnpm lint && pnpm test` → all green.

### Step 4: Fix `.cursorrules`

Replace every "React Remix" reference with the correct stack wording ("React
Server Components (RSC)" / "Next.js docs"), or — simpler and preferred —
replace the whole file's content with:

```
See CLAUDE.md ("Code Style" section) — the single source of style rules for
this repo. Next.js 16 App Router + React Server Components (not Remix).
```

**Verify**: `grep -c "Remix" .cursorrules` → 0, or only in the "not Remix"
clarification.

## Test plan

- No new automated tests (docs + deletion). The full existing suite must stay
  green after the deletions: `pnpm typecheck && pnpm lint && pnpm test`.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `grep -n "OWNER_EMAIL" CLAUDE.md` returns nothing
- [ ] `grep -rn "sendAppointmentReminder\|sendFeedbackRequest" src` returns nothing
- [ ] `src/components/emails/` contains only `appointment-confirmation.tsx` and `magic-link.tsx`
- [ ] README installation section includes `pnpm db:setup`
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any grep in "Current state" contradicts what you find (e.g. a caller of
  `sendAppointmentReminder` appeared since `bc98614`) — do not delete code
  that gained a caller.
- CLAUDE.md's structure has materially changed (drifted) — reconcile against
  the live file rather than pasting stale sections.

## Maintenance notes

- Plan 012 adds WhatsApp reminder links; when it lands, the README Features
  list can gain `**Reminders:** manual WhatsApp reminders from the "Hoy"
  agenda` — not before.
- CLAUDE.md is agent-facing config: whenever auth, env vars, or the directory
  layout change again, updating it belongs in the same PR (reviewers should
  start asking for that).
- If seña (plan 011) ships, both CLAUDE.md's booking-flow bullet and the
  README features need another pass.
