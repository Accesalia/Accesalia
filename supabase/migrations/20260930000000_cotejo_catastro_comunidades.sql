-- ============================================================================
-- COMPLETAR LAS COMUNIDADES CONTRA CATASTRO (Monica, 29-sep-2026)
--
-- Rellenar referencia_catastral, lat, lng y cp de las 1.228 comunidades
-- entrando SOLO POR LA DIRECCION. Decision suya y con su razon:
--
--   "Las que tienen coordenadas vamos a suponer que NO las tienen: las
--    coordenadas solo despistan. Entremos por direccion y partimos de cero y
--    BIEN. Las sobrescribiria, no me dan ninguna confianza."
--
-- Y tenia razon: en la prueba, tres de quince coordenadas guardadas caian en la
-- PARCELA DEL VECINO -venian de otra fuente y estaban desplazadas-.
--
-- Tampoco se da por buena la referencia que ya hubiera: "puede estar mal porque
-- lo este de origen o porque la hayamos traspasado mal al parsear. SOLO me
-- fiaria de la direccion, que es la que revise personalmente".
--
-- `comunidades.nombre` NO SE TOCA. Son 26 dias de trabajo suyo a mano.
-- Hay copia previa de lo que habia en `comunidades_catastro_previo`.
-- ============================================================================

-- ------------------------------------------------- QUE PASO CON CADA UNA
--
-- Hace tres cosas a la vez, y las tres hacen falta:
--
--  1. PERMITE REANUDAR. Son 1.228 consultas a un servicio publico al que hay
--     que ir despacio: no cabe en una pasada. Sin esto no se distingue "aun no
--     se ha intentado" de "se intento y no salio".
--  2. ES LA LISTA DE REVISAR. Lo que no resuelve no se inventa: se apunta. Y
--     esa lista es el control de calidad sobre las direcciones curadas a mano,
--     que vale tanto como el relleno.
--  3. DEJA RASTRO. Se ve que contesto Catastro y cuando, sin volver a preguntar.
create table if not exists cotejo_catastro (
  id                uuid primary key default gen_random_uuid(),
  creado_en         timestamptz not null default now(),
  comunidad_id      uuid not null references comunidades(id) on delete cascade,
  estado            text not null,
  -- Lo que se encontro. Solo se copia a `comunidades` cuando estado = 'una'.
  referencia        text,
  lat               double precision,
  lng               double precision,
  cp                text,
  -- La direccion OFICIAL de Catastro. Se guarda aqui y NO en `comunidades`:
  -- alli manda la de Monica. Las dos son verdad y no se pisan.
  direccion_oficial text,
  -- Por que no salio, o cuantas fincas habia. En sus palabras, para poder
  -- arreglar la direccion sin tener que volver a consultar.
  dice              text,
  candidatos        jsonb,
  buscado           jsonb,
  intentado_en      timestamptz not null default now(),
  constraint cotejo_catastro_una_por_comunidad unique (comunidad_id),
  constraint cotejo_catastro_estado_check check (estado = any (array[
    'una'::text,     -- una sola finca: se escribe en comunidades
    'varias'::text,  -- ese numero tiene varias fincas. NO se elige: que elija una persona
    'no'::text,      -- Catastro dice que no existe. La direccion hay que mirarla
    'rara'::text,    -- no se puede ni partir ("PARQUE COMERCIAL ALCORA PLAZA, CALLE EUROPA 22")
    'fallo'::text])  -- el servicio fallo. Se reintenta en la siguiente pasada
  )
);

create index if not exists cotejo_catastro_estado_idx on cotejo_catastro (estado);

comment on table cotejo_catastro is
  'Que dijo Catastro de cada comunidad al completarlas por direccion. Permite reanudar, y lo que no resuelve es la lista de direcciones a revisar.';
comment on column cotejo_catastro.direccion_oficial is
  'La direccion literal de Catastro. NO sustituye a comunidades.nombre: alli manda la de Monica.';
comment on column cotejo_catastro.estado is
  'Solo "una" se copia a comunidades. Lo demas se queda aqui esperando a una persona.';
