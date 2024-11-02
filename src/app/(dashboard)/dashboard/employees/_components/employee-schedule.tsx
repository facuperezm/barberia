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

interface WorkingHours {
  [key: string]: {
    start: string;
    end: string;
    isWorking: boolean;
  };
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

const defaultHours: WorkingHours = {
  Monday: { start: "09:00", end: "17:00", isWorking: true },
  Tuesday: { start: "09:00", end: "17:00", isWorking: true },
  Wednesday: { start: "09:00", end: "17:00", isWorking: true },
  Thursday: { start: "09:00", end: "17:00", isWorking: true },
  Friday: { start: "09:00", end: "17:00", isWorking: true },
  Saturday: { start: "10:00", end: "15:00", isWorking: true },
  Sunday: { start: "09:00", end: "17:00", isWorking: false },
};

export function EmployeeSchedule() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [workingHours, setWorkingHours] = useState<WorkingHours>(defaultHours);

  const handleHoursChange = (
    day: string,
    field: "start" | "end" | "isWorking",
    value: string | boolean,
  ) => {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Working Hours</CardTitle>
        <CardDescription>
          Set employee schedules and availability
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <div className="space-y-4">
            {daysOfWeek.map((day) => (
              <div key={day} className="flex items-center space-x-4">
                <div className="w-24">
                  <Label>{day}</Label>
                </div>
                <Button
                  variant={workingHours[day].isWorking ? "default" : "outline"}
                  className="w-24"
                  onClick={() =>
                    handleHoursChange(
                      day,
                      "isWorking",
                      !workingHours[day].isWorking,
                    )
                  }
                >
                  {workingHours[day].isWorking ? "Working" : "Off"}
                </Button>
                {workingHours[day].isWorking && (
                  <>
                    <div className="grid gap-2">
                      <Label>Start</Label>
                      <Input
                        type="time"
                        value={workingHours[day].start}
                        onChange={(e) =>
                          handleHoursChange(day, "start", e.target.value)
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>End</Label>
                      <Input
                        type="time"
                        value={workingHours[day].end}
                        onChange={(e) =>
                          handleHoursChange(day, "end", e.target.value)
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
