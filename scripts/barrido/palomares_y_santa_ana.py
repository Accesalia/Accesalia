# -*- coding: utf-8 -*-
"""
PALOMARES 75-77-79 EN TRES OPORTUNIDADES, Y SANTA ANA 2 (Monica, 11-oct-2026)

Salio del volcado de las hojas DATOS del Proyecto: un Excel = un proyecto = al
menos una oportunidad.

PALOMARES. DAN-2022-240 guardaba tres historias seguidas. Como debe estar:
  · DAN-2022-240  2022, ascensores + SATE + FV: cerrada PERDIDA. Notas de 2022.
  · DAN-2023-315  2023, SATE + FV con Next Generation: cerrada PERDIDA. Notas de
                  2023. (Sus hojas -una de los 3 portales y la v2 por portal- no
                  estan en la base.)
  · DAN-2024-313  2024, impermeabilizacion de la cubierta del garaje que cubre
                  toda la manzana: cerrada GANADA (= hoja firmada). HE-2024-0037,
                  su revision, el presupuesto y la factura 1-10, y las notas de
                  2024 en adelante. Paga la mancomunidad del garaje:
                  COM. PROP. PALOMARES 75 (GARAJE), CIF H88443007.
  Las tres: Daniel capta y Daniel la lleva. DAN-2026-060 (Alvaro, 2026) es otra
  y no se toca.

SANTA ANA 2 (Marchamalo, Guadalajara): proyecto de ascensor de junio de 2022 sin
oportunidad. Se crea, cerrada como las migradas (sin resultado).

  python scripts/barrido/palomares_y_santa_ana.py [--escribir]
"""
import os
import sys
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from produccion import arrancar  # noqa: E402

ESCRIBIR = "--escribir" in sys.argv
HOY = "11-oct-2026"


