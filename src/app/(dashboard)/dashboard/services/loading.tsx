import { Skeleton } from "@/components/ui/skeleton";
import { DashboardShell } from "../_components/dashboard-shell";
import { DashboardHeader } from "../_components/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Loading() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Services"
        description="Manage your service offerings and prices"
      />
      <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Skeleton className="h-5 w-20" />
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="mb-2 flex items-center justify-between">
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-5 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
