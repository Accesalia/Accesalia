# -*- coding: utf-8 -*-
r"""
Duplicados en `comunidades`, arbitrados por la CARPETA de Dropbox.

REGLA DE ORO (Monica): si tiene carpeta propia, es una comunidad DISTINTA, no un
duplicado. El texto de la BD es la fuente debil (conviven 'Av. de Portugal, 23,
Leganés, España' y 'AVDA PORTUGAL 23 LEGANES'); la carpeta es la fuerte.

Estructura de carpetas, que define la identidad:
    MADRID\<carpeta comunidad>                          (Madrid capital)
    MADRID\1APROVINCIA\<LOCALIDAD>\<carpeta comunidad>  (provincia)
El nombre de la carpeta NO lleva la localidad (ya la da la carpeta padre): solo
calle, numero y, si hace falta, el tipo de via abreviado (av, po, tr...).

Veredicto por grupo de filas con misma via+portal+municipio:
    2+ carpetas -> COMUNIDADES DISTINTAS (no tocar; tantas como carpetas)
    1 carpeta   -> DUPLICADO real (esas filas son el mismo edificio)
    0 carpetas  -> SIN ARBITRO (no hay carpeta que lo dirima) -> revision humana

No escribe nada: produce el informe para decidir.
Uso: python scripts/detectar_comunidades_duplicadas.py
"""
import sys, io, re, csv, subprocess, unicodedata
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-q", "--csv"]
SALIDA = r"C:\accesalia-fichas\comunidades_duplicadas.csv"

TIPO_VIA = re.compile(r"^(calle|c|avenida|avda|avd|av|plaza|pza|pl|paseo|po|pso|camino|"
                      r"carretera|ctra|ronda|travesia|trav|glorieta|gta|bulevar|via)\b")
ARTICULOS = re.compile(r"\b(de|del|la|el|los|las|y)\b")
# Se prueban TODOS los prefijos, no el primero que encaje: en 'avdelamancha' la
# alternativa 'avd' se come la 'd' de 'de' y deja 'elamancha' en vez de 'mancha'.
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

def sql(q):
    r = subprocess.run(DB + ["-c", q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    return list(csv.DictReader(io.StringIO(r.stdout.decode("utf-8", "replace"))))

# ---------- carpetas de Dropbox (el arbitro) ----------
carpetas = sql(r"""
select distinct
       case when es_provincia then split_part(ruta_dropbox,'\',3)
            else split_part(ruta_dropbox,'\',1) end carpeta,
       localidad
  from migracion_ficha
""")
idx_carp = defaultdict(set)
for c in carpetas:
    if not c["carpeta"]:
        continue
    for k in claves(norm(via_de(c["carpeta"]))):
        idx_carp[k].add((c["carpeta"], norm(c["localidad"]), frozenset(nums(c["carpeta"]))))
print(f"Carpetas-direccion en Dropbox: {len({c['carpeta'] for c in carpetas})}")

# ---------- grupos de comunidades con la misma direccion ----------
com = sql("""
select id, coalesce(nombre,'') nombre, coalesce(direccion,'') direccion,
       coalesce(municipio,'') municipio, coalesce(cif_comunidad,'') cif,
       (select count(*) from proyectos p where p.comunidad_id = comunidades.id) proyectos
  from comunidades
""")
grupos = defaultdict(list)
for c in com:
    if c["direccion"]:
        vtxt, ntxt = c["direccion"].split(",")[0], " ".join(c["direccion"].split(",")[1:2])
    else:
        vtxt, ntxt = via_de(c["nombre"]), c["nombre"]
    v, n = norm(vtxt), nums(ntxt)
    if len(v) > 4 and n:
        grupos[(v, frozenset(n), norm(c["municipio"]))].append(c)
dups = {k: v for k, v in grupos.items() if len(v) > 1}
print(f"Comunidades: {len(com)}   grupos con misma via+portal+municipio: {len(dups)}")

# ---------- arbitraje por carpeta ----------
filas, resumen = [], defaultdict(int)
for (via, ns, mun), rows in sorted(dups.items()):
    cands = set()
    for k in claves(via):
        for carpeta, loc, cn in idx_carp.get(k, ()):
            if cn and ns and not (cn & ns):
                continue
            if loc and mun and loc != mun:
                continue
            cands.add(carpeta)
    if len(cands) >= 2:
        veredicto = "COMUNIDADES DISTINTAS (varias carpetas)"
    elif len(cands) == 1:
        veredicto = "DUPLICADO (una sola carpeta)"
    else:
        veredicto = "SIN ARBITRO (no hay carpeta)"
    resumen[veredicto] += 1
    con_proyectos = sum(1 for r in rows if int(r["proyectos"]) > 0)
    filas.append([veredicto, len(rows), len(cands), " | ".join(sorted(cands)),
                  " | ".join((r["direccion"] or r["nombre"]) for r in rows),
                  mun, con_proyectos,
                  "OJO: proyectos en varias filas" if con_proyectos > 1 else ""])

print()
for k, n in sorted(resumen.items(), key=lambda x: -x[1]):
    print(f"  {n:3} grupos  {k}")

with open(SALIDA, "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["veredicto", "filas_bd", "carpetas_dropbox", "carpetas", "filas_en_la_bd",
                "municipio", "filas_con_proyectos", "aviso"])
    w.writerows(filas)
print(f"\n-> {SALIDA}")

print("\n--- LOS QUE SALEN COMO DUPLICADO REAL ---")
for f in filas:
    if f[0].startswith("DUPLICADO"):
        print(f"  carpeta unica '{f[3]}'  <-  {f[4]}" + (f"   [{f[7]}]" if f[7] else ""))
print("\n--- LOS QUE NO TIENEN ARBITRO ---")
for f in filas:
    if f[0].startswith("SIN"):
        print(f"  {f[5]}: {f[4]}")

