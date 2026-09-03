import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
import { useClienti, useFatture, useImpostazioni } from "@/lib/queries";
import {
  classeRigaFattura,
  dataIt,
  euro,
  labelStato,
  oggi,
  prossimoNumero,
  scadenzaFineMeseSuccessivo,
  STATI_FATTURA,
} from "@/lib/ngb";

export const Route = createFileRoute("/fatture/")({
  head: () => ({
    meta: [
      { title: "Note onorarie — Studio NGB" },
      {
        name: "description",
        content:
          "Elenco di preavvisi e note onorarie: numerazione modificabile, scadenze a fine mese successivo e stato dei pagamenti.",
      },
      { property: "og:title", content: "Note onorarie — Studio NGB" },
      {
        property: "og:description",
        content: "Preavvisi e note onorarie con scadenze e stato dei pagamenti.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FatturePage,
});

function FatturePage() {
  const { data: fatture = [], isLoading } = useFatture();
  const { data: clienti = [] } = useClienti();
  const { data: imp } = useImpostazioni();
  const { sorted, sort, onSort } = useSort(
    fatture.map((f) => ({
      ...f,
      clienteNome: clienti.find((c) => c.id === f.cliente_id)?.ragione_sociale ?? "",
      tipoLabel: f.tipo === "nota" ? "Nota" : "Preavviso",
      statoLabel: labelStato(STATI_FATTURA, f.stato),
    })),
    {
      numero: (f) => f.numero,
      tipo: (f) => f.tipoLabel,
      data: (f) => f.data,
      cliente: (f) => f.clienteNome,
      scadenza: (f) => f.scadenza,
      pagamento: (f) => f.data_pagamento ?? "",
      totale: (f) => f.totale,
      stato: (f) => f.statoLabel,
    },
  );
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState("tutti");
  const anno = new Date().getFullYear();
  const [form, setForm] = useState({
    tipo: "nota" as "nota" | "preavviso",
    numero: "",
    cliente_id: "",
    oggetto: "",
  });

  function apri() {
    setForm({
      tipo: "nota",
      numero: prossimoNumero("nota", anno, fatture),
      cliente_id: "",
      oggetto: "",
    });
    setOpen(true);
  }

  const crea = useMutation({
    mutationFn: async () => {
      if (!form.numero.trim()) throw new Error("Indica il numero del documento");
      if (!form.cliente_id) throw new Error("Seleziona il cliente");
      const data = oggi();
      const { data: fat, error } = await supabase
        .from("fatture")
        .insert({
          tipo: form.tipo,
          numero: form.numero.trim(),
          anno,
          data,
          scadenza: scadenzaFineMeseSuccessivo(data),
          cliente_id: form.cliente_id,
          oggetto: form.oggetto,
          tariffa_oraria: Number(imp?.tariffa_oraria ?? 24),
          sconto_pct: Number(imp?.sconto_pct ?? 0),
          contributo_pct: Number(imp?.contributo_pct ?? 5),
          bollo: form.tipo === "nota" ? Number(imp?.bollo ?? 0) : 0,
          premessa:
            form.tipo === "nota"
              ? "Per le prestazioni professionali di seguito indicate, Vi rimetto la presente nota onoraria."
              : "Con la presente Vi trasmetto il preavviso di parcella relativo alle prestazioni di seguito indicate.",
        })
        .select("id")
        .single();
      if (error) throw error;
      return fat.id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["fatture"] });
      setOpen(false);
      navigate({ to: "/fatture/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lista = sorted.filter((f) => filtro === "tutti" || f.stato === filtro);

  return (
    <AppShell
      title="Note onorarie"
      actions={
        <>
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti gli stati</SelectItem>
              {STATI_FATTURA.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={apri}>
            <Plus className="size-4" /> Nuovo documento
          </Button>
        </>
      }
    >
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead label="Numero" sortKey="numero" sort={sort} onSort={onSort} className="w-28" />
                <SortableHead label="Tipo" sortKey="tipo" sort={sort} onSort={onSort} className="w-24" />
                <SortableHead label="Data" sortKey="data" sort={sort} onSort={onSort} className="w-28" />
                <SortableHead label="Cliente" sortKey="cliente" sort={sort} onSort={onSort} />
                <SortableHead
                  label="Scadenza"
                  sortKey="scadenza"
                  sort={sort}
                  onSort={onSort}
                  className="w-28"
                />
                <SortableHead
                  label="Totale"
                  sortKey="totale"
                  sort={sort}
                  onSort={onSort}
                  className="w-28 text-right"
                />
                <SortableHead
                  label="Pagamento"
                  sortKey="pagamento"
                  sort={sort}
                  onSort={onSort}
                  className="w-28"
                />
                <SortableHead label="Stato" sortKey="stato" sort={sort} onSort={onSort} className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((f) => (
                <TableRow key={f.id} className={classeRigaFattura(f.stato)}>
                  <TableCell className="num font-medium">
                    <Link to="/fatture/$id" params={{ id: f.id }} className="hover:underline">
                      {f.numero}
                    </Link>
                  </TableCell>
                  <TableCell className="label-tec">{f.tipoLabel}</TableCell>
                  <TableCell className="num">{dataIt(f.data)}</TableCell>
                  <TableCell>{f.clienteNome || "—"}</TableCell>
                  <TableCell className="num">{dataIt(f.scadenza)}</TableCell>
                  <TableCell className="num text-right">{euro(f.totale)}</TableCell>
                  <TableCell className="num">{dataIt(f.data_pagamento)}</TableCell>
                  <TableCell>
                    <Badge variant={f.stato === "pagata" ? "default" : "secondary"}>
                      {f.statoLabel}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!lista.length && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    {isLoading ? "Caricamento…" : "Nessun documento."}
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
            <DialogTitle>Nuovo documento</DialogTitle>
            <DialogDescription>
              Il numero è proposto automaticamente ma resta sempre modificabile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    tipo: v as "nota" | "preavviso",
                    numero: prossimoNumero(v as "nota" | "preavviso", anno, fatture),
                  })
                }
              >
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
              <Label htmlFor="numero">Numero</Label>
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
              <Label htmlFor="oggetto">Oggetto</Label>
              <Input
                id="oggetto"
                value={form.oggetto}
                onChange={(e) => setForm({ ...form, oggetto: e.target.value })}
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
