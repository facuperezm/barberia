"use client";

import { useBooking } from "@/app/book/_components/booking-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data - replace with API call
const services = [
  {
    id: "1",
    name: "Classic Haircut",
    duration: 30,
    price: 30,
    description: "Traditional haircut with styling",
  },
  {
    id: "2",
    name: "Beard Trim",
    duration: 20,
    price: 20,
    description: "Professional beard grooming",
  },
  {
    id: "3",
    name: "Full Service",
    duration: 60,
    price: 50,
    description: "Haircut, beard trim, and styling",
  },
];

export function ServiceStep() {
  const { state, setState } = useBooking();

  return (
    <div className="grid gap-4">
      {services.map((service) => (
        <Card
          key={service.id}
          className={cn(
            "cursor-pointer transition-colors hover:bg-accent",
            state.serviceId === service.id && "border-primary",
          )}
          onClick={() => setState({ serviceId: service.id })}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Scissors className="size-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{service.name}</h3>
                <div className="text-right">
                  <span className="font-semibold">${service.price}</span>
                  <p className="text-sm text-muted-foreground">
                    {service.duration} min
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {service.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
