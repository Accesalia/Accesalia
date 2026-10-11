# -*- coding: utf-8 -*-
"""
FUSIONAR OPORTUNIDADES DUPLICADAS (el mismo encargo) EN UNA (11-oct-2026)

Como unir_opps.py, pero SIN pararse si la que sobra tiene hojas, presupuestos,
facturas, documentos...: TODO lo que cuelga de ella pasa a la que queda. Si no
se pasara, al borrarla se irian en cascada sus documentos, juntas y notas.

  · las tablas que apuntan a oportunidades (todas) -> a la que queda;
  · portales y tipos: se pasan los que no tenga ya;
  · notas: la IGUAL (fecha y texto) que ya tenga la que queda no se pasa;
  · el texto de origen se anade al de la que queda, diciendo de donde viene;
  · si la que queda no tiene comunidad y la otra si, se la queda.
Antes de borrar, copia completa en Descargas. Los codigos NO se renumeran: el
de la borrada queda como hueco.

  python scripts/barrido/fusionar_opps.py QUEDA SOBRA [SOBRA...] [--escribir]
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from produccion import arrancar  # noqa: E402

# Todas las que apuntan a oportunidades (pg_constraint, 11-oct-2026), menos las
# que se tratan aparte (portales, tipos, notas).
MOVER = [
    ("avisos", "oportunidad_id"), ("datos_proyecto", "oportunidad_id"), ("documentos", "oportunidad_id"),
    ("facturas", "oportunidad_id"), ("historial_pausas_oportunidad", "oportunidad_id"),
    ("hojas_encargo", "oportunidad_id"), ("iee_registrado", "oportunidad_id"),
    ("interacciones", "oportunidad_id"), ("juntas", "oportunidad_id"), ("llamadas", "donde_oportunidad_id"),
    ("manias_organismos", "oportunidad_id"), ("modelos_3d_venta", "oportunidad_id"),
    ("motivo_cierre_oportunidad", "oportunidad_id"), ("negociacion_oportunidad", "oportunidad_id"),
    ("oportunidades", "oportunidad_origen_id"), ("presupuestos", "oportunidad_id"),
    ("presupuestos_proyecto", "oportunidad_id"), ("revision_firmadas", "oportunidad_id"),
    ("tareas_seguimiento", "oportunidad_id"), ("viabilidades", "oportunidad_id"),
]


def main():
    escribir = "--escribir" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    queda_cod, sobran = args[0], args[1:]
    b = arrancar()
    q = b.leer("oportunidades?select=*&codigo=eq." + queda_cod)[0]
    copia, origen = {}, [q["origen_notas"] or ""]
    for cod in sobran:
        o = b.leer("oportunidades?select=*&codigo=eq." + cod)[0]
        c = {"oportunidad": o}
        for t, col in MOVER + [("relacion_oportunidad_accesos", "opp_id"), ("oportunidad_tipos", "oportunidad_id"),
                               ("notas_oportunidad", "oportunidad_id"), ("notas_subvencion", "oportunidad_id"),
                               ("hitos_oportunidad", "oportunidad_id")]:
            filas = b.leer("%s?select=*&%s=eq.%s" % (t, col, o["id"]))
            if filas:
                c[t] = filas
        copia[cod] = c
        origen.append("--- Unida desde %s (%s), mismo encargo (Mónica, %s) ---\n%s" % (
            cod, o["nombre"] or o["comunidad_provisional"], time.strftime("%d-%m-%Y"), o["origen_notas"] or ""))
        print("%s → %s: %s" % (cod, queda_cod, ", ".join("%d %s" % (len(v), k) for k, v in c.items() if k != "oportunidad") or "nada colgando"))
    if not escribir:
        print("*** EN SECO ***")
        return

    fichero = os.path.join(os.path.expanduser("~"), "Downloads", "copia_fusion_%s_%s.json" % (queda_cod, time.strftime("%d%b_%H%M")))
    json.dump(copia, open(fichero, "w", encoding="utf-8"), ensure_ascii=False, indent=1, default=str)
    print("copia en", fichero)
    for cod, c in copia.items():
        oid = c["oportunidad"]["id"]
        for t, col in MOVER:
            if c.get(t):
                b.actualizar("%s?%s=eq.%s" % (t, col, oid), {col: q["id"]})
        ya = {r["acceso_id"] for r in b.leer("relacion_oportunidad_accesos?select=acceso_id&opp_id=eq." + q["id"])}
        for r in c.get("relacion_oportunidad_accesos", []):
            if r["acceso_id"] not in ya:
                b.insertar("relacion_oportunidad_accesos", [{"opp_id": q["id"], "acceso_id": r["acceso_id"],
                                                             "de_donde": (r.get("de_donde") or "") + " (pasado desde %s)" % cod}])
                ya.add(r["acceso_id"])
        tiene = {r["tipo_id"] for r in b.leer("oportunidad_tipos?select=tipo_id&oportunidad_id=eq." + q["id"])}
        for r in c.get("oportunidad_tipos", []):
            if r["tipo_id"] not in tiene:
                b.insertar("oportunidad_tipos", [{"oportunidad_id": q["id"], "tipo_id": r["tipo_id"]}])
                tiene.add(r["tipo_id"])
        # Los hitos son la plantilla de fases (una fila por fase, casi siempre
        # vacia): no se pasan. Si el de la que sobra tiene algo y el mismo hito
        # de la que queda esta vacio, se le copia.
        suyos = {h["hito"]: h for h in b.leer("hitos_oportunidad?select=*&oportunidad_id=eq." + q["id"])}
        for h in c.get("hitos_oportunidad", []):
            dest = suyos.get(h["hito"])
            lleno = h.get("fecha") or h.get("notas") or h.get("enlace_url") or h.get("estado") not in (None, "pendiente", "no_aplica")
            vacio = dest and not (dest.get("fecha") or dest.get("notas") or dest.get("enlace_url")) and dest.get("estado") in (None, "pendiente", "no_aplica")
            if lleno and vacio:
                b.actualizar("hitos_oportunidad?id=eq.%s" % dest["id"], {k: h[k] for k in ("aplicable", "estado", "fecha", "responsable_id", "enlace_url", "notas")})
        for t in ("notas_oportunidad", "notas_subvencion"):
            iguales = {(n["fecha"], (n["texto"] or "").strip()) for n in b.leer("%s?select=fecha,texto&oportunidad_id=eq.%s" % (t, q["id"]))}
            for n in c.get(t, []):
                clave = (n["fecha"], (n["texto"] or "").strip())
                if clave not in iguales:
                    b.actualizar("%s?id=eq.%s" % (t, n["id"]), {"oportunidad_id": q["id"]})
                    iguales.add(clave)
    cambio = {"origen_notas": "\n\n".join(x for x in origen if x.strip())}
    com = next((c["oportunidad"]["comunidad_id"] for c in copia.values() if c["oportunidad"]["comunidad_id"]), None)
    if not q["comunidad_id"] and com:
        cambio.update({"comunidad_id": com, "comunidad_provisional": None})
    if not q["referencia_catastral"]:
        ref = next((c["oportunidad"]["referencia_catastral"] for c in copia.values() if c["oportunidad"]["referencia_catastral"]), None)
        if ref:
            cambio["referencia_catastral"] = ref
    b.actualizar("oportunidades?id=eq." + q["id"], cambio)
    for cod, c in copia.items():
        b.borrar("oportunidades?id=eq." + c["oportunidad"]["id"])
    print("fusionadas en %s y borradas: %s" % (queda_cod, ", ".join(copia)))


if __name__ == "__main__":
    main()
