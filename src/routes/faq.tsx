import { createFileRoute } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { InfoPage } from "@/components/site/InfoPage";
import { DELIVERY_FEE, RUPEES_PER_POINT, formatPKR } from "@/lib/pricing";
import { pageHead } from "@/lib/seo";

const FAQS = [
  ["Where do you deliver?", "Selected areas of Islamabad and Rawalpindi. Pick your area at the top of the page or at checkout to check."],
  ["How much is delivery?", `${formatPKR(DELIVERY_FEE)} per order, regardless of grocery subtotal. A paid delivery-plan credit can cover the fee on an eligible order.`],
  ["How do I pay?", "Cash on delivery. Online payment isn't available yet."],
  ["What is a Monthly Delivery Plan?", "A monthly plan gives you a set number of delivery credits. One credit covers the delivery fee on one order that would otherwise be charged. Credits are only used when the order is delivered, and a cancelled order returns the credit."],
  ["How do loyalty points work?", `You earn 1 point for every ${formatPKR(RUPEES_PER_POINT)} spent on eligible items, added after delivery. Redeem points for reward items at checkout.`],
  ["Can I cancel my order?", "Yes, while it's still waiting for confirmation, from the order page. After that, send a request to support."],
  ["Do you substitute items?", "Never without asking. If something is unavailable we'll call you or remove it and adjust your total."],
] as const;

export const Route = createFileRoute("/faq")({
  head: () => pageHead("FAQ", "Answers about SabTk delivery, payments, plans and rewards."),
  component: () => (
    <InfoPage title="Frequently asked questions">
      <Accordion type="single" collapsible className="card-surface px-5">
        {FAQS.map(([q, a]) => (
          <AccordionItem key={q} value={q}>
            <AccordionTrigger className="text-left font-semibold">{q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </InfoPage>
  ),
});
