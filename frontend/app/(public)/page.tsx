import Link from "next/link";
import { Container } from "@/components/layout/container";
import { SystemStatus } from "@/features/health/components/system-status";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <Container className="py-16">
      <h1 className="text-4xl font-bold tracking-tight">Digital Marketplace</h1>
      <p className="text-muted-foreground mt-2 text-lg">
        Frontend is running. The architecture skeleton is ready for development.
      </p>

      <div className="mt-10">
        <SystemStatus />
      </div>

      <Button asChild className="mt-10">
        <Link href="/products">Browse products</Link>
      </Button>
    </Container>
  );
}
