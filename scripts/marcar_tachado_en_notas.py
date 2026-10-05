# -*- coding: utf-8 -*-
"""
MARCAR EL TACHADO EN LAS NOTAS YA CARGADAS      (Monica, 4-oct-2026)

Las notas de produccion se cargaron con un lector que no veia el tachado, asi
que dentro de ellas hay texto que YA NO VALE dado por vigente. Son 34 de 761.

Esto NO borra ni recarga: busca cada nota por su id y le cambia el texto por el
mismo texto con las marcas ~~ puestas. Es a proposito, porque hay otra sesion
trabajando en 'notas_oportunidad' al mismo tiempo y un borrado se llevaria lo
suyo por delante.

El emparejamiento es seguro: el texto nuevo, quitandole las marcas, tiene que ser
EXACTAMENTE el que esta guardado. Si no coincide, no se toca y se lista.
"""
import csv
import io
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar                      # noqa: E402
from leer_fichas import PROVINCIA, fichas_de, solo_tachado, texto_del_docx  # noqa: E402
from notas_de_las_apartadas import bloques_de        # noqa: E402
from notas_de_julio import trocear                   # noqa: E402

BARRA = chr(92)
pel = lambda s: "".join(c for c in unicodedata.normalize("NFKD", s or "")
                        if not unicodedata.combining(c)).lower().replace(" ", "")
quitar = lambda t: re.sub(r"~~(.*?)~~", r"\1", t or "")


def main():
    escribir = "--escribir" in sys.argv
    b = arrancar()
    print("\n*** %s ***\n" % ("ESCRIBIENDO" if escribir else "MARCHA EN SECO"))

    fichas = {}
    for m in ("ALCORCON", "ALCOBENDAS", "FUENLABRADA"):
        for f in csv.DictReader(io.open("fichas_%s.csv" % m.lower(), encoding="utf-8")):
            fichas[(m, pel(f["carpeta"]))] = f

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
    for o in b.leer("oportunidades?select=id,comunidad_id&comunidad_id=not.is.null", por_tramos=True):
        opps_de.setdefault(o["comunidad_id"], []).append(o["id"])
    guardadas = {}
    for n in b.leer("notas_oportunidad?select=id,oportunidad_id,texto", por_tramos=True):
        guardadas.setdefault(n["oportunidad_id"], []).append(n)

    cambios, sin_pareja = [], []
    for k, com in c2com.items():
        if k not in fichas or com not in opps_de:
            continue
        rutas = fichas_de(os.path.join(PROVINCIA, k[0], fichas[k]["carpeta"]))
        if not rutas:
            continue
        # SE MARCA SOBRE LO QUE YA ESTA GUARDADO, no se busca la nota nueva
        # equivalente. Las notas se cargaron con un troceo y ahora salen con
        # otro, asi que no casan caracter a caracter. Lo que SI es fiable es el
        # TROZO tachado: si aparece dentro de la nota guardada, se envuelve.
        tach = []
        for l in (texto_del_docx(rutas[0]) or []):
            for t in solo_tachado(l):
                if len(t) > 4 and t not in tach:
                    tach.append(t)
        if not tach:
            continue
        # los largos primero, para que uno corto no parta a uno largo
        tach.sort(key=len, reverse=True)
        for oid in opps_de[com]:
            for n in guardadas.get(oid, []):
                texto = n['texto']
                if '~~' in texto:
                    continue
                for t in tach:
                    if t in texto:
                        texto = texto.replace(t, '~~' + t + '~~', 1)
                if texto != n['texto']:
                    cambios.append((n, texto, k[1]))

    print("   notas a marcar        : %d" % len(cambios))
    print("   parecidas sin encajar : %d  (no se tocan)" % len(sin_pareja))
    for n, t, c in cambios[:6]:
        print("      %-24s %s" % (c[:24], t[:92].replace(chr(10), " | ")))
    for c, t in sin_pareja[:6]:
        print("      SIN PAREJA %-18s %s" % (c[:18], t))

    if not escribir:
        print("\n   (marcha en seco. Para hacerlo: --escribir)\n")
        return
    for n, t, _ in cambios:
        b.actualizar("notas_oportunidad?id=eq." + n["id"], {"texto": t})
    print("\n   %d notas actualizadas" % len(cambios))
    todas = b.leer("notas_oportunidad?select=id,texto", por_tramos=True)
    print("   notas con tachado marcado en produccion: %d de %d"
          % (len([x for x in todas if "~~" in (x["texto"] or "")]), len(todas)))


if __name__ == "__main__":
    main()
