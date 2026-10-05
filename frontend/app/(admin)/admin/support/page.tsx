import { SupportManager } from "@/features/admin/components/support-manager";

export const metadata = { title: "Обращения" };

/** Admin support inbox: tickets from the storefront bubble («Поддержка
 * 24/7») — contact, message, status pipeline and spam cleanup. */
export default function AdminSupportPage() {
  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Обращения</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Сообщения из формы поддержки на витрине: ведите статус, отвечайте
          по указанному контакту, удаляйте спам.
        </p>
      </header>
      <div className="mt-8">
        <SupportManager />
      </div>
    </div>
  );
}
