"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { riseItem, staggerContainer } from "./motion-presets";
import { SectionHeading } from "./section-heading";

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQ_FILTERS = [
  { value: "all", label: "Все" },
  { value: "topup", label: "Стим-пополнение" },
  { value: "games", label: "Покупка игр" },
] as const;

type FaqFilter = (typeof FAQ_FILTERS)[number]["value"];

function chipClass(active: boolean): string {
  return cn(
    "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-200",
    active
      ? "border-brand bg-brand text-white"
      : "border-border bg-canvas/50 text-muted-foreground hover:border-brand/50 hover:text-foreground",
  );
}

/** FAQ list fed by the admin constructor (settings API); filter chips keep
 * the storefront language, items arrive pre-ordered from the backend. */
export function FaqAccordion({ items }: { items: FaqEntry[] }) {
  const [filter, setFilter] = useState<FaqFilter>("all");
  const visibleItems =
    filter === "all"
      ? items
      : items.filter((item) => item.category === filter);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      <motion.div variants={riseItem}>
        <SectionHeading
          kicker="FAQ"
          title={
            <>
              Частые <span className="text-gradient">вопросы</span>
            </>
          }
        />
      </motion.div>
      <motion.div variants={riseItem}>
        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Фильтр вопросов">
          {FAQ_FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
              className={chipClass(filter === item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Accordion
          key={filter}
          type="single"
          collapsible
          className="mt-6"
        >
          {visibleItems.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="mb-3 rounded-2xl border border-border bg-canvas/70 px-5 last:mb-0 last:border-b"
            >
              <AccordionTrigger className="py-4 text-sm font-semibold hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </motion.div>
  );
}
