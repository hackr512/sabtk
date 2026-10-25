import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Info, Truck, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { useArea } from "@/hooks/use-area";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { joinCampaign, leaveCampaign } from "@/lib/circle.functions";
import { formatPKR } from "@/lib/pricing";
import type { Campaign, CampaignStatus } from "@/lib/types";

export const CAMPAIGN_STATUS: Record<CampaignStatus, { label: string; variant: "lime" | "success" | "loyalty" | "warning" | "muted" }> = {
  collecting: { label: "Collecting Orders", variant: "lime" },
  goal_reached: { label: "Goal Reached", variant: "success" },
  confirming_supplier: { label: "Confirming Supplier", variant: "warning" },
  confirmed: { label: "Confirmed", variant: "success" },
  failed: { label: "Did not reach minimum", variant: "muted" },
  cancelled: { label: "Cancelled", variant: "muted" },
  completed: { label: "Completed", variant: "muted" },
};

export function formatPkDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Karachi",
  });
}

export function useMyParticipation() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-circle", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_participants")
        .select("campaign_id, quantity, status");
      if (error) throw error;
      return new Map((data ?? []).map((r) => [r.campaign_id, r]));
    },
  });
}

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const { user } = useAuth();
  const { zoneId } = useArea();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const mine = useMyParticipation().data?.get(campaign.id);
  const active = mine && ["reserved", "confirmed"].includes(mine.status);
  const join = useServerFn(joinCampaign);
  const leave = useServerFn(leaveCampaign);
  const closed = new Date(campaign.deadline).getTime() < Date.now();
  const canJoin = ["collecting", "goal_reached"].includes(campaign.status) && !closed;
  const pct = Math.min(100, Math.round((campaign.committedQuantity / campaign.minQuantity) * 100));
  const status = CAMPAIGN_STATUS[campaign.status];

  const joinM = useMutation({
    mutationFn: () => join({ data: { campaignId: campaign.id, quantity: qty, zoneId: zoneId ?? undefined } }),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("You're in! We'll update you when the campaign status changes.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["my-circle"] });
    },
    onError: () => toast.error("Could not save your reservation."),
  });
  const leaveM = useMutation({
    mutationFn: () => leave({ data: { campaignId: campaign.id } }),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Reservation withdrawn");
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["my-circle"] });
    },
  });

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex gap-4 p-4">
        {campaign.product.image && (
          <img
            src={campaign.product.image}
            alt={campaign.product.name}
            width={96}
            height={96}
            loading="lazy"
            className="size-24 shrink-0 rounded-xl bg-surface object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <Badge variant={status.variant}>{status.label}</Badge>
          <h3 className="mt-1.5 text-lg font-bold leading-tight">{campaign.title}</h3>
          <p className="text-xs text-muted-foreground">
            {[campaign.product.brand, campaign.product.name, campaign.product.packSize].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <div className="space-y-3 px-4 pb-4">
        <div className="flex items-baseline justify-between rounded-xl bg-surface px-3 py-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {campaign.priceIsConfirmed ? "Confirmed price" : "Estimated price"}
            </div>
            <div className="text-xl font-extrabold">{formatPKR(campaign.price)}</div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            Current shelf price
            <div className="font-semibold text-foreground">{formatPKR(campaign.product.price)}</div>
          </div>
        </div>
        {!campaign.priceIsConfirmed && (
          <p className="text-xs text-muted-foreground">
            Estimate only — the final price is confirmed once the supplier agrees. You can withdraw if it changes.
          </p>
        )}

        <div>
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="font-semibold">
              {campaign.committedQuantity} of {campaign.minQuantity} packs committed
            </span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" aria-label="Campaign progress" />
        </div>

        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-center gap-2">
            <Users className="size-3.5 text-primary" />
            {campaign.participantCount === 0
              ? "No households have joined yet"
              : `${campaign.participantCount} household${campaign.participantCount > 1 ? "s" : ""} joined`}
          </li>
          <li className="flex items-center gap-2">
            <CalendarClock className="size-3.5 text-primary" />
            {closed ? "Closed" : "Closes"} {formatPkDateTime(campaign.deadline)}
          </li>
          <li className="flex items-center gap-2">
            <Truck className="size-3.5 text-primary" />
            {campaign.deliveryWindowText}
          </li>
        </ul>

        <div className="flex items-center gap-2 pt-1">
          {active ? (
            <>
              <Badge variant="loyalty">You reserved {mine!.quantity}</Badge>
              {canJoin && (
                <Button variant="ghost" size="sm" onClick={() => leaveM.mutate()} disabled={leaveM.isPending}>
                  Withdraw
                </Button>
              )}
              {canJoin && (
                <Button variant="outline" size="sm" className="ml-auto" onClick={() => { setQty(mine!.quantity); setOpen(true); }}>
                  Change
                </Button>
              )}
            </>
          ) : canJoin ? (
            user ? (
              <Button className="w-full" onClick={() => setOpen(true)}>
                Join Campaign
              </Button>
            ) : (
              <Button asChild className="w-full">
                <Link to="/auth" search={{ redirect: "/ration-circle" }}>
                  Sign in to join
                </Link>
              </Button>
            )
          ) : (
            <span className="text-xs text-muted-foreground">Not accepting new reservations.</span>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Join {campaign.title}</DialogTitle>
            <DialogDescription>Reserve your packs. You can withdraw until the campaign closes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">How many packs?</div>
                <div className="text-xs text-muted-foreground">Up to {campaign.maxPerUser} per household</div>
              </div>
              <QuantityStepper value={qty} max={campaign.maxPerUser} onChange={(v) => setQty(Math.max(1, v))} />
            </div>
            <div className="rounded-xl bg-surface p-3 text-sm">
              <div className="flex justify-between">
                <span>{campaign.priceIsConfirmed ? "Price" : "Estimated price"}</span>
                <span className="font-bold">{formatPKR(campaign.price * qty)}</span>
              </div>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="flex gap-2"><Info className="mt-0.5 size-3.5 shrink-0 text-primary" /> <span><b className="text-foreground">Payment:</b> {campaign.paymentRule}</span></p>
              <p className="flex gap-2"><Info className="mt-0.5 size-3.5 shrink-0 text-primary" /> <span><b className="text-foreground">If the minimum isn't reached:</b> {campaign.failurePolicy}</span></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => joinM.mutate()} disabled={joinM.isPending}>
              {joinM.isPending ? "Saving…" : "Confirm reservation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
