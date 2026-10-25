-- SE APLICA EL DIA DE LA MIGRACION (rama comercial-hojas-nuevas). Con el ok de Monica (25-oct-2026).
-- EL PRESUPUESTO MANUAL LEE LAS HOJAS NUEVAS («lo adaptamos para leer hojas nuevas», 25-oct-2026): se marcan las hojas que
-- entran (versiones con el ok de Daniel) y sale un presupuesto con todas. Para saber que hojas lleva cada uno,
-- presupuesto_hojas apunta a la version nueva. hoja_encargo_id deja de ser obligatoria (las nuevas no la tienen) y se
-- ira con las tablas viejas.
alter table public.presupuesto_hojas
  add column he_version_id uuid references public.he_versiones_hoja(id),
  alter column hoja_encargo_id drop not null;
comment on column public.presupuesto_hojas.he_version_id is 'Una hoja (version del sistema nuevo) que lleva este presupuesto. Un presupuesto puede llevar varias.';
