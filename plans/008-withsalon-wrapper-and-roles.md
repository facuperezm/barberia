# Plan 008: Centralize the salon-membership gate and enforce owner/admin roles

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat bc98614..HEAD -- src/lib/salon-context.ts src/server/actions/ src/app/onboarding/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (touches the auth preamble of every dashboard action; a wrong
  wrapper silently changes response contracts client components rely on)
- **Depends on**: plans/001-db-test-harness.md (for the role-enforcement tests)
- **Category**: security + tech-debt
- **Planned at**: commit `bc98614`, 2026-07-01

## Why this matters

`requireSalonMember()` computes and returns the caller's `role`
(`owner | admin | staff`), and **no caller anywhere consumes it** — the schema
comment documents a least-privilege design ("owner-granting paths must set
role explicitly") that the action layer doesn't enforce. Today that's latent
(the only membership-creation path makes everyone an owner), but the moment
staff invites ship, every staff member can delete barbers, change prices, and
rewrite schedules. Enforcing roles *before* invites exist is the cheap moment.

The same sweep fixes the mechanical debt around it: the try/catch membership
preamble is copy-pasted at 9 mutation sites, read actions inconsistently use a
bare `getCurrentSalonId()` (throwing typed errors at the client instead of
returning a friendly failure), one action returns `{ errors }` with no
`success` key, and the newest action (`createSalon`) invented a third shape
(`{ ok: false }`).

## Current state

- `src/lib/salon-context.ts` (54 lines) — exports `UnauthorizedError`,
  `NoMembershipError`, `getCurrentSalonId(): Promise<number>` and:

  ```ts
  export async function requireSalonMember(): Promise<{
    salonId: number;
    role: string;
  }> {
    const result = await getSession();
    const userId = result?.user?.id;
    if (!userId) throw new UnauthorizedError();

    const memberships = await db
      .select({ salonId: salonMembers.salonId, role: salonMembers.role })
      .from(salonMembers)
      .where(eq(salonMembers.userId, userId));

    const salonId = pickActiveSalonId(memberships);
    if (salonId === null) throw new NoMembershipError();

    const role = memberships.find((m) => m.salonId === salonId)?.role ?? "staff";
    return { salonId, role };
  }
  ```

  Note the return type is `role: string` even though the DB column is the
  `member_role` enum (`"owner" | "admin" | "staff"` — see
  `src/drizzle/schema.ts:59` and `:563-585`, type `SalonMember`).

- The copy-pasted mutation preamble (example —
  `src/server/actions/barbers.ts:34-39`; same shape at `barbers.ts:70-73`,
  `barbers.ts:121-124`, `src/server/actions/appointments.ts:22-27` and
  `:130-135`, and in `src/server/actions/services.ts` and
  `src/server/actions/schedule-overrides.ts`):

  ```ts
    let salonId: number;
    try {
      ({ salonId } = await requireSalonMember());
    } catch {
      return { success: false, error: "Unauthorized access." };
    }
  ```

- The divergent read style (throws/swallows instead of returning a failure) —
  `src/server/actions/barbers.ts:172-183` (`getBarbers`), also at `:215-227`
  (`getAllEmployees`), `:229-239` (`getBarberSchedule`), `:255`
  (one more read), and `src/server/actions/schedule.ts:30`
  (`getWeeklySchedule`).

- The shape outliers:
  - `src/server/actions/salons.ts:25-27` — `createSalon(formData):
    Promise<{ ok: false; error: string }>` returning `{ ok: false, error }`
    at `:44` (success path redirects). Its client consumer is
    `src/app/onboarding/_components/onboarding-form.tsx` — find the `.ok`
    reads there before changing anything.
  - `src/server/actions/barbers.ts:87` returns `{ errors: fieldErrors }` with
    no `success` key while `barbers.ts:139` returns
    `{ success: false, errors }`.

- Dashboard-layout gating (`src/app/(dashboard)/dashboard/layout.tsx`)
  branches on `UnauthorizedError` vs `NoMembershipError` for redirects — the
  wrapper must NOT be applied there; typed throws remain correct for layouts.

- Session in tests: server actions resolve the user via `getSession()` from
  `@/lib/auth` (BetterAuth over request headers); integration tests mock that
  module (pattern shown in Step 5).

- Enumerate the real, current call sites yourself (they may have moved):
  `grep -n "requireSalonMember\|getCurrentSalonId" src/server/actions/*.ts`

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Unit tests | `pnpm test` | all pass |
| Integration tests | `pnpm db:up && pnpm db:push && pnpm test:integration` | all pass |
| Call-site census | `grep -n "requireSalonMember\|getCurrentSalonId" src/server/actions/*.ts` | see Step 3 |

## Scope

**In scope** (the only files you should modify/create):
- `src/lib/salon-context.ts` (tighten `role` type; add the wrappers)
- `src/server/actions/barbers.ts`
- `src/server/actions/services.ts`
- `src/server/actions/schedule.ts`
- `src/server/actions/schedule-overrides.ts`
- `src/server/actions/appointments.ts`
- `src/server/actions/salons.ts` (shape only: `ok` → `success`)
- `src/app/onboarding/_components/onboarding-form.tsx` (follow the shape change)
- `src/test/integration/roles.itest.ts` (create)

**Out of scope** (do NOT touch, even though they look related):
- `src/app/(dashboard)/dashboard/layout.tsx` — must keep catching the typed
  errors for its redirect branching.
- `src/server/actions/bookings.ts` and `dev-auth.ts` — public/dev actions, not
  membership-gated.
- `src/server/queries/**` — plan 005/010 territory (and `queries/services.ts`
  `"use server"` removal belongs to the backlog item F12, not here).
- Building any invite/role-management UI — this plan only enforces; there is
  deliberately no way to create staff members yet.

## Git workflow

- Branch: `advisor/008-withsalon-roles`
- Conventional commits, e.g. `refactor(actions): withSalonMember/withSalonRole wrappers`,
  `feat(authz): enforce owner/admin on privileged mutations`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Tighten the role type and add the wrappers

In `src/lib/salon-context.ts`:

1. Import the enum-derived type: `import type { SalonMember } from
   "@/drizzle/schema";` and define `export type MemberRole =
   SalonMember["role"];`
2. Change `requireSalonMember`'s return type to
   `Promise<{ salonId: number; role: MemberRole }>` (the query already returns
   the enum type; the `?? "staff"` fallback stays valid).
3. Append:

```ts
export interface SalonActionContext {
  salonId: number;
  role: MemberRole;
}

export interface ActionFailure {
  success: false;
  error: string;
}

/**
 * Wrap a salon-scoped server action: resolves membership once and converts
 * auth failures into the repo's expected-error return shape instead of a
 * thrown error reaching the client.
 */
export function withSalonMember<Args extends unknown[], Result>(
  handler: (ctx: SalonActionContext, ...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result | ActionFailure> {
  return async (...args: Args) => {
    let ctx: SalonActionContext;
    try {
      ctx = await requireSalonMember();
    } catch {
      return { success: false, error: "Unauthorized access." };
    }
    return handler(ctx, ...args);
  };
}

/**
 * Like withSalonMember, but additionally requires one of the given roles.
 * Use for privileged mutations (team, services, schedules).
 */
export function withSalonRole<Args extends unknown[], Result>(
  roles: readonly MemberRole[],
  handler: (ctx: SalonActionContext, ...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result | ActionFailure> {
  return withSalonMember(async (ctx, ...args) => {
    if (!roles.includes(ctx.role)) {
      return {
        success: false,
        error: "You don't have permission to do that.",
      } satisfies ActionFailure as Result | ActionFailure;
    }
    return handler(ctx, ...args);
  }) as (...args: Args) => Promise<Result | ActionFailure>;
}
```

If the `satisfies ... as` dance trips the compiler, simplify: have
`withSalonRole` duplicate `withSalonMember`'s body with the extra role check —
duplication of 8 lines beats an unsound cast. Report which variant you used.

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Decide the role policy (fixed table — do not re-litigate)

| Action group | Actions (by current name) | Required |
|---|---|---|
| Team mutations | `deleteBarberWithResponse`, `addBarber`, update-barber action in `barbers.ts` | `["owner", "admin"]` |
| Service mutations | create/update/price actions in `services.ts` | `["owner", "admin"]` |
| Schedule mutations | working-hours + override create/update/delete in `schedule.ts` / `schedule-overrides.ts` | `["owner", "admin"]` |
| Appointment operations | `updateAppointmentStatus` | any member (`withSalonMember`) |
| Reads | `getAppointments`, `getBarbers`, `getAllEmployees`, `getBarberSchedule`, `getWeeklySchedule`, service reads | any member (`withSalonMember`) |

### Step 3: Migrate the call sites

For **every** hit from the census grep (excluding `dashboard/layout.tsx` and
`src/lib/salon-context.ts` itself):

- Mutations: replace the preamble + `salonId` usage with
  `export const X = withSalonRole(["owner", "admin"], async ({ salonId }, ...originalParams) => { ...original body... });`
  Keep each action's **name, parameters, and success/error return shape
  identical** — client components call these.
- `updateAppointmentStatus` and all reads: same but `withSalonMember(...)`.
  For reads that currently swallow to `[]` (e.g. `getBarbers`), keep returning
  `[]` on *query* failure but let the wrapper produce the auth failure — check
  each read's client consumer: if it does `data?.map(...)` directly, the new
  `ActionFailure` union will break it. In that case have the handler keep the
  old contract (`[]` on any failure) by catching the wrapper differently —
  simplest compatible form: leave reads on `getCurrentSalonId()` **unchanged**
  and note it. Migrating reads is optional polish; migrating mutations is the
  point. Prefer: mutations = wrapper (mandatory), reads = leave as-is unless
  trivially safe.
- One `"use server"` constraint to respect: files with `"use server"` must
  only export async functions. `withSalonRole(...)` returns an async function,
  which satisfies Next — but if the build errors with "Server actions must be
  async functions", fall back to keeping `export async function X(...)` and
  calling a non-exported wrapped implementation inside. Report if you hit
  this.

Also in this step:
- `barbers.ts:87`: change `return { errors: ... }` → `return { success: false,
  errors: ... }` (matching `:139`); check its client consumer (the team
  dialog) tolerates the added key — it will, keys are additive.

**Verify**: `pnpm typecheck && pnpm lint` → exit 0;
`grep -c "Unauthorized access." src/server/actions/*.ts` drops to ~1 occurrence
(inside no action file — the string now lives in `salon-context.ts`).

### Step 4: Unify `createSalon`'s shape

In `src/server/actions/salons.ts`: change the return type and value from
`{ ok: false; error: string }` to `{ success: false; error: string }`. Then in
`src/app/onboarding/_components/onboarding-form.tsx`, update every `.ok`
read accordingly (grep `\.ok` in that file). Do **not** wrap `createSalon` in
`withSalonMember` — it runs for users who have no membership yet.

**Verify**: `grep -rn "ok: false" src/server/actions src/app/onboarding` → no
matches; `pnpm typecheck` → exit 0.

### Step 5: Role-enforcement integration tests

Create `src/test/integration/roles.itest.ts` (harness from plan 001):

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const getSessionMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  getSession: (...args: unknown[]) => getSessionMock(...args),
}));

