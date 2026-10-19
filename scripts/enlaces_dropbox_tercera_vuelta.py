# -*- coding: utf-8 -*-
r"""
DROPBOX EN LA OPP, TERCERA VUELTA: LAS QUE QUEDAN  (Monica, 19-oct-2026)

    "es IMPOSIBLE que haya opps sin carpeta. NO es posible, PORQUE las opps las
     sacamos de las carpetas"

Despues de las dos primeras vueltas quedaban 588 opps sin carpeta y 476
carpetas de direccion sin opp. Dos causas:

  1. Las 89 opps SIN NOMBRE que traen "Ruta de Dropbox": la primera vuelta las
     aparto por no tener nombre, y eso fue un error: casi todas son carpetas de
     direccion normales (canon9, jaboneria4, artica11). Su ruta manda.
  2. El resto: se cotejan con las carpetas con EL MISMO COTEJO del 6-oct
     (fechas_de_las_opps_sin_fecha.py: letras pegadas + numeros), por el nombre
     de la opp y por el de su comunidad. Ahora tambien fuera de Madrid
     (CASTILLA LA MANCHA, CASTILLA Y LEON, CATALUNA, COMUNIDAD VALENCIANA), que
     no se habian mirado.

NO SE ELIGE: dos carpetas candidatas, o una carpeta que ya es de una opp de
OTRA comunidad, van a la lista. Monday no se toca.

Uso:
    python scripts/enlaces_dropbox_tercera_vuelta.py            # en seco
    python scripts/enlaces_dropbox_tercera_vuelta.py --escribir
"""
import collections
import csv
import io
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from leer_fichas import DROPBOX  # noqa: E402
from produccion import arrancar  # noqa: E402
from enlaces_dropbox_de_las_opps import RUTA, carpeta_de, fichas_en, sueltas  # noqa: E402
from fechas_de_las_opps_sin_fecha import encaja, letras, limpio, numeros  # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "docs", "enlaces_dropbox_tercera_vuelta.csv")
FUERA = ["CASTILLA LA MANCHA", "CASTILLA Y LEON", "CATALUÑA", "COMUNIDAD VALENCIANA"]


def carpetas():
    r"""{municipio en limpio: [(ruta relativa, nombre)]}. La capital esta en
       MADRID, la provincia en MADRID\1APROVINCIA\<MUNI>\. Fuera de Madrid,
       <REGION>\<PROVINCIA>\<carpeta> (la capital de provincia) y
       <REGION>\<PROVINCIA>\[1PROVINCIA|APROVINCIA\]<MUNI>\<carpeta>."""
    por = collections.defaultdict(list)
    cap = os.path.join(DROPBOX, "MADRID")
    for d in os.listdir(cap):
        if d.upper() != "1APROVINCIA" and os.path.isdir(os.path.join(cap, d)):
            por["madrid"].append(("MADRID\\" + d, d))
    prov = os.path.join(cap, "1APROVINCIA")
    for m in os.listdir(prov):
        for d in (os.listdir(os.path.join(prov, m)) if os.path.isdir(os.path.join(prov, m)) else []):
            if os.path.isdir(os.path.join(prov, m, d)):
                por[limpio(m)].append(("MADRID\\1APROVINCIA\\%s\\%s" % (m, d), d))
    for r in FUERA:
        pr = os.path.join(DROPBOX, r)
        if not os.path.isdir(pr):
            continue
        for p in os.listdir(pr):
            pp = os.path.join(pr, p)
            if not os.path.isdir(pp):
                continue
            for d in os.listdir(pp):
                if not os.path.isdir(os.path.join(pp, d)):
                    continue
                if re.match(r"^\d?A?PROVINCIA$", d.upper()):
                    for m in os.listdir(os.path.join(pp, d)):
                        for e in (os.listdir(os.path.join(pp, d, m)) if os.path.isdir(os.path.join(pp, d, m)) else []):
                            if os.path.isdir(os.path.join(pp, d, m, e)):
                                por[limpio(m)].append(("%s\\%s\\%s\\%s\\%s" % (r, p, d, m, e), e))
                elif d.isupper() and not re.search(r"\d", d):
                    # un municipio colgando de la provincia (VALENCIA\BURJASOT)
                    for e in os.listdir(os.path.join(pp, d)):
                        if os.path.isdir(os.path.join(pp, d, e)):
                            por[limpio(d)].append(("%s\\%s\\%s\\%s" % (r, p, d, e), e))
                else:
                    por[limpio(p)].append(("%s\\%s\\%s" % (r, p, d), d))
    return por


