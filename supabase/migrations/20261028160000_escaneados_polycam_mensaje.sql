-- LO QUE ESCRIBE EL COMERCIAL EN EL CORREO DEL ESCANEO (Monica, 28-oct-2026:
-- «Oscar pone informacion en el cuerpo del mensaje, "buenos dias Alex, esta es
-- la...". ¿Se puede hacer que aparezca en la mesa de Alex?»). Sin lo citado de
-- correos anteriores ni la firma del movil; hasta 2.000 caracteres.

alter table public.escaneados_polycam add column if not exists mensaje text;
comment on column public.escaneados_polycam.mensaje is 'Lo que escribio quien mando el escaneo en el cuerpo del correo (sin lo citado). Sale en la mesa de viabilidades.';
