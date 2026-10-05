"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { Loader2, Mail } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminGetEmails,
  getPaymentSettings,
  updatePaymentSettings,
} from "@/services/payments.service";
import { revalidateStorefrontTags } from "@/lib/revalidate";
import type {
  EmailLogView,
  PaymentProviderMeta,
  PaymentSettingsView,
} from "@/types/api";

interface ProviderState {
  enabled: boolean;
  config: Record<string, string>;
}

function initialsState(
  meta: PaymentProviderMeta,
  current: ProviderState | undefined,
): ProviderState {
  return {
    enabled: current?.enabled ?? false,
    config: Object.fromEntries(
      meta.fields.map((field) => [field.key, current?.config[field.key] ?? ""]),
    ),
  };
}

/**
 * «Магазин» tab of the site settings: the test-acquiring toggle (the
 * full emulated chain for testing orders/letters/keys without money),
 * the acquirer credentials (Т-Банк, ЮMoney, ЮKassa, CloudPayments,
 * Robokassa — stored until their integrations land) and the outbox
 * letters. SUPER_ADMIN-only, same as the whole section. The form mounts
 * once data has arrived and initializes from it (same idiom as the
 * home-content form — no state syncing).
 */
export function StoreSettingsSection() {
  const query = useQuery({
    queryKey: ["payment-settings"],
    queryFn: getPaymentSettings,
  });
  const emailsQuery = useQuery({
    queryKey: ["payment-emails"],
    queryFn: () => adminGetEmails(10),
  });

  if (query.isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (query.isError) {
    return (
      <p className="text-destructive text-sm">
        Не удалось загрузить настройки: {query.error.message}
      </p>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <StoreSettingsForm settings={query.data} />
      <EmailsCard query={emailsQuery} />
    </div>
  );
}

function StoreSettingsForm({ settings }: { settings: PaymentSettingsView }) {
  const queryClient = useQueryClient();
  const [testEnabled, setTestEnabled] = useState(settings.testEnabled);
  const [providerState, setProviderState] = useState<Record<string, ProviderState>>(
    () =>
      Object.fromEntries(
        settings.providerMeta
          .filter((meta) => meta.id !== "test")
          .map((meta) => [
            meta.id,
            initialsState(meta, settings.providers[meta.id]),
          ]),
      ),
  );
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => updatePaymentSettings({ testEnabled, providers: providerState }),
    onSuccess: () => {
      setSavedAt(new Date().toLocaleTimeString("ru-RU"));
      void revalidateStorefrontTags(["settings"]);
      queryClient.invalidateQueries({ queryKey: ["payment-settings"] });
    },
    onError: (cause) =>
      setError(cause instanceof Error ? cause.message : "Ошибка"),
  });

  const testMeta = settings.providerMeta.find(
    (provider) => provider.id === "test",
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSavedAt(null);
        setError(null);
        save.mutate();
      }}
      noValidate
      className="space-y-6"
    >
      <section className="border-border bg-surface rounded-2xl border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              {testMeta?.name ?? "Тестовый магазин"}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Полная эмуляция эквайринга: заказ → страница оплаты →
              подтверждение → письма и автовыдача ключей. Деньги не
              списываются — так тестируется вся цепочка до подключения
              реального провайдера.
            </p>
          </div>
          <label className="flex shrink-0 items-center gap-2">
            <Checkbox
              checked={testEnabled}
              onCheckedChange={(checked) => setTestEnabled(checked === true)}
              aria-label="Включить тестовый эквайринг"
            />
            <span className="text-sm">Включён</span>
          </label>
        </div>
      </section>

      {settings.providerMeta
        .filter((provider) => provider.id !== "test")
        .map((provider) => (
          <section
            key={provider.id}
            className="border-border bg-surface rounded-2xl border p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  {provider.name}
                  {!provider.live ? (
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      Интеграция в разработке
                    </Badge>
                  ) : null}
                </h2>
                <p className="text-muted-foreground mt-1 text-xs">
                  {provider.live
                    ? "Готов к приёму заказов после включения."
                    : "Данные сохраняются и понадобятся при подключении аккаунта."}
                </p>
              </div>
              <label className="flex shrink-0 items-center gap-2">
                <Checkbox
                  checked={providerState[provider.id]?.enabled ?? false}
                  onCheckedChange={(checked) =>
                    setProviderState((state) => ({
                      ...state,
                      [provider.id]: {
                        ...state[provider.id],
                        enabled: checked === true,
                      },
                    }))
                  }
                  aria-label={`Включить ${provider.name}`}
                />
                <span className="text-sm">Включён</span>
              </label>
            </div>

            {provider.fields.length > 0 ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {provider.fields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={`${provider.id}-${field.key}`}>
                      {field.label}
                    </Label>
                    <Input
                      id={`${provider.id}-${field.key}`}
                      type={field.secret ? "password" : "text"}
                      autoComplete="off"
                      value={providerState[provider.id]?.config[field.key] ?? ""}
                      onChange={(event) =>
                        setProviderState((state) => ({
                          ...state,
                          [provider.id]: {
                            ...state[provider.id],
                            config: {
                              ...state[provider.id]?.config,
                              [field.key]: event.target.value,
                            },
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ))}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={save.isPending} className="gap-2">
          {save.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          Сохранить
        </Button>
        {savedAt ? (
          <p className="text-muted-foreground text-xs">Сохранено в {savedAt}</p>
        ) : null}
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
      </div>
    </form>
  );
}

function EmailsCard({
  query,
}: {
  query: UseQueryResult<EmailLogView[], Error>;
}) {
  return (
    <section className="border-border bg-surface rounded-2xl border p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Mail className="size-4" aria-hidden />
        Письма (исходящие)
      </h2>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
        SMTP ещё не подключён — письма собираются здесь, чтобы проверить
        создание заказа и выдачу. Реальная отправка добавится вместе с
        почтовым провайдером.
      </p>
      {query.data && query.data.length > 0 ? (
        <ul className="mt-4 divide-y divide-border">
          {query.data.map((email) => (
            <li key={email.id} className="py-2.5 text-xs" title={email.body}>
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground font-mono">
                  {new Date(email.createdAt).toLocaleString("ru-RU")}
                </span>
                <span className="font-medium">{email.subject}</span>
                <span className="text-muted-foreground">→ {email.to}</span>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground mt-4 text-xs">
          Писем пока нет — оформите тестовую покупку.
        </p>
      )}
    </section>
  );
}
