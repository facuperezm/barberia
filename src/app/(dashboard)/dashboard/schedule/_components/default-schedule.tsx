"use client";

import { useEffect, useState } from "react";
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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getBarbers,
  getBarberSchedule,
  updateBarberSchedule,
} from "@/server/actions/barbers";
import { format, setDay } from "date-fns";
import { Input } from "@/components/ui/input";

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
  const queryClient = useQueryClient();
  const [selectedBarber, setSelectedBarber] = useState("");
  const [schedule, setSchedule] = useState<Record<number, DaySchedule>>({});

  const {
    data: barbers,
    isLoading: isBarbersLoading,
    error: barbersError,
  } = useQuery({
    queryKey: ["barbers"],
    queryFn: getBarbers,
  });

  const { data: barberSchedule } = useQuery({
    queryKey: ["barberSchedule", selectedBarber],
    queryFn: () => getBarberSchedule(parseInt(selectedBarber)),
    enabled: !!selectedBarber,
  });

  useEffect(() => {
    if (barberSchedule) {
      const normalizedSchedule: Record<number, DaySchedule> = {};
      DAYS.forEach((day) => {
        const daySchedule = barberSchedule.find(
          (d) => d.dayOfWeek === Number(day.value),
        );
        normalizedSchedule[Number(day.value)] = {
          isWorking: daySchedule?.isWorking ?? false,
          slots:
            daySchedule?.isWorking &&
            daySchedule.startTime &&
            daySchedule.endTime
              ? [{ start: daySchedule.startTime, end: daySchedule.endTime }]
              : [],
        };
      });
      setSchedule(normalizedSchedule);
    }
  }, [barberSchedule]);

  const { mutate: saveSchedule } = useMutation({
    mutationFn: async () =>
      updateBarberSchedule(parseInt(selectedBarber), schedule),
    onSuccess: () => {
      toast.success("Schedule saved successfully");
    },
    onError: (error) => {
      toast.error(`Error saving schedule: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["barberSchedule", selectedBarber],
      });
    },
  });

  const handleDayToggle = (dayOfWeek: number, isWorking: boolean) => {
    setSchedule((prev) => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        isWorking,
        slots: isWorking ? prev[dayOfWeek]?.slots || [] : [],
      },
    }));
  };

  const handleAddTimeSlot = (dayOfWeek: number) => {
    setSchedule((prev) => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        slots: [
          ...(prev[dayOfWeek]?.slots || []),
          { start: "09:00", end: "17:00" },
        ],
      },
    }));
  };

  const handleRemoveTimeSlot = (dayOfWeek: number, index: number) => {
    setSchedule((prev) => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        slots: prev[dayOfWeek].slots.filter((_, i) => i !== index),
      },
    }));
  };

  const handleTimeChange = (
    dayOfWeek: number,
    index: number,
    field: "start" | "end",
    value: string,
  ) => {
    setSchedule((prev) => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        slots: prev[dayOfWeek].slots.map((slot, i) =>
          i === index ? { ...slot, [field]: value } : slot,
        ),
      },
    }));
  };

  const handleSave = () => {
    saveSchedule();
  };

  if (isBarbersLoading) {
    return <div>Loading barbers...</div>;
  }

  if (barbersError) {
    return <div>Error loading barbers</div>;
  }

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

      {selectedBarber && !isBarbersLoading && (
        <div className="space-y-6">
          {DAYS.map((day) => (
            <div key={day.value} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={schedule[Number(day.value)]?.isWorking}
                    onCheckedChange={(checked) =>
                      handleDayToggle(Number(day.value), checked)
                    }
                  />
                  <Label>{day.label}</Label>
                </div>
                {schedule[Number(day.value)]?.isWorking && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddTimeSlot(Number(day.value))}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Time Slot
                  </Button>
                )}
              </div>

              {schedule[Number(day.value)]?.isWorking && (
                <div className="space-y-2">
                  {schedule[Number(day.value)].slots.map((slot, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        type="time"
                        value={slot.start}
                        onChange={(e) =>
                          handleTimeChange(
                            Number(day.value),
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
                            Number(day.value),
                            index,
                            "end",
                            e.target.value,
                          )
                        }
                      />
                      {index > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleRemoveTimeSlot(Number(day.value), index)
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
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
