"use client";

import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@/components/ui/skeleton";
import { getHomeContent } from "@/services/home-content.service";
import { HomeContentForm } from "./home-content-form";

/** Data wrapper for the admin home-content form (client-side query). */
export function HomeContentSection() {
  const query = useQuery({ queryKey: ["home-content"], queryFn: getHomeContent });

  if (query.isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (query.isError) {
    return (
      <p className="text-destructive text-sm">
        Не удалось загрузить контент: {query.error.message}
      </p>
    );
  }
  return <HomeContentForm content={query.data} />;
}
