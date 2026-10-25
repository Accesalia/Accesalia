-- LA COMISION DEL ADMINISTRADOR EN LA LINEA DE LA HOJA (Monica, 25-oct-2026).
-- Se suma SI O SI al precio de la linea de proyecto o de subvenciones, segun lo pactado, y no sale en el papel. Hasta
-- que el area de comisiones este montada, queda apuntado aqui: cuanto del importe de la linea es comision y de que
-- acuerdo sale. Una version firmada con comision en una linea = comision a pagar. Mismos nombres que en conceptos_hoja.
alter table public.he_lineas_compromisos
  add column comision_importe numeric(12,2),
  add column comision_acuerdo_id uuid references public.comision_acuerdos(id),
  add constraint he_lineas_compromisos_comision_check check (
    (comision_importe is null and comision_acuerdo_id is null)
    or (comision_importe > 0 and comision_acuerdo_id is not null));
comment on column public.he_lineas_compromisos.comision_importe is 'Euros de comision del administrador que van DENTRO del importe de esta linea (no salen en el papel). Vacio = ninguna.';
comment on column public.he_lineas_compromisos.comision_acuerdo_id is 'El acuerdo de comision (comision_acuerdos) del que sale esa comision.';
