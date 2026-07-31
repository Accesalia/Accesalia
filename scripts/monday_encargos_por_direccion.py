# -*- coding: utf-8 -*-
r"""
Reconstruye la verdad de Monday: cuantas DIRECCIONES hay y que ENCARGOS tiene cada una.

El tablero "0 LISTADO DE DIRECCIONES" (1373889716) no lista comunidades: lista
ENCARGOS. Una misma direccion aparece varias veces, una por actuacion
(`(sate)`, `(ascensor)`, `- DR`, `(cubierta)`...). Y el detalle de portal /
escalera / bloque vive en el NOMBRE del item, no en la columna de ubicacion
geocodificada, que es lo que se importo. De ahi las comunidades duplicadas y las
que perdieron el portal.

Aqui se agrupa por DIRECCION REAL (nombre del item sin el sufijo de actuacion) y
se compara con lo que hay en la BD. No escribe nada.

Produce C:\accesalia-fichas\monday_direcciones_encargos.csv
Uso: python scripts/monday_encargos_por_direccion.py
"""
import os, sys, io, re, csv, json, glob, subprocess, unicodedata
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

RES = os.path.expanduser(r"~\.claude\projects\c--Users-mfavi-ACCESALIA")
SALIDA = r"C:\accesalia-fichas\monday_direcciones_encargos.csv"
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-q", "--csv"]

# Sufijo que marca DE QUE actuacion es el encargo, no de que edificio.
ACTUACION = re.compile(r"\s*[\(\-–]\s*(sate|asc|ascensor|rampa|cubierta|humedades|dr|df|css|"
                       r"df\+css|subv[\w\s]*|consulta|licencia|modif\w*|accesib\w*|"
                       r"reestructuraci[oó]n|bajada|obra|garaje)\b[^)]*\)?\s*$", re.IGNORECASE)

def sin_tildes(s):
    return "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn")

def direccion_de(nombre):
    """Quita el sufijo de actuacion y deja la direccion tal como la escriben."""
    n = re.sub(r"\s+", " ", nombre or "").strip()
    previo = None
    while previo != n:                       # puede haber mas de un sufijo
        previo = n
        n = ACTUACION.sub("", n).strip()
    return n

def clave(nombre):
    return re.sub(r"[^a-z0-9]", "", sin_tildes(direccion_de(nombre)).lower())

def etiqueta_actuacion(nombre):
    m = ACTUACION.search(re.sub(r"\s+", " ", nombre or "").strip())
    return m.group(1).lower() if m else ""

# ---------- items del tablero ----------
items = {}
for f in glob.glob(os.path.join(RES, "*", "tool-results", "*all_api_read*.txt")):
    try:
        d = json.load(open(f, encoding="utf-8"))
    except Exception:
        continue
    if "boards" not in d:
        continue
    for it in d["boards"][0]["items_page"]["items"]:
        cv = {c["id"]: (c["text"] or "") for c in it.get("column_values", [])}
        prev = items.get(it["id"], {})
        items[it["id"]] = {"name": it["name"],
                           "ubic": cv.get("ubicaci_n_1", prev.get("ubic", "")),
                           "loc": cv.get("localidad", prev.get("loc", "")),
                           "estado": cv.get("estado2", prev.get("estado", "")),
                           "fecha": cv.get("fecha", prev.get("fecha", "")),
                           "servicios": cv.get("men__desplegable", prev.get("servicios", "")),
                           "tipo": cv.get("label", prev.get("tipo", ""))}
print(f"Items del tablero: {len(items)}")

# ---------- que hay en la BD por cada item ----------
r = subprocess.run(DB + ["-c", """
select m.monday_item_id, c.id comunidad_id,
       coalesce(nullif(c.direccion,''), c.nombre) comunidad_bd,
       (select count(*) from proyectos p where p.comunidad_id = c.id) proyectos
  from migracion_monday m join comunidades c on c.id = m.registro_id
 where m.tabla_destino = 'comunidades'"""], stdout=subprocess.PIPE)
bd = {x["monday_item_id"]: x for x in csv.DictReader(io.StringIO(r.stdout.decode("utf-8", "replace")))}
print(f"Items que llegaron a la BD como comunidad: {len(bd)}")

# ---------- agrupar por direccion real ----------
grupos = defaultdict(list)
for iid, it in items.items():
    grupos[(clave(it["name"]), sin_tildes(it["loc"]).upper())].append((iid, it))

multi = {k: v for k, v in grupos.items() if len(v) > 1}
print(f"\nDIRECCIONES REALES distintas: {len(grupos)}")
print(f"   con UN solo encargo : {len(grupos) - len(multi)}")
print(f"   con VARIOS encargos : {len(multi)}   (encargos implicados: {sum(len(v) for v in multi.values())})")

filas_bd_sobrantes = 0
for k, v in multi.items():
    n = len({bd[i]["comunidad_id"] for i, _ in v if i in bd})
    filas_bd_sobrantes += max(0, n - 1)
print(f"\nFILAS DE COMUNIDAD SOBRANTES en la BD por este motivo: {filas_bd_sobrantes}")

with open(SALIDA, "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["direccion_segun_monday", "localidad", "n_encargos", "encargos",
                "filas_en_la_bd", "proyectos_en_la_bd", "comunidad_ids"])
    for (kk, loc), v in sorted(multi.items(), key=lambda x: -len(x[1])):
        ids = [bd[i]["comunidad_id"] for i, _ in v if i in bd]
        w.writerow([direccion_de(v[0][1]["name"]), loc, len(v),
                    " || ".join(f"{it['name']} [{it['tipo']}|{it['servicios']}|{it['fecha']}|{it['estado']}]"
                                for _, it in sorted(v, key=lambda x: x[1]["fecha"])),
                    len(set(ids)), sum(int(bd[i]["proyectos"]) for i, _ in v if i in bd),
                    " ".join(sorted(set(ids)))])
print(f"-> {SALIDA}")

print("\n=== LAS 12 DIRECCIONES CON MAS ENCARGOS ===")
for (kk, loc), v in sorted(multi.items(), key=lambda x: -len(x[1]))[:12]:
    ids = {bd[i]["comunidad_id"] for i, _ in v if i in bd}
    print(f"\n  {direccion_de(v[0][1]['name'])}  [{loc}]   {len(v)} encargos, {len(ids)} filas en BD")
    for _, it in sorted(v, key=lambda x: x[1]["fecha"]):
        print(f"      {it['fecha'] or '(sin fecha)':10}  {it['tipo'] or '-':9} "
              f"{(etiqueta_actuacion(it['name']) or 'base'):14} {it['estado']}")
