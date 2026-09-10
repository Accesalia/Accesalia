-- =============================================================================
-- RECUPERAR LAS TABLAS QUE SE BORRARON FUERA DE MIGRACION
--
-- Auditoria de septiembre: siete tablas que SI se crearon (sus sentencias estan
-- en supabase_migrations.schema_migrations, y en la base siguen vivos los restos
-- de esas mismas migraciones: obras.cadencia_dias, el bucket 'actas') ya no
-- existen. Ninguna migracion las borra: se borraron a mano, con toda
-- probabilidad en una limpieza de tablas vacias.
--
-- Sin ellas se caen cinco pantallas: /obra, comunidades/[id]/obra,
-- comunidades/[id]/comercial, expediente/[id] y administraciones/[id].
--
-- NO se recrean tal cual estaban en julio: se recrean en el MODELO DE HOY.
--   - visitas_obra.autor_tecnico_id  -> equipo (no tecnicos)
--   - resumenes_ia.administrador_id  -> puesto_id (modelo empresa/persona/puesto)
--   - administracion_origen.administracion_id -> empresa_id
--   - administracion_origen.admin_referente_id NO vuelve: la migracion de agosto
--     lo retiro sin sustituto y nadie lo consulta.
--
-- Las otras tablas que faltan (facturas, cobros, hitos_facturacion, el bloque
-- CAES, las de subvenciones de fase 1...) NO se recrean: su modelo se rehizo a
-- proposito. Se documentan como retiradas en su propia migracion.
--
-- Idempotente (if not exists): al llevarla a produccion no pisa lo que ya haya.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. fases_obra_catalogo  (catalogo vacio a proposito: las cadencias no se
--    inventan). Vuelve porque visitas_obra.fase_obra_id la referencia.
-- -----------------------------------------------------------------------------
create table if not exists fases_obra_catalogo (
  id                       uuid        primary key default gen_random_uuid(),
  creado_en                timestamptz not null default now(),
  actualizado_en           timestamptz not null default now(),
  tipo_actuacion           text        not null,
  nombre_fase              text        not null,
  orden                    integer     not null,
  criticidad               text        not null,
  dias_desde_inicio_aprox  integer,
  notas                    text,
  constraint fases_obra_catalogo_tipo_actuacion_check
    check (tipo_actuacion in ('ascensor','rampa','sate_completo','sate_fachada','sate_cubierta','mixto','otra')),
  constraint fases_obra_catalogo_criticidad_check
    check (criticidad in ('alta','media','baja'))
);

comment on table fases_obra_catalogo is 'Catalogo de las fases tipicas de cada tipo de obra, con cadencia y criticidad. Alimenta el futuro calculo del calendario optimo de visitas. Se crea la estructura; las fases concretas se rellenan con el criterio de quien hace las visitas. No se inventan las cadencias.';


-- -----------------------------------------------------------------------------
-- 2. visitas_obra  (fase 1 + la reforma de actas_visita, ya fusionadas)
--    Cada visita de la direccion facultativa genera un acta. El conjunto de
--    actas sustituye legalmente al libro de ordenes: se conserva el texto integro.
-- -----------------------------------------------------------------------------
create table if not exists visitas_obra (
  id                uuid        primary key default gen_random_uuid(),
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),
  obra_id           uuid        not null references obras (id),
  numero            integer,
  fecha_visita      date        not null,
  autor_tecnico_id  uuid,
  fase_obra_id      uuid        references fases_obra_catalogo (id),
  texto_acta        text,                                  -- nulo = borrador
  url_pdf_acta      text,
  url_fotos         text,
  enviada           boolean     not null default false,
  fecha_enviada     date,
  constraint visitas_obra_autor_equipo_fkey
    foreign key (autor_tecnico_id) references equipo (id)
);

comment on table visitas_obra is 'Cada visita de la direccion facultativa. Genera un acta. El conjunto de actas sustituye legalmente al libro de ordenes: registro de todo lo ordenado a la constructora y aceptado por ella. Se conserva el texto integro.';
comment on column visitas_obra.numero is 'Numero de acta (1, 2, 3...).';
comment on column visitas_obra.autor_tecnico_id is 'Tecnico (equipo) que hace la visita / la DF. Repuntado de tecnicos a equipo.';
comment on column visitas_obra.fase_obra_id is 'En que fase estaba la obra en esa visita (fases_obra_catalogo).';
comment on column visitas_obra.texto_acta is 'Relato en prosa completo de la visita, conservado integro. Nulo mientras es borrador.';
comment on column visitas_obra.enviada is 'Si el acta ya se envio a los implicados. El chivato: acta sin enviar pasado el dia siguiente.';

