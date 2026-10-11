# -*- coding: utf-8 -*-
"""
TRES ARREGLOS QUE SALIERON DEL VOLCADO DE LAS HOJAS DE PROYECTO (Monica, 11-oct-2026)

1. PALOMARES: la comunidad del CIF H88443007 se llama como pone el CIF:
   CDAD PROP PALOMARES 75 (GARAJE) MADRID -> "CP PALOMARES 75 (GARAJE) MADRID"
   (convencion: "CP" delante). Las oportunidades no se tocan.

2. ESPARTA: dos comunidades y dos oportunidades, una por portal; las dos las
   trajo Luis Carlos Alvarez (Alvarez Asesores, el titular). La del portal 5 se
   llamaba "5-7" por error:
     DAN-2025-435  "ESPARTA 5-7 MOSTOLES" -> "ESPARTA 5 MOSTOLES"   (y su comunidad)
     DAN-2026-091  "ESPARTA 7  MOSTOLES"  -> "ESPARTA 7 MOSTOLES"   (doble espacio)
   El Excel de la carpeta esparta7 va a DAN-2026-091.

3. SANTA MARIA LA BLANCA 3 Y 5: no hubo oportunidad en 2026. Es la de 2021
   (hoja de datos del proyecto de diciembre de 2021; hojas de subvencion de
   diciembre de 2022), que se ejecuto mas tarde, cuando concedieron la
   subvencion: las hojas de 2026 son de la DF y la CSS de esa misma obra.
     DAN-2026-029 -> DAN-2021-137, apertura 1-dic-2021, "SANTA MARIA LA BLANCA 3 Y 5 ALCORCON".
   El codigo viejo queda como hueco y se apunta en el texto de origen.

  python scripts/barrido/esparta_smlb_palomares.py [--escribir]
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from produccion import arrancar  # noqa: E402

ESCRIBIR = "--escribir" in sys.argv


def main():
    b = arrancar()
    uno = lambda q: b.leer(q)[0]  # noqa: E731
    pal = uno("comunidades?select=id,nombre&cif_comunidad=eq.H88443007")
    e5 = uno("oportunidades?select=id,nombre,comunidad_id&codigo=eq.DAN-2025-435")
    e7 = uno("oportunidades?select=id,nombre,comunidad_id&codigo=eq.DAN-2026-091")
    c5 = uno("comunidades?select=id,nombre&id=eq." + e5["comunidad_id"])
    c7 = uno("comunidades?select=id,nombre&id=eq." + e7["comunidad_id"])
    sm = uno("oportunidades?select=id,nombre,fecha_apertura,origen_notas&codigo=eq.DAN-2026-029")
    assert not b.leer("oportunidades?select=id&codigo=eq.DAN-2021-137"), "DAN-2021-137 ya existe"
    xl = b.leer("datos_proyecto?select=id,ruta&oportunidad_id=is.null&ruta=ilike.*esparta7*")

    print("comunidad %r -> 'CP PALOMARES 75 (GARAJE) MADRID'" % pal["nombre"])
    print("DAN-2025-435 %r -> 'ESPARTA 5 MOSTOLES' · comunidad %r -> 'CP ESPARTA 5 MOSTOLES'" % (e5["nombre"], c5["nombre"]))
    print("DAN-2026-091 %r -> 'ESPARTA 7 MOSTOLES' · comunidad %r -> 'CP ESPARTA 7 MOSTOLES'" % (e7["nombre"], c7["nombre"]))
    print("DAN-2026-029 %r (%s) -> DAN-2021-137 'SANTA MARIA LA BLANCA 3 Y 5 ALCORCON' (2021-12-01)" % (sm["nombre"], sm["fecha_apertura"]))
    print("Excel esparta7 sin casar: %d" % len(xl))
    if not ESCRIBIR:
        print("*** EN SECO ***")
        return

    b.actualizar("comunidades?id=eq." + pal["id"], {"nombre": "CP PALOMARES 75 (GARAJE) MADRID"})
    b.actualizar("oportunidades?id=eq." + e5["id"], {"nombre": "ESPARTA 5 MOSTOLES"})
    b.actualizar("comunidades?id=eq." + c5["id"], {"nombre": "CP ESPARTA 5 MOSTOLES"})
    b.actualizar("oportunidades?id=eq." + e7["id"], {"nombre": "ESPARTA 7 MOSTOLES"})
    b.actualizar("comunidades?id=eq." + c7["id"], {"nombre": "CP ESPARTA 7 MOSTOLES"})
    for f in xl:
        b.actualizar("datos_proyecto?id=eq." + f["id"], {"oportunidad_id": e7["id"], "enlace": "a mano: DAN-2026-091 (Mónica, 11-oct-2026)"})
        b.actualizar("presupuestos_proyecto?datos_proyecto_id=eq." + f["id"], {"oportunidad_id": e7["id"]})
    nota = ("Era DAN-2026-029, abierta por error en 2026 (Mónica, 11-oct-2026): es la de 2021 (hoja de datos del "
            "proyecto de diciembre de 2021, hojas de subvención de diciembre de 2022), que se ejecutó al conceder la "
            "subvención; las hojas de 2026 son de la DF y la CSS de esta misma obra. Apertura aproximada: la hoja de "
            "datos del proyecto.")
    b.actualizar("oportunidades?id=eq." + sm["id"], {
        "codigo": "DAN-2021-137", "fecha_apertura": "2021-12-01", "nombre": "SANTA MARIA LA BLANCA 3 Y 5 ALCORCON",
        "origen_notas": "\n\n".join(x for x in (sm["origen_notas"], nota) if x)})
    print("hecho")


if __name__ == "__main__":
    main()
