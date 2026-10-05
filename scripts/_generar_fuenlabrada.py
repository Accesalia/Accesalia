# -*- coding: utf-8 -*-
"""Genera la migracion de Fuenlabrada a partir de lo barrido y lo leido a ojo.

LAS RUTAS SE COPIAN, NUNCA SE CONSTRUYEN NI SE TECLEAN. Es la leccion de
Alcorcon, donde asumi que todas las tarjetas colgaban de 1.DATOS/2.DOCUMENTACION
y acerte en 13 de 19.
"""
import csv
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FALSOS = {"lavega14", "plazadepanticosa5", "plazadepanticosa7",
          "paseodelahaya2", "avfranciscojaviersauquillo2"}


def q(s):
    if s is None or s == "":
        return "null"
    return "'" + s.replace("'", "''") + "'"


def leer_lo_visto():
    fuera = {}
    ruta = os.path.join(RAIZ, "_leido_fuenlabrada.csv")
    for linea in io.open(ruta, encoding="utf-8"):
        if "|" not in linea or linea.startswith("carpeta|"):
            continue
        p = linea.rstrip("\n").split("|")
        fuera[p[0]] = {"nif": p[1], "den": p[2], "nota": p[3] if len(p) > 3 else ""}
    return fuera


def main():
    leido = leer_lo_visto()
    trab = {r["carpeta"]: r for r in csv.DictReader(
        io.open(os.path.join(RAIZ, "_trabajo_fuenlabrada.csv"), encoding="utf-8"))}
    tanda = list(csv.DictReader(
        io.open(os.path.join(RAIZ, "tanda_fuenlabrada.csv"), encoding="utf-8")))
    rutas = {r["carpeta"]: r["ruta"] for r in tanda}

    # la ene se perdio al guardar el fichero de lo leido
    con_ene = u"avespaña9"
    trab["avespana9"] = trab[con_ene]
    rutas["avespana9"] = rutas[con_ene]

    b = arrancar()
    coms = {c["id"]: c for c in b.leer(
        "comunidades?select=id,nombre,cif_comunidad&municipio=ilike.FUENLABRADA")}

    filas, vistos = [], set()
    for carp in sorted(leido):
        d = leido[carp]
        cid = trab[carp]["comunidad_id"]
        c = coms[cid]
        if cid in vistos:
            raise SystemExit("dos tarjetas para la misma comunidad: %s" % carp)
        vistos.add(cid)
        filas.append({"carpeta": carp, "cid": cid, "nif": d["nif"],
                      "den": d["den"], "nota": d["nota"], "ruta": rutas[carp]})

    fuera = [r for r in tanda if r["estado"] == "sin pareja" or r["carpeta"] in FALSOS]

    o = []
    o.append(CABECERA)
    o.append("insert into _leido values")
    o.append(",\n".join(
        "(%s, %s, %s, %s, %s, %s)" % (q(f["cid"]), q(f["carpeta"]), q(f["nif"]),
                                      q(f["den"]), q(f["ruta"]), q(f["nota"]))
        for f in filas) + ";")
    o.append(CUERPO)
    o.append(FUERA_CABECERA % len(fuera))
    o.append(",\n".join(
        "('MADRID', 'FUENLABRADA', %s, %s, %s, %s, %s, %s)" % (
            q(r["carpeta"]), q(r["ruta"]), "true" if r["ruta"] else "false",
            q(r["nif_leido"]), q(r["denominacion_leida"]),
            q("cotejo erroneo, descartado a mano" if r["carpeta"] in FALSOS else None))
        for r in fuera) + ";")
    n, nc = len(filas), len(filas) - 1      # nc: todas menos Ostalazar
    o.append(FRENOS % (n, n, nc, nc))

    destino = os.path.join(RAIZ, "supabase", "migrations",
                           "20261003160000_fuenlabrada_cif_y_tarjetas.sql")
    io.open(destino, "w", encoding="utf-8").write("\n".join(o))
    print("escrita: %s" % destino)
    print("tarjetas: %d   carpetas fuera de lista: %d" % (len(filas), len(fuera)))


