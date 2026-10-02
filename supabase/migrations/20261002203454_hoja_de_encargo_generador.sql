-- ===========================================================================
-- LO QUE GUARDA EL GENERADOR DE HOJAS DE ENCARGO   (2-oct-2026)
--
-- Para montar la maqueta que Monica aprobo tal cual (docs/figma/
-- hoja-de-encargo.html). No se crea una hoja nueva paralela: se COMPLETA la que
-- ya existe (hojas_encargo -> conceptos_hoja -> versiones_hoja), porque de ella
-- ya cuelgan las 1.539 hojas antiguas y la facturacion (lineas_facturacion
-- apunta a conceptos_hoja). Todo es AÑADIR: no se toca ni una fila antigua.
--
--   la hoja        ya tiene oportunidad, a quien va (comunidad o contrata),
--                  numero y estado. Nada nuevo.
--   actuaciones    NUEVO. El "que + donde" de la cabecera: una o varias por
--                  hoja (SATE en todo el edificio + ascensor en la escalera D).
--                  El donde son ACCESOS, la tabla validada: nunca texto suelto.
--   bloques        conceptos_hoja gana como sale en el desglose (la posicion
--                  del interruptor) y su forma de pago, por linea.
--   versiones      versiones_hoja gana la hoja tal como quedo, con lo que se
--                  edito a mano. El PDF firmado ya tenia su sitio.
-- ===========================================================================

begin;

-- ------------------------------------------------- las actuaciones (que+donde)
create table actuaciones_hoja (
  id               uuid primary key default gen_random_uuid(),
  creado_en        timestamptz not null default now(),
  hoja_encargo_id  uuid not null references hojas_encargo(id) on delete cascade,
  tipo_proyecto_id uuid not null references tipos_proyecto(id),
  orden            integer not null default 1
);
comment on table actuaciones_hoja is
  'El "que + donde" de la cabecera de una hoja de encargo: una fila por actuacion (Ascensor, SATE...). El donde va en actuacion_accesos.';
create index actuaciones_hoja_hoja_idx on actuaciones_hoja (hoja_encargo_id);

create table actuacion_accesos (
  actuacion_id uuid not null references actuaciones_hoja(id) on delete cascade,
  acceso_id    uuid not null references accesos(id),
  primary key (actuacion_id, acceso_id)
);
comment on table actuacion_accesos is
  'Donde se hace cada actuacion de una hoja: los accesos concretos (portal, escalera). "Edificio completo" lo escribe la pantalla cuando estan todos.';

alter table actuaciones_hoja enable row level security;
alter table actuacion_accesos enable row level security;

-- --------------------------------------------- los bloques: desglose y pago
alter table conceptos_hoja
  add column desglose  text,
  add column forma_pago text,
  add constraint conceptos_hoja_desglose_check
    check (desglose in ('no_aparece', 'incluido', 'se_cobra'));
comment on column conceptos_hoja.desglose is
  'Posicion del interruptor en ESTA hoja: no_aparece (solo parrafo), incluido (sin importe) o se_cobra (importe + linea de facturacion). Vacio en las hojas antiguas.';
comment on column conceptos_hoja.forma_pago is
  'Forma de pago de esta linea, tal como sale en la hoja ("50% a la contratacion · 50% a la entrega del Proyecto").';

-- ------------------------------------------ la version: la hoja tal cual
alter table versiones_hoja
  add column contenido_html text;
comment on column versiones_hoja.contenido_html is
  'La hoja tal como quedo al pulsar Generar, con lo editado a mano. Es la foto: si mañana cambia el nombre o el CIF de la comunidad, esta version no cambia.';

-- FRENO: las hojas antiguas siguen todas ahi y ninguna ha cambiado de forma.
do $$
declare h int; c int; v int;
begin
  select count(*) into h from hojas_encargo;
  select count(*) into c from conceptos_hoja where desglose is not null or forma_pago is not null;
  select count(*) into v from versiones_hoja where contenido_html is not null;
  if h <> 1539 or c <> 0 or v <> 0 then
    raise exception 'Algo no cuadra: % hojas (esperaba 1539), % conceptos y % versiones tocados (esperaba 0). Nada escrito.', h, c, v;
  end if;
end $$;

commit;
