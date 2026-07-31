-- =============================================================================
-- ERP Accesalia — Observaciones y notas de expediente
--
-- La bitacora del expediente: entradas fechadas que alguien escribe cuando pasa
-- algo resenable. Es lo UNICO irrecuperable de la ficha de Dropbox — los datos
-- duros (catastro, CIF, admin) estan tambien en catastro, Monday o los PDF; las
-- notas solo estan ahi, y se han ido generando poco a poco durante anios.
--
-- UNA SOLA TABLA, no una por fase. Hasta ahora todo iba junto en el apartado
-- NOTAS de la ficha: lo comercial, lo de licencia, lo de obra y lo economico en
-- el mismo hilo. Eso es justo lo que la hace valiosa (el relato continuo), asi
-- que se conserva: la FASE es un atributo, no un cajon separado. Las importadas
-- entran como fase 'historico' — una fase mas que se suma a las demas: si
-- existe se ve, y en los expedientes nuevos simplemente no aparece.
--
-- EJE: la observacion cuelga del PROYECTO (= el encargo: lo que requiere
-- arquitecto y tiene su propio visado, licencia y obra; lo demas son servicios).
-- `comunidad_id` va SIEMPRE relleno para que el expediente 360 muestre el hilo
-- completo aunque no se sepa a que proyecto pertenece una nota antigua.
--
-- FECHA: obligatoria, nunca nula. El 83% de las notas la traen escrita al
-- principio; a las que no, se les reparten DIAS DISTINTOS entre sus vecinas
-- para que al ordenar por fecha vuelvan a su orden original. `orden` guarda la
-- posicion que ocupaban en la ficha y desempata los casos raros (fechas
-- invertidas por error humano: 22 fichas de 333).
--
-- Convenciones: espanol sin tildes/enes; CHECK con nombre (nunca enum); RLS sin
-- politicas; trigger set_actualizado_en.
-- =============================================================================

create table observaciones_expediente (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),

  comunidad_id    uuid        not null references comunidades(id) on delete cascade,
  proyecto_id     uuid        references proyectos(id) on delete set null,

  fase            text        not null default 'historico',
  fecha           date        not null,
  fecha_estimada  boolean     not null default false,
  orden           integer     not null default 0,

  texto           text        not null,
  autor           text,
  origen          text        not null default 'app',
  ficha_ref       text,

  constraint observaciones_expediente_fase_check
    check (fase in ('historico', 'comercial', 'proyecto', 'visado', 'licencia',
                    'obra', 'facturacion', 'subvencion', 'general')),
  constraint observaciones_expediente_origen_check
    check (origen in ('app', 'ficha_dropbox', 'sali', 'monday')),
  constraint observaciones_expediente_texto_check
    check (btrim(texto) <> '')
);

comment on table observaciones_expediente is 'Bitacora del expediente: observaciones fechadas, transversales a las fases. Una sola tabla; la fase es un atributo. Las importadas de la ficha de Dropbox llevan fase=historico.';
comment on column observaciones_expediente.proyecto_id is 'El ENCARGO al que pertenece (lo que requiere arquitecto y tiene visado/licencia/obra propios). NULL en las historicas cuya actuacion no se puede resolver.';
comment on column observaciones_expediente.comunidad_id is 'Siempre relleno: el expediente 360 muestra el hilo completo del edificio aunque no se sepa el proyecto.';
comment on column observaciones_expediente.fase is 'historico = venia del apartado NOTAS de la ficha, donde todo iba junto. El resto son las fases del expediente, para las notas que se escriban ya en la app.';
comment on column observaciones_expediente.fecha is 'Nunca nula. Si la nota no la traia escrita se le asigna un dia distinto entre sus vecinas, para que ordenar por fecha devuelva el orden original.';
comment on column observaciones_expediente.fecha_estimada is 'true = la fecha la pusimos nosotros, no venia en la nota.';
comment on column observaciones_expediente.orden is 'Posicion original dentro del apartado NOTAS de la ficha. Red de seguridad: desempata cuando dos notas acaban el mismo dia.';
comment on column observaciones_expediente.texto is 'El texto TAL CUAL, incluida la fecha que llevara al principio. No se recorta: el crudo no se destruye.';

create index observaciones_expediente_comunidad_idx on observaciones_expediente (comunidad_id, fecha, orden);
create index observaciones_expediente_proyecto_idx  on observaciones_expediente (proyecto_id);
create index observaciones_expediente_fase_idx      on observaciones_expediente (fase);

alter table observaciones_expediente enable row level security;

drop trigger if exists trg_set_actualizado_en on public.observaciones_expediente;
create trigger trg_set_actualizado_en
  before update on public.observaciones_expediente
  for each row execute function set_actualizado_en();
