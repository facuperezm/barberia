"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { type Barber } from "@/lib/types";

const DAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  isWorking: boolean;
  slots: TimeSlot[];
}

export function DefaultSchedule() {
  const [selectedBarber, setSelectedBarber] = useState("");
  const [schedule, setSchedule] = useState<Record<string, DaySchedule>>({});
  const [isLoading, setIsLoading] = useState(false);

  const {
    data: barbers,
    isLoading: isBarbersLoading,
    error: barbersError,
  } = useQuery<Barber[]>({
    queryKey: ["barbers"],
    queryFn: async () => {
      const response = await fetch("/api/barber");
      if (!response.ok) throw new Error("Failed to fetch barbers");
      return response.json();
    },
  });
  // Fetch barbers and their default schedules
  useEffect(() => {
    if (selectedBarber) {
      fetchBarberSchedule();
    }
  }, [selectedBarber]);

  const fetchBarberSchedule = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/barber/${selectedBarber}/schedule`);
      if (!response.ok) throw new Error("Failed to fetch schedule");
      const data = await response.json();
      setSchedule(data.defaultWorkingHours || {});
    } catch (error) {
      toast.error("Failed to load schedule");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDayToggle = (day: string, isWorking: boolean) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        isWorking,
        slots: prev[day]?.slots || [{ start: "09:00", end: "17:00" }],
      },
    }));
  };

  const handleAddTimeSlot = (day: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: [...(prev[day]?.slots || []), { start: "09:00", end: "17:00" }],
      },
    }));
  };

  const handleRemoveTimeSlot = (day: string, index: number) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.filter((_, i) => i !== index),
      },
    }));
  };

  const handleTimeChange = (
    day: string,
    index: number,
    field: "start" | "end",
    value: string,
  ) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.map((slot, i) =>
          i === index ? { ...slot, [field]: value } : slot,
        ),
      },
    }));
  };

  const handleSave = async () => {
    try {
      const normalizedSchedule = Object.entries(schedule).reduce(
        (acc, [day, daySchedule]) => ({
          ...acc,
          [day]: {
            isWorking: daySchedule.isWorking,
            slots: daySchedule.isWorking
              ? daySchedule.slots.map((slot) => ({
                  start: slot.start.substring(0, 5),
                  end: slot.end.substring(0, 5),
                }))
              : [],
          },
        }),
        {},
      );

      const response = await fetch(`/api/barber/${selectedBarber}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultWorkingHours: normalizedSchedule }),
      });

      if (!response.ok) throw new Error("Failed to save schedule");
      toast.success("Schedule saved successfully");
    } catch (error) {
      toast.error("Failed to save schedule");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Select Barber</Label>
        <Select value={selectedBarber} onValueChange={setSelectedBarber}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a barber" />
          </SelectTrigger>
          <SelectContent>
            {isBarbersLoading && (
              <SelectItem value="loading" disabled>
                Loading...
              </SelectItem>
            )}
            {barbersError && (
              <SelectItem value="error" disabled>
                Error loading barbers
              </SelectItem>
            )}
            {barbers &&
              barbers.map((barber) => (
                <SelectItem key={barber.id} value={barber.id.toString()}>
                  {barber.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {selectedBarber && !isLoading && (
        <div className="space-y-6">
          {DAYS.map((day) => (
            <div key={day.value} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={schedule[day.value]?.isWorking}
                    onCheckedChange={(checked) =>
                      handleDayToggle(day.value, checked)
                    }
                  />
                  <Label>{day.label}</Label>
                </div>
                {schedule[day.value]?.isWorking && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddTimeSlot(day.value)}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Time Slot
                  </Button>
                )}
              </div>

              {schedule[day.value]?.isWorking && (
                <div className="space-y-2">
                  {schedule[day.value].slots.map((slot, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        type="time"
                        value={slot.start}
                        onChange={(e) =>
                          handleTimeChange(
                            day.value,
                            index,
                            "start",
                            e.target.value,
                          )
                        }
                      />
                      <span>to</span>
                      <Input
                        type="time"
                        value={slot.end}
                        onChange={(e) =>
                          handleTimeChange(
                            day.value,
                            index,
                            "end",
                            e.target.value,
                          )
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveTimeSlot(day.value, index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <Button onClick={handleSave} className="w-full">
            Save Schedule
          </Button>
        </div>
      )}
    </div>
  );
}
