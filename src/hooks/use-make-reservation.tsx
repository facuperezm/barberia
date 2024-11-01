import { db } from "@/db";
import { reservations } from "@/db/schema";
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
  await db.insert(reservations).values({
    ...data,
    serviceId: Number(data.service),
  });

  return { success: true };
};

export const useMakeReservation = () => {
  const queryClient = useQueryClient();

  return useMutation(makeReservation, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availableTimes"] });
      // Optionally, invalidate other queries if necessary
    },
  });
};
