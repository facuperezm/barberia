"use client";

import { useBooking } from "@/app/book/_components/booking-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
}

const fetchServices = async () => {
  const response = await fetch("/api/services");
  return response.json();
};

export function ServiceStep() {
  const { state, setState } = useBooking();

  const {
    data: services = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["services"],
    queryFn: fetchServices,
    staleTime: 5 * 60 * 1000, // 5 minutes
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

  if (isError) {
    return (
      <p className="text-center text-red-500">
        An error occurred while loading services.
      </p>
    );
  }
  return (
    <div className="grid gap-4">
      {services.map((service) => (
        <Card
          key={service.id}
          className={cn(
            "cursor-pointer transition-colors hover:bg-accent",
            state.serviceId === service.id && "border-primary",
          )}
          onClick={() =>
            setState({
              serviceId: service.id,
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
                  <span className="font-semibold">${service.price}</span>
                  <p className="text-sm text-muted-foreground">
                    {service.duration} min
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
