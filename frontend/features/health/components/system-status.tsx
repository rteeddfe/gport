"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useHealth } from "../hooks/use-health";

function StatusRow({ label, ok, pending }: { label: string; ok?: boolean; pending?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-4 border-b py-2 last:border-b-0">
      <span className="text-sm">{label}</span>
      {pending ? (
        <Skeleton className="h-5 w-14" />
      ) : (
        <Badge variant={ok ? "secondary" : "destructive"}>{ok ? "OK" : "Down"}</Badge>
      )}
    </li>
  );
}

export function SystemStatus() {
  const { data, isPending, isError } = useHealth();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-sm rounded-lg border p-4"
      data-testid="system-status"
    >
      <ul>
        <StatusRow label="API status" ok={!isError && !isPending} pending={isPending} />
        <StatusRow label="Backend status" ok={Boolean(data)} pending={isPending} />
        <StatusRow label="Database status" ok={data?.database === "up"} pending={isPending} />
      </ul>
    </motion.div>
  );
}
