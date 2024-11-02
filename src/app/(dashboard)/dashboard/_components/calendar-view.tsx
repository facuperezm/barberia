"use client";

import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

// Break periods
const defaultBreaks = [
  {
    id: "lunch",
    title: "Lunch Break",
    start: new Date(new Date().setHours(12, 0, 0)),
    end: new Date(new Date().setHours(13, 0, 0)),
    resourceId: null, // null means applies to all barbers
    isBreak: true,
  },
];

interface Appointment {
  id: number;
  title: string;
  start: Date;
  end: Date;
  barberId: number;
  serviceId: number;
  customerName: string;
  isBreak?: boolean;
}

interface BreakPeriod {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId: number | null;
  isBreak: boolean;
}

export function CalendarView() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [breaks, setBreaks] = useState<BreakPeriod[]>(defaultBreaks);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBreakDialogOpen, setIsBreakDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [newAppointment, setNewAppointment] = useState({
    customerName: "",
    barberId: "",
    serviceId: "",
  });
  const [newBreak, setNewBreak] = useState({
    title: "",
    start: "",
    end: "",
    barberId: "",
  });
  const [view, setView] = useState("day");

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

    // Send appointment confirmation email
    sendAppointmentEmail(appointment);
  };

  const handleCreateBreak = () => {
    if (!newBreak.title || !newBreak.start || !newBreak.end) return;

    const breakPeriod: BreakPeriod = {
      id: `break-${breaks.length + 1}`,
      title: newBreak.title,
      start: new Date(`1970-01-01T${newBreak.start}`),
      end: new Date(`1970-01-01T${newBreak.end}`),
      resourceId: newBreak.barberId ? parseInt(newBreak.barberId) : null,
      isBreak: true,
    };

    setBreaks([...breaks, breakPeriod]);
    setIsBreakDialogOpen(false);
    setNewBreak({
      title: "",
      start: "",
      end: "",
      barberId: "",
    });
  };

  const sendAppointmentEmail = async (appointment: Appointment) => {
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appointment,
          type: "confirmation",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send email");
      }
    } catch (error) {
      console.error("Error sending email:", error);
    }
  };

  const allEvents = [...appointments, ...breaks].map((event) => ({
    ...event,
    resourceId: event.barberId || event.resourceId,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => setIsBreakDialogOpen(true)}>
          Add Break Period
        </Button>
      </div>

      <div className="h-[700px]">
        <Calendar
          localizer={localizer}
          events={allEvents}
          startAccessor="start"
          endAccessor="end"
          selectable
          onSelectSlot={handleSelectSlot}
          step={15}
          timeslots={4}
          view={view as any}
          onView={(newView) => setView(newView)}
          resources={mockBarbers}
          resourceIdAccessor="id"
          resourceTitleAccessor="name"
          eventProp={(event: any) => ({
            className: event.isBreak ? "bg-gray-400" : "",
          })}
        />
      </div>

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

      <Dialog open={isBreakDialogOpen} onOpenChange={setIsBreakDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Break Period</DialogTitle>
            <DialogDescription>
              Schedule a break period for one or all barbers
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="breakTitle">Break Title</Label>
              <Input
                id="breakTitle"
                value={newBreak.title}
                onChange={(e) =>
                  setNewBreak({ ...newBreak, title: e.target.value })
                }
                placeholder="Lunch Break"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={newBreak.start}
                onChange={(e) =>
                  setNewBreak({ ...newBreak, start: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={newBreak.end}
                onChange={(e) =>
                  setNewBreak({ ...newBreak, end: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="breakBarber">Barber (Optional)</Label>
              <Select
                value={newBreak.barberId}
                onValueChange={(value) =>
                  setNewBreak({ ...newBreak, barberId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All barbers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectContent>All barbers</SelectContent>
                  {mockBarbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id.toString()}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBreakDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateBreak}>Add Break</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
