ALTER TABLE public.preventivi ADD COLUMN IF NOT EXISTS fattura_id uuid REFERENCES public.fatture(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS preventivi_fattura_id_idx ON public.preventivi(fattura_id);
UPDATE public.preventivi p SET fattura_id = f.id FROM public.fatture f WHERE f.preventivo_id = p.id AND p.fattura_id IS NULL;