# -*- coding: utf-8 -*-
"""
LAS NOTAS DE LA FICHA, A LA TABLA-CLON        (Monica, 4-oct-2026)

La clon guarda las 247 carpetas que no estaban en Monday y que aun no tienen
oportunidad. A diferencia de las de julio -que reparten sus notas en
notas_oportunidad y notas_subvencion-, aqui van todas a UN campo,
'notas_de_la_ficha', con cada bloque rotulado. Son opps cerradas: no merecen una
tabla por bloque. "Las notas de las que estan cerradas son poco relevantes, pero
las de mi listado de julio si" (ella).

SE VUELVE A CARGAR CADA VEZ QUE CAMBIA EL LECTOR, y por eso esto es un script y
no un apaño de una vez: la primera carga se hizo con una version de
leer_fichas.py que filtraba lineas dentro de las notas, y al revertir aquello
-ella me paro: "me estas diciendo que estas capando parte de las notas?"- la
clon se quedo con el texto corto. 127 de 247 filas tenian MENOS texto del que
les tocaba. Si se vuelve a tocar el lector, se vuelve a correr esto.

No pisa lo que no viene de la ficha: la frase que se rescato del campo
"administrador" cuando ahi habia una nota en vez de un nombre se conserva.
"""
import csv
import io
import os
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402

TABLA = "comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una"
ROTULOS = [("notas", ""),
           ("notas_admin", "NOTAS DEL ADMINISTRADOR"),
           ("notas_encargo", "NOTAS DEL ENCARGO Y EL PROYECTO"),
           ("notas_subvenciones", "NOTAS DE SUBVENCIONES"),
           # Lo que estaba TACHADO en la ficha. No se tira: es historia de esa
           # comunidad -el administrador que tuvo, el presidente anterior, la
           # contrata que se cayo-. No se intenta fechar: "es IMPOSIBLE saber las
           # fechas, lo guardamos como notas y solo nos preocupamos de que quede
           # el vigente en el campo de verdad" (Monica, 4-oct-2026).
           ("tachado", "TACHADO EN LA FICHA (ya no vigente, sin fecha conocida)")]
RESCATE = "Donde iba el administrador"

pel = lambda s: "".join(c for c in unicodedata.normalize("NFKD", s or "")
                        if not unicodedata.combining(c)).lower().replace(" ", "")


def main():
    escribir = "--escribir" in sys.argv
    b = arrancar()
    print("\n*** %s ***\n" % ("ESCRIBIENDO" if escribir else "MARCHA EN SECO"))

    fichas = {}
    for m in ("ALCORCON", "ALCOBENDAS", "FUENLABRADA"):
        p = "fichas_%s.csv" % m.lower()
        if os.path.exists(p):
            for f in csv.DictReader(io.open(p, encoding="utf-8")):
                fichas[(m, pel(f["carpeta"]))] = f

    clon = b.leer(TABLA + "?select=id,municipio,carpeta,notas,notas_de_la_ficha")
    cambian, igual, salta = [], 0, 0
    for c in clon:
        if "NO ES UNA COMUNIDAD" in (c.get("notas") or ""):
            salta += 1
            continue
        f = fichas.get((c["municipio"], pel(c["carpeta"])))
        if not f:
            salta += 1
            continue
        trozos = []
        for col, rot in ROTULOS:
            v = (f.get(col) or "").strip()
            if v:
                trozos.append(("%s\n%s" % (rot, v)) if rot else v)
        texto = "\n\n".join(trozos).strip()
        # lo que se rescato del campo "administrador" no se pierde
        antes = (c.get("notas_de_la_ficha") or "").strip()
        for l in antes.split("\n"):
            if l.startswith(RESCATE) and l not in texto:
                texto = (texto + "\n\n" + l).strip()
        if texto and texto != antes:
            cambian.append((c, texto, len(texto) - len(antes)))
        else:
            igual += 1

    print("   filas a actualizar : %d" % len(cambian))
    print("   ya estaban al dia  : %d" % igual)
    print("   no aplican         : %d" % salta)
    if cambian:
        gana = sum(d for _, _, d in cambian if d > 0)
        print("   caracteres que se recuperan: %d" % gana)

    if not escribir:
        print("\n   (marcha en seco. Para hacerlo: --escribir)\n")
        return
    for c, texto, _ in cambian:
        b.actualizar(TABLA + "?id=eq." + c["id"], {"notas_de_la_ficha": texto})
    print("\n   %d filas actualizadas" % len(cambian))
    cl = b.leer(TABLA + "?select=notas_de_la_ficha")
    con = [x["notas_de_la_ficha"] for x in cl if (x["notas_de_la_ficha"] or "").strip()]
    import statistics
    print("   la clon: %d de %d con notas, mediana %d caracteres"
          % (len(con), len(cl), statistics.median([len(x) for x in con])))


if __name__ == "__main__":
    main()
