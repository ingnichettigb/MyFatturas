import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, Plus, ReceiptEuro, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHead, useSort } from "@/components/SortableHead";
import { supabase } from "@/integrations/supabase/client";
import { useClienti, useCommesse, useFatture, useImpostazioni, usePreventivi } from "@/lib/queries";
import {
  calcolaTotali,
  classeRigaPreventivo,
  dataIt,
  euro,
  labelStato,
  n,
  numero,
  oggi,
  prossimoNumero,
  round2,
  scadenzaFineMeseSuccessivo,
  STATI_PREVENTIVO,
} from "@/lib/ngb";

export const Route = createFileRoute("/preventivi/")({
  head: () => ({
    meta: [
      { title: "Preventivi — Studio NGB" },
      {
        name: "description",
        content:
          "Preventivi per vacazioni tecniche: numerazione automatica modificabile, stato di avanzamento e conversione in nota onoraria.",
      },
      { property: "og:title", content: "Preventivi — Studio NGB" },
      {
        property: "og:description",
        content: "Preventivi per vacazioni tecniche con numerazione e stato di avanzamento.",
      },
    ],
  }),
  component: PreventiviPage,
});

function PreventiviPage() {
  const { data: preventivi = [], isLoading } = usePreventivi();
  const { data: clienti = [] } = useClienti();
  const { data: commesse = [] } = useCommesse();
  const { data: imp } = useImpostazioni();
  const { data: fatture = [] } = useFatture();
  const { sorted, sort, onSort } = useSort(
    preventivi.map((p) => {
      const fattura = fatture.find((f) => f.preventivo_id === p.id);
      return {
        ...p,
        clienteNome: clienti.find((c) => c.id === p.cliente_id)?.ragione_sociale ?? "",
        statoLabel: labelStato(STATI_PREVENTIVO, p.stato),
        fatturaId: fattura?.id ?? null,
        fatturaNumero: fattura?.numero ?? "",
        dataPagamento: fattura?.data_pagamento ?? null,
      };
    }),
    {
      numero: (p) => p.numero,
      data: (p) => p.data,
      pagamento: (p) => p.dataPagamento ?? "",
      fattura: (p) => p.fatturaNumero,
      cliente: (p) => p.clienteNome,
      oggetto: (p) => p.oggetto,
      ore: (p) => p.totale_ore,
      totale: (p) => p.totale,
      stato: (p) => p.statoLabel,
    },
  );
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState("tutti");
  const anno = new Date().getFullYear();
  const [form, setForm] = useState({ numero: "", cliente_id: "", commessa_id: "", oggetto: "" });

  function apri() {
    setForm({
      numero: prossimoNumero("preventivo", anno, preventivi),
      cliente_id: "",
      commessa_id: "",
      oggetto: "",
    });
    setOpen(true);
  }

  const crea = useMutation({
    mutationFn: async () => {
      if (!form.numero.trim()) throw new Error("Indica il numero del preventivo");
      if (!form.cliente_id) throw new Error("Seleziona il cliente");
      const { data, error } = await supabase
        .from("preventivi")
        .insert({
          numero: form.numero.trim(),
          anno,
          data: oggi(),
          cliente_id: form.cliente_id,
          commessa_id: form.commessa_id || null,
          oggetto: form.oggetto,
          tariffa_oraria: Number(imp?.tariffa_oraria ?? 24),
          sconto_pct: Number(imp?.sconto_pct ?? 0),
          contributo_pct: Number(imp?.contributo_pct ?? 5),
          bollo: 0,
          premessa:
            "In riferimento alla Vs. richiesta, sottopongo alla Vs. attenzione il preventivo per le prestazioni tecniche di seguito descritte.",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["preventivi"] });
      setOpen(false);
      navigate({ to: "/preventivi/$id", params: { id }, search: { mail: false } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const diventaFattura = useMutation({
    mutationFn: async (p: (typeof sorted)[number]) => {
      const { data: righe, error: eR } = await supabase
        .from("preventivo_righe")
        .select("*")
        .eq("preventivo_id", p.id)
        .order("ordinamento");
      if (eR) throw eR;
      if (!righe?.length) throw new Error(`Il preventivo ${p.numero} non ha voci da fatturare`);
      const data = oggi();
      const bollo = Number(imp?.bollo ?? 0);
      const tot = calcolaTotali({
        righe: righe.map((r) => ({ ore: r.ore, prezzo_ora: r.prezzo_ora })),
        contributoPct: p.contributo_pct,
        bollo,
      });
      const { data: fat, error } = await supabase
        .from("fatture")
        .insert({
          tipo: "nota",
          numero: prossimoNumero("nota", anno, fatture),
          anno,
          data,
          scadenza: scadenzaFineMeseSuccessivo(data),
          cliente_id: p.cliente_id,
          preventivo_id: p.id,
          oggetto: p.oggetto,
          descrizione: p.descrizione,
          premessa:
            "Per le prestazioni professionali di seguito indicate, Vi rimetto la presente nota onoraria.",
          numero_ordine: p.numero_ordine,
          data_ordine: p.data_ordine,
          tariffa_oraria: p.tariffa_oraria,
          sconto_pct: p.sconto_pct,
          contributo_pct: p.contributo_pct,
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
          commessa_id: p.commessa_id,
          descrizione: r.descrizione,
          ore: n(r.ore),
          prezzo_ora: n(r.prezzo_ora),
          importo: round2(n(r.ore) * n(r.prezzo_ora)),
          ordinamento: i,
        })),
      );
      if (ins.error) throw ins.error;
      await supabase.from("preventivi").update({ stato: "fatturato" }).eq("id", p.id);
      return fat.id;
    },
    onSuccess: (fid) => {
      qc.invalidateQueries({ queryKey: ["fatture"] });
      qc.invalidateQueries({ queryKey: ["preventivi"] });
      toast.success("Nota onoraria creata");
      navigate({ to: "/fatture/$id", params: { id: fid }, search: { mail: false } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplica = useMutation({
    mutationFn: async (p: (typeof preventivi)[number]) => {
      const { data, error } = await supabase
        .from("preventivi")
        .insert({
          numero: prossimoNumero("preventivo", anno, preventivi),
          anno,
          data: oggi(),
          cliente_id: p.cliente_id,
          commessa_id: p.commessa_id,
          oggetto: p.oggetto,
          premessa: p.premessa,
          descrizione: p.descrizione,
          tariffa_oraria: p.tariffa_oraria,
          sconto_pct: p.sconto_pct,
          contributo_pct: p.contributo_pct,
          bollo: p.bollo,
          validita: p.validita,
          stato: "bozza",
        })
        .select("id")
        .single();
      if (error) throw error;
      const { data: righe, error: eR } = await supabase
        .from("preventivo_righe")
        .select("*")
        .eq("preventivo_id", p.id);
      if (eR) throw eR;
      if (righe?.length) {
        const { error: eI } = await supabase.from("preventivo_righe").insert(
          righe.map(({ id: _id, created_at: _c, preventivo_id: _p, ...r }) => ({
            ...r,
            preventivo_id: data.id,
          })),
        );
        if (eI) throw eI;
      }
      return data.id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["preventivi"] });
      toast.success("Preventivo duplicato");
      navigate({ to: "/preventivi/$id", params: { id }, search: { mail: false } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const elimina = useMutation({
    mutationFn: async (id: string) => {
      const { error: eR } = await supabase.from("preventivo_righe").delete().eq("preventivo_id", id);
      if (eR) throw eR;
      const { error } = await supabase.from("preventivi").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preventivi"] });
      toast.success("Preventivo eliminato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lista = sorted.filter((p) => filtro === "tutti" || p.stato === filtro);

  return (
    <AppShell
      title="Preventivi"
      actions={
        <>
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti gli stati</SelectItem>
              {STATI_PREVENTIVO.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={apri}>
            <Plus className="size-4" /> Nuovo preventivo
          </Button>
        </>
      }
    >
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead label="Numero" sortKey="numero" sort={sort} onSort={onSort} />
                <SortableHead label="Data" sortKey="data" sort={sort} onSort={onSort} />
                <SortableHead label="Cliente" sortKey="cliente" sort={sort} onSort={onSort} />
                <SortableHead label="Oggetto" sortKey="oggetto" sort={sort} onSort={onSort} />
                <SortableHead
                  label="Ore"
                  sortKey="ore"
                  sort={sort}
                  onSort={onSort}
                  className="w-20 text-right"
                />
                <SortableHead
                  label="Totale"
                  sortKey="totale"
                  sort={sort}
                  onSort={onSort}
                  className="w-28 text-right"
                />
                <SortableHead
                  label="Fattura"
                  sortKey="fattura"
                  sort={sort}
                  onSort={onSort}
                  className="w-28"
                />
                <SortableHead
                  label="Pagamento"
                  sortKey="pagamento"
                  sort={sort}
                  onSort={onSort}
                  className="w-28"
                />
                <SortableHead label="Stato" sortKey="stato" sort={sort} onSort={onSort} className="w-28" />
                <TableHead className="w-48 text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((p) => (
                <TableRow
                  key={p.id}
                  className={`cursor-pointer ${classeRigaPreventivo(p.stato, p.numero_ordine)}`}
                >
                  <TableCell className="num font-medium">
                    <Link to="/preventivi/$id" params={{ id: p.id }} search={{ mail: false }} className="hover:underline">
                      {p.numero}
                    </Link>
                  </TableCell>
                  <TableCell className="num">{dataIt(p.data)}</TableCell>
                  <TableCell>{p.clienteNome || "—"}</TableCell>
                  <TableCell className="max-w-[24rem] truncate text-muted-foreground">
                    {p.oggetto || "—"}
                  </TableCell>
                  <TableCell className="num text-right">{numero(p.totale_ore)}</TableCell>
                  <TableCell className="num text-right">{euro(p.totale)}</TableCell>
                  <TableCell className="num">
                    {p.fatturaId ? (
                      <Link
                        to="/fatture/$id"
                        params={{ id: p.fatturaId }}
                        className="hover:underline"
                      >
                        {p.fatturaNumero}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="num">{dataIt(p.dataPagamento)}</TableCell>
                  <TableCell>
                    <Badge variant={p.stato === "accettato" ? "default" : "secondary"}>
                      {p.statoLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Diventa fattura"
                        disabled={diventaFattura.isPending}
                        onClick={() => diventaFattura.mutate(p)}
                      >
                        <ReceiptEuro className="size-4" />
                      </Button>
                      <Button asChild variant="ghost" size="icon" title="Vedi">
                        <Link to="/preventivi/$id" params={{ id: p.id }} search={{ mail: false }}>
                          <Eye className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Duplica"
                        disabled={duplica.isPending}
                        onClick={() => duplica.mutate(p)}
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Invia di nuovo"
                        onClick={() =>
                          navigate({ to: "/preventivi/$id", params: { id: p.id }, search: { mail: true } })
                        }
                      >
                        <Send className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Elimina"
                        disabled={elimina.isPending}
                        onClick={() => {
                          if (confirm(`Eliminare il preventivo ${p.numero}?`)) elimina.mutate(p.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!lista.length && (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                    {isLoading ? "Caricamento…" : "Nessun preventivo."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo preventivo</DialogTitle>
            <DialogDescription>
              Il numero è proposto automaticamente ma resta sempre modificabile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="numero">Numero preventivo</Label>
              <Input
                id="numero"
                className="num"
                value={form.numero}
                onChange={(e) => setForm({ ...form, numero: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select
                value={form.cliente_id}
                onValueChange={(v) => setForm({ ...form, cliente_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona cliente" />
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
              <Label>Commessa (facoltativa)</Label>
              <Select
                value={form.commessa_id || "nessuna"}
                onValueChange={(v) => setForm({ ...form, commessa_id: v === "nessuna" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nessuna">Nessuna</SelectItem>
                  {commesse.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.codice} — {c.descrizione || "senza descrizione"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oggetto">Oggetto</Label>
              <Input
                id="oggetto"
                value={form.oggetto}
                onChange={(e) => setForm({ ...form, oggetto: e.target.value })}
                placeholder="Es. Attrezzatura di controllo — disegno 12345"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button onClick={() => crea.mutate()} disabled={crea.isPending}>
              Crea e apri
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
