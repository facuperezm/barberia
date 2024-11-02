"use client";

import { DashboardHeader } from "@/app/(dashboard)/dashboard/_components/header";
import { DashboardShell } from "@/app/(dashboard)/dashboard/_components/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Scissors, Users } from "lucide-react";
import { RecentBookings } from "@/app/book/_components/recent-bookings";

// Mock data - replace with API calls
const stats = [
  {
    title: "Total Bookings",
    value: "156",
    description: "Last 30 days",
    icon: Calendar,
  },
  {
    title: "Active Barbers",
    value: "8",
    description: "Currently employed",
    icon: Users,
  },
  {
    title: "Services",
    value: "3",
    description: "Available services",
    icon: Scissors,
  },
  {
    title: "Avg. Duration",
    value: "45m",
    description: "Per appointment",
    icon: Clock,
  },
];

export default function DashboardPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Dashboard"
        description="Overview of your barbershop"
      />
      <div className="space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <RecentBookings />
      </div>
    </DashboardShell>
  );
}
