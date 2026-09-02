import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Printer, Save, Trash2, ReceiptEuro } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RigheEditor, type RigaForm } from "@/components/RigheEditor";
import { DocumentoStampa } from "@/components/DocumentoStampa";
import { InviaMailDialog } from "@/components/InviaMailDialog";
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
import { useClienti, useCommesse, useFatture, useImpostazioni } from "@/lib/queries";
import {
  calcolaTotali,
  euro,
  n,
  oggi,
  prossimoNumero,
  round2,
  scadenzaFineMeseSuccessivo,
  STATI_PREVENTIVO,
  tariffaNetta,
  type Preventivo,
} from "@/lib/ngb";

export const Route = createFileRoute("/preventivi/$id")({
  head: () => ({
    meta: [
      { title: "Dettaglio preventivo — Studio NGB" },
      {
        name: "description",
        content:
          "Compilazione del preventivo: voci di vacazione, tariffa scontata, contributo di cassa e stampa su carta intestata.",
      },
      { property: "og:title", content: "Dettaglio preventivo — Studio NGB" },
      {
        property: "og:description",
        content: "Voci di vacazione, tariffe, contributo di cassa e stampa del preventivo.",
      },
    ],
  }),
  component: PreventivoDetail,
});

function PreventivoDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: imp } = useImpostazioni();
  const { data: clienti = [] } = useClienti();
  const { data: commesse = [] } = useCommesse();
  const { data: fatture = [] } = useFatture();

  const { data, isLoading } = useQuery({
    queryKey: ["preventivo", id],
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from("preventivi").select("*").eq("id", id).single(),
        supabase.from("preventivo_righe").select("*").eq("preventivo_id", id).order("ordinamento"),
      ]);
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      return { testata: p.data as Preventivo, righe: r.data };
    },
  });

  const [t, setT] = useState<Preventivo | null>(null);
  const doc = useDocumento(() => (t ? `Preventivo ${t.numero}` : "Preventivo"));
  const [righe, setRighe] = useState<RigaForm[]>([]);

  useEffect(() => {
    if (!data) return;
    setT(data.testata);
    setRighe(
      data.righe.map((r) => ({
        id: r.id,
        posizione: r.posizione,
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
      }),
    [righe, t?.contributo_pct, t?.bollo],
  );

  const salva = useMutation({
    mutationFn: async () => {
      if (!t) return;
      const { error } = await supabase
        .from("preventivi")
        .update({
          numero: t.numero,
          anno: t.anno,
          data: t.data,
          cliente_id: t.cliente_id,
          commessa_id: t.commessa_id,
          oggetto: t.oggetto,
          premessa: t.premessa,
          descrizione: t.descrizione,
          note: t.note,
          validita: t.validita,
          stato: t.stato,
          numero_ordine: t.numero_ordine,
          data_ordine: t.data_ordine || null,
          tariffa_oraria: t.tariffa_oraria,
          sconto_pct: t.sconto_pct,
          contributo_pct: t.contributo_pct,
          bollo: t.bollo,
          totale_ore: totali.ore,
          imponibile: totali.imponibile,
          contributo: totali.contributo,
          totale: totali.totale,
        })
        .eq("id", id);
      if (error) throw error;

      const del = await supabase.from("preventivo_righe").delete().eq("preventivo_id", id);
      if (del.error) throw del.error;
      if (righe.length) {
        const ins = await supabase.from("preventivo_righe").insert(
          righe.map((r, i) => ({
            preventivo_id: id,
            posizione: r.posizione || String(i + 1).padStart(3, "0"),
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
      qc.invalidateQueries({ queryKey: ["preventivo", id] });
      qc.invalidateQueries({ queryKey: ["preventivi"] });
      toast.success("Preventivo salvato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const elimina = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("preventivi").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preventivi"] });
      navigate({ to: "/preventivi" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const genera = useMutation({
    mutationFn: async (tipo: "preavviso" | "nota") => {
      if (!t) throw new Error("Preventivo non caricato");
      if (!righe.length) throw new Error("Aggiungi almeno una voce prima di fatturare");
      await salva.mutateAsync();
      const anno = new Date().getFullYear();
      const data = oggi();
      const bollo = tipo === "nota" ? Number(imp?.bollo ?? 0) : 0;
      const tot = calcolaTotali({
        righe: righe.map((r) => ({ ore: r.ore, prezzo_ora: r.prezzo_ora })),
        contributoPct: t.contributo_pct,
        bollo,
      });
      const { data: fat, error } = await supabase
        .from("fatture")
        .insert({
          tipo,
          numero: prossimoNumero(tipo, anno, fatture),
          anno,
          data,
          scadenza: scadenzaFineMeseSuccessivo(data),
          cliente_id: t.cliente_id,
          preventivo_id: t.id,
          oggetto: t.oggetto,
          descrizione: t.descrizione,
          premessa:
            tipo === "nota"
              ? "Per le prestazioni professionali di seguito indicate, Vi rimetto la presente nota onoraria."
              : "Con la presente Vi trasmetto il preavviso di parcella relativo alle prestazioni di seguito indicate.",
          numero_ordine: t.numero_ordine,
          data_ordine: t.data_ordine,
          tariffa_oraria: t.tariffa_oraria,
          sconto_pct: t.sconto_pct,
          contributo_pct: t.contributo_pct,
          bollo,
          totale_ore: tot.ore,
          imponibile: tot.imponibile,
          contributo: tot.contributo,
          totale: tot.totale,
        })
        .select("id")
        .single();
      if (error) throw error;
      const ins = await supabase.from("fattura_righe").insert(
        righe.map((r, i) => ({
          fattura_id: fat.id,
          commessa_id: t.commessa_id,
          descrizione: r.descrizione,
          ore: n(r.ore),
          prezzo_ora: n(r.prezzo_ora),
          importo: round2(n(r.ore) * n(r.prezzo_ora)),
          ordinamento: i,
        })),
      );
      if (ins.error) throw ins.error;
      if (tipo === "nota") {
        await supabase.from("preventivi").update({ stato: "fatturato" }).eq("id", id);
      }
      return fat.id;
    },
    onSuccess: (fid) => {
      qc.invalidateQueries({ queryKey: ["fatture"] });
      qc.invalidateQueries({ queryKey: ["preventivi"] });
      navigate({ to: "/fatture/$id", params: { id: fid } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !t || !imp) {
    return (
      <AppShell title="Preventivo">
        <p className="label-tec">Caricamento…</p>
      </AppShell>
    );
  }

  const cliente = clienti.find((c) => c.id === t.cliente_id) ?? null;
  const set = (patch: Partial<Preventivo>) => setT({ ...t, ...patch });

  return (
    <AppShell
      title={`Preventivo ${t.numero}`}
      actions={
        <>
          <Button asChild variant="ghost">
            <Link to="/preventivi">
              <ArrowLeft className="size-4" /> Elenco
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> Stampa
          </Button>
          <AzioniDocumento esportaPdf={doc.esportaPdf} salvaFile={doc.salvaFile} />
          <InviaMailDialog
            scaricaPdf={doc.esportaPdf}
            preparaPdf={doc.preparaPdf}
            dati={{
              destinatario: cliente?.email ?? "",
              ragioneSociale: cliente?.ragione_sociale ?? "",
              referente: cliente?.referente ?? "",
              numeroDoc: t.numero,
              data: t.data,
              oggetto: t.oggetto,
              totale: euro(totali.totale),
              validita: t.validita,
              firma: imp.studio_nome,
              telefono: imp.studio_tel,
            }}
          />

          <Button
            variant="outline"
            onClick={() => genera.mutate("preavviso")}
            disabled={genera.isPending}
          >
            Preavviso
          </Button>
          <Button onClick={() => genera.mutate("nota")} disabled={genera.isPending}>
            <ReceiptEuro className="size-4" /> Nota onoraria
          </Button>
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
              <CardTitle className="font-display text-lg uppercase tracking-wide">
                Testata
              </CardTitle>
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
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={t.data}
                  onChange={(e) =>
                    set({ data: e.target.value, anno: new Date(e.target.value).getFullYear() })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Stato</Label>
                <Select value={t.stato} onValueChange={(v) => set({ stato: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATI_PREVENTIVO.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Select
                  value={t.cliente_id ?? ""}
                  onValueChange={(v) => set({ cliente_id: v })}
                >
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
                <Label>Commessa</Label>
                <Select
                  value={t.commessa_id ?? "nessuna"}
                  onValueChange={(v) => set({ commessa_id: v === "nessuna" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nessuna">Nessuna</SelectItem>
                    {commesse.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.codice}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="validita">Validità offerta</Label>
                <Input
                  id="validita"
                  value={t.validita}
                  onChange={(e) => set({ validita: e.target.value })}
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
                <Label htmlFor="descrizione">Descrizione estesa</Label>
                <Textarea
                  id="descrizione"
                  rows={3}
                  value={t.descrizione}
                  onChange={(e) => set({ descrizione: e.target.value })}
                />
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
                  Applica tariffa netta ({euro(tariffaNetta(Number(t.tariffa_oraria), Number(t.sconto_pct)))})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <RigheEditor
                righe={righe}
                onChange={setRighe}
                conPosizione
                prezzoDefault={tariffaNetta(Number(t.tariffa_oraria), Number(t.sconto_pct))}
              />
              <div className="mt-4 flex justify-end">
                <table className="num min-w-[18rem] text-sm">
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
                    <tr className="border-t font-semibold">
                      <td className="py-1.5 pr-6">Totale preventivo</td>
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
                if (confirm(`Eliminare il preventivo ${t.numero}?`)) elimina.mutate();
              }}
            >
              <Trash2 className="size-4" /> Elimina preventivo
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="stampa">
          <div ref={doc.docRef}>
          <DocumentoStampa
            imp={imp}
            cliente={cliente}
            titolo="PREVENTIVO"
            numeroDoc={t.numero}
            data={t.data}
            oggetto={t.oggetto}
            premessa={t.premessa}
            descrizione={t.descrizione}
            mostraFiscale={false}
            righe={righe.map((r, i) => ({
              id: r.id,
              posizione: r.posizione || String(i + 1).padStart(3, "0"),
              descrizione: r.descrizione,
              ore: r.ore,
              prezzo_ora: r.prezzo_ora,
              importo: round2(n(r.ore) * n(r.prezzo_ora)),
            }))}
            totali={totali}
            riferimenti={[
              { label: "Validità offerta", value: t.validita },
              { label: "Vs. riferimento", value: t.numero_ordine },
            ]}
          />
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
