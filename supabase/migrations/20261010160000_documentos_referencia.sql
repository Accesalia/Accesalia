-- =============================================================================
-- DOCUMENTOS DE REFERENCIA (Monica, 10-oct-2026)
--
-- El material de la empresa que se consulta desde "Documentacion de
-- referencia": hoy el de MARKETING (dossier en español e ingles, triptico,
-- dossier SATE, las presentaciones "Tu subvencion, de principio a fin").
--
-- NO va en `documentos`: esa es la del EXPEDIENTE (cada documento cuelga de una
-- comunidad, opp o proyecto, con tipo, caducidad, firma y versiones). Esto es
-- de la empresa, de nadie en concreto. Eligio ella: tabla propia.
--
-- Crecedera: una seccion nueva de documentos = un valor mas en el CHECK y su
-- pagina; la tabla es la misma.
--
-- Los ficheros, en el almacen PRIVADO `referencia`: se ven con enlaces firmados
-- que caducan (cuando haya tarifas, no deben andar sueltos por internet).
-- =============================================================================

create table documentos_referencia (
  id                  uuid primary key default gen_random_uuid(),
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  seccion             text not null,
  titulo              text not null,
  descripcion         text,
  fichero             text not null,
  nombre_fichero      text not null,
  tipo_mime           text,
  tamano              bigint,
  orden               integer,
  activo              boolean not null default true,
  subido_por          text,
  subido_por_id       uuid references equipo(id) on delete set null,
  origen_ruta_dropbox text,
  constraint documentos_referencia_seccion_check check (seccion in ('marketing')),
  constraint documentos_referencia_titulo_check check (btrim(titulo) <> '')
);

comment on table documentos_referencia is 'Material de la empresa para consultar desde Documentacion de referencia (marketing...). No es del expediente: eso va en documentos.';
comment on column documentos_referencia.seccion is 'A que acceso de Documentacion de referencia pertenece. Hoy: marketing.';
comment on column documentos_referencia.fichero is 'Ruta en el almacen privado referencia: <seccion>/<nombre>.';
comment on column documentos_referencia.subido_por is 'Quien lo subio. Los primeros: "Volcado de Dropbox".';

create trigger trg_set_actualizado_en before update on documentos_referencia
  for each row execute function set_actualizado_en();

alter table documentos_referencia enable row level security;

insert into storage.buckets (id, name, public) values ('referencia', 'referencia', false)
  on conflict (id) do nothing;
