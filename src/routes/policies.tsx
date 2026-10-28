import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, Section } from "@/components/site/InfoPage";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/policies")({
  head: () => pageHead("Cancellation & refund policy", "How cancellations, returns, refunds and substitutions work at SabTk."),
  component: () => (
    <InfoPage title="Cancellation & refund policy">
      <Section title="Cancelling an order">
        <p>You can cancel any order yourself while it is waiting for confirmation. Once we start preparing it, send a cancellation request from your account and our team will help.</p>
      </Section>
      <Section title="Substitutions">
        <p>We never substitute without asking. If an item is unavailable when we pack, we'll call you or remove it and adjust your total.</p>
      </Section>
      <Section title="Returns and missing items">
        <p>Check your items when the rider arrives. Report damaged, expired or missing items within 24 hours from your account and we'll replace or refund them.</p>
      </Section>
      <Section title="Monthly Delivery Plans">
        <ul>
          <li>A plan starts only after we confirm your payment.</li>
          <li>Credits are used when an order is delivered. Cancelled orders return the credit.</li>
          <li>Unused credits follow your plan's carry-forward limit.</li>
        </ul>
      </Section>
    </InfoPage>
  ),
});
