CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.impostazioni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_nome text NOT NULL DEFAULT 'Nichetti G.B.',
  studio_indirizzo text NOT NULL DEFAULT 'Via Foscolo, 28',
  studio_cap text NOT NULL DEFAULT '26015',
  studio_citta text NOT NULL DEFAULT 'Soresina',
  studio_provincia text NOT NULL DEFAULT 'CR',
  studio_piva text NOT NULL DEFAULT '01235350194',
  studio_cf text NOT NULL DEFAULT 'NCHGBT59H21B650X',
  studio_tel text NOT NULL DEFAULT '0339 63 44 660',
  studio_fax text NOT NULL DEFAULT '0374 341 472',
  studio_email text NOT NULL DEFAULT 'nichettigb@gmail.com',
  studio_sdi text NOT NULL DEFAULT 'KRRH6B9',
  studio_iban text NOT NULL DEFAULT 'IT57H0623057180000001851359',
  studio_banca text NOT NULL DEFAULT 'Cariparma Crédit Agricole',
  attivita text NOT NULL DEFAULT 'Pratiche CE PED; ATEX; Libretti di istruzione CE; GDPR Regolamento UE Privacy 2016-679; Responsabile della Protezione Dati (DPO): Data Protection Impact Assessment (DPIA); Gestione commesse; disegni CAD; Word; Excel; internet; tarature strumenti; gestione manutenzioni anche carriponte gru e muletti; Progettazione di carpenterie civili, industriali, speciali, metalliche e meccaniche.',
  tariffa_oraria numeric(12,2) NOT NULL DEFAULT 24.00,
  sconto_pct numeric(6,2) NOT NULL DEFAULT 10.00,
  contributo_pct numeric(6,2) NOT NULL DEFAULT 5.00,
  bollo numeric(12,2) NOT NULL DEFAULT 2.00,
  ritenuta_pct numeric(6,2) NOT NULL DEFAULT 0.00,
  testo_franchigia text NOT NULL DEFAULT 'Operazione in franchigia da IVA ai sensi della Legge 190 del 23 Dicembre 2014 art. 1 commi da 54 a 89.',
  testo_ritenuta text NOT NULL DEFAULT 'Il compenso non è soggetto a ritenute d''acconto ai sensi della legge 190 del 23 Dicembre 2014 art. 1 comma 67.',
  testo_forfettario text NOT NULL DEFAULT 'Operazione effettuata ai sensi dell''art. 1, commi da 54 a 89 della Legge n. 190/2014 - Regime forfettario.',
  testo_bollo text NOT NULL DEFAULT '"Imposta di bollo assolta in modo virtuale ai sensi dell''articolo 15 del d.p.r. 642/1972 e del DM 17/06/2014"',
  testo_spese_anticipate text NOT NULL DEFAULT 'Spese Anticipate Art. 15 DPR 633/1972 (bollo)',
  testo_pagamento text NOT NULL DEFAULT 'f.m. data fattura',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.impostazioni TO authenticated;
GRANT ALL ON public.impostazioni TO service_role;
ALTER TABLE public.impostazioni ENABLE ROW LEVEL SECURITY;
CREATE POLICY "impostazioni_auth_all" ON public.impostazioni FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_impostazioni_updated BEFORE UPDATE ON public.impostazioni FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.impostazioni DEFAULT VALUES;

CREATE TABLE public.clienti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ragione_sociale text NOT NULL,
  indirizzo text NOT NULL DEFAULT '',
  cap text NOT NULL DEFAULT '',
  citta text NOT NULL DEFAULT '',
  provincia text NOT NULL DEFAULT '',
  cf text NOT NULL DEFAULT '',
  piva text NOT NULL DEFAULT '',
  sdi text NOT NULL DEFAULT '',
  pec text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  telefono text NOT NULL DEFAULT '',
  referente text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  attivo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clienti TO authenticated;
GRANT ALL ON public.clienti TO service_role;
ALTER TABLE public.clienti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clienti_auth_all" ON public.clienti FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_clienti_updated BEFORE UPDATE ON public.clienti FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.commesse (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.clienti(id) ON DELETE SET NULL,
  codice text NOT NULL,
  descrizione text NOT NULL DEFAULT '',
  disegno text NOT NULL DEFAULT '',
  riferimento text NOT NULL DEFAULT '',
  stato text NOT NULL DEFAULT 'aperta',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commesse TO authenticated;
