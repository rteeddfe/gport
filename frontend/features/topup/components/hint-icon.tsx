"use client";

import { HelpCircle } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** "?" marker with a tooltip; carries its own provider so any layout can
 * drop it in without wrapping the whole widget. */
export function HintIcon({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            aria-label={text}
            className="text-muted-foreground hover:text-foreground cursor-help transition-colors"
          >
            <HelpCircle className="size-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="bg-surface text-foreground border-border max-w-56 border">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
