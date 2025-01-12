"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAppointmentStatus } from "@/server/actions/appointments";

interface AppointmentActionsProps {
  id: number;
  status: string;
}

export function AppointmentActions({ id, status }: AppointmentActionsProps) {
  const queryClient = useQueryClient();

  const { mutate: updateAppointment, isPending: isUpdating } = useMutation({
    mutationFn: (params: { id: number; status: string }) =>
      updateAppointmentStatus(Number(params.id), params.status),
    onMutate: () => {
      toast.loading("Updating appointment status...");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Appointment status updated successfully.");
    },
    onError: () => {
      toast.error("Failed to update appointment status.");
    },
    onSettled: () => {
      toast.dismiss();
    },
  });

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
            <DropdownMenuItem
              onClick={() => updateAppointment({ id, status: "confirmed" })}
            >
              <Check className="mr-2 size-4 text-green-500" />
              Confirm
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => updateAppointment({ id, status: "cancelled" })}
            >
              <X className="mr-2 size-4 text-red-500" />
              Cancel
            </DropdownMenuItem>
          </>
        )}
        {status === "confirmed" && (
          <DropdownMenuItem
            onClick={() => updateAppointment({ id, status: "completed" })}
          >
            <Check className="mr-2 size-4 text-blue-500" />
            Mark as Completed
          </DropdownMenuItem>
        )}
        {status === "cancelled" ||
          (status === "completed" && (
            <DropdownMenuItem
              onClick={() => updateAppointment({ id, status: "pending" })}
            >
              <Clock className="mr-2 size-4 text-yellow-500" />
              Reopen
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
