-- EL SISTEMA NUEVO DE LA HOJA, lo que faltaba (Monica, 24-oct-2026): el bloque «Proyecto conjunto» y las lineas.
--
-- 1. BLOQUE «PROYECTO CONJUNTO»: no existia (el generador guardaba esa fila sin bloque), y cada linea apunta a un
--    bloque. Es un proyecto (area PRY), se cobra, arrastra lo mismo que un proyecto (toma de datos, visado, licencias) y
--    por defecto lleva la forma de pago de un proyecto. En el papel: un parrafo breve que presenta el conjunto y,
--    debajo, cada proyecto con su texto de siempre. «Desglosar precios / solo el total» no es del bloque: es de cada hoja.
-- 2. he_lineas_compromisos: una fila por cada fila de la tabla de la hoja (el arbol), colgada de su version.
-- 3. he_lineas_compromisos_accesos: los portales de cada linea (en TODAS; los de la hoja son la union).

insert into public.bloques (codigo, nombre, nombre_corto, activo, area, naturaleza, desglose, suelto, marca_tambien, orden, va_a_tecnico, va_a_faro, texto_plantilla)
select 'PROYECTO CONJUNTO', 'PROYECTO CONJUNTO', 'Proyecto conjunto', true, 'PRY', 'proyecto', 'se_cobra', true, b.marca_tambien, 2, true, true,
       E'PROYECTO CONJUNTO\n• Redacción conjunta de los proyectos de: '
from public.bloques b where b.codigo = 'REDACCION PROYECTO';

insert into public.he_formas_pago_defecto (forma_pago_id, bloque_id, pagador_tipo)
select fp.id, b.id, 'cualquiera' from public.he_formas_pago fp, public.bloques b
where fp.nombre = '50 % encargo · 50 % entrega' and b.codigo = 'PROYECTO CONJUNTO';

create table public.he_lineas_compromisos (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  version_id uuid not null references public.he_versiones_hoja(id) on delete cascade,
  padre_id uuid references public.he_lineas_compromisos(id) on delete cascade,
  bloque_id uuid not null references public.bloques(id),
  desglose_id uuid references public.tipos_proyecto(id),
  en_papel boolean not null default true,
  se_cobra boolean not null,
  importe numeric,
  porcentaje numeric,
  forma_pago_id uuid references public.he_formas_pago(id),
  forma_pago_propia text,
  texto text,
  desglosar_precios boolean,
  constraint he_lineas_compromisos_cobro_check check (se_cobra or (importe is null and porcentaje is null and forma_pago_id is null and forma_pago_propia is null)),
  constraint he_lineas_compromisos_forma_check check (forma_pago_id is null or forma_pago_propia is null),
  constraint he_lineas_compromisos_porcentaje_check check (porcentaje is null or (porcentaje > 0 and porcentaje <= 100))
);
create index he_lineas_compromisos_version_idx on public.he_lineas_compromisos (version_id);
create index he_lineas_compromisos_padre_idx on public.he_lineas_compromisos (padre_id);
alter table public.he_lineas_compromisos enable row level security;
create policy sali_lector_lee on public.he_lineas_compromisos for select to sali_lector using (true);
comment on table public.he_lineas_compromisos is 'LAS LINEAS DE COMPROMISO de cada version de hoja (sistema nuevo, 24-oct-2026): una fila por cada fila de la tabla de la hoja, en arbol (padre_id). Lo que se compromete hacer, se cobre o no. Lo invariable se lee del bloque; aqui va congelado lo que salio en el papel. A facturacion le pasa lo que lleva precio en el papel; a administracion, todo.';
comment on column public.he_lineas_compromisos.padre_id is 'De que linea cuelga (siempre, sin excepciones). Vacio en las cabeceras de arriba.';
comment on column public.he_lineas_compromisos.bloque_id is 'Que es: el bloque del catalogo.';
comment on column public.he_lineas_compromisos.desglose_id is 'El tipo, en los bloques que piden elegirlo: el del proyecto (rampa, SATE fachada…) o el de la subvencion (accesibilidad, eficiencia energetica).';
comment on column public.he_lineas_compromisos.en_papel is 'Si sale en el papel (el visado o el inicio de obra, no).';
comment on column public.he_lineas_compromisos.se_cobra is 'true = se factura (importe o %); false = incluido: contratado sin coste, pero hay que hacerlo.';
comment on column public.he_lineas_compromisos.importe is 'Importe fijo, congelado tal como salio. En los proyectos de un conjunto con «solo el total», es dato interno: se cobra el conjunto.';
comment on column public.he_lineas_compromisos.porcentaje is 'Cobro a exito: el % (sobre lo que diga el bloque, p. ej. lo concedido).';
comment on column public.he_lineas_compromisos.forma_pago_id is 'La forma de pago establecida que se eligio (he_formas_pago): sus hitos se copian a facturacion.';
comment on column public.he_lineas_compromisos.forma_pago_propia is 'Solo si no se eligio una establecida: el texto escrito a mano (sus hitos se interpretan y se revisan).';
comment on column public.he_lineas_compromisos.texto is 'Solo si el comercial cambio a mano el texto de la linea; vacio = el del bloque.';
comment on column public.he_lineas_compromisos.desglosar_precios is 'Solo en el proyecto conjunto: true = el papel desglosa el precio de cada proyecto; false = solo el total.';

create table public.he_lineas_compromisos_accesos (
  linea_id uuid not null references public.he_lineas_compromisos(id) on delete cascade,
  acceso_id uuid not null references public.accesos(id),
  primary key (linea_id, acceso_id)
);
alter table public.he_lineas_compromisos_accesos enable row level security;
create policy sali_lector_lee on public.he_lineas_compromisos_accesos for select to sali_lector using (true);
comment on table public.he_lineas_compromisos_accesos is 'Los portales de cada linea de compromiso (en todas las lineas; lo de dentro hereda los de su cabecera). Los accesos de una hoja son la union de los de sus lineas.';
