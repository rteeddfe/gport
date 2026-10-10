"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "./password-input";
import { getErrorMessage } from "@/lib/api/errors";
import { signUpSchema, type SignUpValues } from "@/schemas/auth.schema";
import { useSignUp } from "../hooks/use-sign-up";
import { useVerifyRegister } from "../hooks/use-verify-register";

interface ClaimValues {
  email: string;
  password: string;
  name?: string;
}

export function SignUpForm() {
  const router = useRouter();
  const { signUp, isPending, error } = useSignUp();
  const { verifyRegister, isPending: isVerifying, error: verifyError } =
    useVerifyRegister();
  /** Set after the backend answers «verification required»: claiming a
   * guest-checkout account completes with the mailed code, not here. */
  const [claim, setClaim] = useState<ClaimValues | null>(null);
  const [code, setCode] = useState("");

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  function onSubmit({ confirmPassword: _confirm, ...values }: SignUpValues) {
    // confirmPassword is client-side only — the backend whitelist rejects it.
    void _confirm;
    signUp(values, {
      onSuccess: (result) => {
        if ("verificationRequired" in result) {
          // The chosen password stays server-side in the challenge —
          // only the mailed code completes the claim.
          setClaim({
            email: values.email,
            password: values.password,
            name: values.name,
          });
        } else {
          router.push("/dashboard");
        }
      },
    });
  }

  if (claim) {
    return (
      <div className="space-y-4">
        {verifyError ? (
          <p
            role="alert"
            className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm"
          >
            {getErrorMessage(verifyError)}
          </p>
        ) : null}
        <p className="text-muted-foreground text-sm">
          Код подтверждения отправлен на{" "}
          <span className="text-foreground">{claim.email}</span>. Введите его,
          чтобы завершить регистрацию.
        </p>
        <Input
          inputMode="numeric"
          placeholder="000000"
          maxLength={6}
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
        />
        <Button
          type="button"
          disabled={isVerifying || code.length !== 6}
          className="w-full"
          onClick={() =>
            verifyRegister(
              { email: claim.email, code },
              { onSuccess: () => router.push("/dashboard") },
            )
          }
        >
          {isVerifying ? "Проверяем код…" : "Подтвердить"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          className="w-full"
          onClick={() => signUp(claim)}
        >
          {isPending ? "Отправляем…" : "Отправить код повторно"}
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        {error ? (
          <p
            role="alert"
            className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm"
          >
            {getErrorMessage(error)}
          </p>
        ) : null}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Имя</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="Как к вам обращаться"
                  autoComplete="name"
                  {...field}
                />
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
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Пароль</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder="Минимум 8 символов"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Повторите пароль</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder="Ещё раз"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Создаём аккаунт…" : "Создать аккаунт"}
        </Button>
      </form>
    </Form>
  );
}
