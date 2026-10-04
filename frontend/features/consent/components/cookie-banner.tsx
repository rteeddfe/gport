"use client";

import { Cookie } from "lucide-react";
import Link from "next/link";
import { useCallback, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const CONSENT_KEY = "gport-cookie-consent";

const consentSubscribers = new Set<() => void>();

function subscribeConsent(callback: () => void) {
  consentSubscribers.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    consentSubscribers.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getConsent(): string | null {
  try {
    return window.localStorage.getItem(CONSENT_KEY);
  } catch {
    // Storage can be unavailable (private mode) — keep showing the notice.
    return null;
  }
}

/** Cookie notice fixed to the bottom-left (the support bubble owns the
 * right corner). Shows on storefront pages until the visitor accepts;
 * the choice persists in localStorage only — no consent backend yet. */
export function CookieBanner() {
  // Server snapshot renders nothing: SSR output is empty and hydration
  // swaps in the real value without a mismatch.
  const consent = useSyncExternalStore(subscribeConsent, getConsent, () => "accepted");

  const accept = useCallback(() => {
    try {
      window.localStorage.setItem(CONSENT_KEY, "accepted");
    } catch {
      // Same as above — the banner returns on the next visit.
    }
    consentSubscribers.forEach((callback) => callback());
  }, []);

  if (consent !== null) return null;

  return (
    <div
      role="region"
      aria-label="Использование cookie"
      className="border-border bg-surface/90 animate-in fade-in-0 slide-in-from-bottom-4 duration-300 fixed right-4 bottom-20 left-4 z-40 flex items-center gap-3 rounded-2xl border p-4 shadow-[0_10px_50px_-14px_rgba(139,92,246,0.45)] backdrop-blur sm:right-auto sm:bottom-4 sm:max-w-md md:bottom-6"
    >
      <span
        aria-hidden
        className="bg-neon/10 text-neon grid size-10 shrink-0 place-items-center rounded-xl"
      >
        <Cookie className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Мы используем cookie</p>
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
          Файлы cookie нужны, чтобы сайт работал корректно: помнить ваш вход
          и настройки.{" "}
          <Link
            href="/policies/privacy"
            className="text-neon hover:underline"
          >
            Политика конфиденциальности
          </Link>
          .
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        className="h-9 shrink-0 px-4 text-xs font-semibold"
        onClick={accept}
      >
        Принять
      </Button>
    </div>
  );
}
