import type { Tables } from "@/integrations/supabase/types";

export type Impostazioni = Tables<"impostazioni">;
export type Cliente = Tables<"clienti">;
export type Commessa = Tables<"commesse">;
export type Preventivo = Tables<"preventivi">;
export type PreventivoRiga = Tables<"preventivo_righe">;
export type Fattura = Tables<"fatture">;
export type FatturaRiga = Tables<"fattura_righe">;

export const euro = (v: number | string | null | undefined) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(v ?? 0));

export const numero = (v: number | string | null | undefined, dec = 2) =>
  new Intl.NumberFormat("it-IT", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(
    Number(v ?? 0),
  );

export const dataIt = (v: string | null | undefined) =>
  v ? new Date(`${v}T00:00:00`).toLocaleDateString("it-IT") : "—";

export const oggi = () => new Date().toISOString().slice(0, 10);

export const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

/** Tariffa oraria al netto dello sconto applicato (es. 24,00 - 10% = 21,60). */
export const tariffaNetta = (tariffa: number, scontoPct: number) =>
  round2(n(tariffa) * (1 - n(scontoPct) / 100));

export type RigaCalcolo = { ore: number | string; prezzo_ora: number | string };

export type TotaliInput = {
  righe: RigaCalcolo[];
  contributoPct: number | string;
  bollo?: number | string;
  ritenuta?: number | string;
};

export type Totali = {
  ore: number;
  imponibile: number;
  contributo: number;
  bollo: number;
  ritenuta: number;
  totale: number;
};

/**
 * Schema di calcolo delle note onorarie dello studio:
 *   vacazioni (ore x tariffa netta) = imponibile B
 *   + 5% contributo integrativo cassa = A
 *   + spese anticipate art. 15 (bollo) = D
 *   - ritenuta d'acconto (0 in regime forfettario) = E
 *   = totale a pagare F
 */
export function calcolaTotali({ righe, contributoPct, bollo, ritenuta }: TotaliInput): Totali {
  const ore = round2(righe.reduce((s, r) => s + n(r.ore), 0));
  const imponibile = round2(righe.reduce((s, r) => s + round2(n(r.ore) * n(r.prezzo_ora)), 0));
  const contributo = round2((imponibile * n(contributoPct)) / 100);
  const b = round2(n(bollo));
  const rit = round2(n(ritenuta));
  return {
    ore,
    imponibile,
    contributo,
    bollo: b,
    ritenuta: rit,
    totale: round2(imponibile + contributo + b - rit),
  };
}

/** "f.m. data fattura": scadenza a fine del mese successivo alla data documento. */
export function scadenzaFineMeseSuccessivo(dataDoc: string): string {
  const d = new Date(`${dataDoc}T00:00:00`);
  const fine = new Date(d.getFullYear(), d.getMonth() + 2, 0);
  return `${fine.getFullYear()}-${String(fine.getMonth() + 1).padStart(2, "0")}-${String(
    fine.getDate(),
  ).padStart(2, "0")}`;
}

const suffisso = (anno: number) => String(anno).slice(-2);

/** Estrae il progressivo da numeri tipo "01/26", "P26/01", "P07-07/02". */
function progressivoDa(numeroDoc: string): number {
  const nums = numeroDoc.match(/\d+/g);
  if (!nums) return 0;
  const cand = nums.map(Number).filter((x) => x > 0 && x < 1000);
  return cand.length ? Math.max(...cand) : 0;
}

export function prossimoNumero(
  tipo: "preventivo" | "preavviso" | "nota",
  anno: number,
  esistenti: { numero: string; anno: number }[],
): string {
  const aa = suffisso(anno);
  if (tipo === "preventivo") {
    // Formato preventivi: PRE-AA-00 (progressivo annuale)
    const max = esistenti
      .filter((e) => e.anno === anno)
      .reduce((m, e) => {
        const match = e.numero.match(/PRE-(\d{2})-(\d+)/i);
        return match && match[1] === aa ? Math.max(m, Number(match[2])) : m;
      }, 0);
    return `PRE-${aa}-${String(max + 1).padStart(2, "0")}`;
  }
  const max = esistenti
    .filter((e) => e.anno === anno)
    .reduce((m, e) => Math.max(m, progressivoDa(e.numero)), 0);
  const p = String(max + 1).padStart(2, "0");
  if (tipo === "nota") return `${p}/${aa}`;
  return `P${aa}/${p}`;
}


export const STATI_PREVENTIVO = [
  { value: "bozza", label: "Bozza" },
  { value: "inviato", label: "Inviato" },
  { value: "accettato", label: "Accettato" },
  { value: "rifiutato", label: "Rifiutato" },
  { value: "fatturato", label: "Fatturato" },
] as const;

export const STATI_FATTURA = [
  { value: "da_inviare", label: "Da inviare" },
  { value: "inviata", label: "Inviata" },
  { value: "pagata", label: "Pagata" },
  { value: "annullata", label: "Annullata" },
] as const;

export const labelStato = (
  lista: readonly { value: string; label: string }[],
  value: string | null | undefined,
) => lista.find((s) => s.value === value)?.label ?? value ?? "—";

export const MESI = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];

export const meseAnno = (v: string | null | undefined) => {
  if (!v) return "—";
  const d = new Date(`${v}T00:00:00`);
  return `${MESI[d.getMonth()]} ${d.getFullYear()}`;
};

export const indirizzoCliente = (c: Cliente | null | undefined) =>
  c
    ? [c.indirizzo, [c.cap, c.citta, c.provincia ? `(${c.provincia})` : ""].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(" — ")
    : "";
