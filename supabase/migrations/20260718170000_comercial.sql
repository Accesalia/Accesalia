-- =============================================================================
-- ERP Accesalia — Fase COMERCIAL (captacion y venta)
--
-- Captacion y venta: desde que un administrador nos contacta hasta cobrar el 50%
-- de un encargo (el comercial cede el testigo a produccion). Area independiente
-- del proyecto: personas distintas (comercial) y puede desembocar en cualquier
-- servicio, no solo un proyecto. Toda la gestion comercial pertenece a Accesalia
-- aunque lo vendido lo gestione/facture Ecobalance despues.
--
-- Las Fases 1-4 ya existen. Esta migracion las respeta; solo AMPLIA con columnas
-- las tablas administradores (cartera) y hojas_encargo (estado comercial), tal
-- como pide el documento.
--
-- Alcance: SOLO esquema (tablas, columnas, FKs, checks, indices, comentarios),
-- RLS sin politicas, el trigger actualizado_en para las tablas nuevas, y un
-- trigger de bitacora que mantiene administradores.fecha_ultimo_contacto.
--
-- Convenciones: espanol sin tildes/enes; PK uuid; creado_en/actualizado_en;
-- SIN ENUMS (text + CHECK nombrado); indices en FKs y fechas de alerta/espera;
-- RLS habilitado sin politicas.
--
-- -----------------------------------------------------------------------------
-- DECISIONES DE ENCAJE tomadas (el documento las deja abiertas):
--   1. Cartera: se AMPLIA administradores con columnas (no tabla puente).
--   2. ultimo_contacto_en del doc = se REUTILIZA administradores.fecha_ultimo_contacto
--      (Fase 1, mismo proposito). No se crea columna duplicada.
--   3. servicio_reservado: FK a tipos_servicio (un CHECK no puede validar contra
--      las filas de un catalogo; la FK es la forma correcta).
--   4. Estado comercial de la hoja: columnas anadidas a hojas_encargo (1:1).
--   5. acuerdos_comision_excepcion referencia oportunidad_id Y proyecto_id (ambas
--      nullable, CHECK de al menos una). Ver nota sobre proyectos.comision_administrador.
--   6. arquitecto_revisor y tecnico de 3D: FK a tecnicos (Fase 3).
--   7. modelos_escalera: catalogo ligero, referenciado por FK.
--   8. NO se construye procesos_venta_estado_historial (coherente con Fase 3, que
--      solo lleva estado + fecha_estado). Anotado como ampliacion futura.
--   9. NO se toca hojas_encargo.emisor para anadir Ecobalance (es trabajo de la
--      fase de facturacion/RLS). Solo queda como empresa_gestora en el catalogo.
--  10. Oportunidad sin administrador: administrador_id nullable. OJO:
--      comunidades.administrador_id es NOT NULL en nucleo, asi que materializar una
--      comunidad autogestionada requerira revisar eso. NO se construye aqui.
-- =============================================================================


-- =============================================================================
-- 1. comerciales
-- =============================================================================
create table comerciales (
  id                             uuid        primary key default gen_random_uuid(),
  creado_en                      timestamptz not null default now(),
  actualizado_en                 timestamptz not null default now(),
  nombre                         text        not null,
  apellidos                      text,
  email                          text,
  telefono                       text,
  activo                         boolean     not null default true,
  fecha_alta                     date,
  regimen_comision               text        not null default 'comisiona_todo',
  comision_negociada_individual  boolean     not null default true,
  notas_comision                 text,
  notas                          text,
  constraint comerciales_regimen_comision_check
    check (regimen_comision in ('comisiona_todo','solo_proyecto'))
);

comment on table comerciales is 'Ficha del comercial (hermana de administradores/contratas/tecnicos). La definicion del regimen de comision vive aqui; su detalle economico (porcentajes, tramos, liquidacion) se modela en facturacion.';
comment on column comerciales.fecha_alta is 'Desde cuando trabaja como comercial.';
comment on column comerciales.regimen_comision is 'comisiona_todo (hoy: cualquier cosa que facture) | solo_proyecto (objetivo futuro: solo por proyecto de arquitectura). El modelo soporta ambos sin rediseno.';
comment on column comerciales.comision_negociada_individual is 'true = comision negociada individualmente (situacion actual). La intencion es un modelo estandar; esta marca permite distinguirlo.';
comment on column comerciales.notas_comision is 'Texto libre para condiciones concretas mientras no haya estandar.';


