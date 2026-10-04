import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import { SignInForm } from "@/features/auth/components/sign-in-form";

export const metadata = { title: "Вход" };

export default function SignInPage() {
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
      <SignInForm />
    </AuthCard>
  );
}
