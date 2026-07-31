# -*- coding: utf-8 -*-
r"""
Arregla el fallo de importacion de Monday, sin dejar deuda.

Dos problemas, los dos con el mismo origen: la importacion se trajo la columna
geocodificada `ubicaci_n_1` en vez del NOMBRE del item del tablero
"0 LISTADO DE DIRECCIONES" (1373889716).

  (1) PORTAL PERDIDO: el nombre dice 'SANTA CRUZ DE MARCENADO 1 ESC C' y la
      columna solo 'Calle de Santa Cruz de Marcenado, 1' -> tres edificios
      distintos quedaron con la direccion identica. Se restaura el detalle
      (portal / escalera / bloque / fase) dentro de `direccion`, con el mismo
      formato que ya usan las filas que si lo conservaron
      ('Calle de Móstoles, 3, portal 2, Fuenlabrada, España').

  (2) FILAS SOBRANTES: el tablero lista ENCARGOS, no comunidades. Una direccion
      con dos encargos ('ISTURIZ 11' + 'ISTURIZ 11 - SATE') genero dos filas de
      comunidad. Se fusionan en una: la fila superviviente se queda con todo lo
      que colgaba de la otra (13 tablas apuntan a comunidades) y la sobrante se
      borra. Los dos items de Monday pasan a apuntar a la misma comunidad, que
      es lo correcto: una comunidad con varios encargos.

DRY-RUN por defecto. --apply para escribir.
Uso: python scripts/arreglar_import_monday.py [--apply]
"""
import os, sys, io, re, csv, json, glob, subprocess, unicodedata
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

APPLY = "--apply" in sys.argv
RES = os.path.expanduser(r"~\.claude\projects\c--Users-mfavi-ACCESALIA")
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "--csv"]

# Las 13 tablas que apuntan a comunidades. Al fusionar hay que moverlas TODAS.
REFERENCIAS = ["beneficiarios_reparto_caes", "condicionantes_comunidad",
               "destinatarios_informe", "documentos", "expedientes", "hojas_encargo",
               "interaccion_comunidad", "migracion_ficha", "operaciones_caes",
               "oportunidades", "personas_comunidad", "proyectos", "resumenes_ia"]

DETALLE = re.compile(r"(?i)\b(portal|escalera|esc|bloque|blq|fase)\s*\.?\s*"
                     r"([a-z0-9]+(?:\s*-\s*[a-z0-9]+)?)\b")
SUFIJO = re.compile(r"(?i)\s*[\(\-–]\s*(sate|asc|ascensor|rampa|cubierta|humedades|dr|df|css|"
                    r"subv[\w\s]*|consulta|licencia|modif\w*|accesib\w*|reestructuraci[oó]n|"
                    r"bajada|obra|garaje)\b[^)]*\)?\s*$")