-- =============================================================================
-- 5. tipos_servicio (catalogo)  [se crea pronto: lo referencian origen y procesos]
-- =============================================================================
create table tipos_servicio (
  id               uuid        primary key default gen_random_uuid(),
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now(),
  codigo           text        not null unique,
  nombre           text        not null,
  empresa_gestora  text        not null,
  es_arquitectura  boolean     not null,
  constraint tipos_servicio_empresa_gestora_check
    check (empresa_gestora in ('accesalia','ecobalance'))
);

comment on table tipos_servicio is 'Catalogo de servicios contratables (proyecto ascensor/SATE/cubierta/rampa/plataforma, memoria valorada, CSS, direccion de obra, subvencion, CAES, tres presupuestos, ITE...). Referenciado desde el proceso de venta y desde el servicio reservado del origen.';
comment on column tipos_servicio.codigo is 'Codigo estable, ej. proyecto_ascensor, proyecto_sate, css, direccion_obra, subvencion, caes, tres_presupuestos, ite, memoria_valorada, rampa, plataforma.';
comment on column tipos_servicio.empresa_gestora is 'Quien lo gestiona/factura por defecto: accesalia (arquitectura) o ecobalance (subvenciones/CAES/comisiones). Es un DEFAULT, no una atadura: el emisor concreto se decide en la hoja de encargo.';
comment on column tipos_servicio.es_arquitectura is 'Para el regimen de comision solo_proyecto: distingue que comisiona (arquitectura) y que no (servicios no-arquitectonicos).';


-- =============================================================================
-- 9a-bis. modelos_escalera (catalogo ligero)
-- =============================================================================
create table modelos_escalera (
  id               uuid        primary key default gen_random_uuid(),
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now(),
  codigo           text        not null unique,
  nombre           text        not null,
  notas            text
);

comment on table modelos_escalera is 'Catalogo ligero de los ~19-21 modelos de escalera desarrollados para la solucion recorte_escalera. Catalogo abierto; se rellena mas adelante.';


-- =============================================================================
-- 2. Cartera: ampliacion de administradores (nucleo)
-- =============================================================================
alter table administradores
  add column comercial_id             uuid references comerciales (id),
  add column comercial_captador_id    uuid references comerciales (id),
  add column fecha_alta_administrador  date;

comment on column administradores.comercial_id is 'Comercial DUENO de la cartera: toda oportunidad futura de este administrador se deriva a el. (Fase comercial).';
comment on column administradores.comercial_captador_id is 'Comercial que ABRIO este administrador (normalmente el mismo que comercial_id, puede diferir). Con fecha_alta_administrador permite medir apertura de cartera por comercial (dato estrategico).';
comment on column administradores.fecha_alta_administrador is 'Fecha de alta comercial del administrador (apertura de cartera). Distinta de creado_en (alta en el sistema).';
comment on column administradores.fecha_ultimo_contacto is 'Enchufe de IA: ultimo contacto con el administrador ("hace mucho que no hablas con este administrador"). La fase comercial la mantiene por trigger desde interacciones. (Reutiliza la columna de Fase 1; equivale al ultimo_contacto_en del doc comercial).';

create index idx_administradores_comercial_id          on administradores (comercial_id);
create index idx_administradores_comercial_captador_id on administradores (comercial_captador_id);


-- =============================================================================
-- 2-bis. administrador_origen (1:N; normalmente 0 o 1)
-- =============================================================================
create table administrador_origen (
  id                     uuid        primary key default gen_random_uuid(),
  creado_en              timestamptz not null default now(),
  actualizado_en         timestamptz not null default now(),
  administrador_id       uuid        not null references administradores (id),
  tipo_origen            text        not null,
  contrata_id            uuid        references contratas (id),
  servicio_reservado_id  uuid        references tipos_servicio (id),
  notas                  text,
  constraint administrador_origen_tipo_origen_check
    check (tipo_origen in ('administrador_conocido','puerta_fria','web','boca_a_boca','contrata'))
);

