# -*- coding: utf-8 -*-
"""
LAS FECHAS DE LAS CONVOCATORIAS, DE LA BDNS (Monica, 11-oct-2026)

1. Las que ya tenemos (bdns_convocatorias): se rellena cuando se convoco
   (fechaRecepcion) y el plazo de solicitud, si la BDNS lo da.
2. Las del AYUNTAMIENTO DE MADRID (Plan Rehabilita, Plan Adapta, Transforma tu
   Barrio): se buscan en la BDNS y se apuntan SOLO POR SUS FECHAS (origen
   'solo_fechas', sin vigilar). Sus concesiones siguen saliendo del geoportal,
   que trae coordenadas.

API publica, sin claves: https://www.infosubvenciones.es/bdnstrans/api
Uso: python scripts/referencia/bdns_fechas.py [--escribir]
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from produccion import arrancar  # noqa: E402

BDNS = "https://www.infosubvenciones.es/bdnstrans/api"
ESCRIBIR = "--escribir" in sys.argv


def pedir(ruta, **q):
    url = "%s/%s?%s" % (BDNS, ruta, urllib.parse.urlencode(q))
    for intento in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"Accept": "application/json"}), timeout=30) as r:
                return json.load(r)
        except Exception:
            time.sleep(2 + intento * 3)
    return None


def fechas(numero):
    d = pedir("convocatorias", numConv=numero) or {}
    return {"fecha_recepcion": d.get("fechaRecepcion"), "inicio_solicitud": d.get("fechaInicioSolicitud"),
            "fin_solicitud": d.get("fechaFinSolicitud")}


def main():
    b = arrancar()
    # 1 · las que ya tenemos
    todas = b.leer("bdns_convocatorias?select=numero,fecha_recepcion,fin_solicitud")
    hechas = 0
    for c in (todas if "--solo-madrid" not in sys.argv else []):
        f = fechas(c["numero"])
        if ESCRIBIR and any(f.values()):
            b.actualizar("bdns_convocatorias?numero=eq.%s" % c["numero"], {k: v for k, v in f.items() if v})
        hechas += 1 if f["fecha_recepcion"] else 0
        time.sleep(0.3)
    print("1 · fechas encontradas: %d de %d" % (hechas, len(todas)))

    # 2 · las del Ayuntamiento de Madrid: año a año (la busqueda de la BDNS se
    # corta en las primeras paginas), solo organo LOCAL de MADRID, y cada una a
    # su programa por lo que dice su texto.
    catalogo = b.leer("catalogo_convocatorias?select=id,programa,linea,entidad&entidad=ilike.Ayuntamiento%20de%20Madrid*")
    linea = {p: next((c["id"] for c in catalogo if c["programa"] == p), None) for p in ("Plan Rehabilita", "Plan Adapta Madrid", "Transforma tu Barrio")}
    ya = {c["numero"] for c in todas}
    nuevas = []
    for anio in range(2020, int(time.strftime("%Y")) + 1):
        for termino in ("rehabilitación", "accesibilidad", "adaptación"):
            for pagina in range(0, 40):
                d = pedir("convocatorias/busqueda", page=pagina, pageSize=50, descripcion=termino,
                          fechaDesde="01/01/%d" % anio, fechaHasta="31/12/%d" % anio)
                if not d:
                    break
                for c in d.get("content") or []:
                    if str(c.get("nivel1")).upper() != "LOCAL" or str(c.get("nivel2")).upper() != "MADRID":
                        continue
                    t = (c.get("descripcion") or "").upper()
                    if any(x in t for x in ("VEHICULO", "VEHÍCULO", "CONVENIO", "CENTROS", "PRESTACIONES", "NOMINATIVA", "SUBV.NOM", "TEATRO", "EQUIPAMIENTO")):
                        continue
                    if "TRANSFORMA" in t or "BARRIO" in t:
                        programa = "Transforma tu Barrio"
                    elif "ADAPTA" in t:
                        programa = "Plan Adapta Madrid"
                    elif "REHABILITA" in t or "ACCESIBILIDAD, CONSERVACI" in t or "EFICIENCIA" in t:
                        programa = "Plan Rehabilita"
                    else:
                        continue
                    num = str(c["numeroConvocatoria"])
                    if num in ya or any(n["numero"] == num for n in nuevas):
                        continue
                    nuevas.append({"numero": num, "descripcion": c.get("descripcion"),
                                   "organo": " · ".join(str(c.get(k) or "") for k in ("nivel1", "nivel2", "nivel3")),
                                   "fecha_recepcion": c.get("fechaRecepcion"), "origen": "solo_fechas", "vigilada": False,
                                   "catalogo_convocatoria_id": linea.get(programa), "_programa": programa})
                if d.get("last", True):
                    break
                time.sleep(0.25)
    nuevas.sort(key=lambda n: (n["_programa"], n["fecha_recepcion"] or ""))
    for n in nuevas:
        print("   %s · %s · %s · %s" % (n["_programa"], n["fecha_recepcion"], n["numero"], (n["descripcion"] or "")[:90]))
    print("2 · del Ayuntamiento de Madrid: %d" % len(nuevas))
    if ESCRIBIR and nuevas:
        for n in nuevas:
            n.update({k: v for k, v in fechas(n["numero"]).items() if v})
            n.pop("_programa")
        b.insertar("bdns_convocatorias", nuevas)
    if not ESCRIBIR:
        print("*** EN SECO ***")


if __name__ == "__main__":
    main()
