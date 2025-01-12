"use client";

import { useBooking } from "@/app/book/_components/booking-provider";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

interface TimeSlot {
  time: string;
  available: boolean;
}

const fetchAvailableSlots = async (
  barberId: number,
  formattedDate: string,
  serviceId: number,
): Promise<TimeSlot[]> => {
  const response = await fetch(
    `/api/availability?date=${formattedDate}&barberId=${barberId}&serviceId=${serviceId}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch availability");
  }

  return response.json();
};

export function DateTimeStep() {
  const { state, setState } = useBooking();

  const formattedDate = useMemo(() => {
    return state.date ? format(state.date, "yyyy-MM-dd") : "";
  }, [state.date]);

  const { data: availableSlots = [], isLoading } = useQuery<TimeSlot[], Error>({
    queryKey: ["availability", state.barberId, formattedDate, state.serviceId], // Added serviceId to queryKey
    queryFn: () =>
      fetchAvailableSlots(
        Number(state.barberId),
        formattedDate,
        Number(state.serviceId),
      ),
    enabled: !!state.barberId && !!formattedDate && !!state.serviceId, // Ensure all params are present
  });

  return (
    <div className="grid gap-6">
      <Calendar
        mode="single"
        selected={state.date ?? undefined}
        onSelect={(date) => {
          setState({ date, time: "" }); // Reset time when date changes
        }}
        className="rounded-md border"
        disabled={(date) => date < new Date()}
      />
      {state.date && (
        <div>
          <h3 className="mb-4 font-medium">Available Time Slots</h3>
          {isLoading ? (
            <div className="grid grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-5 rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : availableSlots.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {availableSlots.map((slot) => (
                <Card
                  key={slot.time}
                  className={cn(
                    "transition-colors",
                    slot.available
                      ? "cursor-pointer hover:bg-accent"
                      : "cursor-not-allowed bg-gray-200",
                    state.time === slot.time && "border-primary",
                  )}
                  onClick={() => {
                    if (slot.available) {
                      setState({ time: slot.time });
                    }
                  }}
                >
                  <CardContent className="p-4 text-center">
                    <span className="text-sm font-medium">{slot.time}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              No available slots for this date
            </p>
          )}
        </div>
      )}
    </div>
  );
}
