# -*- coding: utf-8 -*-
"""
CAPA 1 de la migracion de fichas: boveda local -> staging en Supabase.

Lee los JSON de C:\accesalia-fichas (los produjo descargar_fichas_dropbox.py) y
vuelca a migracion_ficha + migracion_ficha_campo el contenido CRUDO de cada
ficha, con la SECCION en que aparece cada par etiqueta->valor.

Por que la seccion importa: NOMBRE / DIRECCION / TELEFONO / E-MAIL / PERSONA DE
CONTACTO se repiten en el bloque del administrador, en el de la comunidad y en
el del ayuntamiento. Sin seccion se mezclan.

Idempotente: TRUNCATE + carga completa (es staging, no hay nada que preservar).
OJO: eso borra comunidad_id/administracion_id/revisado si la capa 2 ya escribio.

DRY-RUN por defecto. --apply para escribir.
Uso: python scripts/cargar_fichas_staging.py [--apply]
"""
import os, sys, io, re, csv, json, glob, subprocess
from collections import Counter
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

APPLY = "--apply" in sys.argv
VAULT = r"C:\accesalia-fichas"
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA",
      "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"]

SECCIONES = [  # (prefijo de la cabecera literal, seccion normalizada)
    ("DATOS ADMINISTRADOR DE FINCAS", "administrador"),
    ("DATOS COMUNIDAD", "comunidad"),
    ("DATOS AYUNTAMIENTO", "ayuntamiento"),
    ("DATOS DEL PROYECTO", "proyecto"),
    ("DATOS ENCARGO", "encargo"),
    ("DATOS CONTRATA", "contrata"),
    ("DATOS SUBVENCIONES", "subvenciones"),
    ("NOTAS", "notas"),
]

def norm(s):
    return re.sub(r"\s+", " ", s).strip()

def normalizar_seccion(raw):
    u = raw.upper()
    for pref, sec in SECCIONES:
        if u.startswith(pref):
            return sec
    return "otros"

def es_cabecera_seccion(nov):
    """Fila de una sola celda que abre un bloque."""
    if len(nov) != 1:
        return False
    u = nov[0].upper()
    return u.startswith("DATOS") or u.rstrip(":") in ("NOTAS", "OTROS")

def variante_de(nombre):
    u = nombre.upper()
    if "ACCESALIA" in u:
        return "accesalia"
    if "TECNICOS" in u:
        return "datos_tecnicos"
    if u.startswith("FICHA DATOS") or u.startswith("FICHA DE DATOS"):
        return "datos"
    return "otra"

def localidad_de(rel):
    partes = rel.split(os.sep)
    if partes and partes[0].upper() == "1APROVINCIA" and len(partes) > 1:
        return partes[1], True
    return "MADRID", False

def partir_dos_puntos(c):
    """La plantilla 'accesalia' mete etiqueta y valor en la MISMA celda:
    'TIPO DE OBRA:FACHADA'."""
    if ":" in c:
        et, val = c.split(":", 1)
        if et.strip() and val.strip():
            return et.strip(), val.strip()
    return None

def extraer(d):
    """[(orden, seccion, seccion_raw, etiqueta, valor)] + titulo de la ficha."""
    campos, titulo = [], None
    sec_raw, sec = "CABECERA", "cabecera"
    for idx, fila in enumerate(d["filas"]):
        celdas = [norm(c) for c in fila]
        nov = [c for c in celdas if c]
        if not nov:
            continue
        if es_cabecera_seccion(nov):
            sec_raw = nov[0].rstrip(":")
            sec = normalizar_seccion(sec_raw)
            continue
        # Plantillas anchas: la fila 0 es [DIRECCION][etiqueta][valor][etiqueta][valor].
        # El titulo va PEGADO al primer par; si no se separa, todo el par sale corrido.
        if idx == 0 and len(celdas) >= 3:
            titulo = celdas[0]                  # vacio = plantilla en blanco, no se inventa
            celdas = celdas[1:]
            nov = [c for c in celdas if c]
            if not nov:
                continue
        if sec == "notas":                      # texto libre: no hay etiquetas
            for c in nov:
                campos.append((sec, sec_raw, "TEXTO", c))
            continue
        if len(nov) == 1 and len(celdas) == 1:  # celda suelta
            par = partir_dos_puntos(nov[0])
            campos.append((sec, sec_raw) + (par if par else (nov[0].upper(), "")))
            continue
        # Los '' separan pares dentro de una misma fila:
        # ['EMPRESA/CLIENTE','FAIN','','PERSONA DE CONTACTO','OSCAR FERNANDEZ']
        segs, act = [], []
        for c in celdas:
            if c:
                act.append(c)
            elif act:
                segs.append(act); act = []
        if act:
            segs.append(act)
        for s in segs:
            if len(s) == 1:
                par = partir_dos_puntos(s[0])
                campos.append((sec, sec_raw) + (par if par else (s[0].upper(), "")))
                continue
            for i in range(0, len(s) - 1, 2):
                campos.append((sec, sec_raw, s[i].upper(), s[i + 1]))
            if len(s) % 2:
                campos.append((sec, sec_raw, s[-1].upper(), ""))
    # 'DIRECCION:' y 'DIRECCION' son la misma etiqueta en plantillas distintas
    campos = [(sec, raw, et.rstrip(":").strip().upper(), val) for sec, raw, et, val in campos]
    return [(i, *c) for i, c in enumerate(campos)], titulo

