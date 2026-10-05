# -*- coding: utf-8 -*-
"""
LOS PRESIDENTES CON DOS PERSONAS EN UNA FILA     (Monica, 4-oct-2026)

'personas_comunidad' son 543 filas y TODAS son presidentes. 131 tienen el nombre
sucio, y son dos montones distintos:

  - la mayoria es UNA persona con ruido pegado: una nota ("ojo muy mayor, no se
    entera bien"), un piso ("4 B"), un telefono, un aviso ("cuidado es el
    vicepresidente"). Eso se separa.
  - unas 20 son DOS PERSONAS EN LA MISMA FILA, con sus dos DNI pegados
    ("David Gutierrez Escuderos 9 CLUCIO ALBERCA SANCHEZ - 1 D" con
    "48995011C 70322855X"). Son el presidente que habia y el que entro despues,
    o el presidente y el vicepresidente.

Las segundas NO se parten por programa: hay que decidir quien es el presidente
HOY y quien lo fue antes, y eso es historial de cargos, no limpieza. Ella:
"pasamelas y las desenredo, me pones el excel?".

Deja 'presidentes_a_desenredar.csv'.
"""
import csv
import io
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402

DNI = re.compile(r"[0-9XYZ]\d{7}[A-HJ-NP-TV-Z]", re.I)
# dos nombres propios seguidos: "... Sanchez ALMUDENA URIARTE ..." o pegados
DOS_NOMBRES = re.compile(r"[a-záéíóúñ]{3}[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ]{2}")


def main():
    b = arrancar()
    filas = b.leer("personas_comunidad?select=id,comunidad_id,nombre,rol,documento,"
                   "telefono,email,notas,es_contacto_principal", por_tramos=True)
    coms = {c["id"]: c["nombre"] for c in b.leer("comunidades?select=id,nombre", por_tramos=True)}

    enredadas = []
    for f in filas:
        nom = (f.get("nombre") or "").strip()
        doc = (f.get("documento") or "").strip()
        dnis = DNI.findall(doc)
        # dos personas si: hay DOS dni, o el nombre pega dos nombres propios
        if len(dnis) >= 2 or DOS_NOMBRES.search(nom):
            enredadas.append({
                "comunidad": coms.get(f["comunidad_id"], "?"),
                "nombre_tal_cual": nom,
                "dni_tal_cual": doc or "",
                "cuantos_dni": len(dnis),
                "telefono": f.get("telefono") or "",
                "email": f.get("email") or "",
                "notas": (f.get("notas") or "").replace("\n", " ")[:200],
                "PRESIDENTE_HOY": "",
                "DNI_HOY": "",
                "EL_ANTERIOR": "",
                "DNI_ANTERIOR": "",
                "que_pasa_aqui": "",
                "id": f["id"],
            })

    cols = ["comunidad", "nombre_tal_cual", "dni_tal_cual", "cuantos_dni",
            "telefono", "email", "notas",
            "PRESIDENTE_HOY", "DNI_HOY", "EL_ANTERIOR", "DNI_ANTERIOR",
            "que_pasa_aqui", "id"]
    enredadas.sort(key=lambda x: x["comunidad"])
    with io.open("presidentes_a_desenredar.csv", "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols, delimiter="|")
        w.writeheader()
        for e in enredadas:
            w.writerow(e)
    print("%d filas con dos personas -> presidentes_a_desenredar.csv" % len(enredadas))
    for e in enredadas[:8]:
        print("   %-34s %s" % (e["comunidad"][:34], e["nombre_tal_cual"][:62]))


if __name__ == "__main__":
    main()
