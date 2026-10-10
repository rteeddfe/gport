"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminUpdateIntegration } from "@/features/admin/hooks/use-admin-integrations";
import { getErrorMessage } from "@/lib/api/errors";
import type { IntegrationView } from "@/types/api";

const FIELD_LABELS: Record<string, string> = {
  clientId: "Client ID",
  clientSecret: "Client Secret",
  redirectUri: "Redirect URI",
};

const fieldLabel = (name: string): string => FIELD_LABELS[name] ?? name;

/**
 * One integration card. The API never returns secret values, so the
 * secret inputs always mount EMPTY («••••••••» placeholder + hint when
 * configured); an empty secret on save means «keep the stored one».
 * Writes are SUPER_ADMIN-only — the backend guard is the source of truth,
 * here the form simply renders read-only for other roles.
 */
export function IntegrationCard({
  integration,
  editable,
}: {
  integration: IntegrationView;
  editable: boolean;
}) {
  const [enabled, setEnabled] = useState(integration.enabled);
  const [config, setConfig] = useState<Record<string, string>>(
    () => ({ ...integration.config }),
  );
  // Secrets always start empty — a stored secret is never rendered back.
  const [secretValues, setSecretValues] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const save = useAdminUpdateIntegration();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editable) return;
    setSavedAt(null);
    setError(null);
    save.mutate(
      {
        provider: integration.provider,
        input: {
          enabled,
          config: { ...integration.config, ...config },
          // Absent = keep the stored secret; empty strings are stripped.
          secrets: Object.fromEntries(
            Object.entries(secretValues).filter(([, value]) => value !== ""),
          ),
        },
      },
      {
        onSuccess: () => {
          setSavedAt(new Date().toLocaleTimeString("ru-RU"));
          setSecretValues({});
        },
        onError: (cause) => setError(getErrorMessage(cause)),
      },
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label={`Интеграция ${integration.title}`}
      className="border-border bg-surface rounded-2xl border p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            {integration.title}
            <Badge
              variant={integration.configured ? "default" : "secondary"}
              className="text-[10px] uppercase"
            >
              {integration.configured ? "Настроено" : "Не настроено"}
            </Badge>
            {integration.enabled && !integration.configured ? (
              <Badge
                variant="destructive"
                className="text-[10px] uppercase"
              >
                Неполная конфигурация
              </Badge>
            ) : null}
            {integration.enabled ? (
              <Badge className="text-[10px] uppercase">Включено</Badge>
            ) : null}
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            {integration.description}
          </p>
        </div>
        {editable ? (
          <label className="flex shrink-0 items-center gap-2">
            <Checkbox
              checked={enabled}
              onCheckedChange={(checked) => setEnabled(checked === true)}
              aria-label={`Включить ${integration.title}`}
            />
            <span className="text-sm">Включён</span>
          </label>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {Object.entries(config).map(([name, value]) => (
          <div key={name} className="space-y-1.5">
            <Label htmlFor={`${integration.provider}-${name}`}>
              {fieldLabel(name)}
            </Label>
            <Input
              id={`${integration.provider}-${name}`}
              value={value}
              autoComplete="off"
              disabled={!editable}
              onChange={(event) =>
                setConfig((state) => ({ ...state, [name]: event.target.value }))
              }
            />
            {name === "redirectUri" ? (
              <p className="text-muted-foreground text-[10px] leading-relaxed">
                Системное значение под контролем backend: только callback-URL
                вида https://&lt;домен&gt;/api/auth/oauth/{integration.provider.toLowerCase()}
                /callback на разрешённом origin. Произвольный URL будет отклонён.
              </p>
            ) : null}
          </div>
        ))}
        {Object.entries(integration.secretsConfigured).map(([name, configured]) => (
          <div key={name} className="space-y-1.5">
            <Label htmlFor={`${integration.provider}-${name}`}>
              {fieldLabel(name)}
              {configured ? (
                <span className="text-muted-foreground ml-2 text-[10px]">
                  настроен — введите новый, чтобы заменить
                </span>
              ) : null}
            </Label>
            <Input
              id={`${integration.provider}-${name}`}
              type="password"
              autoComplete="new-password"
              placeholder={configured ? "••••••••" : "Не задан"}
              value={secretValues[name] ?? ""}
              disabled={!editable}
              onChange={(event) =>
                setSecretValues((state) => ({
                  ...state,
                  [name]: event.target.value,
                }))
              }
            />
          </div>
        ))}
      </div>

      {editable ? (
        <div className="mt-4 flex items-center gap-4">
          <Button type="submit" className="gap-2" disabled={save.isPending}>
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
      ) : null}
    </form>
  );
}
