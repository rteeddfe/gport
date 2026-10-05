"use client";

import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ME_QUERY_KEY, useMe } from "@/features/auth/hooks/use-me";
import { signOut } from "@/services/auth.service";

/**
 * Header auth widget: "Войти" for guests, avatar dropdown for the signed-in
 * user. The session lives in httpOnly cookies validated by /auth/me (see
 * use-me) — nothing is stored client-side.
 */
export function AuthButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isPending } = useMe();

  if (isPending) {
    return null;
  }

  if (!user) {
    return (
      <Button asChild size="sm">
        <Link href="/sign-in">Войти</Link>
      </Button>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Stateless logout endpoint — the UI session is cleared regardless.
    }
    queryClient.setQueryData<unknown>(ME_QUERY_KEY, null);
    router.push("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Аккаунт"
        >
          <UserAvatar user={user} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="flex items-center gap-2 text-sm font-medium">
            {user.name ?? "Игрок"}
            <Badge variant="secondary" className="text-[10px] uppercase">
              {user.role}
            </Badge>
          </p>
          <p className="text-muted-foreground text-xs font-normal">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.role === "SUPER_ADMIN" ? (
          <DropdownMenuItem onSelect={() => router.push("/admin")}>
            <ShieldCheck />
            Админ-панель
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => router.push("/dashboard")}>
          <UserRound />
          Профиль
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void handleSignOut()}>
          <LogOut />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
