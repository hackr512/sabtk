import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Link the signed-in customer to the friend who referred them. Only before their first order, once, never self. */
export const applyReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ code: z.string().trim().toUpperCase().regex(/^SBT[A-Z0-9]{6}$/, "That code doesn't look right") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const [{ data: existing }, { count: orderCount }, { data: referrer }, { data: me }] = await Promise.all([
      admin.from("referrals").select("id").eq("referred_id", userId).maybeSingle(),
      admin.from("orders").select("id", { count: "exact", head: true }).eq("user_id", userId),
      admin.from("profiles").select("id, phone").eq("referral_code", data.code).maybeSingle(),
      admin.from("profiles").select("id, phone").eq("id", userId).maybeSingle(),
    ]);
    if (existing) return { ok: false as const, error: "A referral code is already linked to your account." };
    if ((orderCount ?? 0) > 0)
      return { ok: false as const, error: "Referral codes can only be added before your first order." };
    if (!referrer) return { ok: false as const, error: "We couldn't find that referral code." };
    if (referrer.id === userId) return { ok: false as const, error: "You can't use your own referral code." };
    if (me?.phone && referrer.phone && me.phone.replace(/\D/g, "").slice(-10) === referrer.phone.replace(/\D/g, "").slice(-10))
      return { ok: false as const, error: "This referral can't be applied to this account." };

    const { error } = await admin.from("referrals").insert({ referrer_id: referrer.id, referred_id: userId });
    if (error) return { ok: false as const, error: "Could not apply the code. Please try again." };
    return { ok: true as const };
  });
