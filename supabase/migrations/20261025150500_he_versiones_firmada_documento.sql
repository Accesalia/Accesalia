-- LA HOJA FIRMADA, EN SU SITIO (Monica, 25-oct-2026): «una hoja firmada debe estar correctamente archivada con su nombre y
-- lo que es». Vive en el archivo de documentos de la opp (documentos, tipo «Hoja de encargo»), llegue por el portal o por
-- el cajon. Le sale al comercial que lleva la opp para validarla (bien firmada, ultima version enviada, sin retocar) y al
-- validarla la version apunta a ese documento y pasa a facturacion (firmada_recibida + ok_comercial).
alter table public.he_versiones_hoja add column firmada_documento_id uuid references public.documentos(id);
comment on column public.he_versiones_hoja.firmada_documento_id is 'La hoja firmada por la comunidad: el documento del archivo de la opp (tipo «Hoja de encargo»), llegue por el portal o por el cajon. Lo pone el comercial al validarla. Un PDF con varias hojas: varias versiones apuntan al mismo documento.';
create index he_versiones_hoja_firmada_documento_idx on public.he_versiones_hoja (firmada_documento_id);
