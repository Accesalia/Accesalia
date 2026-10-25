-- SE APLICA EL DIA DE LA MIGRACION (rama comercial-hojas-nuevas), DESPUES de copiar las hojas a he_* (si no, cada fila
-- copiada al historial dispararia su nota de Sali y su consolidacion).
-- Los automatismos de la base, de las hojas viejas a las nuevas (25-oct-2026). Cuelgan del HISTORIAL (he_estados_hoja),
-- que es donde queda cada paso de la hoja:
--   - ok_daniel        → nota de Sali «HE-… creada» (v1) o «HE-… versión N generada» con sus cambios y el motivo (v2+).
--                        Antes era al generar el PDF; ahora la hoja nace con su codigo y su PDF en el ok de Daniel.
--   - enviada          → nota de Sali «HE-… enviada el …».
--   - firmada_recibida → nota de Sali «HE-… firmada el …, total …» y se consolidan los administradores de la opp que
--                        aun no son de nadie (pasan a la cartera del comercial de la opp); el de otro comercial no cambia.
--   - pendiente_ok_daniel de una version 2 o mas → tiene que estar dicho por que se cambio (la anterior lleva su
--     «cambios_comunidad» o «cambios_comercial» con nota). Lo de exigir_motivo_version.
-- sali_lineas_version y sali_cambios_version pasan a leer las lineas nuevas. Las funciones de las hojas viejas se
-- borran (con sus disparadores). BORRA: la ejecuta Monica con SQL (lo que borra esta capado desde fuera).
-- Sin probar en prod (Monica, 25-oct: se comprueba el dia de la migracion).

drop function if exists public.nota_sali_hoja_generada() cascade;
drop function if exists public.nota_sali_hoja_enviada() cascade;
drop function if exists public.nota_sali_hoja_firmada() cascade;
drop function if exists public.consolidar_admin_al_firmar() cascade;
drop function if exists public.exigir_motivo_version() cascade;

-- Las lineas de una version, para comparar dos versiones: su clave (lo que es y de que cuelga), su nombre y lo que se
-- cobra con importe (null: incluido, a exito o el conjunto con «solo el total»).
create or replace function public.sali_lineas_version(p_version uuid)
returns table(clave text, nombre text, importe numeric)
language sql stable as $$
  select concat_ws(':', p.bloque_id, p.desglose_id, l.bloque_id, l.desglose_id, lower(btrim(l.texto))),
         coalesce(nullif(btrim(l.texto), ''), coalesce(b.nombre_corto, b.nombre, 'concepto') || coalesce(' de ' || lower(tp.nombre), '')),
         case when l.se_cobra then l.importe end
    from public.he_lineas_compromisos l
    left join public.he_lineas_compromisos p on p.id = l.padre_id
    left join public.bloques b on b.id = l.bloque_id
    left join public.tipos_proyecto tp on tp.id = l.desglose_id
   where l.version_id = p_version
$$;

-- Que cambia de la version anterior (la de la misma hoja con PDF) a esta: el total y las lineas quitadas, nuevas o con
-- otro importe.
create or replace function public.sali_cambios_version(p_version uuid)
returns text
language plpgsql stable as $$
declare
  v      record;
  prev   record;
  partes text[] := '{}';
  t      text;
