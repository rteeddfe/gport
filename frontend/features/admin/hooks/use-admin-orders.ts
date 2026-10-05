"use client";

import { useQuery } from "@tanstack/react-query";

import {
  adminGetOrders,
  type FindOrdersParams,
} from "@/services/orders.service";

export function useAdminOrders(params: FindOrdersParams = {}) {
  return useQuery({
    queryKey: ["admin-orders", params],
    queryFn: () => adminGetOrders(params),
  });
}
