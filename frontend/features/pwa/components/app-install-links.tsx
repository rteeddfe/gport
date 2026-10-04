"use client";

import Image from "next/image";
import { useState } from "react";

import { InstallInstructionsDialog, type InstructionPlatform } from "./install-instructions-dialog";

function appLinkClass(): string {
  return "border-border bg-canvas/60 hover:border-brand/50 grid size-10 place-items-center rounded-full border transition-colors";
}

/** Footer "web app" entry: iPhone and Android marks opening the install
 * instructions with the matching platform preset. */
export function AppInstallLinks() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<InstructionPlatform>("ios");

  const openWith = (value: InstructionPlatform) => {
    setPlatform(value);
    setOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-2.5">
        <span className="text-muted-foreground mr-1">Приложение:</span>
        <button
          type="button"
          aria-label="Установить приложение на iPhone"
          title="Установить на iPhone"
          onClick={() => openWith("ios")}
          className={appLinkClass()}
        >
          <Image src="/brands/apple-muted.svg" alt="" width={20} height={20} className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Установить приложение на Android"
          title="Установить на Android"
          onClick={() => openWith("android")}
          className={appLinkClass()}
        >
          <Image src="/brands/android-muted.svg" alt="" width={20} height={20} className="size-5" />
        </button>
      </div>

      <InstallInstructionsDialog open={open} onOpenChange={setOpen} initialPlatform={platform} />
    </>
  );
}
