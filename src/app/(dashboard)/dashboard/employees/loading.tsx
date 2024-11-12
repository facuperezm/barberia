"use client";

import { useState } from "react";
import { DashboardHeader } from "@/app/(dashboard)/dashboard/_components/dashboard-header";
import { DashboardShell } from "@/app/(dashboard)/dashboard/_components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddEmployeeDialog } from "@/app/(dashboard)/dashboard/employees/_components/add-employee";
import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeesLoading() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Employee Management"
        description="Manage your team and their schedules"
      >
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 size-4" />
          Add Employee
        </Button>
      </DashboardHeader>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <Skeleton className="h-[500px] w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>

      <AddEmployeeDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </DashboardShell>
  );
}