comment on table administrador_origen is 'Como llego el administrador. Condiciona que se le puede ofrecer: si lo trajo una contrata (ej. Otis con un ascensor), no se le ofrecen de forma independiente proyectos del MISMO tipo que trajo la contrata, y si esa comunidad necesita ese tipo de obra, el primero a quien se ofrece presupuestarla es a la contrata que lo trajo. La restriccion aplica a nivel de administrador. Permite varios registros por si conviven origenes.';
comment on column administrador_origen.contrata_id is 'Si el origen es una contrata, cual.';
comment on column administrador_origen.servicio_reservado_id is 'Tipo de servicio que queda reservado a esa contrata (ej. proyecto_ascensor). FK a tipos_servicio.';
comment on column administrador_origen.notas is 'Texto libre integro sobre el origen (importantisimo comercialmente: "vino por la cunada del presidente del portal de al lado", etc.).';

create index idx_administrador_origen_administrador_id      on administrador_origen (administrador_id);
create index idx_administrador_origen_contrata_id           on administrador_origen (contrata_id);
create index idx_administrador_origen_servicio_reservado_id on administrador_origen (servicio_reservado_id);


-- =============================================================================
-- 3. acuerdos_comision_administrador (comision que Accesalia paga al administrador)
-- =============================================================================
create table acuerdos_comision_administrador (
  id                  uuid        primary key default gen_random_uuid(),
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  administrador_id    uuid        not null references administradores (id),
  porcentaje_habitual numeric,
  negociado_por       text,
  vigente             boolean     not null default true,
  notas               text
);

comment on table acuerdos_comision_administrador is 'Acuerdo marco de comision que Accesalia paga al administrador por pasarle obras. Nace y se gestiona en la fase comercial (se abona despues, con intencion via Ecobalance). Habitualmente fija por administrador, con muchas excepciones. Aqui queda el ACUERDO, no el pago (la liquidacion se modela en facturacion).';
comment on column acuerdos_comision_administrador.porcentaje_habitual is 'Porcentaje marco para ese administrador (nullable).';
comment on column acuerdos_comision_administrador.negociado_por is 'Quien lo nego (texto libre; normalmente el director Daniel o el comercial).';

create index idx_acuerdos_comision_administrador_administrador_id on acuerdos_comision_administrador (administrador_id);


-- =============================================================================
-- 4. oportunidades (entidad duradera y reactivable) [antes de excepcion, que la referencia]
-- =============================================================================
create table oportunidades (
  id                     uuid        primary key default gen_random_uuid(),
  creado_en              timestamptz not null default now(),
  actualizado_en         timestamptz not null default now(),
  administrador_id       uuid        references administradores (id),
  comunidad_id           uuid        references comunidades (id),
  comunidad_provisional  text,
  comercial_id           uuid        references comerciales (id),
  tipo_origen            text        not null default 'otro',
  oportunidad_origen_id  uuid        references oportunidades (id),
  contrata_origen_id     uuid        references contratas (id),
  origen_notas           text,
  estado                 text        not null default 'activa',
  notas                  text,
  constraint oportunidades_tipo_origen_check
    check (tipo_origen in ('administrador_conocido','puerta_fria','web','boca_a_boca','contrata','otro')),
  constraint oportunidades_estado_check
    check (estado in ('activa','latente'))
);

comment on table oportunidades is 'Entidad duradera y reactivable, corazon de la fase comercial. NO se cierra (o casi nunca): puede generar encargos diferidos en meses/anos y ser origen de otra oportunidad (boca a boca). A lo sumo queda latente.';
comment on column oportunidades.administrador_id is 'Nullable: excepcion rara pero real (comunidad pequena autogestionada sin administrador de fincas).';
comment on column oportunidades.comunidad_id is 'La comunidad real del nucleo si YA existe. Puede ser nueva y no estar dada de alta todavia (usar comunidad_provisional).';
comment on column oportunidades.comunidad_provisional is 'Datos de la comunidad mientras no se materializa como registro del nucleo. Al firmar+cobrar se materializa como comunidad/proyecto (logica de conversion fuera de alcance).';
comment on column oportunidades.comercial_id is 'Heredado del administrador (su comercial dueno), pero almacenado aqui para consulta directa y para el caso sin administrador.';
comment on column oportunidades.oportunidad_origen_id is 'Auto-referencia: cuando esta oportunidad nace de otra (Mayor 35 -> Mayor 37; presidente que deriva a su cunado).';
comment on column oportunidades.estado is 'activa | latente (sin nada abierto ahora, reactivable). No hay estado cerrada/muerta.';

