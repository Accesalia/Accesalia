-- LA COMISION DEL ADMINISTRADOR, DENTRO DEL PRECIO (Monica, 17 y 18-oct-2026).
-- Si la comunidad tiene un administrador con acuerdo de comision (verificado,
-- vigente, pactado), el generador la SUMA al precio de la linea de forma
-- INVISIBLE: la comunidad no la ve, ni como linea ni como partida. El comercial
-- si, con un aviso en rojo. Aqui queda cuanto lleva dentro cada linea y de que
-- acuerdo sale, para que la pantalla de comisiones de administradores (Ana) lo
-- lea sin recalcular, y la de comisiones de los comerciales calcule sobre el
-- precio SIN ella.
alter table conceptos_hoja
  add column comision_importe numeric(12,2),
  add column comision_acuerdo_id uuid references comision_acuerdos(id);
comment on column conceptos_hoja.comision_importe is 'Euros de comision del administrador que van DENTRO del importe de esta linea (no salen en el PDF). Vacio = ninguna.';
comment on column conceptos_hoja.comision_acuerdo_id is 'El acuerdo de comision (comision_acuerdos) del que sale comision_importe.';
