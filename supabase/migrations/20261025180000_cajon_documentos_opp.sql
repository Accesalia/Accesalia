-- EL CAJON DE DOCUMENTOS DE LA OPP (Monica, 25-oct-2026; maqueta validada docs/figma/recorrido-hoja-firmada.html,
-- pestaña «Cajon de documentos de la opp»). Cualquiera que entre en la opp suelta ahi lo que le llega (la orden de
-- compra de Schindler, el presupuesto de la contrata, un contrato...) y queda SIN ARCHIVAR hasta que alguien dice que
-- es: el propio comercial en el cajon, la secretaria comercial en su bandeja o, mas adelante, facturacion. Todo en el
-- mismo almacen de siempre (documentos), nada aparte.
--   - El tipo puede quedar vacio SOLO mientras esta sin archivar.
--   - El nombre del fichero tal como llego, quien lo subio, y quien y cuando lo archivo.

alter table public.documentos alter column tipo_documento_id drop not null;
alter table public.documentos
  add column nombre text,
  add column subido_por uuid references public.equipo(id),
  add column archivado_en timestamptz,
  add column archivado_por uuid references public.equipo(id),
  -- Sin tipo = sin archivar: solo lo que se suelta en el cajon de una opp, y sin fecha de archivo.
  add constraint documentos_sin_archivar_check check (
    tipo_documento_id is not null or (archivado_en is null and oportunidad_id is not null)
  );
create index documentos_sin_archivar_idx on public.documentos (oportunidad_id) where tipo_documento_id is null;

-- La contrata tambien aporta documentos (su orden de compra, su presupuesto).
alter table public.tipos_documento drop constraint tipos_documento_aportado_por_check;
alter table public.tipos_documento add constraint tipos_documento_aportado_por_check
  check (aportado_por = any (array['comunidad', 'accesalia', 'mixto_firma', 'contrata']));

insert into public.tipos_documento (nombre, aportado_por, pertenece_a) values
  ('Orden de compra de la contrata', 'contrata', 'oportunidad'),
  ('Presupuesto de la contrata', 'contrata', 'oportunidad'),
  ('Contrato', 'mixto_firma', 'oportunidad'),
  ('Otro documento', 'comunidad', 'oportunidad');
