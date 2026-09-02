import { useEffect, useState } from "react";
import { Copy, Mail, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Indirizzo con cui lo studio spedisce i preventivi. */
export const MITTENTE_STUDIO = "ingnichettigb@gmail.com";

export type LetteraDati = {
  destinatario: string;
  ragioneSociale: string;
  referente: string;
  numeroDoc: string;
  data: string;
  oggetto: string;
  totale: string;
  validita: string;
  firma: string;
  telefono: string;
};

const dataIt = (iso: string) => {
  const [a, m, g] = iso.split("-");
  return g && m && a ? `${g}/${m}/${a}` : iso;
};

export function oggettoLettera(d: LetteraDati) {
  return `Preventivo n. ${d.numeroDoc} del ${dataIt(d.data)}${d.oggetto ? ` — ${d.oggetto}` : ""}`;
}

export function corpoLettera(d: LetteraDati) {
  const saluto = d.referente ? `Gentile ${d.referente},` : "Spett.le Cliente,";
  return [
    `Spett.le ${d.ragioneSociale || "Cliente"}`,
    "",
    saluto,
    "",
    `in allegato trasmettiamo il preventivo n. ${d.numeroDoc} del ${dataIt(d.data)}${
      d.oggetto ? ` relativo a: ${d.oggetto}` : ""
    }.`,
    "",
    `Importo complessivo dell'offerta: ${d.totale}.`,
    d.validita ? `Validità dell'offerta: ${d.validita}.` : "",
    "",
    "Restiamo a disposizione per ogni chiarimento e, in caso di accettazione, Vi preghiamo di inviarci il Vostro ordine con il relativo riferimento.",
    "",
    "Cordiali saluti.",
    "",
    d.firma,
    d.telefono ? `Tel. ${d.telefono}` : "",
    MITTENTE_STUDIO,
  ]
    .filter((r, i, a) => !(r === "" && a[i - 1] === ""))
    .join("\n");
}

/**
 * Prepara la lettera di trasmissione del preventivo: si rilegge, poi con un click
 * si spedisce dalla mail dello studio con il PDF già allegato. Restano disponibili
 * anche l'apertura in Gmail / client predefinito per l'invio manuale.
 */
export function InviaMailDialog({
  dati,
  scaricaPdf,
  preparaPdf,
}: {
  dati: LetteraDati;
  scaricaPdf: () => void | Promise<void>;
  preparaPdf?: () => Promise<{ nome: string; base64: string } | undefined>;
}) {
  const [open, setOpen] = useState(false);
  const [invio, setInvio] = useState(false);
  const [a, setA] = useState(dati.destinatario);
  const [cc, setCc] = useState("");
  const [oggetto, setOggetto] = useState("");
  const [corpo, setCorpo] = useState("");

  useEffect(() => {
    if (!open) return;
    setA(dati.destinatario);
    setOggetto(oggettoLettera(dati));
    setCorpo(corpoLettera(dati));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const inviaOra = async () => {
    if (!preparaPdf) return;
    if (!a.trim()) {
      toast.error("Inserisci il destinatario");
      return;
    }
    setInvio(true);
    try {
      const pdf = await preparaPdf();
      if (!pdf) throw new Error("PDF del documento non disponibile");
      await inviaMailConPdf({
        data: {
          a: a.trim(),
          cc: cc.trim() || undefined,
          oggetto,
          corpo,
          nomeAllegato: pdf.nome,
          pdfBase64: pdf.base64,
        },
      });
      toast.success("Email inviata con il PDF allegato");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invio fallito");
    } finally {
      setInvio(false);
    }
  };

  const apriGmail = () => {
    const url = new URL("https://mail.google.com/mail/");
    url.searchParams.set("view", "cm");
    url.searchParams.set("fs", "1");
    url.searchParams.set("authuser", MITTENTE_STUDIO);
    url.searchParams.set("to", a);
    if (cc) url.searchParams.set("cc", cc);
    url.searchParams.set("su", oggetto);
    url.searchParams.set("body", corpo);
    window.open(url.toString(), "_blank", "noopener");
  };

  const apriClient = () => {
    const q = new URLSearchParams({ subject: oggetto, body: corpo });
    if (cc) q.set("cc", cc);
    window.location.href = `mailto:${encodeURIComponent(a)}?${q.toString()}`;
  };

  const copia = async () => {
    await navigator.clipboard.writeText(`${oggetto}\n\n${corpo}`);
    toast.success("Lettera copiata negli appunti");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Mail className="size-4" /> Invia per email
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-2xl flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Lettera di trasmissione</DialogTitle>
          <DialogDescription>
            Rileggi e modifica il testo, scarica il PDF del preventivo da allegare, poi apri la mail
            e invia tu quando sei d'accordo. Mittente: {MITTENTE_STUDIO}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mail-a">Destinatario</Label>
              <Input
                id="mail-a"
                value={a}
                onChange={(e) => setA(e.target.value)}
                placeholder="cliente@email.it"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mail-cc">Copia conoscenza (facoltativa)</Label>
              <Input id="mail-cc" value={cc} onChange={(e) => setCc(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mail-og">Oggetto</Label>
            <Input id="mail-og" value={oggetto} onChange={(e) => setOggetto(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mail-corpo">Testo della lettera</Label>
            <Textarea
              id="mail-corpo"
              rows={10}
              value={corpo}
              onChange={(e) => setCorpo(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="mt-1 shrink-0 flex-wrap gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => scaricaPdf()}>
              <Paperclip className="size-4" /> Scarica PDF da allegare
            </Button>
            <Button variant="ghost" onClick={copia}>
              <Copy className="size-4" /> Copia testo
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={apriClient}>
              <Mail className="size-4" /> Client predefinito
            </Button>
            <Button onClick={apriGmail}>
              <Send className="size-4" /> Apri in Gmail
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
