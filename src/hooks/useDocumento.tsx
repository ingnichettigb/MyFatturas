import { useRef, useState } from "react";
import { FileDown, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { documentoHtml, nomeFile, salvaConDialogo, stampaPdf } from "@/lib/documento-file";

/** Gestisce tab, riferimento al foglio A4 e le azioni di stampa/salvataggio del documento. */
export function useDocumento(nomeBase: () => string) {
  const [tab, setTab] = useState("dati");
  const docRef = useRef<HTMLDivElement>(null);

  async function conFoglio(azione: (el: HTMLElement, nome: string) => void | Promise<void>) {
    setTab("stampa");
    await new Promise((r) => setTimeout(r, 400));
    const el = docRef.current?.querySelector<HTMLElement>(".sheet-a4");
    if (!el) {
      toast.error("Anteprima non disponibile");
      return;
    }
    await azione(el, nomeFile(nomeBase()));
  }

  const esportaPdf = () => conFoglio((el, nome) => stampaPdf(nome, el));

  const salvaFile = () =>
    conFoglio(async (el, nome) => {
      const ok = await salvaConDialogo(nome, documentoHtml(nome, el), "text/html", ".html");
      if (ok) toast.success("Documento salvato");
    });

  return { tab, setTab, docRef, esportaPdf, salvaFile };
}

export function AzioniDocumento({
  esportaPdf,
  salvaFile,
}: {
  esportaPdf: () => void;
  salvaFile: () => void;
}) {
  return (
    <>
      <Button variant="outline" onClick={esportaPdf}>
        <Printer className="size-4" /> PDF
      </Button>
      <Button variant="outline" onClick={salvaFile}>
        <FileDown className="size-4" /> Salva su file
      </Button>
    </>
  );
}
