import { DashboardHeader } from "@/app/(dashboard)/dashboard/_components/dashboard-header";
import { DashboardShell } from "@/app/(dashboard)/dashboard/_components/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2 } from "lucide-react";
import { getBarbers } from "@/server/actions/barbers";
import ClientDialog from "./_components/client-dialog";
import { type Barber } from "@/lib/types";
import { deleteBarber } from "@/server/actions/barbers";
import { EmployeeList } from "./_components/employee-list";

export default async function BarbersPage() {
  const barbers = await getBarbers();

  return (
    <DashboardShell>
      <DashboardHeader heading="Barbers" description="Manage your barber team">
        <ClientDialog />
      </DashboardHeader>
      <div className="px-6">
        <EmployeeList />
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
        {barbers?.map((barber: Barber) => (
          <Card key={barber.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4 overflow-hidden">
                  <Avatar className="size-12">
                    <AvatarImage src={barber.imageUrl!} alt={barber.name} />
                    <AvatarFallback>{barber.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="truncate">
                    <CardTitle className="truncate">{barber.name}</CardTitle>
                    <CardDescription className="truncate">
                      {barber.email}
                    </CardDescription>
                  </div>
                </div>
                <form action={deleteBarber}>
                  <input type="hidden" name="id" value={barber.id} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    type="submit"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </form>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Phone: {barber.phone}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
