"use client";

import { useBooking } from "@/app/book/_components/booking-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// Mock data - replace with API call
const barbers = [
  {
    id: "1",
    name: "John Doe",
    image:
      "https://images.unsplash.com/photo-1618077360395-f3068be8e001?w=400&h=400&auto=format&fit=crop",
    specialty: "Classic Cuts",
  },
  {
    id: "2",
    name: "Jane Smith",
    image:
      "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=400&auto=format&fit=crop",
    specialty: "Modern Styles",
  },
];

export function BarberStep() {
  const { state, setState } = useBooking();

  return (
    <div className="grid gap-6">
      <div className="grid gap-4">
        {barbers.map((barber) => (
          <Card
            key={barber.id}
            className={cn(
              "cursor-pointer transition-colors hover:bg-accent",
              state.barberId === barber.id && "border-primary",
            )}
            onClick={() => setState({ barberId: barber.id })}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={barber.image} alt={barber.name} />
                <AvatarFallback>{barber.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{barber.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {barber.specialty}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
