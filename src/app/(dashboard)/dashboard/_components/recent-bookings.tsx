"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { TableSkeleton } from "@/app/(dashboard)/dashboard/_components/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { AppointmentActions } from "@/app/book/_components/appointment-actions";
import { useQuery } from "@tanstack/react-query";
import { getAppointments } from "@/server/actions/appointments";

const statusColors = {
  confirmed: "default",
  pending: "secondary",
  cancelled: "destructive",
  completed: "completed",
} as const;

export function RecentBookings() {
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => getAppointments(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Generate week days for the select dropdown
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      value: format(date, "yyyy-MM-dd"),
      label: format(date, "EEEE, MMM d"),
    };
  });

  const filteredBookings =
    bookings?.appointments
      ?.filter(
        (booking) => selectedDay === "all" || booking.date === selectedDay,
      )
      .filter((booking) => {
        const term = searchTerm.toLowerCase();
        return (
          searchTerm === "" ||
          booking.customerName.toLowerCase().includes(term) ||
          booking.customerEmail.toLowerCase().includes(term) ||
          booking.customerPhone.includes(searchTerm)
        );
      }) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <TableSkeleton />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle>Recent Bookings</CardTitle>
          <Select value={selectedDay} onValueChange={setSelectedDay}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bookings</SelectItem>
              {weekDays.map((day) => (
                <SelectItem key={day.value} value={day.value}>
                  {day.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground">No bookings found</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Barber</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.customerName}
                    </TableCell>
                    <TableCell>{booking.service}</TableCell>
                    <TableCell>{booking.barber}</TableCell>
                    <TableCell>
                      {format(new Date(booking.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{booking.time}</TableCell>
                    <TableCell className="text-sm">
                      <div>{booking.customerEmail}</div>
                      <div className="text-muted-foreground">
                        {booking.customerPhone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          statusColors[
                            booking.status as keyof typeof statusColors
                          ]
                        }
                      >
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <AppointmentActions
                        id={booking.id}
                        status={booking.status || "pending"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
