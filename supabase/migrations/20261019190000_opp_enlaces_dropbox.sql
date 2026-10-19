-- =============================================================================
-- La carpeta y la ficha ANTIGUAS de Dropbox de cada opp (Monica, 19-oct-2026).
--
-- "son cosas historicas, a veces estan mal migradas y son demasiadas para ir
-- una a una, pero tener el enlace a la carpeta de dropbox lo facilita."
--
-- Se guarda la RUTA a partir de "Ascensores y rehabilitaciones", con barras /
-- (MADRID/1APROVINCIA/LEGANES/santateresa8). El principio del enlace web lo
-- pone la app (lib/dropbox.ts): asi, si la carpeta raiz cambia de nombre, se
-- cambia en un sitio y no en 1.400 filas.
--
-- Se rellenan con scripts/enlaces_dropbox_de_las_opps.py desde la ruta que se
-- apunto al migrar (origen_notas). Vacio = no hay o no se sabe cual.
-- =============================================================================

alter table oportunidades
  add column if not exists dropbox_carpeta text,
  add column if not exists dropbox_ficha   text;

comment on column oportunidades.dropbox_carpeta is 'Carpeta antigua de Dropbox, desde "Ascensores y rehabilitaciones" (MADRID/1APROVINCIA/LEGANES/santateresa8). Historico: se enlaza, no se trabaja ahi.';
comment on column oportunidades.dropbox_ficha   is 'La FICHA DE DATOS .docx antigua, misma raiz. Vacia si la carpeta tiene varias (una por trabajo) y nadie ha elegido.';
