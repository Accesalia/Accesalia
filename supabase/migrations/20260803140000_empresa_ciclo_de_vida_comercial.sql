-- =============================================================================
-- El ciclo de vida comercial de una administracion vuelve a empresa
--
-- Al retirar administraciones_fincas se perdieron sus columnas de CRM. Propuse
-- descartar las que estaban vacias y Monica lo corrigio: que un campo este
-- vacio no lo hace irrelevante, solo significa que hasta ahora no habia donde
-- guardarlo. La app se disena para el trabajo de manana, no para retratar el de
-- ayer, asi que el hueco se conserva.
--
-- Que vuelve y para que:
--
--   municipio               donde esta el DESPACHO del administrador. Ojo: no es
--                           el municipio de sus comunidades. Muchisimos llevan
--                           fincas en municipios distintos al suyo, asi que no
--                           se puede deducir de comunidades. Sale del respaldo.
--   estado                  contacto -> cliente -> olvidado/descontento/baneado.
--                           Se deja VACIO: lo que habia eran placeholders sin
--                           revisar. Se ira poniendo con criterio.
--   fecha_paso_a_cliente    cuando dejo de ser contacto y encargo algo.
--   motivo_fin / fecha_fin  por que y cuando se acabo la relacion.
--   comercial_captador_id   quien la trajo, que no siempre es quien la lleva
--                           (comercial_id). El par captador/responsable es el
--                           mismo que ya existe en los proyectos.
--   fecha_alta_cartera      cuando entro en la cartera.
--   fecha_ultimo_contacto   para detectar las que se estan enfriando.
--   fecha_ultimo_encargo    para distinguir cliente vivo de cliente dormido.
--
-- Lo que NO vuelve, y por que:
--   email      vive en correo, con empresa_id. Una casa puede tener varios.
--   titular_id el titular es el cargo de su puesto, que es su sitio natural.
-- =============================================================================

alter table empresa
  add column if not exists municipio             text,
  add column if not exists estado                text,
  add column if not exists fecha_paso_a_cliente  date,
  add column if not exists motivo_fin            text,
  add column if not exists fecha_fin             date,
  add column if not exists comercial_captador_id uuid references comerciales(id),
  add column if not exists fecha_alta_cartera    date,
  add column if not exists fecha_ultimo_contacto date,
  add column if not exists fecha_ultimo_encargo  date;

-- vocabulario fijo y corto: CHECK con nombre, no catalogo y nunca enum
alter table empresa drop constraint if exists empresa_estado_check;
alter table empresa add constraint empresa_estado_check
  check (estado is null or estado in ('contacto', 'cliente_activo', 'cliente_olvidado',
                                      'cliente_descontento', 'cliente_baneado'));

-- una relacion terminada necesita motivo; y no se acaba antes de empezar
alter table empresa drop constraint if exists empresa_fin_coherente_check;
alter table empresa add constraint empresa_fin_coherente_check
  check (fecha_fin is null or motivo_fin is not null);

alter table empresa drop constraint if exists empresa_fechas_check;
alter table empresa add constraint empresa_fechas_check
  check (fecha_fin is null or fecha_alta_cartera is null or fecha_fin >= fecha_alta_cartera);

comment on column empresa.municipio is 'Municipio del DESPACHO del administrador, no de sus comunidades: muchos llevan fincas fuera de su municipio.';
comment on column empresa.estado is 'Donde esta la relacion comercial con esta casa. Vacio = todavia no se ha decidido.';
comment on column empresa.comercial_captador_id is 'Quien la trajo. Puede no ser quien la lleva hoy, que es comercial_id.';
comment on column empresa.fecha_ultimo_contacto is 'Ultima vez que se hablo con ellos. Sirve para ver que casas se estan enfriando.';
comment on column empresa.fecha_ultimo_encargo is 'Ultimo encargo firmado. Distingue el cliente vivo del dormido.';

create index if not exists empresa_estado_idx on empresa (estado) where estado is not null;
create index if not exists empresa_municipio_idx on empresa (municipio) where municipio is not null;
create index if not exists empresa_comercial_captador_idx on empresa (comercial_captador_id) where comercial_captador_id is not null;
