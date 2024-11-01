"use client";

import { DashboardHeader } from "@/app/admin/testing/_components/header";
import { DashboardShell } from "@/app/admin/testing/_components/shell";
import { CalendarView } from "../_components/calendar-view";

export default function SchedulePage() {
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
