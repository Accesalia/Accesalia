-- El radar de IEE avisa con motivo 'alerta_iee' y la lista no lo tenia: desde
-- el 2-oct cada aviso diario se rechazaba (Monica, 9-oct-2026).
alter table public.avisos drop constraint avisos_motivo_check;
alter table public.avisos add constraint avisos_motivo_check check (motivo = any (array[
  'polycam_recibido'::text, 'viabilidad_lista'::text, 'direccion_por_validar'::text,
  'documento_recibido'::text, 'alerta_iee'::text, 'otro'::text]));
