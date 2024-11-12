import { DashboardHeader } from "@/app/(dashboard)/dashboard/_components/dashboard-header";
import { DashboardShell } from "@/app/(dashboard)/dashboard/_components/dashboard-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScheduleLoading() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Schedule"
        description="Manage appointments and view your schedule"
      />
      <div className="p-4">
        <Skeleton className="h-[500px] w-full" />
      </div>
    </DashboardShell>
  );
}
