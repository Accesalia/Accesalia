# -*- coding: utf-8 -*-
"""
LAS FECHAS DE APERTURA, Y EL CIERRE DE LO VIEJO     (Monica, 4-oct-2026)

Su plan, y los numeros que salieron al medirlo:

  - 410 carpetas de los tres municipios barridos (Alcorcon, Alcobendas,
    Fuenlabrada) tienen fecha: 339 de la ficha (FECHA ENCARGO / LLEGADA /
    INICIO), 70 del fichero mas antiguo de la carpeta, 1 sin nada.
  - 247 de esas carpetas estan en la tabla CLON (las que no estaban en Monday y
    todavia no tienen oportunidad). 163 son oportunidades que ya existen.
  - Corte del 31-dic-2022: 168 de las 247 de la clon, y solo 46 de las 163 de
    julio. Lo obsoleto esta casi todo en lo que NO estaba en Monday, que es
    exactamente lo que ella suponia.

QUE HACE, y nada mas:

  1. Pone 'fecha_apertura' en las oportunidades que ya existen y que se pueden
     cotejar con su carpeta. El cotejo no se inventa: sale de
     'documentos.origen_ruta_dropbox', que quedo guardado al subir las tarjetas
     del CIF. Las que no se pueden cotejar SE QUEDAN SIN TOCAR y se listan.
  2. Rellena la tabla clon con lo mismo que iria a produccion: fecha_apertura,
     estado y cierre_notas. "Es una tabla-clon" (ella): asi crear las opps
     despues es copiar y pegar.
  3. Cierra las oportunidades existentes con fecha <= 31-dic-2022.
  4. Marca las cuatro carpetas que no son comunidades para que no lleguen a
     crearse nunca.

LA FECHA DE CIERRE SE QUEDA VACIA, y es a proposito. Si se pusiera hoy quedaria
"abierta en 2016, cerrada el 4-oct-2026", como si la hubieramos tenido abierta
diez anos. Lo vio ella sola: "eso no dara conflicto de fechas? misma fecha
cerrada y abierta?".

Pero vacia NO quiere decir perdida, y esto es suyo: "muchas veces lo vamos a
saber, pero es un paso posterior: hay CFO, o hay fecha de hoja de encargo, o
fecha de visado. Hay muchos hilos del que tirar, pero no me preocupa ahora".
Es decir: queda un hueco con nombre, para rellenarlo en otra pasada tirando de
esos documentos. Igual con 'resultado_final': hoy no consta si se gano o se
perdio, y ponerlo a dedo seria inventarlo.

Uso:
    python scripts/migrar_fechas_y_cierres.py            <- marcha en seco
    python scripts/migrar_fechas_y_cierres.py --escribir <- de verdad
"""
import csv
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402

CSV = "fechas_carpetas.csv"
CORTE = "2022-12-31"
BARRA = chr(92)
NOTA_CIERRE = "migrada de Dropbox"
NOTA_NO_OPP = ("NO ES UNA COMUNIDAD: no crear oportunidad. "
               "Confirmado por Monica el 4-oct-2026.")

# Las cuatro que no son direcciones: son carpetas de trabajo de Daniel.
NO_SON_COMUNIDAD = {
    ("FUENLABRADA", "0-FAIN"),
    ("FUENLABRADA", "0-MODELOS"),
    ("FUENLABRADA", "0-plano urbano fuenlabrada dwg"),
    ("FUENLABRADA", "planos chalet codi"),
}

norm = lambda s: "".join(ch for ch in (s or "").lower() if ch.isalnum())


