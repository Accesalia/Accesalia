-- PLANTILLAS PARA TODOS, CADA UNO LAS SUYAS (Monica, 24-oct-2026): «un acceso general para todos que sea
-- "Plantillas", donde a cada uno le salgan las suyas». La pantalla y la maquina sirven para cualquiera; cada plantilla
-- dice de que area es. Las que habia, del area comercial. La primera de facturacion: «Envío proforma».
-- «Area» aqui no es la tabla areas (alli no esta facturacion, que es una funcion): es la lista de las plantillas.
-- Los {huecos} los rellena la pantalla al enviar (el de la proforma, al conectarla con los hitos nuevos).

alter table public.plantillas_correo add column area text not null default 'comercial';
alter table public.plantillas_correo add constraint plantillas_correo_area_check check (area in ('comercial', 'facturacion'));
comment on column public.plantillas_correo.area is 'De que area es: a cada uno le salen las de las areas en las que trabaja (comercial, facturacion). Los {huecos} del asunto y el texto los rellena la pantalla al enviar.';

insert into public.plantillas_correo (nombre, asunto, texto, area, propietario_id)
values (
  'Envío proforma',
  '{dirección} – FACTURA {lo que se cobra}',
  E'Buenos días:\n\nOs adjuntamos la proforma {código} de {dirección}, por un total de {total} € (IVA incluido).\n\nEn cuanto nos confirméis, emitimos la factura.\n\nUn saludo,\n{empresa} · Facturación',
  'facturacion',
  null
);
