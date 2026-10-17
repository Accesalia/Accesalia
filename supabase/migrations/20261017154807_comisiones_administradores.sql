-- COMISIONES DE ADMINISTRADORES (Monica, 17-oct-2026). Solo las ven Ana
-- (Ecobalance) y direccion. Reglas suyas:
--   * La comision es de una PERSONA. Del jefe, normalmente: "sus empleados ni
--     siquiera deben SABER que la comision existe".
--   * El administrador factura SIEMPRE a Ecobalance.
--   * Los acuerdos de Monday no son fiables: cada acuerdo esta VERIFICADO (lo dio
--     por bueno ella) o POR REVISAR.
--   * ALCANCE: "todo lo que venga de estas administraciones" (el jefe, varias
--     oficinas, o un comercial externo como Raul Cerezo con las que trae), o
--     "solo lo suyo" (su cartera: las comunidades que lleva o las opps que trae).
--   * Tres condiciones: sobre proyecto, sobre subvenciones y sobre contrata, cada
--     una en euros o en %, con factura o en B, pactada o pendiente de negociar; la
--     de contrata, a traves de nosotros o directa con la contrata.
-- Sustituye a acuerdos_comision (cargada de Monday), que se queda como historico.

create table comision_acuerdos (
  id             uuid        primary key default gen_random_uuid(),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  persona_id     uuid        references persona(id),
  alcance        text        not null default 'empresas',
  vigente        boolean     not null default true,
  desde          date,
  hasta          date,
  no_cobra       boolean     not null default false,
  revision       text        not null default 'por_revisar',
  verificado_por uuid        references equipo(id),
  verificado_en  timestamptz,
  notas          text,
  creado_por     uuid        references equipo(id),
  origen         text        not null default 'app',
  constraint comision_acuerdos_alcance_check check (alcance in ('empresas', 'lo_suyo')),
  constraint comision_acuerdos_revision_check check (revision in ('verificado', 'por_revisar')),
  constraint comision_acuerdos_origen_check check (origen in ('app', 'revision_monica', 'monday')),
  constraint comision_acuerdos_lo_suyo_check check (alcance <> 'lo_suyo' or persona_id is not null)
);
comment on table comision_acuerdos is 'Acuerdo de comision con una persona (normalmente el jefe de una administracion). Solo Ana (Ecobalance) y direccion.';
comment on column comision_acuerdos.alcance is 'empresas = todo lo que venga de las administraciones de comision_acuerdo_empresas; lo_suyo = su cartera (comunidades que lleva su puesto u opps que trae).';
create trigger trg_set_actualizado_en before update on comision_acuerdos for each row execute function set_actualizado_en();
alter table comision_acuerdos enable row level security;

create table comision_acuerdo_empresas (
  acuerdo_id uuid not null references comision_acuerdos(id) on delete cascade,
  empresa_id uuid not null references empresa(id),
  primary key (acuerdo_id, empresa_id)
);
comment on table comision_acuerdo_empresas is 'Las administraciones que cubre un acuerdo de alcance empresas (una, varias oficinas, o las que trae un comercial externo).';
alter table comision_acuerdo_empresas enable row level security;

create table comision_condiciones (
  id             uuid        primary key default gen_random_uuid(),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  acuerdo_id     uuid        not null references comision_acuerdos(id) on delete cascade,
  sobre          text        not null,
  forma          text        not null default 'eur',
  valor          numeric(12,3),
  estado         text        not null default 'pactada',
  en_b           boolean     not null default false,
  via            text,
  notas          text,
  constraint comision_condiciones_sobre_check check (sobre in ('proyecto', 'subvenciones', 'contrata')),
  constraint comision_condiciones_forma_check check (forma in ('eur', 'pct')),
  constraint comision_condiciones_estado_check check (estado in ('pactada', 'pendiente')),
  constraint comision_condiciones_via_check check (via is null or (sobre = 'contrata' and via in ('nosotros', 'directo'))),
  constraint comision_condiciones_una_por_sobre unique (acuerdo_id, sobre)
);
comment on table comision_condiciones is 'Lo que se lleva sobre proyecto, subvenciones y contrata: euros o %, con factura o en B, pactada o pendiente de negociar; contrata: via nosotros o directo.';
comment on column comision_condiciones.valor is 'Euros (forma eur) o porcentaje (forma pct; en contrata, del PEM). Vacio si esta pendiente.';
create trigger trg_set_actualizado_en before update on comision_condiciones for each row execute function set_actualizado_en();
alter table comision_condiciones enable row level security;

-- LO QUE SE LE DEBE EN CADA OPP: una fila por opp, acuerdo y concepto, con su
-- base (lo facturado, o el importe de la obra), su comision y si esta pagada.
create table comisiones_opp (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  oportunidad_id  uuid        not null references oportunidades(id),
  acuerdo_id      uuid        not null references comision_acuerdos(id),
  sobre           text        not null,
  base            numeric(12,2),
  importe         numeric(12,2),
  importe_a_mano  boolean     not null default false,
  pagada          boolean     not null default false,
  fecha_pago      date,
  factura_url     text,
  justificante_url text,
  notas           text,
  editado_por     uuid        references equipo(id),
  constraint comisiones_opp_sobre_check check (sobre in ('proyecto', 'subvenciones', 'contrata')),
  constraint comisiones_opp_unica unique (oportunidad_id, acuerdo_id, sobre)
);
comment on table comisiones_opp is 'La comision que se le debe a una persona en una opp, por concepto: base, importe (calculado o a mano), pagada y fecha. Solo Ana y direccion.';
create trigger trg_set_actualizado_en before update on comisiones_opp for each row execute function set_actualizado_en();
alter table comisiones_opp enable row level security;

-- Las notas de esa opp concreta en la ficha de comisiones.
create table comision_notas_opp (
  oportunidad_id uuid        not null references oportunidades(id),
  acuerdo_id     uuid        not null references comision_acuerdos(id) on delete cascade,
  texto          text        not null,
  actualizado_en timestamptz not null default now(),
  editado_por    uuid        references equipo(id),
  primary key (oportunidad_id, acuerdo_id)
);
alter table comision_notas_opp enable row level security;

-- El historico de Monday: se queda, marcado como sustituido.
alter table acuerdos_comision add column if not exists sustituido boolean not null default false;
comment on column acuerdos_comision.sustituido is 'Sustituido por comision_acuerdos (revision de Monica, 17-oct-2026): Monday no era fiable.';
