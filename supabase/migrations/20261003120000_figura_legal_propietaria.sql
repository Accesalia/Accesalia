-- ===========================================================================
-- LA FIGURA LEGAL PROPIETARIA   (Monica, 3-oct-2026)
--
-- SU MODELO, copiado literal para que no se vuelva a desvirtuar:
--
--   "una tabla relacional: id_comodin - figura, donde comodin es: comunidad,
--    empresa, persona, organismo. Punto. ESO ES LO QUE YO DECIDI. Cada acceso
--    apunta a su id_comodin, sea cual sea el propietario. La figura solo es un
--    identificador, los datos viven en su tabla: comunidades cuando es
--    comunidad, empresa cuando es empresa, persona cuando es particular,
--    organismo cuando sea organismo."
--
-- De ahi la forma de la tabla 1: NO tiene datos. Dos columnas. El `id_comodin`
-- no se genera aqui, VIENE de la tabla donde viven los datos de esa figura.
--
-- LA FIGURA NUEVA: 'Copropiedad Particular'. Es la casa con varios duenos (su
-- ejemplo: Riansares 7 de Villaviciosa de Odon, que todavia no esta en la
-- base). NO es 'Comunidad sin titulo constitutivo', y la diferencia importa
-- porque la segunda es una SENAL DE VENTA: un edificio de vecinos al que le
-- falta un papel y que manana puede tenerlo. Una casa de dos duenos no va a ser
-- comunidad nunca. Si se mezclaran, al filtrar "comunidades a las que les falta
-- constituirse" saldrian casas unifamiliares.
--
-- Su forma, dicha por ella: "es como mancomunidad pero AL REVES". La
-- mancomunidad esta ENCIMA y agrupa comunidades (`relacion_mancomunidad_
-- comunidades`, con sus dos claves a `comunidades`). La copropiedad esta DEBAJO
-- del acceso y apunta hacia abajo a sus personas. Por eso lleva tabla propia,
-- `inmueble_varios_titulares`: es el unico comodin cuyo id no existe ya en otra
-- tabla, y sin ella la regla "el id viene de su tabla" tendria una excepcion.
--
-- LAS PERSONAS NO LLEVAN TABLA NUEVA. Decidido el 9-sep y reconfirmado hoy:
-- `persona` + `puesto` es la agenda, y "esos datos de persona valen para todos,
-- da igual si trabaja en un ayuntamiento, una contrata o un admin de fincas".
-- Lo que NO se comparte son los datos de ENTIDAD -"un admin me trae negocio, un
-- ayto me controla mi trabajo"-, y por eso las entidades siguen separadas. De
-- ahi el apuntador nuevo de `puesto` (bloque 6).
--
-- ---------------------------------------------------------------------------
-- ESTO SOLO CREA ESTRUCTURA. NO MUEVE NI UN DATO.
--
-- El encargo fue exactamente este: "las dos tablas nuevas, empresas_propietarias,
-- la figura Copropiedad Particular y el comodin en puesto". Cinco cosas y
-- ninguna es cargar datos. Escribi un bloque que se llevaba 7 filas a la tabla
-- comodin y dejaba 4 fuera por criterio mio, y me lo corrigio:
--
--   "DEJA DE TOMAR TUS DECISIONES SIN PREGUNTARME. (...) donde ves aqui que
--    fueramos a llevarnos datos a ningun sitio, y mas si hay datos que no eran
--    evidentes y que has decidido TU que hacer con ellos sin preguntar?"
--
-- Asi que la tabla comodin nace vacia y el freno (a) lo comprueba.
--
-- LO QUE QUEDA PARA DESPUES, y cada una es decision suya:
--
--   1. QUIEN ENTRA EN LA TABLA COMODIN Y CON QUE FIGURA. Hoy 8 de las 1.214
--      comunidades tienen figura escrita, y las escribio la tanda de Alcobendas
--      del 3-oct: una por tarjeta del CIF leida a ojo (7 con letra H ->
--      'Comunidad de Propietarios', y CBRE GWS -> 'Propietario Empresa').
--      Las 19 de Alcorcon tambien tienen tarjeta leida y NO se les escribio la
--      figura: la migracion de Alcorcon no tocaba esa columna.
--
--   2. LAS CINCO FILAS QUE NO SON COMUNIDADES, que son CUATRO titulares: Alava 6
--      de Fuenlabrada y Doctor Esquerdo 55 de Madrid comparten el CIF B28111516
--      -una empresa con dos locales en dos municipios-. Dato que hace falta para
--      moverlas: de los cuatro, solo CBRE GWS tiene nombre fiscal en la base.
--      Los otros tres (B28111516, Laton 8 con A28228864 y el particular de
--      Cobre 18 con el DNI 52118110H) tienen por nombre su propia direccion.
--
--   3. EL REPUNTE DE `accesos` A LA FIGURA. Cuando se haga NO se movera ni un
--      dato: para una comunidad el id del comodin ES el id de la comunidad, asi
--      que `accesos.comunidad_id` seguira valiendo lo mismo y solo cambiara a
--      que tabla apunta su clave ajena.
--
--   4. EL VIGILANTE DEL COMODIN. Postgres no puede poner una clave ajena a
--      cinco tablas, asi que la correspondencia figura -> tabla no la garantiza
--      la base. Cuando la aplicacion escriba ahi habra que decidir si ese mapa
--      es un trigger o una tabla de catalogo. Es negocio: lo decide ella.
--
--   5. APELLIDOS Y ALIAS EN `persona`, y el nombre sucio de
--      `personas_comunidad` (67 de 542 llevan el piso, la fecha o el telefono
--      metidos dentro del nombre). Apuntado para el dia de doblar las agendas.
-- ===========================================================================

