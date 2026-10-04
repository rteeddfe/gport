import { Container } from "@/components/layout/container";
import { FaqAccordion } from "./faq-accordion";
import { getFaq } from "@/services/faq.service";

/** FAQ block: live items from the admin FAQ constructor (GET /faq);
 * renders nothing while the API is unreachable so the storefront never
 * shows an empty ghost section. */
export async function FaqSection() {
  const items = await getFaq().catch(() => null);
  if (!items || items.length === 0) return null;

  return (
    <section id="faq" className="scroll-mt-24 pb-16">
      <Container>
        <FaqAccordion
          items={items.map((item) => ({
            id: item.id,
            question: item.question,
            answer: item.answer,
            category: item.category,
          }))}
        />
      </Container>
    </section>
  );
}
