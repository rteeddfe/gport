import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

export const metadata = { title: "Регистрация" };

export default function SignUpPage() {
  return (
    <AuthCard
      title="Регистрация"
      subtitle="Создайте аккаунт — это займёт меньше минуты"
      footer={
        <>
          Уже есть аккаунт?{" "}
          <Link href="/sign-in" className="text-neon hover:underline">
            Войдите
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthCard>
  );
}
