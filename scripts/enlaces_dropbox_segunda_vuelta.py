# -*- coding: utf-8 -*-
r"""
EL ENLACE A DROPBOX DE LAS OPPS QUE VINIERON DE MONDAY  (Monica, 19-oct-2026)

    "LO HEMOS RECONSTRUIDO TODO. se volcaron TODAS las fichas de todas las
     carpetas" — y 2024, 2025 y 2026 son las mas relevantes.

La primera vuelta (enlaces_dropbox_de_las_opps.py) solo cubria las opps creadas
desde la tabla clon, que traen "Ruta de Dropbox" en origen_notas: las que NO
estaban en Monday. Las de Monday tienen su ficha volcada, pero el puente
carpeta -> opp quedo en otros sitios. NO SE COTEJA NADA NUEVO; se leen los
cruces que ya se hicieron, y Monday no se toca:

  A. fechas_opps_sin_fecha.csv (6-oct): comunidad -> carpeta, estado "ok". Es el
     cotejo con que se pusieron las fechas de apertura.
  B. observaciones_expediente.ficha_ref: la ficha exacta de la que salieron las
     notas de esa comunidad (ficha_ref = id de C:\accesalia-fichas\indice.jsonl).
  C. documentos.origen_ruta_dropbox: la tarjeta del CIF que se subio de esa
     carpeta.

Si las fuentes no dicen la misma carpeta, o una comunidad tiene varias, NO SE
ELIGE: va a la lista. La ficha, igual que en la primera vuelta: la que diga B
si es una; si no, la unica suelta en la carpeta; si hay varias, a la lista.

Uso:
    python scripts/enlaces_dropbox_segunda_vuelta.py            # en seco
    python scripts/enlaces_dropbox_segunda_vuelta.py --escribir
"""
import collections
import csv
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from leer_fichas import DROPBOX  # noqa: E402
from produccion import arrancar  # noqa: E402
from enlaces_dropbox_de_las_opps import carpeta_de, fichas_en, sueltas  # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "docs", "enlaces_dropbox_segunda_vuelta.csv")
COTEJO_6_OCT = os.path.join(RAIZ, "fechas_opps_sin_fecha.csv")
INDICE = r"C:\accesalia-fichas\indice.jsonl"


def desde_raiz(r):
    """Las rutas del indice y de documentos van desde MADRID\ o sin el."""
    r = r.replace("/", "\\").strip("\\")
    return r if r.upper().startswith(("MADRID\\", "CASTILLA")) else "MADRID\\" + r


def dentro(a, b):
    a, b = a.lower(), b.lower()
    return a == b or a.startswith(b + "\\") or b.startswith(a + "\\")


