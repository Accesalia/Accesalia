# -*- coding: utf-8 -*-
r"""
Por que 291 comunidades de la BD no tienen carpeta: importacion o casado.

Cotejo CARPETA <-> COMUNIDAD directamente contra el sistema de ficheros, sin
pasar por la ficha. Asi entran tambien las 182 carpetas que no tienen ficha
dentro y que el casado por ficha no llegaba a mirar.

El municipio es CRITICO y no se relaja nunca: 'polvoranca18' existe en Leganes,
Fuenlabrada y Getafe, y todos los pueblos tienen una calle Mayor. Cuando via y
portal coinciden pero el municipio NO, eso es justamente el diagnostico:
la carpeta esta bien y el municipio de la BD esta mal (o al reves).

No escribe nada. Produce C:\accesalia-fichas\comunidades_sin_carpeta.csv
Uso: python scripts/diagnosticar_comunidades_sin_carpeta.py
"""
import os, sys, io, re, csv, subprocess, unicodedata
from collections import defaultdict
from difflib import get_close_matches
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

RAIZ = r"C:\accesalia Dropbox\D SM\Ascensores y rehabilitaciones\MADRID"
SALIDA = r"C:\accesalia-fichas\comunidades_sin_carpeta.csv"
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-q", "--csv"]

TIPO_VIA = re.compile(r"^(calle|c|avenida|avda|avd|av|plaza|pza|pl|paseo|po|pso|camino|"
                      r"carretera|ctra|ronda|travesia|trav|glorieta|gta|bulevar|via)\b")
ARTICULOS = re.compile(r"\b(de|del|la|el|los|las|y)\b")
PREFIJOS = ["avenida", "avda", "avd", "av", "plaza", "pza", "paseo", "pso", "po",
            "carretera", "ctra", "glorieta", "gta", "travesia", "trav", "tr",
            "calle", "cl", "camino", "ronda"]
ART_PEGADO = re.compile(r"(de|del|la|los|las)")

def sin_tildes(s):
    return "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn")

def norm(t):
    s = sin_tildes(t).lower()
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return re.sub(r"[^a-z0-9]", "", ARTICULOS.sub(" ", TIPO_VIA.sub(" ", s)))

def claves(v):
    ks = {v}
    for p in PREFIJOS:
        if v.startswith(p) and len(v) - len(p) >= 5:
            ks.add(v[len(p):])
    for k in list(ks):
        sa = ART_PEGADO.sub("", k)
        if len(sa) >= 5:
            ks.add(sa)
    return {k for k in ks if len(k) > 4}

def nums(t):
    return {int(n) for n in re.findall(r"\d{1,3}", t or "") if 0 < int(n) < 1000}

def via_de(t):
    return re.split(r"\d", t or "", maxsplit=1)[0]

# ---------- carpetas reales del Dropbox ----------
carpetas = []
for d in os.scandir(RAIZ):
    if d.is_dir() and d.name.upper() != "1APROVINCIA":
        carpetas.append(("MADRID", d.name))
for loc in os.scandir(os.path.join(RAIZ, "1APROVINCIA")):
    if loc.is_dir():
        for d in os.scandir(loc.path):
            if d.is_dir():
                carpetas.append((loc.name, d.name))
print(f"Carpetas de direccion en Dropbox: {len(carpetas)}")

por_clave = defaultdict(list)          # clave de via -> carpetas
for loc, nombre in carpetas:
    v = norm(via_de(nombre))
    for k in claves(v):
        por_clave[k].append((loc, nombre, nums(nombre), norm(loc)))
todas_claves = list(por_clave)

# ---------- comunidades ----------
r = subprocess.run(DB + ["-c", """
select id, coalesce(nombre,'') nombre, coalesce(direccion,'') direccion,
       coalesce(municipio,'') municipio,
       (select count(*) from proyectos p where p.comunidad_id = comunidades.id) proyectos
  from comunidades"""], stdout=subprocess.PIPE)
