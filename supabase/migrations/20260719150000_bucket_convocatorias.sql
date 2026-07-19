-- =============================================================================
-- ERP Accesalia — Bucket de Storage para los PDF de convocatorias
--
-- La app sube el PDF de la convocatoria aqui; la edge extraer-convocatoria lo
-- descarga por pdf_storage_path. Privado (no publico): solo backend/service role
-- accede por ahora. Las politicas de acceso para la app se anadiran con auth/RLS.
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('convocatorias', 'convocatorias', false)
on conflict (id) do nothing;

-- NOTA: sin politicas de storage todavia (como el resto de RLS). El acceso hoy
-- es solo via service role (la edge). La subida desde la app se habilitara al
-- montar auth.
