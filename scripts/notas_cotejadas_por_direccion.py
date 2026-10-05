# -*- coding: utf-8 -*-
"""
LAS QUE SE COTEJAN POR LA DIRECCION          (Monica, 4-oct-2026)

El cotejo carpeta -> comunidad salia de 'documentos.origen_ruta_dropbox', que
quedo guardado al subir las tarjetas del CIF. Pero no todas las comunidades
tienen tarjeta, asi que 59 carpetas de su listado de julio se quedaban fuera con
sus notas dentro. Aqui se cotejan por la direccion.

COMO SE COTEJA, Y LOS TRES TROPIEZOS QUE HUBO (cada uno costo una pasada):

  1. En las carpetas las palabras van PEGADAS: "dosdemayo28". Comparar por
     palabras no vale -da ['dosdemayo','28'] frente a ['dos','mayo','28']-, asi
     que se comparan las LETRAS SEGUIDAS, sin acentos y sin el municipio.
  2. NO se quitan los articulos. "CASTILLA LA NUEVA", "LOS ANGELES" y "LA VEGA"
     los llevan dentro del nombre de la calle: quitarlos rompe el cotejo.
  3. Si los dos lados traen VARIOS numeros, tienen que ser LOS MISMOS. Con solo
     intersectar, "iglesia16portal1" encajaba tambien con el portal 4, porque
     compartian el 16.

Con eso: 52 de 59. Dos se sacan a mano y quedan para ella:
  - 'lilos6', que encaja con "LILOS 6 BIS PORTAL 1, 2" solo porque "LOS LILOS 6"
    se cae por un detalle del algoritmo (el nombre corto no pasa el minimo de
    letras), no porque sea mejor candidata. Es ambigua de verdad.
  - 'santamarialablanca5', que apunta a la comunidad EN DISPUTA -la que tiene dos
    carpetas con fechas distintas- y que ya se aparto antes.

Quedan 50. Las notas se sacan con el mismo lector robusto de las apartadas, que
quita la ficha escrita a mano y respeta todo lo demas.

Uso:
    python scripts/notas_cotejadas_por_direccion.py             <- marcha en seco
    python scripts/notas_cotejadas_por_direccion.py --escribir
"""
import csv
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar                      # noqa: E402
from leer_fichas import PROVINCIA, fichas_de         # noqa: E402
from notas_de_las_apartadas import bloques_de        # noqa: E402
from notas_de_julio import trocear                   # noqa: E402

LISTA = "cotejo_por_direccion.csv"
FUERA = {"lilos6", "santamarialablanca5"}


def main():
    escribir = "--escribir" in sys.argv
    b = arrancar()
    print("\n*** %s ***\n" % ("ESCRIBIENDO" if escribir else "MARCHA EN SECO"))

    fechas = {}
    for f in csv.DictReader(io.open("fechas_carpetas.csv", encoding="utf-8"), delimiter="|"):
        fechas[(f["municipio"], f["carpeta"])] = f["fecha"]

    opps_de = {}
    for o in b.leer("oportunidades?select=id,comunidad_id&comunidad_id=not.is.null", por_tramos=True):
        opps_de.setdefault(o["comunidad_id"], []).append(o["id"])
    ya = {r["oportunidad_id"] for r in b.leer("notas_oportunidad?select=oportunidad_id", por_tramos=True)}

    nuevas_opp, nuevas_subv, sin_nada = [], [], []
    hechas = 0
    for f in csv.DictReader(io.open(LISTA, encoding="utf-8"), delimiter="|"):
        if f["estado"] != "ok" or f["carpeta"] in FUERA:
            continue
        rutas = fichas_de(os.path.join(PROVINCIA, f["municipio"], f["carpeta"]))
        if not rutas:
            continue
        opps = [o for o in opps_de.get(f["comunidad_id"], []) if o not in ya]
        if not opps:
            continue
        hechas += 1
        bl = bloques_de(rutas[0])
        fe = fechas.get((f["municipio"], f["carpeta"])) or ""
        anio = int(fe[:4]) if fe[:4].isdigit() else None
        n_o = n_s = 0
        for clave, destino in (("oportunidad", nuevas_opp), ("subvencion", nuevas_subv)):
            for fecha, texto in trocear(bl[clave], anio):
                for oid in opps:
                    destino.append({"oportunidad_id": oid, "fecha": fecha,
                                    "texto": texto, "origen": "ficha_dropbox"})
                n_o += 1 if clave == "oportunidad" else 0
                n_s += 1 if clave == "subvencion" else 0
        print("%-11s %-30s %-42s opp:%-3d subv:%d"
              % (f["municipio"][:11], f["carpeta"][:30], f["comunidad"][:42], n_o, n_s))
        if not (n_o or n_s):
            sin_nada.append(f["carpeta"])

    print("\ncarpetas tratadas : %d" % hechas)
    print("notas_oportunidad : %d (%d con fecha)"
          % (len(nuevas_opp), len([x for x in nuevas_opp if x["fecha"]])))
    print("notas_subvencion  : %d" % len(nuevas_subv))
    print("sin nada que sacar: %d  %s" % (len(sin_nada), ", ".join(sin_nada)))

    if not escribir:
        print("\n   (marcha en seco. Para hacerlo: --escribir)\n")
        return
    print("\n--- escribiendo ---")
    if nuevas_opp:
        print("   notas_oportunidad: %d" % b.insertar("notas_oportunidad", nuevas_opp))
    if nuevas_subv:
        print("   notas_subvencion : %d" % b.insertar("notas_subvencion", nuevas_subv))
    print("\n--- total en produccion ---")
    print("   notas_oportunidad: %d" % len(b.leer("notas_oportunidad?select=id", por_tramos=True)))
    print("   notas_subvencion : %d" % len(b.leer("notas_subvencion?select=id", por_tramos=True)))


if __name__ == "__main__":
    main()
