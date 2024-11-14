"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface TimeSlot {
  start: string;
  end: string;
}

export function ScheduleOverrides() {
  const [selectedBarber, setSelectedBarber] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [isWorkingDay, setIsWorkingDay] = useState(true);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { start: "09:00", end: "17:00" },
  ]);
  const [reason, setReason] = useState("");

  const handleAddTimeSlot = () => {
    setTimeSlots([...timeSlots, { start: "09:00", end: "17:00" }]);
  };

  const handleRemoveTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const handleTimeChange = (
    index: number,
    field: "start" | "end",
    value: string,
  ) => {
    setTimeSlots(
      timeSlots.map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot,
      ),
    );
  };

  const handleSave = async () => {
    if (!selectedBarber || !selectedDate) {
      toast.error("Please select a barber and date");
      return;
    }

    try {
      const response = await fetch("/api/schedule-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId: selectedBarber,
          date: format(selectedDate, "yyyy-MM-dd"),
          isWorkingDay,
          availableSlots: isWorkingDay ? timeSlots : [],
          reason,
        }),
      });

      if (!response.ok) throw new Error("Failed to save override");
      toast.success("Schedule override saved successfully");

      // Reset form
      setSelectedDate(undefined);
      setIsWorkingDay(true);
      setTimeSlots([{ start: "09:00", end: "17:00" }]);
      setReason("");
    } catch (error) {
      toast.error("Failed to save schedule override");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Select Barber</Label>
        <Select value={selectedBarber} onValueChange={setSelectedBarber}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a barber" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6">John Doe</SelectItem>
            <SelectItem value="2">Jane Smith</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Select Date</Label>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border"
        />
      </div>

      <div className="space-y-2">
        <Label>Working Status</Label>
        <Select
          value={isWorkingDay ? "working" : "not-working"}
          onValueChange={(value) => setIsWorkingDay(value === "working")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="working">Working</SelectItem>
            <SelectItem value="not-working">Not Working</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isWorkingDay && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Available Time Slots</Label>
            <Button variant="outline" size="sm" onClick={handleAddTimeSlot}>
              <Plus className="mr-1 h-4 w-4" />
              Add Time Slot
            </Button>
          </div>

          <div className="space-y-2">
            {timeSlots.map((slot, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  type="time"
                  value={slot.start}
                  onChange={(e) =>
                    handleTimeChange(index, "start", e.target.value)
                  }
                />
                <span>to</span>
                <Input
                  type="time"
                  value={slot.end}
                  onChange={(e) =>
                    handleTimeChange(index, "end", e.target.value)
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveTimeSlot(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Reason for Override</Label>
        <Textarea
          value={reason}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setReason(e.target.value)
          }
          placeholder="e.g., Vacation, Training, Special Event"
        />
      </div>

      <Button onClick={handleSave} className="w-full">
        Save Override
      </Button>
    </div>
  );
}
