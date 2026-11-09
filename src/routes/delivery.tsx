import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { InfoPage, Section } from "@/components/site/InfoPage";
import { DELIVERY_FEE, MAX_DELIVERY_DAYS_AHEAD, formatPKR } from "@/lib/pricing";
import { storeConfigQuery } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/delivery")({
  loader: ({ context }) => context.queryClient.ensureQueryData(storeConfigQuery),
  head: () => pageHead("Delivery information", `Delivery areas, time windows and the ${formatPKR(DELIVERY_FEE)} regular delivery fee.`),
  component: Delivery,
});

function Delivery() {
  const { data: config } = useSuspenseQuery(storeConfigQuery);
  return (
    <InfoPage title="Delivery information" subtitle="Where we deliver, when, and what it costs.">
      <Section title="Delivery fee">
        <ul>
          <li>{formatPKR(DELIVERY_FEE)} delivery fee on every order, regardless of grocery subtotal.</li>
          <li>
            On a <Link to="/plans" className="font-semibold text-loyalty underline">Monthly Delivery Plan</Link>, a credit covers the fee on eligible orders.
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
