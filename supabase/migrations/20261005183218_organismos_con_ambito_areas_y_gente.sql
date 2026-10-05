-- YA APLICADA el 5-oct-2026 (desde otra sesion, version 20261005183218). NO volver a ejecutar.
--
-- =====================================================================
-- LOS ORGANISMOS, CON SU AMBITO, SUS AREAS Y SU GENTE
-- Monica, 5-oct-2026. Salio leyendo Ajalvir: "Almudena Cabello, tecnico del
-- ayto" no tenia donde ir (ni Antonio Ropero, de Fuenlabrada). "Tenemos que
-- aprovechar la barrida. Mismo criterio: la persona a la agenda, lo del puesto
-- a la tabla de organismos".
--
-- EL AMBITO. Cada organismo es soberano en lo suyo ("cada ayuntamiento es
-- soberano en su ambito de actuacion, no depende de terceros": no hay padre).
-- Lo que dice su territorio es el ambito:
--   municipal  -> municipio_id        (ayuntamiento, junta de distrito)
--   autonomico -> comunidad_autonoma  (Comunidad de Madrid y sus subvenciones,
--                                      los colegios oficiales)
--   estatal    -> ninguno             (ADIF, ministerio; "cuando las subvenciones
--                                      lo tienen")
-- No se apuntan los 179 municipios en un organismo de la Comunidad de Madrid:
-- cada municipio sabe de que comunidad autonoma es (municipios_catastro gana
-- comunidad_autonoma), y de ahi se saca que le aplica.
--
-- LAS AREAS: "casi todos los organismos tipo junta, ayto, tienen areas:
-- urbanismo, tributos, etc. (equivalente a departamentos en empresas). Yo los
-- dejaria indicados, porque es relevante".
--
-- LA GENTE: persona de la agenda + puesto en el organismo (y en su area, si se
-- sabe), con su telefono y su correo en el puesto, y desde/hasta: los tecnicos
-- cambian, y saber quien estaba es lo que vale para las manias.
-- =====================================================================

-- 1 · las comunidades autonomas, escritas siempre igual. Catalogo pequeño y
--     vivo: se añade una cuando se trabaje alli.
create table public.comunidades_autonomas (
  nombre    text primary key,
  creado_en timestamptz not null default now()
);
insert into public.comunidades_autonomas (nombre) values
  ('COMUNIDAD DE MADRID'), ('CASTILLA-LA MANCHA'), ('CASTILLA Y LEÓN'), ('COMUNITAT VALENCIANA');

-- 2 · el puente: cada municipio sabe de que comunidad autonoma es
alter table public.municipios_catastro
  add column comunidad_autonoma text references public.comunidades_autonomas(nombre);
update public.municipios_catastro set comunidad_autonoma = case provincia
    when 'MADRID'      then 'COMUNIDAD DE MADRID'
    when 'TOLEDO'      then 'CASTILLA-LA MANCHA'
    when 'GUADALAJARA' then 'CASTILLA-LA MANCHA'
    when 'AVILA'       then 'CASTILLA Y LEÓN'
    when 'VALENCIA'    then 'COMUNITAT VALENCIANA'
  end;

-- 3 · el organismo: que es, de que ambito, y donde esta
alter table public.organismos
  add column tipo               text not null,
  add column ambito             text not null,
  add column municipio_id       uuid references public.municipios_catastro(id),
  add column comunidad_autonoma text references public.comunidades_autonomas(nombre),
  add column direccion          text,
  add column telefono           text,
  add column sede_electronica   text,
  add constraint organismos_tipo_check check (tipo in (
    'ayuntamiento', 'junta_distrito', 'comunidad_autonoma', 'colegio_oficial',
    'ecu', 'organismo_estatal', 'suministradora', 'otro')),
  add constraint organismos_ambito_check check (ambito in ('municipal', 'autonomico', 'estatal')),
  add constraint organismos_territorio_segun_ambito check (
       (ambito = 'municipal'  and municipio_id is not null and comunidad_autonoma is null)
    or (ambito = 'autonomico' and municipio_id is null and comunidad_autonoma is not null)
    or (ambito = 'estatal'    and municipio_id is null and comunidad_autonoma is null));
comment on column public.organismos.ambito is
  'municipal -> municipio_id; autonomico -> comunidad_autonoma; estatal -> ninguno. Cada organismo es soberano en lo suyo: no hay padre.';

-- 4 · las areas de cada organismo (urbanismo, tributos, licencias, patrimonio...)
create table public.organismo_areas (
  id             uuid        primary key default gen_random_uuid(),
  organismo_id   uuid        not null references public.organismos(id),
  nombre         text        not null,
  telefono       text,
  notas          text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint organismo_areas_unica unique (organismo_id, nombre)
);
create trigger trg_set_actualizado_en before update on public.organismo_areas
  for each row execute function public.set_actualizado_en();
comment on table public.organismo_areas is
  'Las areas de un organismo (urbanismo, tributos, licencias...): el equivalente a los departamentos de una empresa.';

-- 5 · el puesto puede estar en un organismo (y en su area)
alter table public.puesto
  add column organismo_id      uuid references public.organismos(id),
  add column organismo_area_id uuid references public.organismo_areas(id),
  add constraint puesto_organismo_en_un_solo_sitio check (
    organismo_id is null or (empresa_id is null and departamento_id is null and contrata_id is null and figura_legal_propietaria_id is null)),
  add constraint puesto_area_con_su_organismo check (organismo_area_id is null or organismo_id is not null);
create index puesto_por_organismo on public.puesto (organismo_id) where organismo_id is not null;

-- 6 · el correo puede ser de un organismo o de un area (urbanismo@ayto...)
alter table public.correo
  add column organismo_id      uuid references public.organismos(id),
  add column organismo_area_id uuid references public.organismo_areas(id);
alter table public.correo drop constraint correo_un_solo_dueno_check;
alter table public.correo add constraint correo_un_solo_dueno_check check (
    (puesto_id is not null)::int + (departamento_id is not null)::int + (empresa_id is not null)::int
  + (persona_id is not null)::int + (empresa_propietaria_id is not null)::int
  + (organismo_id is not null)::int + (organismo_area_id is not null)::int = 1);

-- 7 · los que se conocen ya, sin esperar a que salgan en las fichas
insert into public.organismos (nombre, tipo, ambito, comunidad_autonoma, activa) values
  ('Comunidad de Madrid', 'comunidad_autonoma', 'autonomico', 'COMUNIDAD DE MADRID', true),
  ('COAM · Colegio Oficial de Arquitectos de Madrid', 'colegio_oficial', 'autonomico', 'COMUNIDAD DE MADRID', true),
  ('COACM · Colegio Oficial de Arquitectos de Castilla-La Mancha', 'colegio_oficial', 'autonomico', 'CASTILLA-LA MANCHA', true),
  ('COACYLE · Colegio Oficial de Arquitectos de Castilla y León Este', 'colegio_oficial', 'autonomico', 'CASTILLA Y LEÓN', true),
  ('COACV · Colegio Oficial de Arquitectos de la Comunitat Valenciana', 'colegio_oficial', 'autonomico', 'COMUNITAT VALENCIANA', true);
insert into public.organismos (nombre, tipo, ambito, activa) values
  ('ADIF · Administrador de Infraestructuras Ferroviarias', 'organismo_estatal', 'estatal', true);
