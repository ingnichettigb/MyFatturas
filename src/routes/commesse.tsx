import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHead, useSort } from "@/components/SortableHead";
import { supabase } from "@/integrations/supabase/client";
import { useClienti, useCommesse } from "@/lib/queries";
import type { Commessa } from "@/lib/ngb";

export const Route = createFileRoute("/commesse")({
  head: () => ({
    meta: [
      { title: "Commesse — Studio NGB" },
      {
        name: "description",
        content:
          "Elenco delle commesse tecniche dello Studio NGB con codice, disegno di riferimento e stato di avanzamento.",
      },
      { property: "og:title", content: "Commesse — Studio NGB" },
      { property: "og:description", content: "Commesse tecniche, disegni e stato di avanzamento." },
    ],
  }),
  component: CommessePage,
});

const STATI = [
  { value: "aperta", label: "Aperta" },
  { value: "in_corso", label: "In corso" },
  { value: "chiusa", label: "Chiusa" },
];

const vuoto = {
  codice: "",
  descrizione: "",
  cliente_id: "",
  disegno: "",
  riferimento: "",
  stato: "aperta",
  note: "",
};

function CommessePage() {
  const { data: commesse = [], isLoading } = useCommesse();
  const { data: clienti = [] } = useClienti();
  const { sorted, sort, onSort } = useSort(
    commesse.map((c) => ({
      ...c,
      clienteNome: clienti.find((k) => k.id === c.cliente_id)?.ragione_sociale ?? "",
      statoLabel: STATI.find((s) => s.value === c.stato)?.label ?? c.stato,
    })),
    {
      codice: (c) => c.codice,
      descrizione: (c) => c.descrizione,
      cliente: (c) => c.clienteNome,
      disegno: (c) => c.disegno,
      stato: (c) => c.statoLabel,
    },
  );
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Commessa | null>(null);
  const [form, setForm] = useState({ ...vuoto });

  const salva = useMutation({
    mutationFn: async () => {
      if (!form.codice.trim()) throw new Error("Il codice commessa è obbligatorio");
      const payload = { ...form, cliente_id: form.cliente_id || null };
      if (editing) {
        const { error } = await supabase.from("commesse").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("commesse").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commesse"] });
      setOpen(false);
      toast.success("Commessa salvata");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const elimina = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commesse").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commesse"] });
      toast.success("Commessa eliminata");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function apri(c?: Commessa) {
    setEditing(c ?? null);
    setForm(
      c
        ? {
            codice: c.codice,
            descrizione: c.descrizione,
            cliente_id: c.cliente_id ?? "",
            disegno: c.disegno,
            riferimento: c.riferimento,
            stato: c.stato,
            note: c.note,
          }
        : { ...vuoto },
    );
    setOpen(true);
  }

  return (
    <AppShell
      title="Commesse"
      actions={
        <Button onClick={() => apri()}>
          <Plus className="size-4" /> Nuova commessa
        </Button>
      }
    >
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Disegno</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {commesse.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="num font-medium">{c.codice}</TableCell>
                  <TableCell className="max-w-[26rem] truncate">{c.descrizione || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {clienti.find((k) => k.id === c.cliente_id)?.ragione_sociale ?? "—"}
                  </TableCell>
                  <TableCell className="num">{c.disegno || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {STATI.find((s) => s.value === c.stato)?.label ?? c.stato}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => apri(c)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Eliminare la commessa ${c.codice}?`)) elimina.mutate(c.id);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!commesse.length && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {isLoading ? "Caricamento…" : "Nessuna commessa registrata."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica commessa" : "Nuova commessa"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="codice">Codice *</Label>
              <Input
                id="codice"
                value={form.codice}
                onChange={(e) => setForm({ ...form, codice: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select
                value={form.cliente_id || "nessuno"}
                onValueChange={(v) => setForm({ ...form, cliente_id: v === "nessuno" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nessuno">Nessuno</SelectItem>
                  {clienti.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.ragione_sociale}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="descrizione">Descrizione</Label>
              <Textarea
                id="descrizione"
                value={form.descrizione}
                onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="disegno">Disegno</Label>
              <Input
                id="disegno"
                value={form.disegno}
                onChange={(e) => setForm({ ...form, disegno: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="riferimento">Riferimento</Label>
              <Input
                id="riferimento"
                value={form.riferimento}
                onChange={(e) => setForm({ ...form, riferimento: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Stato</Label>
              <Select value={form.stato} onValueChange={(v) => setForm({ ...form, stato: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATI.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button onClick={() => salva.mutate()} disabled={salva.isPending}>
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
