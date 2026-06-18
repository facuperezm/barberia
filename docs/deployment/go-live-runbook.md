# Go-Live Runbook

The fastest path from "code works locally" to **one real booking with a paid deposit**.
The app is feature-complete for a single barbershop; everything below is operational
setup, not code. Work top to bottom — each phase unblocks the next.

> **Goal check:** none of this requires multi-tenant or billing. One deployed shop +
> one customer paying a deposit = your first real dollar through the stack.

---

## Accounts you need

| Service | Purpose | Free tier OK? |
|---------|---------|---------------|
| [Vercel](https://vercel.com) | Hosting | Yes (Hobby) |
| [Neon](https://neon.tech) | Production Postgres | Yes |
| [Resend](https://resend.com) | Magic-link + booking emails | Yes |
| [MercadoPago](https://www.mercadopago.com/developers) | Deposits | Yes (per-transaction fee) |
| A domain | Stable public URL | ~$10/yr |

---

## Phase 1 — Production database (Neon)

1. Create a Neon project (pick the region **closest to your users**, e.g. `aws-sa-east-1`
   for Argentina — you'll match Vercel's region to it in Phase 5).
2. Copy the **pooled** connection string (ends with `-pooler...`, includes `?sslmode=require`).
3. Push the schema and re-apply the booking constraint (the push drops it):

   ```bash
   # point at prod for these one-off commands
   DATABASE_URL="postgresql://...prod-pooler...?sslmode=require" pnpm db:push
   DATABASE_URL="postgresql://...prod-pooler...?sslmode=require" \
     pnpm tsx scripts/apply-booking-constraint.ts
   ```

4. Provision the salon + barbers + services. Either run the seed or create them via
   the dashboard after deploy. At minimum **one `salons` row must exist** or
   `getCurrentSalonId()` (dashboard) and public booking both 500.

> **Why the constraint step is non-negotiable:** without `appointments_no_double_booking`,
> two customers can book the same barber for the same slot. The pre-flight check (Phase 6)
> verifies it's present.

---

## Phase 2 — Email domain (Resend)

Magic-link sign-in **and** every booking/payment email send from
`login@modern-barbershop.com` (see `src/lib/email.ts`). Until the domain is verified,
those emails fail or land in spam — and **no verified email = no dashboard login.**

1. In Resend → **Domains** → add the domain you'll send from.
2. Add the **SPF, DKIM, and DMARC** DNS records Resend shows you at your registrar.
3. Wait for "Verified", then send a test from the Resend dashboard.
4. If you send from a different domain than `modern-barbershop.com`, update the `from:`
   addresses in `src/lib/email.ts` to match the verified domain.

---

## Phase 3 — MercadoPago (production credentials)

The code picks the **real** checkout URL (`init_point`) automatically in production
(`src/server/actions/bookings.ts` — gated on `NODE_ENV === "production"`, which Vercel
sets for you). So the *only* thing that decides real-vs-test money is **which credentials
you paste.**

1. In the MP developer dashboard, open your application → **Production credentials**.
2. Copy the **Access Token** (`APP_USR-…`) and **Public Key** (`APP_USR-…`).
   - ⚠️ A `TEST-…` token in prod silently processes fake money. The pre-flight check
     rejects it.
3. Go to **Webhooks / Notifications** and copy the **signing secret** → this is
   `MERCADOPAGO_WEBHOOK_SECRET`. The webhook **URL is auto-set per checkout** to
   `https://<your-domain>/api/mercadopago/webhooks` (from `NEXT_PUBLIC_APP_URL`), so you
   don't register it by hand — you only need the secret to match, and `NEXT_PUBLIC_APP_URL`
   to be correct.

---

## Phase 4 — Buy + point the domain

1. Buy a domain (or use one you own).
2. You'll add it to Vercel in Phase 5; Vercel gives you the DNS records to set.
3. This domain becomes `NEXT_PUBLIC_APP_URL` — it drives magic-link callbacks, MP
   redirect (`back_urls`), and the webhook `notification_url`. Get it right once.

---

## Phase 5 — Deploy to Vercel

1. Import the Git repo into Vercel. It auto-detects Next.js — **no `vercel.json` needed.**
2. **Project → Settings → Functions region:** set it to match your Neon region (Phase 1)
   to minimize DB latency.
3. Add the domain (Phase 4) under **Settings → Domains** and set the DNS records.
4. Add **Environment Variables** (Production scope). Every one of these is required —
   the build fails fast via `src/env.ts` if any is missing:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | Neon **pooled** prod string (Phase 1) |
   | `BETTER_AUTH_SECRET` | `openssl rand -base64 32` (a **new** prod secret, not your local one) |
   | `OWNER_EMAIL` | the email allowed into `/dashboard` |
   | `RESEND_API_KEY` | Resend prod API key (Phase 2) |
   | `MERCADOPAGO_ACCESS_TOKEN` | `APP_USR-…` (Phase 3) |
   | `MERCADOPAGO_WEBHOOK_SECRET` | MP signing secret (Phase 3) |
   | `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | `APP_USR-…` (Phase 3) |
   | `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` (no trailing slash) |

5. Deploy.

---

## Phase 6 — Verify before announcing

1. Pull the live config locally and run the pre-flight check:

   ```bash
   vercel env pull .env.production
   pnpm tsx --env-file .env.production scripts/preflight.ts
   ```

   It must print **"All checks passed — clear for launch."** It catches the footguns the
   build can't: TEST credentials, a localhost URL, a missing booking constraint, no salon.

2. **Sign-in smoke test:** go to `/sign-in`, request a magic link with `OWNER_EMAIL`,
   confirm the email arrives and lands you in `/dashboard`.

3. **End-to-end payment test:** make a real booking from `/book`, pay the deposit, and
   confirm:
   - MP redirects back to `/book/success`
   - the appointment flips to **confirmed** in the dashboard (driven by the
     signature-verified webhook at `/api/mercadopago/webhooks`)
   - a confirmation email arrives

If all three pass, you can take real bookings. **The deposit on step 3 is your first
dollar.**

---

## Rollback

- **Bad deploy:** Vercel → Deployments → promote the previous green deployment.
- **Schema regret:** Neon supports branch/restore; take a branch before `db:push` if nervous.
- **Payments off:** unset `MERCADOPAGO_ACCESS_TOKEN`? No — instead set deposits to zero per
  service, or take the `/book` route down. (Booking still works; only the paid path needs MP.)

---

## What's intentionally NOT here

Multi-tenant onboarding, self-serve signup, and SaaS billing are **out of scope for dollar #1**.
Get one shop live and happy first; charge your first paying shop manually (transfer / payment
link) before building billing automation. Revisit the multi-tenant spec
(`docs/superpowers/specs/`) only once you have that signal.
