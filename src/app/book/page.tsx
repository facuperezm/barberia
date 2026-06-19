import { redirect } from "next/navigation";
import { db } from "@/drizzle";
import { salons } from "@/drizzle/schema";
import { eq, asc } from "drizzle-orm";

export default async function BookPage() {
  const [firstSalon] = await db
    .select({ slug: salons.slug })
    .from(salons)
    .where(eq(salons.isActive, true))
    .orderBy(asc(salons.id))
    .limit(1);

  if (!firstSalon) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No salon configured yet.</p>
      </div>
    );
  }

  redirect(`/${firstSalon.slug}/book`);
}
