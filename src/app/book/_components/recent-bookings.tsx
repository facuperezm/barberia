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

interface Booking {
  id: string;
  customerName: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  status: "confirmed" | "pending" | "cancelled";
  email: string;
  phone: string;
}

// Mock data - replace with API call
const mockBookings: Booking[] = [
  {
    id: "1",
    customerName: "Alex Johnson",
    service: "Haircut",
    barber: "John Doe",
    date: "2024-03-20",
    time: "10:00",
    status: "confirmed",
    email: "alex@example.com",
    phone: "(555) 000-0000",
  },
  {
    id: "2",
    customerName: "Sarah Williams",
    service: "Haircut + Shave",
    barber: "Jane Smith",
    date: "2024-03-20",
    time: "11:30",
    status: "pending",
    email: "sarah@example.com",
    phone: "(555) 000-0001",
  },
  {
    id: "3",
    customerName: "Mike Brown",
    service: "Shave",
    barber: "John Doe",
    date: "2024-03-20",
    time: "14:00",
    status: "confirmed",
    email: "mike@example.com",
    phone: "(555) 000-0002",
  },
];

const statusColors = {
  confirmed: "success",
  pending: "warning",
  cancelled: "destructive",
} as const;

export function RecentBookings() {
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [bookings, setBookings] = useState<Booking[]>(mockBookings);

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
    selectedDay === "all"
      ? bookings
      : bookings.filter((booking) => booking.date === selectedDay);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
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
      </CardHeader>
      <CardContent>
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
                  <div>{booking.email}</div>
                  <div className="text-muted-foreground">{booking.phone}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[booking.status]}>
                    {booking.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
