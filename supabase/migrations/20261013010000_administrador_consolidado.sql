-- =====================================================================
-- ADMINISTRADOR CONSOLIDADO / NO CONSOLIDADO
-- Monica, 13-oct-2026.
--
-- "Un admin solo ES de un comercial TRAS LA PRIMERA hoja firmada." Crear un
-- administrador no lo mete en la cartera de nadie: "me conozco a los
-- comerciales y su picaresca: van a Google, sacan administraciones y se las
-- crean como suyas para que no se las quite nadie, y no han ido a verles".
-- Mientras no hay hoja firmada, esta en "posibles, no consolidados" de quien
-- lo trajo, para que le insistan hasta que les den una direccion.
--
-- La cartera vive en el PUESTO de cada gestor (8-oct-2026: "lo que pertenece a
-- un comercial son las personas, una a una"):
--
--                    | NO CONSOLIDADO              | CONSOLIDADO
--   captador         | quien lo creo; SE PUEDE     | CONGELADO: la base no
--   (comercial_      | cambiar (si otro acaba      | deja cambiarlo
--    captador_id)    | trabajando con el)          |
--   quien lo lleva   | NADIE: no tiene dueño       | el captador (y despues
--   (comercial_id)   |                             | se puede reasignar)
--
-- CONSOLIDAR ES AUTOMATICO: cuando una hoja de encargo pasa a firmada, el
-- administrador de esa oportunidad, si no lo estaba, se consolida con el
-- comercial de esa oportunidad: "captador = el que firma lo primero con el".
--
-- LO HISTORICO: todos los gestores que ya tienen comercial salen de encargos
-- firmados, asi que se marcan consolidados. Su fecha, la de su primera hoja
-- firmada si se encuentra; si no, vacia (no se inventa).
-- =====================================================================

alter table public.puesto
  add column consolidado    boolean not null default false,
  add column consolidado_en date;

comment on column public.puesto.consolidado is
  'Si este gestor ya es de un comercial: tras su PRIMERA hoja de encargo firmada (Monica, 13-oct-2026). Sin consolidar no tiene dueño (comercial_id vacio) y el captador se puede cambiar; consolidado, el captador queda congelado.';
comment on column public.puesto.consolidado_en is
  'Fecha de la primera hoja firmada con este gestor. Vacia en los historicos sin hoja localizable.';

-- 1 · Lo historico: los que ya tienen comercial, consolidados.
update public.puesto p
   set consolidado = true,
       consolidado_en = (
         select min(h.fecha_firma)
           from public.hojas_encargo h
           join public.oportunidades o on o.id = h.oportunidad_id
          where h.fecha_firma is not null
            and (o.puesto_id = p.id or o.administrador_puesto_id = p.id)
       )
 where p.comercial_id is not null;

-- 2 · El captador de un consolidado no se toca.
create or replace function public.congelar_captador_consolidado()
returns trigger
language plpgsql as $$
begin
  if old.consolidado and new.comercial_captador_id is distinct from old.comercial_captador_id then
    raise exception 'Este administrador ya está consolidado: su captador no se cambia.';
  end if;
  return new;
end;
$$;

create trigger trg_congelar_captador_consolidado
  before update of comercial_captador_id on public.puesto
  for each row
  execute function public.congelar_captador_consolidado();

-- 3 · Consolidar al firmar.
create or replace function public.consolidar_admin_al_firmar()
returns trigger
language plpgsql as $$
declare
  o record;
  admin uuid;
begin
  if new.oportunidad_id is null then
    return new;
  end if;
  select op.comercial_id, op.administrador_puesto_id, op.puesto_id into o
    from public.oportunidades op where op.id = new.oportunidad_id;
  if o.comercial_id is null then
    return new;
  end if;

  -- El administrador de la oportunidad; si no lo tiene, su contacto, si es
  -- un gestor de administracion (no de una contrata).
  admin := o.administrador_puesto_id;
  if admin is null and o.puesto_id is not null then
    select pu.id into admin from public.puesto pu where pu.id = o.puesto_id and pu.contrata_id is null;
  end if;
  if admin is null then
    return new;
  end if;

  update public.puesto
     set consolidado = true,
         consolidado_en = coalesce(new.fecha_firma, (now() at time zone 'Europe/Madrid')::date),
         comercial_captador_id = o.comercial_id,
         comercial_id = o.comercial_id
   where id = admin and not consolidado;
  return new;
end;
$$;

comment on function public.consolidar_admin_al_firmar() is
  'Al firmarse una hoja, el administrador de su oportunidad pasa a la cartera del comercial que la firma, si aun no era de nadie (Monica, 13-oct-2026).';

create trigger trg_consolidar_admin_al_firmar
  after update of fecha_firma, estado on public.hojas_encargo
  for each row
  when (new.estado = 'devuelta_firmada' and old.estado is distinct from 'devuelta_firmada')
  execute function public.consolidar_admin_al_firmar();

create index puesto_posibles_idx on public.puesto (comercial_captador_id) where not consolidado;
