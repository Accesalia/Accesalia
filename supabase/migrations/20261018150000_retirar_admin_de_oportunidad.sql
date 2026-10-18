-- EL ADMINISTRADOR ES DE LA COMUNIDAD, NUNCA DE LA OPP (Monica, 18-oct-2026;
-- docs/modelo-admin-comunidad.md, paso 2). Se retira la columna que lo guardaba
-- en la oportunidad: en la base ya no la lee ninguna vista, funcion ni regla
-- (e3 paso todo a la vista administradores_de_oportunidad) y en la app ya no la
-- escribe ni la lee nadie (34f4546, 339fc0a, 64c70e9). Las 2 opps que la tenian
-- (San Juan 10 y Valladolid 13) ya tienen su administradora en la comunidad.
-- No se borra: se renombra a zz_muerta_, como el resto de lo retirado.
alter table public.oportunidades rename column administrador_puesto_id to zz_muerta_administrador_puesto_id;
comment on column public.oportunidades.zz_muerta_administrador_puesto_id is
  'RETIRADA el 18-oct-2026: el administrador es de la comunidad (comunidad_admin_responsable), por los accesos de la opp. Ver la vista administradores_de_oportunidad.';
