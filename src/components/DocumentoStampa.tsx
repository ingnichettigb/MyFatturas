import ngbQr from "@/assets/ngb-qr.png";
import { dataIt, euro, numero, type Cliente, type Impostazioni, type Totali } from "@/lib/ngb";

export type RigaStampa = {
  id: string;
  posizione?: string;
  descrizione: string;
  ore: number | string;
  prezzo_ora: number | string;
  importo: number | string;
};

export function DocumentoStampa({
  imp,
  cliente,
  titolo,
  numeroDoc,
  data,
  oggetto,
  premessa,
  descrizione,
  righe,
  totali,
  scadenza,
  riferimenti,
  mostraFiscale,
}: {
  imp: Impostazioni;
  cliente: Cliente | null;
  titolo: string;
  numeroDoc: string;
  data: string;
  oggetto: string;
  premessa: string;
  descrizione: string;
  righe: RigaStampa[];
  totali: Totali;
  scadenza?: string | null;
  riferimenti?: { label: string; value: string }[];
  mostraFiscale: boolean;
}) {
  return (
    <article className="sheet-a4 text-[11pt] leading-snug">
      <header className="flex items-start justify-between gap-6 border-b-2 border-paper-foreground/70 pb-3">
        <div>
          <p className="font-display text-3xl uppercase tracking-wide">{imp.studio_nome}</p>
          <p className="mt-1 max-w-[125mm] text-[7.5pt] leading-tight text-paper-foreground/70">
            {imp.attivita}
          </p>
        </div>
        <img src={ngbQr} alt="Marchio NGB" className="size-[22mm] shrink-0" />
      </header>

      <div className="mt-8 flex justify-end">
        <div className="min-w-[75mm]">
          <p className="text-[9pt] uppercase tracking-widest text-paper-foreground/60">Spett.le</p>
          <p className="font-semibold">{cliente?.ragione_sociale ?? "—"}</p>
          {cliente?.indirizzo ? <p>{cliente.indirizzo}</p> : null}
          <p>
            {[cliente?.cap, cliente?.citta, cliente?.provincia ? `(${cliente.provincia})` : ""]
              .filter(Boolean)
              .join(" ")}
          </p>
          {cliente?.cf ? <p>C.F. {cliente.cf}</p> : null}
          {cliente?.piva && cliente.piva !== cliente.cf ? <p>P.IVA {cliente.piva}</p> : null}
          {cliente?.sdi ? <p>Codice SDI {cliente.sdi}</p> : null}
        </div>
      </div>

      <p className="mt-8">
        {imp.studio_citta}, {dataIt(data)}
      </p>

      <p className="mt-5 font-semibold">
        OGGETTO: {titolo} N° {numeroDoc}
        {oggetto ? ` — ${oggetto}` : ""}
      </p>

      {riferimenti?.length ? (
        <div className="mt-2 text-[9.5pt] text-paper-foreground/75">
          {riferimenti
            .filter((r) => r.value)
            .map((r) => (
              <p key={r.label}>
                {r.label}: {r.value}
              </p>
            ))}
        </div>
      ) : null}

      <p className="mt-5">{premessa}</p>
      {descrizione ? <p className="mt-1 whitespace-pre-wrap">{descrizione}</p> : null}

      <table className="mt-5 w-full border-collapse text-[10pt]">
        <thead>
          <tr className="border-y border-paper-foreground/40 text-left">
            <th className="w-[8mm] py-1.5 font-semibold">Pos.</th>
            <th className="py-1.5 font-semibold">Descrizione</th>
            <th className="w-[18mm] py-1.5 text-right font-semibold">Ore</th>
            <th className="w-[24mm] py-1.5 text-right font-semibold">€/ora</th>
            <th className="w-[28mm] py-1.5 text-right font-semibold">Importo</th>
          </tr>
        </thead>
        <tbody>
          {righe.map((r, i) => (
            <tr key={r.id} className="border-b border-paper-foreground/15 align-top">
              <td className="py-1.5">{r.posizione || String(i + 1).padStart(3, "0")}</td>
              <td className="py-1.5 whitespace-pre-wrap">{r.descrizione}</td>
              <td className="py-1.5 text-right num">{numero(r.ore)}</td>
              <td className="py-1.5 text-right num">{euro(r.prezzo_ora)}</td>
              <td className="py-1.5 text-right num">{euro(r.importo)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-5 flex justify-end">
        <table className="min-w-[95mm] text-[10.5pt]">
          <tbody>
            <tr>
              <td className="py-0.5">
                Vacazioni n° {numero(totali.ore)} — Totale imponibile (B)
              </td>
              <td className="py-0.5 pl-6 text-right num">{euro(totali.imponibile)}</td>
            </tr>
            <tr>
              <td className="py-0.5">
                {numero(imp.contributo_pct, 0)}% Contributo Integrativo di cassa (A)
              </td>
              <td className="py-0.5 pl-6 text-right num">+ {euro(totali.contributo)}</td>
            </tr>
            {totali.bollo > 0 ? (
              <tr>
                <td className="py-0.5">{imp.testo_spese_anticipate} (D)</td>
                <td className="py-0.5 pl-6 text-right num">+ {euro(totali.bollo)}</td>
              </tr>
            ) : null}
            {totali.ritenuta > 0 ? (
              <tr>
                <td className="py-0.5">Ritenuta d&apos;acconto (E)</td>
                <td className="py-0.5 pl-6 text-right num">− {euro(totali.ritenuta)}</td>
              </tr>
            ) : null}
            <tr className="border-t-2 border-paper-foreground/70 font-semibold">
              <td className="py-1.5">Totale a pagare (F)</td>
              <td className="py-1.5 pl-6 text-right num">{euro(totali.totale)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-1 text-[9pt] text-paper-foreground/80">
        <p>{imp.testo_franchigia}</p>
        <p>{imp.testo_ritenuta}</p>
        {mostraFiscale ? (
          <>
            <p>{imp.testo_forfettario}</p>
            {totali.bollo > 0 ? <p>{imp.testo_bollo}</p> : null}
          </>
        ) : null}
      </div>

      <div className="mt-5 text-[10pt]">
        <p>
          <span className="font-semibold">Pagamento:</span> {imp.testo_pagamento}
        </p>
        {scadenza ? (
          <p>
            <span className="font-semibold">Data scadenza pagamento:</span> {dataIt(scadenza)}
          </p>
        ) : null}
        <p>
          Bonifico bancario — {imp.studio_banca} — IBAN {imp.studio_iban}
        </p>
        <p>Codice SDI {imp.studio_sdi}</p>
      </div>

      <footer className="mt-8 border-t border-paper-foreground/40 pt-2 text-center text-[8pt] text-paper-foreground/70">
        {imp.studio_indirizzo}, {imp.studio_cap} {imp.studio_citta} ({imp.studio_provincia}) — P.I.{" "}
        {imp.studio_piva} — C.F. {imp.studio_cf} — tel {imp.studio_tel} — tel/fax {imp.studio_fax} —{" "}
        {imp.studio_email}
      </footer>
    </article>
  );
}
