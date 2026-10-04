import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  name: z.string().max(100, "Не длиннее 100 символов").optional(),
  email: z.email("Введите корректный email"),
  password: z
    .string()
    .min(8, "Минимум 8 символов")
    .max(72, "Не длиннее 72 символов"),
});

export type SignUpValues = z.infer<typeof signUpSchema>;
