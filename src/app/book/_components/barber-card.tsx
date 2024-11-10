import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useBooking } from "./booking-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Barber = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  imageUrl: string | null;
  createdAt: Date;
};

export default function BarberCard({ barber }: { barber: Barber }) {
  const { state, setState } = useBooking();

  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors hover:bg-accent",
        state.barberId === barber.id.toString() && "border-primary",
      )}
      onClick={() => setState({ barberId: barber.id.toString() })}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <Avatar className="size-16">
          <AvatarImage src={barber.imageUrl ?? ""} alt={barber.name} />
          <AvatarFallback>{barber.name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold">{barber.name}</h3>
          {/* <p className="text-sm text-muted-foreground">{barber.specialty}</p> */}
        </div>
      </CardContent>
    </Card>
  );
}
