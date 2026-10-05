-- YA APLICADA el 3-oct-2026 por el MCP. NO volver a ejecutar.
--
-- `accesos.comunidad_id` nunca se relleno (0 de 2.530) y apuntaba a `comunidades`.
-- Pasa a apuntar a la figura legal propietaria y a llamarse como ella.
--
-- OPCIONAL A PROPOSITO, y es un requisito de ella: "cuando creo una opp, no
-- tengo una comunidad creada (no hay id) ni empresa o propietario creado, asi
-- que accesos-figuralegal NO se hace al crear el acceso. Lo que se hace al
-- crear el acceso es la relacion acceso-opp."

alter table public.accesos drop constraint accesos_comunidad_id_fkey;

alter table public.accesos rename column comunidad_id to figura_legal_propietaria_id;

alter table public.accesos
  add constraint accesos_figura_legal_propietaria_id_fkey
  foreign key (figura_legal_propietaria_id)
  references public.figura_legal_propietaria(id_comodin) on delete set null;

create index accesos_figura_legal_propietaria_id_idx
  on public.accesos(figura_legal_propietaria_id)
  where figura_legal_propietaria_id is not null;

comment on column public.accesos.figura_legal_propietaria_id is
  'De quien es este acceso. Opcional: al crear un acceso todavia no existe su titular, y el vinculo se escribe cuando se sabe. Un acceso tiene un titular y no cambia; un titular tiene muchos accesos.';

-- Lo que faltaba para preguntar "de este portal, que ha salido": el indice de
-- `opp_accesos` es (opp_id, acceso_id), asi que sirve para ir de la opp al
-- acceso pero no al reves.
create index opp_accesos_acceso_id_idx on public.opp_accesos(acceso_id);
