import { Container } from "@/components/layout/container";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Container className="py-10">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground mt-2">
        Placeholder for the protected area. Session handling lives in
        <code className="bg-muted mx-1 rounded px-1 py-0.5 text-sm">stores/auth-store</code>
        and
        <code className="bg-muted mx-1 rounded px-1 py-0.5 text-sm">features/auth</code>.
      </p>
    </Container>
  );
}
