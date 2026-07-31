-- =============================================================================
-- correo.direccion pasa a llamarse correo.email
--
-- Se llamaba "direccion" pensando en "direccion de correo", y convivia con
-- empresa.direccion, que es la postal. Monica hizo una consulta, vio direcciones
-- de correo donde esperaba calles, y penso que los datos estaban descolocados.
-- No lo estaban: el nombre era malo. Un comentario en la columna no arregla eso.
-- =============================================================================

alter table correo rename column direccion to email;

comment on column correo.email is 'La direccion de correo electronico. Se llama email y no direccion para que no se confunda con la direccion postal, que vive en empresa.';
