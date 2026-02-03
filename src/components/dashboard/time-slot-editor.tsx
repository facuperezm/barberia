"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

export interface TimeSlot {
  start: string;
  end: string;
  id: string;
}

interface TimeSlotEditorProps {
  slot: TimeSlot;
  onUpdate: (id: string, field: "start" | "end", value: string) => void;
  onRemove: (id: string) => void;
  canRemove?: boolean;
  disabled?: boolean;
}

export function TimeSlotEditor({
  slot,
  onUpdate,
  onRemove,
  canRemove = true,
  disabled = false,
}: TimeSlotEditorProps) {
  return (
    <div className="flex items-end gap-3">
      <div className="grid gap-1.5">
        <Label className="text-xs">Start</Label>
        <Input
          type="time"
          value={slot.start}
          onChange={(e) => onUpdate(slot.id, "start", e.target.value)}
          className="w-32"
          disabled={disabled}
        />
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs">End</Label>
        <Input
          type="time"
          value={slot.end}
          onChange={(e) => onUpdate(slot.id, "end", e.target.value)}
          className="w-32"
          disabled={disabled}
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(slot.id)}
        disabled={!canRemove || disabled}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
