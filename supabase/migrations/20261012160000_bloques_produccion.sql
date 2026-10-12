-- QUE ABRE PRODUCCION (Monica, 12-oct-2026): lo que se cobra de una hoja abre
-- cosas distintas. Un proyecto tecnico va a FARO (nube de puntos) y a tecnico;
-- un IEE, los 3 presupuestos o una subvencion, no. Se decide por bloque (lo que
-- se cobra) y se edita en el catalogo de bloques, no en el codigo.
alter table bloques add column va_a_faro boolean not null default false;
alter table bloques add column va_a_tecnico boolean not null default false;
comment on column bloques.va_a_faro is 'Cobrada una hoja con este bloque, el trabajo entra en Nubes de puntos (escaneo FARO).';
comment on column bloques.va_a_tecnico is 'Este bloque necesita tecnico: con la nube lista (o sin FARO), entra en el cronograma de tecnicos.';
-- Lo que dijo ella: redaccion, modificacion de proyecto y consulta urbanistica, si a los dos.
update bloques set va_a_faro = true, va_a_tecnico = true
where nombre in ('REDACCIÓN DEL PROYECTO BÁSICO Y DE EJECUCIÓN', 'MODIFICACIÓN DE PROYECTO', 'CONSULTA URBANÍSTICA');
-- Y la memoria tecnica simplificada, tambien a los dos (Monica, 12-oct-2026).
update bloques set va_a_faro = true, va_a_tecnico = true where nombre = 'MEMORIA TÉCNICA SIMPLIFICADA';
