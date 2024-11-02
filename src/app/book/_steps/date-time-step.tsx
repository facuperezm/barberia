"use client";

import { useBooking } from "@/app/book/_components/booking-provider";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Mock available time slots - replace with API call
const timeSlots = [
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
];

export function DateTimeStep() {
  const { state, setState } = useBooking();

  return (
    <div className="grid gap-6">
      <Calendar
        mode="single"
        selected={state.date ?? undefined}
        onSelect={(date) => setState({ date })}
        className="rounded-md border"
        disabled={
          (date) => date < new Date() || date.getDay() === 0 // Disable past dates and Sundays
        }
      />

      <div className="grid grid-cols-3 gap-4">
        {timeSlots.map((time) => (
          <Card
            key={time}
            className={cn(
              "cursor-pointer transition-colors hover:bg-accent",
              state.time === time && "border-primary",
            )}
            onClick={() => setState({ time })}
          >
            <CardContent className="p-4 text-center">
              <span className="text-sm font-medium">{time}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
