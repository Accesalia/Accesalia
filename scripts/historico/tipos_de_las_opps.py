# -*- coding: utf-8 -*-
"""
LOS TIPOS DE LAS OPPS DEL HISTORICO (Monica, 11-oct-2026).

El catalogo tipos_proyecto (Accesibilidad -> Rampa / Plataforma / Cota cero...,
Eficiencia energetica -> SATE...) es nuevo y oportunidad_tipos apenas se ha
usado. Con lo extraido de las 607 obras (hoja DATOS del Proyecto y presupuestos
del colegio) se marca el tipo de cada opp. No se pierde el trabajo y la
estimacion de costes lee de ahi.

SOLO SE AÑADE: nunca se quita ni se cambia una marca que ya este.

De donde sale cada tipo (lo declarado por el tecnico o lo que trae el
presupuesto; nunca el nombre de la carpeta):
  ascensor     tipo de obra "instalacion de ascensor" / "nucleo ... con ascensor",
               o el presupuesto trae la partida del ascensor (y no es caso F)
  cota_cero    caso F (bajada de ascensor existente) o "cota cero" en el tipo
  sustitucion_ascensor  "sustitucion de ascensor" en el tipo (tipo nuevo, 11-oct-2026)
  plataforma   el presupuesto trae la partida de la maquina (plataforma,
               salvaescaleras, silla), o el tipo de obra dice plataforma/salvaescaleras
  rampa        el tipo de obra dice rampa, o accesibilidad cuyo presupuesto
               nombra la rampa y no trae maquina
  sate         capitulos de SATE de fachada Y de cubierta, o "envolvente termica"
               en el tipo (sin "en cubierta")
  sate_fachada solo capitulo de SATE de fachada, o "rehabilitacion energetica de fachada"
  cubierta     solo capitulo de SATE de cubierta, o "envolvente termica en cubierta"
  aerotermia / fotovoltaica   dichas en el tipo de obra
  arreglo_fachada / arreglo_cubierta   sin SATE, el tipo de obra dice fachada o cubierta
Sin tipo (se cuentan aparte): lo que no es nada de lo anterior.

Uso:  python tipos_de_las_opps.py            -> solo cuenta y deja un CSV
      python tipos_de_las_opps.py --escribir -> ademas inserta lo que falta
"""
import collections
import csv
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402
from rampa_o_plataforma import clasificar  # noqa: E402

ESCRIBIR = "--escribir" in sys.argv
SALIDA = next((a for a in sys.argv[1:] if not a.startswith("--")), "tipos_de_las_opps.csv")


def tipos_de(d, caps, lectura):
    t = (d["tipo_obra"] or "").upper()
    ts = (d["tipo_obra_sate"] or "").upper()
    caso = d["caso_actuacion"]
    out = set()
    # Ascensor y cota cero
    if caso == "F" or "COTA CERO" in t:
        out.add("cota_cero")
    elif re.search(r"INSTALACI[OÓ]N DE (1 |UN |\d+ )?ASCENSOR|N[UÚ]CLEO DE COMUNICACI[OÓ]N CON ASCENSOR", t):
        out.add("ascensor")
    elif lectura and lectura["partida_ascensor"] and "SUSTITUCI" not in t:
        out.add("ascensor")
    if re.search(r"SUSTITUCI[OÓ]N DE (UN |DOS |LOS )?ASCENSOR", t):
        out.add("sustitucion_ascensor")
    # Plataforma y rampa
    if (lectura and lectura["partida_maquina"]) or re.search(r"PLATAFORMA|SALVAESCALERA", t):
        out.add("plataforma")
    if "RAMPA" in t or (lectura and lectura["clase"] == "rampa"):
        out.add("rampa")
    # SATE
    fach, cub = "sate_fachadas" in caps, "sate_cubiertas" in caps
    envolvente = re.search(r"ENVOLVENTE", t) or (not t.strip("0 ") and re.search(r"ENVOLVENTE", ts))
    if fach and cub:
        out.add("sate")
    elif fach:
        out.add("sate_fachada")
    elif cub:
        out.add("cubierta")
    elif re.search(r"ENERG[EÉ]TICA DE (LA |LAS )?FACHADA", t):
        out.add("sate_fachada")
    elif envolvente:
        out.add("cubierta" if re.search(r"ENVOLVENTE T[EÉ]RMICA EN CUBIERTA", t + " " + ts) else "sate")
    else:
        # Sin SATE: arreglo de fachada o de cubierta (Monica, 11-oct-2026)
        # (no la de un local: Doctor Esquerdo 55 "reforma de fachada" de una oficina)
        dicho = t if t.strip("0 ") else ts
        if "LOCAL" not in dicho:
            if re.search(r"FACHADA", dicho):
                out.add("arreglo_fachada")
            if re.search(r"CUBIERTA", dicho):
                out.add("arreglo_cubierta")
    for k in ("AEROTERMIA", "FOTOVOLTAICA"):
        if k in t or (envolvente and k in ts):
            out.add(k.lower())
    return out


def main():
    base = arrancar()
    cat = {r["clave"]: r["id"] for r in base.leer("tipos_proyecto?select=id,clave")}
    datos = base.leer("datos_proyecto?select=id,oportunidad_id,tipo_obra,tipo_obra_sate,caso_actuacion,pem,ruta,"
                      "presupuestos_proyecto(presupuesto_proyecto_capitulos(capitulo))")
    ya = collections.defaultdict(set)
    for r in base.leer("oportunidad_tipos?select=oportunidad_id,tipo_id"):
        ya[r["oportunidad_id"]].add(r["tipo_id"])
    lecturas = {r["id"]: r for r in clasificar(base)}

    filas, nuevas = [], {}
    cuenta = collections.Counter()
    for d in datos:
        caps = {c["capitulo"] for p in d.get("presupuestos_proyecto") or []
                for c in p.get("presupuesto_proyecto_capitulos") or []}
        tipos = tipos_de(d, caps, lecturas.get(d["id"]))
        opp = d["oportunidad_id"]
        faltan = sorted(k for k in tipos if cat[k] not in ya[opp])
        for k in tipos:
            cuenta[k] += 1
        if not tipos:
            cuenta["(sin tipo)"] += 1
        for k in faltan:
            nuevas[(opp, cat[k])] = k
        filas.append({"datos_proyecto_id": d["id"], "oportunidad_id": opp, "tipo_obra": d["tipo_obra"],
                      "caso": d["caso_actuacion"], "pem": d["pem"], "tipos": ",".join(sorted(tipos)),
                      "se_anaden": ",".join(faltan), "carpeta": (d["ruta"] or "").split("\\2.PROYECTO")[0]})

    with open(SALIDA, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, list(filas[0]), delimiter=";")
        w.writeheader()
        w.writerows(filas)
    print("obras por tipo:", dict(cuenta.most_common()))
    print("marcas que se añaden:", len(nuevas), dict(collections.Counter(nuevas.values()).most_common()))
    print("CSV ->", SALIDA)
    if ESCRIBIR and nuevas:
        base.insertar("oportunidad_tipos", [{"oportunidad_id": o, "tipo_id": t} for (o, t) in nuevas])
        print("ESCRITAS", len(nuevas))


if __name__ == "__main__":
    main()
