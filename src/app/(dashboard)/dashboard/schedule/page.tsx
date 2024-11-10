"use client";

import { DashboardHeader } from "@/app/(dashboard)/dashboard/_components/header";
import { DashboardShell } from "@/app/(dashboard)/dashboard/_components/shell";
import { EmployeeSchedule } from "./_components/employee-schedule";

export default function SchedulePage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Schedule"
        description="Manage appointments and view your schedule"
      />
      <div className="p-4">
        <EmployeeSchedule />
      </div>
    </DashboardShell>
  );
}
