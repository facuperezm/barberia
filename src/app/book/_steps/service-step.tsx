"use client";

import { useBooking } from "@/app/book/_components/booking-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { type Service } from "@/drizzle/schema";
import { getPublicServices } from "@/server/queries/services";

export function ServiceStep() {
  const { state, setState, salonId } = useBooking();

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["services", "book", salonId],
    queryFn: () => getPublicServices(salonId),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {[...Array(3)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Scissors className="size-6 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-muted"></div>
                <div className="h-3 w-1/2 rounded bg-muted"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {services?.map((service) => {
        const isSelected = state.serviceId === service.id.toString();
        const select = () => setState({ serviceId: service.id.toString() });

        return (
          <Card
            key={service.id}
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
              <div
                className={cn(
                  "flex size-12 items-center justify-center rounded-full transition-colors duration-200 ease-out-strong",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                )}
              >
                <Scissors className="size-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold">{service.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {service.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">${(service.priceCents / 100).toFixed(2)}</span>
                    <p className="text-sm text-muted-foreground">
                      {service.durationMinutes} min
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
