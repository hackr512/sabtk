import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, Section } from "@/components/site/InfoPage";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () => pageHead("Terms of service", "The terms for ordering groceries and using plans and rewards at SabTk."),
  component: () => (
    <InfoPage title="Terms of service">
      <Section title="Orders">
        <p>Prices and stock are confirmed when you place an order. We may cancel an order if an item is unavailable or a price was shown in error, and we'll tell you before delivery.</p>
      </Section>
      <Section title="Payment">
        <p>Orders are paid in cash on delivery. Plans are activated after our team confirms payment.</p>
      </Section>
      <Section title="Rewards and referrals">
        <p>Points have no cash value, are earned after delivery and may be reversed for cancelled or refunded orders. Referral rewards apply once per new customer.</p>
      </Section>
    </InfoPage>
  ),
});
