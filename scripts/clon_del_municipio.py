# -*- coding: utf-8 -*-
"""
LAS CARPETAS DE UN MUNICIPIO QUE NO ESTAN EN LA APP     (Monica, 5-oct-2026)

En el Dropbox de Leganes hay 286 carpetas y en la app 97 comunidades. 91 se
cotejaron; las otras 194 no tienen comunidad, y no es que el cotejo fallara -de
las 97, 91 encontraron carpeta-: es que nunca estuvieron en Monday, y por eso no
entraron en la migracion de julio.

Son 123 de 2022 o antes -archivo historico- y 71 de 2023 en adelante, de las que
28 son de 2025 y 2026 y podrian estar vivas. 125 traen notas, 59 administrador y
32 CIF: no son carpetas vacias, son expedientes.

Van a la tabla-clon, que tiene a proposito las mismas columnas que haran falta en
produccion, hasta que ella las revise una a una.

REGLAS QUE SE APLICAN, TODAS SUYAS:
  - fecha <= 31-dic-2022  ->  nace CERRADA, con "migrada de Dropbox" y sin fecha
    de cierre ni resultado: no se sabe como acabo y ponerlo seria inventarlo.
  - comercial sin etiqueta  ->  DANIEL, "es de la epoca de cuando no habia mas
    comercial que el".
  - NO se toca `empresa_id`: el administrador se cuadra a mano y no se crean
    administradores nuevos sin que ella los vea.
  - el formulario NO va en las notas; lo escrito en los huecos va etiquetado.

Uso: python scripts/clon_del_municipio.py MOSTOLES [--escribir]
"""
import csv
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar                              # noqa: E402
from leer_fichas import PROVINCIA, fichas_de                 # noqa: E402
from notas_de_las_apartadas import bloques_de                # noqa: E402
from quitar_el_formulario import partir                      # noqa: E402
from lo_escrito_en_los_huecos import lineas_de               # noqa: E402

TABLA = "comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una"
# El municipio por la linea de ordenes: las listas escritas a mano se olvidan y
# ya rompieron el cotejo una vez.
MUNI = ([a.upper() for a in sys.argv[1:] if not a.startswith("-")] or ["LEGANES"])[0]
BARRA = chr(92)
CORTE = "2022-12-31"


def main():
    escribir = "--escribir" in sys.argv
    b = arrancar()
    print("\n*** %s ***\n" % ("ESCRIBIENDO" if escribir else "MARCHA EN SECO"))

    sin = [f["carpeta"] for f in csv.DictReader(io.open("cotejo_por_direccion.csv", encoding="utf-8"), delimiter="|")
           if f["municipio"] == MUNI and f["estado"] == "sin_pareja"]
    fechas = {f["carpeta"]: f["fecha"]
              for f in csv.DictReader(io.open("fechas_carpetas.csv", encoding="utf-8"), delimiter="|")
              if f["municipio"] == MUNI}
    fichas = {r["carpeta"]: r for r in csv.DictReader(io.open("fichas_%s.csv" % MUNI.lower().replace(" ", "_"), encoding="utf-8"))}

    ya = {c["carpeta"] for c in b.leer(TABLA + "?select=carpeta&municipio=eq." + MUNI)}

    filas, cerradas, abiertas, con_notas = [], 0, 0, 0
    for carp in sorted(sin):
        if carp in ya:
            continue
        f = fichas.get(carp, {})
        fe = fechas.get(carp) or None
        cerrada = bool(fe) and fe <= CORTE

        # Las notas: el diario sin el formulario, y debajo lo escrito en los
        # huecos, cada cosa con su etiqueta.
        texto = []
        rutas = fichas_de(os.path.join(PROVINCIA, MUNI, carp))
        if rutas:
            diario = partir(bloques_de(rutas[0])["oportunidad"])[1].strip()
            if diario:
                texto.append(diario)
            huecos = ["[%s] %s" % (fam, " ".join(t.split())) for fam, t in lineas_de(rutas[0])]
            if huecos:
                texto.append("\n".join(huecos))
        notas = "\n\n".join(texto) or None
        if notas:
            con_notas += 1

        filas.append({
            "comunidad_autonoma": "COMUNIDAD DE MADRID",
            "municipio": MUNI,
            "carpeta": carp,
            "ruta_dropbox": BARRA.join(["MADRID", "1APROVINCIA", MUNI, carp]),
            "cif_en_la_ficha": (f.get("cif") or "").strip() or None,
            "fecha_apertura": fe,
            "estado": "cerrada" if cerrada else "abierta",
            "cierre_notas": "migrada de Dropbox" if cerrada else None,
            "presidente": (f.get("presidente") or "").strip() or None,
            "notas_de_la_ficha": notas,
            "ref_catastral_de_la_ficha": (f.get("ref_catastral") or "").strip() or None,
            "admin_contacto": (f.get("admin_contacto") or "").strip() or None,
            "admin_telefono": (f.get("admin_telefono") or "").strip() or None,
            "admin_correo": (f.get("admin_correo") or "").strip() or None,
            "comercial_interno": (f.get("comercial_interno") or "").strip() or "Daniel",
            "trajo_empresa": (f.get("trajo_empresa") or "").strip() or None,
            "trajo_persona": (f.get("trajo_persona") or "").strip() or None,
        })
        cerradas += 1 if cerrada else 0
        abiertas += 0 if cerrada else 1

    print("   carpetas sin comunidad : %d" % len(sin))
    print("   ya estaban en la clon  : %d" % len(ya))
    print("   a insertar             : %d" % len(filas))
    print("      nacen cerradas (<= 2022) : %d" % cerradas)
    print("      nacen abiertas           : %d" % abiertas)
    print("      con notas                : %d" % con_notas)
    sinfecha = len([x for x in filas if not x["fecha_apertura"]])
    if sinfecha:
        print("      SIN FECHA (nacen abiertas): %d" % sinfecha)

    if not escribir:
        print("\n   (marcha en seco. Para hacerlo: --escribir)\n")
        return
    print("\n--- escribiendo ---")
    print("   %d filas" % b.insertar(TABLA, filas))
    print("   total en la clon: %d" % len(b.leer(TABLA + "?select=id", por_tramos=True)))


if __name__ == "__main__":
    main()
