import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Stamp } from "lucide-react";
import { toast } from "sonner";
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
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  chiaveNumero,
  dataIt,
  isNumeroBozza,
  oggi,
  prossimoNumero,
  scadenzaFineMeseSuccessivo,
  type Fattura,
} from "@/lib/ngb";

export function EmettiFatturaDialog({
  bozza,
  fatture,
  open,
  onOpenChange,
  onEmessa,
}: {
  bozza: Pick<Fattura, "id" | "numero" | "tipo" | "data">;
  fatture: Pick<Fattura, "id" | "numero" | "anno" | "tipo" | "cliente_id">[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEmessa?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const tipo = bozza.tipo === "preavviso" ? "preavviso" : "nota";
  const [data, setData] = useState(oggi());
  const [numero, setNumero] = useState("");
  const anno = data ? new Date(`${data}T00:00:00`).getFullYear() : new Date().getFullYear();

  const altre = useMemo(() => fatture.filter((f) => f.id !== bozza.id), [fatture, bozza.id]);

  useEffect(() => {
    if (open) {
      const d = oggi();
      setData(d);
      setNumero(prossimoNumero(tipo, new Date(d).getFullYear(), altre));
    }
  }, [open, tipo, altre]);

  const ultimo = useMemo(() => {
    const emesse = altre.filter(
      (f) => f.anno === anno && !isNumeroBozza(f.numero) && (f.tipo === "preavviso") === (tipo === "preavviso"),
    );
    return emesse.length ? emesse.map((f) => f.numero) : [];
  }, [altre, anno, tipo]);

  const duplicato = useMemo(() => {
    if (!numero.trim()) return null;
    const k = chiaveNumero(numero);
    return (
      altre.find(
        (f) =>
          f.anno === anno &&
          !isNumeroBozza(f.numero) &&
          (f.tipo === "preavviso") === (tipo === "preavviso") &&
          chiaveNumero(f.numero) === k,
      ) ?? null
    );
  }, [numero, altre, anno, tipo]);

  const emetti = useMutation({
    mutationFn: async () => {
      if (!numero.trim()) throw new Error("Indica il numero definitivo");
      if (isNumeroBozza(numero)) throw new Error("Il numero definitivo non può essere una bozza");
      if (!data) throw new Error("Indica la data del documento");
      if (duplicato) throw new Error(`Il numero ${duplicato.numero} è già usato`);
      // Ricontrollo sul database per evitare doppie numerazioni
      const { data: esistenti, error: e1 } = await supabase
        .from("fatture")
        .select("id, numero, tipo")
        .eq("anno", anno)
        .neq("id", bozza.id);
      if (e1) throw e1;
      const k = chiaveNumero(numero);
      const clash = (esistenti ?? []).find(
        (f) =>
          !isNumeroBozza(f.numero) &&
          (f.tipo === "preavviso") === (tipo === "preavviso") &&
          chiaveNumero(f.numero) === k,
      );
      if (clash) throw new Error(`Il numero ${clash.numero} risulta già emesso`);
      const { error } = await supabase
        .from("fatture")
        .update({
          numero: numero.trim(),
          data,
          anno,
          scadenza: scadenzaFineMeseSuccessivo(data),
          stato: "da_inviare",
        })
        .eq("id", bozza.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fatture"] });
      qc.invalidateQueries({ queryKey: ["fattura", bozza.id] });
      toast.success(`Emessa come ${numero.trim()} — pronta per l'invio`);
      onOpenChange(false);
      onEmessa?.(bozza.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Emetti {tipo === "nota" ? "nota onoraria" : "preavviso"}</DialogTitle>
          <DialogDescription>
            La bozza <span className="num font-semibold">{bozza.numero}</span> riceverà numero e data
            definitivi. Controlla prima di confermare.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="em-data">Data documento</Label>
            <Input id="em-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            {data ? (
              <p className="text-xs text-muted-foreground">
                Scadenza pagamento: {dataIt(scadenzaFineMeseSuccessivo(data))}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="em-num">Numero definitivo</Label>
            <Input
              id="em-num"
              className="num"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Ultimi numeri emessi nel {anno}:{" "}
              {ultimo.length ? ultimo.slice(0, 5).join(", ") : "nessuno"}
            </p>
            {duplicato ? (
              <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                <AlertTriangle className="size-4" /> Numero già assegnato ({duplicato.numero}).
              </p>
            ) : numero.trim() ? (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4" /> Numero libero.
              </p>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={() => emetti.mutate()} disabled={emetti.isPending || !!duplicato}>
            <Stamp className="size-4" /> Conferma ed emetti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
