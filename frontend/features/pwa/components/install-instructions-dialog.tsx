"use client";

import Image from "next/image";
import { Check, Download, MoreVertical, Plus, Share } from "lucide-react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type InstructionPlatform = "ios" | "android";

const IOS_STEPS = [
  { icon: Share, text: "Откройте gport.ru в Safari и нажмите «Поделиться» внизу экрана" },
  { icon: Plus, text: "В списке выберите «На экран „Домой“»" },
  { icon: Check, text: "Нажмите «Добавить» — иконка GPort появится на рабочем экране" },
];

const ANDROID_STEPS = [
  { icon: MoreVertical, text: "Откройте gport.ru в Chrome и нажмите меню ⋮ справа вверху" },
  { icon: Download, text: "Выберите «Установить приложение» (или «Добавить на главный экран»)" },
  { icon: Check, text: "Подтвердите установку — иконка GPort появится на рабочем экране" },
];

const PLATFORM_TABS = [
  { value: "ios" as const, label: "iPhone / Safari" },
  { value: "android" as const, label: "Android / Chrome" },
];

function platformTabClass(active: boolean): string {
  return cn(
    "rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
    active
      ? "border-brand bg-brand text-white"
      : "border-border text-muted-foreground hover:border-brand/50 hover:text-foreground",
  );
}

/** Step-by-step "add to home screen" guidance; the platform is preset by the
 * entry point (smart banner or the footer app icons) and can be switched. */
export function InstallInstructionsDialog({
  open,
  onOpenChange,
  initialPlatform = "ios",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPlatform?: InstructionPlatform;
}) {
  const [platform, setPlatform] = useState<InstructionPlatform>(initialPlatform);
  // Re-preset the platform when the entry point changes — adjusted during
  // render (the React-documented pattern) instead of an effect.
  const [preset, setPreset] = useState(initialPlatform);
  if (preset !== initialPlatform) {
    setPreset(initialPlatform);
    setPlatform(initialPlatform);
  }

  const steps = platform === "ios" ? IOS_STEPS : ANDROID_STEPS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <Image src="/icons/icon-192.png" alt="" width={32} height={32} className="size-8 rounded-lg" />
            Добавить GPort на рабочий экран
          </DialogTitle>
          <DialogDescription>
            GPort работает как обычное приложение: своя иконка и полноэкранный
            режим без панели браузера.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2" role="group" aria-label="Платформа">
          {PLATFORM_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              aria-pressed={platform === tab.value}
              onClick={() => setPlatform(tab.value)}
              className={platformTabClass(platform === tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <ol className="mt-1 grid gap-3">
          {steps.map((step, index) => (
            <li key={step.text} className="flex items-start gap-3">
              <span className="bg-brand/15 text-brand-bright mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl">
                <step.icon className="size-4" aria-hidden />
              </span>
              <span className="text-sm leading-relaxed text-foreground/85">
                <span className="text-muted-foreground mr-1.5 text-xs font-semibold">
                  {index + 1}.
                </span>
                {step.text}
              </span>
            </li>
          ))}
        </ol>

        <p className="text-muted-foreground text-xs leading-relaxed">
          На Android обычно достаточно кнопки «Установить» в баннере сверху.
        </p>
      </DialogContent>
    </Dialog>
  );
}
