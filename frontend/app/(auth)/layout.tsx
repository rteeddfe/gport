import { Container } from "@/components/layout/container";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className="flex min-h-[70vh] max-w-md items-center justify-center py-10">
      {children}
    </Container>
  );
}
