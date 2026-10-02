-- ===========================================================================
-- ARREGLAR LAS RUTAS DE SEIS TARJETAS   (2-oct-2026)
--
-- FALLO MIO. Al escribir la migracion de Alcorcon di por hecho que TODAS las
-- tarjetas colgaban de "1.DATOS / 2.DOCUMENTACION". Acerte en 13 de 19. Las
-- otras seis estan en sitios distintos, y cada una cuenta algo de como ha ido
-- creciendo este Dropbox:
--
--   badajoz20             DATOS / datos                  la convencion vieja, minusculas
--   cannada22             RAMPA 2025 / 1.DATOS / ...     carpeta de PROYECTO: esa
--                         ASCENSOR 2026 / 1.DATOS / ...  comunidad tiene DOS obras y
--                                                        la tarjeta esta en las dos
--   cannada8              1.DATOS / documentacion        "documentacion" en minuscula
--   fuenlabrada15         DATOS / documentacion
--   virgendeiciar17       ORIGINAL(completo) / ...       otra carpeta de proyecto
--   santamarialablanca3   1.DATOS / 2.DOCUMENTACION      CON TILDE EN LA O
--
-- LA LECCION, para las 24 tandas que quedan: la ruta NO SE CONSTRUYE, SE COPIA
-- del barrido del disco. Lo que sabe el disco no se adivina. Es la misma
-- leccion que la de los indices unicos de la fusion, el mismo dia.
--
-- De Cannada 22 se coge la de RAMPA 2025 por ser la mas corta; la de ASCENSOR
-- 2026 es el mismo documento, asi que da igual cual.
--
-- Las seis rutas de abajo se han comprobado contra el disco antes de escribir
-- esto: existen.
-- ===========================================================================

begin;

-- antes acababa en: badajoz20 / 1.DATOS / 2.DOCUMENTACION / cif (7).pdf
update documentos set origen_ruta_dropbox = 'MADRID\1APROVINCIA\ALCORCON\badajoz20\DATOS\datos\cif (7).pdf', actualizado_en = now()
 where id = 'd1042ee8-40a8-4cc0-920b-1837eda166d1';

-- antes acababa en: cannada22 / 1.DATOS / 2.DOCUMENTACION / CIF CANNADA 22.pdf
update documentos set origen_ruta_dropbox = 'MADRID\1APROVINCIA\ALCORCON\cañada22\RAMPA 2025\1.DATOS\2.DOCUMENTACION\CIF CAÑADA 22.pdf', actualizado_en = now()
 where id = '14dfba92-05e0-42e7-9661-d2c580da0b2e';

-- antes acababa en: cannada8 / 1.DATOS / 2.DOCUMENTACION / CIF.pdf
update documentos set origen_ruta_dropbox = 'MADRID\1APROVINCIA\ALCORCON\cañada8\1.DATOS\documentacion\CIF.pdf', actualizado_en = now()
 where id = '20fb4953-0ade-4b52-b7a1-3316a0d0ccaa';

-- antes acababa en: fuenlabrada15 / 1.DATOS / 2.DOCUMENTACION / CIF COMUNIDAD.pdf
update documentos set origen_ruta_dropbox = 'MADRID\1APROVINCIA\ALCORCON\fuenlabrada15\DATOS\documentacion\CIF COMUNIDAD.pdf', actualizado_en = now()
 where id = 'b3abd5a2-2655-49de-961c-5091b2877ea8';

-- antes acababa en: virgendeiciar17 / 1.DATOS / 2.DOCUMENTACION / CIF VIRGEN DE ICIAR 17.pdf
update documentos set origen_ruta_dropbox = 'MADRID\1APROVINCIA\ALCORCON\virgendeiciar17\ORIGINAL(completo)\1.DATOS\2.DOCUMENTACION\CIF VIRGEN DE ICIAR 17.pdf', actualizado_en = now()
 where id = '3c49b3ef-0db5-4c4d-a35b-cf4ecb751a1b';

-- antes acababa en: santamarialablanca3 / 1.DATOS / 2.DOCUMENTACION / CIF.pdf
update documentos set origen_ruta_dropbox = 'MADRID\1APROVINCIA\ALCORCON\santamarialablanca3\1.DATOS\2.DOCUMENTACIÓN\CIF.pdf', actualizado_en = now()
 where id = 'cf75d101-36d2-442f-8aed-ca3cf2af44b0';

-- FRENO. La primera version contaba "rutas que no siguen el patron habitual", y
-- era un atajo malo: `cannada22` y `virgendeiciar17` SI contienen
-- "1.DATOS / 2.DOCUMENTACION" (con una carpeta de proyecto delante), y
-- `virgendeiciar15escalera4` tiene "1. DATOS" con un espacio y entraba en la
-- cuenta sin haberla tocado. Salian 5 donde yo esperaba 6, y aborto.
--
-- Esto comprueba lo unico que importa: que las SEIS filas tienen EXACTAMENTE la
-- ruta que les toca. Comprobar la FORMA de algo no es comprobar QUE ES.
do $$
declare n int;
begin
  select count(*) into n from documentos
  where (id = 'd1042ee8-40a8-4cc0-920b-1837eda166d1' and origen_ruta_dropbox = 'MADRID\1APROVINCIA\ALCORCON\badajoz20\DATOS\datos\cif (7).pdf')
     or (id = '14dfba92-05e0-42e7-9661-d2c580da0b2e' and origen_ruta_dropbox = 'MADRID\1APROVINCIA\ALCORCON\cañada22\RAMPA 2025\1.DATOS\2.DOCUMENTACION\CIF CAÑADA 22.pdf')
     or (id = '20fb4953-0ade-4b52-b7a1-3316a0d0ccaa' and origen_ruta_dropbox = 'MADRID\1APROVINCIA\ALCORCON\cañada8\1.DATOS\documentacion\CIF.pdf')
     or (id = 'b3abd5a2-2655-49de-961c-5091b2877ea8' and origen_ruta_dropbox = 'MADRID\1APROVINCIA\ALCORCON\fuenlabrada15\DATOS\documentacion\CIF COMUNIDAD.pdf')
     or (id = '3c49b3ef-0db5-4c4d-a35b-cf4ecb751a1b' and origen_ruta_dropbox = 'MADRID\1APROVINCIA\ALCORCON\virgendeiciar17\ORIGINAL(completo)\1.DATOS\2.DOCUMENTACION\CIF VIRGEN DE ICIAR 17.pdf')
     or (id = 'cf75d101-36d2-442f-8aed-ca3cf2af44b0' and origen_ruta_dropbox = 'MADRID\1APROVINCIA\ALCORCON\santamarialablanca3\1.DATOS\2.DOCUMENTACIÓN\CIF.pdf');
  if n <> 6 then
    raise exception 'Solo % de las 6 rutas han quedado como debian. Nada escrito.', n;
  end if;
end $$;

commit;
