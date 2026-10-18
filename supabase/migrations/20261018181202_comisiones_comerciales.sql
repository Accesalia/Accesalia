-- COMISIONES DE NUESTROS COMERCIALES (Monica, 18-oct-2026).
-- La comision la cobra SIEMPRE el responsable de la opp (oportunidades.comercial_id),
-- nunca el captador; su % esta en comerciales.comision_pct. Se devenga hito a hito
-- cuando Accesalia cobra, sobre el precio SIN la comision del administrador, y solo
-- cuenta desde el 1-ene-2026 (una opp cuya primera factura es de 2025 o antes, no).
-- Lo calcula la app; aqui solo se guarda lo que decide direccion:
--   - comision_comercial_opps: «esta opp no cuenta para su comision» (las heredadas
--     para gestion que no firmo el), con su nota;
--   - comision_comercial_hitos: si su parte de un hito ya se le ha pagado y cuando.

create table comision_comercial_opps (
  oportunidad_id uuid        primary key references oportunidades(id),
  no_cuenta      boolean     not null default false,
  nota           text,
  editado_por    uuid        references equipo(id),
  actualizado_en timestamptz not null default now()
);
comment on table comision_comercial_opps is 'Comisiones de nuestros comerciales: lo que decide direccion por opp (no cuenta para su comision, y por que). Monica, 18-oct-2026.';
alter table comision_comercial_opps enable row level security;

create table comision_comercial_hitos (
  hito_cobro_id  uuid        primary key references hitos_cobro(id) on delete cascade,
  comercial_id   uuid        not null references comerciales(id),
  pagada         boolean     not null default false,
  fecha_pago     date,
  editado_por    uuid        references equipo(id),
  actualizado_en timestamptz not null default now()
);
comment on table comision_comercial_hitos is 'Comisiones de nuestros comerciales: si su parte de un hito (o subhito) ya se le ha pagado y cuando. Monica, 18-oct-2026.';
alter table comision_comercial_hitos enable row level security;
