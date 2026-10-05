-- YA APLICADA el 5-oct-2026 por el MCP. NO volver a ejecutar.
--
-- Salio leyendo Cubas de la Sagra (losbrezos14-2): no es una comunidad, es una
-- VIVIENDA PARTICULAR. El modelo lo tiene (persona + correo + figura 'Propietario
-- Particular'), pero en produccion el titular cuelga del ACCESO, que nace con la
-- oportunidad, y la carpeta esta en la clon. Monica: "anadimos figura legal
-- propietaria, y cuando se cree la opp, las que la tengan DIFERENTE a comunidad y
-- empresa se trabajan en ese momento. Los particulares entran en la agenda,
-- porque son personas."
alter table public.comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una
  add column figura_legal_propietaria_id uuid
  references public.figura_legal_propietaria(id_comodin) on delete restrict;

comment on column public.comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una.figura_legal_propietaria_id is
  'PROVISIONAL, como toda la clon. El titular de esta carpeta cuando ya se ha podido crear (p.ej. un Propietario Particular en la agenda). En produccion el titular cuelga del ACCESO, que nace con la oportunidad; hasta entonces se apunta aqui. Al crear la opp, las figuras distintas de comunidad y empresa se trabajan en ese momento.';
