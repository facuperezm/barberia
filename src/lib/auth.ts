import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { env } from "@/env";

/**
 * The app is single-tenant in Phase 0: exactly one owner, identified by
 * OWNER_EMAIL, may access dashboard data. Replace with salon memberships
 * in Phase 1.
 */
export async function isOwner(): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;

  const ownerEmail = env.OWNER_EMAIL.toLowerCase();
  return user.emailAddresses.some(
    (address) =>
      address.emailAddress.toLowerCase() === ownerEmail &&
      address.verification?.status === "verified",
  );
}

export async function requireOwner(): Promise<void> {
  if (!(await isOwner())) {
    throw new Error("Unauthorized");
  }
}
