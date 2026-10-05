"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/features/auth/components/password-input";
import { Label } from "@/components/ui/label";
import { useChangePassword } from "@/features/auth/hooks/use-change-password";
import { useUpdateProfile } from "@/features/auth/hooks/use-update-profile";
import { ImageUpload } from "@/features/settings/components/image-upload";
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordValues,
  type ProfileValues,
} from "@/schemas/auth.schema";
import type { AuthUser } from "@/types/api";

function errorText(error: unknown): string | null {
  return error instanceof Error ? error.message : null;
}

/**
 * Profile settings (client): avatar + name form and the password-change
 * form. The session profile lives in the React Query cache (ME_QUERY_KEY)
 * — saving refreshes it, so the header avatar updates without a reload.
 */
export function ProfileSettings({ user }: { user: AuthUser }) {
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const profileMutation = useUpdateProfile();
  const passwordMutation = useChangePassword();

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name ?? "", avatarUrl: user.avatarUrl ?? "" },
  });
  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function submitProfile(values: ProfileValues) {
    setProfileSaved(false);
    try {
      // Empty strings mean «clear the field» on the backend; undefined
      // would leave the stored value untouched.
      await profileMutation.mutateAsync({
        name: values.name ?? "",
        avatarUrl: values.avatarUrl ?? "",
      });
      setProfileSaved(true);
    } catch {
      // mutation.error carries the message for the submit row.
    }
  }

  async function submitPassword(values: ChangePasswordValues) {
    setPasswordSaved(false);
    try {
      await passwordMutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setPasswordSaved(true);
      passwordForm.reset();
    } catch {
      // mutation.error carries the message for the submit row.
    }
  }

  const profileErrors = profileForm.formState.errors;
  const passwordErrors = passwordForm.formState.errors;

  return (
    <div className="mt-8 grid gap-6 lg:max-w-3xl">
      <section className="border-border bg-surface rounded-2xl border p-6">
        <h2 className="text-lg font-semibold">Личные данные</h2>
        <form
          onSubmit={profileForm.handleSubmit(submitProfile)}
          noValidate
          className="mt-5 space-y-5"
        >
          <Controller
            control={profileForm.control}
            name="avatarUrl"
            render={({ field }) => (
              <ImageUpload
                label="Аватар"
                value={field.value}
                onChange={field.onChange}
                hint="PNG, JPG, WebP или SVG; очистите поле, чтобы вернуться к инициалам"
              />
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Имя</Label>
              <Input
                id="profile-name"
                placeholder="Как к вам обращаться"
                {...profileForm.register("name")}
              />
              {profileErrors.name ? (
                <p className="text-destructive text-xs">
                  {profileErrors.name.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-email">Email</Label>
              <Input id="profile-email" value={user.email} disabled />
              <p className="text-muted-foreground flex items-center gap-2 text-xs">
                Смена email не поддерживается
                <Badge variant="secondary" className="text-[10px] uppercase">
                  {user.role}
                </Badge>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={profileMutation.isPending} className="gap-2">
              {profileMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Сохранить
            </Button>
            {profileSaved ? (
              <p className="text-muted-foreground text-xs">Сохранено</p>
            ) : null}
            {profileMutation.isError ? (
              <p className="text-destructive text-xs">
                {errorText(profileMutation.error) ?? "Ошибка"}
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="border-border bg-surface rounded-2xl border p-6">
        <h2 className="text-lg font-semibold">Смена пароля</h2>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          После смены пароля все другие сессии завершатся — текущее
          устройство останется в аккаунте.
        </p>
        <form
          onSubmit={passwordForm.handleSubmit(submitPassword)}
          noValidate
          className="mt-5 space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="password-current">Текущий пароль</Label>
              <PasswordInput
                id="password-current"
                autoComplete="current-password"
                {...passwordForm.register("currentPassword")}
              />
              {passwordErrors.currentPassword ? (
                <p className="text-destructive text-xs">
                  {passwordErrors.currentPassword.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password-new">Новый пароль</Label>
              <PasswordInput
                id="password-new"
                autoComplete="new-password"
                {...passwordForm.register("newPassword")}
              />
              {passwordErrors.newPassword ? (
                <p className="text-destructive text-xs">
                  {passwordErrors.newPassword.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password-confirm">Повторите новый</Label>
              <PasswordInput
                id="password-confirm"
                autoComplete="new-password"
                {...passwordForm.register("confirmPassword")}
              />
              {passwordErrors.confirmPassword ? (
                <p className="text-destructive text-xs">
                  {passwordErrors.confirmPassword.message}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={passwordMutation.isPending} className="gap-2">
              {passwordMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Изменить пароль
            </Button>
            {passwordSaved ? (
              <p className="text-muted-foreground text-xs">Пароль изменён</p>
            ) : null}
            {passwordMutation.isError ? (
              <p className="text-destructive text-xs">
                {errorText(passwordMutation.error) ?? "Ошибка"}
              </p>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
