-- =============================================================================
-- ERP Accesalia — Bloque ADMINISTRADOR de las fichas, en campos normalizados
--
-- Reduce el problema a un tamano revisable a mano: en vez de las 2.062 fichas
-- con bloque de administrador, UNA fila por comunidad VIVA (las de Monday
-- trazadas a su carpeta de Dropbox).
--
-- PRIMERA VUELTA: solo el caso ESTANDAR, 511 comunidades en las que todas sus
-- fichas dicen LO MISMO (a lo sumo un valor distinto por campo). Las 56 en las
-- que la ficha declara mas de un administrador NO entran aqui: son un problema
-- distinto y se resuelven en otra vuelta con su propia estrategia. Nada se
-- guarda como texto libre a medio resolver: o el dato entra limpio en su
-- columna, o esa comunidad espera.
--
-- Esto es solo EXTRACCION. Aqui NO se agrupa, NO se decide que empresas son la
-- misma y NO se escribe en administraciones_fincas. Eso viene despues.
--
-- Convenciones: espanol sin tildes/enes; CHECK con nombre (nunca enum); RLS sin
-- politicas; trigger set_actualizado_en.
-- =============================================================================

create table migracion_admin_revision (
  id               uuid        primary key default gen_random_uuid(),
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now(),

  comunidad_id     uuid        not null unique references comunidades(id) on delete cascade,
  comunidad        text        not null default '',
  localidad        text,
  n_fichas         integer     not null default 0,

  -- Los cinco campos del bloque, con la etiqueta de la ficha entre parentesis
  nombre           text        not null default '',  -- NOMBRE, ya sin la nota pegada
  extras           text        not null default '',  -- lo que venia pegado al nombre
  email            text        not null default '',  -- E-MAIL
  telefono         text        not null default '',  -- TELEFONO
  persona          text        not null default '',  -- PERSONA DE CONTACTO
  direccion        text        not null default '',  -- DIRECCION

  -- Se van dando por buenas por tandas: la tabla acumula lo ya resuelto y deja
  -- ver de un vistazo lo que sigue pendiente de decidir a mano.
  resuelto         boolean     not null default false,
  revisado         boolean     not null default false,
  nota_revision    text
);

comment on table migracion_admin_revision is 'Bloque ADMINISTRADOR de la ficha en campos normalizados, una fila por comunidad viva. Primera vuelta: solo las que no tienen ambiguedad. Solo extraccion; deduplicar empresas es un paso posterior.';
comment on column migracion_admin_revision.comunidad is 'Direccion de la comunidad, para saber de quien se habla sin cruzar tablas.';
comment on column migracion_admin_revision.n_fichas is 'Fichas de esta comunidad que traen bloque de administrador. >1 es normal: una por actuacion, todas de acuerdo.';
comment on column migracion_admin_revision.extras is 'La cola que venia pegada al NOMBRE: seguimiento de pedidos de documentacion, fechas, horarios, "a traves de". Se separa, NO se tira: nombre || extras reconstruye el valor original de la ficha.';
comment on column migracion_admin_revision.telefono is 'Solo digitos, sin separadores. Varios numeros van separados por coma. Si trae horario o extension se deja crudo: es informacion real.';
comment on column migracion_admin_revision.email is 'En minusculas.';

comment on column migracion_admin_revision.resuelto is 'true = el nombre esta dado por bueno (venia limpio, o se separo de su nota). false = falta decidir a mano.';

create index migracion_admin_revision_comunidad_idx on migracion_admin_revision (comunidad_id);

alter table migracion_admin_revision enable row level security;

drop trigger if exists trg_set_actualizado_en on public.migracion_admin_revision;
create trigger trg_set_actualizado_en
  before update on public.migracion_admin_revision
  for each row execute function set_actualizado_en();
