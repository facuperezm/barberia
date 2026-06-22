"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  DEV_TEST_EMAIL,
  isDevAuthEnabled,
  takeDevMagicToken,
} from "@/lib/dev-auth";

export async function devSignInAsTestOwner(): Promise<void> {
  if (!isDevAuthEnabled) throw new Error("Dev sign-in is disabled");

  const requestHeaders = await headers();
  // Issues a magic-link token; our sendMagicLink captures it instead of emailing.
  await auth.api.signInMagicLink({
    body: { email: DEV_TEST_EMAIL },
    headers: requestHeaders,
  });
  const token = takeDevMagicToken();
  if (!token) throw new Error("Dev magic-link token was not captured");

  // Verifying establishes the session cookie (persisted by the nextCookies plugin).
  await auth.api.magicLinkVerify({
    query: { token },
    headers: requestHeaders,
  });

  redirect("/dashboard");
}