create index if not exists idx_visitas_obra_obra_id          on visitas_obra (obra_id);
create index if not exists idx_visitas_obra_autor_tecnico_id on visitas_obra (autor_tecnico_id);
create index if not exists idx_visitas_obra_fase_obra_id     on visitas_obra (fase_obra_id);
create index if not exists idx_visitas_obra_fecha_visita     on visitas_obra (fecha_visita);


-- -----------------------------------------------------------------------------
-- 3. fotos_acta  (bucket 'actas', que si sobrevivio)
-- -----------------------------------------------------------------------------
create table if not exists fotos_acta (
  id           uuid        primary key default gen_random_uuid(),
  creado_en    timestamptz not null default now(),
  visita_id    uuid        not null references visitas_obra (id) on delete cascade,
  storage_path text        not null,
  orden        integer     not null default 0,
  pie          text
);

comment on table fotos_acta is 'Fotos de una visita de obra (bucket actas). Se muestran en la galeria del acta generada.';

create index if not exists idx_fotos_acta_visita on fotos_acta (visita_id);


-- -----------------------------------------------------------------------------
-- 4. destinatarios_informe  (a quien se informa de las visitas)
-- -----------------------------------------------------------------------------
create table if not exists destinatarios_informe (
  id             uuid        primary key default gen_random_uuid(),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  comunidad_id   uuid        not null references comunidades (id) on delete cascade,
  tipo           text        not null default 'otro',
  nombre         text,
  email          text        not null,
  activo         boolean     not null default true,
  constraint destinatarios_informe_tipo_check
    check (tipo in ('contrata', 'administrador', 'presidente', 'otro'))
);

comment on table destinatarios_informe is 'A quien se informa de las visitas de una comunidad (contrata, administrador, presidente, otros). Alimenta el envio del acta.';

create index if not exists idx_destinatarios_informe_comunidad on destinatarios_informe (comunidad_id);


-- -----------------------------------------------------------------------------
-- 5. resumenes_ia  (los resumenes vivos de Sali, por ambito)
--    Ambito comunidad o administrador-PERSONA. En el modelo de hoy la persona
--    a la que se visita es un puesto (persona en una empresa), no la vieja
--    tabla administradores.
-- -----------------------------------------------------------------------------
create table if not exists resumenes_ia (
  id             uuid        primary key default gen_random_uuid(),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  ambito         text        not null default 'comunidad',
  comunidad_id   uuid        references comunidades (id) on delete cascade,
  puesto_id      uuid        references puesto (id)      on delete cascade,
  fase           text        not null check (fase in (
    'comercial', 'proyecto', 'visado', 'licencia', 'obra', 'facturacion', 'subvenciones', 'global'
  )),
  texto          text        not null default '',
  datos_estables jsonb,
  generado_por   text        not null default 'ia',
  constraint resumenes_ia_ambito_ck check (
    (ambito = 'comunidad'     and comunidad_id is not null and puesto_id     is null) or
    (ambito = 'administrador' and puesto_id    is not null and comunidad_id  is null)
  ),
  unique (comunidad_id, fase)
);

comment on table resumenes_ia is 'Resumen IA por fase y por ambito (modelo Ordelia). Contexto para la IA + "ponerse al dia" para el humano. texto=lo que evoluciona; datos_estables=lo historico/estable. Se reescribe en cada iteracion.';
comment on column resumenes_ia.ambito is 'comunidad | administrador (persona en su puesto). Define cual de las dos FKs esta puesta.';
comment on column resumenes_ia.puesto_id is 'Ambito administrador: la PERSONA a la que se visita, en su puesto (no la firma fiscal). Resumen vivo de la relacion comercial con ella. Sustituye al viejo administrador_id.';

create index if not exists idx_resumenes_ia_comunidad on resumenes_ia (comunidad_id);
create unique index if not exists uq_resumenes_ia_puesto
  on resumenes_ia (puesto_id, fase) where puesto_id is not null;


