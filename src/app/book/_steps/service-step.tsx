"use client";

import { useBooking } from "@/app/book/_components/booking-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { type Service } from "@/drizzle/schema";
import { getServices as getServicesServer } from "@/server/queries/services";

async function getServices(): Promise<Service[]> {
  const services = await getServicesServer();
  return services;
}

export function ServiceStep() {
  const { state, setState } = useBooking();

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: getServices,
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
      {services?.map((service) => (
        <Card
          key={service.id}
          className={cn(
            "cursor-pointer transition-colors hover:bg-accent",
            state.serviceId === service.id.toString() && "border-primary",
          )}
          onClick={() =>
            setState({
              serviceId: service.id.toString(),
            })
          }
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Scissors className="size-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
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
      ))}
    </div>
  );
}
