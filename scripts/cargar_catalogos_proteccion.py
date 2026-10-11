# -*- coding: utf-8 -*-
"""
CATALOGOS DE PROTECCION A LA TABLA catalogo_proteccion (Monica, 11-oct-2026).

Los PDF los bajo Monica (estan en el almacen "referencia", catalogos-proteccion/...)
y se leyeron ficha a ficha. Lo leido esta en docs/catalogos_proteccion/*.json.
Todo entra SIN REVISAR (revisado_por vacio): el OCR de varios PDF viene roto y
las dudas van en notas. Se puede relanzar: borra lo de esos municipios sin
revisar y lo vuelve a meter; lo ya revisado no se toca.

Uso:  python scripts/cargar_catalogos_proteccion.py [escribir]
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from produccion import arrancar  # noqa: E402

DOCS = os.path.join(os.path.dirname(__file__), "..", "docs", "catalogos_proteccion")

# fichero json -> {clave 'fuente' del json (o None): (fuente, documento_ruta)}
FUENTES = {
    "leganes.json": {None: ("Catalogo de edificios protegidos de Leganes (Ayuntamiento)",
                            "catalogos-proteccion/leganes/catalogo-edificios-protegidos.pdf")},
    "fuenlabrada.json": {None: ("BOCM 20-05-1999, Plan General de Fuenlabrada: catalogo",
                                "catalogos-proteccion/fuenlabrada/BOCM-1999-PGOU-Fuenlabrada.pdf")},
    "mostoles.json": {None: ("BOCM 2009, catalogo de bienes protegidos de Mostoles",
                             "catalogos-proteccion/mostoles/BOCM-2009-catalogo-Mostoles.pdf")},
    "alcobendas_ssreyes.json": {
        "alcobendas": ("Catalogo de bienes y espacios protegidos de Alcobendas",
                       "catalogos-proteccion/alcobendas/catalogo-bienes-espacios-protegidos.pdf"),
        "alcobendas_mod2021": ("Modificacion del catalogo de Alcobendas (2021)",
                               "catalogos-proteccion/alcobendas/modificacion-2021.pdf"),
        "ssreyes": ("Normas de proteccion del Plan General de San Sebastian de los Reyes",
                    "catalogos-proteccion/san-sebastian-de-los-reyes/normas-proteccion.pdf"),
    },
}

CAMPOS = ("municipio", "tipo", "numero_ficha", "denominacion", "direccion",
          "referencia_catastral", "grado", "alcance", "pagina", "notas")


def filas():
    for fichero, fuentes in FUENTES.items():
        for r in json.load(open(os.path.join(DOCS, fichero), encoding="utf-8")):
            fuente, ruta = fuentes[r.get("fuente") if len(fuentes) > 1 else None]
            f = {c: r.get(c) for c in CAMPOS}
            f["fuente"], f["documento_ruta"] = fuente, ruta
            yield f


if __name__ == "__main__":
    todas = list(filas())
    municipios = sorted({f["municipio"] for f in todas})
    for m in municipios:
        print(m, sum(1 for f in todas if f["municipio"] == m))
    if sys.argv[1:] != ["escribir"]:
        sys.exit("(solo mirar; para cargar: escribir)")
    b = arrancar()
    for m in municipios:
        b.borrar("catalogo_proteccion?municipio=eq.%s&revisado_por=is.null" % m.replace(" ", "%20"))
    b.insertar("catalogo_proteccion", todas)
    print("cargadas", len(todas))