import { db } from "@/drizzle";
import { barbers, salonMembers, user } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { deleteBarberWithResponse } from "@/server/actions/barbers";
import { createTestBarber, createTestSalon } from "./factories";

async function signInAs(userId: string, salonId: number, role: "owner" | "staff") {
  await db.insert(user).values({
    id: userId,
    name: userId,
    email: `${userId}@test.local`,
    emailVerified: true,
  });
  await db.insert(salonMembers).values({ salonId, userId, role });
  getSessionMock.mockResolvedValue({ user: { id: userId } });
}
```

Cases:
1. **Staff cannot delete a barber**: salon + barber + `signInAs("staff-1",
   salon.id, "staff")` → `deleteBarberWithResponse(formData with the barber
   id)` → `{ success: false }` with the permission error; barber row still
   exists.
2. **Owner can**: same setup with role `"owner"` → `{ success: true }`; barber
   row gone.
3. **No session**: `getSessionMock.mockResolvedValue(null)` → failure with
   "Unauthorized access."; barber untouched.
4. **Cross-tenant stays blocked**: owner of salon A deleting salon B's barber
   → `{ success: false }` (the existing salonId scoping must survive the
   refactor — this is the regression test for it).

(Build the `FormData` with `formData.set("id", String(barber.id))`.)

**Verify**: `pnpm test:integration` → all pass.

## Test plan

- Integration: the four cases above.
- Existing unit tests must stay green (`membership.test.ts` covers
  `pickActiveSalonId`; unchanged).
- Verification: `pnpm test && pnpm test:integration`.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm test:integration` exits 0 including the 4 role cases
- [ ] Every mutation in the Step 2 table goes through `withSalonRole(["owner", "admin"], ...)` (spot-check by grep per file)
- [ ] `grep -rn "ok: false" src/server/actions src/app/onboarding` returns nothing
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Next's build rejects wrapper-produced exports in `"use server"` files and
  the Step 3 fallback (inner wrapped implementation) also fails.
- Any client component turns out to depend on an action *throwing* (rather
  than returning a failure object) — changing that behavior needs an operator
  decision.
- The census grep reveals membership checks in files outside the in-scope
  list.
- `vi.mock("@/lib/auth")` doesn't intercept the session (actions still hit
  BetterAuth) — report; do not try to forge real session cookies.

## Maintenance notes

- The day staff invites ship, the Step 2 policy table is the contract to
  extend — and `withSalonRole` is the only place enforcement lives. Add an
  `admin`-specific tier then if needed.
- New salon-scoped actions must use the wrappers; reviewers should reject raw
  `requireSalonMember()` preambles in new code.
- Deferred consciously: migrating the read actions' `[]`-on-failure contract,
  and a full `ActionResult<T>` generic across all actions (do it when a second
  consumer needs it).
