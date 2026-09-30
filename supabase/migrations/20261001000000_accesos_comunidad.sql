-- LOS ACCESOS DE LA COMUNIDAD, y los tres niveles de organo.
-- Aplicada en produccion el 1-oct-2026 con el OK de Monica.
-- Criterio completo en docs/comunidad.md

-- ---------------------------------------------------------------------------
-- 1. La tabla que faltaba
-- ---------------------------------------------------------------------------

create table if not exists accesos_comunidad (
  id                uuid primary key default gen_random_uuid(),
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),
  comunidad_id      uuid not null references comunidades(id) on delete cascade,

  referencia        text not null,        -- la parcela (14) o el inmueble (20) si es un local
  ficha_id          uuid references ficha_catastro(id) on delete set null,

  municipio         text,
  tipo_via          text,                 -- CL, AV, PZ... la sigla que Catastro exige
  nombre_via        text,
  numero            text,
  escalera          text,                 -- vacia cuando el numero ya identifica el acceso

  lat               double precision,
  lng               double precision,
  direccion_oficial text,                 -- la etiqueta de Catastro, con su (B) o su (D)
  principal         boolean not null default false,
  orden             integer,
  de_donde          text,

  constraint accesos_comunidad_unico unique (comunidad_id, referencia)
);

-- AVISO DE MONICA, y tiene razon: "pon en algun sitio que lo de accesos viene porque
-- son accesos a la calle y son los que determinan la unidad, si no en dos semanas
-- alguien vera ese nombre y creera que es una tabla de cosas tecnicas".
comment on table accesos_comunidad is
$$OJO CON EL NOMBRE: aqui "acceso" NO es nada tecnico. No son rampas, ni ascensores, ni
itinerarios accesibles. Un ACCESO ES UN PORTAL: una escalera con su puerta a la calle.

Es la UNIDAD del modelo, el atomo del que cuelga todo lo demas, y se llama asi porque lo
que de verdad distingue una unidad de otra es por donde se entra desde la calle.

Se nombra con (calle, numero, escalera), y la escalera va vacia cuando el numero ya basta:
  PICO CEJO 55          1 numero,   escalera vacia     ->  1 acceso
  AV ALBUFERA 250       1 numero,   9 escaleras        ->  9 accesos
  ETRURIA 26-28 + LUCANO 65   2 calles, 3 numeros      ->  3 accesos, UNA sola parcela
  CUESTABLANCA 2        202 numeros, 32 escaleras      ->  203 accesos

Por que es el atomo: la TRAMITACION va por direccion postal (un expediente de subvencion
por calle+numero, medido sobre 1.414 expedientes concedidos del Ayuntamiento de Madrid: ni
uno cubre dos direcciones) y la OBRA va por escalera (un ascensor por escalera). Los dos
granos no coinciden, y ninguno coincide con la parcela catastral ni con la comunidad.

Cuelga de la COMUNIDAD, no de la oportunidad: una comunidad tiene muchas oportunidades a
lo largo de los años y el portal es el mismo. La oportunidad, el proyecto, la hoja de
encargo y el expediente APUNTAN a accesos; no los poseen.

Criterio completo, con los siete edificios de prueba: docs/comunidad.md$$;

comment on column accesos_comunidad.escalera is
  'Vacia cuando el numero de calle ya identifica el acceso. PICO CEJO 55 la deja vacia; AV ALBUFERA 250 necesita la escalera porque hay nueve.';
comment on column accesos_comunidad.principal is
  'El acceso que se usa cuando hay que dar UNO solo (una factura, un campo de texto). Criterio de Monica: la primera.';
comment on column accesos_comunidad.referencia is
  'Normalmente la parcela (14 caracteres). Puede ser un inmueble (20) cuando lo que se contrata es un local: el centro comercial de Alcorcon es el unico caso de las 1.228.';
comment on column accesos_comunidad.tipo_via is
  'La sigla de Catastro (CL, AV, PZ, PS, CM...). Es OBLIGATORIA en sus consultas: con el campo vacio contesta "no existe ningun inmueble" hasta para direcciones que existen.';

create index if not exists accesos_comunidad_comunidad_idx  on accesos_comunidad (comunidad_id);
create index if not exists accesos_comunidad_referencia_idx on accesos_comunidad (referencia);
create index if not exists accesos_comunidad_ficha_idx      on accesos_comunidad (ficha_id);
create index if not exists accesos_comunidad_direccion_idx
  on accesos_comunidad (municipio, nombre_via, numero);

-- Un solo principal por comunidad. Esta si se puede exigir ya.
create unique index if not exists accesos_comunidad_un_principal
  on accesos_comunidad (comunidad_id) where principal;

-- EL CANDADO QUE FALTA, y por que no se puede activar todavia:
--   (municipio, tipo_via, nombre_via, numero, escalera) deberia ser UNICO, porque un
--   acceso pertenece a un solo organo. Pero hoy hay filas que comparten acceso porque
--   la misma escalera se metio como varias comunidades: AV ANGELES 6 y AV ANGELES 6
--   LEGANES, las cuatro de NECTAR 31, las tres de SANTA CRUZ DE MARCENADO...
--   Activarlo ahora impediria cargar los datos. La lista de choques ES la lista de
--   fusiones pendientes, y esas son decision de Monica porque son sus filas.
--   Cuando esten resueltas: create unique index on accesos_comunidad
--     (municipio, tipo_via, nombre_via, numero, coalesce(escalera,''));

