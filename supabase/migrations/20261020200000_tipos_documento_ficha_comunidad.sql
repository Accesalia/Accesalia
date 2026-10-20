-- LOS PAPELES DE LA FICHA DE COMUNIDAD (Monica, 20-oct-2026).
--
-- La ficha nueva de comunidad (docs/figma/ficha-comunidad.html) enseña el acta
-- de nombramiento del presidente con su validez, su DNI, el certificado de
-- titularidad de la cuenta y, en cada opp, el acta de votacion. La tabla
-- documentos ya sabe guardarlos (fecha_emision, fecha_caducidad, puesto_id,
-- persona_id, oportunidad_id): solo faltaba la etiqueta en el catalogo.
--
-- pertenece_a solo admite comunidad / proyecto / oportunidad. El acta y el DNI
-- van como de la COMUNIDAD y se atan a su presidente con documentos.puesto_id y
-- persona_id. El acta de votacion es de la OPP («de la comunidad solo sus datos»).
-- La vigencia (el cargo dura un año salvo estatutos) va en fecha_caducidad de
-- cada documento, no aqui.

insert into public.tipos_documento (nombre, aportado_por, pertenece_a, caduca, tipo_completitud)
select v.nombre, v.aportado_por, v.pertenece_a, v.caduca, 'simple'
from (values
  ('Acta de nombramiento del presidente', 'comunidad', 'comunidad',   true),
  ('DNI',                                 'comunidad', 'comunidad',   true),
  ('Certificado de titularidad de la cuenta', 'comunidad', 'comunidad', true),
  ('Acta de votacion de la actuacion',    'comunidad', 'oportunidad', false)
) as v(nombre, aportado_por, pertenece_a, caduca)
where not exists (select 1 from public.tipos_documento t where t.nombre = v.nombre);
