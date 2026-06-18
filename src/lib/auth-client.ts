import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";
import { env } from "@/env";

/**
 * Client-side BetterAuth instance for use in client components.
 * `baseURL` matches the server origin so requests hit `/api/auth/*`.
 */
export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  plugins: [magicLinkClient()],
});

export const { signIn, signOut, useSession } = authClient;