def sql(q):
    r = subprocess.run(DB + ["-c", q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    txt = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(txt); sys.exit(1)
    return list(csv.DictReader(io.StringIO(txt)))

def esc(s):
    return "'" + (s or "").replace("'", "''") + "'"

def sin_tildes(s):
    return "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn")

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
        p = items.get(it["id"], {})
        items[it["id"]] = {"name": it["name"], "ubic": cv.get("ubicaci_n_1", p.get("ubic", ""))}
if len(items) < 600:
    print(f"Solo tengo {len(items)} items del tablero; hacen falta los 679. Abortado.")
    sys.exit(1)
print(f"Items del tablero: {len(items)}")

bd = {x["monday_item_id"]: x for x in sql("""
select m.monday_item_id, c.id, coalesce(nullif(c.direccion,''),c.nombre) dir
  from migracion_monday m join comunidades c on c.id = m.registro_id
 where m.tabla_destino = 'comunidades'""")}

# ---------- (1) restaurar el portal ----------
def detalle_de(nombre):
    """TODO el detalle, no solo el primero: 'FASE 1 BLOQUE CH' -> 'fase 1, bloque CH'."""
    vistos, out = set(), []
    for m in DETALLE.finditer(nombre):
        t = f"{m.group(1).lower()} {m.group(2).upper()}"
        if t not in vistos:
            vistos.add(t); out.append(t)
    return ", ".join(out)

arreglos = []
for iid, it in sorted(items.items(), key=lambda x: x[1]["name"]):
    det = detalle_de(it["name"])
    if not det or DETALLE.search(it["ubic"]) or iid not in bd:
        continue
    b = bd[iid]
    trozos = [t.strip() for t in b["dir"].split(",")]
    nueva = (", ".join([trozos[0], trozos[1], det] + trozos[2:]) if len(trozos) > 2
             else f"{b['dir']}, {det}")
    if nueva != b["dir"]:
        arreglos.append((b["id"], it["name"], b["dir"], nueva))

print(f"\n=== (1) DIRECCIONES A LAS QUE SE LES DEVUELVE EL PORTAL: {len(arreglos)} ===")
for cid, nom, vieja, nueva in arreglos:
    print(f"  {nom[:44]:44}\n      {nueva}")

# ---------- (2) fusionar filas sobrantes ----------
def clave(nombre):
    n = SUFIJO.sub("", re.sub(r"\s+", " ", nombre).strip())
    return re.sub(r"[^a-z0-9]", "", sin_tildes(n).lower())

por_clave = defaultdict(set)
for iid, b in bd.items():
    if iid in items:
        por_clave[clave(items[iid]["name"])].add(b["id"])
fusiones = []
for k, ids in por_clave.items():
    if len(ids) < 2:
        continue
    # sobrevive la que mas cosas tiene colgando; a igualdad, la mas antigua
    peso = {cid: sum(int(sql(f"select count(*) n from {t} where comunidad_id={esc(cid)}")[0]["n"])
                     for t in REFERENCIAS) for cid in ids}
    orden = sorted(ids, key=lambda c: (-peso[c], c))
    fusiones.append((orden[0], orden[1:], k, peso))

print(f"\n=== (2) FILAS DE COMUNIDAD A FUSIONAR: {sum(len(x[1]) for x in fusiones)} "
      f"(en {len(fusiones)} direcciones) ===")
for sobrevive, absorbidas, k, peso in fusiones:
    d = next(b["dir"] for b in bd.values() if b["id"] == sobrevive)
    print(f"  {d}")
    print(f"      SE QUEDA  {sobrevive}  ({peso[sobrevive]} registros colgando)")
    for a in absorbidas:
        print(f"      se funde  {a}  ({peso[a]} registros, se mueven)")

if not APPLY:
    print("\nDRY-RUN. --apply para escribir.")
    sys.exit(0)

sentencias = ["begin;"]
for cid, nom, vieja, nueva in arreglos:
    sentencias.append(f"update comunidades set direccion = {esc(nueva)} where id = {esc(cid)};")
for sobrevive, absorbidas, k, peso in fusiones:
    for a in absorbidas:
        for t in REFERENCIAS:
            sentencias.append(f"update {t} set comunidad_id = {esc(sobrevive)} "
                              f"where comunidad_id = {esc(a)};")
        # los dos items de Monday pasan a la misma comunidad: 1 comunidad, N encargos
        sentencias.append(f"update migracion_monday set registro_id = {esc(sobrevive)} "
                          f"where tabla_destino='comunidades' and registro_id = {esc(a)};")
        sentencias.append(f"delete from comunidades where id = {esc(a)};")
sentencias.append("commit;")

r = subprocess.run(DB[:-1], input="\n".join(sentencias).encode("utf-8"),
                   stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
print(r.stdout.decode("utf-8", "replace").strip()[-800:])
if r.returncode:
    sys.exit(1)
print(f"\nHECHO: {len(arreglos)} direcciones corregidas, "
      f"{sum(len(x[1]) for x in fusiones)} filas fusionadas.")
