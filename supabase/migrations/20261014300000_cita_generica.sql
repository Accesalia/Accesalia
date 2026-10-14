-- CREAR CITA DESDE LA AGENDA (Monica, 14-oct-2026, cerrado con el hilo de la
-- pantalla de agenda). Un tipo generico, "Cita", de 60 minutos por defecto, para
-- lo que se apunta a mano en una raya del papel.
-- Y el "con quien" puede ser tambien un contacto de una comunidad
-- (personas_comunidad: presidente, vecino...), como en las llamadas.

insert into public.tipos_cita (clave, nombre, minutos_defecto)
values ('cita', 'Cita', 60)
on conflict (clave) do nothing;

alter table public.citas_con_quien add column if not exists persona_comunidad_id uuid references public.personas_comunidad(id);
alter table public.citas_con_quien drop constraint if exists citas_con_quien_alguien;
alter table public.citas_con_quien add constraint citas_con_quien_alguien
  check (persona_id is not null or persona_comunidad_id is not null or btrim(coalesce(nombre, '')) <> '');
