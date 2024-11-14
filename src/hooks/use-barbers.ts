import { db } from "@/drizzle";
import { barbers } from "@/drizzle/schema";
import { type Barber } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

const fetchBarbers = async (): Promise<Barber[]> => {
  const response = await db.select().from(barbers);

  return response;
};

export const useBarbers = () => {
  return useQuery<Barber[], Error>({
    queryKey: ["barbers"],
    queryFn: fetchBarbers,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
};
