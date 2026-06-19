# Barbería SaaS — v1 Strategy & Build Spec

**Date:** 2026-06-19
**Status:** Approved design (pre-implementation)
**Author:** Facundo + Claude

## Context

We have a working single-shop barbershop booking app (Next.js 16, Drizzle/Neon,
MercadoPago, BetterAuth magic-link, Resend). The goal is to turn it into a niche
SaaS — "turnito.app, but only for barbershops in Argentina" — and reach the first
real revenue (the "first $1") as fast as credibly possible.

Turnito is a *horizontal* LatAm scheduling product (salons, clinics, gyms, tutors,
nutritionists) monetized via freemium subscription tiers (~$24.5k–$42k ARS/mo) plus
a payment commission (5% → 0%), with WhatsApp reminders + MercadoPago as the
regional hooks. Our bet is that going *vertical* on barbershops beats competing
horizontally: sharper relevance, easier word-of-mouth inside a tight community,
defaults and copy that "speak barbería."

**Current real starting point (important):** the schema *looks* multi-tenant (every
entity has `salonId`), but `src/lib/salon-context.ts` resolves the tenant with
`db.select().from(salons).limit(1)` — so in practice the app is **single-tenant**,
gated to one `OWNER_EMAIL`. There is no `middleware.ts` and no per-shop routing.
The expensive, already-built parts are: MercadoPago + secured webhooks, BetterAuth
magic-link, the booking wizard (`src/app/book/`), the availability engine, and the
no-double-booking exclusion constraint. The gap to "turnito for barbers" is mostly
*light multi-tenancy + the no-show wedge + concierge onboarding* — not core booking.

### Strategic decisions (locked)

| Decision | Choice |
|---|---|
| Path to first revenue | **Concierge first** — manually onboard 1–3 real shops, charge manually |
| Revenue model (v1) | **Flat monthly subscription** in ARS, billed manually (MP link/transfer) |
| Killer-feature wedge | **No-show killer** — seña (deposit) + WhatsApp reminders |
| WhatsApp in v1 | **Manual `wa.me` links** — owner taps send; no API, no Meta approval |

---

## 1. Business model

**Niche thesis.** Same booking engine, rebuilt experience for one trade. A barber
doesn't want "agendas para profesionales" — they want *"cobrá la seña, mandá el
recordatorio, llená la silla."* Vertical focus wins on relevance and referral.

**ICP (first customers).** 1–4 chair barbershops, owner-operated, active on
Instagram, currently booking by DM, *losing money to no-shows*. Reachable by you in
person or by DM (local first).

**Value prop / wedge — the no-show killer.** Two mechanics:
- **Seña (deposit)** to confirm a booking. MercadoPago is already wired, so this is
  mostly a per-shop toggle + amount, not new payment infra.
- **WhatsApp reminder.** v1 is manual: a "Hoy" agenda with a *Send reminder* button
  per client that opens WhatsApp pre-filled. Validates demand before paying Meta.

**Pricing (hypothesis, to test on the first 3 conversations).** One flat price,
ARS/month, billed manually during concierge. Anchor: turnito paid tiers ~$24.5k–$42k
ARS/mo. **Launch ≈ $15k ARS/mo per shop**, pitched as *"una seña recuperada al mes
lo paga"* (prevent one no-show and it's free). First customers get **month 1 free**
to remove all friction. Treat the number as a starting bet; adjust after real
reactions.

**Go-to-market — concierge.** You personally: (1) set up 3 real shops (insert their
barbers/services, hand each owner a magic-link login); (2) let them run it free for
~2 weeks; (3) ask for the first payment. No ads, no self-serve, no marketing site yet.

**Milestones.**
- **$1** = one shop says yes to paying.
- **3 paying shops** = the model works for more than a friend.
- **~10 paying shops ("ramen")** = signal to build self-serve + automated billing.

**Cost structure.** Neon + Vercel + Resend + domain ≈ near-zero at pilot scale. No
WhatsApp API cost (manual). Margins are effectively infra-only until scale.

