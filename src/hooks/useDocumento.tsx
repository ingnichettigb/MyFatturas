import { useRef, useState } from "react";
import { FileDown, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { documentoHtml, nomeFile, pdfBase64, salvaConDialogo, stampaPdf } from "@/lib/documento-file";

/** Gestisce tab, riferimento al foglio A4 e le azioni di stampa/salvataggio del documento. */
export function useDocumento(nomeBase: () => string) {
  const [tab, setTab] = useState("dati");
  const docRef = useRef<HTMLDivElement>(null);

  async function conFoglio<T>(
    azione: (el: HTMLElement, nome: string) => T | Promise<T>,
  ): Promise<T | undefined> {
    setTab("stampa");
    await new Promise((r) => setTimeout(r, 400));
    const el = docRef.current?.querySelector<HTMLElement>(".sheet-a4");
    if (!el) {
      toast.error("Anteprima non disponibile");
      return undefined;
    }
    return azione(el, nomeFile(nomeBase()));
  }

  const esportaPdf = () => conFoglio((el, nome) => stampaPdf(nome, el));

  const salvaFile = () =>
    conFoglio(async (el, nome) => {
      const ok = await salvaConDialogo(nome, documentoHtml(nome, el), "text/html", ".html");
      if (ok) toast.success("Documento salvato");
    });

  /** PDF del documento in base64, pronto per essere allegato a una mail. */
  const preparaPdf = () =>
    conFoglio(async (el, nome) => ({ nome: `${nome}.pdf`, base64: await pdfBase64(el) }));

  return { tab, setTab, docRef, esportaPdf, salvaFile, preparaPdf };
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
