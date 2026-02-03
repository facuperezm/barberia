import { DashboardHeader } from "@/app/(dashboard)/dashboard/_components/dashboard-header";
import { DashboardShell } from "@/app/(dashboard)/dashboard/_components/dashboard-shell";
import { getBarbers } from "@/server/actions/barbers";
import { TeamManagement } from "./_components/team-management";

export default async function TeamPage() {
  const barbers = await getBarbers();

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Team Management"
        description="Manage your team members, their schedules, and availability"
      />
      <div className="px-4 pb-8">
        <TeamManagement initialBarbers={barbers} />
      </div>
    </DashboardShell>
  );
}
