import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins/magic-link";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { db } from "@/drizzle";
import { user, session, account, verification } from "@/drizzle/schema";
import { env } from "@/env";
import { sendMagicLinkEmail } from "@/lib/email";
import { isOwnerEmail } from "@/lib/owner";

/**
 * BetterAuth server instance. Passwordless magic-link only — sign-in links are
 * delivered through the existing Resend setup.
 *
 * Authorization is still single-owner (Phase 0): authentication lets anyone with
 * inbox access establish a session, but only `OWNER_EMAIL` may reach the
 * dashboard or mutate data. See `isOwner()` / `requireOwner()` below. Org-based
 * memberships replace this in the multi-tenant phase.
 */
export const auth = betterAuth({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail({ email, url });
      },
    }),
    // nextCookies must be the LAST plugin so cookies set during sign-in are
    // persisted from server actions / route handlers.
    nextCookies(),
  ],
});

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * True only when the current session belongs to the configured salon owner.
 * This is the authoritative authorization gate for the dashboard.
 */
export async function isOwner(): Promise<boolean> {
  const result = await getSession();
  return isOwnerEmail(result?.user?.email, env.OWNER_EMAIL);
}

export async function requireOwner(): Promise<void> {
  if (!(await isOwner())) {
    throw new Error("Unauthorized");
  }
}
