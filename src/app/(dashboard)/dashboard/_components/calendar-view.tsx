"use client";

import {
  Calendar,
  dateFnsLocalizer,
  type SlotInfo,
  type View,
} from "react-big-calendar";
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
import {
  useAppointments,
  useCreateAppointment,
} from "@/hooks/use-appointments";
import { useBreaks, useCreateBreak } from "@/hooks/use-breaks";
import { toast } from "sonner"; // For notifications
import { Skeleton } from "@/components/ui/skeleton";

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

interface Appointment {
  id: number;
  customerName: string;
  barberId: number;
  serviceId: number;
  start: string;
  end: string;
  service: string;
  isBreak: false; // Add this line
}

interface BreakPeriod {
  id: number;
  title: string;
  start: string;
  end: string;
  barberId?: number | null;
  isBreak: true; // Add this line
  resourceId?: number | null;
}

// Utility function to combine appointments and breaks
const combineEvents = (appointments: Appointment[], breaks: BreakPeriod[]) => {
  return [...appointments, ...breaks].map((event) => ({
    ...event,
    resourceId: "barberId" in event ? event.barberId : event.resourceId,
  }));
};

export function CalendarView() {
  const [view, setView] = useState<View>("day");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBreakDialogOpen, setIsBreakDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
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

  const { data: appointments, isLoading: isAppointmentsLoading } =
    useAppointments();
  const { data: breaks, isLoading: isBreaksLoading } = useBreaks();

  const { mutate: createAppointment, isLoading: isCreatingAppointment } =
    useCreateAppointment();
  const { mutate: createBreak, isLoading: isCreatingBreak } = useCreateBreak();

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    setSelectedSlot(slotInfo);
    setIsDialogOpen(true);
  };

  const handleCreateAppointment = () => {
    if (
      !selectedSlot ||
      !newAppointment.customerName ||
      !newAppointment.barberId ||
      !newAppointment.serviceId
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    // Fetch service details (assuming services are fetched or available)
    // For demonstration, we'll mock service duration
    const serviceDuration = 30; // Replace with actual service duration

    const endTime = new Date(selectedSlot.start);
    endTime.setMinutes(endTime.getMinutes() + serviceDuration);

    const appointmentData = {
      customerName: newAppointment.customerName,
      barberId: Number(newAppointment.barberId),
      serviceId: Number(newAppointment.serviceId),
      start: selectedSlot.start.toISOString(),
      end: endTime.toISOString(),
      service: "Service Name", // Replace with actual service name
    };

    createAppointment(appointmentData, {
      onSuccess: () => {
        toast.success("Appointment created successfully.");
        setIsDialogOpen(false);
        setNewAppointment({ customerName: "", barberId: "", serviceId: "" });
      },
      onError: () => {
        toast.error("Failed to create appointment.");
      },
    });
  };

  const handleCreateBreak = () => {
    if (!newBreak.title || !newBreak.start || !newBreak.end) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const breakPeriod = {
      title: newBreak.title,
      start: new Date(`1970-01-01T${newBreak.start}`).toISOString(),
      end: new Date(`1970-01-01T${newBreak.end}`).toISOString(),
      resourceId: newBreak.barberId ? Number(newBreak.barberId) : null,
    };

    createBreak(breakPeriod, {
      onSuccess: () => {
        toast.success("Break period added successfully.");
        setIsBreakDialogOpen(false);
        setNewBreak({ title: "", start: "", end: "", barberId: "" });
      },
      onError: () => {
        toast.error("Failed to add break period.");
      },
    });
  };

  if (isAppointmentsLoading || isBreaksLoading) {
    return <Skeleton className="h-[700px] w-full" />;
  }

  const allEvents = combineEvents(appointments || [], breaks || []);

  const getEventStyle = (event: Appointment | BreakPeriod) => ({
    backgroundColor: event.isBreak ? "#f3f4f6" : "#3b82f6",
    color: "#fff",
    borderRadius: "0.375rem",
    padding: "0.5rem",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs
          value={view}
          onValueChange={(value: string) => setView(value as View)}
        >
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
          view={view}
          onView={(newView) => setView(newView)}
          resources={[] /* Add barber resources if needed */}
          resourceIdAccessor="resourceId"
          eventPropGetter={(event) => ({
            style: getEventStyle(event as Appointment | BreakPeriod),
          })}
        />
      </div>

      {/* Create Appointment Dialog */}
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
                placeholder="John Doe"
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
                  {/* Replace with actual barber data */}
                  <SelectItem value="1">John Doe</SelectItem>
                  <SelectItem value="2">Jane Smith</SelectItem>
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
                  {/* Replace with actual service data */}
                  <SelectItem value="1">Haircut (30 min)</SelectItem>
                  <SelectItem value="2">Beard Trim (20 min)</SelectItem>
                  <SelectItem value="3">Full Service (60 min)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateAppointment}
              disabled={isCreatingAppointment}
            >
              {isCreatingAppointment ? "Creating..." : "Create Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Break Dialog */}
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
                  <SelectItem value="">All Barbers</SelectItem>
                  {/* Replace with actual barber data */}
                  <SelectItem value="1">John Doe</SelectItem>
                  <SelectItem value="2">Jane Smith</SelectItem>
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
            <Button onClick={handleCreateBreak} disabled={isCreatingBreak}>
              {isCreatingBreak ? "Adding..." : "Add Break"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
