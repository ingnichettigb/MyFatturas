import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { euro, n, round2 } from "@/lib/ngb";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RigaForm = {
  id: string;
  posizione?: string;
  descrizione: string;
  ore: string;
  prezzo_ora: string;
};

export function RigheEditor({
  righe,
  onChange,
  prezzoDefault,
  conPosizione,
}: {
  righe: RigaForm[];
  onChange: (r: RigaForm[]) => void;
  prezzoDefault: number;
  conPosizione?: boolean;
}) {
  const { data: listino = [] } = useQuery({
    queryKey: ["listino"],
    queryFn: async () => {
      const { data, error } = await supabase.from("listino_prezzi").select("*").order("ordinamento");
      if (error) throw error;
      return data;
    },
  });
  const addListino = (id: string) => {
    const v = listino.find((x) => x.id === id);
    if (!v) return;
    let q = Number(v.ore);
    if (v.incrementabile) {
      const label = v.codice.startsWith("PED") ? "Numero serbatoi" : `Quantità (${v.unita})`;
      const r = window.prompt(`${v.codice} — ${label}:`, "1");
      if (r === null) return;
      const k = n(r.replace(",", ".")) || 1;
      q = v.codice.startsWith("PED") ? round2(Number(v.ore) * k) : k;
    }
    onChange([
      ...righe,
      {
        id: crypto.randomUUID(),
        posizione: "",
        descrizione: `${v.codice} ${v.descrizione}${v.quantita_rif ? " " + v.quantita_rif : ""}`.trim(),
        ore: String(q),
        prezzo_ora: String(v.prezzo ?? prezzoDefault),
      },
    ]);
  };
  const upd = (id: string, patch: Partial<RigaForm>) =>
    onChange(righe.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            {conPosizione && <TableHead className="w-20">Pos.</TableHead>}
            <TableHead>Descrizione della prestazione</TableHead>
            <TableHead className="w-24 text-right">Ore</TableHead>
            <TableHead className="w-28 text-right">€/ora</TableHead>
            <TableHead className="w-28 text-right">Importo</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {righe.map((r, i) => (
            <TableRow key={r.id}>
              {conPosizione && (
                <TableCell>
                  <Input
                    className="num h-9"
                    value={r.posizione ?? ""}
                    placeholder={String(i + 1).padStart(3, "0")}
                    onChange={(e) => upd(r.id, { posizione: e.target.value })}
                  />
                </TableCell>
              )}
              <TableCell>
                <Input
                  className="h-9"
                  value={r.descrizione}
                  placeholder="Es. Progettazione attrezzatura, disegni costruttivi…"
                  onChange={(e) => upd(r.id, { descrizione: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <Input
                  className="num h-9 text-right"
                  type="number"
                  step="0.25"
                  value={r.ore}
                  onChange={(e) => upd(r.id, { ore: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <Input
                  className="num h-9 text-right"
                  type="number"
                  step="0.01"
                  value={r.prezzo_ora}
                  onChange={(e) => upd(r.id, { prezzo_ora: e.target.value })}
                />
              </TableCell>
              <TableCell className="num text-right">
                {euro(round2(n(r.ore) * n(r.prezzo_ora)))}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onChange(righe.filter((x) => x.id !== r.id))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!righe.length && (
            <TableRow>
              <TableCell
                colSpan={conPosizione ? 6 : 5}
                className="py-8 text-center text-muted-foreground"
              >
                Nessuna voce. Aggiungi la prima prestazione.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([
            ...righe,
            {
              id: crypto.randomUUID(),
              posizione: "",
              descrizione: "",
              ore: "",
              prezzo_ora: String(prezzoDefault),
            },
          ])
        }
      >
        <Plus className="size-4" /> Aggiungi voce
      </Button>
      <select
        className="ml-2 h-9 rounded-md border border-input bg-background px-2 text-sm"
        value=""
        onChange={(e) => addListino(e.target.value)}
      >
        <option value="">+ Da listino…</option>
        {listino.map((v) => (
          <option key={v.id} value={v.id}>
            {v.codice} — {v.descrizione} {v.quantita_rif} ({v.prezzo != null ? `${v.prezzo} €/${v.unita}` : `${v.ore} h`})
          </option>
        ))}
      </select>
    </div>
  );
}
