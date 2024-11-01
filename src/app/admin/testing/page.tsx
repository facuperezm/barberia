"use client";

import { CalendarView } from "@/app/admin/testing/_components/calendar-view";
import { DashboardHeader } from "@/app/admin/testing/_components/header";
import { DashboardShell } from "@/app/admin/testing/_components/shell";

export default function Page() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Schedule"
        description="Manage appointments and view your schedule"
      />
      <div className="p-4">
        <CalendarView />
      </div>
    </DashboardShell>
  );
}