create index idx_oportunidades_administrador_id      on oportunidades (administrador_id);
create index idx_oportunidades_comunidad_id          on oportunidades (comunidad_id);
create index idx_oportunidades_comercial_id          on oportunidades (comercial_id);
create index idx_oportunidades_oportunidad_origen_id on oportunidades (oportunidad_origen_id);
create index idx_oportunidades_contrata_origen_id    on oportunidades (contrata_origen_id);


-- =============================================================================
-- 3-bis. acuerdos_comision_excepcion (excepcion por obra concreta)
-- =============================================================================
create table acuerdos_comision_excepcion (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  acuerdo_id      uuid        not null references acuerdos_comision_administrador (id),
  oportunidad_id  uuid        references oportunidades (id),
  proyecto_id     uuid        references proyectos (id),
  porcentaje      numeric     not null,
  motivo          text,
  constraint acuerdos_comision_excepcion_ambito_check
    check (oportunidad_id is not null or proyecto_id is not null)
);

comment on table acuerdos_comision_excepcion is 'Excepcion puntual al acuerdo marco, para una obra concreta (proyectos grandes -> comision mas alta). Referencia la oportunidad y/o el proyecto al que aplica. NOTA: se solapa con proyectos.comision_administrador (Fase 1), que guarda el valor real por proyecto; reconciliar cual manda cuando ambos existan.';
comment on constraint acuerdos_comision_excepcion_ambito_check on acuerdos_comision_excepcion is 'La excepcion debe apuntar al menos a una oportunidad o a un proyecto.';

create index idx_acuerdos_comision_excepcion_acuerdo_id     on acuerdos_comision_excepcion (acuerdo_id);
create index idx_acuerdos_comision_excepcion_oportunidad_id on acuerdos_comision_excepcion (oportunidad_id);
create index idx_acuerdos_comision_excepcion_proyecto_id    on acuerdos_comision_excepcion (proyecto_id);


-- =============================================================================
-- 6. procesos_venta (pipeline; uno o varios por oportunidad)
-- =============================================================================
create table procesos_venta (
  id                uuid        primary key default gen_random_uuid(),
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),
  oportunidad_id    uuid        not null references oportunidades (id),
  tipo_servicio_id  uuid        not null references tipos_servicio (id),
  comercial_id      uuid        references comerciales (id),
  estado            text        not null default 'registrado',
  estado_desde      timestamptz not null default now(),
  esperando_de      text,
  esperando_desde   timestamptz,
  resultado_final   text,
  motivo_perdido    text,
  notas             text,
  constraint procesos_venta_estado_check
    check (estado in ('registrado','derivado_comercial','visitado_escaneado','en_viabilidad','documentos_emitidos','en_junta','en_seguimiento','ganado_firmado','cobrado_50_cerrado','perdido')),
  constraint procesos_venta_resultado_final_check
    check (resultado_final in ('ganado','perdido'))
);

comment on table procesos_venta is 'Pipeline de venta. De una oportunidad cuelgan uno o varios procesos, diferidos en el tiempo (hoy el proyecto; en 2 anos las CAES; la subvencion de un proyecto ya ejecutado...). Cada proceso se cierra al cobrar el 50% (testigo cedido a produccion). Estados reabribles (mismo patron que las etapas de tramitacion tecnica). Al ganar/cobrar entronca con la hoja de encargo (hojas_encargo.proceso_venta_id).';
comment on column procesos_venta.comercial_id is 'Heredado pero explicito: un proceso = un comercial (casi nunca se traspasa, por la comision).';
comment on column procesos_venta.estado_desde is 'Fecha de entrada al estado actual (gancho de alertas de seguimiento).';
comment on column procesos_venta.esperando_de is 'A la espera de quien (administrador, comunidad, Daniel...). Materia prima de alertas.';
comment on column procesos_venta.esperando_desde is 'Desde cuando se espera (indexado para alertas).';
comment on column procesos_venta.resultado_final is 'Solo al cerrar: ganado | perdido (nullable mientras abierto).';

