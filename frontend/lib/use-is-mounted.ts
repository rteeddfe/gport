"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * False during the server render and the hydration render, true after —
 * the useSyncExternalStore-based useIsMounted. Gate client-fetch derived
 * output (React Query state) with it so the server markup and the
 * hydration render always agree: TanStack can complete a fetch between the
 * server passes, so the served HTML may already hold data the client's
 * first render does not — that attribute mismatch aborts hydration of the
 * whole page segment (observed: the checkout froze on «Загружаем…» with a
 * dead submit button).
 */
export function useIsMounted(): boolean {
  return useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
}
