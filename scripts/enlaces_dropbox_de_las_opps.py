# -*- coding: utf-8 -*-
r"""
EL ENLACE A LA CARPETA Y A LA FICHA ANTIGUAS DE CADA OPP  (Monica, 19-oct-2026)

    "en todas las opps antiguas tenemos la hoja de la ficha de datos de dropbox.
     Hemos extraido los datos, pero podemos poner en cada opp un enlace a su hoja
     de ficha de dropbox??? son cosas historicas, a veces estan mal migradas y
     son demasiadas para ir una a una, pero tener el enlace a la carpeta de
     dropbox lo facilita."

De donde sale la carpeta: de la linea "Ruta de Dropbox: ..." que se dejo en
`oportunidades.origen_notas` al migrarlas. NO se vuelve a cotejar por nombre:
solo se usa lo que ya quedo apuntado. Esa ruta a veces es la de un fichero de
dentro (el CIF de la comunidad), asi que se sube hasta la carpeta de la
direccion:

    MADRID\<carpeta>                         la capital
    MADRID\1APROVINCIA\<MUNICIPIO>\<carpeta> la provincia
    <OTRA>\<PROVINCIA>\<carpeta>             fuera de Madrid

De donde sale la ficha: se busca DENTRO de esa carpeta, en el Dropbox
sincronizado de este ordenador, un .docx con FICHA en el nombre (las copias en
conflicto de Dropbox no cuentan). Si hay UNA, es esa. Si hay varias -una por
trabajo, SATE y ASCENSOR- NO SE ELIGE: va a la lista para que la mire ella.

Se guarda la ruta a partir de "Ascensores y rehabilitaciones", con barras /.
El principio del enlace lo pone la app (lib/dropbox.ts).

Uso:
    python scripts/enlaces_dropbox_de_las_opps.py            # en seco: deja el CSV
    python scripts/enlaces_dropbox_de_las_opps.py --escribir # y lo sube
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

SALIDA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                      "docs", "enlaces_dropbox_de_las_opps.csv")
RUTA = re.compile(r"Ruta de Dropbox:\s*([^\r\n]+)")


def es_ficha(f):
    n, e = os.path.splitext(f)
    return e.lower() == ".docx" and "FICHA" in n.upper() and not n.startswith("~")         and "conflicto" not in n.lower()


def sueltas(carpeta):
    """Las fichas que estan directamente en la carpeta, no en sus subcarpetas."""
    try:
        return sorted(f for f in os.listdir(os.path.join(DROPBOX, carpeta))
                      if es_ficha(f) and os.path.isfile(os.path.join(DROPBOX, carpeta, f)))
    except OSError:
        return []


def carpeta_de(ruta):
    """La carpeta de la direccion, aunque la ruta apunte a algo de dentro."""
    trozos = [t for t in ruta.strip().strip("\\/").replace("/", "\\").split("\\") if t]
    if trozos and trozos[0].upper() == "MADRID":
        n = 4 if len(trozos) > 1 and trozos[1].upper() == "1APROVINCIA" else 2
    else:
        n = 3
    if len(trozos) < n:
        return None
    for k in range(len(trozos), n - 1, -1):
        c = "\\".join(trozos[:k])
        if os.path.isdir(os.path.join(DROPBOX, c)) and sueltas(c):
            return c
    return "\\".join(trozos[:n])


def fichas_en(carpeta):
    fuera = []
    for base, _, fich in os.walk(os.path.join(DROPBOX, carpeta)):
        fuera += [os.path.relpath(os.path.join(base, f), DROPBOX) for f in fich if es_ficha(f)]
    return sorted(fuera, key=lambda r: (r.count(os.sep), r))


def main():
    escribir = "--escribir" in sys.argv
    base = arrancar()
    opps = base.leer("oportunidades?select=id,nombre,origen_notas"
                     "&anulada_en=is.null&origen_notas=ilike.*Ruta%20de%20Dropbox*")
    filas, cache = [], {}
    for o in opps:
        m = RUTA.search(o["origen_notas"] or "")
        if not m:
            continue
        carp = carpeta_de(m.group(1))
        fila = {"id": o["id"], "nombre": o["nombre"] or "", "ruta_en_notas": m.group(1).strip(),
                "carpeta": "", "ficha": "", "fichas_en_la_carpeta": "", "aviso": ""}
        if not o["nombre"]:
            fila["aviso"] = "opp sin nombre: no se toca"
        elif not carp:
            fila["aviso"] = "ruta incompleta"
        elif not os.path.isdir(os.path.join(DROPBOX, carp)):
            fila["aviso"] = "la carpeta no existe en Dropbox"
        else:
            fila["carpeta"] = carp
            if carp not in cache:
                cache[carp] = fichas_en(carp)
            fs = cache[carp]
            arriba = [os.path.join(carp, f) for f in sueltas(carp)]
            fila["fichas_en_la_carpeta"] = " | ".join(fs)
            if len(arriba) == 1:
                fila["ficha"] = arriba[0]
            elif not arriba and len(fs) == 1:
                fila["ficha"] = fs[0]
            elif not fs:
                fila["aviso"] = "sin ficha"
            else:
                fila["aviso"] = "varias fichas: elegir"
        filas.append(fila)

    with io.open(SALIDA, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(filas[0].keys()), delimiter=";")
        w.writeheader()
        w.writerows(sorted(filas, key=lambda f: (f["aviso"], f["nombre"])))

    print("opps con ruta:", len(filas))
    print("con carpeta:", sum(1 for f in filas if f["carpeta"]))
    print("con ficha:", sum(1 for f in filas if f["ficha"]))
    print(collections.Counter(f["aviso"] or "ok" for f in filas))
    print("->", SALIDA)

    if escribir:
        hechas = 0
        for f in filas:
            if not f["carpeta"]:
                continue
            base.actualizar("oportunidades?id=eq." + f["id"], {
                "dropbox_carpeta": f["carpeta"].replace("\\", "/"),
                "dropbox_ficha": f["ficha"].replace("\\", "/") or None,
            })
            hechas += 1
        print("escritas:", hechas)


if __name__ == "__main__":
    main()