create index idx_procesos_venta_oportunidad_id   on procesos_venta (oportunidad_id);
create index idx_procesos_venta_tipo_servicio_id on procesos_venta (tipo_servicio_id);
create index idx_procesos_venta_comercial_id     on procesos_venta (comercial_id);
create index idx_procesos_venta_estado_desde     on procesos_venta (estado_desde);
create index idx_procesos_venta_esperando_desde  on procesos_venta (esperando_desde);


-- =============================================================================
-- 7. Estado de tramitacion comercial en hojas_encargo (Fase 2)
-- =============================================================================
alter table hojas_encargo
  add column generada_por            text,
  add column estado_comercial        text,
  add column estado_comercial_desde  timestamptz,
  add column proceso_venta_id        uuid references procesos_venta (id);

alter table hojas_encargo
  add constraint hojas_encargo_generada_por_check
    check (generada_por in ('secretaria_comercial','comercial')),
  add constraint hojas_encargo_estado_comercial_check
    check (estado_comercial in ('generada','pendiente_firma_daniel','firmada','enviada_comunidad','devuelta_firmada_comunidad'));

comment on column hojas_encargo.generada_por is 'Quien genera la hoja: secretaria_comercial (para un comercial) o comercial (para el otro). En ambos casos debe validarla/firmarla Daniel antes de salir.';
comment on column hojas_encargo.estado_comercial is 'Estado de tramitacion comercial PREVIO a salir a la comunidad: generada -> pendiente_firma_daniel -> firmada -> enviada_comunidad -> devuelta_firmada_comunidad. Convive con estado (facturacion).';
comment on column hojas_encargo.estado_comercial_desde is 'Fecha de entrada al estado_comercial. pendiente_firma_daniel + esta fecha = alerta interna "N hojas paradas por Daniel".';
comment on column hojas_encargo.proceso_venta_id is 'Enlace de la venta con la hoja (proceso de venta que la origino).';

create index idx_hojas_encargo_estado_comercial_desde on hojas_encargo (estado_comercial_desde);
create index idx_hojas_encargo_proceso_venta_id       on hojas_encargo (proceso_venta_id);


-- =============================================================================
-- 8. juntas (juntas de vecinos; una o varias por proceso)
-- =============================================================================
create table juntas (
  id                    uuid        primary key default gen_random_uuid(),
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now(),
  proceso_venta_id      uuid        not null references procesos_venta (id),
  fecha_junta           date,
  celebrada             boolean     not null default false,
  resultado             text        not null default 'pendiente',
  resultado_detalle     text,
  requiere_seguimiento  boolean     not null default false,
  seguimiento_desde     timestamptz,
  constraint juntas_resultado_check
    check (resultado in ('pendiente','favorable','desfavorable','aplazada','piden_mas_presupuestos','complicacion'))
);

comment on table juntas is 'Juntas de vecinos de un proceso de venta. Puede complicarse (piden mas presupuestos -> segunda junta; el vecino del bajo no quiere -> demanda). Tras la junta hay un impas que exige seguimiento.';
comment on column juntas.resultado is 'complicacion cubre demanda del bajo, etc.';
comment on column juntas.resultado_detalle is 'Texto libre integro del resultado.';
comment on column juntas.seguimiento_desde is 'Para la alerta "fuimos a junta y no sabemos que paso / hay que llamar".';

create index idx_juntas_proceso_venta_id  on juntas (proceso_venta_id);
create index idx_juntas_fecha_junta        on juntas (fecha_junta);
create index idx_juntas_seguimiento_desde  on juntas (seguimiento_desde);


-- =============================================================================
-- 9a. escaneos_polycam (3D interno de viabilidad + informe)
-- =============================================================================
create table escaneos_polycam (
  id                    uuid        primary key default gen_random_uuid(),
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now(),
  proceso_venta_id      uuid        not null references procesos_venta (id),
  enlace_dropbox        text,
  fecha_escaneo         date,
  arquitecto_revisor_id uuid        references tecnicos (id),
  viabilidad_resultado  text,
  solucion              text,
  modelo_escalera_id    uuid        references modelos_escalera (id),
  informe_texto         text,
  constraint escaneos_polycam_viabilidad_resultado_check
    check (viabilidad_resultado in ('viable','inviable')),
  constraint escaneos_polycam_solucion_check
    check (solucion in ('derribo_escalera','exterior_calle','exterior_patio','recorte_escalera','otra'))
);

