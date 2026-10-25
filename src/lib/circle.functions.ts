import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const joinCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        campaignId: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
        zoneId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: c } = await admin
      .from("campaigns")
      .select("id, status, deadline, max_per_user")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (!c) return { ok: false as const, error: "Campaign not found." };
    if (!["collecting", "goal_reached"].includes(c.status))
      return { ok: false as const, error: "This campaign is no longer accepting reservations." };
    if (new Date(c.deadline).getTime() < Date.now())
      return { ok: false as const, error: "The deadline for this campaign has passed." };
    if (data.quantity > c.max_per_user)
      return { ok: false as const, error: `You can reserve up to ${c.max_per_user} per household.` };
    if (data.zoneId) {
      const { data: z } = await admin
        .from("delivery_zones")
        .select("id, is_active")
        .eq("id", data.zoneId)
        .maybeSingle();
      if (!z?.is_active) return { ok: false as const, error: "We don't deliver to that area yet." };
    }
    const { error } = await admin.from("campaign_participants").upsert(
      {
        campaign_id: c.id,
        user_id: context.userId,
        quantity: data.quantity,
        status: "reserved",
        zone_id: data.zoneId ?? null,
      },
      { onConflict: "campaign_id,user_id" },
    );
    if (error) {
      console.error("joinCampaign", error);
      return { ok: false as const, error: "Could not save your reservation. Please try again." };
    }
    return { ok: true as const };
  });

export const leaveCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ campaignId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: c } = await admin
      .from("campaigns")
      .select("status, deadline")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (!c) return { ok: false as const, error: "Campaign not found." };
    if (!["collecting", "goal_reached"].includes(c.status) || new Date(c.deadline).getTime() < Date.now())
      return {
        ok: false as const,
        error: "Reservations can't be withdrawn after the campaign closes. Please contact support.",
      };
    const { error } = await admin
      .from("campaign_participants")
      .update({ status: "cancelled" })
      .eq("campaign_id", data.campaignId)
      .eq("user_id", context.userId)
      .in("status", ["reserved"]);
    if (error) return { ok: false as const, error: "Could not withdraw. Please try again." };
    return { ok: true as const };
  });
