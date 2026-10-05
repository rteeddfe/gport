"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Headset, Loader2 } from "lucide-react";
import { useState } from "react";
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
import { createSupportTicket } from "@/services/support.service";

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
 * opening a support-ticket dialog. The trigger is the mini-card variant
 * picked by the user out of five design probes (2026-10-04). A valid
 * submit POSTs /support — the ticket lands in the admin «Обращения» tab;
 * the anti-spam limits (1/minute per IP, 30/hour globally) live
 * server-side and their messages are shown verbatim.
 */
export function SupportBubble() {
  const [isPending, setIsPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<SupportValues>({
    resolver: zodResolver(supportSchema),
    defaultValues: { name: "", contact: "", message: "" },
  });

  async function onSubmit(values: SupportValues) {
    setIsPending(true);
    setServerError(null);
    try {
      await createSupportTicket({
        name: values.name || undefined,
        contact: values.contact,
        message: values.message,
      });
      setSent(true);
      form.reset();
    } catch (cause) {
      setServerError(cause instanceof Error ? cause.message : "Ошибка");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) {
          form.reset();
          setSent(false);
          setServerError(null);
        }
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
            Опишите проблему и оставьте контакт — ответим на него.
          </DialogDescription>
        </DialogHeader>
        {sent ? (
          <div className="space-y-3 py-4 text-center">
            <p className="text-sm font-semibold">Обращение отправлено</p>
            <p className="text-muted-foreground text-sm">
              Мы получили ваше сообщение и ответим по указанному контакту.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
              Написать ещё
            </Button>
          </div>
        ) : (
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
                name="contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email или @telegram для ответа</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="you@example.com или @username"
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
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Сообщение</FormLabel>
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
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                Отправить обращение
              </Button>
              {serverError ? (
                <p className="text-destructive text-center text-xs">{serverError}</p>
              ) : null}
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
