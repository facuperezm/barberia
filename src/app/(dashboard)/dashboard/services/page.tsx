import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Scissors } from "lucide-react";
import { DashboardHeader } from "@/app/(dashboard)/dashboard/_components/dashboard-header";
import { DashboardShell } from "@/app/(dashboard)/dashboard/_components/dashboard-shell";
import { getServices } from "@/server/queries/services";
import ClientDialogServices from "./_components/client-dialog-services";

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Services"
        description="Manage your service offerings and prices"
      />
      <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Scissors className="size-5" />
                  {service.name}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4" />
                  {service.duration} minutes
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">${service.price}</span>
                  <ClientDialogServices service={service} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {service.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
