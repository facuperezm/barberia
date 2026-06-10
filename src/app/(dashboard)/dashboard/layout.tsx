import { RedirectToSignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import { isOwner } from "@/lib/auth";
import LayoutLoading from "./_components/layout-loading";
import { SidebarProvider } from "@/components/ui/sidebar";
import HeaderNav from "./_components/nav-menu";
import { AppSidebar } from "./_components/app-sidebar";
import { cookies } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isOwner())) {
    return <RedirectToSignIn />;
  }

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
