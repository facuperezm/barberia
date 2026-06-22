import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireSalonMember, NoMembershipError } from "@/lib/salon-context";
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
  let destination: string | null = null;
  try {
    await requireSalonMember();
  } catch (err) {
    destination = err instanceof NoMembershipError ? "/onboarding" : "/sign-in";
  }
  if (destination) redirect(destination);

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