def ficha_de(carp):
    arriba = [os.path.join(carp, f) for f in sueltas(carp)]
    fs = fichas_en(carp)
    if len(arriba) == 1:
        return arriba[0], ""
    if not arriba and len(fs) == 1:
        return fs[0], ""
    return "", ("sin ficha" if not fs else "varias fichas: elegir")


def main():
    escribir = "--escribir" in sys.argv
    base = arrancar()
    por_muni = carpetas()
    coms = {c["id"]: c for c in base.leer("comunidades?select=id,nombre,municipio")}
    todas = base.leer("oportunidades?select=id,nombre,comunidad_id,fecha_apertura,origen_notas,dropbox_carpeta&anulada_en=is.null")
    # de quien es ya cada carpeta
    duena = collections.defaultdict(set)
    for o in todas:
        if o["dropbox_carpeta"]:
            duena[o["dropbox_carpeta"].replace("/", "\\").lower()].add(o["comunidad_id"])

    filas = []
    for o in todas:
        if o["dropbox_carpeta"]:
            continue
        c = coms.get(o["comunidad_id"]) or {}
        fila = {"id": o["id"], "nombre": o["nombre"] or "", "comunidad": c.get("nombre") or "",
                "municipio": c.get("municipio") or "", "comunidad_id": o["comunidad_id"] or "", "apertura": o["fecha_apertura"] or "",
                "como": "", "candidatas": "", "carpeta": "", "ficha": "", "aviso": ""}
        m = RUTA.search(o["origen_notas"] or "")
        cand = []
        if m and carpeta_de(m.group(1)) and os.path.isdir(os.path.join(DROPBOX, carpeta_de(m.group(1)))):
            cand, fila["como"] = [carpeta_de(m.group(1))], "ruta apuntada al migrarla"
        else:
            muni = c.get("municipio") or ""
            lista = por_muni.get(limpio(muni), [])
            vistos = set()
            # El "CP " del nombre de la comunidad no cuenta al comparar (13-oct-2026).
            for texto in (o["nombre"], re.sub(r"^\s*C\.?\s?P\.?\s+", "", c.get("nombre") or "", flags=re.I)):
                if not texto:
                    continue
                lo, no = letras(texto, muni), numeros(texto)
                for ruta, nom in lista:
                    if ruta not in vistos and encaja(letras(nom), numeros(nom), lo, no):
                        vistos.add(ruta)
                        cand.append(ruta)
            fila["como"] = "cotejo de la direccion (el del 6-oct)"
        fila["candidatas"] = " || ".join(cand)
        if not cand:
            fila["aviso"] = "ninguna carpeta encaja" if c.get("municipio") else "sin comunidad o sin municipio"
        elif len(cand) > 1:
            fila["aviso"] = "varias carpetas: elegir"
        else:
            carp = cand[0]
            otra = duena.get(carp.lower(), set()) - {o["comunidad_id"]}
            if otra:
                fila["aviso"] = "la carpeta ya es de otra comunidad"
            else:
                fila["carpeta"] = carp
                fila["ficha"], fila["aviso"] = ficha_de(carp)
        filas.append(fila)

    # una carpeta que reclaman DOS comunidades distintas en esta vuelta: no se elige
    reclama = collections.defaultdict(set)
    for f in filas:
        if f["carpeta"]:
            reclama[f["carpeta"].lower()].add(f["comunidad_id"])
    for f in filas:
        if f["carpeta"] and len(reclama[f["carpeta"].lower()]) > 1:
            f["aviso"], f["carpeta"], f["ficha"] = "carpeta reclamada por dos comunidades", "", ""

    with io.open(SALIDA, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(filas[0].keys()), delimiter=";")
        w.writeheader()
        w.writerows(sorted(filas, key=lambda f: (f["aviso"], f["nombre"] or f["comunidad"])))

    print("opps sin carpeta:", len(filas))
    print("con carpeta ahora:", sum(1 for f in filas if f["carpeta"]), " con ficha:", sum(1 for f in filas if f["ficha"]))
    print(collections.Counter((f["como"][:12], f["aviso"] or "ok") for f in filas).most_common())
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