begin
  select h.id, h.codigo_he, h.numero_version, i.importe into v
    from public.he_versiones_hoja h join public.he_importe_version i on i.version_id = h.id
   where h.id = p_version;
  if v.codigo_he is null then
    return null;
  end if;
  select h.id, i.importe into prev
    from public.he_versiones_hoja h join public.he_importe_version i on i.version_id = h.id
   where h.codigo_he = v.codigo_he and h.numero_version < v.numero_version and h.pdf is not null
   order by h.numero_version desc limit 1;
  if prev.id is null then
    return null;
  end if;
  if prev.importe <> v.importe then
    partes := partes || ('Total: de ' || coalesce(public.sali_euros(prev.importe), '0 €') ||
                         ' a ' || coalesce(public.sali_euros(v.importe), '0 €') ||
                         ' (' || case when v.importe > prev.importe then '+' else '−' end ||
                         public.sali_euros(abs(v.importe - prev.importe)) || ')');
  end if;
  select string_agg(a.nombre, ', ') into t
    from public.sali_lineas_version(prev.id) a
   where not exists (select 1 from public.sali_lineas_version(v.id) n where n.clave = a.clave);
  if t is not null then partes := partes || ('Quitado: ' || t); end if;
  select string_agg(n.nombre || coalesce(', ' || public.sali_euros(n.importe), ''), '; ') into t
    from public.sali_lineas_version(v.id) n
   where not exists (select 1 from public.sali_lineas_version(prev.id) a where a.clave = n.clave);
  if t is not null then partes := partes || ('Nuevo: ' || t); end if;
  select string_agg(n.nombre || ', de ' || coalesce(public.sali_euros(a.importe), 'incluido') ||
                    ' a ' || coalesce(public.sali_euros(n.importe), 'incluido'), '; ') into t
    from public.sali_lineas_version(v.id) n
    join public.sali_lineas_version(prev.id) a on a.clave = n.clave
   where a.importe is distinct from n.importe;
  if t is not null then partes := partes || ('Cambia: ' || t); end if;
  return nullif(array_to_string(partes, '. '), '');
end;
$$;

-- Una version 2 o mas solo va a Daniel si la anterior dice por que se cambio.
create or replace function public.he_exigir_motivo_version()
returns trigger
language plpgsql as $$
declare
  v record;
begin
  select codigo_he, numero_version into v from public.he_versiones_hoja where id = new.version_id;
  if v.numero_version > 1 and not exists (
    select 1 from public.he_versiones_hoja a
      join public.he_estados_hoja e on e.version_id = a.id and e.estado in ('cambios_comunidad', 'cambios_comercial')
     where a.codigo_he = v.codigo_he and a.numero_version = v.numero_version - 1
  ) then
    raise exception 'Falta el motivo del cambio de la versión %', v.numero_version;
  end if;
  return new;
end;
$$;

create trigger trg_he_exigir_motivo_version
  before insert on public.he_estados_hoja
  for each row when (new.estado = 'pendiente_ok_daniel')
  execute function public.he_exigir_motivo_version();

-- Los pasos de la hoja que apuntan algo: las notas de Sali en el diario de la opp y la consolidacion al firmar.
create or replace function public.he_automatismos_estado()
returns trigger
language plpgsql as $$
declare
  v       record;
  dia     date := (new.fecha at time zone 'Europe/Madrid')::date;
  codigo  text;
  total   text;
  admins  uuid[];
  o       record;
