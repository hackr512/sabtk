import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

/** Saved products (wishlist). Guests are invited to sign in. */
export function useWishlist() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["wishlist", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("wishlists").select("product_id");
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.product_id));
    },
  });
  const toggle = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error("signin");
      const has = q.data?.has(productId);
      if (has) {
        const { error } = await supabase.from("wishlists").delete().eq("product_id", productId).eq("user_id", user.id);
        if (error) throw error;
        return false;
      }
      const { error } = await supabase.from("wishlists").insert({ product_id: productId, user_id: user.id });
      if (error) throw error;
      return true;
    },
    onSuccess: (added) => {
      toast.success(added ? "Saved to your list" : "Removed from saved");
      qc.invalidateQueries({ queryKey: ["wishlist"] });
    },
    onError: (e: Error) => {
      if (e.message === "signin") {
        toast("Sign in to save products", {
          action: { label: "Sign in", onClick: () => navigate({ to: "/auth" }) },
        });
      } else toast.error("Couldn't update saved products");
    },
  });
  return { saved: q.data ?? new Set<string>(), toggle: (id: string) => toggle.mutate(id) };
}

export function usePointsBalance() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["points", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_points_balance");
      if (error) throw error;
      return data ?? 0;
    },
  });
}

const RV_KEY = "sabtk-recent-v1";

export function useRecentlyViewed() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      setIds(JSON.parse(localStorage.getItem(RV_KEY) ?? "[]"));
    } catch {
      setIds([]);
    }
  }, []);
  const push = (id: string) => {
    try {
      const prev: string[] = JSON.parse(localStorage.getItem(RV_KEY) ?? "[]");
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 12);
      localStorage.setItem(RV_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  return { ids, push };
}
