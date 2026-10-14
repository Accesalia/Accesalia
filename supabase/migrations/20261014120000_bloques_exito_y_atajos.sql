-- BLOQUES: COBRO A EXITO, ATAJOS Y DOS BLOQUES NUEVOS (Monica, 14-oct-2026).
--
-- Lo contratado son los bloques de la version firmada; de ellos nacen las lineas
-- al firmar, sin leer el PDF. Para eso el catalogo tiene que decir, de cada bloque:
--
--   COBRO A EXITO (porcentaje_exito, base_exito, hito_exito). Solo para lo que
--   paga la comunidad y SALE EN LA HOJA: Subvenciones, "3% de lo concedido, a la
--   concesion" (retocable en cada hoja, en conceptos_hoja.porcentaje). Lo de
--   Ecobalance por los 3 presupuestos NO va aqui: el comercial no lo sabe ni debe
--   saberlo; sigue en parametros_economicos y lo pone la regla al firmar.
--
--   ATAJOS (marca_tambien, marca_como). Al marcar el bloque en el generador se
--   marcan solos los de la lista, con la posicion marca_como (o la suya si es
--   null). Solo atajan: se pueden desmarcar uno a uno y no se rompe nada.
--     Redaccion de proyecto, Consulta urbanistica -> Visado
--     Subvenciones -> Documentacion tecnica -> CEE + IEE + Libro, "incluido"
--     DF -> CFO (lo que ya hacia el generador, ahora en el catalogo)
--
--   SUELTO = false: no se puede marcar solo, viaja con el que lo arrastra (Visado).
--
--   FORMA DE PAGO POR DEFECTO, la que propone el generador (CSS y Doc. tecnica).
--
-- Bloques nuevos:
--   VISADO: lo que era "licencias" llevaba dos trabajos con requisitos de
--   ejecucion distintos. El bloque Licencias (su texto ya solo habla de la
--   licencia o DR) se queda como la autorizacion administrativa; el visado va
--   aparte, por defecto con proyecto o consulta ("lo del visado lo sabemos tarde").
--   DOCUMENTACION TECNICA DE SUBVENCIONES: los 1.980 a la contratacion, que hasta
--   hoy iban mezclados con el 3% en la linea de Subvenciones.

alter table public.bloques
  add column if not exists porcentaje_exito numeric,
  add column if not exists base_exito text,
  add column if not exists hito_exito text,
  add column if not exists marca_tambien uuid[] not null default '{}',
  add column if not exists marca_como text,
  add column if not exists suelto boolean not null default true,
  add column if not exists forma_pago_defecto text;

alter table public.bloques
  add constraint bloques_marca_como_check check (marca_como is null or marca_como in ('no_aparece', 'incluido', 'se_cobra')),
  add constraint bloques_hito_exito_check check (hito_exito is null or hito_exito in ('firma', 'encargo', 'entrega', 'licencia', 'pss', 'inicio_obra', 'cfo', 'presentacion', 'concesion', 'adjudicacion', 'otro')),
  add constraint bloques_exito_completo_check check ((porcentaje_exito is null) = (hito_exito is null));

comment on column public.bloques.porcentaje_exito is 'Cobro a exito que paga la comunidad y sale en la hoja (Subvenciones: 3). Retocable por hoja en conceptos_hoja.porcentaje.';
comment on column public.bloques.base_exito is 'Sobre que se calcula el porcentaje a exito: "lo concedido".';
comment on column public.bloques.hito_exito is 'En que hito se cobra el porcentaje a exito.';
comment on column public.bloques.marca_tambien is 'Atajo del generador: al marcar este bloque se marcan estos. Se pueden desmarcar.';
comment on column public.bloques.marca_como is 'Posicion del interruptor con la que se marcan los de marca_tambien; null = la suya por defecto.';
comment on column public.bloques.suelto is 'false = no se puede marcar solo, viaja con el bloque que lo arrastra (Visado).';
comment on column public.bloques.forma_pago_defecto is 'La forma de pago que propone el generador; null = la primera de la lista.';

insert into public.bloques (codigo, nombre, nombre_corto, texto_plantilla, desglose, naturaleza, activo, suelto)
values ('VISADO', 'VISADO COLEGIAL DEL PROYECTO', 'Visado', 'VISADO COLEGIAL DEL PROYECTO', 'no_aparece', 'servicio', true, false)
on conflict (codigo) do nothing;

insert into public.bloques (codigo, nombre, nombre_corto, texto_plantilla, desglose, naturaleza, honorarios_defecto, activo, forma_pago_defecto)
values ('DOCUMENTACION TECNICA SUBVENCIONES', 'DOCUMENTACIÓN TÉCNICA PARA LA SOLICITUD DE SUBVENCIONES', 'Doc. técnica subvenciones',
        'DOCUMENTACIÓN TÉCNICA PARA LA SOLICITUD DE SUBVENCIONES', 'se_cobra', 'documento_tecnico', 1980, true, '100% a la contratación')
on conflict (codigo) do nothing;

-- Subvenciones: el 3% a exito, y arrastra la documentacion tecnica.
update public.bloques set
  porcentaje_exito = 3, base_exito = 'lo concedido', hito_exito = 'concesion', honorarios_defecto = null,
  marca_tambien = array[(select id from public.bloques where codigo = 'DOCUMENTACION TECNICA SUBVENCIONES')]
where codigo = 'TRAMITACION SUBVENCIONES';

update public.bloques set
  marca_tambien = array(select id from public.bloques where codigo in ('CEE', 'IEE', 'LEE') order by codigo),
  marca_como = 'incluido'
where codigo = 'DOCUMENTACION TECNICA SUBVENCIONES';

update public.bloques set marca_tambien = array[(select id from public.bloques where codigo = 'VISADO')]
where codigo in ('REDACCION PROYECTO', 'CONSULTA URBANISTICA');

update public.bloques set marca_tambien = array[(select id from public.bloques where codigo = 'CERTIFICADO FIN DE OBRA')]
where codigo = 'DF';

update public.bloques set forma_pago_defecto = '100% a la firma del Plan de Seguridad y Salud' where codigo = 'CSS';

-- El orden de los activos, con los dos nuevos en su sitio.
update public.bloques b set orden = o.n
from (values
  ('TOMA DE DATOS Y MODELADO 3D', 1), ('REDACCION PROYECTO', 2), ('VISADO', 3), ('TRAMITACION LICENCIAS', 4),
  ('TRAMITACION 3 PRESUPUESTOS', 5), ('CERTIFICADO FIN DE OBRA', 6), ('CSS', 7), ('TRAMITACION SUBVENCIONES', 8),
  ('DOCUMENTACION TECNICA SUBVENCIONES', 9), ('IEE', 10), ('LEE', 11), ('CEE', 12), ('DF', 13), ('MEMORIA TECNICA', 14),
  ('INFORME PERICIAL', 15), ('CONSULTA URBANISTICA', 16), ('SOLICITUD DE FINANCIACION', 17), ('MEDICIONES Y CIEGO', 18),
  ('MODIFICACION DE PROYECTO', 19), ('GESTION DE CAES', 20)
) as o(codigo, n)
where b.codigo = o.codigo and b.activo;
