-- ¿PORTAL ACCESIBLE? (Monica, 15-oct-2026, bloque 1 de la ficha de la opp): en
-- "Lo que hemos visto nosotros", junto al ascensor y los patios. Si tiene
-- escalones dentro o fuera, se le puede vender una rampa o una plataforma.
-- Observacion humana: va firmada (quien y cuando), igual que el ascensor.
-- Vacio = nadie lo ha mirado; false = tiene escalones.
alter table public.ficha_catastro
  add column if not exists portal_accesible boolean,
  add column if not exists portal_visto_por uuid references public.equipo(id) on delete set null,
  add column if not exists portal_visto_en timestamptz;
comment on column public.ficha_catastro.portal_accesible is 'Portal accesible (sin escalones dentro ni fuera), visto por una persona. Vacio = sin mirar. Firmado en portal_visto_por/en (15-oct-2026).';
