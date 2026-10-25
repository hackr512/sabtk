import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD, formatPKR } from "@/lib/pricing";
import { storeConfigQuery } from "@/lib/queries";
import { LogoMark } from "./Logo";

export function Footer() {
  const { data } = useQuery(storeConfigQuery);
  const s = data?.settings ?? {};
  const socials = [
    { label: "Facebook", url: s.facebook_url },
    { label: "Instagram", url: s.instagram_url },
    { label: "TikTok", url: s.tiktok_url },
  ].filter((x) => x.url);
  const hasContact = s.support_phone || s.whatsapp_number || s.support_email;

  return (
    <footer className="mt-16 bg-deep pb-24 text-deep-foreground md:pb-0">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-xl font-extrabold">SabTk</span>
          </div>
          <p className="mt-3 text-sm text-deep-foreground/75">
            Har Ghar Ki Grocery, Aasaan Delivery. Everyday groceries, monthly ration planning and neighbourhood
            group buying for Islamabad and Rawalpindi.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-lime">Shop</h3>
          <ul className="mt-3 space-y-2 text-sm text-deep-foreground/80">
            <li><Link to="/shop" className="hover:text-deep-foreground">All products</Link></li>
            <li><Link to="/ration" className="hover:text-deep-foreground">Monthly Ration</Link></li>
            <li><Link to="/ration-circle" className="hover:text-deep-foreground">Ration Circle</Link></li>
            <li><Link to="/budget" className="hover:text-deep-foreground">GharBudget</Link></li>
            <li><Link to="/rewards" className="hover:text-deep-foreground">Rewards & referrals</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-lime">Help</h3>
          <ul className="mt-3 space-y-2 text-sm text-deep-foreground/80">
            <li><Link to="/about" className="hover:text-deep-foreground">About SabTk</Link></li>
            <li><Link to="/delivery" className="hover:text-deep-foreground">Delivery areas & fees</Link></li>
            <li><Link to="/faq" className="hover:text-deep-foreground">FAQs</Link></li>
            <li><Link to="/policies" className="hover:text-deep-foreground">Returns, refunds & cancellations</Link></li>
            <li><Link to="/privacy" className="hover:text-deep-foreground">Privacy policy</Link></li>
            <li><Link to="/terms" className="hover:text-deep-foreground">Terms & conditions</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-lime">Contact</h3>
          <ul className="mt-3 space-y-2 text-sm text-deep-foreground/80">
            {s.whatsapp_number && (
              <li>
                <a
                  href={`https://wa.me/${s.whatsapp_number.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 hover:text-deep-foreground"
                >
                  <MessageCircle className="size-4" /> WhatsApp {s.whatsapp_number}
                </a>
              </li>
            )}
            {s.support_phone && (
              <li>
                <a href={`tel:${s.support_phone}`} className="inline-flex items-center gap-2 hover:text-deep-foreground">
                  <Phone className="size-4" /> {s.support_phone}
                </a>
              </li>
            )}
            {s.support_email && (
              <li>
                <a href={`mailto:${s.support_email}`} className="inline-flex items-center gap-2 hover:text-deep-foreground">
                  <Mail className="size-4" /> {s.support_email}
                </a>
              </li>
            )}
            {!hasContact && <li>Phone and WhatsApp support details will be published here soon.</li>}
            <li><Link to="/contact" className="font-semibold text-deep-foreground hover:underline">Contact & support</Link></li>
          </ul>
          <div className="mt-5 text-xs text-deep-foreground/70">
            <div className="font-semibold text-deep-foreground">Payment</div>
            Cash on Delivery. Online payment options are not available yet.
          </div>
          {socials.length > 0 && (
            <div className="mt-4 flex gap-3 text-sm">
              {socials.map((x) => (
                <a key={x.label} href={x.url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                  {x.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-deep-foreground/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-deep-foreground/60 md:flex-row md:justify-between">
          <span>© {new Date().getFullYear()} SabTk. Prices in PKR.</span>
          <span>
            Delivery {formatPKR(DELIVERY_FEE)} on orders below {formatPKR(FREE_DELIVERY_THRESHOLD)} · Free at{" "}
            {formatPKR(FREE_DELIVERY_THRESHOLD)}+
          </span>
        </div>
      </div>
    </footer>
  );
}
