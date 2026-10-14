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
  /** Tariffa base €/h (lorda) */
  tariffa?: string;
  /** Sconto % della singola riga */
  sconto_pct?: string;
  /** Netto €/h effettivo, usato per l'importo */
  prezzo_ora: string;
};

const netto = (tar: unknown, sc: unknown) => String(round2(n(tar) * (1 - n(sc) / 100)));

export function RigheEditor({
  righe,
  onChange,
  prezzoDefault,
  tariffaDefault,
  scontoDefault = 0,
  conPosizione,
}: {
  righe: RigaForm[];
  onChange: (r: RigaForm[]) => void;
  prezzoDefault: number;
  tariffaDefault?: number;
  scontoDefault?: number;
  conPosizione?: boolean;
}) {
  const tarDef = tariffaDefault ?? prezzoDefault;
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
    const tar = v.prezzo != null ? Number(v.prezzo) : tarDef;
    const sc = v.prezzo != null ? 0 : scontoDefault;
    onChange([
      ...righe,
      {
        id: crypto.randomUUID(),
        posizione: "",
        descrizione: `${v.codice} ${v.descrizione}${v.quantita_rif ? " " + v.quantita_rif : ""}`.trim(),
        ore: String(q),
        tariffa: String(tar),
        sconto_pct: String(sc),
        prezzo_ora: netto(tar, sc),
      },
    ]);
  };

  const upd = (id: string, patch: Partial<RigaForm>) =>
    onChange(
      righe.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        if ("tariffa" in patch || "sconto_pct" in patch) {
          next.prezzo_ora = netto(next.tariffa ?? next.prezzo_ora, next.sconto_pct);
        }
        return next;
      }),
    );

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            {conPosizione && <TableHead className="w-16">Pos.</TableHead>}
            <TableHead>Descrizione della prestazione</TableHead>
            <TableHead className="w-20 text-right">Ore</TableHead>
            <TableHead className="w-24 text-right">Tariffa €/h</TableHead>
            <TableHead className="w-20 text-right">Sconto %</TableHead>
            <TableHead className="w-24 text-right">Netto €/h</TableHead>
            <TableHead className="w-28 text-right">Importo</TableHead>
            <TableHead className="w-10" />
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
                  value={r.tariffa ?? r.prezzo_ora}
                  onChange={(e) => upd(r.id, { tariffa: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <Input
                  className="num h-9 text-right"
                  type="number"
                  step="0.5"
                  value={r.sconto_pct ?? "0"}
                  onChange={(e) => upd(r.id, { sconto_pct: e.target.value })}
                />
              </TableCell>
              <TableCell className="num text-right font-medium">{euro(r.prezzo_ora)}</TableCell>
              <TableCell className="num text-right font-medium">
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
                colSpan={conPosizione ? 8 : 7}
                className="py-8 text-center text-muted-foreground"
              >
                Nessuna voce. Aggiungi la prima prestazione.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex flex-wrap items-center gap-2">
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
                tariffa: String(tarDef),
                sconto_pct: String(scontoDefault),
                prezzo_ora: netto(tarDef, scontoDefault),
              },
            ])
          }
        >
          <Plus className="size-4" /> Aggiungi voce
        </Button>
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value=""
          onChange={(e) => addListino(e.target.value)}
        >
          <option value="">+ Da listino…</option>
          {listino.map((v) => (
            <option key={v.id} value={v.id}>
              {v.codice} — {v.descrizione} {v.quantita_rif} (
              {v.prezzo != null ? `${v.prezzo} €/${v.unita}` : `${v.ore} h`})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
