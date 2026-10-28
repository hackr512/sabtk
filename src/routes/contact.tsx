import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { InfoPage, Section } from "@/components/site/InfoPage";
import { storeConfigQuery } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  head: () => pageHead("Contact us", "Get help with a SabTk order, delivery or account in Islamabad and Rawalpindi."),
  component: Contact,
});

function Contact() {
  const { data: config } = useQuery(storeConfigQuery);
  const s = config?.settings ?? {};
  const rows = [
    { icon: Phone, label: "Phone", value: s["support_phone"], href: s["support_phone"] ? `tel:${s["support_phone"]}` : "" },
    { icon: MessageCircle, label: "WhatsApp", value: s["whatsapp_number"], href: s["whatsapp_number"] ? `https://wa.me/${s["whatsapp_number"].replace(/\D/g, "")}` : "" },
    { icon: Mail, label: "Email", value: s["support_email"], href: s["support_email"] ? `mailto:${s["support_email"]}` : "" },
  ];
  const any = rows.some((r) => r.value);
  return (
    <InfoPage title="Contact us" subtitle="We're here to help with orders, deliveries and your account.">
      <div className="grid gap-3 sm:grid-cols-3">
        {rows.map(({ icon: Icon, label, value, href }) => (
          <div key={label} className="card-surface p-4">
            <Icon className="size-5 text-primary" />
            <div className="mt-2 text-sm font-bold">{label}</div>
            {value ? (
              <a href={href} className="text-sm text-primary underline">{value}</a>
            ) : (
              <div className="text-sm text-muted-foreground">Coming soon</div>
            )}
          </div>
        ))}
      </div>
      {!any && <p className="text-sm text-muted-foreground">Our support contact details are being set up.</p>}
      <Section title="Help with an order">
        <p>
          Signed-in customers can send a request about any order from <Link to="/account" className="font-semibold text-primary underline">My Account</Link> — we reply on the phone number saved with your order.
        </p>
      </Section>
    </InfoPage>
  );
}
