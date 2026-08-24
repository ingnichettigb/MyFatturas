import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ngbQr from "@/assets/ngb-qr.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Accesso — Studio NGB" },
      {
        name: "description",
        content:
          "Area riservata dello Studio NGB per la gestione di preventivi, ordini e note onorarie.",
      },
      { property: "og:title", content: "Accesso — Studio NGB" },
      {
        property: "og:description",
        content: "Area riservata per preventivi, ordini e note onorarie dello Studio NGB.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [loading, session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account creato. Ora puoi accedere.");
        setMode("login");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Accesso non riuscito");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Accesso con Google non riuscito");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-10">
      <Card className="w-full max-w-md shadow-panel">
        <CardHeader className="items-center text-center">
          <img src={ngbQr} alt="Marchio NGB" className="mb-2 size-16 rounded-md" />
          <CardTitle className="font-display text-2xl uppercase tracking-wide">Studio NGB</CardTitle>
          <CardDescription>
            Dal preventivo alla nota onoraria. Area riservata dello studio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "login" ? "Accedi" : "Crea account"}
            </Button>
          </form>
          <Button variant="outline" className="w-full" onClick={google}>
            Continua con Google
          </Button>
          <button
            type="button"
            className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
