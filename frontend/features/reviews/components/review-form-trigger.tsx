"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ReviewFormDialog } from "./review-form-dialog";

/** Button + popup pairing for pages that submit reviews (/reviews). */
export function ReviewFormTrigger({ label = "Оставить отзыв" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="gap-2">
        {label}
      </Button>
      <ReviewFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
