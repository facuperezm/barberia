"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { TimeSlotEditor, type TimeSlot } from "./time-slot-editor";

export interface DaySchedule {
  isWorking: boolean;
  timeSlots: TimeSlot[];
}

export interface WorkingHoursSchedule {
  [dayIndex: number]: DaySchedule;
}

export const DAYS_OF_WEEK = [
  { dayIndex: 1, label: "Monday" },
  { dayIndex: 2, label: "Tuesday" },
  { dayIndex: 3, label: "Wednesday" },
  { dayIndex: 4, label: "Thursday" },
  { dayIndex: 5, label: "Friday" },
  { dayIndex: 6, label: "Saturday" },
  { dayIndex: 0, label: "Sunday" },
] as const;

export function createDefaultSchedule(): WorkingHoursSchedule {
  return DAYS_OF_WEEK.reduce((acc, { dayIndex }) => {
    const isWorkDay = dayIndex !== 0;
    acc[dayIndex] = {
      isWorking: isWorkDay,
      timeSlots: isWorkDay
        ? [{ start: "09:00", end: "17:00", id: crypto.randomUUID() }]
        : [],
    };
    return acc;
  }, {} as WorkingHoursSchedule);
}

interface WeeklyScheduleEditorProps {
  schedule: WorkingHoursSchedule;
  onChange: (schedule: WorkingHoursSchedule) => void;
  disabled?: boolean;
}

export function WeeklyScheduleEditor({
  schedule,
  onChange,
  disabled = false,
}: WeeklyScheduleEditorProps) {
  const handleToggleWorkDay = (dayIndex: number) => {
    onChange({
      ...schedule,
      [dayIndex]: {
        isWorking: !schedule[dayIndex].isWorking,
        timeSlots: !schedule[dayIndex].isWorking
          ? [{ start: "09:00", end: "17:00", id: crypto.randomUUID() }]
          : [],
      },
    });
  };

  const addTimeSlot = (dayIndex: number) => {
    const newSlot: TimeSlot = {
      start: "09:00",
      end: "17:00",
      id: crypto.randomUUID(),
    };

    onChange({
      ...schedule,
      [dayIndex]: {
        ...schedule[dayIndex],
        timeSlots: [...schedule[dayIndex].timeSlots, newSlot],
      },
    });
  };

  const removeTimeSlot = (dayIndex: number, slotId: string) => {
    onChange({
      ...schedule,
      [dayIndex]: {
        ...schedule[dayIndex],
        timeSlots: schedule[dayIndex].timeSlots.filter(
          (slot) => slot.id !== slotId,
        ),
      },
    });
  };

  const updateTimeSlot = (
    dayIndex: number,
    slotId: string,
    field: "start" | "end",
    value: string,
  ) => {
    onChange({
      ...schedule,
      [dayIndex]: {
        ...schedule[dayIndex],
        timeSlots: schedule[dayIndex].timeSlots.map((slot) =>
          slot.id === slotId ? { ...slot, [field]: value } : slot,
        ),
      },
    });
  };

  return (
    <div className="space-y-6">
      {DAYS_OF_WEEK.map(({ dayIndex, label }) => (
        <div key={dayIndex} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{label}</h3>
              <Badge
                variant={schedule[dayIndex].isWorking ? "default" : "secondary"}
              >
                {schedule[dayIndex].isWorking ? "Working" : "Off"}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleWorkDay(dayIndex)}
              disabled={disabled}
            >
              {schedule[dayIndex].isWorking ? "Set as Off" : "Set as Working"}
            </Button>
          </div>

          {schedule[dayIndex].isWorking && (
            <div className="ml-2 space-y-3 border-l-2 border-muted pl-4">
              {schedule[dayIndex].timeSlots.map((slot) => (
                <TimeSlotEditor
                  key={slot.id}
                  slot={slot}
                  onUpdate={(id, field, value) =>
                    updateTimeSlot(dayIndex, id, field, value)
                  }
                  onRemove={(id) => removeTimeSlot(dayIndex, id)}
                  canRemove={schedule[dayIndex].timeSlots.length > 1}
                  disabled={disabled}
                />
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addTimeSlot(dayIndex)}
                disabled={disabled}
              >
                <Plus className="mr-2 size-4" />
                Add Time Slot
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
