import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { salonMembers } from "@/drizzle/schema";
import { getSession } from "@/lib/auth";
import { OnboardingForm } from "./_components/onboarding-form";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  const memberships = await db
    .select({ id: salonMembers.id })
    .from(salonMembers)
    .where(eq(salonMembers.userId, session.user.id));
  if (memberships.length > 0) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <OnboardingForm />
    </div>
  );
}
