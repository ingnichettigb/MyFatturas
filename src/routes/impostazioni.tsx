import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useImpostazioni } from "@/lib/queries";
import type { Impostazioni } from "@/lib/ngb";

export const Route = createFileRoute("/impostazioni")({
  head: () => ({
    meta: [
      { title: "Impostazioni — Studio NGB" },
      {
        name: "description",
        content:
          "Dati dello studio, tariffa oraria, sconto, contributo di cassa, bollo e testi di legge stampati sui documenti.",
      },
      { property: "og:title", content: "Impostazioni — Studio NGB" },
      {
        property: "og:description",
        content: "Tariffe, contributi, bollo e testi legali dei documenti dello Studio NGB.",
      },
    ],
  }),
  component: ImpostazioniPage,
});

function ImpostazioniPage() {
  const { data, isLoading } = useImpostazioni();
  const qc = useQueryClient();
  const [form, setForm] = useState<Impostazioni | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const salva = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const { id, created_at: _c, updated_at: _u, ...rest } = form;
      const { error } = await supabase.from("impostazioni").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["impostazioni"] });
      toast.success("Impostazioni salvate");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !form) {
    return (
      <AppShell title="Impostazioni">
        <p className="label-tec">Caricamento…</p>
      </AppShell>
    );
  }

  const set = (k: keyof Impostazioni, v: string | number) => setForm({ ...form, [k]: v });

  const testo = (k: keyof Impostazioni, label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={String(k)}>{label}</Label>
      <Input
        id={String(k)}
        value={String(form[k] ?? "")}
        onChange={(e) => set(k, e.target.value)}
      />
    </div>
  );

  const num = (k: keyof Impostazioni, label: string, step = "0.01") => (
    <div className="space-y-1.5">
      <Label htmlFor={String(k)}>{label}</Label>
      <Input
        id={String(k)}
        type="number"
        step={step}
        className="num"
        value={String(form[k] ?? "")}
        onChange={(e) => set(k, Number(e.target.value))}
      />
    </div>
  );

  const area = (k: keyof Impostazioni, label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={String(k)}>{label}</Label>
      <Textarea
        id={String(k)}
        rows={2}
        value={String(form[k] ?? "")}
        onChange={(e) => set(k, e.target.value)}
      />
    </div>
  );

  return (
    <AppShell
      title="Impostazioni"
      actions={
        <Button onClick={() => salva.mutate()} disabled={salva.isPending}>
          Salva impostazioni
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg uppercase tracking-wide">
              Dati dello studio
            </CardTitle>
            <CardDescription>Compaiono nell&apos;intestazione e nel piè di pagina.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{testo("studio_nome", "Intestazione")}</div>
            <div className="sm:col-span-2">{area("attivita", "Attività (sottotitolo)")}</div>
            <div className="sm:col-span-2">{testo("studio_indirizzo", "Indirizzo")}</div>
            {testo("studio_cap", "CAP")}
            {testo("studio_citta", "Città")}
            {testo("studio_provincia", "Provincia")}
            {testo("studio_piva", "Partita IVA")}
            {testo("studio_cf", "Codice fiscale")}
            {testo("studio_sdi", "Codice SDI")}
            {testo("studio_tel", "Telefono")}
            {testo("studio_fax", "Tel/Fax")}
            <div className="sm:col-span-2">{testo("studio_email", "Email")}</div>
            {testo("studio_banca", "Banca")}
            {testo("studio_iban", "IBAN")}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg uppercase tracking-wide">
                Tariffe e imposte
              </CardTitle>
              <CardDescription>Valori proposti su ogni nuovo documento.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {num("tariffa_oraria", "Tariffa oraria (€)")}
              {num("sconto_pct", "Sconto applicato (%)")}
              {num("contributo_pct", "Contributo cassa (%)")}
              {num("bollo", "Bollo / spese anticipate (€)")}
              {num("ritenuta_pct", "Ritenuta d'acconto (%)")}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg uppercase tracking-wide">
                Testi di legge
              </CardTitle>
              <CardDescription>Stampati in calce ai documenti.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {area("testo_franchigia", "Franchigia")}
              {area("testo_ritenuta", "Ritenuta d'acconto")}
              {area("testo_forfettario", "Regime forfettario")}
              {area("testo_bollo", "Imposta di bollo")}
              {area("testo_spese_anticipate", "Spese anticipate")}
              {area("testo_pagamento", "Condizioni di pagamento")}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
