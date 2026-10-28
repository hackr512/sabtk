import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { InfoPage, Section } from "@/components/site/InfoPage";
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD, MAX_DELIVERY_DAYS_AHEAD, formatPKR } from "@/lib/pricing";
import { storeConfigQuery } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/delivery")({
  head: () => pageHead("Delivery information", `Delivery areas, time windows and fees. Free delivery on orders of ${formatPKR(FREE_DELIVERY_THRESHOLD)}+.`),
  component: Delivery,
});

function Delivery() {
  const { data: config } = useQuery(storeConfigQuery);
  return (
    <InfoPage title="Delivery information" subtitle="Where we deliver, when, and what it costs.">
      <Section title="Delivery fee">
        <ul>
          <li>Item subtotal below {formatPKR(FREE_DELIVERY_THRESHOLD)}: {formatPKR(DELIVERY_FEE)} delivery fee.</li>
          <li>Item subtotal of {formatPKR(FREE_DELIVERY_THRESHOLD)} or more: free delivery.</li>
          <li>
            On a <Link to="/plans" className="font-semibold text-loyalty underline">Monthly Delivery Plan</Link>, a credit covers the fee on smaller orders.
          </li>
        </ul>
      </Section>
      <Section title="Time windows">
        <p>Choose a date up to {MAX_DELIVERY_DAYS_AHEAD} days ahead and one of these windows at checkout:</p>
        <ul>{config?.windows.map((w) => <li key={w.id}>{w.label}</li>)}</ul>
      </Section>
      <Section title="Areas we cover">
        {["Islamabad", "Rawalpindi"].map((c) => (
          <div key={c}>
            <div className="font-semibold">{c}</div>
            <p className="text-sm text-muted-foreground">
              {config?.zones.filter((z) => z.city === c).map((z) => z.area).join(", ") || "—"}
            </p>
          </div>
        ))}
      </Section>
      <Section title="Payment">
        <p>Cash on delivery only for now. Please keep the exact amount ready if you can.</p>
      </Section>
    </InfoPage>
  );
}