-- -----------------------------------------------------------------------------
-- 6. interaccion_comunidad  (puente N:M: punteros, NO copias del texto crudo)
-- -----------------------------------------------------------------------------
create table if not exists interaccion_comunidad (
  interaccion_id uuid        not null references interacciones (id) on delete cascade,
  comunidad_id   uuid        not null references comunidades (id)   on delete cascade,
  creado_en      timestamptz not null default now(),
  origen         text        not null default 'ia' check (origen in ('ia', 'humano')),
  primary key (interaccion_id, comunidad_id)
);

comment on table interaccion_comunidad is 'Puente N:M interaccion<->comunidad (solo punteros). Permite que el expediente de una comunidad muestre las interacciones que la mencionan SIN duplicar el texto crudo, que vive una sola vez en interacciones.';

create index if not exists idx_interaccion_comunidad_comunidad on interaccion_comunidad (comunidad_id);


-- -----------------------------------------------------------------------------
-- 7. condicionantes_comunidad  (el brief tecnico de la comunidad)
-- -----------------------------------------------------------------------------
create table if not exists condicionantes_comunidad (
  id             uuid        primary key default gen_random_uuid(),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  comunidad_id   uuid        not null references comunidades (id)  on delete cascade,
  interaccion_id uuid        references interacciones (id)         on delete set null,
  texto          text        not null,
  categoria      text,
  origen         text        not null default 'ia' check (origen in ('ia', 'humano'))
);

comment on table condicionantes_comunidad is 'Brief tecnico de la comunidad: deseos y condicionantes que la comunidad expresa (via captura comercial). Reutilizable entre proyectos; lo lee el tecnico redactor. Distinto de los requerimientos de licencia.';
comment on column condicionantes_comunidad.categoria is 'Pista libre no controlada (deseo | condicionante | consecuencia). Descriptiva, no enruta logica.';

create index if not exists idx_condicionantes_comunidad on condicionantes_comunidad (comunidad_id);


-- -----------------------------------------------------------------------------
-- 8. administracion_origen  (como llego la administracion: canal + cartera)
--    Ya al modelo nuevo: cuelga de empresa, no de administraciones_fincas.
-- -----------------------------------------------------------------------------
create table if not exists administracion_origen (
  id                     uuid        primary key default gen_random_uuid(),
  creado_en              timestamptz not null default now(),
  actualizado_en         timestamptz not null default now(),
  empresa_id             uuid        references empresa (id),
  tipo_origen            text        not null,
  comercial_id           uuid        references comerciales (id),
  contrata_id            uuid        references contratas (id),
  referente_externo      text,
  condiciona_oferta      boolean     not null default false,
  servicio_reservado_id  uuid        references tipos_servicio (id),
  notas                  text,
  constraint administracion_origen_tipo_origen_check
    check (tipo_origen in ('puerta_fria','web','boca_a_boca','contrata','comercial_interno','otro_admin','otro'))
);

comment on table administracion_origen is 'Como llego la administracion (canal). DOBLE funcion: (1) analisis de eficiencia de canal (tipo_origen sistematizado, para GROUP BY sin depender del LLM); (2) RESPETO DE CARTERA: quien la trae la considera suya, condicionando precio y que tipo de proyecto se le puede ofrecer. Varios registros posibles si conviven origenes.';
comment on column administracion_origen.empresa_id is 'La administracion de fincas, ya en el modelo empresa/persona/puesto.';
comment on column administracion_origen.condiciona_oferta is 'true = el origen restringe que se le puede ofrecer o a que precio (respeto de cartera).';
comment on column administracion_origen.notas is 'Texto libre integro del origen (importantisimo comercialmente).';

create index if not exists idx_administracion_origen_empresa_id            on administracion_origen (empresa_id);
create index if not exists idx_administracion_origen_comercial_id          on administracion_origen (comercial_id);
create index if not exists idx_administracion_origen_contrata_id           on administracion_origen (contrata_id);
create index if not exists idx_administracion_origen_servicio_reservado_id on administracion_origen (servicio_reservado_id);


