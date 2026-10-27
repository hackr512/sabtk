import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoMark } from "@/components/site/Logo";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const safePath = (p: string | undefined) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "/account");

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => z.object({ redirect: z.string().max(300).optional().catch(undefined) }).parse(s),
  head: () => ({
    meta: [
      { title: "Sign in — SabTk" },
      { name: "description", content: "Sign in or create a SabTk account to order groceries, save plans and earn rewards." },
      { property: "og:title", content: "Sign in — SabTk" },
      { property: "og:description", content: "Your SabTk grocery account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const target = safePath(redirect);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    if (!loading && user) navigate({ to: target, replace: true });
  }, [user, loading, navigate, target]);

  useEffect(() => {
    sessionStorage.setItem("sabtk-after-auth", target);
  }, [target]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}${target}`,
            data: { full_name: form.name },
          },
        });
        if (error) throw error;
        if (!data.session) toast.success("Check your email to confirm your account, then sign in.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: "google" | "lovable") => {
    const res = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (res.error) toast.error("Sign-in didn't complete. Please try again.");
  };

  return (
    <div className="hero-wash">
      <div className="container-page flex justify-center py-12 md:py-20">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-pop md:p-8">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <h1 className="text-2xl font-extrabold">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
              <p className="text-sm text-muted-foreground">Orders, saved lists, GharBudget and rewards in one place.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-2">
            <Button variant="outline" onClick={() => oauth("google")}>Continue with Google</Button>
            <button type="button" className="lovable-auth-button" onClick={() => oauth("lovable")}>
              Continue with Lovable
            </button>
          </div>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to SabTk?" : "Already have an account?"}{" "}
            <button type="button" className="font-semibold text-primary" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            By continuing you agree to our <Link to="/terms" className="underline">terms</Link> and{" "}
            <Link to="/privacy" className="underline">privacy policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
