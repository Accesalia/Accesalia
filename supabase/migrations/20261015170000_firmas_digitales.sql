-- FIRMAS DIGITALES (Monica, 15-oct-2026). El almacen de los certificados de
-- firma de cada titular, para que la app firme sola y "cada pantalla sepa con
-- que firmar".
--
--   - Hoy, tres titulares, los de empresas_emisoras: Accesalia (empresa),
--     Daniel (autonomo; para subvenciones) y Ecobalance (empresa; contratos).
--   - El primer uso: el OK A LA OFERTA. Al dar el ok, la app firma el paquete
--     (hojas, presupuesto, viabilidad) con la firma de Accesalia y el comercial
--     manda los firmados, nunca los sin firmar.
--   - El acceso, "como ahora": la funcion de direccion y quien Monica autorice
--     (funcion firmas_digitales) suben y retiran certificados y eligen la firma
--     de cada uso. Firmar, lo hace la pantalla de cada uso para quien la tenga
--     (el ok a la oferta, quien tiene revision_ofertas).
--   - El certificado (.p12) y su contraseña van CIFRADOS en el Vault de
--     Supabase; aqui solo su referencia y lo que dice el certificado. Ni la
--     pantalla ni la API los devuelven: solo la funcion firma_material, que
--     solo puede llamar el servidor.
--   - Nada se borra: renovar = subir el nuevo (el anterior queda retirado, con
--     fecha). Cada firma puesta queda apuntada en firmas_aplicadas.

insert into public.funciones (clave, nombre, descripcion, orden, activa, ve_todo)
values ('firmas_digitales', 'Firmas digitales',
        'Sube, renueva y retira los certificados de firma digital (Accesalia, Daniel, Ecobalance) y elige con que firma se firma cada uso. Direccion la tiene siempre.',
        (select coalesce(max(orden), 0) + 1 from public.funciones), true, false)
on conflict (clave) do nothing;

create table if not exists public.firmas_digitales (
  id uuid primary key default gen_random_uuid(),
  empresa text not null references public.empresas_emisoras(clave),
  -- Lo que dice el certificado, leido al subirlo.
  titular text not null,
  nif text,
  organizacion text,
  emisor text not null,
  valido_desde timestamptz not null,
  valido_hasta timestamptz not null,
  huella text not null,
  -- El .p12 (en base64) y su contraseña, en vault.secrets.
  secreto_certificado uuid not null,
  secreto_clave uuid not null,
  subida_en timestamptz not null default now(),
  subida_por uuid references public.equipo(id),
  retirada_en timestamptz,
  retirada_por uuid references public.equipo(id),
  notas text
);
comment on table public.firmas_digitales is 'Los certificados de firma digital, uno vivo por titular (empresas_emisoras). El .p12 y su contraseña van cifrados en el Vault; aqui su referencia y lo que dice el certificado. Renovar = subir otro; el anterior queda retirado.';
create unique index if not exists firmas_digitales_una_viva on public.firmas_digitales (empresa) where retirada_en is null;

create table if not exists public.firmas_usos (
  clave text primary key,
  nombre text not null,
  descripcion text,
  empresa text references public.empresas_emisoras(clave),
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references public.equipo(id)
);
comment on table public.firmas_usos is 'Con que firma se firma cada cosa: cada uso (una pantalla que firma) apunta al titular cuya firma viva usa. Un uso nuevo nace con su pantalla.';

insert into public.firmas_usos (clave, nombre, descripcion, empresa)
values ('ok_oferta', 'Ok a la oferta',
        'Al dar el ok al paquete de la oferta se firman sus PDF (hojas, presupuesto y viabilidad) y el comercial envía los firmados.',
        'accesalia')
on conflict (clave) do nothing;

create table if not exists public.firmas_aplicadas (
  id uuid primary key default gen_random_uuid(),
  firma_id uuid not null references public.firmas_digitales(id),
  uso text not null references public.firmas_usos(clave),
  -- Que documento: "hoja:<version>", "presupuesto:<id>", "viabilidad:<id>".
  documento text not null,
  -- SHA-256 del PDF tal cual estaba sin firmar: el envio busca por aqui si ese
  -- PDF exacto tiene su firmado.
  huella_original text not null,
  ruta text not null,
  revision_id uuid references public.revisiones_oferta(id),
  firmado_en timestamptz not null default now(),
  firmado_por uuid references public.equipo(id)
);
comment on table public.firmas_aplicadas is 'Cada PDF firmado por la app: con que firma, para que uso, de que documento, donde esta el firmado (ruta del almacen) y la huella del original, para que el envio adjunte el firmado en lugar del original.';
create index if not exists firmas_aplicadas_huella on public.firmas_aplicadas (huella_original, firmado_en desc);
create index if not exists firmas_aplicadas_revision on public.firmas_aplicadas (revision_id);

alter table public.firmas_digitales enable row level security;
alter table public.firmas_usos enable row level security;
alter table public.firmas_aplicadas enable row level security;

-- Guardar un certificado: lo mete en el Vault, retira el vivo del titular y
-- apunta el nuevo. Todo junto o nada.
create or replace function public.firma_guardar(
  p_empresa text, p_p12_base64 text, p_clave text,
  p_titular text, p_nif text, p_organizacion text, p_emisor text,
  p_valido_desde timestamptz, p_valido_hasta timestamptz, p_huella text,
  p_por uuid
) returns uuid
language plpgsql security definer set search_path = public, vault
as $$
declare
  v_cert uuid;
  v_clave uuid;
  v_id uuid;
begin
  v_cert := vault.create_secret(p_p12_base64, null, 'Certificado de firma de ' || p_empresa || ' (' || p_titular || ')');
  v_clave := vault.create_secret(p_clave, null, 'Contraseña del certificado de firma de ' || p_empresa);
  update public.firmas_digitales set retirada_en = now(), retirada_por = p_por
   where empresa = p_empresa and retirada_en is null;
  insert into public.firmas_digitales (empresa, titular, nif, organizacion, emisor, valido_desde, valido_hasta, huella,
                                       secreto_certificado, secreto_clave, subida_por)
  values (p_empresa, p_titular, p_nif, p_organizacion, p_emisor, p_valido_desde, p_valido_hasta, p_huella, v_cert, v_clave, p_por)
  returning id into v_id;
  return v_id;
end;
$$;

-- El certificado y su contraseña, para firmar. Solo el servidor.
create or replace function public.firma_material(p_firma uuid)
returns table (p12_base64 text, clave text)
language sql security definer set search_path = public, vault
as $$
  select c.decrypted_secret, k.decrypted_secret
  from public.firmas_digitales f
  join vault.decrypted_secrets c on c.id = f.secreto_certificado
  join vault.decrypted_secrets k on k.id = f.secreto_clave
  where f.id = p_firma and f.retirada_en is null;
$$;

revoke all on function public.firma_guardar(text, text, text, text, text, text, text, timestamptz, timestamptz, text, uuid) from public, anon, authenticated;
revoke all on function public.firma_material(uuid) from public, anon, authenticated;
grant execute on function public.firma_guardar(text, text, text, text, text, text, text, timestamptz, timestamptz, text, uuid) to service_role;
grant execute on function public.firma_material(uuid) to service_role;
