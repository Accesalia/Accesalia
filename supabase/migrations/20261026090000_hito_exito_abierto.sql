-- EL HITO A EXITO, ABIERTO (Monica, 25-oct-2026: «una subvencion con hito a exito puede cobrarse mas de una vez: varias
-- convocatorias»). Un hito a exito (sin importe: lo pone lo concedido) es un saco: cada concesion es una PARTE suya
-- (hito_padre_id, como un hito partido), con su convocatoria, lo concedido y su importe (lo concedido × el % de la
-- linea), y se factura y se cobra como cualquier hito. El hito sigue ABIERTO aunque se cobren sus partes, porque puede
-- llegar otra convocatoria, hasta que alguien lo CIERRA A MANO con su motivo (Monica: «que se cierre manual»).
-- Tres campos, para el cierre: cuando, quien y por que.

alter table public.hitos_cobro
  add column cerrado_en timestamptz,
  add column cerrado_por uuid references public.equipo(id),
  add column motivo_cierre text,
  add constraint hitos_cobro_cierre_check check (cerrado_en is null or nullif(trim(motivo_cierre), '') is not null);
comment on column public.hitos_cobro.cerrado_en is 'Hito a exito cerrado a mano (ya no habra mas concesiones). Vacio y a exito = abierto: puede recibir mas partes.';
