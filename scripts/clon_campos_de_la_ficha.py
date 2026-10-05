# -*- coding: utf-8 -*-
"""
LOS CAMPOS DE LA FICHA, A LA CLON              (Monica, 4-oct-2026)

Refresca en la tabla-clon lo que sale directo de la ficha: presidente, contacto
del administrador, telefono, correo, referencia catastral (de bibliografia),
comercial interno y quien nos lo trajo.

NO TOCA 'empresa_id'. Ese esta curado a mano -con las resoluciones de Monica, el
cotejo por dominio de correo y las cuatro correcciones del tachado- y volver a
calcularlo lo estropearia.

Se vuelve a correr cada vez que cambia el lector. La ultima vez hizo falta porque
el lector no veia el TACHADO: 114 campos llevaban dentro el valor viejo.
"""
import csv
import io
import os
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402

TABLA = "comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una"
COLUMNAS = {
    "presidente": "presidente",
    "ref_catastral_de_la_ficha": "ref_catastral",
    "admin_contacto": "admin_contacto",
    "admin_telefono": "admin_telefono",
    "admin_correo": "admin_correo",
    "comercial_interno": "comercial_interno",
    "trajo_empresa": "trajo_empresa",
    "trajo_persona": "trajo_persona",
}
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

    clon = b.leer(TABLA + "?select=id,municipio,carpeta,notas," + ",".join(COLUMNAS))
    cambios = []
    from collections import Counter
    cuenta, vaciados = Counter(), Counter()
    for c in clon:
        if "NO ES UNA COMUNIDAD" in (c.get("notas") or ""):
            continue
        f = fichas.get((c["municipio"], pel(c["carpeta"])))
        if not f:
            continue
        fila = {}
        for col, origen in COLUMNAS.items():
            nuevo = (f.get(origen) or "").strip() or None
            if nuevo != (c.get(col) or None):
                fila[col] = nuevo
                cuenta[col] += 1
                if c.get(col) and not nuevo:
                    vaciados[col] += 1
        if fila:
            cambios.append((c, fila))

    print("   filas a tocar: %d\n" % len(cambios))
    print("   %-28s %8s %8s" % ("campo", "cambia", "se vacia"))
    for col, q in cuenta.most_common():
        print("   %-28s %8d %8d" % (col, q, vaciados[col]))

    if not escribir:
        print("\n   (marcha en seco. Para hacerlo: --escribir)\n")
        return
    for c, fila in cambios:
        b.actualizar(TABLA + "?id=eq." + c["id"], fila)
    print("\n   %d filas actualizadas" % len(cambios))
    cl = b.leer(TABLA + "?select=" + ",".join(list(COLUMNAS) + ["empresa_id"]))
    print("\n   LA CLON, %d filas:" % len(cl))
    for k in list(COLUMNAS) + ["empresa_id"]:
        print("      %-28s %3d" % (k, len([x for x in cl if x.get(k)])))


if __name__ == "__main__":
    main()
