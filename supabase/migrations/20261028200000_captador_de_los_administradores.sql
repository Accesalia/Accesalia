-- CAPTADOR, QUIEN LO LLEVA Y CONSOLIDADO, SEPARADOS (Monica, 28-oct-2026).
--
--   · Captador: quien lo trajo la primera vez. «El que primero lo crea es su
--     captador, si o si.» No cambia nunca.
--   · Quien lo lleva (comercial_id): desde el primer dia, su captador; solo
--     direccion lo cambia de manos o lo libera, en la ficha del administrador.
--   · Consolidado: con su primera hoja firmada. Solo dice «nos ha servido».
--
-- El captador no constaba en casi ninguno (12 de 574): se rellena.
--   · Primera opp antes de abril de 2025: Daniel («hasta abril de 2025 era el
--     unico comercial: toda la cartera la ha construido el»).
--   · Sin ninguna opp: Daniel (son todos cargas de la migracion, ninguno creado
--     a mano por un comercial).
--   · Primera opp desde abril de 2025: el comercial de esa primera opp.
--   · Los nuevos que ya tenian captador y nadie los llevaba: los lleva su captador.

-- 1. Rellenar un captador que no consta no es cambiarlo: la regla de congelar
--    sigue impidiendo cambiar uno que ya existe.
create or replace function public.congelar_captador_consolidado()
returns trigger language plpgsql as $$
begin
  if old.consolidado
     and old.comercial_captador_id is not null
     and new.comercial_captador_id is distinct from old.comercial_captador_id then
    raise exception 'Este administrador ya está consolidado: su captador no se cambia.';
  end if;
  return new;
end;
$$;

-- 2. ANTES DE RELLENAR NADA: los que ya tenian captador y nadie los llevaba (los
--    nuevos, desde el 13-oct): los lleva su captador.
update public.puesto p
   set comercial_id = p.comercial_captador_id
 where p.hasta is null and p.contrata_id is null and p.figura_legal_propietaria_id is null
   and p.comercial_captador_id is not null and p.comercial_id is null
   and ((p.empresa_id is null and p.cargo ilike 'administrador%')
        or exists (select 1 from public.empresa e where e.id = p.empresa_id and e.tipo = 'administracion_fincas' and e.comercial_id is null));

-- Los administradores: de una administracion de fincas, o sueltos con cargo de administrador.
create temporary table admins_captador as
select p.id,
       (select o.comercial_id
          from public.administradores_de_oportunidad v
          join public.oportunidades o on o.id = v.oportunidad_id
         where v.puesto_id = p.id and o.fecha_apertura is not null
         order by o.fecha_apertura asc limit 1) as comercial_primera,
       (select min(o.fecha_apertura)
          from public.administradores_de_oportunidad v
          join public.oportunidades o on o.id = v.oportunidad_id
         where v.puesto_id = p.id) as primera
  from public.puesto p
  left join public.empresa e on e.id = p.empresa_id
 where p.hasta is null and p.contrata_id is null and p.figura_legal_propietaria_id is null
   and (e.tipo = 'administracion_fincas' or (p.empresa_id is null and p.cargo ilike 'administrador%'))
   and p.comercial_captador_id is null;

-- 3. Antes de abril de 2025, o sin ninguna opp: Daniel.
update public.puesto p
   set comercial_captador_id = (select id from public.comerciales where iniciales = 'DAN')
  from admins_captador a
 where a.id = p.id and (a.primera is null or a.primera < '2025-04-01');

-- 4. Desde abril de 2025: el comercial de su primera opp.
update public.puesto p
   set comercial_captador_id = a.comercial_primera
  from admins_captador a
 where a.id = p.id and a.primera >= '2025-04-01' and a.comercial_primera is not null;

drop table admins_captador;

-- 5. (Monica, 28-oct: «aplicamos los 29 directamente») Los que seguian sin nadie
--    que los llevara, ya con captador: los lleva su captador. 29 filas.
update public.puesto p
   set comercial_id = p.comercial_captador_id
 where p.hasta is null and p.contrata_id is null and p.figura_legal_propietaria_id is null
   and p.comercial_captador_id is not null and p.comercial_id is null
   and ((p.empresa_id is null and p.cargo ilike 'administrador%')
        or exists (select 1 from public.empresa e where e.id = p.empresa_id and e.tipo = 'administracion_fincas' and e.comercial_id is null));
