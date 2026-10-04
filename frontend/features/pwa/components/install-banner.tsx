"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useCallback, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { detectInstallPlatform, isStandaloneDisplay, type InstallPlatform } from "../platform";
import { InstallInstructionsDialog } from "./install-instructions-dialog";

const DISMISSED_KEY = "gport-install-banner-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Chrome fires beforeinstallprompt once, early — capture it at module level
// so the banner can use the native install flow even if it mounts later.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const PROMPT_EVENT = "gport:install-prompt-change";
const dismissedSubscribers = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event(PROMPT_EVENT));
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    window.dispatchEvent(new Event(PROMPT_EVENT));
  });
}

function subscribeNoop() {
  return () => {};
}

function subscribePromptChange(callback: () => void) {
  window.addEventListener(PROMPT_EVENT, callback);
  return () => window.removeEventListener(PROMPT_EVENT, callback);
}

function subscribeDismissed(callback: () => void) {
  dismissedSubscribers.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    dismissedSubscribers.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    // Storage can be unavailable (private mode) — just show the banner.
    return false;
  }
}

/** Smart app banner above the header capsule: iOS Safari gets the
 * "add to home screen" steps, Android Chrome gets the native install
 * prompt (with the same steps as fallback). Hidden on desktop, once
 * installed, or after the user closes it. */
export function InstallBanner() {
  // Browser-only state via useSyncExternalStore: the server snapshots keep
  // SSR output empty, hydration swaps in the real values without a mismatch.
  const platform = useSyncExternalStore(
    subscribeNoop,
    () => detectInstallPlatform(window.navigator.userAgent, window.navigator.maxTouchPoints),
    () => "desktop" as InstallPlatform,
  );
  const standalone = useSyncExternalStore(
    subscribeNoop,
    isStandaloneDisplay,
    () => true,
  );
  const hasNativePrompt = useSyncExternalStore(
    subscribePromptChange,
    () => deferredPrompt !== null,
    () => false,
  );
  const dismissed = useSyncExternalStore(
    subscribeDismissed,
    getDismissed,
    () => true,
  );

  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Same as above — banner returns on next visit.
    }
    dismissedSubscribers.forEach((callback) => callback());
  }, []);

  const install = useCallback(async () => {
    if (deferredPrompt) {
      const event = deferredPrompt;
      deferredPrompt = null;
      await event.prompt();
      await event.userChoice;
      window.dispatchEvent(new Event(PROMPT_EVENT));
      return;
    }
    setInstructionsOpen(true);
  }, []);

  const visible = platform !== "desktop" && !standalone && !dismissed;

  return (
    <>
      {visible ? (
        <div
          role="region"
          aria-label="Установка приложения GPort"
          className="border-border bg-surface/90 pointer-events-auto mb-2.5 flex items-center gap-3 rounded-2xl border p-3 shadow-[0_10px_50px_-14px_rgba(139,92,246,0.45)] backdrop-blur"
        >
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {platform === "ios" ? "Добавьте GPort на экран «Домой»" : "Установите приложение GPort"}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              Иконка на рабочем экране и запуск без браузера
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-9 shrink-0 px-4 text-xs font-semibold"
            onClick={platform === "android" && hasNativePrompt ? install : () => setInstructionsOpen(true)}
          >
            {platform === "ios" ? "Как добавить" : hasNativePrompt ? "Установить" : "Как установить"}
          </Button>
          <button
            type="button"
            aria-label="Скрыть баннер установки"
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground hover:border-border grid size-8 shrink-0 place-items-center rounded-full border border-transparent transition-colors"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : null}

      <InstallInstructionsDialog
        open={instructionsOpen}
        onOpenChange={setInstructionsOpen}
        initialPlatform={platform === "android" ? "android" : "ios"}
      />
    </>
  );
}
