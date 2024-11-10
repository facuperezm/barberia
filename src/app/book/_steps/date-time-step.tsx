"use client";

import { useBooking } from "@/app/book/_components/booking-provider";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useEffect } from "react";
import { format } from "date-fns";

interface AvailableSlot {
  time: string;
  available: boolean;
}

export function DateTimeStep() {
  const { state, setState } = useBooking();
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);

  useEffect(() => {
    const fetchAvailableSlots = async () => {
      try {
        const dayOfWeek = format(state.date!, "EEEE");

        let slots: AvailableSlot[] = [];
        if (dayOfWeek === "Thursday" && state.barberId === "1") {
          slots = [
            { time: "09:00", available: true },
            { time: "12:00", available: true },
            { time: "10:00", available: false },
            { time: "11:00", available: false },
            { time: "13:00", available: false },
            { time: "14:00", available: false },
            { time: "15:00", available: false },
            { time: "16:00", available: false },
          ];
        } else {
          slots = [
            { time: "09:00", available: true },
            { time: "10:00", available: true },
            { time: "11:00", available: true },
            { time: "13:00", available: true },
            { time: "14:00", available: true },
            { time: "15:00", available: true },
            { time: "16:00", available: true },
          ];
        }

        setAvailableSlots(slots);
      } catch (error) {
        console.error("Error fetching available slots:", error);
        setAvailableSlots([]);
      }
    };

    if (state.date && state.barberId) {
      fetchAvailableSlots();
    }
  }, [state.date, state.barberId]);

  return (
    <div className="grid gap-6">
      <Calendar
        mode="single"
        selected={state.date ? state.date : undefined}
        onSelect={(date) => {
          setState({ date, time: "" }); // Reset time when date changes
        }}
        className="rounded-md border"
        disabled={
          (date) => date < new Date() || date.getDay() === 0 // Disable past dates and Sundays
        }
      />

      {state.date && (
        <div>
          <h3 className="mb-4 font-medium">Available Time Slots</h3>
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
        </div>
      )}
    </div>
  );
}
