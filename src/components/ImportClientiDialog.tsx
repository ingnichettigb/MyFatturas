import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

type Riga = Record<string, unknown>;

const CAMPI = {
  ragione_sociale: ["ragione sociale", "ragionesociale", "cliente", "denominazione", "nome", "spett"],
  indirizzo: ["indirizzo", "via", "sede"],
  cap: ["cap"],
  citta: ["citta", "città", "comune", "localita", "località"],
  provincia: ["provincia", "prov", "pr"],
  piva: ["piva", "p.iva", "partita iva", "partitaiva", "vat"],
  cf: ["cf", "codice fiscale", "codicefiscale"],
  sdi: ["sdi", "codice sdi", "codice destinatario", "destinatario"],
  pec: ["pec"],
  email: ["email", "e-mail", "mail", "posta"],
  telefono: ["telefono", "tel", "cellulare"],
  referente: ["referente", "contatto"],
  note: ["note", "annotazioni"],
} as const;

type Campo = keyof typeof CAMPI;
const CAMPI_LISTA = Object.keys(CAMPI) as Campo[];
const ETICHETTE: Record<Campo, string> = {
  ragione_sociale: "Ragione sociale",
  indirizzo: "Indirizzo",
  cap: "CAP",
  citta: "Città",
  provincia: "Provincia",
  piva: "Partita IVA",
  cf: "Codice fiscale",
  sdi: "Codice SDI",
  pec: "PEC",
  email: "Email",
  telefono: "Telefono",
  referente: "Referente",
  note: "Note",
};

const norm = (s: string) => s.toLowerCase().replace(/[.\s_-]+/g, " ").trim();

function autoMappa(colonne: string[]): Record<Campo, string> {
  const map = {} as Record<Campo, string>;
  for (const campo of CAMPI_LISTA) {
    const alias = CAMPI[campo] as readonly string[];
    const trovata = colonne.find((c) => alias.some((a) => norm(c) === norm(a)));
    const parziale = colonne.find((c) => alias.some((a) => norm(c).includes(norm(a))));
    map[campo] = trovata ?? parziale ?? "";
  }
  return map;
}

const testo = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

export function ImportClientiDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [fogli, setFogli] = useState<string[]>([]);
  const [wb, setWb] = useState<XLSX.WorkBook | null>(null);
  const [foglio, setFoglio] = useState("");
  const [colonne, setColonne] = useState<string[]>([]);
  const [righe, setRighe] = useState<Riga[]>([]);
  const [mappa, setMappa] = useState<Record<Campo, string>>({} as Record<Campo, string>);

  function caricaFoglio(book: XLSX.WorkBook, nome: string) {
    const sheet = book.Sheets[nome];
    const dati = sheet ? XLSX.utils.sheet_to_json<Riga>(sheet, { defval: "" }) : [];
    const cols = dati[0] ? Object.keys(dati[0]) : [];
    setFoglio(nome);
    setColonne(cols);
    setRighe(dati);
    setMappa(autoMappa(cols));
  }

  async function onFile(file: File) {
    const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
    setWb(book);
    setFogli(book.SheetNames);
    caricaFoglio(book, book.SheetNames[0] ?? "");
  }

  const anteprima = righe
    .map((r) => {
      const c = {} as Record<Campo, string>;
      for (const campo of CAMPI_LISTA) c[campo] = mappa[campo] ? testo(r[mappa[campo]]) : "";
      return c;
    })
    .filter((c) => c.ragione_sociale);

  const importa = useMutation({
    mutationFn: async () => {
      if (!anteprima.length) throw new Error("Nessuna riga valida: mappa la colonna Ragione sociale");
      const { error } = await supabase.from("clienti").insert(anteprima);
      if (error) throw error;
      return anteprima.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["clienti"] });
      setOpen(false);
      setWb(null);
      setRighe([]);
      toast.success(`${n} clienti importati`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="size-4" /> Importa da Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importa clienti</DialogTitle>
          <DialogDescription>
            Carica un file Excel (.xlsx, .xls) o CSV: le colonne vengono riconosciute
            automaticamente e restano modificabili prima dell&apos;importazione.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="file-clienti">File</Label>
            <Input
              id="file-clienti"
              type="file"
              accept=".xlsx,.xls,.xlsm,.csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f).catch(() => toast.error("File non leggibile"));
              }}
            />
          </div>

          {wb && fogli.length > 1 && (
            <div className="space-y-1.5">
              <Label>Foglio</Label>
              <Select value={foglio} onValueChange={(v) => caricaFoglio(wb, v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {fogli.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {colonne.length > 0 && (
            <div className="grid gap-3 md:grid-cols-3">
              {CAMPI_LISTA.map((campo) => (
                <div key={campo} className="space-y-1.5">
                  <Label>{ETICHETTE[campo]}</Label>
                  <Select
                    value={mappa[campo] || "__nessuna__"}
                    onValueChange={(v) =>
                      setMappa({ ...mappa, [campo]: v === "__nessuna__" ? "" : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="__nessuna__">— nessuna —</SelectItem>
                      {colonne.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          {anteprima.length > 0 && (
            <div className="max-h-64 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ragione sociale</TableHead>
                    <TableHead>Città</TableHead>
                    <TableHead>P.IVA</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anteprima.slice(0, 25).map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>{c.ragione_sociale}</TableCell>
                      <TableCell>{c.citta}</TableCell>
                      <TableCell className="num">{c.piva}</TableCell>
                      <TableCell>{c.email}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <span className="mr-auto self-center label-tec">
            {anteprima.length ? `${anteprima.length} clienti pronti` : "Nessuna riga valida"}
          </span>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annulla
          </Button>
          <Button onClick={() => importa.mutate()} disabled={!anteprima.length || importa.isPending}>
            Importa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
