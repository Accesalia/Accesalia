# -*- coding: utf-8 -*-
"""
EL COMERCIAL DE CADA OPORTUNIDAD, DESDE LAS FICHAS   (Monica, 4-oct-2026)

POR QUE CORRE PRISA: ninguna de las 1.228 oportunidades tiene comercial, y los
listados del area comercial filtran por cartera. Resultado: un comercial entra y
ve CERO oportunidades. Ella lo vio en su pantalla: "0 opps, 5 admins. Es
imposible que eso sea correcto". No era un fallo del filtro: era que el dato no
estaba.

Se aparco pensando que hacia falta una fecha fiable, pero eso era para el CODIGO
(SIGLAS-ANO-NNN). Para la cartera no hace falta ninguna fecha.

DE DONDE SALE: del campo 'comercial_interno' de la ficha, con sus tres reglas:
  - Sin etiqueta en la ficha = DANIEL, siempre ("es de la epoca de cuando no
    habia mas comercial que el").
  - Carlos Garcia entro en ABRIL DE 2025.
  - Alvaro entro el 1 DE ENERO DE 2026.

Las dos fechas no son relleno: son una RED. Una ficha que nombre a Alvaro es de
2026 en adelante y una que nombre a Carlos es de abril-2025 en adelante. Si algo
las incumple, no se asigna: se lista para que lo mire ella.

NO SE ASIGNA NADA CUANDO:
  - la ficha no existe o no se pudo leer (no se sabe, y Daniel por defecto solo
    vale cuando la ficha SI existe y no lleva etiqueta),
  - la etiqueta nombra a varios ("VARIOS: CARLOS, ALVARO, DANIEL"),
  - el comercial no cuadra con la fecha.

Uso:
    python scripts/comercial_a_las_opps.py             <- marcha en seco
    python scripts/comercial_a_las_opps.py --escribir
"""
import csv
import io
import os
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402

BARRA = chr(92)
# La ventana de cada uno sale de la base: fecha_alta y fecha_baja. No se escribe
# aqui a mano, porque entonces vive en dos sitios y uno de los dos se queda viejo.
VENTANA = {}   # se rellena en main() desde la tabla comerciales

pel = lambda s: "".join(c for c in unicodedata.normalize("NFKD", s or "")
                        if not unicodedata.combining(c)).lower().replace(" ", "")


def main():
    escribir = "--escribir" in sys.argv
    b = arrancar()
    print("\n*** %s ***\n" % ("ESCRIBIENDO" if escribir else "MARCHA EN SECO"))

    comerciales = b.leer("comerciales?select=id,nombre,iniciales,activo,fecha_alta,fecha_baja")
    for c in comerciales:
        VENTANA[pel(c["nombre"])[:6]] = (c.get("fecha_alta"), c.get("fecha_baja"))
    por_nombre = {pel(c["nombre"])[:6]: c for c in comerciales}

    fichas, fechas = {}, {}
    for m in ("ALCORCON", "ALCOBENDAS", "FUENLABRADA"):
        for f in csv.DictReader(io.open("fichas_%s.csv" % m.lower(), encoding="utf-8")):
            fichas[(m, pel(f["carpeta"]))] = f
    for f in csv.DictReader(io.open("fechas_carpetas.csv", encoding="utf-8"), delimiter="|"):
        fechas[(f["municipio"], pel(f["carpeta"]))] = f["fecha"]

    # carpeta -> comunidad: tarjetas del CIF + el cotejo por direccion
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
    for o in b.leer("oportunidades?select=id,comunidad_id,comercial_id&comunidad_id=not.is.null",
                    por_tramos=True):
        opps_de.setdefault(o["comunidad_id"], []).append(o)

    asignar, pendientes = [], []
    from collections import Counter
    cuenta = Counter()
    for k, com in sorted(c2com.items()):
        f = fichas.get(k)
        if not f or com not in opps_de:
            continue
        nom = (f.get("comercial_interno") or "").strip()
        de_donde = f.get("comercial_de_donde") or ""
        if not nom or nom.upper().startswith("VARIOS"):
            pendientes.append((k, nom or "(la ficha no dice)", de_donde)); continue
        clave = pel(nom)[:6]
        c = por_nombre.get(clave)
        if not c:
            pendientes.append((k, nom, "no esta en la tabla de comerciales")); continue
        # LA RED: la ficha tiene que caer dentro de la ventana del comercial.
        # No es relleno: "Carlos trabajo de abril 2025 a enero 2026", y con eso
        # seis fichas se validan solas y una se resuelve (zamora6, de junio-2026,
        # dice VARIOS CARLOS/DANIEL y Carlos ya no estaba: es de Daniel).
        alta, baja = VENTANA.get(pel(nom)[:6], (None, None))
        fe = fechas.get(k) or ""
        if fe and alta and fe < alta:
            pendientes.append((k, nom, "fecha %s anterior a su alta (%s)" % (fe, alta))); continue
        if fe and baja and fe > baja:
            pendientes.append((k, nom, "fecha %s posterior a su baja (%s)" % (fe, baja))); continue
        for o in opps_de[com]:
            if o["comercial_id"] != c["id"]:
                asignar.append((o["id"], c))
        cuenta[c["nombre"]] += 1

    print("REPARTO (carpetas cotejadas):")
    for n, q in cuenta.most_common():
        c = por_nombre[pel(n)[:6]]
        aviso = "" if (c["activo"] and c["iniciales"]) else "   <- SIN INICIALES o INACTIVO"
        print("   %-10s %3d%s" % (n, q, aviso))
    print("\n   oportunidades a tocar : %d" % len(asignar))
    print("   carpetas sin asignar  : %d" % len(pendientes))
    for (mu, ca), nom, por in pendientes[:14]:
        print("      %-11s %-26s %-22s %s" % (mu[:11], ca[:26], nom[:22], por[:34]))

    if not escribir:
        print("\n   (marcha en seco. Para hacerlo: --escribir)\n")
        return
    print("\n--- escribiendo ---")
    for oid, c in asignar:
        b.actualizar("oportunidades?id=eq." + oid, {"comercial_id": c["id"]})
    print("   %d oportunidades con comercial" % len(asignar))
    for c in b.leer("comerciales?select=id,nombre"):
        n = len(b.leer("oportunidades?select=id&comercial_id=eq." + c["id"], por_tramos=True))
        if n:
            print("      %-10s %d" % (c["nombre"], n))


if __name__ == "__main__":
    main()
