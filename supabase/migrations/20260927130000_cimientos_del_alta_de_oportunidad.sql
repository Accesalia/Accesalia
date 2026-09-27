-- LO QUE NECESITA EL ALTA DE UNA OPORTUNIDAD (Monica, 27-sep-2026).
-- Todo nuevo, nada se borra y ningun dato existente se toca.

-- ── 1 · QUE COSA LES INTERESA ───────────────────────────────────────────────
-- "De lo que yo vendo, que me quieren comprar" (ella). Normalmente entre dos y
-- cinco cosas, asi que hace falta una fila por cada una. Los NOMBRES no se
-- duplican: viven solo en `tipos_proyecto`, y aqui hay punteros. Es el mismo
-- patron que `proyecto_tipos`, que ya tiene 636 filas.
create table if not exists oportunidad_tipos (
  oportunidad_id uuid not null references oportunidades(id) on delete cascade,
  tipo_id        uuid not null references tipos_proyecto(id),
  creado_en      timestamptz not null default now(),
  primary key (oportunidad_id, tipo_id)
);
comment on table oportunidad_tipos is 'Que quieren: apunta a tipos_proyecto. Varias filas por oportunidad, y crece con el tiempo.';
create index if not exists oportunidad_tipos_tipo_idx on oportunidad_tipos (tipo_id);

-- ── 2 · EL DNI DE LA OPORTUNIDAD ────────────────────────────────────────────
-- ALV-2026-032. Tres letras del comercial CAPTADOR, año en curso, correlativo de
-- tres digitos. Si luego la hereda otro comercial NO cambia: sigue con las
-- iniciales originales. Funciona como el DNI de la oportunidad primero y del
-- proyecto o servicio despues, para poder trazar de donde viene una subvencion
-- que se cobra dos años mas tarde.
alter table oportunidades add column if not exists codigo text;
comment on column oportunidades.codigo is 'ALV-2026-032. Del comercial captador; no cambia si la hereda otro. Es el DNI que viaja al proyecto.';
create unique index if not exists oportunidades_codigo_unico on oportunidades (codigo) where codigo is not null;

-- ── 3 · LAS INICIALES DEL COMERCIAL ─────────────────────────────────────────
-- A mano, no calculadas: el dia que entre otro Daniel se le pone otra distinta.
alter table comerciales add column if not exists iniciales text;
comment on column comerciales.iniciales is 'Las tres letras del codigo de sus oportunidades. Se eligen a mano.';
alter table comerciales drop constraint if exists comerciales_iniciales_check;
alter table comerciales add constraint comerciales_iniciales_check
  check (iniciales is null or iniciales ~ '^[A-Z]{2,4}$');
create unique index if not exists comerciales_iniciales_unicas on comerciales (iniciales) where iniciales is not null;

update comerciales set iniciales = 'ALV' where nombre = 'Alvaro'  and iniciales is null;
update comerciales set iniciales = 'DAN' where nombre = 'Daniel'  and iniciales is null;

-- Beatriz empieza el 1 de octubre. Se crea ya para tener sus siglas; el correo y
-- el 2FA se le abren mañana y entonces se completa.
insert into comerciales (nombre, iniciales, activo, fecha_alta, regimen_comision, comision_negociada_individual)
select 'Beatriz', 'BEA', true, '2026-10-01', 'comisiona_todo', true
where not exists (select 1 from comerciales where iniciales = 'BEA');

-- ── 4 · EL COMERCIAL BAJA A LA PERSONA ──────────────────────────────────────
-- La relacion comercial es persona-persona, no comercial-empresa: dentro de una
-- misma administracion puede haber 9 personas y repartirse entre dos comerciales
-- (ella, 27-sep). El de la empresa se queda como valor por defecto y para poder
-- marcarla entera de golpe, que es el caso habitual.
-- NO se rellena nada: las 59 administraciones con dueño se quedan como estan
-- hasta que ella lo revise.
alter table puesto add column if not exists comercial_id uuid references comerciales(id);
alter table puesto add column if not exists comercial_captador_id uuid references comerciales(id);
comment on column puesto.comercial_id is 'Quien lleva a ESTA persona hoy. Manda sobre el de su empresa.';
comment on column puesto.comercial_captador_id is 'Quien la capto. No cambia aunque la herede otro.';
create index if not exists puesto_comercial_idx on puesto (comercial_id) where comercial_id is not null;
