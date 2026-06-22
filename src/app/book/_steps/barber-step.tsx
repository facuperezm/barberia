"use client";

import { useBooking } from "@/app/book/_components/booking-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicBarbers } from "@/server/actions/barbers";
import { type Barber } from "@/drizzle/schema";

export function BarberStep() {
  const { state, setState, salonId } = useBooking();

  const { data: barbers, isLoading } = useQuery<Barber[]>({
    queryKey: ["barbers", "book", salonId],
    queryFn: () => getPublicBarbers(salonId),
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
          barbers?.map((barber: Barber) => {
            const isSelected = state.barberId === barber.id.toString();
            const select = () => setState({ barberId: barber.id.toString() });

            return (
              <Card
                key={barber.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onClick={select}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    select();
                  }
                }}
                className={cn(
                  "cursor-pointer transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out-strong",
                  "hover:border-primary/50 hover:bg-secondary/60 active:scale-[0.99]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isSelected && "border-primary bg-primary/5 ring-2 ring-primary/40",
                )}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="size-16">
                    <AvatarImage src={barber.imageUrl ?? ""} alt={barber.name} />
                    <AvatarFallback>{barber.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold">{barber.name}</h3>
                  </div>
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground transition-[transform,opacity] duration-200 ease-out-strong",
                      isSelected ? "scale-100 opacity-100" : "scale-90 opacity-0",
                    )}
                    aria-hidden
                  >
                    <Check className="size-4" />
                  </span>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
