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
): Promise<TimeSlot[]> => {
  const response = await fetch(
    `/api/availability?date=${formattedDate}&barberId=${barberId}`,
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

  const {
    data: availableSlots = [],
    isLoading,
    isError,
  } = useQuery<TimeSlot[], Error>({
    queryKey: ["availability", state.barberId, formattedDate],
    queryFn: () => fetchAvailableSlots(Number(state.barberId), formattedDate),
    enabled: !!state.date && !!state.barberId,
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
          ) : isError ? (
            <p className="text-center text-red-500">Error loading slots.</p>
          ) : availableSlots.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {availableSlots.map((slot) => (
                <Card
                  key={slot.time}
                  className={cn(
                    "cursor-pointer transition-colors",
                    slot.available
                      ? "hover:bg-accent"
                      : "cursor-not-allowed opacity-50",
                    state.time === slot.time &&
                      slot.available &&
                      "border-primary",
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
