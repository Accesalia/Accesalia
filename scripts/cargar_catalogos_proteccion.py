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
                            "catalogos-proteccion/leganes/catalogo-edificios-protegidos.pdf"),
                     "normas": ("Normas urbanisticas de Leganes (PGOU 1999), art. 163: zonas arqueologicas",
                                "catalogos-proteccion/leganes/normas-urbanisticas.pdf")},
    "fuenlabrada.json": {None: ("BOCM 20-05-1999, Plan General de Fuenlabrada: catalogo",
                                "catalogos-proteccion/fuenlabrada/BOCM-1999-PGOU-Fuenlabrada.pdf")},
    "mostoles.json": {None: ("BOCM 2009, catalogo de bienes protegidos de Mostoles",
                             "catalogos-proteccion/mostoles/BOCM-2009-catalogo-Mostoles.pdf"),
                      "nupar": ("Normas urbanisticas de Mostoles, NU-PAR: areas de proteccion arqueologica",
                                "catalogos-proteccion/mostoles/normas-nu-par-arqueologia.pdf")},
    "alcobendas_ssreyes.json": {
        "alcobendas": ("Catalogo de bienes y espacios protegidos de Alcobendas",
                       "catalogos-proteccion/alcobendas/catalogo-bienes-espacios-protegidos.pdf"),
        "alcobendas_mod2021": ("Modificacion del catalogo de Alcobendas (2021)",
                               "catalogos-proteccion/alcobendas/modificacion-2021.pdf"),
        "ssreyes": ("Normas de proteccion del Plan General de San Sebastian de los Reyes",
                    "catalogos-proteccion/san-sebastian-de-los-reyes/normas-proteccion.pdf"),
    },
    # ALCALA (11-oct): los catalogos son escaneados; se leyeron como imagen, ficha a ficha.
    # La pagina es la del fichero guardado (el 101-218 va partido en dos mitades).
    "alcala_pgou.json": {"pgou1994": ("Catalogo de bienes protegidos del Plan General de Alcala (1994)",
                                      "catalogos-proteccion/alcala-de-henares/catalogo-bienes-protegidos-1994.pdf")},
    "alcala_casco_1.json": {"casco_1": ("Plan Especial del Casco Historico de Alcala (refundido 2024): catalogo, fichas 1-100",
                                        "catalogos-proteccion/alcala-de-henares/casco-historico-catalogo-1-100.pdf")},
    "alcala_casco_2a.json": {"casco_2a": ("Plan Especial del Casco Historico de Alcala (refundido 2024): catalogo, fichas 101-218 (1a mitad)",
                                          "catalogos-proteccion/alcala-de-henares/casco-historico-catalogo-101-218-parte1.pdf")},
    "alcala_casco_2b.json": {"casco_2b": ("Plan Especial del Casco Historico de Alcala (refundido 2024): catalogo, fichas 101-218 (2a mitad)",
                                          "catalogos-proteccion/alcala-de-henares/casco-historico-catalogo-101-218-parte2.pdf")},
    "alcala_arqueologia.json": {"nnuu2023": ("Normas urbanisticas del Plan General de Alcala (BOCM 20-11-2023), cap. 19: areas arqueologicas",
                                             "catalogos-proteccion/alcala-de-henares/normas-urbanisticas-pgou-2023.pdf")},
    # 15-OCT-2026: los cinco que faltaban (Monica). Leidos ficha a ficha como imagen.
    "aranjuez.json": {
        "arqueologia": ("Catalogo de Aranjuez (PGOU 1996): normas de proteccion y arqueologia, cap. 6",
                        "catalogos-proteccion/aranjuez/normas-proteccion-y-arqueologia.pdf"),
        "monumental": ("Catalogo de Aranjuez (PGOU 1996): edificios monumentales", "catalogos-proteccion/aranjuez/edificios-monumentales.pdf"),
        "singulares": ("Catalogo de Aranjuez (PGOU 1996): elementos singulares", "catalogos-proteccion/aranjuez/elementos-singulares.pdf"),
        **{"inventario_00%d" % (n + 2): ("Catalogo de Aranjuez (PGOU 1996): inventario de rehabilitacion (%d de 5)" % n,
                                          "catalogos-proteccion/aranjuez/inventario-rehabilitacion-%d.pdf" % n) for n in range(1, 6)},
        "sitios": ("Catalogo de Aranjuez (PGOU 1996): sitios historicos y paseos", "catalogos-proteccion/aranjuez/sitios-y-paseos.pdf"),
        "jardines": ("Catalogo de Aranjuez (PGOU 1996): jardines historicos", "catalogos-proteccion/aranjuez/jardines.pdf"),
    },
    "getafe.json": {
        "catalogo_1": ("Catalogo de Getafe (PGOU 2003): listado", "catalogos-proteccion/getafe/catalogo-listado.pdf"),
        "catalogo_2": ("Catalogo de Getafe (PGOU 2003): fichas 1-10", "catalogos-proteccion/getafe/catalogo-fichas-1-10.pdf"),
        "catalogo_3": ("Catalogo de Getafe (PGOU 2003): fichas 11-20", "catalogos-proteccion/getafe/catalogo-fichas-11-20.pdf"),
        "normas": ("Normas urbanisticas de Getafe, Titulo IV: zonas arqueologicas (arts. 120-122)",
                   "catalogos-proteccion/getafe/normas-titulo-iv.pdf"),
    },
    "parla.json": {None: ("Catalogo del Plan General de Parla (1997)", "catalogos-proteccion/parla/catalogo.pdf")},
    "pinto.json": {None: ("Catalogo de Pinto (Revision PGOU 2002)", "catalogos-proteccion/pinto/catalogo.pdf")},
    "torrejon.json": {
        "normas_ayto": ("Normas urbanisticas de Torrejon de Ardoz (version del Ayuntamiento): catalogo",
                        "catalogos-proteccion/torrejon-de-ardoz/normas-urbanisticas.pdf"),
        "arqueologia": ("Normas urbanisticas de Torrejon de Ardoz: N-PPA, art. 29 bis (arqueologia)",
                        "catalogos-proteccion/torrejon-de-ardoz/normas-urbanisticas.pdf"),
        "visor": ("Catalogo de Torrejon de Ardoz (visor, 1999)", "catalogos-proteccion/torrejon-de-ardoz/catalogo-visor.pdf"),
    },
}

# ARANJUEZ Y PINTO numeran las parcelas como en 1996/2002 y no casan con las de
# hoy (Florida 79 de Aranjuez: 8414001 en el catalogo, 8414101 en Catastro;
# Pedro Faura 6 de Pinto: 352504 / 0448903). Se dejan escritas con otra palabra,
# para que el cruce no las use y no case con la parcela que no es: alli se casa
# por la calle y el numero.
NUMERACION_ANTIGUA = {"aranjuez.json", "pinto.json"}

CAMPOS = ("municipio", "tipo", "numero_ficha", "denominacion", "direccion",
          "referencia_catastral", "grado", "alcance", "pagina", "notas")


def filas():
    for fichero, fuentes in FUENTES.items():
        for r in json.load(open(os.path.join(DOCS, fichero), encoding="utf-8")):
            fuente, ruta = fuentes.get(r.get("fuente")) or fuentes[None]
            f = {c: r.get(c) for c in CAMPOS}
            if fichero in NUMERACION_ANTIGUA and f["notas"]:
                f["notas"] = f["notas"].replace("parcela catastral", "parcela del catalogo (numeracion antigua, no la de hoy)")
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
