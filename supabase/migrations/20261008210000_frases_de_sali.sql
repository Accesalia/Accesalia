-- =====================================================================
-- LAS FRASES DE SALI
-- Monica, 8-oct-2026.
--
-- Sali deja en el diario de la oportunidad una nota cada vez que pasa algo en
-- otra parte de la app, "para que el comercial tenga ese hilo continuo que
-- seguir, ademas de SUS entradas". No es IA: son frases fijas rellenadas con
-- datos de la base. La IA queda para los analisis de los momentos clave.
--
-- REGLAS DE LAS FRASES (aprobadas por ella):
--   1. una linea, en pasado, sin opiniones: que paso, quien y el dato clave;
--   2. empieza por el documento (HE-2026-0041...), para encontrarla buscando;
--   3. solo datos de la base: si uno falta, ese trozo no sale;
--   4. fechas y nombres como los dice una persona: "15-oct", "Alex".
--   Los importes SI van: son notas comerciales y confidenciales.
--
-- LAS PLANTILLAS VIVEN EN UNA TABLA, no en el codigo: cambiar una frase es
-- cambiar una fila. {hueco} se rellena; [ ... ] es un trozo opcional que
-- desaparece entero si alguno de sus huecos esta vacio.
--
-- LA NOTA LA ESCRIBE LA BASE, con un disparador en la tabla donde vive el
-- dato: entre por donde entre el cambio, la nota sale, y sale una vez. Solo
-- salta cuando el dato CAMBIA, asi que no hay notas hacia atras.
-- Un proceso masivo por SQL puede callarlas con: set local app.sin_notas_sali = 'on'.
-- =====================================================================

-- ------------------------------------------------------------ las plantillas

