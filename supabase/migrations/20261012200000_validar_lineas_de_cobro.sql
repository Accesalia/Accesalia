-- NUEVAS HOJAS ENCARGO FIRMADAS (Monica, 12-oct-2026): la hoja firmada llega,
-- Alexandra lee la hoja y lo extraido, corrige lo que este mal pinchando en el
-- dato, anade la linea que la app se haya saltado y valida cada linea por
-- separado; una duda no bloquea las demas. "Importante que diga quien lo toco."
-- La hoja sale de la lista cuando todas sus lineas estan validadas.

-- Lineas: quien la valido, quien la corrigio, quien la anadio a mano, quien la
-- quito (quitar no borra) y lo que la app extrajo antes de corregirlo.
alter table lineas_facturacion
  add column validada_en  timestamptz,
  add column validada_por uuid references equipo (id),
  add column editada_en   timestamptz,
  add column editada_por  uuid references equipo (id),
  add column creada_por   uuid references equipo (id),
  add column quitada_en   timestamptz,
  add column quitada_por  uuid references equipo (id),
  add column extraido     jsonb;

comment on column lineas_facturacion.validada_en is 'Cuando se dio por buena la linea (y sus hitos). Con validada_por vacio = validada en la carga (Monica, 12-oct-2026: lo de 2024 y antes, y lo de 2025-26 ya facturado o a falta solo de lo de a exito).';
comment on column lineas_facturacion.validada_por is 'Quien la valido. Vacio con validada_en puesto = validada en la carga, no por una persona.';
comment on column lineas_facturacion.editada_en is 'Ultima vez que alguien corrigio la linea o uno de sus hitos.';
comment on column lineas_facturacion.creada_por is 'Quien la anadio a mano (origen = manual), porque la app se la habia saltado.';
comment on column lineas_facturacion.quitada_en is 'Quitar una linea no la borra: queda apartada, con quien y cuando. No cuenta en nada.';
comment on column lineas_facturacion.extraido is 'Lo que la app saco de la hoja (la linea y sus hitos), guardado la primera vez que alguien la corrige. Para ver que se cambio.';

-- Hitos: quien los toco. Quitar un hito = estado anulado (ya existe).
alter table hitos_cobro
  add column editado_en  timestamptz,
  add column editado_por uuid references equipo (id),
  add column creado_por  uuid references equipo (id);

comment on column hitos_cobro.editado_por is 'Quien lo corrigio por ultima vez (fecha, importe, porcentaje, cuando se cobra). Quitarlo = estado anulado.';
comment on column hitos_cobro.creado_por is 'Quien lo anadio a mano.';

-- Las dudas, en el mismo diario que las notas de facturacion de la hoja.
alter table notas_facturacion
  add column linea_facturacion_id uuid references lineas_facturacion (id) on delete cascade,
  add column tipo         text not null default 'nota',
  add column resuelta_en  timestamptz,
  add column resuelta_por uuid references equipo (id),
  add constraint notas_fact_tipo_ck check (tipo in ('nota', 'duda'));

comment on column notas_facturacion.tipo is 'nota, o duda: una pregunta sobre una linea que esta sin resolver hasta que alguien la da por resuelta. No bloquea las demas lineas.';
comment on column notas_facturacion.linea_facturacion_id is 'La linea de la que va la nota o la duda.';

create index notas_fact_linea_idx on notas_facturacion (linea_facturacion_id) where linea_facturacion_id is not null;
create index lineas_fact_sin_validar_idx on lineas_facturacion (hoja_encargo_id) where validada_en is null and quitada_en is null;