GRANT ALL ON public.commesse TO service_role;
ALTER TABLE public.commesse ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commesse_auth_all" ON public.commesse FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_commesse_updated BEFORE UPDATE ON public.commesse FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.preventivi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  anno integer NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  cliente_id uuid REFERENCES public.clienti(id) ON DELETE SET NULL,
  commessa_id uuid REFERENCES public.commesse(id) ON DELETE SET NULL,
  oggetto text NOT NULL DEFAULT '',
  premessa text NOT NULL DEFAULT 'Compenso per consulenza tecnica relativa a:',
  descrizione text NOT NULL DEFAULT '',
  tariffa_oraria numeric(12,2) NOT NULL DEFAULT 24.00,
  sconto_pct numeric(6,2) NOT NULL DEFAULT 0.00,
  contributo_pct numeric(6,2) NOT NULL DEFAULT 5.00,
  bollo numeric(12,2) NOT NULL DEFAULT 0.00,
  totale_ore numeric(12,2) NOT NULL DEFAULT 0,
  imponibile numeric(12,2) NOT NULL DEFAULT 0,
  contributo numeric(12,2) NOT NULL DEFAULT 0,
  totale numeric(12,2) NOT NULL DEFAULT 0,
  stato text NOT NULL DEFAULT 'bozza',
  numero_ordine text NOT NULL DEFAULT '',
  data_ordine date,
  validita text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preventivi TO authenticated;
GRANT ALL ON public.preventivi TO service_role;
ALTER TABLE public.preventivi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "preventivi_auth_all" ON public.preventivi FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_preventivi_updated BEFORE UPDATE ON public.preventivi FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.preventivo_righe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preventivo_id uuid NOT NULL REFERENCES public.preventivi(id) ON DELETE CASCADE,
  ordinamento integer NOT NULL DEFAULT 0,
  posizione text NOT NULL DEFAULT '',
  descrizione text NOT NULL DEFAULT '',
  quantita numeric(12,2) NOT NULL DEFAULT 1,
  ore numeric(12,2) NOT NULL DEFAULT 0,
  prezzo_ora numeric(12,2) NOT NULL DEFAULT 0,
  importo numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preventivo_righe TO authenticated;
GRANT ALL ON public.preventivo_righe TO service_role;
ALTER TABLE public.preventivo_righe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "preventivo_righe_auth_all" ON public.preventivo_righe FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.fatture (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'nota',
  numero text NOT NULL,
  anno integer NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  cliente_id uuid REFERENCES public.clienti(id) ON DELETE SET NULL,
  preventivo_id uuid REFERENCES public.preventivi(id) ON DELETE SET NULL,
  preavviso_id uuid REFERENCES public.fatture(id) ON DELETE SET NULL,
  oggetto text NOT NULL DEFAULT '',
  premessa text NOT NULL DEFAULT 'Compenso per consulenza tecnica relativa a:',
  descrizione text NOT NULL DEFAULT '',
  periodo date,
  tariffa_oraria numeric(12,2) NOT NULL DEFAULT 24.00,
  sconto_pct numeric(6,2) NOT NULL DEFAULT 10.00,
  contributo_pct numeric(6,2) NOT NULL DEFAULT 5.00,
  totale_ore numeric(12,2) NOT NULL DEFAULT 0,
  imponibile numeric(12,2) NOT NULL DEFAULT 0,
  contributo numeric(12,2) NOT NULL DEFAULT 0,
  bollo numeric(12,2) NOT NULL DEFAULT 2.00,
  ritenuta numeric(12,2) NOT NULL DEFAULT 0,
  totale numeric(12,2) NOT NULL DEFAULT 0,
  scadenza date,
  stato text NOT NULL DEFAULT 'da_inviare',
  data_pagamento date,
  numero_ordine text NOT NULL DEFAULT '',
  data_ordine date,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fatture TO authenticated;
GRANT ALL ON public.fatture TO service_role;
ALTER TABLE public.fatture ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fatture_auth_all" ON public.fatture FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_fatture_updated BEFORE UPDATE ON public.fatture FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.fattura_righe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fattura_id uuid NOT NULL REFERENCES public.fatture(id) ON DELETE CASCADE,
  ordinamento integer NOT NULL DEFAULT 0,
  commessa_id uuid REFERENCES public.commesse(id) ON DELETE SET NULL,
  descrizione text NOT NULL DEFAULT '',
  ore numeric(12,2) NOT NULL DEFAULT 0,
  prezzo_ora numeric(12,2) NOT NULL DEFAULT 0,
  importo numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fattura_righe TO authenticated;
GRANT ALL ON public.fattura_righe TO service_role;
ALTER TABLE public.fattura_righe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fattura_righe_auth_all" ON public.fattura_righe FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_preventivi_cliente ON public.preventivi(cliente_id);
CREATE INDEX idx_preventivo_righe_prev ON public.preventivo_righe(preventivo_id);
CREATE INDEX idx_fatture_cliente ON public.fatture(cliente_id);
CREATE INDEX idx_fattura_righe_fatt ON public.fattura_righe(fattura_id);
CREATE INDEX idx_commesse_cliente ON public.commesse(cliente_id);