create table public.plantillas_sali (
  clave          text primary key,
  plantilla      text        not null,
  cuando         text        not null,
  activo         boolean     not null default true,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create trigger trg_set_actualizado_en before update on public.plantillas_sali
  for each row execute function public.set_actualizado_en();

comment on table public.plantillas_sali is
  'Las frases de las notas automaticas de Sali. {hueco} se rellena con datos; [ ... ] es un trozo que desaparece si falta alguno de sus huecos. Cambiar una frase = cambiar esta fila (Monica, 8-oct-2026).';
comment on column public.plantillas_sali.cuando is 'Que suceso la dispara, en palabras de persona.';
comment on column public.plantillas_sali.activo is 'Apagada = ese suceso deja de escribir nota.';

insert into public.plantillas_sali (clave, cuando, plantilla) values
  ('viabilidad_enviada',  'Alex envia la viabilidad al comercial',
   'Viabilidad enviada al comercial[ por {quien}].[ 3D: {tresd}.][ PEM estimado: {pem}.][ Conclusión: "{conclusion}"]'),
  ('viabilidad_atascada', 'Alex pulsa "Me he atascado" y se avisa a Daniel',
   'Viabilidad atascada[ ({quien})]. Avisado a Daniel para que lo desatasque: "{motivo}"'),
  ('hoja_creada',         'Una hoja de encargo se genera por primera vez y recibe su numero',
   '{codigo} creada[: {que}].[ Total {total} + IVA.][ Paga {pagador}.]'),
  ('hoja_nueva_version',  'Se genera una version nueva de una hoja que ya tenia numero',
   '{codigo} versión {version} generada.[ {cambios}.][ Motivo: "{motivo}"]'),
  ('hoja_enviada',        'Se marca enviada una version de la hoja',
   '{codigo}[ (versión {version})] enviada el {fecha}.'),
  ('hoja_firmada',        'Se apunta la hoja firmada',
   '{codigo} firmada el {fecha}.[ Total {total} + IVA.]'),
  ('polycam_recibido',    'Llega al buzon el escaneo Polycam',
   'Recibido el escaneo Polycam[ de {donde}][ ({ficheros})].');

-- ------------------------------------------------------------ las piezas

/** "14.200 €" */
create or replace function public.sali_euros(n numeric) returns text
language sql immutable as $$
  select case when n is null then null
              else replace(to_char(round(n), 'FM999,999,999,990'), ',', '.') || ' €' end
$$;

/** "15-oct" */
create or replace function public.sali_fecha(d date) returns text
language sql immutable as $$
  select case when d is null then null
              else extract(day from d)::int || '-' ||
                   (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] end
$$;

/** La frase de un suceso con sus datos. Null si la plantilla esta apagada. */
create or replace function public.frase_sali(p_clave text, p_datos jsonb) returns text
language plpgsql stable as $$
declare
  t      text;
  m      text[];
  dentro text;
  k      text;
  falta  boolean;
begin
  select plantilla into t from public.plantillas_sali where clave = p_clave and activo;
  if t is null then
    return null;
  end if;

  -- los trozos opcionales: fuera enteros si les falta algun hueco
  loop
    m := regexp_match(t, '\[([^\[\]]*)\]');
    exit when m is null;
    dentro := m[1];
    falta := false;
    for k in select (regexp_matches(dentro, '\{(\w+)\}', 'g'))[1] loop
      if coalesce(btrim(p_datos ->> k), '') = '' then
        falta := true;
      end if;
    end loop;
    t := replace(t, '[' || dentro || ']', case when falta then '' else dentro end);
  end loop;

  -- los huecos
  for k in select distinct (regexp_matches(t, '\{(\w+)\}', 'g'))[1] loop
    t := replace(t, '{' || k || '}', coalesce(btrim(p_datos ->> k), ''));
  end loop;

  return btrim(regexp_replace(t, '\s{2,}', ' ', 'g'));
end;
$$;

/** Deja la nota en el diario de la opp. Sin opp o sin frase, nada. */
create or replace function public.nota_sali(p_opp uuid, p_fecha date, p_clave text, p_datos jsonb, p_canal text default 'interno')
returns void
language plpgsql as $$
declare
  frase text;
begin
  if p_opp is null or coalesce(current_setting('app.sin_notas_sali', true), '') = 'on' then
    return;
  end if;
  frase := public.frase_sali(p_clave, p_datos);
  if coalesce(frase, '') = '' then
    return;
  end if;
  insert into public.notas_oportunidad (oportunidad_id, fecha, texto, autor, origen, canal)
  values (p_opp, coalesce(p_fecha, (now() at time zone 'Europe/Madrid')::date), frase, 'Sali', 'sali', p_canal);
end;
$$;

-- ------------------------------------------------------------ viabilidades

-- El atasco (de esta mañana) pasa a usar su plantilla.
create or replace function public.nota_sali_viabilidad_atascada()
returns trigger
language plpgsql as $$
begin
  perform public.nota_sali(
    new.oportunidad_id,
    (new.daniel_avisado_en at time zone 'Europe/Madrid')::date,
    'viabilidad_atascada',
    jsonb_build_object(
      'quien',  (select nombre from public.equipo where id = new.redacta_id),
      'motivo', new.motivo_atasco
    )
  );
  return new;
end;
$$;

create or replace function public.nota_sali_viabilidad_enviada()
returns trigger
language plpgsql as $$
begin
  perform public.nota_sali(
    new.oportunidad_id,
    (new.enviada_en at time zone 'Europe/Madrid')::date,
    'viabilidad_enviada',
    jsonb_build_object(
      'quien', (select nombre from public.equipo where id = new.redacta_id),
      'tresd', case
                 when new.necesita_3d_especifico then 'necesita 3D específico'
                 else (select 'modelo del catálogo ' || codigo from public.modelos_escalera where id = new.modelo_escalera_id)
               end,
      'pem',        public.sali_euros(new.pem_estimado),
      'conclusion', new.conclusion
    )
  );
  return new;
end;
$$;

create trigger trg_nota_sali_viabilidad_enviada
  after update of enviada_en on public.viabilidades
  for each row
  when (new.enviada_en is not null and new.enviada_en is distinct from old.enviada_en)
  execute function public.nota_sali_viabilidad_enviada();

-- ------------------------------------------------------------ hojas de encargo

/** Las lineas de una version, para compararla con la anterior. Una linea se
 *  reconoce por su bloque; la del proyecto conjunto (sin bloque), por su texto. */
create or replace function public.sali_lineas_version(p_version uuid)
returns table (clave text, nombre text, importe numeric)
language sql stable as $$
  select coalesce(k.bloque_id::text, 'txt:' || lower(coalesce(btrim(k.descripcion), 'conjunto'))),
         coalesce(nullif(btrim(k.descripcion), ''), b.nombre_corto, b.nombre, 'concepto'),
         case when k.desglose = 'se_cobra' then k.importe end
    from public.conceptos_hoja k
    left join public.bloques b on b.id = k.bloque_id
   where k.version_hoja_id = p_version and k.incluido
$$;

/** QUE HA CAMBIADO de una version a la anterior generada, sacado de los datos
 *  (Monica, 8-oct-2026: "el 1 siempre por defecto, y el motivo si existe como
 *  añadido"). "Total: de 14.200 € a 13.500 € (−700 €). Quitado: estudio de
 *  seguridad. Cambia: ascensor, de 9.000 € a 8.300 €". Null si no hay nada que
 *  decir. Las versiones antiguas sin conceptos atados solo comparan el total. */
create or replace function public.sali_cambios_version(p_version uuid) returns text
language plpgsql stable as $$
declare
  v      record;
  prev   record;
  partes text[] := '{}';
  t      text;
begin
  select id, hoja_encargo_id, numero_version, importe_base into v
    from public.versiones_hoja where id = p_version;
  select id, importe_base into prev
    from public.versiones_hoja
   where hoja_encargo_id = v.hoja_encargo_id and numero_version < v.numero_version and url_pdf_hoja is not null
   order by numero_version desc limit 1;
  if prev.id is null then
    return null;
  end if;

  if coalesce(prev.importe_base, 0) <> coalesce(v.importe_base, 0) then
    partes := partes || ('Total: de ' || coalesce(public.sali_euros(prev.importe_base), '0 €') ||
                         ' a ' || coalesce(public.sali_euros(v.importe_base), '0 €') ||
                         ' (' || case when coalesce(v.importe_base, 0) > coalesce(prev.importe_base, 0) then '+' else '−' end ||
                         public.sali_euros(abs(coalesce(v.importe_base, 0) - coalesce(prev.importe_base, 0))) || ')');
  end if;

  if exists (select 1 from public.conceptos_hoja where version_hoja_id = prev.id) then
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
  end if;

  return nullif(array_to_string(partes, '. '), '');
end;
$$;

/** De la version 2 en adelante no se genera sin el porque (Monica, 8-oct-2026).
 *  La pantalla ya lo pide; esto es para que no se cuele por otro camino. Las 40
 *  versiones antiguas sin motivo no se tocan: solo salta al generar. */
create or replace function public.exigir_motivo_version()
returns trigger
language plpgsql as $$
begin
  if new.numero_version > 1 and coalesce(btrim(new.motivo_cambio), '') = '' then
    raise exception 'Falta el motivo del cambio de la versión %', new.numero_version;
  end if;
  return new;
end;
$$;

create trigger trg_exigir_motivo_version
  before update of url_pdf_hoja on public.versiones_hoja
  for each row
  when (old.url_pdf_hoja is null and new.url_pdf_hoja is not null)
  execute function public.exigir_motivo_version();

/** Generada = la version recibe su PDF (un borrador no tiene). La primera vez
 *  es cuando la hoja recibe su numero: "creada". Despues, version nueva. */
create or replace function public.nota_sali_hoja_generada()
returns trigger
language plpgsql as $$
declare
  h record;
begin
  select oportunidad_id, numero_hoja, descripcion, pagador_tipo,
         (select nombre from public.contratas c where c.id = pagador_contrata_id) as contrata
    into h
    from public.hojas_encargo where id = new.hoja_encargo_id;

  if new.numero_version = 1 then
    perform public.nota_sali(h.oportunidad_id, new.fecha_generada, 'hoja_creada', jsonb_build_object(
      'codigo',  h.numero_hoja,
      'que',     h.descripcion,
      'total',   public.sali_euros(new.importe_base),
      'pagador', case h.pagador_tipo when 'comunidad' then 'la comunidad'
                                     when 'contrata'  then 'la contrata' || coalesce(' ' || h.contrata, '') end
    ));
  else
    perform public.nota_sali(h.oportunidad_id, new.fecha_generada, 'hoja_nueva_version', jsonb_build_object(
      'codigo',  h.numero_hoja,
      'version', new.numero_version,
      'cambios', public.sali_cambios_version(new.id),
      'motivo',  new.motivo_cambio
    ));
  end if;
  return new;
end;
$$;

create trigger trg_nota_sali_hoja_generada
  after update of url_pdf_hoja on public.versiones_hoja
  for each row
  when (old.url_pdf_hoja is null and new.url_pdf_hoja is not null)
  execute function public.nota_sali_hoja_generada();

create or replace function public.nota_sali_hoja_enviada()
returns trigger
language plpgsql as $$
declare
  h record;
begin
  select oportunidad_id, numero_hoja into h from public.hojas_encargo where id = new.hoja_encargo_id;
  perform public.nota_sali(h.oportunidad_id, new.fecha_enviada, 'hoja_enviada', jsonb_build_object(
    'codigo',  h.numero_hoja,
    'version', case when new.numero_version > 1 then new.numero_version end,
    'fecha',   public.sali_fecha(new.fecha_enviada)
  ));
  return new;
end;
$$;

create trigger trg_nota_sali_hoja_enviada
  after update of fecha_enviada on public.versiones_hoja
  for each row
  when (new.fecha_enviada is not null and new.fecha_enviada is distinct from old.fecha_enviada)
  execute function public.nota_sali_hoja_enviada();

create or replace function public.nota_sali_hoja_firmada()
returns trigger
language plpgsql as $$
begin
  perform public.nota_sali(new.oportunidad_id, new.fecha_firma, 'hoja_firmada', jsonb_build_object(
    'codigo', new.numero_hoja,
    'fecha',  public.sali_fecha(new.fecha_firma),
    'total',  public.sali_euros((select importe_base from public.versiones_hoja where id = new.version_firmada_id))
  ));
  return new;
end;
$$;

create trigger trg_nota_sali_hoja_firmada
  after update of fecha_firma on public.hojas_encargo
  for each row
  when (new.fecha_firma is not null and new.fecha_firma is distinct from old.fecha_firma)
  execute function public.nota_sali_hoja_firmada();
