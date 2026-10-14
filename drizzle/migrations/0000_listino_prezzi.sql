CREATE TABLE public.listino_prezzi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codice text NOT NULL UNIQUE,
  gruppo text NOT NULL DEFAULT '',
  descrizione text NOT NULL DEFAULT '',
  quantita_rif text NOT NULL DEFAULT '',
  ore numeric NOT NULL DEFAULT 0,
  unita text NOT NULL DEFAULT 'h',
  prezzo numeric,
  incrementabile boolean NOT NULL DEFAULT false,
  ordinamento integer NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listino_prezzi TO authenticated;
GRANT ALL ON public.listino_prezzi TO service_role;
ALTER TABLE public.listino_prezzi ENABLE ROW LEVEL SECURITY;
CREATE POLICY listino_auth_all ON public.listino_prezzi FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER listino_updated BEFORE UPDATE ON public.listino_prezzi FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.listino_prezzi (codice, gruppo, descrizione, quantita_rif, ore, unita, prezzo, incrementabile, ordinamento) VALUES
('PED01','CE PED serbatoi','Modulo B + C1 o F o G','n° 1',22,'h',NULL,false,1),
('PED02','CE PED serbatoi','Modulo B + C1 o F o G','n° 2',37,'h',NULL,false,2),
('PED03','CE PED serbatoi','Modulo B + C1 o F o G','n° 3',52,'h',NULL,false,3),
('PED04','CE PED serbatoi','Modulo B + C1 o F o G','n° 4',67,'h',NULL,false,4),
('PED05','CE PED serbatoi','Modulo B + C1 o F o G','n° 5',86,'h',NULL,false,5),
('PED06','CE PED serbatoi','Modulo B + C1 o F o G','n° 6',102,'h',NULL,false,6),
('PED07','CE PED serbatoi','Modulo B + C1 o F o G','n° 7',121,'h',NULL,false,7),
('PED08','CE PED serbatoi','Modulo B + C1 o F o G','n° 8',137.5,'h',NULL,false,8),
('PED09','CE PED serbatoi','Ripetizione di Modulo C1 o F o G','n° 1',16,'h',NULL,false,9),
('PED10','CE PED serbatoi','Ripetizione di Modulo C1 o F o G','n° 2 a 4',15,'h',NULL,true,10),
('PED11','CE PED serbatoi','Modulo A o A1','n° 1',19,'h',NULL,false,11),
('BOLLO01','Spese','Spese Anticipate Art. 15 DPR 633/1972 (bollo)','cad.',1,'cad',2,true,20),
('KM01','Viaggi e vacazioni','Totale Viaggi Km','',1,'km',2,true,21),
('VacViagg01','Viaggi e vacazioni','Vacazioni per viaggio n°','',1,'h',50,true,22),
('VacCons01','Viaggi e vacazioni','Vacazioni per consulenza tecn. n°','',1,'h',80,true,23);