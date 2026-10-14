import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/listino")({
  head: () => ({
    meta: [
      { title: "Listino prezzi — Studio NGB" },
      { name: "description", content: "Codici del listino: pratiche CE PED, viaggi, vacazioni e spese." },
      { property: "og:title", content: "Listino prezzi — Studio NGB" },
      { property: "og:description", content: "Codici e tariffe del listino dello Studio NGB." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ListinoPage,
});

type Campo = "codice" | "gruppo" | "descrizione" | "quantita_rif" | "ore" | "unita" | "prezzo";

function ListinoPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["listino"],
    queryFn: async () => {
      const { data, error } = await supabase.from("listino_prezzi").select("*").order("ordinamento");
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["listino"] });

  const save = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from("listino_prezzi").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  };
  const add = async () => {
    const { error } = await supabase.from("listino_prezzi").insert({
      codice: `NUOVO${data.length + 1}`,
      ordinamento: (data.at(-1)?.ordinamento ?? 0) + 1,
    });
    if (error) toast.error(error.message);
    else refresh();
  };
  const del = async (id: string) => {
    if (!confirm("Eliminare questa voce?")) return;
    await supabase.from("listino_prezzi").delete().eq("id", id);
    refresh();
  };

  const cell = (r: (typeof data)[number], k: Campo, num = false, w = "") => (
    <Input
      key={`${r.id}-${k}-${String(r[k])}`}
      className={`h-8 ${num ? "num text-right" : ""} ${w}`}
      defaultValue={r[k] == null ? "" : String(r[k])}
      onBlur={(e) => {
        const raw = e.target.value.replace(",", ".");
        const v = num ? (raw === "" ? (k === "prezzo" ? null : 0) : Number(raw)) : e.target.value;
        if (v !== r[k]) save(r.id, { [k]: v });
      }}
    />
  );

  return (
    <AppShell
      title="Listino prezzi"
      actions={
        <Button onClick={add}>
          <Plus className="size-4" /> Nuova voce
        </Button>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Prezzo vuoto = usa la tariffa oraria del preventivo. "Incrementabile" chiede la quantità quando inserisci la voce.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Codice</TableHead>
            <TableHead className="w-36">Gruppo</TableHead>
            <TableHead>Descrizione</TableHead>
            <TableHead className="w-24">Rif.</TableHead>
            <TableHead className="w-20 text-right">Q.tà/Ore</TableHead>
            <TableHead className="w-16">Unità</TableHead>
            <TableHead className="w-24 text-right">Prezzo €</TableHead>
            <TableHead className="w-20">Increm.</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{cell(r, "codice")}</TableCell>
              <TableCell>{cell(r, "gruppo")}</TableCell>
              <TableCell>{cell(r, "descrizione")}</TableCell>
              <TableCell>{cell(r, "quantita_rif")}</TableCell>
              <TableCell>{cell(r, "ore", true)}</TableCell>
              <TableCell>{cell(r, "unita")}</TableCell>
              <TableCell>{cell(r, "prezzo", true)}</TableCell>
              <TableCell className="text-center">
                <input
                  type="checkbox"
                  checked={r.incrementabile}
                  onChange={(e) => save(r.id, { incrementabile: e.target.checked })}
                />
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => del(r.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AppShell>
  );
}
