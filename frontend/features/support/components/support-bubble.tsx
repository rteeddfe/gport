"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Headset } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supportSchema, type SupportValues } from "@/schemas/support.schema";

function onlineDot(className: string): React.ReactNode {
  return (
    <span
      aria-hidden
      className={`size-2 rounded-full bg-emerald-400 ring-canvas ring-2 ${className}`}
    />
  );
}

/**
 * Floating "Поддержка" bubble (bottom-right, on every storefront page)
 * opening a feedback dialog. The trigger is the mini-card variant picked
 * by the user out of five design probes (2026-10-04): icon bubble,
 * «Поддержка 24/7» title and an online indicator. React Hook Form + Zod
 * validation only — there is no tickets API yet, so a valid submit just
 * closes the dialog; the request lands here when the support backend is
 * approved.
 */
export function SupportBubble() {
  const form = useForm<SupportValues>({
    resolver: zodResolver(supportSchema),
    defaultValues: { name: "", email: "", question: "" },
  });

  function onSubmit() {
    form.reset();
  }

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          aria-label="Поддержка — мы онлайн"
          className="border-border bg-surface/95 text-foreground hover:border-brand/50 hover:bg-surface fixed right-4 bottom-4 z-40 h-auto gap-3 rounded-2xl border px-4 py-3 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur md:right-6 md:bottom-6"
        >
          <span className="bg-brand/15 text-brand-bright grid size-10 shrink-0 place-items-center rounded-full">
            <Headset className="size-5" />
          </span>
          <span className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-semibold">Поддержка 24/7</span>
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              {onlineDot("")}
              Мы онлайн
            </span>
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Поддержка</DialogTitle>
          <DialogDescription>
            Задайте вопрос — ответ придёт на указанную почту.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя</FormLabel>
                  <FormControl>
                    <Input placeholder="Ваше имя (необязательно)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Вопрос</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Опишите ситуацию — что случилось и где"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              Отправить вопрос
            </Button>
            <p className="text-muted-foreground text-center text-xs">
              Отправка на сервер появится вместе с API обращений.
            </p>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
