import { EmployeeSchedule } from "./_components/employee-schedule";
import { DashboardShell } from "../_components/dashboard-shell";
import { DashboardHeader } from "../_components/dashboard-header";
import { ManageScheduleDialog } from "./_components/manage-schedule";

export default function SchedulePage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Schedule"
        description="Manage appointments and working hours"
      >
        <ManageScheduleDialog />
      </DashboardHeader>
      <div className="p-6">
        <EmployeeSchedule />
      </div>
    </DashboardShell>
  );
}
