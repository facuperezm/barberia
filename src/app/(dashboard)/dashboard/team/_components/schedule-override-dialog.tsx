"use client";

import { useState, useEffect } from "react";
import { formatDate, formatDateISO, today } from "@/lib/dates";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Plus,
  X,
  CalendarOff,
  CalendarCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { type Barber, type ScheduleOverride } from "@/drizzle/schema";
import {
  getScheduleOverrides,
  saveScheduleOverride,
  deleteScheduleOverride,
} from "@/server/actions/schedule-overrides";

interface TimeSlot {
  start: string;
  end: string;
  id: string;
}

interface ScheduleOverrideDialogProps {
  member: Barber | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleOverrideDialog({
  member,
  open,
  onOpenChange,
}: ScheduleOverrideDialogProps) {
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state for new override
  const [date, setDate] = useState("");
  const [isWorkingDay, setIsWorkingDay] = useState(false);
  const [reason, setReason] = useState("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { start: "09:00", end: "17:00", id: crypto.randomUUID() },
  ]);

  useEffect(() => {
    async function fetchOverrides() {
      if (!member || !open) return;

      setIsLoading(true);
      try {
        const result = await getScheduleOverrides(member.id);
        if (result.success && result.overrides) {
          setOverrides(result.overrides);
        } else {
          toast.error(result.error || "Failed to load schedule exceptions");
        }
      } catch {
        toast.error("An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchOverrides();
  }, [member, open]);

  const resetForm = () => {
    setDate("");
    setIsWorkingDay(false);
    setReason("");
    setTimeSlots([{ start: "09:00", end: "17:00", id: crypto.randomUUID() }]);
    setShowAddForm(false);
  };

  const addTimeSlot = () => {
    setTimeSlots([
      ...timeSlots,
      { start: "09:00", end: "17:00", id: crypto.randomUUID() },
    ]);
  };

  const removeTimeSlot = (id: string) => {
    if (timeSlots.length > 1) {
      setTimeSlots(timeSlots.filter((slot) => slot.id !== id));
    }
  };

  const updateTimeSlot = (
    id: string,
    field: "start" | "end",
    value: string,
  ) => {
    setTimeSlots(
      timeSlots.map((slot) =>
        slot.id === id ? { ...slot, [field]: value } : slot,
      ),
    );
  };

  const handleSave = async () => {
    if (!member || !date) {
      toast.error("Please select a date");
      return;
    }

    setIsSaving(true);
    try {
      const availableSlots = isWorkingDay
        ? timeSlots.map((slot) => `${slot.start}-${slot.end}`)
        : [];

      const result = await saveScheduleOverride({
        barberId: String(member.id),
        date,
        isWorkingDay,
        availableSlots,
        reason,
      });

      if (result.success && result.override) {
        toast.success("Schedule exception added");
        setOverrides([...overrides, result.override]);
        resetForm();
      } else {
        toast.error(result.error || "Failed to save schedule exception");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (overrideId: number) => {
    setDeletingId(overrideId);
    try {
      const result = await deleteScheduleOverride(overrideId);
      if (result.success) {
        setOverrides(overrides.filter((o) => o.id !== overrideId));
        toast.success("Schedule exception deleted");
      } else {
        toast.error(result.error || "Failed to delete exception");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setDeletingId(null);
    }
  };

  const formatSlots = (
    slots: { start: string; end: string }[] | null,
  ): string => {
    if (!slots || slots.length === 0) return "No time slots";
    return slots.map((s) => `${s.start} - ${s.end}`).join(", ");
  };

  if (!member) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) resetForm();
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule Exceptions - {member.name}</DialogTitle>
          <DialogDescription>
            Add days off or special working hours that override the regular
            schedule
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-1">
              {/* Existing Overrides List */}
              {overrides.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Current Exceptions
                  </h4>
                  {overrides.map((override) => (
                    <div
                      key={override.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        {override.isWorkingDay ? (
                          <CalendarCheck className="size-5 text-green-500" />
                        ) : (
                          <CalendarOff className="size-5 text-red-500" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {formatDate(override.date, "full")}
                            </span>
                            <Badge
                              variant={
                                override.isWorkingDay ? "default" : "secondary"
                              }
                            >
                              {override.isWorkingDay ? "Working" : "Day Off"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {override.isWorkingDay
                              ? formatSlots(override.availableSlots)
                              : override.reason || "No reason provided"}
                          </div>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            disabled={deletingId === override.id}
                          >
                            {deletingId === override.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Exception?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the schedule exception for{" "}
                              {formatDate(override.date, "long")}.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(override.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              )}

              {overrides.length > 0 && <Separator />}

              {/* Add New Override */}
              {!showAddForm ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="mr-2 size-4" />
                  Add New Exception
                </Button>
              ) : (
                <div className="space-y-4 rounded-lg border p-4">
                  <h4 className="font-medium">Add New Exception</h4>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="override-date">Date</Label>
                      <Input
                        id="override-date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        min={formatDateISO(today())}
                      />
                    </div>

                    <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                      <Label htmlFor="is-working">Working Day</Label>
                      <Switch
                        id="is-working"
                        checked={isWorkingDay}
                        onCheckedChange={setIsWorkingDay}
                      />
                    </div>
                  </div>

                  {isWorkingDay ? (
                    <div className="space-y-3">
                      <Label>Working Hours</Label>
                      {timeSlots.map((slot) => (
                        <div key={slot.id} className="flex items-end gap-3">
                          <div className="grid gap-1.5">
                            <Label className="text-xs">Start</Label>
                            <Input
                              type="time"
                              value={slot.start}
                              onChange={(e) =>
                                updateTimeSlot(slot.id, "start", e.target.value)
                              }
                              className="w-32"
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-xs">End</Label>
                            <Input
                              type="time"
                              value={slot.end}
                              onChange={(e) =>
                                updateTimeSlot(slot.id, "end", e.target.value)
                              }
                              className="w-32"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTimeSlot(slot.id)}
                            disabled={timeSlots.length === 1}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addTimeSlot}>
                        <Plus className="mr-2 size-4" />
                        Add Time Slot
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <Label htmlFor="reason">Reason (Optional)</Label>
                      <Textarea
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g., Vacation, Personal day, Holiday..."
                        rows={2}
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || !date}>
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Add Exception"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