def copiar(tabla, columnas, filas):
    buf = io.StringIO()
    # QUOTE_ALL: en COPY CSV un campo vacio SIN comillas es NULL, y hay columnas
    # not null (texto, valor) que legitimamente vienen vacias.
    w = csv.writer(buf, lineterminator="\n", quoting=csv.QUOTE_ALL)
    for f in filas:
        w.writerow(f)
    cmd = DB + ["-c", f"\\copy {tabla}({','.join(columnas)}) from stdin with (format csv)"]
    r = subprocess.run(cmd, input=buf.getvalue().encode("utf-8"),
                       stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if r.returncode:
        print(r.stdout.decode("utf-8", "replace")); sys.exit(1)
    print(f"  {tabla}: {len(filas)} filas")

# ---------- lectura de la boveda ----------
rutas = sorted(glob.glob(os.path.join(VAULT, "json", "*.json")))
print(f"Fichas en la boveda: {len(rutas)}")

fichas, campos = [], []
stats, sin_campos = Counter(), []
for p in rutas:
    with open(p, encoding="utf-8") as fh:
        d = json.load(fh)
    cs, titulo = extraer(d)
    # Las fichas de fuera del arbol MADRID (otras regiones, urbanizaciones,
    # bloques) traen su localidad ya resuelta en el JSON: la ruta no permite
    # deducirla porque no sigue la estructura habitual.
    if d.get("localidad"):
        loc, prov = d["localidad"], not d["ruta_dropbox"].upper().startswith("MADRID\\FICHA")
    else:
        loc, prov = localidad_de(d["ruta_dropbox"])
    fichas.append((d["id"], d["ruta_dropbox"], d["nombre_fichero"], d["carpeta"],
                   titulo or "", variante_de(d["nombre_fichero"]), loc, prov,
                   d["sha256"], d["bytes"], d["modificado"], len(cs), d["texto"]))
    for orden, sec, sec_raw, et, val in cs:
        campos.append((d["id"], orden, sec, sec_raw, et[:120], val))
        stats[sec] += 1
    if not cs:
        sin_campos.append(d["nombre_fichero"])

print(f"Pares etiqueta->valor: {len(campos)}")
print(f"Fichas sin ningun campo: {len(sin_campos)}")
print("\nPares por seccion:")
for sec, n in stats.most_common():
    print(f"  {sec:14} {n:7}")
print("\nVariantes:", dict(Counter(f[5] for f in fichas)))
print("Con titulo:", sum(1 for f in fichas if f[4]), "/", len(fichas))

if not APPLY:
    print("\nDRY-RUN. Relanza con --apply para escribir en la BD.")
    sys.exit(0)

# ---------- carga ----------
print("\nCargando...")
subprocess.run(DB + ["-c", "truncate migracion_ficha cascade;"], check=True)

copiar("migracion_ficha",
       ["ficha_ref", "ruta_dropbox", "nombre_fichero", "carpeta", "titulo",
        "variante", "localidad", "es_provincia", "sha256", "bytes",
        "modificado_en", "n_campos", "texto"], fichas)

# ficha_ref -> id via tabla temporal, para resolver la FK de los 110k campos de
# una vez en vez de una ida y vuelta por fila
buf = io.StringIO()
w = csv.writer(buf, lineterminator="\n", quoting=csv.QUOTE_ALL)
for f in campos:
    w.writerow(f)
sql = ("create temp table _cam (ficha_ref text, orden int, seccion text, "
       "seccion_raw text, etiqueta text, valor text);\n"
       "\\copy _cam from stdin with (format csv)\n"
       + buf.getvalue() + "\\.\n"           # sin el terminador, \copy se traga el SQL de abajo
       "insert into migracion_ficha_campo (ficha_id, orden, seccion, seccion_raw, etiqueta, valor)\n"
       "select f.id, c.orden, c.seccion, c.seccion_raw, c.etiqueta, c.valor\n"
       "from _cam c join migracion_ficha f on f.ficha_ref = c.ficha_ref;\n")
r = subprocess.run(DB, input=sql.encode("utf-8"),
                   stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
print(r.stdout.decode("utf-8", "replace").strip())
if r.returncode:
    sys.exit(1)
print(f"  migracion_ficha_campo: {len(campos)} filas")
print("\nHECHO.")
