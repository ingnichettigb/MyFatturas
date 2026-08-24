import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { FileText, ReceiptEuro, Clock, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClienti, useFatture, usePreventivi } from "@/lib/queries";
import { dataIt, euro, labelStato, numero, STATI_FATTURA, STATI_PREVENTIVO } from "@/lib/ngb";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cruscotto — Studio NGB" },
      {
        name: "description",
        content:
          "Andamento dello studio: preventivi in corso, note onorarie da incassare e ore fatturate nell'anno.",
      },
      { property: "og:title", content: "Cruscotto — Studio NGB" },
      {
        property: "og:description",
        content: "Preventivi in corso, note onorarie da incassare e ore fatturate.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: preventivi = [] } = usePreventivi();
  const { data: fatture = [] } = useFatture();
  const { data: clienti = [] } = useClienti();
  const anno = new Date().getFullYear();

  const stats = useMemo(() => {
    const fAnno = fatture.filter((f) => f.anno === anno && f.tipo === "nota" && f.stato !== "annullata");
    return {
      aperti: preventivi.filter((p) => ["bozza", "inviato"].includes(p.stato)).length,
      accettati: preventivi.filter((p) => p.stato === "accettato").length,
      fatturato: fAnno.reduce((s, f) => s + Number(f.totale), 0),
      daIncassare: fAnno
        .filter((f) => f.stato !== "pagata")
        .reduce((s, f) => s + Number(f.totale), 0),
      ore: fAnno.reduce((s, f) => s + Number(f.totale_ore), 0),
    };
  }, [preventivi, fatture, anno]);

  const nomeCliente = (id: string | null) =>
    clienti.find((c) => c.id === id)?.ragione_sociale ?? "—";

  return (
    <AppShell
      title="Cruscotto"
      actions={
        <>
          <Button asChild variant="outline">
            <Link to="/preventivi">Nuovo preventivo</Link>
          </Button>
          <Button asChild>
            <Link to="/fatture">Nuova nota onoraria</Link>
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FileText} label="Preventivi aperti" value={String(stats.aperti)} hint={`${stats.accettati} accettati`} />
        <StatCard icon={TrendingUp} label={`Fatturato ${anno}`} value={euro(stats.fatturato)} hint="note onorarie emesse" />
        <StatCard icon={ReceiptEuro} label="Da incassare" value={euro(stats.daIncassare)} hint="note non ancora pagate" />
        <StatCard icon={Clock} label={`Ore ${anno}`} value={numero(stats.ore)} hint="vacazioni fatturate" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="font-display text-lg uppercase tracking-wide">
              Ultimi preventivi
            </CardTitle>
            <Link to="/preventivi" className="text-sm text-primary hover:underline">
              Tutti
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {preventivi.slice(0, 6).map((p) => (
              <Link
                key={p.id}
                to="/preventivi/$id"
                params={{ id: p.id }}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    <span className="num">{p.numero}</span> · {nomeCliente(p.cliente_id)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {dataIt(p.data)} — {p.oggetto || "senza oggetto"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary">{labelStato(STATI_PREVENTIVO, p.stato)}</Badge>
                  <span className="num text-sm">{euro(p.totale)}</span>
                </div>
              </Link>
            ))}
            {!preventivi.length && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nessun preventivo registrato.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="font-display text-lg uppercase tracking-wide">
              Ultimi documenti fiscali
            </CardTitle>
            <Link to="/fatture" className="text-sm text-primary hover:underline">
              Tutti
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {fatture.slice(0, 6).map((f) => (
              <Link
                key={f.id}
                to="/fatture/$id"
                params={{ id: f.id }}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    <span className="num">{f.numero}</span> · {nomeCliente(f.cliente_id)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {f.tipo === "preavviso" ? "Preavviso di parcella" : "Nota onoraria"} —{" "}
                    {dataIt(f.data)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={f.stato === "pagata" ? "default" : "secondary"}>
                    {labelStato(STATI_FATTURA, f.stato)}
                  </Badge>
                  <span className="num text-sm">{euro(f.totale)}</span>
                </div>
              </Link>
            ))}
            {!fatture.length && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nessun documento emesso.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 pt-6">
        <div>
          <p className="label-tec">{label}</p>
          <p className="num mt-1 text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <span className="rounded-md bg-accent p-2 text-accent-foreground">
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}
