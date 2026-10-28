-- EL ADMINISTRADOR EN ESPERA DE COMUNIDAD (Monica, 28-oct-2026: «en vez de
-- bloquear la creacion del admin hasta que haya comunidad, permitir que se cree,
-- y que cuando se genere la comunidad se vincule; queda mientras colgando de la
-- opp»). Aplicado en produccion el 28-oct.
--
-- Provisional: el administrador es de la comunidad, no de la opp (por eso se
-- retiro zz_muerta_administrador_puesto_id y no se recupera). En cuanto la opp
-- tiene comunidad (alta con Catastro, cambiar la direccion en la ficha, o una
-- direccion que ya teniamos desde el satelite), pasa a la comunidad y esto se
-- vacia (lib/altaOportunidad.ts, pasarAdminEnEspera).

alter table public.oportunidades add column if not exists admin_en_espera_puesto_id uuid references public.puesto(id) on delete set null;
comment on column public.oportunidades.admin_en_espera_puesto_id is 'El administrador de una opp que aun no tiene comunidad (Monica, 28-oct-2026): provisional. En cuanto tiene comunidad pasa a ella (comunidad_admin_responsable) y esto se vacia. El administrador es de la comunidad, no de la opp.';
