"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { type Barber } from "@/drizzle/schema";
import {
  getBarberSchedule,
  updateBarberSchedule,
} from "@/server/actions/barbers";
import {
  WeeklyScheduleEditor,
  createDefaultSchedule,
  DAYS_OF_WEEK,
  type WorkingHoursSchedule,
} from "@/components/dashboard";

interface ScheduleDialogProps {
  member: Barber | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleDialog({
  member,
  open,
  onOpenChange,
}: ScheduleDialogProps) {
  const [workingHours, setWorkingHours] = useState<WorkingHoursSchedule>(
    createDefaultSchedule(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadSchedule() {
      if (!member || !open) return;

      setIsLoading(true);
      try {
        const schedule = await getBarberSchedule(member.id);

        if (schedule.length > 0) {
          const scheduleMap: WorkingHoursSchedule = createDefaultSchedule();

          for (const entry of schedule) {
            const slots = entry.availableSlots as
              | { start: string; end: string }[]
              | null;
            const timeSlots =
              entry.isWorking && slots && slots.length > 0
                ? slots.map((slot) => ({
                    start: slot.start,
                    end: slot.end,
                    id: crypto.randomUUID(),
                  }))
                : entry.isWorking
                  ? [
                      {
                        start: entry.startTime,
                        end: entry.endTime,
                        id: crypto.randomUUID(),
                      },
                    ]
                  : [];

            scheduleMap[entry.dayOfWeek] = {
              isWorking: entry.isWorking,
              timeSlots,
            };
          }

          setWorkingHours(scheduleMap);
        } else {
          setWorkingHours(createDefaultSchedule());
        }
      } catch {
        toast.error("Failed to load schedule");
      } finally {
        setIsLoading(false);
      }
    }

    loadSchedule();
  }, [member, open]);

  const handleSave = async () => {
    if (!member) return;

    setIsSaving(true);
    try {
      const scheduleData: Record<
        number,
        { isWorking: boolean; slots: { start: string; end: string }[] }
      > = {};

      for (const { dayIndex } of DAYS_OF_WEEK) {
        const daySchedule = workingHours[dayIndex];
        scheduleData[dayIndex] = {
          isWorking: daySchedule.isWorking,
          slots: daySchedule.timeSlots.map((slot) => ({
            start: slot.start,
            end: slot.end,
          })),
        };
      }

      await updateBarberSchedule(member.id, scheduleData);
      toast.success("Schedule updated successfully");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save schedule");
    } finally {
      setIsSaving(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Weekly Schedule - {member.name}</DialogTitle>
          <DialogDescription>
            Set the regular working hours for this team member
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="p-1">
              <WeeklyScheduleEditor
                schedule={workingHours}
                onChange={setWorkingHours}
                disabled={isSaving}
              />
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Schedule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
