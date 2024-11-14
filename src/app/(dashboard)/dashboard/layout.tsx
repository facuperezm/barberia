import { RedirectToSignIn } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Suspense } from "react";
import { env } from "@/env";
import LayoutLoading from "./_components/layout-loading";
import { SidebarProvider } from "@/components/ui/sidebar";
import HeaderNav from "./_components/nav-menu";
import { AppSidebar } from "./_components/app-sidebar";
import { cookies } from "next/headers";

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

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true";
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <main className="flex w-full flex-col">
        <HeaderNav />
        <Suspense fallback={<LayoutLoading />}>{children}</Suspense>
      </main>
    </SidebarProvider>
  );
}
