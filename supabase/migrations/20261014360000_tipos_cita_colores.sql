-- LOS TIPOS DE CITA Y SUS COLORES (Monica, 14-oct-2026, cerrado con el hilo de
-- la agenda): "de momento esos". El rojo es SOLO para las juntas.
-- El generico "cita" se retira: cada cita lleva su tipo.

alter table public.tipos_cita add column if not exists color text;
alter table public.tipos_cita add column if not exists orden integer;
alter table public.tipos_cita add constraint tipos_cita_color_hex check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');
comment on column public.tipos_cita.color is 'El color de la cita en la agenda (hex). El rojo, solo para las juntas.';

insert into public.tipos_cita (clave, nombre, minutos_defecto, color, orden) values
  ('llamada', 'Llamada', 30, '#EDDB39', 1),
  ('visita_oficina', 'Visita en oficina', 60, '#97BE87', 2),
  ('visita_fuera', 'Visita fuera de oficina', 90, '#E5854C', 3),
  ('videollamada', 'Videollamada', 30, '#AA79FF', 4),
  ('mail', 'Mail', 30, '#DFC5AE', 5),
  ('junta', 'Junta', 90, '#E15E61', 6),
  ('reunion_interna', 'Reunión interna en oficina', 60, '#9EADF0', 8)
on conflict (clave) do update set nombre = excluded.nombre, minutos_defecto = excluded.minutos_defecto, color = excluded.color, orden = excluded.orden, activo = true;

update public.tipos_cita set nombre = 'Polycam', color = '#588FD9', orden = 7 where clave = 'escaneo_polycam';
update public.tipos_cita set activo = false, color = '#B9B9B9', orden = 99 where clave = 'cita';
