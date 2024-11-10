import { DashboardHeader } from "@/app/(dashboard)/dashboard/_components/header";
import { DashboardShell } from "@/app/(dashboard)/dashboard/_components/shell";
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
import {
  getBarbers,
  deleteBarber as deleteBarberAction,
} from "@/lib/actions/actions";
import { notFound } from "next/navigation";
import ClientDialog from "./_components/client-dialog";
import { revalidatePath } from "next/cache";
import { type Barber } from "@/lib/types";

export default async function BarbersPage() {
  const barbers = await getBarbers();

  // Server Action to handle deleting a barber
  async function deleteBarber(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;

    try {
      await deleteBarberAction(parseInt(id));
      revalidatePath("/dashboard/barbers");
    } catch (error) {
      console.error("Error deleting barber:", error);
      throw new Error("Failed to delete barber.");
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Barbers" description="Manage your barber team">
        <ClientDialog />
      </DashboardHeader>
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
