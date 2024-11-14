import { useQuery } from "@tanstack/react-query";
import { db } from "@/drizzle";
import { services } from "@/drizzle/schema";

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

const fetchServices = async (): Promise<Service[]> => {
  const response = await db.select().from(services);
  return response.map((service) => ({
    ...service,
    id: service.id.toString(),
    price: service.price,
  }));
};

export const useServices = () => {
  return useQuery<Service[], Error>({
    queryKey: ["services"],
    queryFn: fetchServices,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
