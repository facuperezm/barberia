import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardShell } from "./_components/shell";
import { RecentBookings } from "@/app/book/_components/recent-bookings";
import { Calendar, Clock, Scissors, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHeader } from "./_components/header";

export default function DashboardLoading() {
  return (
    <DashboardShell>
      <div className="flex items-center justify-between px-6 pb-2 pt-8">
        <div className="grid gap-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Bookings
              </CardTitle>
              <Calendar className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-5 w-full" />
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Active Bookings
              </CardTitle>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-5 w-full" />
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Services</CardTitle>
              <Scissors className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-5 w-full" />
              <p className="text-xs text-muted-foreground">Available</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Avg. Duration
              </CardTitle>
              <Clock className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-5 w-full" />
              <p className="text-xs text-muted-foreground">Per appointment</p>
            </CardContent>
          </Card>
        </div>
        <RecentBookings />
      </div>
    </DashboardShell>
  );
}
