-- Ajustes al equipo que da Monica despues de la carga de correos (11-sep-2026).
--   - Alejandro Bello: baja de proyectos en junio de 2026 y alta en IEE en julio.
--     Solo se sabe el mes: se pone el ultimo dia de junio y el primero de julio,
--     y se dice en la nota.
--   - Claribel: su correo nominativo es csalazar.accesalia@gmail.com.

do $$
declare n int;
begin
  update equipo_funciones ef
     set hasta = date '2026-06-30',
         notas = 'Baja de proyectos en junio de 2026 (Monica). Se sabe el mes, no el dia.'
    from funciones f, equipo e
   where ef.funcion_id = f.id and f.clave = 'proyecto'
     and ef.equipo_id = e.id and e.nombre = 'Alejandro' and e.apellidos = 'Bello';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Proyecto de Alejandro: esperaba 1, han salido %', n; end if;

  update equipo_funciones ef
     set desde = date '2026-07-01',
         notas = 'Alta en IEE en julio de 2026 (Monica). Se sabe el mes, no el dia.'
    from funciones f, equipo e
   where ef.funcion_id = f.id and f.clave = 'iee' and ef.hasta is null
     and ef.equipo_id = e.id and e.nombre = 'Alejandro' and e.apellidos = 'Bello';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'IEE de Alejandro: esperaba 1, han salido %', n; end if;

  update equipo
     set email = 'csalazar.accesalia@gmail.com',
         notas = 'Arquitecta: proyectos.'
   where nombre = 'Claribel' and apellidos = 'Salazar';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Claribel: esperaba 1, han salido %', n; end if;
end $$;
