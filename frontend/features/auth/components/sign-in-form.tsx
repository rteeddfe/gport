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
import { Label } from "@/components/ui/label";
import { PasswordInput } from "./password-input";
import { apiOriginPath } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errors";
import { signInSchema, type SignInValues } from "@/schemas/auth.schema";
import { useSignIn } from "../hooks/use-sign-in";
import { useVerifyOAuthLink } from "../hooks/use-verify-oauth-link";

/** OAuth outcome the backend redirected back with (M-OAUTH-5). */
export interface OAuthState {
  code: "email" | "failed" | "link";
  challengeId?: string;
}

/** Only a well-formed challenge id from the backend redirect is accepted
 * — the frontend never validates ownership itself. */
const CHALLENGE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OAUTH_ERRORS: Record<OAuthState["code"], string> = {
  email: "Не удалось войти через OAuth: провайдер не передал email. Попробуйте другой способ входа.",
  failed: "Не удалось выполнить вход через OAuth. Попробуйте ещё раз.",
  link: "",
};

export function SignInForm({ oauth }: { oauth?: OAuthState }) {
  const router = useRouter();
  const { signIn, isPending, error } = useSignIn();

  const isLinkChallenge =
    oauth?.code === "link" &&
    typeof oauth.challengeId === "string" &&
    CHALLENGE_PATTERN.test(oauth.challengeId);

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: SignInValues) {
    signIn(values, {
      onSuccess: ({ user }) =>
        router.push(user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard"),
    });
  }

  if (isLinkChallenge) {
    return <OAuthLinkVerify challengeId={oauth.challengeId as string} />;
  }

  const oauthError = oauth
    ? (oauth.code === "link" ? OAUTH_ERRORS.failed : OAUTH_ERRORS[oauth.code])
    : null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        {oauthError ? (
          <p
            role="alert"
            className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm"
          >
            {oauthError}
          </p>
        ) : null}
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
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Входим…" : "Войти"}
        </Button>
        <div className="flex gap-2">
          {/* OAuth start is a GET navigation — plain anchors, no SDK,
              no fetch; the backend owns the whole flow (M-OAUTH-5). */}
          <Button asChild variant="outline" className="flex-1">
            <a href={apiOriginPath("/auth/oauth/yandex/start")}>
              Войти через Яндекс
            </a>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <a href={apiOriginPath("/auth/oauth/vk/start")}>Войти через VK</a>
          </Button>
        </div>
      </form>
    </Form>
  );
}

/** Link verification: the mailed code + the opaque challenge id are the
 * whole contract — nothing else travels to the backend (M-OAUTH-4). */
function OAuthLinkVerify({ challengeId }: { challengeId: string }) {
  const router = useRouter();
  const { verifyOAuthLink, isPending, error } = useVerifyOAuthLink();
  const [code, setCode] = useState("");

  return (
    <div className="space-y-4">
      {error ? (
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm"
        >
          {getErrorMessage(error)}
        </p>
      ) : null}
      {error ? (
        <p className="text-muted-foreground text-sm">
          Запросите новый код — повторите вход через Яндекс или VK.
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">
          На вашу почту отправлен код подтверждения. Введите 6-значный код,
          чтобы привязать этот аккаунт к входу через OAuth.
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="oauth-code">Код подтверждения</Label>
        <Input
          id="oauth-code"
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
        />
      </div>
      <Button
        type="button"
        disabled={isPending || code.length !== 6}
        className="w-full"
        onClick={() =>
          verifyOAuthLink(
            { challengeId, code },
            { onSuccess: () => router.push("/dashboard") },
          )
        }
      >
        {isPending ? "Проверяем код…" : "Подтвердить"}
      </Button>
    </div>
  );
}