begin;

-- 1 ------------------------------------------------- la tabla comodin
-- Dos columnas y ni un dato mas, a proposito. `id_comodin` no lleva default: no
-- nace aqui, viene de la tabla donde viven los datos.
--
-- Los nueve valores se escriben IGUAL que en `comunidades.figura`, con sus
-- tildes. Mientras las dos listas existan tienen que ser la misma, y el freno
-- (c) del bloque 7 lo comprueba comparandolas de verdad.

create table public.figura_legal_propietaria (
  id_comodin     uuid        primary key,
  figura         text        not null,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint figura_legal_propietaria_figura_valida check (figura in (
    'Comunidad de Propietarios',
    'Mancomunidad',
    'Entidad Urbanística',
    'Propietario Particular',
    'Propietario Empresa',
    'Subcomunidad',
    'Comunidad sin título constitutivo',
    'Organismo',
    'Copropiedad Particular'
  ))
);

comment on table public.figura_legal_propietaria is
  'Quien es el propietario legal de un acceso. Dos columnas: el id de la fila '
  'donde viven sus datos, y que clase de figura es. Los datos NO estan aqui: '
  'estan en `comunidades`, `empresas_propietarias`, `inmueble_varios_titulares`, '
  '`persona` u `organismos`, segun lo que diga `figura`.';

comment on column public.figura_legal_propietaria.id_comodin is
  'El id de la fila que guarda los datos de esta figura, en la tabla que dice '
  '`figura`. No se genera aqui. Para una comunidad es `comunidades.id`, asi que '
  'lo que hoy apunta a la comunidad seguira valiendo sin mover un dato.';

create trigger trg_set_actualizado_en before update on public.figura_legal_propietaria
  for each row execute function public.set_actualizado_en();

-- 2 ------------------------------------- la casa con varios duenos
-- "Tabla propia, como las comunidades. Es mismo esquema: arriba una entidad,
-- debajo, varias personas."
--
-- No lleva CIF: una copropiedad no tiene uno, tiene tantos NIF como duenos, y
-- esos van en la persona. `nombre` es opcional a proposito: su nombre natural
-- es la direccion, y la direccion vive en `accesos`.

