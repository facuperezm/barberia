import { DashboardNav } from "@/app/(dashboard)/dashboard/_components/nav";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RedirectToSignIn } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Scissors } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { env } from "@/env";
import LayoutLoading from "./_components/layout-loading";
import { Separator } from "@/components/ui/separator";
import { SignOutButton } from "./_components/sign-out-button";

const AUTHORIZED_EMAIL = env.OWNER_EMAIL;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const { userId, redirectToSignIn } = await auth();

  if (!user || user.emailAddresses[0]?.emailAddress !== AUTHORIZED_EMAIL) {
    return <RedirectToSignIn />;
  }

  if (userId == null) return redirectToSignIn();

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/dashboard">
            <div className="flex items-center gap-2 font-semibold">
              <Scissors className="size-6" />
              <span>Panel de administrador</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/">
              <span className="text-sm text-muted-foreground hover:underline">
                Volver a la página principal
              </span>
            </Link>
            <Separator orientation="vertical" className="h-4" />
            <SignOutButton />
          </div>
        </div>
      </div>
      <div className="flex-1 items-start md:grid md:grid-cols-[220px_1fr]">
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 overflow-y-auto border-r md:sticky md:block">
          <ScrollArea className="py-6 pr-6 lg:py-8">
            <DashboardNav />
          </ScrollArea>
        </aside>
        <main className="flex w-full flex-col overflow-hidden">
          <Suspense fallback={<LayoutLoading />}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}
