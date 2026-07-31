# -*- coding: utf-8 -*-
r"""
Migracion de datos de ficha -> BD, partiendo SOLO del trazado 1:1.

Sustituye al casado por ficha de `proyectar_comunidades_fichas.py`. Aqui no se
adivina nada: la unica fuente del vinculo comunidad <-> carpeta es
`trazado_ok.csv`, que sale de cotejar las direcciones de Monday contra las
carpetas reales de Dropbox y donde toda ambiguedad quedo fuera.

Consecuencia: solo las fichas que viven en una carpeta trazada escriben en la
BD. Son las comunidades VIVAS (Monday guarda las que tienen proyecto desde
~mayo-2023) y es un subconjunto controlable. El historico va en otra fase.

--reset borra antes lo que escribieron las pasadas anteriores (que usaban el
casado antiguo, mas flojo): vinculos, catastro, CIF y presidentes. `cp` y
`administracion_id` NO se borran porque ahi conviven valores de Monday con los
nuestros y no se pueden distinguir; en su lugar se informa de los conflictos.

DRY-RUN por defecto. --apply para escribir. --reset para limpiar antes.
Uso: python scripts/migrar_desde_trazado.py [--reset] [--apply]
"""
import os, sys, io, re, csv, subprocess
from collections import defaultdict, Counter
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

APPLY = "--apply" in sys.argv
RESET = "--reset" in sys.argv
TRAZADO = r"C:\accesalia-fichas\trazado_ok.csv"
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "--csv"]