-- -----------------------------------------------------------------------------
-- 9. modelos_3d_venta  (el 3D de venta: de catalogo o a medida)
--    Ya con todo lo que le anadieron despues: cuelga tambien de la oportunidad,
--    de_catalogo, y el vinculo al catalogo de modelos de escalera.
-- -----------------------------------------------------------------------------
create table if not exists modelos_3d_venta (
  id                  uuid        primary key default gen_random_uuid(),
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  proceso_venta_id    uuid        references procesos_venta (id),
  junta_id            uuid        references juntas (id),
  oportunidad_id      uuid        references oportunidades (id) on delete cascade,
  tipo_3d             text        not null,
  de_catalogo         boolean     not null default false,
  modelo_escalera_id  uuid        references modelos_escalera (id),
  a_medida            boolean,
  tecnico_id          uuid        references tecnicos (id),
  fecha_solicitud     timestamptz,
  fecha_necesaria     date,
  fecha_entrega       timestamptz,
  estado              text        not null default 'pedido',
  constraint modelos_3d_venta_tipo_3d_check
    check (tipo_3d in ('generico_escalera','a_medida','diseno_portal')),
  constraint modelos_3d_venta_estado_check
    check (estado in ('pedido','en_curso','listo','entregado')),
  constraint modelos_3d_venta_ambito_check
    check (proceso_venta_id is not null or junta_id is not null or oportunidad_id is not null)
);

comment on table modelos_3d_venta is '3D EXTERNO de venta para que la comunidad visualice como quedara el portal. Supera la barrera de credibilidad. Consume tiempo de tecnico cuando es a medida. Fechas y estado para alertas: a produccion (deadline), al comercial ("tu 3D esta listo") y a la IA (retrasos).';
comment on column modelos_3d_venta.de_catalogo is 'true = 3D de catalogo (ya existe, listo al instante, sin recursos). false = especifico/a medida (lo hace un tecnico: ciclo pedido->listo, vigilar fecha_necesaria=junta).';
comment on column modelos_3d_venta.modelo_escalera_id is 'Cuando tipo_3d = generico_escalera: cual del catalogo (modelos_escalera) se reutiliza. Vacio para a_medida/diseno_portal.';
comment on constraint modelos_3d_venta_ambito_check on modelos_3d_venta is 'Debe colgar de una oportunidad, de un proceso de venta y/o de una junta.';

create index if not exists idx_modelos_3d_venta_op                 on modelos_3d_venta (oportunidad_id);
create index if not exists idx_modelos_3d_venta_proceso_venta_id   on modelos_3d_venta (proceso_venta_id);
create index if not exists idx_modelos_3d_venta_junta_id           on modelos_3d_venta (junta_id);
create index if not exists idx_modelos_3d_venta_tecnico_id         on modelos_3d_venta (tecnico_id);
create index if not exists idx_modelos_3d_venta_fecha_necesaria    on modelos_3d_venta (fecha_necesaria);
create index if not exists idx_modelos_3d_venta_estado             on modelos_3d_venta (estado);
create index if not exists idx_modelos_3d_venta_modelo_escalera_id on modelos_3d_venta (modelo_escalera_id);


-- -----------------------------------------------------------------------------
-- 10. RLS, trigger de actualizado_en y permisos de la API
--    RLS activo sin politicas: solo la clave secreta (servidor) ve estas tablas,
--    igual que el resto. Cuando montemos auth, politicas por usuario.
-- -----------------------------------------------------------------------------
alter table fases_obra_catalogo      enable row level security;
alter table visitas_obra             enable row level security;
alter table fotos_acta               enable row level security;
alter table destinatarios_informe    enable row level security;
alter table resumenes_ia             enable row level security;
alter table interaccion_comunidad    enable row level security;
alter table condicionantes_comunidad enable row level security;
alter table administracion_origen    enable row level security;
alter table modelos_3d_venta         enable row level security;

-- El trigger de actualizado_en no se anade solo a las tablas nuevas.
do $$
declare
  r record;
begin
  for r in
    select unnest(array[
      'fases_obra_catalogo', 'visitas_obra', 'destinatarios_informe',
      'resumenes_ia', 'condicionantes_comunidad', 'administracion_origen',
      'modelos_3d_venta'
    ]) as table_name
  loop
    execute format('drop trigger if exists trg_set_actualizado_en on public.%I', r.table_name);
    execute format(
      'create trigger trg_set_actualizado_en before update on public.%I for each row execute function set_actualizado_en()',
      r.table_name
    );
  end loop;
end $$;

grant all privileges on all tables in schema public to service_role;
