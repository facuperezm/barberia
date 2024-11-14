import { db } from "@/drizzle";
import { appointments } from "@/drizzle/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface ReservationData {
  service: string;
  barber: string;
  date: string;
  time: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const makeReservation = async (
  data: ReservationData,
): Promise<{ success: boolean }> => {
  await db.insert(appointments).values({
    ...data,
    barberId: Number(data.barber),
    serviceId: Number(data.service),
    customerName: `${data.firstName} ${data.lastName}`,
    customerEmail: data.email,
    customerPhone: data.phone,
  });

  return { success: true };
};

export const useMakeReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: makeReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availableTimes"] });
      // Optionally, invalidate other queries if necessary
    },
  });
};