comment on table escaneos_polycam is '3D INTERNO de viabilidad. El comercial escanea el portal con Polycam (iPhone) y sube el modelo a Dropbox para que el arquitecto evalue que cabe sin desplazarse. De aqui sale el informe de viabilidad.';
comment on column escaneos_polycam.arquitecto_revisor_id is 'Arquitecto que revisa (FK a tecnicos, Fase 3).';
comment on column escaneos_polycam.viabilidad_resultado is 'viable | inviable.';
comment on column escaneos_polycam.solucion is 'Gran modelo para ascensor: derribo_escalera, exterior_calle, exterior_patio, recorte_escalera, otra.';
comment on column escaneos_polycam.modelo_escalera_id is 'Cuando la solucion es recorte_escalera: cual de los modelos de escalera (FK a modelos_escalera).';
comment on column escaneos_polycam.informe_texto is 'Texto libre integro del informe de viabilidad.';

create index idx_escaneos_polycam_proceso_venta_id      on escaneos_polycam (proceso_venta_id);
create index idx_escaneos_polycam_arquitecto_revisor_id on escaneos_polycam (arquitecto_revisor_id);
create index idx_escaneos_polycam_modelo_escalera_id    on escaneos_polycam (modelo_escalera_id);


-- =============================================================================
-- 9b. modelos_3d_venta (3D externo de venta, SketchUp)
-- =============================================================================
create table modelos_3d_venta (
  id                uuid        primary key default gen_random_uuid(),
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),
  proceso_venta_id  uuid        references procesos_venta (id),
  junta_id          uuid        references juntas (id),
  tipo_3d           text        not null,
  a_medida          boolean,
  tecnico_id        uuid        references tecnicos (id),
  fecha_solicitud   timestamptz,
  fecha_necesaria   date,
  fecha_entrega     timestamptz,
  estado            text        not null default 'pedido',
  constraint modelos_3d_venta_tipo_3d_check
    check (tipo_3d in ('generico_escalera','a_medida','diseno_portal')),
  constraint modelos_3d_venta_estado_check
    check (estado in ('pedido','en_curso','listo','entregado')),
  constraint modelos_3d_venta_ambito_check
    check (proceso_venta_id is not null or junta_id is not null)
);

comment on table modelos_3d_venta is '3D EXTERNO de venta (SketchUp) para que la comunidad visualice como quedara el portal. Supera la barrera de credibilidad. Consume tiempo de tecnico. Se modela con fechas y estado para alertas: a produccion (deadline), al comercial ("tu 3D esta listo") y a la IA (retrasos). Modelarlo permite vigilar abusos de 3D a medida.';
comment on column modelos_3d_venta.tipo_3d is 'generico_escalera (reutiliza el 3D generico del modelo de escalera) | a_medida (~30% de casos, desarrollado ex profeso) | diseno_portal (3D estetico, 2-3 opciones para votar).';
comment on column modelos_3d_venta.a_medida is 'Redundante con tipo_3d pero comodo para consultas de coste; opcional.';
comment on column modelos_3d_venta.fecha_solicitud is 'Cuando lo pidio el comercial.';
comment on column modelos_3d_venta.fecha_necesaria is 'Para cuando (la junta). Indexado para alertas.';
comment on constraint modelos_3d_venta_ambito_check on modelos_3d_venta is 'Debe colgar de un proceso de venta y/o de una junta.';

create index idx_modelos_3d_venta_proceso_venta_id on modelos_3d_venta (proceso_venta_id);
create index idx_modelos_3d_venta_junta_id         on modelos_3d_venta (junta_id);
create index idx_modelos_3d_venta_tecnico_id       on modelos_3d_venta (tecnico_id);
create index idx_modelos_3d_venta_fecha_necesaria  on modelos_3d_venta (fecha_necesaria);
create index idx_modelos_3d_venta_estado           on modelos_3d_venta (estado);


