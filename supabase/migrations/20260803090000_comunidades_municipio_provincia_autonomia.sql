-- =============================================================================
-- Donde esta cada comunidad: municipio, provincia y comunidad autonoma
--
-- Habia municipio y provincia, extraidos del final del nombre de la comunidad.
-- Eso dejo 90 filas con basura ("PARLA MADRID", "44 46 48 50 52 54", "PORTAL 1")
-- y la provincia a medias: 575 comunidades sin ella.
--
-- El dato bueno no hay que adivinarlo. Cada ficha tecnica se extrajo de una
-- carpeta de comunidad que vive dentro de una carpeta de localidad del Dropbox:
--
--     Ascensores y rehabilitaciones\<AUTONOMIA>\<PROVINCIA>\<MUNICIPIO>\<comunidad>
--
-- Madrid es la excepcion por uniprovincial: la capital cuelga directa y el resto
-- de municipios van bajo 1APROVINCIA\. migracion_ficha guarda esa ruta junto al
-- comunidad_id, asi que el vinculo es directo y no hay heuristica: 1.052
-- comunidades resueltas por su ficha, cero contradicciones.
--
-- Las que no tienen ficha se rellenan solo si un municipio de la lista CERRADA
-- del Dropbox (49 carpetas) aparece entero en lo que ya tenian o en su nombre.
-- Al ser lista cerrada no puede colarse un "PARLA MADRID": o es un municipio
-- real o se queda vacio. Quedaron 31 vacias, en municipios_a_revisar.csv.
--
-- Fuera del rastreo por nombre quedan Toledo y Guadalajara capital: en los
-- nombres la provincia va detras del municipio ("TALAVERA DE LA REINA TOLEDO"),
-- asi que casarian con la capital y seria falso.
--
-- El relleno (1.197 filas) se genero con scripts/municipios_desde_dropbox.py y
-- se aplico desde C:\accesalia-fichas\MUNICIPIOS_A_PRODUCCION.sql. Copia de los
-- valores anteriores en C:\accesalia-fichas\municipios_antes_del_cambio.csv.
-- =============================================================================

alter table comunidades add column if not exists comunidad_autonoma text;

comment on column comunidades.comunidad_autonoma is 'Autonomia del edificio. Se deriva del municipio, no se teclea.';
comment on column comunidades.municipio is 'Municipio del edificio. Sale de la carpeta de localidad del Dropbox, no de partir el nombre. Vacio significa que no se sabe, no que sea Madrid.';
comment on column comunidades.provincia is 'Provincia del edificio. Se deriva del municipio, no se teclea.';

create index if not exists comunidades_municipio_idx on comunidades (municipio) where municipio is not null;