CABECERA = u"""-- ===========================================================================
-- FUENLABRADA: NOMBRE OFICIAL Y TARJETAS DEL CIF   (Monica, 3-oct-2026)
--
-- Tercer municipio, mismo metodo de ella: bajar las carpetas del Dropbox,
-- cotejarlas contra su lista de julio, y de las que casan MIRAR LA TARJETA DEL
-- CIF a ojo, una por una. 293 carpetas, 114 comunidades suyas, 111 parejas
-- buenas, 77 con tarjeta. Las 77 vistas.
--
-- LO QUE DICE DEL TRABAJO DE JULIO: de las 68 que ya tenian CIF en la base, 67
-- COINCIDEN exactamente con su tarjeta. La unica que no, no es un error de
-- nadie: a Austria 8 le renovaron el CIF y le cambiaron la letra.
--
-- EL DIGITO DE CONTROL COMO RED. Un CIF lleva un digito calculado a partir de
-- los otros siete, asi que leer mal un numero en una matriz de puntos se
-- detecta solo. Los 77 lo pasan. Dos no se dejaban leer:
--   * ANDALUCIA 6: el sexto digito salia borroso y SOLO un 8 hace valido el
--     numero, asi que es H79882866.
--   * AV PROVINCIAS 10: la matriz esta comida; lo leyo Monica a ojo,
--     H80024334, y el control cuadra.
--
-- LOS SIETE CIF QUE LA BASE NO TENIA: Castillejos 23, Humera 23, La Vega 6,
-- Mostoles 3 portal 8, Plaza Paris 7, Polvoranca 23 y San Francisco Javier 2.
--
-- SIETE NOMBRES QUE DICEN OTRA COSA QUE LA LISTA, y cada uno ensena algo:
--   ALAVA 6            -> OSTALAZAR SL. No es una comunidad: es una empresa.
--   ERAS 9             -> CL LAS HERAS 9. Otra calle: la oficial lleva LAS y H.
--   ZAMORA 1-3-5       -> ED ZAMORA, CL ZAMORA sin numero. Un EDIFICIO con tres
--                         portales: Zamora 1, 3 y 5 comparten la referencia
--                         catastral 1908101VK3610N. No es mancomunidad.
--   CASTILLA LA NUEVA 37 BIS -> el bis es el PORTAL B del 37.
--   NAZARET 32 BIS     -> su libro de actas dice que el edificio estaba en
--                         CALLE ANDALUCIA 8 y hoy es NAZARET 32 BIS.
--   PLAZA DE NICARAGUA 3 -> la tarjeta dice CALLE Nicaragua. Criterio de
--                         Monica: aqui se guarda como calle y la oportunidad
--                         se queda con plaza.
--   MOSTOLES 3 portales 2,4,7,8 -> cuatro CIF distintos en el mismo numero.
--                         "Lo que aqui llamamos portales, Catastro lo llama
--                         escaleras: es una de nuestras subdivisiones dentro
--                         de accesos".
--
-- DOS NO SON TARJETAS y entran marcadas como lo que son: Paseo San Antonio 3 y
-- Pelayos 11 son AUTORIZACIONES firmadas por el presidente. Traen el CIF (los
-- dos validos) y ademas el nombre y el DNI de quien firma.
--
-- AUSTRIA 8, EL UNICO CHOQUE. La base tiene H78759263 y la tarjeta guardada
-- dice E78759263: mismos ocho digitos, distinta letra. Le renovaron el CIF y la
-- tarjeta nueva no la tenemos, pero el vigente lo certifica el Banco Sabadell
-- el 14-05-2026 sobre la cuenta ES62 0081 0295 0400 0129 8234, y lo repite su
-- IEE. Manda la H. La tarjeta E se guarda con vigente = false.
-- Y deja un hilo: su administradora habla de "la administracion de la
-- MANCOMUNIDAD", y el IEE dice que el edificio comparte medianeria con CL
-- AUSTRIA 10 y CL AUSTRIA 6, que NO estan en la lista de Monica.
-- ===========================================================================

begin;

-- 1 --------------------------------------------- lo que dice cada tarjeta
create temporary table _leido (
  comunidad_id uuid,
  carpeta      text,
  nif          text,
  denominacion text,
  ruta_dropbox text,
  nota         text
) on commit drop;
"""

