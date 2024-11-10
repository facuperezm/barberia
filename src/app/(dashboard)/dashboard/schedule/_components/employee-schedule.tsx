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
import { Badge } from "@/components/ui/badge";
import { format, addDays, startOfWeek } from "date-fns";
import { Calendar, Clock, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Appointment {
  id: number;
  customerName: string;
  service: string;
  time: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
}

interface DaySchedule {
  date: Date;
  appointments: Appointment[];
  availableSlots: number;
  totalSlots: number;
}

export function EmployeeSchedule() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Generate the week's schedule when employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      fetchWeekSchedule();
    }
  }, [selectedEmployee]);

  const fetchWeekSchedule = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would be an API call
      // For demo, we'll simulate some appointments

      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Start from Monday

      const schedule: DaySchedule[] = Array.from({ length: 6 }).map(
        (_, index) => {
          const date = addDays(weekStart, index);
          const totalSlots = 8; // 8 slots per day

          // Simulate different appointments for different days
          const appointments: Appointment[] = [];
          if (index === 0) {
            // Monday
            appointments.push(
              {
                id: 1,
                customerName: "John Smith",
                service: "Haircut",
                time: "09:00",
                status: "confirmed",
              },
              {
                id: 2,
                customerName: "Alice Johnson",
                service: "Beard Trim",
                time: "11:00",
                status: "confirmed",
              },
            );
          } else if (index === 2) {
            // Wednesday
            appointments.push({
              id: 3,
              customerName: "Bob Wilson",
              service: "Full Service",
              time: "14:00",
              status: "pending",
            });
          }

          return {
            date,
            appointments,
            availableSlots: totalSlots - appointments.length,
            totalSlots,
          };
        },
      );

      setWeekSchedule(schedule);
    } catch (error) {
      console.error("Error fetching schedule:", error);
    } finally {
      setIsLoading(false);
    }
  };

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

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Skeleton className="size-10" />
          </div>
        ) : (
          selectedEmployee && (
            <div className="space-y-4">
              {weekSchedule.map((day, index) => (
                <Card key={index} className="p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-muted-foreground" />
                      <span className="font-medium">
                        {format(day.date, "EEEE, MMM d")}
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
