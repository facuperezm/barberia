"use client";

import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format } from "date-fns";
import { parse } from "date-fns";
import { startOfWeek } from "date-fns";
import { getDay } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const locales = {
  "en-US": require("date-fns/locale/en-US"),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Mock data
const mockBarbers = [
  { id: 1, name: "John Doe" },
  { id: 2, name: "Jane Smith" },
];

const mockServices = [
  { id: 1, name: "Haircut", duration: 30 },
  { id: 2, name: "Beard Trim", duration: 20 },
  { id: 3, name: "Full Service", duration: 60 },
];

interface Appointment {
  id: number;
  title: string;
  start: Date;
  end: Date;
  barberId: number;
  serviceId: number;
  customerName: string;
}

export function CalendarView() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [newAppointment, setNewAppointment] = useState({
    customerName: "",
    barberId: "",
    serviceId: "",
  });

  const handleSelectSlot = (slotInfo: any) => {
    setSelectedSlot(slotInfo);
    setIsDialogOpen(true);
  };

  const handleCreateAppointment = () => {
    if (
      !selectedSlot ||
      !newAppointment.customerName ||
      !newAppointment.barberId ||
      !newAppointment.serviceId
    )
      return;

    const service = mockServices.find(
      (s) => s.id === parseInt(newAppointment.serviceId),
    );
    if (!service) return;

    const endTime = new Date(selectedSlot.start);
    endTime.setMinutes(endTime.getMinutes() + service.duration);

    const appointment: Appointment = {
      id: appointments.length + 1,
      title: `${newAppointment.customerName} - ${service.name}`,
      start: selectedSlot.start,
      end: endTime,
      barberId: parseInt(newAppointment.barberId),
      serviceId: parseInt(newAppointment.serviceId),
      customerName: newAppointment.customerName,
    };

    setAppointments([...appointments, appointment]);
    setIsDialogOpen(false);
    setNewAppointment({ customerName: "", barberId: "", serviceId: "" });
  };

  return (
    <div className="h-[700px]">
      <Calendar
        localizer={localizer}
        events={appointments}
        startAccessor="start"
        endAccessor="end"
        selectable
        onSelectSlot={handleSelectSlot}
        step={15}
        timeslots={4}
        defaultView="week"
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Appointment</DialogTitle>
            <DialogDescription>
              Fill in the details for the new appointment
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={newAppointment.customerName}
                onChange={(e) =>
                  setNewAppointment({
                    ...newAppointment,
                    customerName: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="barber">Barber</Label>
              <Select
                value={newAppointment.barberId}
                onValueChange={(value) =>
                  setNewAppointment({ ...newAppointment, barberId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a barber" />
                </SelectTrigger>
                <SelectContent>
                  {mockBarbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id.toString()}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="service">Service</Label>
              <Select
                value={newAppointment.serviceId}
                onValueChange={(value) =>
                  setNewAppointment({ ...newAppointment, serviceId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {mockServices.map((service) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name} ({service.duration} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAppointment}>
              Create Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
