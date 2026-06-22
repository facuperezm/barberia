"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/drizzle";
import { salons, salonMembers } from "@/drizzle/schema";
import { getSession } from "@/lib/auth";
import { nextAvailableSlug } from "@/lib/slug";

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

const schema = z.object({
  name: z.string().trim().min(2, "Business name must be at least 2 characters").max(80),
  slug: z.string().trim().min(1, "URL slug is required").max(80),
});

export async function createSalon(
  formData: FormData,
): Promise<{ ok: false; error: string }> {
  const session = await getSession();
  const user = session?.user;
  if (!user) redirect("/sign-in");

  // Idempotent: one salon per user for now. Already a member → dashboard.
  const existing = await db
    .select({ id: salonMembers.id })
    .from(salonMembers)
    .where(eq(salonMembers.userId, user.id));
  if (existing.length > 0) redirect("/dashboard");

  const parsed = schema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const takenRows = await db.select({ slug: salons.slug }).from(salons);
  const slug = nextAvailableSlug(
    parsed.data.slug,
    takenRows.map((r) => r.slug),
  );

  try {
    await db.transaction(async (tx) => {
      const [salon] = await tx
        .insert(salons)
        .values({
          name: parsed.data.name,
          slug,
          ownerName: user.name ?? (user.email as string).split("@")[0]!,
          email: user.email as string,
          timezone: "UTC",
        })
        .returning({ id: salons.id });
      await tx.insert(salonMembers).values({
        salonId: salon!.id,
        userId: user.id,
        role: "owner",
      });
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    // unique violation: a salon already exists for this user/slug — already onboarded
  }

  redirect("/dashboard");
}
