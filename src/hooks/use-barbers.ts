import { db } from "@/db";
import { employees } from "@/db/schema";
import { useQuery } from "@tanstack/react-query";

export interface Barber {
  id: string;
  name: string;
  // Add more fields if necessary
}

const fetchBarbers = async (): Promise<Barber[]> => {
  const response = await db.select().from(employees);
  return response.map((employee) => ({
    ...employee,
    id: employee.id.toString(),
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
