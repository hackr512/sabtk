import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, Section } from "@/components/site/InfoPage";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () => pageHead("Privacy policy", "What personal information SabTk collects and how it is used."),
  component: () => (
    <InfoPage title="Privacy policy">
      <Section title="What we collect">
        <p>Your name, email, mobile number, delivery addresses, and your order, plan and rewards history.</p>
      </Section>
      <Section title="How we use it">
        <p>Only to deliver your orders, contact you about them, run your plan and rewards, and improve our service. We don't sell your data.</p>
      </Section>
      <Section title="Your choices">
        <p>You can update your details and addresses from your account, or ask support to delete your account.</p>
      </Section>
    </InfoPage>
  ),
});
