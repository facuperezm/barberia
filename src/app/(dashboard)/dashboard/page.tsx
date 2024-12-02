import { DashboardHeader } from "@/app/(dashboard)/dashboard/_components/dashboard-header";
import { DashboardShell } from "@/app/(dashboard)/dashboard/_components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Scissors, Users } from "lucide-react";
import { RecentBookings } from "@/app/book/_components/recent-bookings";
import { getAppointments } from "@/server/queries/appointments";
import { getServices } from "@/server/queries/services";
import { CardSkeleton } from "./_components/skeleton";
import { unstable_cache } from "next/cache";

const cachedAppointments = unstable_cache(
  async () => await getAppointments(),
  ["appointments"],
  {
    revalidate: 3600,
    tags: ["appointments"],
  },
);
const cachedServices = unstable_cache(
  async () => await getServices(),
  ["services"],
  {
    revalidate: 3600,
    tags: ["services"],
  },
);

export default async function DashboardPage() {
  const appointments = await cachedAppointments();
  const services = await cachedServices();

  if (!appointments || !services) {
    return <CardSkeleton />;
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Dashboard"
        description="Overview of your barbershop"
      />
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
              <div className="text-2xl font-bold">{appointments.length}</div>
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
              <div className="text-2xl font-bold">
                {
                  appointments.filter((booking) => booking.status === "pending")
                    .length
                }
              </div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Services</CardTitle>
              <Scissors className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{services.length}</div>
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
              <div className="text-2xl font-bold">
                {Math.round(
                  services.reduce((acc, service) => acc + service.duration, 0) /
                    services.length,
                )}
              </div>
              <p className="text-xs text-muted-foreground">Per appointment</p>
            </CardContent>
          </Card>
        </div>
        <RecentBookings />
      </div>
    </DashboardShell>
  );
}
