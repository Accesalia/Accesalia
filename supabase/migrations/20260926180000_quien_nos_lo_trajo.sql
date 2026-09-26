-- QUIEN NOS LO TRAJO (Monica, 26-sep-2026).
--
-- Su regla, que decide cualquier caso en dos segundos: el QUIEN es siempre una
-- persona a la que puedo llamar por telefono. Todo lo demas es el COMO.
--
-- Y la agenda ya existe: `persona` + `puesto`. Antonio Cuartero es una persona
-- con un puesto de tecnico municipal en el Ayuntamiento de Leganes; Jose Luis es
-- una persona con un puesto en UCI; Vanesa, la hija del presi, es una persona
-- sin puesto, que ya se permite. No hacen falta tablas nuevas.
--
-- Por eso el quien apunta a la PERSONA, no a su cargo: si cambia de trabajo,
-- sigue siendo quien fue. Los otros tres apuntadores existen por normas suyas:
-- las contratas son un mundo aparte, los vecinos cuelgan de una comunidad con
-- su rol, y los comerciales son de casa.

-- Sin esto, el Ayuntamiento de Leganes apareceria en la lista de
-- administraciones de fincas: `empresa` es hoy, de hecho, esa lista.
alter table empresa add column if not exists tipo text not null default 'administracion_fincas';
alter table empresa drop constraint if exists empresa_tipo_check;
alter table empresa add constraint empresa_tipo_check
  check (tipo in ('administracion_fincas','ayuntamiento','ecu','coam','banco','otra'));
comment on column empresa.tipo is 'Que clase de sitio es. Las listas de administraciones filtran por administracion_fincas.';

alter table administracion_origen add column if not exists canal_id uuid references canal_captacion(id);
alter table administracion_origen add column if not exists quien_persona_id uuid references persona(id);
alter table administracion_origen add column if not exists quien_contrata_contacto_id uuid references contrata_contactos(id);
alter table administracion_origen add column if not exists quien_persona_comunidad_id uuid references personas_comunidad(id);

do $$ begin
  if exists (select 1 from information_schema.columns
             where table_name='administracion_origen' and column_name='comercial_id') then
    alter table administracion_origen rename column comercial_id to quien_comercial_id;
  end if;
end $$;

-- Fuera: la contrata como EMPRESA (el quien es la persona), el cargo en vez de
-- la persona, el texto libre, y la lista cerrada.
alter table administracion_origen drop column if exists contrata_id;
alter table administracion_origen drop column if exists puesto_id;
alter table administracion_origen drop column if exists referente_externo;
alter table administracion_origen drop column if exists tipo_origen;

alter table administracion_origen drop constraint if exists administracion_origen_un_solo_quien_check;
alter table administracion_origen add constraint administracion_origen_un_solo_quien_check check (
  (quien_persona_id is not null)::int
  + (quien_comercial_id is not null)::int
  + (quien_contrata_contacto_id is not null)::int
  + (quien_persona_comunidad_id is not null)::int <= 1
);

-- En la oportunidad, `puesto_id` y `persona_comunidad_id` ya estaban ocupados:
-- son QUIEN NOS LLAMA, el contacto de la ficha. Otra pregunta que se parece
-- mucho. De ahi el prefijo quien_.
alter table oportunidades add column if not exists quien_persona_id uuid references persona(id);
alter table oportunidades add column if not exists quien_comercial_id uuid references comerciales(id);
alter table oportunidades add column if not exists quien_contrata_contacto_id uuid references contrata_contactos(id);
alter table oportunidades add column if not exists quien_persona_comunidad_id uuid references personas_comunidad(id);

alter table oportunidades drop column if exists contrata_origen_id;
alter table oportunidades drop column if exists tipo_origen;

comment on column oportunidades.oportunidad_origen_id is 'Cual era la otra obra, cuando el canal es "otra obra". No es un quien.';

alter table oportunidades drop constraint if exists oportunidad_un_solo_quien_check;
alter table oportunidades add constraint oportunidad_un_solo_quien_check check (
  (quien_persona_id is not null)::int
  + (quien_comercial_id is not null)::int
  + (quien_contrata_contacto_id is not null)::int
  + (quien_persona_comunidad_id is not null)::int <= 1
);

-- "ESTE NOS VINO POR FAIN, NO LE OFREZCAS ASCENSORES": el dueno de la cartera
-- que no se pisa es una EMPRESA (FAIN, Schindler), no una persona.
alter table administracion_origen add column if not exists dueno_contrata_id uuid references contratas(id);
comment on column administracion_origen.dueno_contrata_id is 'De quien es el cliente que no hay que pisar. Empresa, no persona.';
