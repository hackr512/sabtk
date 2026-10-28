import { createFileRoute, Link } from "@tanstack/react-router";
import { InfoPage, Section } from "@/components/site/InfoPage";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () => pageHead("About us", "SabTk delivers everyday groceries to homes across Islamabad and Rawalpindi with honest prices and cash on delivery."),
  component: () => (
    <InfoPage eyebrow="Our story" title="Groceries, sab tak." subtitle="SabTk brings your monthly ration and daily essentials to your door in Islamabad and Rawalpindi.">
      <Section title="What we do">
        <p>We stock the atta, rice, daal, ghee, tea, dairy, fresh produce and household basics that Pakistani families buy every week, and deliver them in a time window you choose.</p>
      </Section>
      <Section title="How we're different">
        <ul>
          <li>Clear prices with per-kg and per-litre comparisons.</li>
          <li>Monthly ration bundles and GharBudget to plan your spending.</li>
          <li>Ration Circle group buying for bulk savings with your neighbours.</li>
          <li>Pay cash on delivery — nothing is charged online.</li>
        </ul>
      </Section>
      <p>
        Ready to start? <Link to="/shop" className="font-semibold text-primary underline">Browse the shop</Link>.
      </p>
    </InfoPage>
  ),
});
