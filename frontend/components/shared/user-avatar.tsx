import { cn } from "@/lib/utils";

interface UserAvatarProps {
  user: { avatarUrl?: string | null; name?: string | null; email: string };
  className?: string;
}

/** Round user avatar: the uploaded image when set (plain img on purpose —
 * uploads may be SVG), the initials chip otherwise. Shared by the
 * storefront header widget and the panel sidebars. */
export function UserAvatar({ user, className }: UserAvatarProps) {
  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt=""
        className={cn("size-8 shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  const initial = (user.name ?? user.email).charAt(0).toUpperCase();
  return (
    <span
      className={cn(
        "bg-brand/15 text-brand-bright ring-brand/40 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1",
        className,
      )}
    >
      {initial}
    </span>
  );
}
