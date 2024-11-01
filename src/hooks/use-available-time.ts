import { db } from "@/db";
import { reservations } from "@/db/schema";
import { useQuery } from "@tanstack/react-query";
import { eq } from "drizzle-orm";

export interface TimeSlot {
  time: string; // e.g., "09:00", "09:30", etc.
}

const fetchAvailableTimes = async (
  date: string,
  barberId: string,
): Promise<TimeSlot[]> => {
  const response = await db
    .select()
    .from(reservations)
    .where(
      eq(reservations.date, date) &&
        eq(reservations.serviceId, Number(barberId)),
    );
  if (!response.length) {
    throw new Error("Network response was not ok");
  }
  const times: string[] = await response.map((reservation) => reservation.time);
  return times.map((time) => ({ time }));
};

export const useAvailableTimes = (date: string, barberId: string) => {
  return useQuery<TimeSlot[], Error>({
    queryKey: ["availableTimes", date, barberId],
    queryFn: () => fetchAvailableTimes(date, barberId),
    enabled: !!date && !!barberId,
    staleTime: 1000 * 60, // 1 minute
    retry: 1,
  });
};
