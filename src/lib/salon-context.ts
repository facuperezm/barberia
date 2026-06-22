import "server-only";
import { db } from "@/drizzle";
import { salonMembers } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { pickActiveSalonId } from "@/lib/membership";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export class NoMembershipError extends Error {
  constructor() {
    super("No salon membership");
    this.name = "NoMembershipError";
  }
}

/**
 * Resolve the salon the current session acts on, via salon_members.
 * Throws when there is no session or no membership — doubles as an auth gate.
 */
export async function getCurrentSalonId(): Promise<number> {
  const { salonId } = await requireSalonMember();
  return salonId;
}

export async function requireSalonMember(): Promise<{
  salonId: number;
  role: string;
}> {
  const result = await getSession();
  const userId = result?.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }

  const memberships = await db
    .select({ salonId: salonMembers.salonId, role: salonMembers.role })
    .from(salonMembers)
    .where(eq(salonMembers.userId, userId));

  const salonId = pickActiveSalonId(memberships);
  if (salonId === null) {
    throw new NoMembershipError();
  }

  const role = memberships.find((m) => m.salonId === salonId)?.role ?? "staff";
  return { salonId, role };
}