def main():
    escribir = "--escribir" in sys.argv
    base = arrancar()

    # A. el cotejo del 6-oct
    por_com = collections.defaultdict(lambda: {"A": set(), "B": set(), "C": set(), "fichas_B": set()})
    for f in csv.DictReader(io.open(COTEJO_6_OCT, encoding="utf-8"), delimiter="|"):
        if f["estado"] == "ok" and f["carpeta"] and f["comunidad_id"]:
            mun = f["municipio"].upper()
            c = "MADRID\\" + f["carpeta"] if mun == "MADRID" else "MADRID\\1APROVINCIA\\%s\\%s" % (mun, f["carpeta"])
            por_com[f["comunidad_id"]]["A"].add(c)

    # B. la ficha de la que salieron las notas
    indice = {}
    for l in io.open(INDICE, encoding="utf-8"):
        d = json.loads(l)
        indice[d["id"]] = desde_raiz(d["ruta_dropbox"])
    for o in base.leer("observaciones_expediente?select=comunidad_id,ficha_ref&ficha_ref=not.is.null&comunidad_id=not.is.null"):
        r = indice.get(o["ficha_ref"])
        if r:
            por_com[o["comunidad_id"]]["fichas_B"].add(r)
            por_com[o["comunidad_id"]]["B"].add(os.path.dirname(r))

    # C. la tarjeta del CIF
    for d in base.leer("documentos?select=comunidad_id,origen_ruta_dropbox&origen_ruta_dropbox=not.is.null&comunidad_id=not.is.null"):
        r = d["origen_ruta_dropbox"].replace("/", "\\")
        i = r.lower().find("ascensores y rehabilitaciones\\")
        r = r[i + len("ascensores y rehabilitaciones\\"):] if i >= 0 else desde_raiz(r)
        c = carpeta_de(r)
        if c:
            por_com[d["comunidad_id"]]["C"].add(c)

    opps = base.leer("oportunidades?select=id,nombre,comunidad_id,fecha_apertura"
                     "&anulada_en=is.null&dropbox_carpeta=is.null&comunidad_id=not.is.null")
    filas = []
    for o in opps:
        p = por_com.get(o["comunidad_id"])
        if not p:
            continue
        fila = {"id": o["id"], "nombre": o["nombre"] or "", "apertura": o["fecha_apertura"] or "",
                "fuentes": "".join(k for k in "ABC" if p[k]),
                "A_cotejo_6_oct": " | ".join(sorted(p["A"])), "B_ficha_de_las_notas": " | ".join(sorted(p["fichas_B"])),
                "C_tarjeta_cif": " | ".join(sorted(p["C"])),
                "carpeta": "", "ficha": "", "aviso": ""}
        todas = sorted(p["A"] | p["B"] | p["C"], key=len)
        # La carpeta: la mas corta, y todas las demas tienen que caer dentro de ella.
        carp = todas[0]
        if any(not dentro(carp, x) for x in todas) or len(p["A"]) > 1 or len(p["C"]) > 1:
            fila["aviso"] = "las fuentes no dicen la misma carpeta"
        elif not o["nombre"]:
            fila["aviso"] = "opp sin nombre: no se toca"
        elif not os.path.isdir(os.path.join(DROPBOX, carp)):
            fila["aviso"] = "la carpeta no existe en Dropbox"
        else:
            fila["carpeta"] = carp
            if len(p["fichas_B"]) == 1:
                fila["ficha"] = next(iter(p["fichas_B"]))
            elif len(p["fichas_B"]) > 1:
                fila["aviso"] = "varias fichas: elegir"
            else:
                arriba = [os.path.join(carp, f) for f in sueltas(carp)]
                fs = fichas_en(carp)
                if len(arriba) == 1:
                    fila["ficha"] = arriba[0]
                elif not arriba and len(fs) == 1:
                    fila["ficha"] = fs[0]
                elif not fs:
                    fila["aviso"] = "sin ficha"
                else:
                    fila["aviso"] = "varias fichas: elegir"
            if fila["ficha"] and not os.path.isfile(os.path.join(DROPBOX, fila["ficha"])):
                fila["ficha"], fila["aviso"] = "", "la ficha ya no esta en Dropbox"
        filas.append(fila)

    with io.open(SALIDA, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(filas[0].keys()), delimiter=";")
        w.writeheader()
        w.writerows(sorted(filas, key=lambda f: (f["aviso"], f["nombre"])))

    print("opps con algun puente:", len(filas))
    print("con carpeta:", sum(1 for f in filas if f["carpeta"]), " con ficha:", sum(1 for f in filas if f["ficha"]))
    print(collections.Counter(f["aviso"] or "ok" for f in filas))
    print("por anio (con carpeta):", sorted(collections.Counter(f["apertura"][:4] or "sin" for f in filas if f["carpeta"]).items()))
    print("->", SALIDA)

    if escribir:
        n = 0
        for f in filas:
            if f["carpeta"]:
                base.actualizar("oportunidades?id=eq." + f["id"], {
                    "dropbox_carpeta": f["carpeta"].replace("\\", "/"),
                    "dropbox_ficha": f["ficha"].replace("\\", "/") or None,
                })
                n += 1
        print("escritas:", n)


if __name__ == "__main__":
    main()