com = list(csv.DictReader(io.StringIO(r.stdout.decode("utf-8", "replace"))))

# El municipio de la BD viene contaminado con trozos de la direccion
# ("15 MADRID", "Q ESC 17 MADRID", "VELILLA DE SAN ANTONIO MADRID"). Como las
# carpetas dan el vocabulario REAL de localidades, se busca cual aparece en el
# texto y se toma LA MAS ESPECIFICA: en "VELILLA DE SAN ANTONIO MADRID" estan
# 'madrid' y 'velillasanantonio'; la buena es la larga.
LOCALIDADES = sorted({norm(loc) for loc, _ in carpetas} - {""}, key=len, reverse=True)

def municipios_posibles(c):
    texto = " ".join(norm(x) for x in (c["municipio"], c["direccion"], c["nombre"]))
    hits = [l for l in LOCALIDADES if l and l in texto]
    if not hits:
        return set()
    # se conserva la mas larga y las que no esten contenidas en ella
    mejor = hits[0]
    return {mejor} | {h for h in hits if h not in mejor}

filas, resumen = [], defaultdict(int)
for c in com:
    if c["direccion"]:
        vtxt, ntxt = c["direccion"].split(",")[0], " ".join(c["direccion"].split(",")[1:2])
    else:
        vtxt, ntxt = via_de(c["nombre"]), c["nombre"]
    v, n = norm(vtxt), nums(ntxt)
    muns = municipios_posibles(c)
    ks = claves(v)

    def mismo_mun(x):
        return not muns or x[3] in muns

    misma_via = []
    for k in ks:
        misma_via += por_clave.get(k, [])
    exactas   = [x for x in misma_via if (not n or not x[2] or n & x[2]) and mismo_mun(x)]
    otro_mun  = [x for x in misma_via if (not n or not x[2] or n & x[2]) and not mismo_mun(x)]
    otro_num  = [x for x in misma_via if n and x[2] and not (n & x[2]) and mismo_mun(x)]

    if exactas:
        estado = "OK: tiene carpeta"
    elif otro_mun:
        estado = "MUNICIPIO NO CUADRA (carpeta en otra localidad)"
    elif otro_num:
        estado = "MISMA CALLE, OTRO PORTAL (falta la carpeta de ese portal)"
    elif not ks:
        estado = "SIN DIRECCION UTIL EN LA BD"
    else:
        cerca = [x for k in ks for x in get_close_matches(k, todas_claves, n=2, cutoff=0.86)]
        cands = [y for x in cerca for y in por_clave[x]
                 if (not n or not y[2] or n & y[2]) and mismo_mun(y)]
        estado = "CALLE PARECIDA (revisar escritura)" if cands else "NO EXISTE CARPETA CON ESA CALLE"
        otro_mun = cands or otro_mun
    resumen[estado] += 1
    if estado.startswith("OK"):
        continue
    pistas = (exactas or otro_mun or otro_num)[:3]
    filas.append([estado, c["direccion"] or c["nombre"], c["municipio"], c["proyectos"],
                  " | ".join(f"{l}\\{nb}" for l, nb, _, _ in pistas)])

print()
for k, n_ in sorted(resumen.items(), key=lambda x: -x[1]):
    print(f"  {n_:5}  {k}")

with open(SALIDA, "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["diagnostico", "comunidad_en_la_bd", "municipio_bd", "proyectos", "carpetas_candidatas"])
    w.writerows(sorted(filas))
print(f"\n-> {SALIDA}  ({len(filas)} filas)")

print("\n--- MUNICIPIO NO CUADRA (12 ejemplos) ---")
for f in [x for x in filas if x[0].startswith("MUNICIPIO")][:12]:
    print(f"  BD dice {f[2]:<18} {f[1][:44]:<44} -> carpeta en {f[4]}")