alter table accesos_comunidad enable row level security;
drop policy if exists "accesos: los ve quien ve la comunidad" on accesos_comunidad;
create policy "accesos: los ve quien ve la comunidad"
  on accesos_comunidad for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 2. Mancomunidad / comunidad / subcomunidad: no son tres tablas, son la misma
-- ---------------------------------------------------------------------------
--
-- Definicion de Monica: "una comunidad es la que tiene un presidente y su junta puede
-- votar mi presupuesto. Ya sea comunidad o mancomunidad." Una mancomunidad tambien tiene
-- presidente y junta, y una subcomunidad tambien: son el MISMO tipo de cosa en niveles
-- distintos, como abuela, madre e hija estan en la tabla de personas.
--
-- La ley les da nombre (LPH 49/1960):
--    comunidad de propietarios        art. 2.a
--    subcomunidad                     art. 2.d   -- la escalera con su ascensor
--    complejo inmobiliario privado    art. 24    -- la mancomunidad
--
-- Y el presidente ya estaba modelado: personas_comunidad con rol = 'presidente'.

alter table comunidades
  add column if not exists parte_de_id uuid references comunidades(id) on delete set null,
  add column if not exists figura text;

alter table comunidades drop constraint if exists comunidades_figura_check;
alter table comunidades add constraint comunidades_figura_check
  check (figura is null or figura in ('comunidad', 'subcomunidad', 'mancomunidad'));

comment on column comunidades.parte_de_id is
  'El organo que esta POR ENCIMA: la mancomunidad de una comunidad, o la comunidad de una subcomunidad. Nulo = no se sabe o no hay. Es "quien es tu madre".';
comment on column comunidades.figura is
  'Lo que dice el titulo constitutivo: comunidad / subcomunidad / mancomunidad. Es "que generacion eres". Dato de CAMPO (lo sabe el administrador); NO se deduce de parte_de_id, porque se puede saber antes de tener la fila del padre. Cuando no cuadran, eso tambien informa.';

create index if not exists comunidades_parte_de_idx on comunidades (parte_de_id);
create index if not exists comunidades_figura_idx on comunidades (figura);

alter table comunidades drop constraint if exists comunidades_no_es_su_propio_padre;
alter table comunidades add constraint comunidades_no_es_su_propio_padre
  check (parte_de_id is null or parte_de_id <> id);

-- ---------------------------------------------------------------------------
-- 3. La carga: 1.244 accesos desde lo que ya estaba escrito
-- ---------------------------------------------------------------------------
--
-- No se teclea nada: sale de comunidades.referencia_catastral y de los 26 accesos
-- adicionales que habia en cotejo_catastro.candidatos.
--
-- CUIDADO, y esto casi nos cuesta un error: `candidatos` estaba haciendo DOS trabajos.
--   * forma {direccion, referencia}       (26) -> accesos de ESA comunidad. Entran.
--   * forma {cp, direccion, referencia}  (164) -> los portales HERMANOS entre los que se
--     eligio, que pertenecen a OTRAS comunidades o a nadie. NO entran.
-- Av España 35 de Majadahonda lo ensena: tiene 8 portales, y las filas 35-2 y 35-6
-- guardan las ocho cada una con una distinta elegida. Una carga a ciegas habria metido
-- 164 accesos en la comunidad equivocada.

with extras as (
  select ct.comunidad_id, (j ->> 'referencia') referencia, (j ->> 'direccion') direccion
  from cotejo_catastro ct, jsonb_array_elements(ct.candidatos) j
  where ct.candidatos is not null and jsonb_typeof(ct.candidatos) = 'array'
    and not ((ct.candidatos -> 0) ? 'cp')
), todo as (
  select c.id comunidad_id, c.referencia_catastral referencia, c.municipio,
         ct.direccion_oficial, c.lat, c.lng, true principal, 1 orden,
         coalesce(ct.dice, 'de la primera vuelta') de_donde
  from comunidades c
  left join cotejo_catastro ct on ct.comunidad_id = c.id
  where c.referencia_catastral is not null
  union all
  select e.comunidad_id, e.referencia, c.municipio, e.direccion, null, null, false,
         2, 'acceso adicional de la misma comunidad'
  from extras e join comunidades c on c.id = e.comunidad_id
)
insert into accesos_comunidad
  (comunidad_id, referencia, municipio, direccion_oficial, lat, lng, principal, orden, de_donde)
select comunidad_id, referencia, municipio, direccion_oficial, lat, lng, principal, orden,
       left(de_donde, 300)
from todo
on conflict (comunidad_id, referencia) do nothing;

-- El nombre de cada acceso (calle, numero, escalera) y la ficha completa de la parcela
-- los baja la app: frontend/lib/fichaCatastro.ts, por /api/catastro/fichas.
