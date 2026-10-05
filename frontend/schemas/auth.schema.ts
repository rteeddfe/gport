import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    name: z.string().max(100, "Не длиннее 100 символов").optional(),
    email: z.email("Введите корректный email"),
    password: z
      .string()
      .min(8, "Минимум 8 символов")
      .max(72, "Не длиннее 72 символов"),
    confirmPassword: z.string().min(1, "Повторите пароль"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Пароли не совпадают",
  });

export type SignUpValues = z.infer<typeof signUpSchema>;

/** Profile settings (avatar rides along as a plain URL field). */
export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .max(100, "Не длиннее 100 символов")
    .optional()
    .or(z.literal("")),
  avatarUrl: z
    .string()
    .trim()
    .max(500, "Не длиннее 500 символов")
    .regex(/^(\/|https?:\/\/)/, "Путь или http(s)-ссылка")
    .optional()
    .or(z.literal("")),
});

export type ProfileValues = z.infer<typeof profileSchema>;

/** Password change in the profile: current + new with confirmation. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Введите текущий пароль"),
    newPassword: z
      .string()
      .min(8, "Минимум 8 символов")
      .max(72, "Не длиннее 72 символов"),
    confirmPassword: z.string().min(1, "Повторите новый пароль"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Пароли не совпадают",
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
