"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface TimeSlot {
  start: string;
  end: string;
  id: string;
}

interface DaySchedule {
  isWorking: boolean;
  timeSlots: TimeSlot[];
}

interface WorkingHours {
  [key: string]: DaySchedule;
}

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const defaultTimeSlot = {
  start: "09:00",
  end: "17:00",
  id: "default",
};

const createDefaultSchedule = (): WorkingHours => {
  return daysOfWeek.reduce((acc, day) => {
    acc[day] = {
      isWorking: day !== "Sunday",
      timeSlots: day !== "Sunday" ? [{ ...defaultTimeSlot }] : [],
    };
    return acc;
  }, {} as WorkingHours);
};

export function EmployeeSchedule() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [workingHours, setWorkingHours] = useState<WorkingHours>(
    createDefaultSchedule(),
  );

  const handleToggleWorkDay = (day: string) => {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: {
        isWorking: !prev[day].isWorking,
        timeSlots: !prev[day].isWorking ? [{ ...defaultTimeSlot }] : [],
      },
    }));
  };

  const addTimeSlot = (day: string) => {
    const newSlot: TimeSlot = {
      start: "09:00",
      end: "17:00",
      id: crypto.randomUUID(),
    };

    setWorkingHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: [...prev[day].timeSlots, newSlot],
      },
    }));
  };

  const removeTimeSlot = (day: string, slotId: string) => {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: prev[day].timeSlots.filter((slot) => slot.id !== slotId),
      },
    }));
  };

  const updateTimeSlot = (
    day: string,
    slotId: string,
    field: "start" | "end",
    value: string,
  ) => {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: prev[day].timeSlots.map((slot) =>
          slot.id === slotId ? { ...slot, [field]: value } : slot,
        ),
      },
    }));
  };

  const handleSaveSchedule = () => {
    // Here you would typically save to your backend
    console.log("Saving schedule:", {
      employeeId: selectedEmployee,
      schedule: workingHours,
    });
    toast.success("Schedule updated successfully");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Working Hours</CardTitle>
        <CardDescription>
          Set custom schedules for each employee
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Select Employee</Label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger>
              <SelectValue placeholder="Select an employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">John Doe</SelectItem>
              <SelectItem value="2">Jane Smith</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedEmployee && (
          <>
            <div className="space-y-6">
              {daysOfWeek.map((day) => (
                <div key={day} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{day}</h3>
                      <Badge
                        variant={
                          workingHours[day].isWorking ? "default" : "secondary"
                        }
                      >
                        {workingHours[day].isWorking ? "Working" : "Off"}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleWorkDay(day)}
                    >
                      {workingHours[day].isWorking
                        ? "Set as Off"
                        : "Set as Working"}
                    </Button>
                  </div>

                  {workingHours[day].isWorking && (
                    <div className="space-y-4 pl-4">
                      {workingHours[day].timeSlots.map((slot) => (
                        <div key={slot.id} className="flex items-center gap-4">
                          <div className="grid gap-2">
                            <Label>Start</Label>
                            <Input
                              type="time"
                              value={slot.start}
                              onChange={(e) =>
                                updateTimeSlot(
                                  day,
                                  slot.id,
                                  "start",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>End</Label>
                            <Input
                              type="time"
                              value={slot.end}
                              onChange={(e) =>
                                updateTimeSlot(
                                  day,
                                  slot.id,
                                  "end",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="self-end"
                            onClick={() => removeTimeSlot(day, slot.id)}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addTimeSlot(day)}
                      >
                        <Plus className="mr-2 size-4" />
                        Add Time Slot
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button className="w-full" onClick={handleSaveSchedule}>
              Save Schedule
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
