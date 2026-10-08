-- =====================================================================
-- "ME HE ATASCADO": EL PORQUE, Y LA NOTA DE SALI
-- Monica, 8-oct-2026.
--
-- Cuando Alex no saca una viabilidad pulsa "Me he atascado" y se avisa a
-- Daniel. Hasta hoy solo quedaba la hora: ni Daniel sabia que mirar ni el
-- comercial sabia que habia retraso, ni por que.
--
-- 1. motivo_atasco: lo que escribe Alex, OBLIGATORIO al avisar. Es el cuerpo
--    del correo a Daniel (el asunto, la direccion del escaneo) y se ve en la
--    mesa: "el texto debe estar en la mesa".
--
-- 2. La primera nota automatica de Sali. La escribe la BASE, no la pantalla:
--    entre por donde entre el aviso, la nota sale, y sale una vez. Frase fija,
--    sin IA. Va al diario de la opp con origen sali y canal interno ("senales
--    que llegan de otras partes de la app"). Ejemplo de ella:
--      Avisado a Daniel: "el ancho es de 1,98 en la planta baja y solo cabria
--      una cabina de 32, hay que revisar si se puede hacer por patio o
--      exterior, invadiendo cocinas".
--    Solo salta cuando cambia daniel_avisado_en, una fila cada vez: las cargas
--    masivas no tocan esa columna.
-- =====================================================================

alter table public.viabilidades add column motivo_atasco text;

alter table public.viabilidades
  add constraint viabilidades_atasco_con_motivo_ck
  check (daniel_avisado_en is null or btrim(coalesce(motivo_atasco, '')) <> '');

comment on column public.viabilidades.motivo_atasco is
  'Por que no sale la viabilidad, escrito por quien la redacta al pulsar "Me he atascado". Obligatorio al avisar. Es el cuerpo del correo a Daniel y lo ve el comercial en el diario (nota de Sali).';

create or replace function public.nota_sali_viabilidad_atascada()
returns trigger
language plpgsql
as $$
declare
  quien text;
begin
  if new.oportunidad_id is null then
    return new;
  end if;

  select nombre into quien from public.equipo where id = new.redacta_id;

  insert into public.notas_oportunidad (oportunidad_id, fecha, texto, autor, origen, canal)
  values (
    new.oportunidad_id,
    (new.daniel_avisado_en at time zone 'Europe/Madrid')::date,
    'Viabilidad atascada' || coalesce(' (' || quien || ')', '') ||
      '. Avisado a Daniel para que lo desatasque: "' || btrim(new.motivo_atasco) || '"',
    'Sali',
    'sali',
    'interno'
  );
  return new;
end;
$$;

comment on function public.nota_sali_viabilidad_atascada() is
  'Nota automatica de Sali en el diario de la opp cuando se avisa a Daniel de una viabilidad atascada (Monica, 8-oct-2026).';

create trigger trg_nota_sali_viabilidad_atascada
  after update of daniel_avisado_en on public.viabilidades
  for each row
  when (new.daniel_avisado_en is not null and new.daniel_avisado_en is distinct from old.daniel_avisado_en)
  execute function public.nota_sali_viabilidad_atascada();