**Competitive note.** Turnito already serves barbers as one of many verticals; they
are the incumbent and the price anchor. We don't beat them on breadth — we beat them
on being *obviously for barbers* and on hands-on onboarding they can't do at scale.

**Risks.** (1) Shops may not value no-show prevention enough to pay — the concierge
pilot exists precisely to falsify this cheaply. (2) Churn after month 1 free. (3)
WhatsApp policy/cost when we later automate. (4) Single-founder concierge doesn't
scale — acceptable until ~10 shops, which is the trigger to automate.

---

## 2. Product — the v1 experience

**Public booking (client-facing).** A per-shop page at `/[slug]/book` (e.g.
`/barberia-juan/book`). Same wizard as today (barber → date/time → service →
details). If the shop enables seña, the flow requires a MercadoPago deposit before
the appointment is confirmed (reusing the existing `payment-pending` / `success`
routes).

**Owner dashboard — "Hoy".** The screen the owner lives in: today's appointments,
each with client name/time/service and a **Send WhatsApp reminder** button (opens a
pre-filled `wa.me` link). Plus deposit status at a glance.

**Concierge onboarding (internal, you-only).** A seed script / tiny internal form
to create a shop + its barbers + services and issue the owner's magic link. Not
customer-facing in v1.

---

## 3. v1 technical scope

> Principle: concierge lets us skip the expensive build (self-serve signup,
> automated billing, WhatsApp API). Build only what's needed to run a paid pilot.

1. **Multi-tenancy lite.**
   - Public booking moves to a `/[slug]/book` dynamic route segment; resolve the
     salon by `slug` (no middleware required).
   - Dashboard resolves the salon from the logged-in user (add `salonId` to the auth
     `user`, or a small `salonMembers` join table — to be decided in the impl plan).
   - Replace `db...limit(1)` in `src/lib/salon-context.ts:9` with real resolution.

2. **Seña / deposit.**
   - Per-shop config: deposit on/off + amount (on `salons`, or per-`services`).
   - Enforce the deposit step in the booking wizard, reusing the existing
     MercadoPago preference creation and `src/app/book/payment-pending` / `success`
     / `payment-failed` routes.

3. **Manual WhatsApp reminders.**
   - "Hoy" agenda view in the dashboard with per-appointment `wa.me` buttons,
     pre-filled with client name, time, and shop name (phone is already captured on
     the appointment).
   - A confirmation message link shown on successful booking.

4. **Concierge onboarding tooling.**
   - Script or minimal internal form to create shop + barbers + services + owner
     magic link.

### Non-goals for v1 (explicitly deferred)

Self-serve signup & onboarding wizard · automated MercadoPago subscription billing ·
WhatsApp Business API + reminder cron · finishing the legacy `appointments` schema
migration (legacy `date`/`time`/`customerName` columns stay as-is) · consolidating
the migrations folder · Sentry. These are Phase 2+, triggered once a few shops pay.

---

## 4. Deferred roadmap (Phase 2+)

Once ~3–10 shops are paying:
- **Self-serve onboarding** — public signup, onboarding wizard, slug claim.
- **Automated subscription billing** — MercadoPago recurring; `plan` /
  `subscriptionStatus` on `salons`; dunning.
- **Automated reminders** — reminder cron + WhatsApp Business API (Meta/Twilio/
  360dialog) with approved templates; email fallback via Resend.
- **Schema cleanup** — finish the `appointments` migration to `appointmentAt` /
  `customerId`; consolidate migrations; re-apply the booking exclusion constraint.
- **Observability** — Sentry; refund/chargeback webhook handling; cron to release
  stale pending appointments squatting slots.

---

## 5. Success criteria (definition of done for v1)

- A second and third real barbershop can be onboarded and operate independently
  (multi-tenancy lite works end-to-end).
- A client can book on a shop's public page and, when the shop enables it, is
  required to pay a seña via MercadoPago to confirm.
- The owner can open "Hoy" and send a WhatsApp reminder to each client in two taps.
- At least one real shop is using it daily, and we have asked for (and ideally
  received) the first payment. **$1 reached.**
