# -*- coding: utf-8 -*-
"""
LLEVAR LAS FECHAS AFINADAS A PRODUCCION Y A LA CLON   (Monica, 4-oct-2026)

Cuando la ficha solo daba el ano, el dia lo ponia yo (1 de enero). Ahora se
afina con el fichero mas antiguo de la carpeta si cae dentro de ese mismo ano
-ver scripts/fechas_de_carpetas.py-. Son 106 de 410 carpetas.

Esto lleva esas fechas a su sitio: 'oportunidades.fecha_apertura' en las
cotejadas, y 'fecha_apertura' en la tabla-clon.

NO cambia el corte del 31-dic-2022 -afinar dentro del ano no cruza el ano, y se
comprobo: 214 antes y 214 despues-, asi que ninguna oportunidad cambia de estado
ni se abre ni se cierra por esto.

Uso:
    python scripts/propagar_fechas_afinadas.py             <- marcha en seco
    python scripts/propagar_fechas_afinadas.py --escribir
"""
import csv
import io
import os
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402

BARRA = chr(92)
TABLA_CLON = "comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una"
pel = lambda s: "".join(c for c in unicodedata.normalize("NFKD", s or "")
                        if not unicodedata.combining(c)).lower().replace(" ", "")


def main():
    escribir = "--escribir" in sys.argv
    b = arrancar()
    print("\n*** %s ***\n" % ("ESCRIBIENDO" if escribir else "MARCHA EN SECO"))

    fechas = {}
    for f in csv.DictReader(io.open("fechas_carpetas.csv", encoding="utf-8"), delimiter="|"):
        if f["fecha"]:
            fechas[(f["municipio"], pel(f["carpeta"]))] = f["fecha"]

    # ---- la clon
    clon = b.leer(TABLA_CLON + "?select=id,municipio,carpeta,fecha_apertura,notas")
    cambios_clon = []
    for c in clon:
        if "NO ES UNA COMUNIDAD" in (c.get("notas") or ""):
            continue
        f = fechas.get((c["municipio"], pel(c["carpeta"])))
        if f and f != c["fecha_apertura"]:
            cambios_clon.append((c, f))

    # ---- produccion: carpeta -> comunidad -> opps
    c2com = {}
    for d in b.leer("documentos?select=comunidad_id,origen_ruta_dropbox&origen_ruta_dropbox=not.is.null"):
        p = (d["origen_ruta_dropbox"] or "").replace("/", BARRA).split(BARRA)
        if len(p) >= 4 and p[1].upper() == "1APROVINCIA":
            c2com.setdefault((p[2].upper(), pel(p[3])), d["comunidad_id"])
    if os.path.exists("cotejo_por_direccion.csv"):
        for f in csv.DictReader(io.open("cotejo_por_direccion.csv", encoding="utf-8"), delimiter="|"):
            if f["estado"] == "ok" and f["comunidad_id"]:
                c2com.setdefault((f["municipio"], pel(f["carpeta"])), f["comunidad_id"])

    opps_de = {}
    for o in b.leer("oportunidades?select=id,comunidad_id,fecha_apertura&comunidad_id=not.is.null",
                    por_tramos=True):
        opps_de.setdefault(o["comunidad_id"], []).append(o)

    # una comunidad con VARIAS carpetas de fechas distintas no se toca: no hay
    # forma de saber cual fecha es de cual oportunidad sin mirarlo.
    carpetas_de = {}
    for k, com in c2com.items():
        if k in fechas:
            carpetas_de.setdefault(com, set()).add(fechas[k])
    en_disputa = {com for com, fs in carpetas_de.items() if len(fs) > 1}

    cambios_opp, saltadas = [], 0
    for k, com in c2com.items():
        f = fechas.get(k)
        if not f or com not in opps_de:
            continue
        if com in en_disputa:
            saltadas += 1
            continue
        for o in opps_de[com]:
            if o["fecha_apertura"] != f:
                cambios_opp.append((o, f))

    print("   clon          : %d fechas a cambiar" % len(cambios_clon))
    print("   oportunidades : %d fechas a cambiar" % len(cambios_opp))
    print("   carpetas de comunidades con varias fechas, NO se tocan: %d" % saltadas)
    for o, f in cambios_opp[:10]:
        print("      opp %s  %s -> %s" % (o["id"][:8], o["fecha_apertura"] or "(vacia)", f))

    if not escribir:
        print("\n   (marcha en seco. Para hacerlo: --escribir)\n")
        return
    print("\n--- escribiendo ---")
    for c, f in cambios_clon:
        b.actualizar(TABLA_CLON + "?id=eq." + c["id"], {"fecha_apertura": f})
    for o, f in cambios_opp:
        b.actualizar("oportunidades?id=eq." + o["id"], {"fecha_apertura": f})
    print("   clon: %d   oportunidades: %d" % (len(cambios_clon), len(cambios_opp)))
    n = b.leer("oportunidades?select=id&fecha_apertura=not.is.null", por_tramos=True)
    print("\n   oportunidades con fecha de apertura: %d" % len(n))


if __name__ == "__main__":
    main()
