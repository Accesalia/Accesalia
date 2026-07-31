# -*- coding: utf-8 -*-
r"""
Recupera el TACHADO de las fichas .docx, que la primera extraccion perdio.

En las fichas, cuando una comunidad cambia de administracion, la vieja se deja
escrita y TACHADA, y la nueva se escribe sin tachar. Es la unica marca fiable
para saber cual manda, y estaba en el formato del documento, no en el texto.
Mi parser original solo sacaba texto, asi que se perdio.

No hace falta Dropbox: los .docx estan en la boveda local desde la descarga.

Que escribe:
  migracion_ficha.hay_tachado         la ficha tiene algo tachado
  migracion_ficha_campo.tachado       ese valor concreto esta tachado

Como se decide que un campo esta tachado: se recogen los trozos de texto
tachados de cada ficha y se marca el campo cuyo valor esta contenido en ellos.
No se adivina nada: si el valor no aparece tachado, no se marca.

DRY-RUN por defecto. --apply para escribir.
Uso: python scripts/extraer_tachado_fichas.py [--apply]
"""
import sys, io, os, re, csv, glob, zipfile, subprocess
import xml.etree.ElementTree as ET
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

APPLY = "--apply" in sys.argv
VAULT = r"C:\accesalia-fichas"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"]

def sql(q):
    r = subprocess.run(DB + ["--csv", "-c", q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    t = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(t); sys.exit(1)
    return list(csv.DictReader(io.StringIO(t)))

T = str.maketrans("áéíóúüñÁÉÍÓÚÜÑ", "aeiouunAEIOUUN")
def norm(v):
    return re.sub(r"[^a-z0-9]", "", (v or "").translate(T).lower())

def activo(e):
    # <w:strike w:val="false"/> existe y NO significa tachado
    return e is not None and e.get(W + "val") not in ("false", "0")

def esta_tachado(run):
    pr = run.find(W + "rPr")
    if pr is None:
        return False
    return activo(pr.find(W + "strike")) or activo(pr.find(W + "dstrike"))

def celdas_de(ruta):
    """[(texto completo de la celda, solo lo tachado de esa celda)].

    Por CELDA y no por documento: juntar todos los trozos tachados de una ficha
    y buscar dentro daba falsos positivos graves. "GTA, S.L." se marcaba como
    tachada porque 'gtasl' vive dentro de 'oscar.cuesta@gtasl.com', que si lo
    estaba. Lo tachado ahi era la persona que se fue, no la empresa."""
    with zipfile.ZipFile(ruta) as z:
        raiz = ET.fromstring(z.read("word/document.xml"))
    out = []
    for tc in raiz.iter(W + "tc"):
        entero, tachado = [], []
        for run in tc.iter(W + "r"):
            t = "".join(x.text or "" for x in run.iter(W + "t"))
            if not t:
                continue
            entero.append(t)
            if esta_tachado(run):
                tachado.append(t)
        if entero:
            out.append(("".join(entero), "".join(tachado)))
    return out

fichas = {f["ficha_ref"]: f["id"] for f in sql("select id, ficha_ref from migracion_ficha")}
rutas = sorted(glob.glob(os.path.join(VAULT, "docx", "*.docx")))
print(f"docx en la boveda: {len(rutas)}   fichas en staging: {len(fichas)}")

con_tachado, sin_docx, errores = {}, 0, 0
for i, p in enumerate(rutas):
    ref = os.path.basename(p).rsplit("__", 1)[-1][:-5]
    fid = fichas.get(ref)
    if not fid:
        sin_docx += 1
        continue
    try:
        celdas = celdas_de(p)
    except Exception:
        errores += 1
        continue
    tz = [(norm(ent), norm(tac)) for ent, tac in celdas if tac.strip()]
    if tz:
        con_tachado[fid] = tz
    if (i + 1) % 500 == 0:
        print(f"   {i+1}/{len(rutas)}  con tachado: {len(con_tachado)}")

print(f"\nfichas con algo tachado : {len(con_tachado)}")
print(f"  docx sin ficha en staging : {sin_docx}   ilegibles: {errores}")

# ---------- que campos quedan marcados ----------
campos = sql("""
select c.id, c.ficha_id, c.seccion, c.etiqueta, c.valor
  from migracion_ficha_campo c
 where c.valor <> '' and c.ficha_id in (%s)""" %
    ",".join("'%s'" % k for k in con_tachado) if con_tachado else
    "select id, ficha_id, seccion, etiqueta, valor from migracion_ficha_campo where false")

marcar, por_seccion = [], defaultdict(int)
for c in campos:
    v = norm(c["valor"])
    if len(v) < 4:
        continue
    # Regla dura, a proposito: o lo tachado de la celda ES exactamente este
    # valor, o la celda entera esta tachada y el valor vive dentro. Con un
    # simple "esta dentro de lo tachado" se colaba "GTA, S.L." por aparecer
    # dentro de oscar.cuesta@gtasl.com, que era lo tachado de OTRA celda.
    # Prefiero no marcar de mas: un tachado inventado cambia de administracion
    # a una comunidad que no ha cambiado.
    for entero, tachado in con_tachado.get(c["ficha_id"], []):
        if v == tachado or (entero == tachado and v in entero):
            marcar.append(c["id"])
            por_seccion[(c["seccion"], c["etiqueta"])] += 1
            break

print(f"\ncampos que quedarian marcados como tachados: {len(marcar)}")
print("\n  por bloque y etiqueta (top):")
for (s, e), n in sorted(por_seccion.items(), key=lambda x: -x[1])[:14]:
    print(f"     {s:14} {e[:26]:26} {n}")

# lo que de verdad importa: administraciones y personas descartadas
if con_tachado:
    ej = sql("""
    select f.ficha_ref, c.etiqueta, c.valor,
           coalesce(nullif(co.direccion,''), co.nombre) comunidad
      from migracion_ficha_campo c
      join migracion_ficha f on f.id = c.ficha_id
      left join comunidades co on co.id = f.comunidad_id
     where c.id in (%s) and c.seccion='administrador'
       and c.etiqueta in ('NOMBRE','PERSONA DE CONTACTO')
     order by 4 limit 12""" % ",".join("'%s'" % m for m in marcar[:4000]) if marcar else
     "select null::text ficha_ref, null::text etiqueta, null::text valor, null::text comunidad where false")
    print("\n  ejemplos de administrador/persona TACHADOS (los que hay que descartar):")
    for x in ej:
        print(f"     {(x['comunidad'] or '')[:38]:38} {x['etiqueta'][:20]:20} {x['valor'][:40]}")

if not APPLY:
    print("\nDRY-RUN. --apply para escribir.")
    sys.exit(0)

stmt = ("alter table migracion_ficha add column if not exists hay_tachado boolean not null default false;\n"
        "alter table migracion_ficha_campo add column if not exists tachado boolean not null default false;\n"
        "update migracion_ficha set hay_tachado = false;\n"
        "update migracion_ficha_campo set tachado = false;\n")
if con_tachado:
    stmt += ("update migracion_ficha set hay_tachado = true where id in (%s);\n"
             % ",".join("'%s'" % k for k in con_tachado))
for i in range(0, len(marcar), 2000):
    stmt += ("update migracion_ficha_campo set tachado = true where id in (%s);\n"
             % ",".join("'%s'" % m for m in marcar[i:i + 2000]))
r = subprocess.run(DB, input=("begin;\n" + stmt + "commit;").encode("utf-8"),
                   stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
if r.returncode:
    print(r.stdout.decode("utf-8", "replace")); sys.exit(1)
print(f"\nHECHO: {len(con_tachado)} fichas y {len(marcar)} campos marcados.")
