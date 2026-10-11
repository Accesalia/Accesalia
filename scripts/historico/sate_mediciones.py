# -*- coding: utf-8 -*-
"""
LOS m² DE SATE, DE LAS MEDICIONES DEL PRESUPUESTO (Monica, 11-oct-2026)

Para estimar el SATE hace falta el precio por m², y los m² de la hoja DATOS del
Proyecto no son fiables (2.151 m² sale en 6 obras distintas: es el de la
plantilla). El dato de verdad esta en el presupuesto del colegio: dentro del
capitulo "SISTEMA DE AISLAMIENTO TERMICO EN FACHADAS / EN CUBIERTAS", cada
partida lleva su unidad y una linea final "cantidad precio importe". La partida
en m² mas grande del capitulo es el sistema SATE en si:
  · sus m²  = la superficie aislada;
  · su precio unitario = el precio del m² de SATE instalado (PEM);
  · el capitulo entero / esos m² = lo que sale el m² con todo (andamio aparte,
    aparatos de aire, toldos, remates...).

Uso: python scripts/historico/sate_mediciones.py [--escribir]
"""
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from produccion import arrancar  # noqa: E402

DROPBOX = r"C:\accesalia Dropbox\D SM\Ascensores y rehabilitaciones"
ESCRIBIR = "--escribir" in sys.argv
NUM = r"\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2}"


def numero(t):
    t = t.strip()
    if "," in t and (t.rfind(",") > t.rfind(".")):
        return float(t.replace(".", "").replace(",", "."))
    return float(t.replace(",", ""))


def partidas_del_capitulo(texto, num):
    """Las partidas del capitulo: (codigo, unidad, descripcion, cantidad, precio, importe)."""
    i = texto.find("CAPÍTULO %s " % num)
    j = texto.find("TOTAL CAPÍTULO %s " % num, i)
    if i < 0 or j < 0:
        return []
    trozo = texto[i:j]
    cabeceras = list(re.finditer(r"(?m)^(%s\.\d+)\s+(m2|m²|ud|u|ml|m|pa|kg|m3|h)\s+(.+)$" % re.escape(num), trozo))
    salida = []
    for k, c in enumerate(cabeceras):
        fin = cabeceras[k + 1].start() if k + 1 < len(cabeceras) else len(trozo)
        cuerpo = trozo[c.end():fin]
        totales = re.findall(r"(?m)^\s*(%s)\s+(%s)\s+(%s)\s*$" % (NUM, NUM, NUM), cuerpo)
        if totales:
            cant, precio, imp = (numero(x) for x in totales[-1])
            salida.append((c.group(1), c.group(2).replace("²", "2"), c.group(3).strip(), cant, precio, imp))
    return salida


def main():
    from pypdf import PdfReader
    b = arrancar()
    filas = b.leer("presupuestos_proyecto?select=id,ruta,fecha,pem,presupuesto_proyecto_capitulos(capitulo,numero_documento,importe)")
    resultados = []
    for f in filas:
        caps = [c for c in f["presupuesto_proyecto_capitulos"] if c["capitulo"] in ("sate_fachadas", "sate_cubiertas")]
        if not caps:
            continue
        try:
            texto = "\n".join(p.extract_text() or "" for p in PdfReader(os.path.join(DROPBOX, f["ruta"])).pages)
        except Exception as e:
            print("✗", f["ruta"], e)
            continue
        for c in caps:
            ps = [p for p in partidas_del_capitulo(texto, c["numero_documento"]) if p[1] == "m2"]
            if not ps:
                resultados.append((f, c, None))
                continue
            # El sistema puede ir partido en varias partidas (por fachadas o
            # espesores): se SUMAN las del aislamiento. Las auxiliares
            # (preparacion de paramentos, limpieza, desmontajes) no cuentan: su
            # superficie es la misma y se contaria dos veces.
            sistema = [p for p in ps if re.search(r"AISLAMIENTO|SATE|ROCKWOOL|LANA DE ROCA|EPS|XPS|PANEL|L[AÁ]MINA|IMPERMEABILIZ", p[2].upper())
                       and not re.search(r"PREPARACI|LIMPIEZA|DESMONT|RETIRADA|DEMOLICI", p[2].upper())]
            if sistema:
                m2 = sum(p[3] for p in sistema)
                imp = sum(p[5] for p in sistema)
                nombre = sistema[0][2] if len(sistema) == 1 else "%s (+%d partidas)" % (sistema[0][2][:150], len(sistema) - 1)
                principal = (sistema[0][0], "m2", nombre, m2, imp / m2 if m2 else 0, imp)
            else:
                principal = max(ps, key=lambda p: p[3])
            resultados.append((f, c, principal))
    buenos = [r for r in resultados if r[2]]
    print("capítulos SATE: %d · con su partida en m²: %d" % (len(resultados), len(buenos)))
    for f, c, p in sorted(buenos, key=lambda r: r[0]["fecha"] or "")[:12]:
        print("  %s %-14s %8.2f m² · %6.2f €/m² (partida) · %6.2f €/m² (capítulo) · %s" % (
            f["fecha"], c["capitulo"], p[3], p[4], float(c["importe"]) / p[3], p[2][:55]))
    sin = [r for r in resultados if not r[2]]
    for f, c, _ in sin[:6]:
        print("  sin partida en m²:", c["capitulo"], f["ruta"][-70:])
    if ESCRIBIR:
        for f, c, p in buenos:
            b.actualizar("presupuesto_proyecto_capitulos?presupuesto_id=eq.%s&numero_documento=eq.%s" % (f["id"], c["numero_documento"]),
                         {"partida_principal": p[2][:200], "unidad": "m2", "medicion": p[3], "precio_unitario": p[4]})
        print("guardadas: %d" % len(buenos))


if __name__ == "__main__":
    main()
