# -*- coding: utf-8 -*-
r"""
Junta las dos mitades de la lista de personas en una sola:

  personas_solo.csv          las 342 que salieron de las fichas ya consolidadas
  altas_personas_empresa.csv las que Monica identifico a mano para las empresas
                             que se habian quedado sin nadie

Saca dos ficheros, que son cosas distintas y conviene no mezclar:

  puestos_final.csv   una fila por PERSONA EN EMPRESA (es lo que sera `puesto`)
  personas_final.csv  una fila por PERSONA (es lo que sera `persona`)

La identidad es NOMBRE + EMPRESA, salvo donde Monica dijo lo contrario con la
columna misma_persona_que_en: Paz Terradillo trabajo en Gesmadrid y monto
Ciudadela, y es UNA persona con DOS puestos, no dos personas.

Uso: python scripts/lista_final_personas.py
"""
import sys, io, re, csv
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

SOLO = r"C:\accesalia-fichas\personas_solo.csv"
ALT = r"C:\accesalia-fichas\altas_personas_empresa.csv"
VINC = r"C:\accesalia-fichas\personas_por_comunidad.csv"
PUES = r"C:\accesalia-fichas\puestos_final.csv"
PERS = r"C:\accesalia-fichas\personas_final.csv"

T = str.maketrans("áéíóúüñÁÉÍÓÚÜÑ", "aeiouunAEIOUUN")
def norm(v):
    return " ".join(re.sub(r"[^a-z ]", " ", (v or "").translate(T).lower()).split())
g = lambda f, k: (f.get(k) or "").strip()

# comunidades por (persona, empresa), para no perder de vista de donde sale cada uno
coms = defaultdict(set)
for f in csv.DictReader(open(VINC, encoding="utf-8-sig")):
    coms[(norm(g(f, "persona")), norm(g(f, "empresa")))].add(g(f, "comunidad"))

puestos = []
for f in csv.DictReader(open(SOLO, encoding="utf-8-sig")):
    for e in g(f, "empresas").split(" | "):
        puestos.append({"empresa": e, "persona": g(f, "persona"), "cargo": "",
                        "numero_colegiado": "", "cerrado": "",
                        "misma_que_en": "", "origen": "ficha"})
# Empresas que Monica decidio que NO entran: duplicadas de otra, o comunidades
# autogestionadas que se habian colado como si fueran una administracion.
FUERA = set()
try:
    for f in csv.DictReader(open(r"C:\accesalia-fichas\empresas_tablero_decisiones.csv",
                                 encoding="utf-8-sig")):
        if g(f, "decision") in ("fuera", "duplicada"):
            FUERA.add(norm(g(f, "empresa")))
except FileNotFoundError:
    pass

for f in csv.DictReader(open(ALT, encoding="utf-8-sig")):
    if norm(g(f, "empresa")) in FUERA:
        continue
    puestos.append({"empresa": g(f, "empresa"), "persona": g(f, "persona"),
                    "cargo": g(f, "cargo"), "numero_colegiado": g(f, "numero_colegiado"),
                    "cerrado": g(f, "puesto_cerrado"),
                    "misma_que_en": g(f, "misma_persona_que_en"), "origen": "alta de Monica"})

# ---------- identidad de la persona ----------
# clave por defecto: nombre + empresa. Donde Monica dijo "es la misma que en X",
# la clave pasa a ser la de ESA empresa: un solo ser humano, dos puestos.
def clave(p):
    e = p["misma_que_en"] or p["empresa"]
    return (norm(p["persona"]), norm(e))

por_persona = defaultdict(list)
for p in puestos:
    por_persona[clave(p)].append(p)

with open(PUES, "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["empresa", "persona", "cargo", "numero_colegiado", "estado",
                "n_comunidades", "comunidades", "origen"])
    for p in sorted(puestos, key=lambda x: (x["empresa"].upper(), norm(x["persona"]))):
        c = sorted(coms.get((norm(p["persona"]), norm(p["empresa"])), ()))
        w.writerow([p["empresa"], p["persona"], p["cargo"], p["numero_colegiado"],
                    "cerrado" if p["cerrado"] == "si" else "abierto",
                    len(c), " | ".join(c[:4]), p["origen"]])

with open(PERS, "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["persona", "n_puestos", "empresas", "n_comunidades"])
    for k in sorted(por_persona, key=lambda x: x[0]):
        v = por_persona[k]
        cs = set()
        for p in v:
            cs |= coms.get((norm(p["persona"]), norm(p["empresa"])), set())
        w.writerow([v[0]["persona"], len(v),
                    " | ".join(sorted({p["empresa"] for p in v})), len(cs)])

varios = {k: v for k, v in por_persona.items() if len(v) > 1}
print(f"PUESTOS  (persona en empresa) : {len(puestos)}")
print(f"   de las fichas             : {sum(1 for p in puestos if p['origen'] == 'ficha')}")
print(f"   altas que identificaste tu : {sum(1 for p in puestos if p['origen'] != 'ficha')}")
print(f"   cerrados (ya no trabaja ahi): {sum(1 for p in puestos if p['cerrado'] == 'si')}")
print(f"\nPERSONAS distintas            : {len(por_persona)}")
print(f"   con mas de un puesto       : {len(varios)}")
for k, v in varios.items():
    print(f"      {v[0]['persona']:26} {' + '.join(p['empresa'] for p in v)}")
print(f"\n  -> {PUES}\n  -> {PERS}")
