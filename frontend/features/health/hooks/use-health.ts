import { useQuery } from "@tanstack/react-query";
import { getHealth } from "@/services/health.service";

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    staleTime: 15_000,
  });
}
