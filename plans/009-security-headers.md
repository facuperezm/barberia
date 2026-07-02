# Plan 009: Add response-hardening security headers

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat bc98614..HEAD -- next.config.js src/proxy.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: MED if CSP were enforced blindly — mitigated by shipping CSP in
  Report-Only mode; the other headers are LOW risk
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `bc98614`, 2026-07-01

## Why this matters

The app serves an authenticated dashboard full of customer PII and a public
payment-adjacent booking flow with **zero** hardening headers: no HSTS, no
clickjacking protection, no `nosniff`, no referrer policy, no CSP. These are
table-stakes browser defenses; their absence turns any future XSS or embedding
trick into a bigger incident than it needs to be.

## Current state

- `next.config.js` — the entire file:

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

- `src/proxy.ts` (Next 16's middleware) — redirects unauthenticated
  `/dashboard` traffic; sets no headers. Leave it alone; `next.config.js
  headers()` is the simpler, static place for this.

- External surfaces that inform the CSP: images from `images.unsplash.com` and
  `ik.imagekit.io` (see config above); MercadoPago checkout is reached by
  **top-level redirect** (`redirectUrl` navigation in
  `src/app/book/_components/booking-form.tsx`), not an iframe/SDK embed, so no
  MP domains are needed in `script-src`/`frame-src`; email links (Resend) are
  outbound only.

- Deployment: Vercel, HTTPS-terminated (HSTS is meaningful in production; on
  `http://localhost` browsers ignore it).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Unit tests | `pnpm test` | all pass |
| Prod build | `pnpm build` | exit 0 |
| Serve build | `pnpm start` | app on :3000 |
| Header check | `curl -sI http://localhost:3000 \| grep -i -E "strict-transport\|x-frame\|x-content\|referrer-policy\|permissions-policy\|content-security"` | all six present |

## Scope

**In scope** (the only file you should modify):
- `next.config.js`

**Out of scope** (do NOT touch, even though they look related):
- `src/proxy.ts` — no per-request header logic needed.
- Flipping CSP from Report-Only to enforcing — explicitly a follow-up after
  observation (see Maintenance notes).
- Cookie flags — BetterAuth manages its own cookie attributes.

## Git workflow

- Branch: `advisor/009-security-headers`
- Conventional commit, e.g. `feat(security): response-hardening headers + report-only CSP`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the headers block

Replace `next.config.js` content with:

```js
/** @type {import('next').NextConfig} */

// Report-Only first: observe violations in real traffic before enforcing.
// 'unsafe-inline'/'unsafe-eval' in script-src reflect Next.js runtime needs
// (inline bootstrap; eval in dev tooling) — tighten with nonces later.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://images.unsplash.com https://ik.imagekit.io",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=15552000; includeSubDomains",
  },
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
];

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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
```

**Verify**: `pnpm build` → exit 0.

### Step 2: Verify headers and sweep for CSP violations

1. `pnpm start` (after the build), then the curl check from the commands
   table → all six headers present on `/`.
2. Browse (real browser, dev sign-in available on `/sign-in`):
   `/` → `/elite-barbershop/book` (walk the wizard through step 2) →
   `/sign-in` → dev login → `/dashboard`, `/dashboard/team`,
   `/dashboard/schedule`, `/dashboard/services`.
3. On each page, check the console for `Content-Security-Policy-Report-Only`
   violation messages. **Record every violation verbatim in your final
   report** — they are the input for the future enforcement flip. Expected:
   none, or only Next-dev artifacts; violations pointing at app functionality
   (e.g. an external script you didn't know about) are findings, not things to
   silently allow-list.

**Verify**: header curl passes; violation list captured (possibly empty).

## Test plan

- No unit tests (config-only). The verification is the curl header assertion
  plus the recorded browse sweep.
- `pnpm typecheck && pnpm lint && pnpm test` must stay green (they don't touch
  the config, but run them anyway as the repo's standard gate).

## Done criteria

- [ ] `pnpm build` exits 0
- [ ] `curl -sI http://localhost:3000` shows all six headers
- [ ] Console sweep across the six listed pages done; violations recorded in the report
- [ ] `pnpm typecheck && pnpm lint && pnpm test` all exit 0
- [ ] Only `next.config.js` modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any page visibly breaks with the headers applied (X-Frame-Options/DENY can
  break intentional embedding — none is known to exist; if you find one, that
  embedding is the report).
- The MercadoPago flow turns out to use an embed/SDK rather than a top-level
  redirect (would appear as CSP violations naming `mercadopago`/`mlstatic`
  domains) — enforcement planning then needs those domains; report the exact
  violated directives.
- `headers()` conflicts with Vercel-level headers already configured in the
  dashboard (duplicated keys in responses) — report before choosing a source
  of truth.

## Maintenance notes

- **The follow-up that matters**: after ~a week of production traffic with no
  actionable Report-Only violations, switch the key to
  `Content-Security-Policy` (enforcing) in a one-line PR. Track violations via
  browser consoles for now (no `report-to` endpoint exists; Sentry is Phase 2
  — wire `report-uri` then).
- When a MercadoPago embedded checkout, analytics script, or font CDN is
  added, the CSP is the file to extend — reviewers should watch for new
  external origins in PRs.
- `script-src` can graduate to nonces via Next's `headers()`-free middleware
  approach later; don't attempt it while the policy is still Report-Only.
