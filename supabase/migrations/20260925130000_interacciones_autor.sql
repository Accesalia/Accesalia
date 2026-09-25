-- Quien escribio la nota del diario comercial (Monica, 25-sep-2026).
-- La rellena la sesion al guardar: nadie la escribe a mano.
-- Va enlazada al equipo y NO como texto, para que el nombre no se quede viejo.
-- Queda en blanco a proposito cuando la nota no la escribe una persona del
-- equipo (nota de voz, extraccion de la IA, migracion): para eso esta `origen`.
--
-- APLICADA EN PRODUCCION el 25-sep-2026.
alter table public.interacciones
  add column if not exists autor_id uuid references public.equipo(id) on delete set null;

comment on column public.interacciones.autor_id is
  'Quien de `equipo` escribio la nota. Lo pone la sesion automaticamente. Nulo si no la escribio una persona (ver `origen`).';

create index if not exists interacciones_autor_id_idx on public.interacciones(autor_id);
