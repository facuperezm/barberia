// src/hooks/useAppointments.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Appointment {
  id: number;
  customerName: string;
  service: string;
  time: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  barberId: number;
  serviceId: number;
  start: string; // ISO string
  end: string; // ISO string
}

const fetchAppointments = async (
  employeeId?: string,
): Promise<Appointment[]> => {
  const res = await fetch(
    `/api/appointments${employeeId ? `?employeeId=${employeeId}` : ""}`,
  );
  if (!res.ok) {
    throw new Error("Failed to fetch appointments");
  }
  return res.json();
};

const createAppointment = async (
  appointment: Omit<Appointment, "id" | "status">,
) => {
  const res = await fetch("/api/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...appointment, status: "pending" }),
  });
  if (!res.ok) {
    throw new Error("Failed to create appointment");
  }
  return res.json();
};

export const useAppointments = (employeeId?: string) => {
  return useQuery<Appointment[], Error>({
    queryKey: ["appointments", employeeId],
    queryFn: () => fetchAppointments(employeeId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
};