def sql(q):
    r = subprocess.run(DB + ["-c", q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    txt = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(txt); sys.exit(1)
    return list(csv.DictReader(io.StringIO(txt)))

def ejecutar(etiqueta, sentencias):
    if not sentencias:
        return
    r = subprocess.run(DB[:-1], input=("begin;\n" + "\n".join(sentencias) + "\ncommit;").encode("utf-8"),
                       stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    salida = r.stdout.decode("utf-8", "replace").strip()
    print(f"  [{etiqueta}] {len(sentencias)} sentencias  {salida[-400:] if salida else 'ok'}")
    if r.returncode:
        sys.exit(1)

def esc(s):
    return "'" + (s or "").replace("'", "''")[:300] + "'"

def limpio(v, tope=60):
    v = re.sub(r"\s+", " ", (v or "")).strip()
    return v if 0 < len(v) <= tope else ""

RE_MAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
RE_TEL = re.compile(r"(?:\+34[\s.-]?)?[6789]\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}")

def persona(v):
    """La celda del presidente trae telefono y correo pegados al nombre."""
    v = re.sub(r"\s+", " ", v or "").strip()
    m = RE_MAIL.search(v)
    email = m.group(0).lower() if m else ""
    if m:
        v = v.replace(m.group(0), " ")
    t = RE_TEL.search(v)
    tel = re.sub(r"\D", "", t.group(0))[-9:] if t else ""
    if t:
        v = v.replace(t.group(0), " ")
    v = re.sub(r"(?i)\b(tlf|tel|telf|telefono|movil|mail|e-?mail)\b\.?:?", " ", v)
    return re.sub(r"\s+", " ", v).strip(" -–,;:."), tel, email

# ---------- 1. el trazado manda ----------
ARBOL = r"C:\accesalia Dropbox\D SM\Ascensores y rehabilitaciones"
RAIZ = os.path.join(ARBOL, "MADRID")

def ruta_real(r):
    """Una misma carpeta puede escribirse de varias formas (corta del censo,
    completa de una excepcion). Se resuelve a su ruta real en disco para poder
    comparar de verdad, no por el texto."""
    for cand in (os.path.join(ARBOL, r), os.path.join(RAIZ, r),
                 os.path.join(RAIZ, "1APROVINCIA", r)):
        if os.path.isdir(cand):
            return os.path.normcase(os.path.abspath(cand))
    return None

with open(TRAZADO, encoding="utf-8-sig", newline="") as fh:
    trazado = list(csv.DictReader(fh))
por_carpeta = {}
for t in trazado:
    real = ruta_real(t["carpeta_dropbox"])
    if real:
        por_carpeta[real] = t
print(f"Pares comunidad <-> carpeta trazados: {len(trazado)}")
if len(por_carpeta) != len(trazado):
    print(f"  AVISO: {len(trazado) - len(por_carpeta)} rutas no resuelven o apuntan "
          f"a la misma carpeta fisica (deberia ser 1:1)")

# ---------- 2. fichas que caen dentro de una carpeta trazada ----------
fichas = sql(r"""
select f.ficha_ref, f.localidad, f.es_provincia, f.ruta_dropbox,
       case when f.es_provincia then split_part(f.ruta_dropbox,'\',3)
            else split_part(f.ruta_dropbox,'\',1) end carpeta,
       coalesce(f.administracion_id::text,'') administracion_id,
       max(case when c.etiqueta='REF CATASTRAL' then c.valor end) catastral,
       max(case when c.etiqueta='CIF' and c.seccion='comunidad' then c.valor end) cif,
       max(case when c.etiqueta='CODIGO POSTAL' then c.valor end) cp,
       max(case when c.etiqueta='PRESIDENTE' and c.seccion='comunidad' then c.valor end) presidente,
       max(case when c.etiqueta='DNI PRESIDENTE' then c.valor end) dni
  from migracion_ficha f left join migracion_ficha_campo c on c.ficha_id=f.id and c.valor<>''
 group by 1,2,3,4,5,6
""")
# Una ficha pertenece a la carpeta trazada mas PROFUNDA que la contenga: asi
# `cuestablanca2\bloque C` gana sobre `cuestablanca2` y cada bloque se queda con
# la suya.
carpetas_ord = sorted(por_carpeta.items(), key=lambda kv: -len(kv[0]))
dentro, fuera = [], 0
for f in fichas:
    ruta = f["ruta_dropbox"]
    abs_ficha = None
    for base in (ARBOL, RAIZ):
        cand = os.path.normcase(os.path.abspath(os.path.join(base, ruta)))
        if os.path.isfile(cand):
            abs_ficha = cand
            break
    t = None
    if abs_ficha:
        for carpeta, tr in carpetas_ord:
            if abs_ficha.startswith(carpeta + os.sep):
                t = tr
                break
    if t:
        f["comunidad_id"] = t["comunidad_id"]
        dentro.append(f)
    else:
        fuera += 1
print(f"Fichas dentro de carpeta trazada: {len(dentro)}   fuera (historico): {fuera}")
carpetas_con_ficha = {(f["localidad"].upper(), f["carpeta"]) for f in dentro}
print(f"Carpetas trazadas CON ficha: {len(carpetas_con_ficha)} de {len(trazado)} "
      f"({len(trazado) - len(carpetas_con_ficha)} trazadas no tienen ficha dentro)")

# ---------- 3. que aportaria ----------
com = {c["id"]: c for c in sql("""
select id, coalesce(referencia_catastral,'') catastral, coalesce(cif_comunidad,'') cif,
       coalesce(cp,'') cp, coalesce(administracion_id::text,'') administracion_id
  from comunidades""")}

aporte, conflictos = Counter(), []
por_com = defaultdict(list)
for f in dentro:
    por_com[f["comunidad_id"]].append(f)
for cid, fs in por_com.items():
    c = com.get(cid)
    if not c:
        continue
    def primero(campo):
        for f in fs:
            v = limpio(f.get(campo) or "", 40)
            if v:
                return v
        return ""
    if primero("catastral") and not c["catastral"]:
        aporte["referencia_catastral"] += 1
    if primero("cif") and not c["cif"]:
        aporte["cif_comunidad"] += 1
    if primero("cp") and not c["cp"]:
        aporte["cp"] += 1
    aid = next((f["administracion_id"] for f in fs if f["administracion_id"]), "")
    if aid and not c["administracion_id"]:
        aporte["administracion_id"] += 1
    elif aid and c["administracion_id"] and aid != c["administracion_id"]:
        conflictos.append((cid, c["administracion_id"], aid))
    if any(limpio(persona(f.get("presidente") or "")[0]) for f in fs):
        aporte["presidente"] += 1

print("\nAportaria (solo donde la comunidad esta vacia):")
for k, n in aporte.most_common():
    print(f"   {k:22} {n}")
print(f"\nCONFLICTOS de administrador (la BD ya tiene otro): {len(conflictos)}")
if conflictos:
    for cid, viejo, nuevo in conflictos[:5]:
        d = sql(f"""select coalesce(nullif(c.direccion,''),c.nombre) com,
                    (select nombre from administraciones_fincas where id='{viejo}') actual,
                    (select nombre from administraciones_fincas where id='{nuevo}') segun_ficha
                    from comunidades c where c.id='{cid}'""")[0]
        print(f"   {d['com'][:44]:44} BD:{d['actual']}  <->  ficha:{d['segun_ficha']}")

if not APPLY:
    print("\nDRY-RUN. --apply para escribir (con --reset limpia antes lo de las pasadas viejas).")
    sys.exit(0)

# ---------- 4. escritura ----------
if RESET:
    ejecutar("reset", [
        "update migracion_ficha set comunidad_id = null;",
        # catastro y CIF estaban a 0 antes de esta migracion: son 100% nuestros
        "update comunidades set referencia_catastral = null, cif_comunidad = null;",
        "delete from personas_comunidad;",
    ])

vinc, enri, pers = [], [], []
for cid, fs in por_com.items():
    for f in fs:
        vinc.append(f"update migracion_ficha set comunidad_id='{cid}' where ficha_ref={esc(f['ficha_ref'])};")
    def primero(campo, tope=40):
        for f in fs:
            v = limpio(f.get(campo) or "", tope)
            if v:
                return v
        return ""
    cat = primero("catastral", 30).upper().replace(" ", "")
    cif = primero("cif", 15).upper().replace(" ", "")
    cp = primero("cp", 10)
    cp = cp if re.fullmatch(r"\d{5}", cp) else ""
    sets = [f"referencia_catastral = coalesce(nullif(referencia_catastral,''), nullif({esc(cat)},''))",
            f"cif_comunidad = coalesce(nullif(cif_comunidad,''), nullif({esc(cif)},''))",
            f"cp = coalesce(nullif(cp,''), nullif({esc(cp)},''))"]
    aid = next((f["administracion_id"] for f in fs if f["administracion_id"]), "")
    if aid:
        sets.append(f"administracion_id = coalesce(administracion_id, '{aid}')")
    enri.append(f"update comunidades set {', '.join(sets)} where id='{cid}';")
    for f in fs:
        nom, tel, mail = persona(f.get("presidente") or "")
        nom = limpio(nom)
        if not nom:
            continue
        doc = limpio(f.get("dni") or "", 20)
        pers.append("insert into personas_comunidad (comunidad_id, nombre, rol, documento, telefono, email) "
                    f"select '{cid}', {esc(nom)}, 'presidente', nullif({esc(doc)},''), "
                    f"nullif({esc(tel)},''), nullif({esc(mail)},'') "
                    f"where not exists (select 1 from personas_comunidad "
                    f"where comunidad_id='{cid}' and upper(nombre)=upper({esc(nom)}));")

ejecutar("vinculos", vinc)
ejecutar("enriquecimiento", enri)
ejecutar("presidentes", pers)
print("\nHECHO.")

