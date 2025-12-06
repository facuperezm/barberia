"use client";

import { useState, useEffect } from "react";
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
import { X, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getAllEmployees,
  getBarberSchedule,
  updateBarberSchedule,
} from "@/server/actions/barbers";
import type { Barber } from "@/drizzle/schema";

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
  [key: number]: DaySchedule;
}

// Database uses: 0 = Sunday, 1 = Monday, ... 6 = Saturday
const daysOfWeek = [
  { dayIndex: 1, label: "Monday" },
  { dayIndex: 2, label: "Tuesday" },
  { dayIndex: 3, label: "Wednesday" },
  { dayIndex: 4, label: "Thursday" },
  { dayIndex: 5, label: "Friday" },
  { dayIndex: 6, label: "Saturday" },
  { dayIndex: 0, label: "Sunday" },
];

const defaultTimeSlot = {
  start: "09:00",
  end: "17:00",
  id: "default",
};

const createDefaultSchedule = (): WorkingHours => {
  return daysOfWeek.reduce((acc, { dayIndex }) => {
    const isWorkDay = dayIndex !== 0; // Sunday off by default
    acc[dayIndex] = {
      isWorking: isWorkDay,
      timeSlots: isWorkDay ? [{ ...defaultTimeSlot, id: crypto.randomUUID() }] : [],
    };
    return acc;
  }, {} as WorkingHours);
};

export function EmployeeSchedule() {
  const [employees, setEmployees] = useState<Barber[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [workingHours, setWorkingHours] = useState<WorkingHours>(
    createDefaultSchedule(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch employees on mount
  useEffect(() => {
    async function fetchEmployees() {
      setIsLoading(true);
      try {
        const data = await getAllEmployees();
        setEmployees(data);
      } catch (error) {
        console.error("Failed to fetch employees:", error);
        toast.error("Failed to load employees");
      } finally {
        setIsLoading(false);
      }
    }
    fetchEmployees();
  }, []);

  // Load schedule when employee is selected
  useEffect(() => {
    async function loadSchedule() {
      if (!selectedEmployee) return;

      setIsLoadingSchedule(true);
      try {
        const schedule = await getBarberSchedule(parseInt(selectedEmployee));

        if (schedule.length > 0) {
          // Convert DB schedule to component state format
          const scheduleMap: WorkingHours = createDefaultSchedule();

          for (const entry of schedule) {
            scheduleMap[entry.dayOfWeek] = {
              isWorking: entry.isWorking,
              timeSlots: entry.isWorking
                ? [
                    {
                      start: entry.startTime,
                      end: entry.endTime,
                      id: crypto.randomUUID(),
                    },
                  ]
                : [],
            };
          }

          setWorkingHours(scheduleMap);
        } else {
          // No schedule exists, use defaults
          setWorkingHours(createDefaultSchedule());
        }
      } catch (error) {
        console.error("Failed to load schedule:", error);
        toast.error("Failed to load schedule");
      } finally {
        setIsLoadingSchedule(false);
      }
    }

    loadSchedule();
  }, [selectedEmployee]);

  const handleToggleWorkDay = (dayIndex: number) => {
    setWorkingHours((prev) => ({
      ...prev,
      [dayIndex]: {
        isWorking: !prev[dayIndex].isWorking,
        timeSlots: !prev[dayIndex].isWorking
          ? [{ ...defaultTimeSlot, id: crypto.randomUUID() }]
          : [],
      },
    }));
  };

  const addTimeSlot = (dayIndex: number) => {
    const newSlot: TimeSlot = {
      start: "09:00",
      end: "17:00",
      id: crypto.randomUUID(),
    };

    setWorkingHours((prev) => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        timeSlots: [...prev[dayIndex].timeSlots, newSlot],
      },
    }));
  };

  const removeTimeSlot = (dayIndex: number, slotId: string) => {
    setWorkingHours((prev) => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        timeSlots: prev[dayIndex].timeSlots.filter((slot) => slot.id !== slotId),
      },
    }));
  };

  const updateTimeSlot = (
    dayIndex: number,
    slotId: string,
    field: "start" | "end",
    value: string,
  ) => {
    setWorkingHours((prev) => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        timeSlots: prev[dayIndex].timeSlots.map((slot) =>
          slot.id === slotId ? { ...slot, [field]: value } : slot,
        ),
      },
    }));
  };

  const handleSaveSchedule = async () => {
    if (!selectedEmployee) return;

    setIsSaving(true);
    try {
      // Convert component state to API format
      const scheduleData: Record<
        number,
        { isWorking: boolean; slots: { start: string; end: string }[] }
      > = {};

      for (const { dayIndex } of daysOfWeek) {
        const daySchedule = workingHours[dayIndex];
        scheduleData[dayIndex] = {
          isWorking: daySchedule.isWorking,
          slots: daySchedule.timeSlots.map((slot) => ({
            start: slot.start,
            end: slot.end,
          })),
        };
      }

      await updateBarberSchedule(parseInt(selectedEmployee), scheduleData);
      toast.success("Schedule updated successfully");
    } catch (error) {
      console.error("Failed to save schedule:", error);
      toast.error("Failed to save schedule");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Working Hours</CardTitle>
          <CardDescription>
            Set custom schedules for each employee
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

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
              {employees.length === 0 ? (
                <SelectItem value="no-employees" disabled>
                  No employees found
                </SelectItem>
              ) : (
                employees.map((employee) => (
                  <SelectItem key={employee.id} value={String(employee.id)}>
                    {employee.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedEmployee && (
          <>
            {isLoadingSchedule ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="space-y-6">
                  {daysOfWeek.map(({ dayIndex, label }) => (
                    <div key={dayIndex} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{label}</h3>
                          <Badge
                            variant={
                              workingHours[dayIndex].isWorking
                                ? "default"
                                : "secondary"
                            }
                          >
                            {workingHours[dayIndex].isWorking ? "Working" : "Off"}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleWorkDay(dayIndex)}
                        >
                          {workingHours[dayIndex].isWorking
                            ? "Set as Off"
                            : "Set as Working"}
                        </Button>
                      </div>

                      {workingHours[dayIndex].isWorking && (
                        <div className="space-y-4 pl-4">
                          {workingHours[dayIndex].timeSlots.map((slot) => (
                            <div key={slot.id} className="flex items-center gap-4">
                              <div className="grid gap-2">
                                <Label>Start</Label>
                                <Input
                                  type="time"
                                  value={slot.start}
                                  onChange={(e) =>
                                    updateTimeSlot(
                                      dayIndex,
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
                                      dayIndex,
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
                                onClick={() => removeTimeSlot(dayIndex, slot.id)}
                              >
                                <X className="size-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addTimeSlot(dayIndex)}
                          >
                            <Plus className="mr-2 size-4" />
                            Add Time Slot
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full"
                  onClick={handleSaveSchedule}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Schedule"
                  )}
                </Button>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
