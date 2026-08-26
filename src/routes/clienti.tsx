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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { ImportClientiDialog } from "@/components/ImportClientiDialog";
import { useClienti } from "@/lib/queries";
import type { Cliente } from "@/lib/ngb";

export const Route = createFileRoute("/clienti")({
  head: () => ({
    meta: [
      { title: "Clienti — Studio NGB" },
      {
        name: "description",
        content:
          "Anagrafica clienti dello Studio NGB con dati fiscali, codice SDI e riferimenti per la fatturazione.",
      },
      { property: "og:title", content: "Clienti — Studio NGB" },
      { property: "og:description", content: "Anagrafica clienti e dati fiscali dello Studio NGB." },
    ],
  }),
  component: ClientiPage,
});

const vuoto = {
  ragione_sociale: "",
  indirizzo: "",
  cap: "",
  citta: "",
  provincia: "",
  piva: "",
  cf: "",
  sdi: "",
  pec: "",
  email: "",
  telefono: "",
  referente: "",
  note: "",
};

function ClientiPage() {
  const { data: clienti = [], isLoading } = useClienti();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState({ ...vuoto });

  const salva = useMutation({
    mutationFn: async () => {
      if (!form.ragione_sociale.trim()) throw new Error("La ragione sociale è obbligatoria");
      if (editing) {
        const { error } = await supabase.from("clienti").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clienti").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clienti"] });
      setOpen(false);
      toast.success(editing ? "Cliente aggiornato" : "Cliente creato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const elimina = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clienti").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clienti"] });
      toast.success("Cliente eliminato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function apri(c?: Cliente) {
    setEditing(c ?? null);
    setForm(
      c
        ? {
            ragione_sociale: c.ragione_sociale,
            indirizzo: c.indirizzo,
            cap: c.cap,
            citta: c.citta,
            provincia: c.provincia,
            piva: c.piva,
            cf: c.cf,
            sdi: c.sdi,
            pec: c.pec,
            email: c.email,
            telefono: c.telefono,
            referente: c.referente,
            note: c.note,
          }
        : { ...vuoto },
    );
    setOpen(true);
  }

  const campo = (k: keyof typeof vuoto, label: string, extra?: Record<string, unknown>) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input
        id={k}
        value={form[k]}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        {...extra}
      />
    </div>
  );

  return (
    <AppShell
      title="Clienti"
      actions={
        <>
          <ImportClientiDialog />
          <Button onClick={() => apri()}>
            <Plus className="size-4" /> Nuovo cliente
          </Button>
        </>
      }
    >
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ragione sociale</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>P.IVA / C.F.</TableHead>
                <TableHead>SDI</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clienti.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.ragione_sociale}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {[c.cap, c.citta, c.provincia && `(${c.provincia})`].filter(Boolean).join(" ")}
                  </TableCell>
                  <TableCell className="num">{c.piva || c.cf || "—"}</TableCell>
                  <TableCell className="num">{c.sdi || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => apri(c)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Eliminare ${c.ragione_sociale}?`)) elimina.mutate(c.id);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!clienti.length && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    {isLoading ? "Caricamento…" : "Nessun cliente in anagrafica."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica cliente" : "Nuovo cliente"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{campo("ragione_sociale", "Ragione sociale *")}</div>
            <div className="sm:col-span-2">{campo("indirizzo", "Indirizzo")}</div>
            {campo("cap", "CAP")}
            {campo("citta", "Città")}
            {campo("provincia", "Provincia", { maxLength: 2 })}
            {campo("piva", "Partita IVA")}
            {campo("cf", "Codice fiscale")}
            {campo("sdi", "Codice SDI")}
            {campo("pec", "PEC")}
            {campo("email", "Email")}
            {campo("telefono", "Telefono")}
            {campo("referente", "Referente")}
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
