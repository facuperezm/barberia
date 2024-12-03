"use client";

import { useBooking } from "@/app/book/_components/booking-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { getBarbers as getBarbersServer } from "@/server/actions/barbers";
import { type Barber } from "@/lib/types";

async function getBarbers(): Promise<Barber[]> {
  const barbers = await getBarbersServer();
  return barbers;
}

export function BarberStep() {
  const { state, setState } = useBooking();

  const { data: barbers, isLoading } = useQuery<Barber[]>({
    queryKey: ["barbers", "book"],
    queryFn: getBarbers,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

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
                  <AvatarImage src={barber.imageUrl ?? ""} alt={barber.name} />
                  <AvatarFallback>{barber.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{barber.name}</h3>
                  {/* <p className="text-sm text-muted-foreground">
                    {barber.email}
                  </p> */}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
