-- =============================================================================
-- ERP Accesalia — Bucket de Storage para documentos comerciales generados
--
-- Los PDF generados (viabilidad y, mas adelante, HE) se guardan aqui, versionados
-- por documento. Privado (contienen datos de la comunidad): acceso solo via
-- backend/service role; el preview se sirve desde el servidor.
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('documentos-comerciales', 'documentos-comerciales', false)
on conflict (id) do nothing;
