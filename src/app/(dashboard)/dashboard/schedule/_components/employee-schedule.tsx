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
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Calendar, Clock, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { type Employee } from "@/server/queries/employees";

interface Appointment {
  id: number;
  customerName: string;
  service: string;
  time: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
}

interface DaySchedule {
  date: string; // ISO string
  appointments: Appointment[];
  availableSlots: number;
  totalSlots: number;
}

export function EmployeeSchedule() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");

  const {
    data: employees,
    isLoading: isEmployeesLoading,
    error: employeesError,
  } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await fetch("/api/employees");
      if (!res.ok) {
        throw new Error("Failed to fetch employees");
      }
      return res.json();
    },
  });

  const {
    data: weekSchedule,
    isLoading: isScheduleLoading,
    error: scheduleError,
  } = useQuery<DaySchedule[]>({
    queryKey: ["weeklySchedule", selectedEmployee],
    queryFn: () => fetchWeeklySchedule(Number(selectedEmployee)),
    enabled: !!selectedEmployee,
  });

  async function fetchWeeklySchedule(
    employeeId: number,
  ): Promise<DaySchedule[]> {
    const res = await fetch(`/api/schedule?employeeId=${employeeId}`);
    if (!res.ok) {
      throw new Error("Failed to fetch schedule");
    }
    return res.json();
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "secondary";
      case "pending":
        return "outline";
      case "cancelled":
        return "destructive";
      case "completed":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Schedule</CardTitle>
        <CardDescription>View appointments and availability</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          {isEmployeesLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : employeesError ? (
            <div className="text-destructive">Error loading employees</div>
          ) : (
            <Select
              value={selectedEmployee}
              onValueChange={setSelectedEmployee}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id.toString()}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {isScheduleLoading ? (
          <div className="flex justify-center py-4">
            <Skeleton className="h-10 w-full" />
          </div>
        ) : scheduleError ? (
          <div className="py-4 text-center text-destructive">
            Error loading schedule
          </div>
        ) : (
          selectedEmployee && (
            <div className="space-y-4">
              {weekSchedule?.map((day, index) => (
                <Card key={index} className="p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-muted-foreground" />
                      <span className="font-medium">
                        {format(new Date(day.date), "EEEE, MMM d")}
                      </span>
                    </div>
                    <Badge variant="secondary">
                      {day.availableSlots} slots available
                    </Badge>
                  </div>

                  {day.appointments.length > 0 ? (
                    <div className="space-y-3">
                      {day.appointments.map((apt) => (
                        <div
                          key={apt.id}
                          className="flex items-center justify-between rounded-lg bg-muted/50 p-2"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Clock className="size-4 text-muted-foreground" />
                              <span className="font-medium">{apt.time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="size-4 text-muted-foreground" />
                              <span>{apt.customerName}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {apt.service}
                            </span>
                            <Badge variant={getStatusColor(apt.status)}>
                              {apt.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-muted-foreground">
                      No appointments scheduled
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
