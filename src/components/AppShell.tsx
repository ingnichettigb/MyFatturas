import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Boxes,
  FileText,
  ReceiptEuro,
  Settings,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ngbQr from "@/assets/ngb-qr.png";

const NAV = [
  { to: "/", label: "Cruscotto", icon: LayoutDashboard },
  { to: "/clienti", label: "Clienti", icon: Users },
  { to: "/commesse", label: "Commesse", icon: Boxes },
  { to: "/preventivi", label: "Preventivi", icon: FileText },
  { to: "/fatture", label: "Note onorarie", icon: ReceiptEuro },
  { to: "/impostazioni", label: "Impostazioni", icon: Settings },
];

export function AppShell({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="label-tec">Caricamento…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
          <img src={ngbQr} alt="Marchio NGB" className="size-9 rounded-sm bg-paper p-0.5" />
          <div>
            <p className="font-display text-lg leading-none tracking-wide">STUDIO NGB</p>
            <p className="text-[11px] text-sidebar-foreground/60">Preventivi e note onorarie</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <p className="truncate px-1 pb-2 text-[11px] text-sidebar-foreground/60">
            {session.user.email}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="size-4" /> Esci
          </Button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-background/85 px-5 py-3 backdrop-blur">
          <h1 className="font-display text-2xl uppercase tracking-wide">{title}</h1>
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        </header>
        <nav className="no-print flex gap-1 overflow-x-auto border-b bg-card px-3 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="p-5">{children}</main>
      </div>
    </div>
  );
}
