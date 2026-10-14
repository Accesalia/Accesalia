-- LA CITA, COMPLETA (Monica, 14-oct-2026): "da igual de que sea la cita, todas
-- son iguales: dia, hora, quien, que, texto y adjuntos".
--
-- PARA QUE (imprescindible): "el 90% de las veces he visto a los comerciales ver
-- su agenda y decir: ¿esto de que iba? ¿a que tengo que ir aqui?". Obligatorio.
-- Las que agenda la app lo traen propuesto por la plantilla de su tipo
-- (tipos_cita.plantilla_para_que); se puede cambiar.
--
-- DE QUE: una opp, pero tambien una comunidad, una administracion o una persona
-- (mantener vivo a un administrador no tiene opp).
-- CON QUIEN: tabla aparte, pueden ser varios; una persona de la agenda (con su
-- puesto) o, si no esta, su nombre y telefono a mano (el vecino que abre).
-- ADJUNTOS: la cita no los contiene, APUNTA a ellos: un fichero del almacen o
-- algo que ya existe en la app (hoja, viabilidad, presupuesto, documento). Asi,
-- si cambian, la cita enseña lo ultimo.

alter table public.tipos_cita add column if not exists plantilla_para_que text;
comment on column public.tipos_cita.plantilla_para_que is
  'El "para que" que propone la app al agendar este tipo. {intereses} = lo que dijeron que les interesa.';
update public.tipos_cita set plantilla_para_que = 'Escanear con Polycam para la viabilidad de {intereses}.' where clave = 'escaneo_polycam';

alter table public.citas
  add column if not exists para_que text not null check (btrim(para_que) <> ''),
  add column if not exists comunidad_id uuid references public.comunidades(id),
  add column if not exists empresa_id uuid references public.empresa(id),
  add column if not exists persona_id uuid references public.persona(id),
  add column if not exists direccion text,
  add column if not exists estado text not null default 'pendiente',
  add column if not exists notas text,
  add column if not exists origen text not null default 'persona';
alter table public.citas
  add constraint citas_estado_check check (estado in ('pendiente', 'hecha', 'anulada')),
  add constraint citas_origen_check check (origen in ('persona', 'app'));
comment on column public.citas.para_que is 'PARA QUE voy / llamo / vienen. Obligatorio; sale en la raya de la agenda.';
comment on column public.citas.empresa_id is 'La administracion (empresa) de la que es la cita, si no es de una opp.';
comment on column public.citas.persona_id is 'La persona de la que es la cita, si no es de una opp ni de una administracion.';
comment on column public.citas.direccion is 'Donde: para Maps en la copia de Google.';
comment on column public.citas.estado is 'pendiente, hecha (el gris de Daniel) o anulada.';
comment on column public.citas.notas is 'Que paso en la cita.';
comment on column public.citas.origen is 'La puso una persona o la propuso la app.';

create table if not exists public.citas_con_quien (
  id uuid primary key default gen_random_uuid(),
  cita_id uuid not null references public.citas(id) on delete cascade,
  persona_id uuid references public.persona(id),
  puesto_id uuid references public.puesto(id),
  nombre text,
  telefono text,
  papel text,
  creado_en timestamptz not null default now(),
  constraint citas_con_quien_alguien check (persona_id is not null or btrim(coalesce(nombre, '')) <> '')
);
comment on table public.citas_con_quien is 'Con quien es la cita: una persona de la agenda (con su puesto) o, si no esta, nombre y telefono a mano. papel = presidente, administrador, vecino que abre, comercial de la contrata...';

create table if not exists public.citas_adjuntos (
  id uuid primary key default gen_random_uuid(),
  cita_id uuid not null references public.citas(id) on delete cascade,
  ruta_almacen text,
  nombre text,
  hoja_encargo_id uuid references public.hojas_encargo(id),
  viabilidad_id uuid references public.viabilidades(id),
  presupuesto_id uuid references public.presupuestos(id),
  documento_id uuid references public.documentos(id),
  creado_en timestamptz not null default now(),
  constraint citas_adjuntos_uno check (num_nonnulls(ruta_almacen, hoja_encargo_id, viabilidad_id, presupuesto_id, documento_id) = 1)
);
comment on table public.citas_adjuntos is 'Lo que lleva la cita: APUNTA a un fichero del almacen o a algo que ya existe en la app; no lo copia.';

create index if not exists citas_con_quien_cita on public.citas_con_quien (cita_id);
create index if not exists citas_adjuntos_cita on public.citas_adjuntos (cita_id);
alter table public.citas_con_quien enable row level security;
alter table public.citas_adjuntos enable row level security;
