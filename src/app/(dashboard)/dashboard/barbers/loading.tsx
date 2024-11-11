import { Skeleton } from "@/components/ui/skeleton";
import { DashboardShell } from "../_components/shell";
import { DashboardHeader } from "../_components/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import ClientDialog from "./_components/client-dialog";

export default function Loading() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Barbers" description="Manage your barber team">
        <ClientDialog />
      </DashboardHeader>
      <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-center space-x-4 overflow-hidden">
                <Skeleton className="size-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