CUERPO = u"""
-- 2 --------------------------------------------------------------- FRENOS
-- a) las comunidades existen y son de Fuenlabrada
do $$
declare faltan int;
begin
  select count(*) into faltan from _leido l
  where not exists (select 1 from comunidades c
                    where c.id = l.comunidad_id and upper(c.municipio) = 'FUENLABRADA');
  if faltan > 0 then
    raise exception 'Hay % comunidades que no existen o no son de Fuenlabrada. Nada escrito.', faltan;
  end if;
end $$;

-- b) ningun CIF de la base choca con su tarjeta. La UNICA excepcion permitida
--    es Austria 8, y va con nombre y apellidos: si manana aparece otro choque,
--    la migracion se cae en vez de pisarlo en silencio.
do $$
declare chocan int;
begin
  select count(*) into chocan
  from _leido l join comunidades c on c.id = l.comunidad_id
  where c.cif_comunidad is not null
    and c.cif_comunidad <> l.nif
    and l.carpeta <> 'austria8';
  if chocan > 0 then
    raise exception 'Hay % CIF en la base que NO coinciden con su tarjeta. Nada escrito.', chocan;
  end if;
end $$;

-- 3 ------------------------------------- nombre oficial y el CIF que falte
-- El CIF de la base MANDA sobre el de la tarjeta (coalesce), y eso resuelve
-- Austria 8 solo: la base tiene el vigente con H y la tarjeta es la anterior.
update comunidades c
set nombre         = l.denominacion,
    cif_comunidad  = coalesce(c.cif_comunidad, l.nif),
    actualizado_en = now()
from _leido l
where c.id = l.comunidad_id;

-- 4 -------------------------------------------- las tarjetas, como documento
insert into documentos (comunidad_id, tipo_documento_id, naturaleza, backend,
                        origen_ruta_dropbox, estado_firma, vigente, grupo_id,
                        n_version, justificacion)
select l.comunidad_id,
       (select id from tipos_documento where nombre = 'tarjeta_cif'),
       'migrado', 'dropbox', l.ruta_dropbox, 'no_aplica',
       (l.carpeta <> 'austria8'),   -- la de Austria 8 es la del CIF viejo
       gen_random_uuid(), 1, l.nota
from _leido l;

-- 5 ------------------------------------------ OSTALAZAR, que no es comunidad
-- ALAVA 6 no es una comunidad de propietarios: su tarjeta dice OSTALAZAR SL,
-- con domicilio social en CL DOCTOR ESQUERDO 57 de Madrid. Es el segundo
-- titular que no es comunidad, despues de CBRE.
--
-- PARA LA MUDANZA: esta empresa tiene DOS locales, y el otro -Doctor Esquerdo
-- 55- sigue en `comunidades` con el mismo CIF porque es de Madrid. Se juntan
-- cuando Madrid pase por la tanda.
with nueva as (
  insert into empresas_propietarias (nombre_accesalia, nombre_legal, cif, direccion)
  values ('OSTALAZAR SL', 'OSTALAZAR SL', 'B28111516', 'CL DOCTOR ESQUERDO 57, MADRID')
  returning id
)
insert into figura_legal_propietaria (id_comodin, figura)
select id, 'Propietario Empresa' from nueva;

-- y su acceso: ALAVA 6 escalera 1, que ya existia
update accesos
set figura_legal_propietaria_id = (select id from empresas_propietarias where cif = 'B28111516')
where id = '990faf0a-e584-45b4-9f50-086d4a2c9cba';

-- 6 ------------------------------- las que SI son comunidades, a la figura
insert into figura_legal_propietaria (id_comodin, figura)
select l.comunidad_id, 'Comunidad de Propietarios'
from _leido l
where l.carpeta <> 'alava6'
on conflict (id_comodin) do nothing;
"""

FUERA_CABECERA = u"""
-- 7 ------------------------------- las carpetas que NO estan en la lista
-- %d carpetas del Dropbox de Fuenlabrada sin pareja en la lista de julio. No se
-- tocan: se apuntan para revisarlas una a una. Aqui entran tambien las CINCO
-- que el cotejo automatico emparejo MAL y se descartaron a mano -calles
-- distintas con el mismo numero: La Vega 14 contra Leganes 14, Panticosa 5 y 7
-- contra Paris 5 y 7, La Haya 2 contra Granada 2, y Sauquillo 2 contra San
-- Francisco Javier 2-. Las cinco comunidades afectadas ya tenian su carpeta
-- buena por otro lado, asi que descartarlas no pierde nada.
insert into comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una
  (comunidad_autonoma, municipio, carpeta, ruta_dropbox, tiene_tarjeta_cif,
   cif_en_la_ficha, nombre_en_la_ficha, notas)
values"""

FRENOS = u"""
-- 8 ------------------------------------------------------- FRENOS FINALES
do $$
declare docs int; figs int; sin_cif int; emp int;
begin
  select count(*) into docs from documentos d
  join tipos_documento t on t.id = d.tipo_documento_id and t.nombre = 'tarjeta_cif'
  join _leido l on l.comunidad_id = d.comunidad_id;
  if docs <> %d then
    raise exception 'Esperaba %% tarjetas de Fuenlabrada y hay %%. Nada hecho.', %d, docs;
  end if;

  select count(*) into sin_cif from _leido l
  join comunidades c on c.id = l.comunidad_id
  where c.cif_comunidad is null;
  if sin_cif <> 0 then
    raise exception 'Han quedado %% comunidades sin CIF. Nada hecho.', sin_cif;
  end if;

  select count(*) into figs from figura_legal_propietaria f
  join _leido l on l.comunidad_id = f.id_comodin;
  if figs <> %d then
    raise exception 'Esperaba %% figuras de comunidad y hay %%. Nada hecho.', %d, figs;
  end if;

  select count(*) into emp from empresas_propietarias where cif = 'B28111516';
  if emp <> 1 then
    raise exception 'Ostalazar deberia estar una vez y esta %%. Nada hecho.', emp;
  end if;
end $$;

commit;

-- ===========================================================================
-- COMPROBACION (aparte):
--
--   select count(*) from documentos d
--     join tipos_documento t on t.id = d.tipo_documento_id and t.nombre='tarjeta_cif'
--     join comunidades c on c.id = d.comunidad_id
--    where upper(c.municipio) = 'FUENLABRADA';                         -- 77
--
--   select figura, count(*) from figura_legal_propietaria group by 1;
--     -- Comunidad de Propietarios 101, Propietario Empresa 2
--
--   select nombre from comunidades
--    where upper(municipio)='FUENLABRADA' and cif_comunidad is null;   -- las que no tienen tarjeta
-- ===========================================================================
"""


if __name__ == "__main__":
    main()
