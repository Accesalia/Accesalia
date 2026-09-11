-- =============================================================================
-- Equipo: correos de acceso, apellidos y las personas que faltaban
-- (11-sep-2026, con Monica)
--
-- Fuente: "listado correos accesalia" (PDF de Monica). De ese listado SOLO se
-- toman el correo nominativo y los apellidos. Las contraseñas que trae NO se
-- guardan en ningun sitio: con "Entrar con Google" la app no las necesita.
--
-- Decisiones de Monica:
--   - Ella entra con gerencia.accesalia@gmail.com.
--   - Daniel: PENDIENTE. Usa sobre todo su correo personal y ultimamente
--     danieldesoto@accesalia.com; danieldesotoarquitecto@gmail.com es "casi
--     comunitario" y no vale para entrar como el.
--   - Carlos Garcia (comercial "Carlosg") no trabaja aqui desde enero; sus
--     correos de clientes los procesa Alejandra.
--   - Alejandro Bello es el "Alejandro" que figuraba como ex-empleado: antes
--     hacia proyectos y ahora hace IEE.
--   - Faltaban Ivan, Claribel, Alvaro y Mari (limpieza: sin correo ni acceso).
--   - Maria, Marta e Ivan: nadie sabe la contraseña de su Gmail. Monica la
--     pedira; hasta entonces el correo esta, pero no podran entrar.
--
-- OJO: Mari (limpieza) y Maria (subvenciones) son DOS personas.
-- Todo o nada: si algun paso no toca exactamente lo esperado, se deshace.
-- =============================================================================

begin;

do $$
declare
  n int;
  v_alejandro uuid;
begin
  -- 1. Correo nominativo y apellidos de quien ya estaba ------------------------
  with datos(nombre, apellidos, email) as (values
    ('Adriana',     'Arias',      'aarias.accesalia@gmail.com'),
    ('Alexandra',   'Oliveira',   'aoliveira.accesalia@gmail.com'),
    ('Alejandra',   'Pérez',      'aperez.accesalia@gmail.com'),
    ('Ana',         'Santamarta', 'asantamarta.accesalia@gmail.com'),
    ('Angela',      'Acevedo',    'aacevedo.accesalia@gmail.com'),
    ('Carlos Daza', 'Daza',       'cdaza.accesalia@gmail.com'),
    ('Israel',      'Sanz',       'isanz.accesalia@gmail.com'),
    ('Jacob',       'Hernández',  'jdhernandez.accesalia@gmail.com'),
    ('Carla',       'Contreras',  'ccontreras.accesalia@gmail.com'),
    ('Maria',       'Pérez',      'mperez.accesalia@gmail.com'),
    ('Alex',        'Figueroa',   'afigueroa.accesalia@gmail.com'),
    ('Abraham',     'Hernández',  'ahernandez.accesalia@gmail.com'),
    ('Marta',       'Lahoz',      'mlahoz.accesalia@gmail.com'),
    ('Monica',      'Favieres',   'gerencia.accesalia@gmail.com'),
    ('Daniel',      'de Soto',    null)
  )
  update equipo e set apellidos = d.apellidos, email = d.email
    from datos d
   where e.nombre = d.nombre and e.activo;
  get diagnostics n = row_count;
  if n <> 15 then raise exception 'Correos: esperaba 15 personas, han salido %', n; end if;

  -- 2. Alejandro Bello: vuelve a activo, con su nueva funcion -----------------
  update equipo
     set activo = true, apellidos = 'Bello', email = 'abello.accesalia@gmail.com',
         notas = 'Antes arquitecto de proyectos; ahora hace IEE (Monica, 11-sep-2026). Es el "Alejandro" de los proyectos de Monday.'
   where nombre = 'Alejandro' and not activo
  returning id into v_alejandro;
  if v_alejandro is null then raise exception 'No encuentro a Alejandro entre los inactivos'; end if;

  -- Su funcion de proyecto se cierra hoy: se sabe que ya no la tiene, pero no
  -- desde cuando. No se inventa la fecha real.
  update equipo_funciones ef
     set hasta = current_date,
         notas = 'Cerrada al registrar su paso a IEE (11-sep-2026). La fecha real del cambio no se sabe.'
    from funciones f
   where ef.funcion_id = f.id and f.clave = 'proyecto'
     and ef.equipo_id = v_alejandro and ef.hasta is null;

  insert into equipo_funciones (equipo_id, funcion_id)
  select v_alejandro, id from funciones where clave = 'iee';

  -- 3. Las personas que faltaban -------------------------------------------------
  if exists (select 1 from equipo where nombre in ('Ivan','Claribel','Alvaro','Mari')) then
    raise exception 'Alguna de las personas nuevas ya existe: no se crea nada';
  end if;

  insert into equipo (nombre, apellidos, email, es_arquitecto, titulacion, activo, notas) values
    ('Ivan',     'Cuentas', 'icuentas.accesalia@gmail.com', null,  null,        true,
       'Visitas de toma de datos para las IEE y elaboracion de IEE.'),
    ('Claribel', 'Salazar', null,                           true,  'arquitecto', true,
       'Arquitecta: proyectos. Falta su correo nominativo.'),
    ('Alvaro',   'de Soto', 'alvarods.accesalia@gmail.com', null,  null,        true,
       'Comercial.'),
    ('Mari',     null,      null,                           false, null,        true,
       'Limpieza. Esta por nominas y gastos; no tiene acceso a la app. NO es Maria, la de subvenciones.');

  insert into equipo_funciones (equipo_id, funcion_id)
  select e.id, f.id
    from (values ('Ivan','iee'), ('Claribel','proyecto'), ('Alvaro','comercial')) v(nombre, clave)
    join equipo e on e.nombre = v.nombre
    join funciones f on f.clave = v.clave;
  get diagnostics n = row_count;
  if n <> 3 then raise exception 'Funciones de los nuevos: esperaba 3, han salido %', n; end if;

  -- 4. Carlos Garcia ya no esta ------------------------------------------------
  update comerciales
     set activo = false,
         notas = trim(coalesce(notas, '') || ' Dejo Accesalia en enero de 2026; sus correos de clientes los procesa Alejandra.')
   where nombre = 'Carlosg' and activo;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Carlosg: esperaba 1, han salido %', n; end if;
end $$;

commit;
