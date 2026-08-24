# Gestionale NGB — dal preventivo alla fattura

Sì, si può fare. Nel file c'è già tutto: anagrafica dello studio, testi legali, tariffe, numerazione e il ciclo completo. Ricostruisco quel flusso in un'applicazione web con database, al posto dei 382 fogli Excel.

## Cosa ho estratto dal file

**Studio (intestazione di ogni documento)**
Nichetti G.B. — Via Foscolo, 28 — 26015 Soresina (CR) — P.I. 01235350194 — CF NCHGBT59H21B650X — tel 0339 6344660 — tel/fax 0374 341472 — nichettigb@gmail.com — SDI KRRH6B9 — IBAN IT57H0623057180000001851359 (Cariparma Crédit Agricole).
Le immagini presenti nel file sono i tuoi QR code con la sigla NGB (verde acqua, verde, nero): li riuso come marchio e li stampo sui documenti.

**Testi legali già pronti**
- "Operazione in franchigia da IVA ai sensi della Legge 190 del 23 Dicembre 2014 art. 1 commi da 54 a 89"
- "Il compenso non è soggetto a ritenute d'acconto ai sensi della legge 190/2014 art. 1 comma 67"
- "Imposta di bollo assolta in modo virtuale ai sensi dell'art. 15 del d.p.r. 642/1972 e del DM 17/06/2014"
- "Spese Anticipate Art. 15 DPR 633/1972 (bollo)" — 2,00 €
- Riga attività: Pratiche CE PED, ATEX, libretti istruzione CE, GDPR/DPO/DPIA, gestione commesse, CAD, tarature, manutenzioni, carpenterie…
- Pagamento: "f.m. data fattura", scadenza calcolata a fine mese

**Calcolo economico (come nei fogli AZZ-)**
```
Vacazioni (ore) x tariffa oraria (24,00 scontata 10% = 21,60)  = B imponibile
+ 5% Contributo Integrativo cassa                              = A
+ Spese anticipate art. 15 (bollo 2,00)                        = D
- Ritenuta (0 in regime forfettario)                           = E
= Totale a pagare                                              = F
```

**Il ciclo di vita rilevato**
Preventivo/Offerta (n° tipo P26/01) → accettazione + N° ordine cliente e data ordine → registrazione ore per commessa → Preavviso di nota onoraria (pre-fattura) → Nota onoraria / Fattura (n° 01/26) → scadenza e incasso.

## Cosa costruisco

**Dati (Lovable Cloud)**
- `clienti` — ragione sociale, indirizzo, CAP/città/prov, C.F./P.IVA, SDI, referente
- `commesse` — codice commessa (es. CO_G0191A), cliente, descrizione, disegno, N° serbatoi/pos
- `preventivi` + `preventivo_righe` — numero, data, oggetto, posizioni (descrizione, n°, ore, €/ora), totali, stato (bozza / inviato / accettato / rifiutato)
- `ordini` — N° ordine cliente, data ordine, collegato al preventivo accettato
- `prestazioni` — ore lavorate per commessa/data (le "vacazioni")
- `fatture` + `fattura_righe` — tipo (preavviso / nota onoraria), numero progressivo per anno, date, imponibile, 5% cassa, bollo, totale, scadenza, stato pagamento e data incasso
- `impostazioni` — dati studio, tariffa, sconto, % cassa, bollo, testi legali, IBAN (tutti modificabili)

**Schermate**
1. **Dashboard** — da fatturare, fatturato anno, scaduti, ore del mese (come il foglio "controllo fatture")
2. **Clienti** e **Commesse**
3. **Preventivi** — editor con righe, calcolo automatico, anteprima stampabile identica al modello, un click "Accetta → crea ordine"
4. **Ore/Prestazioni** — inserimento ore per commessa e mese
5. **Fatturazione** — dal mese/commesse aperte genera il Preavviso, poi la Nota onoraria con numerazione automatica `NN/AA`; il preavviso resta collegato
6. **Registro fatture** — stato pagato/scadenza, filtri per anno e cliente
7. **Stampa PDF** — layout A4 dei tre documenti (preventivo, preavviso, nota onoraria) con intestazione, QR NGB, testi legali e IBAN

**Dettagli tecnici**
Numerazione: contatori separati per preventivo (`Pnn/AA`) e fattura (`nn/AA`), progressivi per anno, modificabili a mano. Scadenza: fine mese successivo alla data fattura (regola "f.m. data fattura"), sovrascrivibile. Importi in centesimi per evitare errori di arrotondamento. Generazione PDF lato client dal layout HTML stampabile.

## Fuori scopo per ora
Invio fattura elettronica allo SdI (serve un intermediario accreditato) e importazione automatica dello storico dei 362 preventivi — si può aggiungere dopo, con un import guidato.

## Prima consegna
Design system + dati studio e loghi, anagrafiche clienti/commesse, preventivo completo con stampa, e conversione preventivo → ordine → fattura con stampa. Poi affiniamo su dati reali.
