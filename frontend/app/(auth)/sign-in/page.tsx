import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import {
  SignInForm,
  type OAuthState,
} from "@/features/auth/components/sign-in-form";

export const metadata = { title: "Вход" };

/** OAuth outcomes the backend redirects back with (M-OAUTH-5). Only known
 * codes are accepted; anything else is treated as a plain sign-in. */
const OAUTH_CODES: ReadonlySet<string> = new Set(["email", "failed", "link"]);

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code =
    typeof params.oauth === "string" && OAUTH_CODES.has(params.oauth)
      ? (params.oauth as OAuthState["code"])
      : undefined;
  const oauth: OAuthState | undefined = code
    ? {
        code,
        challengeId: typeof params.challenge === "string" ? params.challenge : undefined,
      }
    : undefined;

  return (
    <AuthCard
      title="Вход"
      subtitle="С возвращением! Войдите, чтобы продолжить покупки"
      footer={
        <>
          Нет аккаунта?{" "}
          <Link href="/sign-up" className="text-neon hover:underline">
            Зарегистрируйтесь
          </Link>
        </>
      }
    >
      <SignInForm oauth={oauth} />
    </AuthCard>
  );
}
