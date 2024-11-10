"use client";

import { useBooking } from "@/app/book/_components/booking-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

// Mock data - replace with API call
// const barbers = [
//   {
//     id: "1",
//     name: "John Doe",
//     image:
//       "https://images.unsplash.com/photo-1618077360395-f3068be8e001?w=400&h=400&auto=format&fit=crop",
//     specialty: "Classic Cuts",
//   },
//   {
//     id: "2",
//     name: "Jane Smith",
//     image:
//       "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=400&auto=format&fit=crop",
//     specialty: "Modern Styles",
//   },
// ];
type Barber = {
  id: number;
  name: string;
  email: string;
  phone: string;
  imageUrl: string;
};

async function getBarbers(): Promise<Barber[]> {
  const barbers = await fetch("/api/barber").then((res) => res.json());
  return barbers;
}

export function BarberStep() {
  const { data: barbers, isLoading } = useQuery<Barber[]>({
    queryKey: ["barbers", "book"],
    queryFn: getBarbers,
  });

  const { state, setState } = useBooking();

  return (
    <div className="grid gap-6">
      <div className="grid gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : (
          barbers?.map((barber: Barber) => (
            <Card
              key={barber.id}
              className={cn(
                "cursor-pointer transition-colors hover:bg-accent",
                state.barberId === barber.id.toString() && "border-primary",
              )}
              onClick={() => setState({ barberId: barber.id.toString() })}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <Avatar className="size-16">
                  <AvatarImage src={barber.imageUrl} alt={barber.name} />
                  <AvatarFallback>{barber.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{barber.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {/* {barber.email} */}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
