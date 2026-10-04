"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ME_QUERY_KEY } from "@/features/auth/hooks/use-me";
import { signOut } from "@/services/auth.service";
import type { AuthUser } from "@/types/api";

/** Avatar + name/email + sign-out, shared by the panel sidebars. */
export function UserCard({ user }: { user: AuthUser }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const initial = (user.name ?? user.email).charAt(0).toUpperCase();

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
    <div className="bg-raised/40 flex items-center gap-2.5 rounded-lg p-2.5">
      <span className="bg-brand/15 text-brand-bright ring-brand/40 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1">
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name ?? "Игрок"}</p>
        <p className="text-muted-foreground truncate text-xs">{user.email}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground size-8"
        aria-label="Выйти"
        title="Выйти"
        onClick={() => void handleSignOut()}
      >
        <LogOut />
      </Button>
    </div>
  );
}