-- =============================================================================
-- 10. interacciones (bitacora de seguimiento; destino de la nota de voz)
-- =============================================================================
create table interacciones (
  id                     uuid        primary key default gen_random_uuid(),
  creado_en              timestamptz not null default now(),
  actualizado_en         timestamptz not null default now(),
  oportunidad_id         uuid        references oportunidades (id),
  comercial_id           uuid        references comerciales (id),
  administrador_id       uuid        references administradores (id),
  transcripcion          text        not null,
  origen                 text        not null,
  fecha_evento           date,
  tipo_evento            text,
  estado_deja            text,
  requiere_humano        boolean     not null default false,
  motivo_requiere_humano text,
  pendiente_vincular     boolean     not null default false,
  constraint interacciones_origen_check
    check (origen in ('nota_voz','manual','mail','llamada','visita')),
  constraint interacciones_tipo_evento_check
    check (tipo_evento in ('resultado_junta','seguimiento','llamada_administrador','envio_documentos','otro'))
);

comment on table interacciones is 'Bitacora/columna vertebral del seguimiento; destino de la nota de voz interpretada por IA. Guarda el texto integro Y los datos extraidos. La transcripcion nunca se pierde aunque no se extraiga nada estructurado.';
comment on column interacciones.oportunidad_id is 'Nullable: si la IA no logro casar la interaccion, queda en bandeja (pendiente_vincular).';
comment on column interacciones.transcripcion is 'Texto libre integro de la nota de voz. NUNCA se pierde.';
comment on column interacciones.fecha_evento is 'Fecha NORMALIZADA del hecho ("ayer" resuelto). Distinta de creado_en (cuando se grabo/registro). Es la que usa la IA para calcular dias.';
comment on column interacciones.estado_deja is 'El estado/espera que deja en el pipeline, si la IA lo infiere (ej. "a la espera de que el presidente decida").';
comment on column interacciones.requiere_humano is 'La IA marca el apunte cuando no puede resolverlo con seguridad. Bandeja de trabajo.';
comment on column interacciones.motivo_requiere_humano is 'Motivo, para que una persona lo aclare sin reescuchar la nota (ej. "3 administradores llamados Adolfo", "fecha imprecisa").';
comment on column interacciones.pendiente_vincular is 'La IA no logro casar la interaccion con una oportunidad/administrador existentes. Bandeja para casar a mano en vez de descartar.';

create index idx_interacciones_oportunidad_id   on interacciones (oportunidad_id);
create index idx_interacciones_administrador_id on interacciones (administrador_id);
create index idx_interacciones_comercial_id     on interacciones (comercial_id);
create index idx_interacciones_fecha_evento     on interacciones (fecha_evento);
-- Indices parciales: las dos bandejas de trabajo.
create index idx_interacciones_requiere_humano    on interacciones (creado_en) where requiere_humano = true;
create index idx_interacciones_pendiente_vincular on interacciones (creado_en) where pendiente_vincular = true;


-- =============================================================================
-- 11. ROW LEVEL SECURITY (habilitado sin politicas; separacion Accesalia/
-- Ecobalance se resolvera en la fase de politicas RLS)
-- =============================================================================
alter table comerciales                     enable row level security;
alter table tipos_servicio                  enable row level security;
alter table modelos_escalera                enable row level security;
alter table administrador_origen            enable row level security;
alter table acuerdos_comision_administrador enable row level security;
alter table oportunidades                   enable row level security;
alter table acuerdos_comision_excepcion     enable row level security;
alter table procesos_venta                  enable row level security;
alter table juntas                          enable row level security;
alter table escaneos_polycam                enable row level security;
alter table modelos_3d_venta                enable row level security;
alter table interacciones                   enable row level security;


-- =============================================================================
-- 12. TRIGGERS
-- =============================================================================

-- 12a. actualizado_en en las tablas nuevas de esta fase (reutiliza la funcion
-- set_actualizado_en() creada en la migracion 20260718160000). NOTA: las tablas
-- ampliadas por ALTER (administradores, hojas_encargo) ya tenian su trigger.
do $$
declare r record;
begin
  for r in
    select unnest(array[
      'comerciales','tipos_servicio','modelos_escalera','administrador_origen',
      'acuerdos_comision_administrador','oportunidades','acuerdos_comision_excepcion',
      'procesos_venta','juntas','escaneos_polycam','modelos_3d_venta','interacciones'
    ]) as t
  loop
    execute format('drop trigger if exists trg_set_actualizado_en on public.%I', r.t);
    execute format('create trigger trg_set_actualizado_en before update on public.%I for each row execute function set_actualizado_en()', r.t);
  end loop;
