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
import {
  DEV_TEST_EMAIL,
  isDevAuthEnabled,
  captureDevMagicToken,
} from "@/lib/dev-auth";

/**
 * BetterAuth server instance. Passwordless magic-link only — sign-in links are
 * delivered through the existing Resend setup.
 *
 * Authorization is membership-based: a session only grants access to salons the
 * user belongs to (see `requireSalonMember` in `@/lib/salon-context`).
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
      sendMagicLink: async ({ email, url, token }) => {
        if (isDevAuthEnabled && email === DEV_TEST_EMAIL) {
          captureDevMagicToken(token);
          return; // never email the local test account
        }
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
