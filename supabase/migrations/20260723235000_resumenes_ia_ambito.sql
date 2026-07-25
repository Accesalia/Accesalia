-- GENERALIZAR resumenes_ia a AMBITO: no solo por comunidad, tambien por
-- ADMINISTRADOR (la PERSONA a la que se visita, no la firma fiscal).
--
-- "Prompt anexo" de Sali: al crear una interaccion que menciona a un admin, se
-- (re)genera su resumen vivo sumando la nueva nota a las previas -> entras y Sali
-- te cuenta como vas con esa persona. Igual por comunidad (expediente semilla,
-- semilla de los resumenes por fase). Mantenemos FKs reales (una columna por tipo
-- de destino + CHECK de exactamente-uno), no un ambito_id polimorfico sin integridad.

alter table resumenes_ia
  alter column comunidad_id drop not null,
  add column if not exists administrador_id uuid references administradores (id) on delete cascade,
  add column if not exists ambito text not null default 'comunidad';

-- Las filas existentes son todas de comunidad (comunidad_id no nulo, ambito='comunidad' por defecto).

alter table resumenes_ia
  drop constraint if exists resumenes_ia_ambito_ck,
  add constraint resumenes_ia_ambito_ck check (
    (ambito = 'comunidad'     and comunidad_id     is not null and administrador_id is null) or
    (ambito = 'administrador' and administrador_id is not null and comunidad_id     is null)
  );

comment on column resumenes_ia.ambito is 'comunidad | administrador (persona). Define cual de las dos FKs esta puesta.';
comment on column resumenes_ia.administrador_id is 'Ambito administrador: la PERSONA a la que se visita (no la firma). Resumen vivo de la relacion comercial con ella.';

-- Un resumen por (administrador, fase). El de comunidad ya lo guarda unique(comunidad_id,fase).
create unique index if not exists uq_resumenes_ia_admin on resumenes_ia (administrador_id, fase) where administrador_id is not null;
