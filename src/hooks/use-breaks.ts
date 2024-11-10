import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface BreakPeriod {
  id: string;
  title: string;
  start: string; // ISO string
  end: string; // ISO string
  resourceId: number | null;
  isBreak: boolean;
}

const fetchBreaks = async (): Promise<BreakPeriod[]> => {
  const res = await fetch("/api/breaks");
  if (!res.ok) {
    throw new Error("Failed to fetch breaks");
  }
  return res.json();
};

const createBreak = async (newBreak: Omit<BreakPeriod, "isBreak">) => {
  const res = await fetch("/api/breaks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...newBreak, isBreak: true }),
  });
  if (!res.ok) {
    throw new Error("Failed to create break");
  }
  return res.json();
};

export const useBreaks = () => {
  return useQuery<BreakPeriod[], Error>({
    queryKey: ["breaks"],
    queryFn: fetchBreaks,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useCreateBreak = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBreak,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["breaks"] });
    },
  });
};