def main():
    b = arrancar()
    uno = lambda q: b.leer(q)[0]  # noqa: E731
    daniel = uno("comerciales?select=id&nombre=eq.Daniel")["id"]
    tipo = {t["clave"]: t["id"] for t in b.leer("tipos_proyecto?select=id,clave")}
    o22 = uno("oportunidades?select=*&codigo=eq.DAN-2022-240")
    for cod in ("DAN-2023-315", "DAN-2024-313", "DAN-2022-301"):
        assert not b.leer("oportunidades?select=id&codigo=eq." + cod), "ya existe " + cod
    notas = b.leer("notas_oportunidad?select=id,fecha&oportunidad_id=eq." + o22["id"])
    n23 = [n["id"] for n in notas if n["fecha"].startswith("2023")]
    n24 = [n["id"] for n in notas if n["fecha"] >= "2024"]
    portales = b.leer("relacion_oportunidad_accesos?select=acceso_id&hasta=is.null&opp_id=eq." + o22["id"])
    hoja = uno("hojas_encargo?select=id,numero_hoja&numero_hoja=eq.HE-2024-0037")
    rev = b.leer("revision_firmadas?select=id&hoja_encargo_id=eq." + hoja["id"])
    factura = [f for f in b.leer("facturas?select=id,serie,numero,total,pagador_nombre&pagador_nombre=ilike.*PALOMARES*") if str(f["serie"]) + "-" + str(f["numero"]) == "1-10"]
    ppto = b.leer("presupuestos?select=id,total,fecha&pagador_nombre=ilike.*PALOMARES%2075%20GARAJE*")
    datos_sa = b.leer("datos_proyecto?select=id,ruta,hoja&oportunidad_id=is.null&ruta=ilike.*santaana2*")
    print("2022: notas que se quedan %d · a 2023: %d · a 2024: %d · portales %d" % (len(notas) - len(n23) - len(n24), len(n23), len(n24), len(portales)))
    print("a 2024: %s, %d revisión, factura %s, presupuesto %s" % (hoja["numero_hoja"], len(rev), [f["total"] for f in factura], [p["total"] for p in ppto]))
    print("Santa Ana 2: %d hoja(s) de datos" % len(datos_sa))
    if not ESCRIBIR:
        print("*** EN SECO ***")
        return

    comun = {"comercial_id": daniel, "comercial_captador_id": daniel, "estado": "cerrada",
             "comunidad_id": o22["comunidad_id"], "referencia_catastral": o22["referencia_catastral"]}
    # 2022: perdida, y la lleva Daniel.
    b.actualizar("oportunidades?id=eq." + o22["id"], {"comercial_id": daniel, "estado": "cerrada"})
    if not b.leer("motivo_cierre_oportunidad?select=id&oportunidad_id=eq." + o22["id"]):
        b.insertar("motivo_cierre_oportunidad", [{"oportunidad_id": o22["id"], "comercial_id": daniel, "resultado_final": "perdido",
                                                  "notas": "Ascensores, SATE y FV de 2022: no salió (Mónica, %s)." % HOY}])
    # 2023 y 2024: nuevas.
    i23, i24 = str(uuid.uuid4()), str(uuid.uuid4())
    b.insertar("oportunidades", [
        dict(comun, id=i23, codigo="DAN-2023-315", nombre="PALOMARES 75-77-79 MADRID", fecha_apertura="2023-03-07",
             origen_notas="Separada de DAN-2022-240 (Mónica, %s): la propuesta de 2023, SATE y fotovoltaica con Next Generation. "
                          "Sus hojas (una de los tres portales y la v2 por portal) no están en la base." % HOY),
        dict(comun, id=i24, codigo="DAN-2024-313", nombre="PALOMARES 75 GARAJE MADRID", fecha_apertura="2024-02-27",
             origen_notas="Separada de DAN-2022-240 (Mónica, %s): la impermeabilización de la cubierta del garaje que cubre toda la "
                          "manzana (Talco, Palomares, Puerto Lápice y Paseo de los Ferroviarios). Ganada: HE-2024-0037 firmada el "
                          "6-may-2024. Paga la mancomunidad del garaje, COM. PROP. PALOMARES 75 (GARAJE), CIF H88443007." % HOY),
    ])
    b.insertar("motivo_cierre_oportunidad", [{"oportunidad_id": i23, "comercial_id": daniel, "resultado_final": "perdido",
                                              "notas": "SATE y FV con Next Generation, 2023: no salió (Mónica, %s)." % HOY}])
    b.insertar("oportunidad_tipos", [{"oportunidad_id": i23, "tipo_id": tipo["sate_fachada"]},
                                     {"oportunidad_id": i23, "tipo_id": tipo["fotovoltaica"]},
                                     {"oportunidad_id": i24, "tipo_id": tipo["arreglo_cubierta"]}])
    for nueva in (i23, i24):
        if portales:
            b.insertar("relacion_oportunidad_accesos", [{"opp_id": nueva, "acceso_id": p["acceso_id"],
                                                         "de_donde": "copiado de DAN-2022-240 (Mónica, %s)" % HOY} for p in portales])
    for nid in n23:
        b.actualizar("notas_oportunidad?id=eq." + nid, {"oportunidad_id": i23})
    for nid in n24:
        b.actualizar("notas_oportunidad?id=eq." + nid, {"oportunidad_id": i24})
    b.actualizar("hojas_encargo?id=eq." + hoja["id"], {"oportunidad_id": i24})
    for r in rev:
        b.actualizar("revision_firmadas?id=eq." + r["id"], {"oportunidad_id": i24})
    for f in factura:
        b.actualizar("facturas?id=eq." + f["id"], {"oportunidad_id": i24})
    for p in ppto:
        b.actualizar("presupuestos?id=eq." + p["id"], {"oportunidad_id": i24})

    # Santa Ana 2, Marchamalo.
    if datos_sa:
        isa = str(uuid.uuid4())
        ref = (datos_sa[0]["hoja"].get("PROY_Referencia_Catastral") or "").replace(" ", "")[:20] or None
        b.insertar("oportunidades", [{"id": isa, "codigo": "DAN-2022-301", "nombre": "SANTA ANA 2 MARCHAMALO",
                                      "comunidad_provisional": "santaana2 (MARCHAMALO)", "fecha_apertura": "2022-06-01",
                                      "estado": "cerrada", "comercial_id": daniel, "comercial_captador_id": daniel,
                                      "referencia_catastral": ref,
                                      "origen_notas": "Creada desde su hoja DATOS del Proyecto (ascensor, junio de 2022), que no tenía "
                                                      "oportunidad (Mónica, %s). Cerrada como las migradas, sin resultado." % HOY}])
        b.insertar("oportunidad_tipos", [{"oportunidad_id": isa, "tipo_id": tipo["ascensor"]}])
        b.actualizar("datos_proyecto?id=eq." + datos_sa[0]["id"], {"oportunidad_id": isa, "enlace": "creada a mano: DAN-2022-301 (Mónica, %s)" % HOY})
        b.actualizar("presupuestos_proyecto?datos_proyecto_id=eq." + datos_sa[0]["id"], {"oportunidad_id": isa})
    print("hecho")


if __name__ == "__main__":
    main()
