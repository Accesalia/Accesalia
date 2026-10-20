# -*- coding: utf-8 -*-
r"""
LAS OPPS QUE SIGUEN SIN CARPETA DE DROPBOX, PARA REVISAR  (Monica, 20-oct-2026)

    "REPITO QUE ES IMPOSIBLE QUE HAYA OPPS SIN CARPETA"

Y tenia razon: las que no casaban tienen la carpeta con el nombre mal escrito
(vitoria1, conciclio11, villaamil64, castilloarevalo21). Este script NO ESCRIBE
en la base: deja un Excel con cada opp sin carpeta y, si la hay, una PROPUESTA:
carpetas del mismo municipio, todavia sin opp, con algun numero en comun y las
letras parecidas (difflib >= 0.75). Ella confirma y luego se enlaza.

El nombre que se ensena es SOLO oportunidades.nombre (o el codigo si no tiene):
nunca el de la comunidad, que lleva el "CP" delante. Para comparar se quita el
parentesis final del nombre de Catastro ("Paris 5, Fuenlabrada (plaza)").

Uso:
    python scripts/enlaces_dropbox_revision.py
"""
import difflib
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import openpyxl  # noqa: E402
from openpyxl.styles import Font  # noqa: E402

from produccion import arrancar  # noqa: E402
from enlaces_dropbox_tercera_vuelta import carpetas  # noqa: E402
from fechas_de_las_opps_sin_fecha import letras, limpio, numeros  # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "docs", "opps_sin_carpeta_dropbox_20oct.xlsx")


# El tipo de via, delante en las carpetas ("paseocares1", "carreteradecanillas108")
# y detras entre parentesis en el nombre de Catastro ("Cares 1, Fuenlabrada
# (paseo)"). Se quita en los dos lados antes de comparar.
TIPO = re.compile(r"^(?:(?:av|avd|avda|avenida|calle|cl|c|plaza|pza|pz|paseo|pso|ps|carretera|ctra|crtra|"
                  r"travesia|camino|cm|ronda|glorieta|urbanizacion|urb|calleja|callejon)(?:de(?:la|l|los|las)?)?)+")


def sin_tipo(s):
    return TIPO.sub("", s) or s


def parecido(lo, lc):
    a, b = sin_tipo(lo), sin_tipo(lc)
    r = max(difflib.SequenceMatcher(None, lo, lc).ratio(), difflib.SequenceMatcher(None, a, b).ratio())
    if len(a) >= 5 and len(b) >= 5 and (a in b or b in a):
        r = max(r, 0.9)
    return r


def letras_opp(nombre, muni):
    """Las letras de la calle. Con el nombre de Catastro ("Calle 15, Municipio
       (tipo)") la calle es lo que va antes de la coma, y el municipio NO se
       resta: "Nuevo Grinon 1, Grinon" perdia la calle entera."""
    sin_par = re.sub(r"\s*\([^)]*\)\s*$", "", nombre)
    if "," in sin_par:
        calle = sin_par.split(",")[0]
        return letras(calle), numeros(calle)
    return letras(sin_par, muni), numeros(sin_par)


def main():
    base = arrancar()
    por = carpetas()
    duena = {}
    for o in base.leer("oportunidades?select=nombre,codigo,dropbox_carpeta&anulada_en=is.null&dropbox_carpeta=not.is.null"):
        duena.setdefault(o["dropbox_carpeta"].replace("/", "\\").lower(), o["nombre"] or o["codigo"] or "?")
    ops = base.leer("oportunidades?select=id,codigo,nombre,estado,fecha_apertura,origen_notas,"
                    "comercial:comercial_id(nombre),comunidad:comunidad_id(municipio)"
                    "&anulada_en=is.null&dropbox_carpeta=is.null&order=nombre.asc.nullslast")
    filas = []
    for o in ops:
        muni = (o["comunidad"] or {}).get("municipio") or ""
        lo, no = letras_opp(o["nombre"] or "", muni)
        libres, de_otra = [], []
        for ruta, nom in por.get(limpio(muni), []):
            nc = numeros(nom)
            if not no or not nc or not (no & nc):
                continue
            r = parecido(lo, letras(nom))
            if r >= 0.75:
                if ruta.lower() in duena:
                    de_otra.append((r, ruta))
                else:
                    libres.append((r, ruta))
        libres.sort(reverse=True)
        de_otra.sort(reverse=True)
        on = re.sub(r"\s+", " ", o["origen_notas"] or "")
        if not o["nombre"]:
            porque = "La opp no tiene nombre"
        elif libres:
            porque = "Carpeta parecida: confirmar" if len(libres) == 1 else "Varias carpetas parecidas: elegir"
        elif de_otra:
            porque = "Su carpeta ya es de otra opp: ¿duplicada?"
        elif not muni:
            porque = "Sin municipio"
        else:
            porque = "Ninguna carpeta parecida en su municipio"
        otras = [r for _, r in libres[1:3]] + ["%s (ya es de: %s)" % (r, duena[r.lower()]) for _, r in de_otra[:2]]
        filas.append([o["nombre"] or o["codigo"] or "SIN NOMBRE NI CODIGO", muni, o["estado"],
                      o["fecha_apertura"] or "", (o["comercial"] or {}).get("nombre") or "", porque,
                      libres[0][1] if libres else "", " || ".join(otras),
                      "", on[:200], o["codigo"] or "", o["id"]])

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sin carpeta"
    ws.append(["Opp", "Municipio", "Estado", "Apertura", "Comercial", "Que pasa",
               "Propuesta", "Otras candidatas", "TU CARPETA (si la propuesta no vale)",
               "Texto de origen", "Codigo", "id"])
    for c in ws[1]:
        c.font = Font(bold=True)
    orden = {"Carpeta parecida: confirmar": 0, "Varias carpetas parecidas: elegir": 1,
             "Su carpeta ya es de otra opp: ¿duplicada?": 2, "Ninguna carpeta parecida en su municipio": 3, "Sin municipio": 4, "La opp no tiene nombre": 5}
    for f in sorted(filas, key=lambda f: (orden.get(f[5], 9), f[0])):
        ws.append(f)
    for col, w in zip("ABCDEFGHIJKL", [40, 20, 10, 11, 11, 36, 60, 60, 45, 60, 15, 38]):
        ws.column_dimensions[col].width = w
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    wb.save(SALIDA)

    from collections import Counter
    print("sin carpeta:", len(filas))
    for k, v in sorted(Counter(f[5] for f in filas).items(), key=lambda x: orden.get(x[0], 9)):
        print("  %-42s %d" % (k, v))
    print("->", SALIDA)


if __name__ == "__main__":
    main()
