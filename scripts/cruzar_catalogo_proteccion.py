# -*- coding: utf-8 -*-
"""
CRUCE DEL CATALOGO DE PROTECCION CON NUESTROS PORTALES (Monica, 11-oct-2026).

Cada fila de catalogo_proteccion contra los accesos (portales) del mismo
municipio, de lo mas seguro a lo menos:
  1. referencia   - la referencia catastral entera (14) coincide.
  2. parcela      - manzana + parcela (los 7 primeros) coinciden: la ficha la da
                    cortada, o en notas ("manzana 91135, parcelas 07, 09"...).
  3. direccion    - misma calle (por conjunto de palabras) y mismo numero.
Las zonas sin parcelas (areas arqueologicas, casco entero) NO se cruzan: sus
limites estan en un plano.

Uso:  python scripts/cruzar_catalogo_proteccion.py          (solo mirar)
"""
import os
import re
import sys
import unicodedata
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from produccion import arrancar  # noqa: E402

VACIAS = {"C", "CL", "CALLE", "PZA", "PLAZA", "PZ", "AVDA", "AV", "AVENIDA", "PO", "PASEO", "P",
          "DE", "DEL", "LA", "LAS", "LOS", "EL", "Y", "E", "N", "NO", "Nº", "CV", "C/V", "S/N", "SN",
          "CTRA", "CARRETERA", "RONDA", "RD", "TRAVESIA", "TR", "GLORIETA", "CUESTA", "CU"}


def plano(t):
    t = unicodedata.normalize("NFD", (t or "").upper())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def palabras(t):
    todas = [w for w in re.findall(r"[A-Z]+", plano(t)) if len(w) > 1]
    utiles = {w for w in todas if w not in VACIAS}
    # "C/ de la Plaza" (Fuenlabrada): la calle se llama Plaza; si no queda nada, vale el tipo.
    return utiles or {w for w in todas if w in ("PLAZA", "RONDA", "PASEO", "CUESTA")}


def claves7(r):
    """Manzana+parcela (7 cifras) que da la fila, venga de donde venga."""
    k = set()
    if r.get("referencia_catastral"):
        k.add(r["referencia_catastral"][:7])
    n = r.get("notas") or ""
    # "Parcela catastral actual 8615902", "Parcela catastral 9115511", "visible: 1318501…"
    k |= set(re.findall(r"(?:catastral(?: actual)?|visible:?)\s*(\d{7})", n, re.I))
    # "manzana 66428 parcela 01" (Mostoles), "Manzana 93.168, parcela 04" (lista ambiental de Alcala)
    for mz, pc in re.findall(r"manzana\s+(\d{2}\.?\d{3}),?\s+parcela\s+(\d{2})", n, re.I):
        k.add(mz.replace(".", "") + pc)
    # "Parcelas 07, 09, 10; manzana 91135"  /  "Parcela(s) 14 a 17; manzana catastral 91152"
    for lista, mz in re.findall(r"Parcelas?(?:\(s\))?\s+([\d ,ay]+?)\s*;\s*manzana(?: catastral)?\s+(\d{5})", n, re.I):
        nums = []
        for a, z in re.findall(r"(\d{1,2})\s*a\s*(\d{1,2})", lista):
            a, z = sorted((int(a), int(z)))  # tambien "20 a 15"
            nums += range(a, z + 1)
        nums += [int(x) for x in re.findall(r"\d{1,2}", re.sub(r"\d{1,2}\s*a\s*\d{1,2}", "", lista))]
        k |= {mz + "%02d" % x for x in nums}
    return k


def numeros(direccion):
    d = plano(direccion)
    if re.search(r"\b(PARES|IMPARES)\b", d):
        return set()  # tramos de calle: se cruzan por parcela, no por numero
    return set(re.findall(r"(?:N[Oº]?\s*|,\s*|\s)(\d{1,3})(?=[A-Z]?\b)", d))


def cruzar(b):
    cat = b.leer("catalogo_proteccion?select=id,municipio,tipo,denominacion,direccion,referencia_catastral,grado,notas")
    municipios = sorted({c["municipio"] for c in cat})
    acc = []
    for m in municipios:
        acc += b.leer("accesos?select=id,municipio,tipo_via,nombre_via,numero,ref_catastral&municipio=eq.%s" % m.replace(" ", "%20"))
    por_ref, por7, por_mun = defaultdict(list), defaultdict(list), defaultdict(list)
    for a in acc:
        if a.get("ref_catastral"):
            por_ref[(a["municipio"], a["ref_catastral"][:14])].append(a)
            por7[(a["municipio"], a["ref_catastral"][:7])].append(a)
        por_mun[a["municipio"]].append(a)
    casados = []  # (catalogo, acceso, como)
    for c in cat:
        vistos = set()
        if c.get("referencia_catastral"):
            for a in por_ref[(c["municipio"], c["referencia_catastral"][:14])]:
                casados.append((c, a, "referencia")); vistos.add(a["id"])
        for k in claves7(c):
            for a in por7[(c["municipio"], k)]:
                if a["id"] not in vistos:
                    casados.append((c, a, "parcela")); vistos.add(a["id"])
        nums, pal = numeros(c.get("direccion")), palabras(re.split(r"\bC/?V\b|,", plano(c.get("direccion") or ""))[0])
        if nums and pal:
            for a in por_mun[c["municipio"]]:
                if a["id"] in vistos or not a.get("numero"):
                    continue
                pa = palabras(a.get("nombre_via"))
                num = re.match(r"\d+", a.get("numero") or "")
                if pa and (pa <= pal or pal <= pa) and num and num.group() in nums:
                    casados.append((c, a, "direccion")); vistos.add(a["id"])
    return cat, acc, casados


if __name__ == "__main__":
    b = arrancar()
    cat, acc, casados = cruzar(b)
    rel = b.leer("relacion_oportunidad_accesos?select=acceso_id,opp:oportunidades(codigo,estado)&hasta=is.null")
    opps = defaultdict(list)
    for r in rel:
        if r.get("opp"):
            opps[r["acceso_id"]].append(r["opp"])
    print("catalogo", len(cat), "| portales en esos municipios", len(acc), "| casados", len(casados))
    for c, a, como in sorted(casados, key=lambda x: (x[0]["municipio"], x[2])):
        o = ", ".join("%s (%s)" % (x["codigo"], x["estado"]) for x in opps.get(a["id"], [])) or "sin opp"
        print("%-10s %-18s | %-45.45s | %-30.30s | %s %s %s | %s" % (
            como, c["municipio"][:18], c["denominacion"], c.get("grado") or "", a.get("tipo_via"), a.get("nombre_via"), a.get("numero"), o))