def main():
    escribir = "--escribir" in sys.argv
    b = arrancar()
    print("\n*** %s ***\n" % ("ESCRIBIENDO EN PRODUCCION" if escribir else "MARCHA EN SECO: no se escribe nada"))

    fech = list(csv.DictReader(io.open(CSV, encoding="utf-8"), delimiter="|"))

    # ---------------------------------------------------- lo que hay ahora
    clon = b.leer("comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una"
                  "?select=id,municipio,carpeta,notas")
    por_clon = {(c["municipio"], norm(c["carpeta"])): c for c in clon}

    docs = b.leer("documentos?select=comunidad_id,origen_ruta_dropbox&origen_ruta_dropbox=not.is.null")
    carpeta_a_comunidad = {}
    for d in docs:
        p = (d["origen_ruta_dropbox"] or "").replace("/", BARRA).split(BARRA)
        if len(p) >= 4 and p[1].upper() == "1APROVINCIA":
            carpeta_a_comunidad[(p[2].upper(), norm(p[3]))] = d["comunidad_id"]

    opps = b.leer("oportunidades?select=id,comunidad_id,estado,fecha_apertura"
                  "&comunidad_id=not.is.null", por_tramos=True)
    opps_de = {}
    for o in opps:
        opps_de.setdefault(o["comunidad_id"], []).append(o)

    # ------------------------------------------------------- el reparto
    a_opp, a_clon, sin_cotejo, no_opp = [], [], [], []
    for f in fech:
        k = (f["municipio"], norm(f["carpeta"]))
        if (f["municipio"], f["carpeta"]) in NO_SON_COMUNIDAD:
            no_opp.append((f, por_clon.get(k)))
            continue
        if k in por_clon:
            a_clon.append((f, por_clon[k]))
            continue
        cid = carpeta_a_comunidad.get(k)
        if cid and cid in opps_de:
            a_opp.append((f, opps_de[cid]))
        else:
            sin_cotejo.append(f)

    # UNA COMUNIDAD CON DOS CARPETAS: el agujero que nos mordio en Alcorcon.
    # "CDAD PROP CL SANTAMARIA LA BLANCA 3 Y 5 IGLESIA 22" es un edificio en
    # esquina con dos nombres de calle, y tiene DOS carpetas en Dropbox:
    # santamarialablanca3 (2021) e iglesia22 (2023). Las dos apuntan a la misma
    # comunidad, asi que la segunda escritura pisaba a la primera y las tres opps
    # quedaron cerradas por el corte de 2022, teniendo trabajo de 2023.
    #
    # Cuando dos carpetas traen fechas DISTINTAS para la misma comunidad, no hay
    # forma de saber cual manda sin mirarlo. Asi que no se toca y se lista.
    por_comunidad = {}
    for f, lista in a_opp:
        if lista:
            por_comunidad.setdefault(lista[0]["comunidad_id"], []).append(f)
    en_disputa = {cid for cid, fs in por_comunidad.items()
                  if len({x["fecha"] for x in fs}) > 1}
    disputadas = [(f, l) for f, l in a_opp if l and l[0]["comunidad_id"] in en_disputa]
    a_opp = [(f, l) for f, l in a_opp if not (l and l[0]["comunidad_id"] in en_disputa)]

    varias = [(f, l) for f, l in a_opp if len(l) > 1]
    print("1) OPORTUNIDADES QUE YA EXISTEN")
    print("   carpetas cotejadas        : %d" % len(a_opp))
    print("   oportunidades afectadas   : %d" % sum(len(l) for _, l in a_opp))
    print("   carpetas con VARIAS opps  : %d (la misma fecha para todas: salen de la misma carpeta)" % len(varias))
    print("   sin cotejo, NO SE TOCAN   : %d" % len(sin_cotejo))
    print("   EN DISPUTA, NO SE TOCAN   : %d carpetas (misma comunidad, fechas distintas)" % len(disputadas))
    for f, l in disputadas:
        print("      %-12s %-28s %s" % (f["municipio"][:12], f["carpeta"][:28], f["fecha"]))

    print("\n2) TABLA CLON")
    print("   filas a rellenar          : %d de %d" % (len(a_clon), len(clon)))
    cerradas_clon = [x for x in a_clon if x[0]["fecha"] and x[0]["fecha"] <= CORTE]
    print("   nacen CERRADAS (<=%s): %d" % (CORTE, len(cerradas_clon)))
    print("   nacen abiertas            : %d" % (len(a_clon) - len(cerradas_clon)))

    cerrar = [(f, l) for f, l in a_opp if f["fecha"] and f["fecha"] <= CORTE]
    print("\n3) CIERRES DE OPORTUNIDADES EXISTENTES")
    print("   carpetas <=%s      : %d" % (CORTE, len(cerrar)))
    print("   oportunidades a cerrar    : %d" % sum(len(l) for _, l in cerrar))

    print("\n4) CARPETAS QUE NO SON COMUNIDADES: %d" % len(no_opp))
    for f, c in no_opp:
        print("   %-34s %s" % (f["carpeta"][:34], "esta en la clon" if c else "NO esta en la clon"))

    if not escribir:
        print("\n   (marcha en seco. Para hacerlo: --escribir)\n")
        return

    # =================================================== ESCRITURA
    print("\n--- escribiendo ---")

    # 1. fecha_apertura en las opps cotejadas
    n = 0
    for f, lista in a_opp:
        if not f["fecha"]:
            continue
        for o in lista:
            b.actualizar("oportunidades?id=eq." + o["id"], {"fecha_apertura": f["fecha"]})
            n += 1
    print("   fecha_apertura puesta en %d oportunidades" % n)

    # 2. la tabla clon
    n = 0
    for f, c in a_clon:
        cerrada = bool(f["fecha"]) and f["fecha"] <= CORTE
        fila = {
            "fecha_apertura": f["fecha"] or None,
            "estado": "cerrada" if cerrada else "abierta",
            "cierre_notas": NOTA_CIERRE if cerrada else None,
        }
        b.actualizar("comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una?id=eq." + c["id"], fila)
        n += 1
    print("   %d filas de la tabla clon rellenadas" % n)

    # 3. cerrar las existentes
    n = 0
    for f, lista in cerrar:
        for o in lista:
            b.actualizar("oportunidades?id=eq." + o["id"], {"estado": "cerrada"})
            b.insertar("motivo_cierre_oportunidad", [{
                "oportunidad_id": o["id"],
                "notas": NOTA_CIERRE,
                # fecha_cierre y resultado_final VACIOS: no se sabe, y se dice.
            }])
            n += 1
    print("   %d oportunidades cerradas, con su motivo" % n)

    # 4. marcar las que no son comunidades
    n = 0
    for f, c in no_opp:
        if not c:
            continue
        nota = ((c.get("notas") or "").strip() + "\n" + NOTA_NO_OPP).strip()
        b.actualizar("comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una?id=eq." + c["id"],
                         {"notas": nota, "estado": None, "fecha_apertura": None, "cierre_notas": None})
        n += 1
    print("   %d carpetas marcadas como 'no es una comunidad'" % n)

    # ------------------------------------------------------ comprobacion
    print("\n--- comprobando contra produccion ---")
    e = b.leer("oportunidades?select=estado", por_tramos=True)
    from collections import Counter
    print("   estados:", dict(Counter(x["estado"] for x in e)))
    cf = b.leer("oportunidades?select=id&fecha_apertura=not.is.null", por_tramos=True)
    print("   oportunidades con fecha_apertura:", len(cf))
    mc = b.leer("motivo_cierre_oportunidad?select=id", por_tramos=True)
    print("   filas de motivo de cierre:", len(mc))
    cl = b.leer("comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una?select=estado,fecha_apertura")
    print("   clon:", dict(Counter(x["estado"] for x in cl)),
          "con fecha:", len([x for x in cl if x["fecha_apertura"]]))


if __name__ == "__main__":
    main()
