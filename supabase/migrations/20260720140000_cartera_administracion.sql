-- =============================================================================
-- ERP Accesalia — Cartera a nivel ADMINISTRACION de fincas
--
-- La cartera comercial pivota: la unidad es la administracion de fincas, no la
-- persona. El comercial dueno y las fechas de cartera (que en la fase comercial
-- se pusieron en administradores, cuando admin=persona=cliente) se llevan a
-- administraciones_fincas, que es como esta en Monday ("Comercial interno") y como
-- se piensa el negocio: toda oportunidad de esta administracion se deriva a su
-- comercial, y lo que traiga CUALQUIER persona de ella cuenta para el mismo.
--
-- Las columnas equivalentes en administradores quedan DEPRECATED (comment); no se
-- borran para no romper nada (estan vacias en la practica).
--
-- Convenciones: espanol sin tildes/enes; indices en FKs; el trigger de ultimo
-- contacto se amplia para burbujear a la administracion.
-- =============================================================================

alter table administraciones_fincas
  add column comercial_id           uuid references comerciales (id),
  add column comercial_captador_id  uuid references comerciales (id),
  add column fecha_alta_cartera      date,
  add column fecha_ultimo_contacto   timestamptz,
  add column fecha_ultimo_encargo    timestamptz;

comment on column administraciones_fincas.comercial_id is 'Comercial DUENO de la cartera de esta administracion: toda oportunidad futura se le deriva. Lo que traiga cualquier persona de la administracion cuenta para el. (Antes en administradores.comercial_id, ahora aqui).';
comment on column administraciones_fincas.comercial_captador_id is 'Comercial que ABRIO esta administracion (puede diferir del dueno). Con fecha_alta_cartera mide apertura de cartera por comercial.';
comment on column administraciones_fincas.fecha_alta_cartera is 'Fecha de alta comercial (apertura de cartera). Distinta de creado_en (alta en el sistema).';
comment on column administraciones_fincas.fecha_ultimo_contacto is 'Enchufe de IA: ultimo contacto con esta administracion (el mayor entre sus personas). Lo mantiene el trigger desde interacciones.';
comment on column administraciones_fincas.fecha_ultimo_encargo is 'Enchufe de IA: ultimo trabajo que trajo esta administracion.';

create index idx_administraciones_fincas_comercial_id          on administraciones_fincas (comercial_id);
create index idx_administraciones_fincas_comercial_captador_id on administraciones_fincas (comercial_captador_id);
create index idx_administraciones_fincas_fecha_ultimo_contacto on administraciones_fincas (fecha_ultimo_contacto);

-- Deprecar los equivalentes a nivel persona (no se borran; quedan vacios).
comment on column administradores.comercial_id is 'DEPRECATED (fase CRM): la cartera pivota a la administracion. Usar administraciones_fincas.comercial_id.';
comment on column administradores.comercial_captador_id is 'DEPRECATED (fase CRM): usar administraciones_fincas.comercial_captador_id.';
comment on column administradores.fecha_alta_administrador is 'DEPRECATED (fase CRM): usar administraciones_fincas.fecha_alta_cartera.';


-- =============================================================================
-- Ampliar el trigger de ultimo contacto: ademas de la persona, burbujear a su
-- administracion (solo si es mas reciente, para no retroceder).
-- =============================================================================
create or replace function actualizar_ultimo_contacto_admin()
returns trigger
language plpgsql
as $$
declare
  adm      uuid;
  admin_af uuid;
begin
  adm := new.administrador_id;
  if adm is null and new.oportunidad_id is not null then
    select administrador_id into adm from oportunidades where id = new.oportunidad_id;
  end if;
  if adm is not null and new.fecha_evento is not null then
    update administradores
       set fecha_ultimo_contacto = greatest(coalesce(fecha_ultimo_contacto, new.fecha_evento::timestamptz), new.fecha_evento::timestamptz)
     where id = adm
    returning administracion_id into admin_af;

    if admin_af is not null then
      update administraciones_fincas
         set fecha_ultimo_contacto = greatest(coalesce(fecha_ultimo_contacto, new.fecha_evento::timestamptz), new.fecha_evento::timestamptz)
       where id = admin_af;
    end if;
  end if;
  return null;
end;
$$;

comment on function actualizar_ultimo_contacto_admin() is 'AFTER INSERT en interacciones: avanza fecha_ultimo_contacto de la persona (administradores) y burbujea a su administracion (administraciones_fincas), usando fecha_evento y solo si es mas reciente.';
