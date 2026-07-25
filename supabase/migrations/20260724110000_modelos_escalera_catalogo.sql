-- =============================================================================
-- ERP Accesalia — Catalogo de modelos 3D GENERICOS de venta (assets + visor)
--
-- modelos_escalera pasa de catalogo ligero (solo codigo/nombre/notas) a ser el
-- CATALOGO DE GENERICOS de venta: la biblioteca de tipos de solucion reutilizables
-- que la comunidad visualiza, frente a hacer un 3D especifico por portal (eso lo
-- registra modelos_3d_venta, que ahora apunta al generico que reutiliza).
--
-- Fuente de los assets: Dropbox "_MODELOS DE ASCENSOR PARA PRESENTACIONES/JEAN/
-- CATALOGO DE ASCENSORES ACCESALIA" (16 tipos, cada uno con video + renders +
-- plano acotado). Los assets se comprimen (video ~14x, renders a WebP) y se suben
-- al bucket catalogo-venta con rutas derivables del codigo:
--   catalogo-venta/{codigo}/video.mp4      (H.264 web, faststart)
--   catalogo-venta/{codigo}/poster.jpg     (fotograma cartel del video)
--   catalogo-venta/{codigo}/thumb.webp     (miniatura para la rejilla)
--   catalogo-venta/{codigo}/plano.pdf      (plano acotado)
--   catalogo-venta/{codigo}/renders/rNN.webp
--
-- Alcance: SOLO esquema + bucket + siembra. El enganche "solucion aplicada" que
-- se ve en cada PROYECTO se decide y construye en un paso propio (ver ENGANCHES).
--
-- Convenciones: espanol sin tildes/enes; SIN ENUMS (no aplica aqui); RLS ya
-- habilitado en modelos_escalera (fase comercial); trigger actualizado_en ya
-- existe para modelos_escalera y modelos_3d_venta.
-- =============================================================================


-- =============================================================================
-- 1. modelos_escalera: columnas de catalogo + punteros a los assets del visor
-- =============================================================================
alter table modelos_escalera
  add column orden        integer,
  add column activo       boolean not null default true,
  add column tiene_video  boolean not null default false,
  add column tiene_plano  boolean not null default false,
  add column n_renders    integer not null default 0;

comment on table modelos_escalera is 'Catalogo de modelos 3D GENERICOS de venta (biblioteca reutilizable de tipos de solucion). Antes era solo un catalogo ligero de nombres para recorte_escalera; ahora ademas porta los assets (video/renders/plano) para el visor. Cada fila = un tipo generico (JEAN "Ascensor Tipo N"). Se contrapone al 3D a medida por portal (modelos_3d_venta). Catalogo abierto/editable: el nombre comercial de cada tipo se afina en la app.';
comment on column modelos_escalera.orden is 'Orden de presentacion en la rejilla del catalogo.';
comment on column modelos_escalera.activo is 'Si el tipo se muestra en el catalogo (catalogo vivo).';
comment on column modelos_escalera.tiene_video is 'true si existe catalogo-venta/{codigo}/video.mp4 (+ poster.jpg). Lo fija la subida de assets.';
comment on column modelos_escalera.tiene_plano is 'true si existe catalogo-venta/{codigo}/plano.pdf. Lo fija la subida de assets.';
comment on column modelos_escalera.n_renders is 'Numero de renders en catalogo-venta/{codigo}/renders/rNN.webp (r01..rNN). Lo fija la subida de assets.';


-- =============================================================================
-- 2. Bucket de Storage para los assets del catalogo
--
-- PUBLICO a proposito (a diferencia de convocatorias, que es privado): son
-- modelos GENERICOS de presentacion, no datos de un cliente, y el visor
-- reproduce video en streaming directo desde el navegador (servirlos via
-- service role penalizaria mucho). El acceso de escritura sigue siendo solo
-- backend/service role.
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('catalogo-venta', 'catalogo-venta', true)
on conflict (id) do nothing;


-- =============================================================================
-- 3. Reconciliacion: el 3D de venta generico apunta a su tipo del catalogo
--
-- modelos_3d_venta.tipo_3d = 'generico_escalera' significa "reutiliza el 3D
-- generico del modelo de escalera". Hasta ahora ese "cual" no tenia FK. Se anade
-- (nullable: solo aplica a los genericos; los a_medida/diseno_portal la dejan
-- vacia). Alinea con escaneos_polycam.modelo_escalera_id (viabilidad).
-- =============================================================================
alter table modelos_3d_venta
  add column modelo_escalera_id uuid references modelos_escalera (id);

comment on column modelos_3d_venta.modelo_escalera_id is 'Cuando tipo_3d = generico_escalera: cual del catalogo (modelos_escalera) se reutiliza. Vacio para a_medida/diseno_portal.';

create index idx_modelos_3d_venta_modelo_escalera_id
  on modelos_3d_venta (modelo_escalera_id);


-- =============================================================================
-- 4. Siembra: los 16 tipos genericos (JEAN "Catalogo de Ascensores Accesalia")
--
-- El nombre es la etiqueta provisional (JEAN los dejo solo numerados); la
-- etiqueta comercial descriptiva se edita en la app. Los flags/contadores de
-- assets (tiene_video, tiene_plano, n_renders) los fija la subida de assets.
-- =============================================================================
insert into modelos_escalera (codigo, nombre, orden) values
  ('AT1',  'Ascensor Tipo 1',  1),
  ('AT2',  'Ascensor Tipo 2',  2),
  ('AT3',  'Ascensor Tipo 3',  3),
  ('AT4',  'Ascensor Tipo 4',  4),
  ('AT5',  'Ascensor Tipo 5',  5),
  ('AT6',  'Ascensor Tipo 6',  6),
  ('AT7',  'Ascensor Tipo 7',  7),
  ('AT8',  'Ascensor Tipo 8',  8),
  ('AT9',  'Ascensor Tipo 9',  9),
  ('AT10', 'Ascensor Tipo 10', 10),
  ('AT11', 'Ascensor Tipo 11', 11),
  ('AT12', 'Ascensor Tipo 12', 12),
  ('AT13', 'Ascensor Tipo 13', 13),
  ('AT14', 'Ascensor Tipo 14', 14),
  ('AT15', 'Ascensor Tipo 15', 15),
  ('AT16', 'Ascensor Tipo 16', 16)
on conflict (codigo) do nothing;


-- =============================================================================
-- 5. ENGANCHES / FUERA DE ALCANCE (anotados, no construidos aqui)
--
-- - SOLUCION APLICADA POR PROYECTO (el "ver el 3D en cada proyecto"):
--     falta decidir donde cuelga el vinculo proyecto -> tipo del catalogo. Tres
--     candidatos que ya tocan modelos_escalera y hay que reconciliar:
--       escaneos_polycam.modelo_escalera_id (viabilidad, via proceso_venta),
--       modelos_3d_venta.modelo_escalera_id (entregable de venta, este archivo),
--       y un posible proyectos.modelo_escalera_id (produccion).
--     Se construye en un paso propio, con la propietaria.
--
-- - MAPA tipo generico -> vocabulario de solucion (derribo_escalera,
--     exterior_calle, exterior_patio, recorte_escalera, otra): los 16 tipos JEAN
--     estan solo numerados; clasificarlos contra escaneos_polycam.solucion es
--     trabajo de dominio. Columna solucion en el catalogo pendiente si se quiere.
-- =============================================================================
