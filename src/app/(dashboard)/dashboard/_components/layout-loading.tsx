import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHeader } from "./dashboard-header";
import { DashboardShell } from "./dashboard-shell";

export default function LayoutLoading() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Loading..." description="..." />
      <div className="space-y-4 p-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              <Skeleton className="h-5 w-full" />
            </CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
