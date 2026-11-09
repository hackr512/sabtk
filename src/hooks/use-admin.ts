import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/** True when the signed-in user has the admin role. Server-enforced via the has_role RPC. */
export function useIsAdmin() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () =>
      (await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" })).data === true,
  });
  return data === true;
}
