-- REVISION DE OFERTAS (Monica, 14-oct-2026). Antes de mandar la oferta a la
-- comunidad, alguien con la funcion REVISION DE OFERTAS le da el ok. Es un
-- PAQUETE: hoja(s) + presupuesto (siempre) + viabilidad (a veces), porque "si
-- cambia un precio en la hoja, el presupuesto y la viabilidad tambien lo reflejan".
--
--   - FUNCION PROPIA, no la de responsable tecnico: la mesa de viabilidades no ve
--     nuestros honorarios, "Alex ni sabe ni le incumbe cuanto cobramos". Hoy la
--     tienen Daniel y Monica, "pero no por ser direccion": mañana sera de quien
--     se encargue de las revisiones economicas.
--   - Quien revisa SOLO da el ok o pide cambios (con comentario): "la hoja la
--     toca solo el comercial, SOLO SUS MANOS".
--   - Cada envio guarda la VERSION EXACTA de cada documento. Ok vigente = el
--     ultimo envio esta en ok y nada de su paquete ha cambiado despues; si
--     cambia, la escalera vuelve sola a "falta el ok".
--   - El bucle (piden modificar la oferta) es otro envio, el siguiente numero.

insert into public.funciones (clave, nombre, descripcion, orden, activa, ve_todo)
values ('revision_ofertas', 'Revision de ofertas',
        'Da el ok (o pide cambios) al paquete de la oferta -hoja, presupuesto y viabilidad- antes de enviarlo a la comunidad. No edita: la hoja la toca solo el comercial.',
        (select coalesce(max(orden), 0) + 1 from public.funciones), true, false)
on conflict (clave) do nothing;

-- Ve las oportunidades (sus documentos) para revisarlas.
insert into public.funcion_areas (funcion_id, area_id, nivel)
select f.id, a.id, 'ver' from public.funciones f, public.areas a
where f.clave = 'revision_ofertas' and a.clave = 'comercial'
  and not exists (select 1 from public.funcion_areas x where x.funcion_id = f.id and x.area_id = a.id);

-- Hoy: Daniel y Monica.
insert into public.equipo_funciones (equipo_id, funcion_id, desde, notas)
select e.id, f.id, current_date, 'Revision de ofertas (Monica, 14-oct-2026): de momento Daniel y Monica, no por ser direccion.'
from public.equipo e, public.funciones f
where f.clave = 'revision_ofertas'
  and ((e.nombre = 'Daniel' and e.apellidos = 'de Soto') or (e.nombre = 'Monica' and e.apellidos = 'Favieres'))
  and not exists (select 1 from public.equipo_funciones x where x.equipo_id = e.id and x.funcion_id = f.id and x.hasta is null);

create table if not exists public.revisiones_oferta (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid not null references public.oportunidades(id),
  numero integer not null,
  enviada_en timestamptz not null default now(),
  enviada_por uuid references public.equipo(id),
  nota text,
  estado text not null default 'pendiente',
  resuelta_en timestamptz,
  resuelta_por uuid references public.equipo(id),
  comentario text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint revisiones_oferta_estado_check check (estado in ('pendiente', 'ok', 'cambios', 'superada')),
  constraint revisiones_oferta_cambios_con_comentario check (estado <> 'cambios' or btrim(coalesce(comentario, '')) <> ''),
  constraint revisiones_oferta_resuelta check ((estado in ('ok', 'cambios')) = (resuelta_en is not null)),
  unique (oportunidad_id, numero)
);
comment on table public.revisiones_oferta is 'Cada vez que se pide el ok a la oferta (el paquete). Estado: pendiente, ok, cambios (pide cambios, con comentario) o superada (llego otro envio antes de resolverse).';

create table if not exists public.revisiones_oferta_documentos (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.revisiones_oferta(id) on delete cascade,
  version_hoja_id uuid references public.versiones_hoja(id),
  viabilidad_id uuid references public.viabilidades(id),
  viabilidad_version integer,
  presupuesto_id uuid references public.presupuestos(id),
  presupuesto_generado_en timestamptz,
  constraint revisiones_oferta_documentos_uno check (num_nonnulls(version_hoja_id, viabilidad_id, presupuesto_id) = 1),
  constraint revisiones_oferta_documentos_viab_version check (viabilidad_id is null or viabilidad_version is not null)
);
comment on table public.revisiones_oferta_documentos is 'Lo que llevaba el paquete, CLAVADO a su version: la version exacta de cada hoja, la viabilidad con su numero de version y el presupuesto con su fecha de generacion. Si cambian despues del ok, el ok deja de valer.';

create index if not exists revisiones_oferta_opp on public.revisiones_oferta (oportunidad_id, numero desc);
create index if not exists revisiones_oferta_pendientes on public.revisiones_oferta (estado) where estado = 'pendiente';
create index if not exists revisiones_oferta_documentos_revision on public.revisiones_oferta_documentos (revision_id);
alter table public.revisiones_oferta enable row level security;
alter table public.revisiones_oferta_documentos enable row level security;