end $$;

-- 12b. Mantener administradores.fecha_ultimo_contacto desde la bitacora.
-- Al insertar una interaccion, si se conoce el administrador (directo o via la
-- oportunidad) y hay fecha_evento, se avanza fecha_ultimo_contacto (solo si es mas
-- reciente, para no retroceder ante notas antiguas cargadas tarde).
create or replace function actualizar_ultimo_contacto_admin()
returns trigger
language plpgsql
as $$
declare
  adm uuid;
begin
  adm := new.administrador_id;
  if adm is null and new.oportunidad_id is not null then
    select administrador_id into adm from oportunidades where id = new.oportunidad_id;
  end if;
  if adm is not null and new.fecha_evento is not null then
    update administradores
       set fecha_ultimo_contacto = greatest(coalesce(fecha_ultimo_contacto, new.fecha_evento::timestamptz), new.fecha_evento::timestamptz)
     where id = adm;
  end if;
  return null;
end;
$$;

comment on function actualizar_ultimo_contacto_admin() is 'AFTER INSERT en interacciones: avanza administradores.fecha_ultimo_contacto (directo o via oportunidad) usando fecha_evento, solo si es mas reciente.';

create trigger trg_actualizar_ultimo_contacto_admin
  after insert on interacciones
  for each row execute function actualizar_ultimo_contacto_admin();


-- =============================================================================
-- 13. ENGANCHES / FUERA DE ALCANCE (no construir ahora — solo anotados)
--
-- - HISTORIAL DE ESTADOS DEL PIPELINE:
--     tabla procesos_venta_estado_historial (proceso_id, estado, entrada_en,
--     salida_en) para reconstruir "cuanto estuvo en seguimiento". NO construida
--     (coherente con Fase 3, que solo lleva estado + fecha_estado). Ampliacion
--     futura si hace falta trazabilidad completa.
--
-- - COMISION DEL COMERCIAL (ejecucion):
--     porcentajes, tramos, liquidacion. Se DEFINE aqui (comerciales.regimen_comision)
--     pero se CONSTRUYE en facturacion.
--
-- - ECOBALANCE COMO TERCER EMISOR:
--     previsto en facturacion junto a accesalia y daniel_autonomo. NO se toca aqui
--     hojas_encargo.emisor; solo queda empresa_gestora en tipos_servicio.
--
-- - MATERIALIZACION comunidad_provisional -> nucleo:
--     al ganar+cobrar, convertir la comunidad provisional en registro del nucleo
--     (comunidad/proyecto). OJO: comunidades.administrador_id es NOT NULL, asi que
--     una comunidad autogestionada (oportunidad sin administrador) no encaja sin
--     revisar esa restriccion. NO se construye; se confirma con la propietaria.
--
-- - GESTION DE 3 PRESUPUESTOS / LICITACION DE CONTRATAS:
--     modulo propio, fase siguiente (3% del PEM, balance de reparto, capacidad de
--     carga, presupuesto palanca). Facturado por Ecobalance. Aqui solo como
--     tipo_servicio.
--
-- - CAES Y SUBVENCIONES COMO ENCARGOS DIFERIDOS:
--     se referencian como tipos_servicio; su gestion vive en sus propios modulos.
--
-- - SEPARACION DE ACCESO ACCESALIA / ECOBALANCE:
--     se resuelve en la fase final de politicas RLS. Aqui solo el dato de
--     empresa_gestora en el catalogo de servicios.
--
-- - CAPA DE IA (materia prima de alertas; NO se construyen tablas de alerta):
--     nivel administrador: fecha_ultimo_contacto + historial.
--     nivel proceso: estado + estado_desde + esperando_de/esperando_desde.
--     nivel hoja: estado_comercial = pendiente_firma_daniel + estado_comercial_desde.
--     nivel 3D: fecha_necesaria + estado.
--     bandejas: interacciones.requiere_humano y interacciones.pendiente_vincular.
-- =============================================================================
