# -*- coding: utf-8 -*-
r"""
Reparte las observaciones al ENCARGO (proyecto) que les corresponde.

Cuando una comunidad tiene varios encargos, la ficha vive en una subcarpeta con
el nombre de la actuacion (`isturiz11\sate`, `...\accesibilidad`,
`...\cubierta y esc emergencia`). Esa subcarpeta dice de que encargo es la ficha,
y por tanto de que encargo son sus notas.

Solo se asigna cuando el nombre de la subcarpeta casa con UN unico proyecto de
esa comunidad. Si la ficha esta en la carpeta raiz (sin subcarpeta) no hay pista
y la nota se queda colgando de la comunidad: no se adivina.

DRY-RUN por defecto. --apply para escribir.
Uso: python scripts/repartir_notas_por_encargo.py [--apply]
"""
import sys, io, re, csv, subprocess, unicodedata
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

APPLY = "--apply" in sys.argv
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "--csv"]

def sql(q):
    r = subprocess.run(DB + ["-c", q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    t = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(t); sys.exit(1)
    return list(csv.DictReader(io.StringIO(t)))

def norm(s):
    s = "".join(c for c in unicodedata.normalize("NFD", s or "")
                if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9 ]", " ", s)

# Que dice el nombre de la subcarpeta. Orden importante: lo combinado primero.
def tipos_de(carpeta):
    t = norm(carpeta)
    hay_sate = "sate" in t or "fachada" in t
    hay_asc = "ascensor" in t or "accesib" in t or "asc " in t or t.endswith(" asc")
    if hay_sate and hay_asc:
        return {"SATE + ASC", "SATE + ACCESIB"}
    if hay_sate:
        return {"SATE"}
    if "cubierta" in t:
        return {"CUBIERTA"}
    if "accesib" in t:
        return {"ACCESIB", "ASCENSOR"}
    if "ascensor" in t:
        return {"ASCENSOR", "ACCESIB"}
    if "rampa" in t:
        return {"RAMPA", "ACCESIB"}
    if "iee" in t:
        return {"SOLO IEE"}
    return set()

fichas = sql(r"""
select f.ficha_ref, f.comunidad_id, f.ruta_dropbox,
       (select count(*) from observaciones_expediente o
         where o.ficha_ref = f.ficha_ref and o.proyecto_id is null) notas_sin_proyecto
  from migracion_ficha f
 where f.comunidad_id is not null
   and (select count(*) from proyectos p where p.comunidad_id = f.comunidad_id) > 1
   and exists (select 1 from observaciones_expediente o
                where o.ficha_ref = f.ficha_ref and o.proyecto_id is null)""")

proyectos = defaultdict(list)
for p in sql("select id, comunidad_id, tipo from proyectos where comunidad_id is not null"):
    proyectos[p["comunidad_id"]].append(p)

asignar, sin_pista = [], []
for f in fichas:
    partes = f["ruta_dropbox"].split("\\")
    # la subcarpeta es lo que hay entre la carpeta-direccion y el fichero
    sub = " ".join(partes[1:-1]) if len(partes) > 2 else ""
    if f["ruta_dropbox"].startswith("1APROVINCIA"):
        sub = " ".join(partes[3:-1]) if len(partes) > 4 else ""
    quiere = tipos_de(sub)
    candidatos = [p for p in proyectos[f["comunidad_id"]] if p["tipo"] in quiere] if quiere else []
    if len(candidatos) == 1:
        asignar.append((f, candidatos[0], sub))
    else:
        sin_pista.append((f, sub, len(candidatos)))

print(f"Fichas a repartir: {len(fichas)}")
print(f"  resueltas por la subcarpeta : {len(asignar)}  "
      f"({sum(int(f['notas_sin_proyecto']) for f, _, _ in asignar)} notas)")
print(f"  sin pista (se quedan)       : {len(sin_pista)}  "
      f"({sum(int(f['notas_sin_proyecto']) for f, _, _ in sin_pista)} notas)")

print("\n--- SE ASIGNAN ---")
for f, p, sub in asignar:
    print(f"  {f['notas_sin_proyecto']:>3} notas  '{sub or '(raiz)'}'  ->  {p['tipo']}")
print("\n--- SIN PISTA (quedan colgando de la comunidad) ---")
for f, sub, n in sin_pista:
    print(f"  {f['notas_sin_proyecto']:>3} notas  '{sub or '(raiz)'}'  ->  {n} proyectos encajan")

if not APPLY:
    print("\nDRY-RUN. --apply para escribir.")
    sys.exit(0)

sentencias = ["begin;"] + [
    f"update observaciones_expediente set proyecto_id = '{p['id']}' "
    f"where ficha_ref = '{f['ficha_ref']}' and proyecto_id is null;"
    for f, p, _ in asignar] + ["commit;"]
r = subprocess.run(DB[:-1], input="\n".join(sentencias).encode("utf-8"),
                   stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
print(r.stdout.decode("utf-8", "replace").strip()[-400:])
print(f"\nHECHO: {len(asignar)} fichas repartidas.")
