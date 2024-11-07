"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";

interface AppointmentActionsProps {
  id: number;
  status: string;
  onStatusChange: (newStatus: string) => void;
}

export function AppointmentActions({
  id,
  status,
  onStatusChange,
}: AppointmentActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStatus = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      onStatusChange(newStatus);
      toast.success(`Appointment ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update appointment status");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isUpdating}>
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {status === "pending" && (
          <>
            <DropdownMenuItem onClick={() => updateStatus("confirmed")}>
              <Check className="mr-2 size-4 text-green-500" />
              Confirm
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus("cancelled")}>
              <X className="mr-2 size-4 text-red-500" />
              Cancel
            </DropdownMenuItem>
          </>
        )}
        {status === "confirmed" && (
          <DropdownMenuItem onClick={() => updateStatus("completed")}>
            <Check className="mr-2 size-4 text-blue-500" />
            Mark as Completed
          </DropdownMenuItem>
        )}
        {status === "cancelled" && (
          <DropdownMenuItem onClick={() => updateStatus("pending")}>
            <Clock className="mr-2 size-4 text-yellow-500" />
            Reopen
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
