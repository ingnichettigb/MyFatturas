/** Utilità per salvare/stampare i documenti (nota, preavviso, preventivo) come file. */

function raccogliCss(): string {
  let css = "";
  for (const ss of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from((ss as CSSStyleSheet).cssRules)) css += rule.cssText + "\n";
    } catch {
      /* foglio cross-origin: ignorato */
    }
  }
  return css;
}

function linkFont(): string {
  return Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map((l) => (l as HTMLLinkElement).outerHTML)
    .join("\n");
}

/** Crea un HTML autonomo (stile incluso) a partire dal nodo del documento a video. */
export function documentoHtml(titolo: string, el: HTMLElement): string {
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${titolo}</title>
${linkFont()}
<style>${raccogliCss()}</style>
<style>
  body { margin: 0; background: #fff; }
  @page { size: A4; margin: 0; }
  @media print { .sheet-a4 { box-shadow: none; width: auto; min-height: 0; margin: 0; padding: 12mm 14mm; } }
</style>
</head>
<body>${el.outerHTML}</body>
</html>`;
}

export const nomeFile = (base: string) =>
  base
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();

type PickerWindow = Window & {
  showSaveFilePicker?: (opts: unknown) => Promise<{
    createWritable: () => Promise<{ write: (d: Blob) => Promise<void>; close: () => Promise<void> }>;
  }>;
};

/** Salva un contenuto chiedendo all'utente dove metterlo (fallback: download). */
export async function salvaConDialogo(
  nome: string,
  contenuto: string | Blob,
  mime: string,
  estensione: string,
): Promise<boolean> {
  const blob = typeof contenuto === "string" ? new Blob([contenuto], { type: mime }) : contenuto;
  const w = window as PickerWindow;
  if (typeof w.showSaveFilePicker === "function") {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName: `${nome}${estensione}`,
        types: [{ description: nome, accept: { [mime]: [estensione] } }],
      });
      const ws = await handle.createWritable();
      await ws.write(blob);
      await ws.close();
      return true;
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return false;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nome}${estensione}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  return true;
}

function caricaImmagine(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossibile elaborare l'immagine del documento"));
    img.src = src;
  });
}

/** Genera il PDF del documento (A4, multipagina) e lo restituisce in base64. */
export async function pdfBase64(el: HTMLElement): Promise<string> {
  const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  // html-to-image renderizza via SVG: supporta i colori oklch di Tailwind v4.
  const dataUrl = await toPng(el, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true });
  const bitmap = await caricaImmagine(dataUrl);
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const paginaH = 297;
  const imgW = 210;
  const imgH = (bitmap.height * imgW) / bitmap.width;
  let restante = imgH;
  let y = 0;
  while (restante > 0) {
    if (y !== 0) pdf.addPage();
    pdf.addImage(dataUrl, "PNG", 0, y, imgW, imgH);
    restante -= paginaH;
    y -= paginaH;
  }
  return pdf.output("datauristring").split(",")[1] ?? "";
}

/** Apre la finestra di stampa del browser sul solo documento: scegliendo "Salva come PDF" si ottiene il file. */
export function stampaPdf(titolo: string, el: HTMLElement) {
  const html = documentoHtml(titolo, el);
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  const vai = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 60000);
  };
  if (iframe.contentWindow?.document.readyState === "complete") setTimeout(vai, 400);
  else iframe.onload = () => setTimeout(vai, 400);
}
