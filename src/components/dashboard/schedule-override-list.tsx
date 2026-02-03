"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/dates";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, CalendarOff, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import {
  getScheduleOverrides,
  deleteScheduleOverride,
} from "@/server/actions/schedule-overrides";
import type { ScheduleOverride } from "@/drizzle/schema";
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

interface ScheduleOverrideListProps {
  barberId: number;
  barberName: string;
}

export function ScheduleOverrideList({
  barberId,
  barberName,
}: ScheduleOverrideListProps) {
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchOverrides() {
      setIsLoading(true);
      try {
        const result = await getScheduleOverrides(barberId);
        if (result.success && result.overrides) {
          setOverrides(result.overrides);
        } else {
          toast.error(result.error || "Failed to load schedule overrides");
        }
      } catch {
        toast.error("An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchOverrides();
  }, [barberId]);

  const handleDelete = async (overrideId: number) => {
    setDeletingId(overrideId);
    try {
      const result = await deleteScheduleOverride(overrideId);
      if (result.success) {
        setOverrides((prev) => prev.filter((o) => o.id !== overrideId));
        toast.success("Schedule override deleted");
      } else {
        toast.error(result.error || "Failed to delete override");
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Schedule Exceptions</CardTitle>
          <CardDescription>
            Days off and special hours for {barberName}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Exceptions</CardTitle>
        <CardDescription>
          Days off and special hours for {barberName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {overrides.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No schedule exceptions set
          </p>
        ) : (
          <div className="space-y-3">
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
                        variant={override.isWorkingDay ? "default" : "secondary"}
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
                      <AlertDialogTitle>Delete Override?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the schedule exception for{" "}
                        {formatDate(override.date, "long")}. This
                        action cannot be undone.
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
      </CardContent>
    </Card>
  );
}
