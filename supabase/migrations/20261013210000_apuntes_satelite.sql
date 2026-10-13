-- LO QUE SE APUNTA EN EL SATELITE Y AUN NO ESTA CREADO (Monica, 13-oct-2026).
-- "El satelite debe permitir coger el dato rapido, no necesariamente completo:
-- es para que no se les olvide, no para que trabajen desde el movil." Una opp
-- o un administrador nuevos que se lanzan desde el movil NO se crean: quedan
-- aqui apuntados, y salen en Pendientes ("Opps nuevas que has lanzado desde el
-- satelite", "Administradores nuevos creados desde el satelite") para
-- completarlos y darlos de alta en la oficina.

create table apuntes_satelite (
  id              uuid primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  tipo            text not null,
  autor_id        uuid references equipo (id),
  -- El id que el movil le dio a la nota: si reenvia porque se corto la
  -- cobertura, no se apunta dos veces.
  nota_id         uuid unique,
  fecha           date,
  nota            text,
  canal           text,
  -- Lo que se escribio: la direccion (opp) o el nombre (administrador).
  direccion_texto text,
  nombre          text,
  -- Todo lo que mando el movil, tal cual (contacto, administrador, que quieren,
  -- siguiente paso, telefono, correo, fotos...).
  datos           jsonb not null default '{}'::jsonb,
  estado          text not null default 'pendiente',
  resuelto_en     timestamptz,
  resuelto_por    uuid references equipo (id),
  oportunidad_id  uuid references oportunidades (id),
  persona_id      uuid references persona (id),
  motivo          text,
  constraint apuntes_satelite_tipo_check check (tipo in ('oportunidad', 'administrador')),
  constraint apuntes_satelite_estado_check check (estado in ('pendiente', 'dado_de_alta', 'descartado')),
  constraint apuntes_satelite_resuelto_check check ((estado = 'pendiente') = (resuelto_en is null))
);

comment on table apuntes_satelite is 'Opps y administradores lanzados desde el satelite (movil): apuntados, NO creados. Se completan y se dan de alta en la oficina desde Pendientes (Monica, 13-oct-2026).';
comment on column apuntes_satelite.datos is 'Lo que mando el movil, tal cual: contacto, administrador, que quieren, siguiente paso, telefono, correo, fotos.';
comment on column apuntes_satelite.estado is 'pendiente | dado_de_alta (con oportunidad_id o persona_id) | descartado (con motivo).';

create index apuntes_satelite_pendientes_idx on apuntes_satelite (autor_id, tipo) where estado = 'pendiente';

alter table apuntes_satelite enable row level security;