create table public.inmueble_varios_titulares (
  id             uuid        primary key default gen_random_uuid(),
  nombre         text,
  activa         boolean     not null default true,
  notas          text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table public.inmueble_varios_titulares is
  'La cosa legal "la casa con sus bienes": un inmueble con varios propietarios '
  'particulares y sin junta. Arriba esta entidad, debajo sus titulares, que son '
  'personas con su puesto. Su figura es `Copropiedad Particular`.';

comment on column public.inmueble_varios_titulares.nombre is
  'Como la llamamos nosotros. Puede estar vacio: su nombre natural es la '
  'direccion, y la direccion esta en `accesos`.';

create trigger trg_set_actualizado_en before update on public.inmueble_varios_titulares
  for each row execute function public.set_actualizado_en();

-- 3 ------------------------------------------- empresas propietarias
-- NO es `empresa` (279 filas, todas administraciones de fincas) ni `contratas`.
-- Su regla del 10-sep: "BAJO NINGUN CONCEPTO QUIERO JUNTAR ADMINISTRACIONES Y
-- CONTRATAS EN UNA MISMA TABLA", y el motivo que dio hoy vale igual aqui: los
-- datos de entidad no se parecen.
--
-- Mismos nombres de columna que `empresa`, para no inventar convenciones:
-- `nombre_accesalia` (como la llamamos) y `nombre_legal` (el de la tarjeta).

create table public.empresas_propietarias (
  id               uuid        primary key default gen_random_uuid(),
  nombre_accesalia text        not null,
  nombre_legal     text,
  cif              text,
  direccion        text,
  activa           boolean     not null default true,
  notas            text,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);

comment on table public.empresas_propietarias is
  'Empresas que son PROPIETARIAS de un acceso: un local, una nave, un edificio. '
  'Nada que ver con `empresa` -administraciones de fincas- ni con `contratas`. '
  'Su figura es `Propietario Empresa`.';

create trigger trg_set_actualizado_en before update on public.empresas_propietarias
  for each row execute function public.set_actualizado_en();

-- 4 -------------------------- la figura nueva en el CHECK de `comunidades`
-- Se rehace el CHECK con las nueve. Las ocho de antes se copian LETRA POR LETRA
-- de como estaban -tildes incluidas-: un valor que casa en una tabla y no en la
-- otra es el peor fallo posible aqui, y el freno (c) lo vigila.

alter table public.comunidades drop constraint comunidades_figura_check;

alter table public.comunidades add constraint comunidades_figura_check check (
  figura is null or figura in (
    'Comunidad de Propietarios',
    'Mancomunidad',
    'Entidad Urbanística',
    'Propietario Particular',
    'Propietario Empresa',
    'Subcomunidad',
    'Comunidad sin título constitutivo',
    'Organismo',
    'Copropiedad Particular'
  )
);

comment on column public.comunidades.figura is
  'PROVISIONAL. La verdad pasa a vivir en `figura_legal_propietaria`. Esta '
  'columna se queda mientras solo 8 de 1.214 filas tengan figura conocida, y se '
  'retira cuando la tabla comodin este poblada. No escribir aqui sin escribir '
  'alli tambien.';

-- 5 ------------------------------ AQUI NO SE CARGA NINGUN DATO
-- La tabla comodin nace VACIA, y es una correccion suya:
--
--   "no era que completaramos datos, SOLO crear las tablas, por que te
--    adelantas??? (...) donde ves aqui que fueramos a llevarnos datos a ningun
--    sitio, y mas si hay datos que no eran evidentes y que has decidido TU que
--    hacer con ellos sin preguntar?"
--
-- Tenia escrito aqui un insert de 7 filas y una exclusion de otras 4 decidida
-- por mi cuenta. Fuera. Quien se lleva a la tabla comodin, cuando y con que
-- figura, se decide aparte y lo decide ella.

-- 6 ------------------------------------- el apuntador de `puesto`
-- "Me parece ok lo del comodin en puesto, resuelve muchas cosas. No lo creamos
-- antes porque no habiamos llegado a este punto de complejidad."
--
-- Hoy entra solo el tramo que tiene a donde apuntar: la figura propietaria. Y
-- es una clave ajena de VERDAD, no un comodin, porque la figura es UNA tabla.
-- Con esto los duenos de una copropiedad son puestos con cargo de propietario,
-- y el presidente de una comunidad sera un puesto el dia que se doblen las
-- agendas -con `desde` y `hasta`, que es el historial que pidio para la ficha
-- de persona y que hoy no existe en `personas_comunidad`-.
--
-- El comodin ANCHO de `puesto` (ayuntamiento, junta de distrito, ECU, colegio
-- profesional, banco, empresa de servicios) no entra hoy porque esas tablas no
-- existen: no se puede apuntar a lo que no esta. Queda para cuando se creen.

alter table public.puesto
  add column figura_legal_propietaria_id uuid
    references public.figura_legal_propietaria(id_comodin) on delete set null;

create index puesto_figura_legal_propietaria_id_idx
  on public.puesto(figura_legal_propietaria_id)
  where figura_legal_propietaria_id is not null;

comment on column public.puesto.figura_legal_propietaria_id is
  'De que figura propietaria es esta persona: presidente de una comunidad, '
  'propietario de una copropiedad, apoderado de una empresa propietaria. '
  '`cargo` dice de que, y `desde`/`hasta` desde cuando.';

-- O una cosa o la otra, nunca las dos: mismo patron que su regla
-- `oportunidad_contacto_real_o_provisional`. Un puesto es en una administracion
-- de fincas O en una figura propietaria.
alter table public.puesto add constraint puesto_en_administracion_o_en_figura check (
  figura_legal_propietaria_id is null
  or (empresa_id is null and departamento_id is null)
);

-- 7 ------------------------------------------------------- FRENOS
-- Si algo de esto no cuadra, no se guarda nada.
do $$
declare
  figuras     int;
  tablas      int;
  distintas   int;
  raras       int;
begin
  -- a) la tabla comodin tiene que quedar VACIA: hoy no se mueve ningun dato
  select count(*) into figuras from public.figura_legal_propietaria;
  if figuras <> 0 then
    raise exception 'La tabla comodin deberia quedar vacia y tiene % filas. Nada hecho.', figuras;
  end if;

  -- b) las tres tablas existen
  select count(*) into tablas from information_schema.tables
  where table_schema = 'public'
    and table_name in ('figura_legal_propietaria','inmueble_varios_titulares',
                       'empresas_propietarias');
  if tablas <> 3 then
    raise exception 'Esperaba 3 tablas nuevas y hay %. Nada hecho.', tablas;
  end if;

  -- c) LAS DOS LISTAS SON LA MISMA. Se saca de cada CHECK la lista de valores
  --    entre comillas y se compara en los dos sentidos: la diferencia tiene que
  --    ser cero. Asi, si algun dia alguien anade un valor a una sola de las dos,
  --    la migracion que lo haga se cae.
  with valores as (
    select c.conname,
           (regexp_matches(pg_get_constraintdef(c.oid), '''([^'']+)''', 'g'))[1] as v
    from pg_constraint c
    where c.conname in ('comunidades_figura_check',
                        'figura_legal_propietaria_figura_valida')
  )
  select count(*) into distintas from (
    (select v from valores where conname = 'comunidades_figura_check'
     except
     select v from valores where conname = 'figura_legal_propietaria_figura_valida')
    union all
    (select v from valores where conname = 'figura_legal_propietaria_figura_valida'
     except
     select v from valores where conname = 'comunidades_figura_check')
  ) d;
  if distintas <> 0 then
    raise exception 'Las dos listas de figuras difieren en % valores. Nada hecho.', distintas;
  end if;

  -- d) ninguna figura YA ESCRITA se queda fuera del CHECK nuevo. Las 8 que hay
  --    hoy las escribio la tanda de Alcobendas, una por tarjeta leida.
  select count(*) into raras from public.comunidades
  where figura is not null and figura not in (
    'Comunidad de Propietarios','Mancomunidad','Entidad Urbanística',
    'Propietario Particular','Propietario Empresa','Subcomunidad',
    'Comunidad sin título constitutivo','Organismo','Copropiedad Particular');
  if raras <> 0 then
    raise exception 'Hay % figuras escritas que el CHECK nuevo no admite. Nada hecho.', raras;
  end if;
end $$;

commit;

-- ===========================================================================
-- COMPROBACION (aparte):
--
--   select count(*) from figura_legal_propietaria;                        -- 0
--
--   select count(*) from information_schema.tables where table_schema='public'
--     and table_name in ('figura_legal_propietaria','inmueble_varios_titulares',
--                        'empresas_propietarias');                        -- 3
--
--   select count(*) from information_schema.columns
--   where table_name='puesto' and column_name='figura_legal_propietaria_id'; -- 1
-- ===========================================================================