begin
  select h.id, h.codigo_he, h.numero_version, h.oportunidad_id, h.pagador_tipo, h.pagador_comunidad_id,
         (select c.nombre from public.contratas c where c.id = h.pagador_contrata_id) as contrata,
         (select nullif(btrim(concat_ws(' ', p.nombre, p.apellidos)), '') from public.persona p where p.id = h.pagador_persona_id) as persona
    into v
    from public.he_versiones_hoja h where h.id = new.version_id;
  codigo := coalesce(v.codigo_he, 'La hoja de encargo');
  select public.sali_euros(i.importe) into total from public.he_importe_version i where i.version_id = v.id and i.importe > 0;

  if new.estado = 'ok_daniel' and v.numero_version = 1 then
    perform public.nota_sali(v.oportunidad_id, dia, 'hoja_creada', jsonb_build_object(
      'codigo',  codigo,
      'que',     (select string_agg(x.nombre, ' + ' order by x.orden)
                    from (select coalesce(nullif(btrim(l.texto), ''), coalesce(b.nombre_corto, b.nombre) || coalesce(' de ' || lower(tp.nombre), '')) as nombre,
                                 min(l.creado_en) as orden
                            from public.he_lineas_compromisos l
                            left join public.bloques b on b.id = l.bloque_id
                            left join public.tipos_proyecto tp on tp.id = l.desglose_id
                           where l.version_id = v.id and l.padre_id is null
                           group by 1) x),
      'total',   total,
      'pagador', case v.pagador_tipo when 'comunidad' then 'la comunidad'
                                     when 'contrata'  then 'la contrata' || coalesce(' ' || v.contrata, '')
                                     when 'persona'   then coalesce(v.persona, 'una persona') end
    ));
  elsif new.estado = 'ok_daniel' then
    perform public.nota_sali(v.oportunidad_id, dia, 'hoja_nueva_version', jsonb_build_object(
      'codigo',  codigo,
      'version', v.numero_version,
      'cambios', public.sali_cambios_version(v.id),
      'motivo',  (select e.nota from public.he_versiones_hoja a
                    join public.he_estados_hoja e on e.version_id = a.id and e.estado in ('cambios_comunidad', 'cambios_comercial')
                   where a.codigo_he = v.codigo_he and a.numero_version = v.numero_version - 1
                   order by e.fecha desc limit 1)
    ));
  elsif new.estado = 'enviada' then
    perform public.nota_sali(v.oportunidad_id, dia, 'hoja_enviada', jsonb_build_object(
      'codigo',  codigo,
      'version', case when v.numero_version > 1 then v.numero_version end,
      'fecha',   public.sali_fecha(dia)
    ));
  elsif new.estado = 'firmada_recibida' then
    perform public.nota_sali(v.oportunidad_id, dia, 'hoja_firmada', jsonb_build_object(
      'codigo', codigo || case when v.numero_version > 1 then ' (versión ' || v.numero_version || ')' else '' end,
      'fecha',  public.sali_fecha(dia),
      'total',  total
    ));
    -- Firmada: los administradores de la opp que aun no son de nadie quedan consolidados en la cartera del comercial de
    -- la opp; el que ya es de otro comercial no cambia, y el captador que ya tuviera se respeta (Monica, 25-oct). Los de la
    -- comunidad que paga; si no, los de la opp (por sus accesos); si no, el contacto de la opp si no es de una contrata.
    select op.comercial_id, op.puesto_id into o from public.oportunidades op where op.id = v.oportunidad_id;
    if o.comercial_id is not null then
      if v.pagador_comunidad_id is not null then
        select array_agg(distinct r.puesto_id) into admins
          from public.comunidad_admin_responsable r
         where r.vigente and r.comunidad_id = v.pagador_comunidad_id and r.puesto_id is not null;
      end if;
      if admins is null then
        select array_agg(distinct a.puesto_id) into admins
          from public.administradores_de_oportunidad a
         where a.oportunidad_id = v.oportunidad_id and a.puesto_id is not null;
      end if;
      if admins is null and o.puesto_id is not null then
        select array_agg(pu.id) into admins from public.puesto pu where pu.id = o.puesto_id and pu.contrata_id is null;
      end if;
      if admins is not null then
        update public.puesto
           set consolidado = true,
               consolidado_en = dia,
               comercial_captador_id = coalesce(comercial_captador_id, o.comercial_id),
               comercial_id = o.comercial_id
         where id = any (admins) and not consolidado and comercial_id is null;
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_he_automatismos_estado
  after insert on public.he_estados_hoja
  for each row when (new.estado in ('ok_daniel', 'enviada', 'firmada_recibida'))
  execute function public.he_automatismos_estado();

comment on function public.he_automatismos_estado() is 'Los pasos de la hoja que apuntan algo: notas de Sali (creada / nueva version en el ok de Daniel, enviada, firmada) y, al llegar firmada, la consolidacion de los administradores de la opp en la cartera de su comercial.';
