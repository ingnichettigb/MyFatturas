import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Printer, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RigheEditor, type RigaForm } from "@/components/RigheEditor";
import { DocumentoStampa } from "@/components/DocumentoStampa";
import { AzioniDocumento, useDocumento } from "@/hooks/useDocumento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useClienti, useImpostazioni } from "@/lib/queries";
import {
  calcolaTotali,
  euro,
  n,
  round2,
  scadenzaFineMeseSuccessivo,
  STATI_FATTURA,
  tariffaNetta,
  type Fattura,
} from "@/lib/ngb";

export const Route = createFileRoute("/fatture/$id")({
  head: () => ({
    meta: [
      { title: "Dettaglio nota onoraria — Studio NGB" },
      {
        name: "description",
        content:
          "Nota onoraria: numero modificabile, voci di vacazione, contributo di cassa, bollo, scadenza e stato del pagamento.",
      },
      { property: "og:title", content: "Dettaglio nota onoraria — Studio NGB" },
      {
        property: "og:description",
        content: "Voci, cassa, bollo, scadenza e pagamento della nota onoraria.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FatturaDetail,
});

function FatturaDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: imp } = useImpostazioni();
  const { data: clienti = [] } = useClienti();

  const { data, isLoading } = useQuery({
    queryKey: ["fattura", id],
    queryFn: async () => {
      const [f, r] = await Promise.all([
        supabase.from("fatture").select("*").eq("id", id).single(),
        supabase.from("fattura_righe").select("*").eq("fattura_id", id).order("ordinamento"),
      ]);
      if (f.error) throw f.error;
      if (r.error) throw r.error;
      return { testata: f.data as Fattura, righe: r.data };
    },
  });

  const [t, setT] = useState<Fattura | null>(null);
  const [righe, setRighe] = useState<RigaForm[]>([]);

  useEffect(() => {
    if (!data) return;
    setT(data.testata);
    setRighe(
      data.righe.map((r) => ({
        id: r.id,
        descrizione: r.descrizione,
        ore: String(r.ore),
        prezzo_ora: String(r.prezzo_ora),
      })),
    );
  }, [data]);

  const totali = useMemo(
    () =>
      calcolaTotali({
        righe: righe.map((r) => ({ ore: r.ore, prezzo_ora: r.prezzo_ora })),
        contributoPct: t?.contributo_pct ?? 5,
        bollo: t?.bollo ?? 0,
        ritenuta: t?.ritenuta ?? 0,
      }),
    [righe, t?.contributo_pct, t?.bollo, t?.ritenuta],
  );

  const salva = useMutation({
    mutationFn: async () => {
      if (!t) return;
      const { error } = await supabase
        .from("fatture")
        .update({
          tipo: t.tipo,
          numero: t.numero,
          anno: t.anno,
          data: t.data,
          scadenza: t.scadenza,
          data_pagamento: t.data_pagamento,
          cliente_id: t.cliente_id,
          oggetto: t.oggetto,
          premessa: t.premessa,
          descrizione: t.descrizione,
          note: t.note,
          stato: t.stato,
          numero_ordine: t.numero_ordine,
          data_ordine: t.data_ordine || null,
          tariffa_oraria: t.tariffa_oraria,
          sconto_pct: t.sconto_pct,
          contributo_pct: t.contributo_pct,
          bollo: t.bollo,
          ritenuta: t.ritenuta,
          totale_ore: totali.ore,
          imponibile: totali.imponibile,
          contributo: totali.contributo,
          totale: totali.totale,
        })
        .eq("id", id);
      if (error) throw error;

      const del = await supabase.from("fattura_righe").delete().eq("fattura_id", id);
      if (del.error) throw del.error;
      if (righe.length) {
        const ins = await supabase.from("fattura_righe").insert(
          righe.map((r, i) => ({
            fattura_id: id,
            descrizione: r.descrizione,
            ore: n(r.ore),
            prezzo_ora: n(r.prezzo_ora),
            importo: round2(n(r.ore) * n(r.prezzo_ora)),
            ordinamento: i,
          })),
        );
        if (ins.error) throw ins.error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fattura", id] });
      qc.invalidateQueries({ queryKey: ["fatture"] });
      toast.success("Documento salvato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const elimina = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("fatture").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fatture"] });
      navigate({ to: "/fatture" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !t || !imp) {
    return (
      <AppShell title="Nota onoraria">
        <p className="label-tec">Caricamento…</p>
      </AppShell>
    );
  }

  const cliente = clienti.find((c) => c.id === t.cliente_id) ?? null;
  const set = (patch: Partial<Fattura>) => setT({ ...t, ...patch });
  const titolo = t.tipo === "nota" ? "NOTA ONORARIA" : "PREAVVISO DI PARCELLA";

  return (
    <AppShell
      title={`${t.tipo === "nota" ? "Nota" : "Preavviso"} ${t.numero}`}
      actions={
        <>
          <Button asChild variant="ghost">
            <Link to="/fatture">
              <ArrowLeft className="size-4" /> Elenco
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> Stampa
          </Button>
          <AzioniDocumento esportaPdf={doc.esportaPdf} salvaFile={doc.salvaFile} />
          <Button variant="secondary" onClick={() => salva.mutate()} disabled={salva.isPending}>
            <Save className="size-4" /> Salva
          </Button>
        </>
      }
    >
      <Tabs value={doc.tab} onValueChange={doc.setTab}>
        <TabsList className="no-print">
          <TabsTrigger value="dati">Compilazione</TabsTrigger>
          <TabsTrigger value="stampa">Anteprima documento</TabsTrigger>
        </TabsList>

        <TabsContent value="dati" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg uppercase tracking-wide">Testata</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="numero">Numero (modificabile)</Label>
                <Input
                  id="numero"
                  className="num"
                  value={t.numero}
                  onChange={(e) => set({ numero: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={t.tipo} onValueChange={(v) => set({ tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nota">Nota onoraria</SelectItem>
                    <SelectItem value="preavviso">Preavviso di parcella</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Stato</Label>
                <Select value={t.stato} onValueChange={(v) => set({ stato: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATI_FATTURA.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={t.data}
                  onChange={(e) =>
                    set({
                      data: e.target.value,
                      anno: new Date(e.target.value).getFullYear(),
                      scadenza: e.target.value
                        ? scadenzaFineMeseSuccessivo(e.target.value)
                        : t.scadenza,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="scadenza">Scadenza (fine mese successivo)</Label>
                <Input
                  id="scadenza"
                  type="date"
                  value={t.scadenza ?? ""}
                  onChange={(e) => set({ scadenza: e.target.value || null })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pagamento">Data pagamento</Label>
                <Input
                  id="pagamento"
                  type="date"
                  value={t.data_pagamento ?? ""}
                  onChange={(e) =>
                    set({
                      data_pagamento: e.target.value || null,
                      stato: e.target.value ? "pagata" : t.stato,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Select value={t.cliente_id ?? ""} onValueChange={(v) => set({ cliente_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    {clienti.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.ragione_sociale}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="numero_ordine">N° ordine cliente</Label>
                <Input
                  id="numero_ordine"
                  className="num"
                  value={t.numero_ordine}
                  onChange={(e) => set({ numero_ordine: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="data_ordine">Data ordine</Label>
                <Input
                  id="data_ordine"
                  type="date"
                  value={t.data_ordine ?? ""}
                  onChange={(e) => set({ data_ordine: e.target.value || null })}
                />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label htmlFor="oggetto">Oggetto</Label>
                <Input
                  id="oggetto"
                  value={t.oggetto}
                  onChange={(e) => set({ oggetto: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label htmlFor="premessa">Premessa</Label>
                <Textarea
                  id="premessa"
                  rows={2}
                  value={t.premessa}
                  onChange={(e) => set({ premessa: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label htmlFor="descrizione">Descrizione</Label>
                <Textarea
                  id="descrizione"
                  rows={3}
                  value={t.descrizione}
                  onChange={(e) => set({ descrizione: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label htmlFor="note">Note interne</Label>
                <Textarea
                  id="note"
                  rows={2}
                  value={t.note}
                  onChange={(e) => set({ note: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row flex-wrap items-end justify-between gap-4">
              <CardTitle className="font-display text-lg uppercase tracking-wide">
                Vacazioni
              </CardTitle>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label className="label-tec">Tariffa €/h</Label>
                  <Input
                    type="number"
                    step="0.01"
                    className="num h-9 w-28"
                    value={String(t.tariffa_oraria)}
                    onChange={(e) => set({ tariffa_oraria: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="label-tec">Sconto %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    className="num h-9 w-24"
                    value={String(t.sconto_pct)}
                    onChange={(e) => set({ sconto_pct: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="label-tec">Cassa %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    className="num h-9 w-24"
                    value={String(t.contributo_pct)}
                    onChange={(e) => set({ contributo_pct: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="label-tec">Bollo €</Label>
                  <Input
                    type="number"
                    step="0.01"
                    className="num h-9 w-24"
                    value={String(t.bollo)}
                    onChange={(e) => set({ bollo: Number(e.target.value) })}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRighe(
                      righe.map((r) => ({
                        ...r,
                        prezzo_ora: String(
                          tariffaNetta(Number(t.tariffa_oraria), Number(t.sconto_pct)),
                        ),
                      })),
                    )
                  }
                >
                  Applica tariffa netta (
                  {euro(tariffaNetta(Number(t.tariffa_oraria), Number(t.sconto_pct)))})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <RigheEditor
                righe={righe}
                onChange={setRighe}
                prezzoDefault={tariffaNetta(Number(t.tariffa_oraria), Number(t.sconto_pct))}
              />
              <div className="mt-4 flex justify-end">
                <table className="num min-w-[20rem] text-sm">
                  <tbody>
                    <tr>
                      <td className="py-1 pr-6 text-muted-foreground">Ore totali</td>
                      <td className="py-1 text-right">{totali.ore.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-6 text-muted-foreground">Imponibile</td>
                      <td className="py-1 text-right">{euro(totali.imponibile)}</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-6 text-muted-foreground">
                        Contributo cassa {Number(t.contributo_pct)}%
                      </td>
                      <td className="py-1 text-right">{euro(totali.contributo)}</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-6 text-muted-foreground">Bollo art. 15</td>
                      <td className="py-1 text-right">{euro(totali.bollo)}</td>
                    </tr>
                    <tr className="border-t font-semibold">
                      <td className="py-1.5 pr-6">Totale a pagare</td>
                      <td className="py-1.5 text-right">{euro(totali.totale)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                if (confirm(`Eliminare il documento ${t.numero}?`)) elimina.mutate();
              }}
            >
              <Trash2 className="size-4" /> Elimina documento
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="stampa">
          <div ref={doc.docRef}>
          <DocumentoStampa
            imp={imp}
            cliente={cliente}
            titolo={titolo}
            numeroDoc={t.numero}
            data={t.data}
            oggetto={t.oggetto}
            premessa={t.premessa}
            descrizione={t.descrizione}
            mostraFiscale={t.tipo === "nota"}
            scadenza={t.scadenza}
            righe={righe.map((r, i) => ({
              id: r.id,
              posizione: String(i + 1).padStart(3, "0"),
              descrizione: r.descrizione,
              ore: r.ore,
              prezzo_ora: r.prezzo_ora,
              importo: round2(n(r.ore) * n(r.prezzo_ora)),
            }))}
            totali={totali}
            riferimenti={[{ label: "Vs. ordine", value: t.numero_ordine }]}
          />
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
