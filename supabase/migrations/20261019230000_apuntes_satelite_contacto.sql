-- CREAR NUEVO CONTACTO desde el satelite (Monica, 19-oct-2026): el boton
-- "+ Crear nuevo adm" pasa a "Crear nuevo contacto", con un selector de que es:
-- administrador / vecino / contratista / otro (escrito). "Si no, es casi
-- imposible reconstruirlo despues." El administrador sigue apuntandose como
-- 'administrador' (Pendientes sabe darlo de alta); los demas, como 'contacto',
-- con su tipo en datos.tipoContacto. Se colocan a mano y se marcan hechos.
alter table apuntes_satelite drop constraint apuntes_satelite_tipo_check;
alter table apuntes_satelite add constraint apuntes_satelite_tipo_check
  check (tipo in ('oportunidad', 'administrador', 'contacto'));

comment on table apuntes_satelite is 'Opps, administradores y otros contactos lanzados desde el satelite (movil): apuntados, NO creados. Se completan y se dan de alta (o se colocan a mano) en la oficina desde Pendientes (Monica, 13 y 19-oct-2026).';
