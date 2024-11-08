import { db } from "@/db";
import { barbers } from "@/db/schema";
import { useQuery } from "@tanstack/react-query";

export interface Barber {
  id: string;
  name: string;
  // Add more fields if necessary
}

const fetchBarbers = async (): Promise<Barber[]> => {
  const response = await db.select().from(barbers);
  return response.map((barber) => ({
    ...barber,
    id: barber.id.toString(),
  }));
};

export const useBarbers = () => {
  return useQuery<Barber[], Error>({
    queryKey: ["barbers"],
    queryFn: fetchBarbers,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
};
