# -*- coding: utf-8 -*-
"""
CAPA 2 / proyeccion 2: casar cada ficha con su comunidad y ENRIQUECERLA.

NO da de alta comunidades. La lista de comunidades ya existe (1.255, migradas de
Monday) y las carpetas de Dropbox son casi el doble (2.429): las que sobran son
contactos comerciales que nunca cuajaron en encargo. Crearlas seria inventar
cartera. Lo que la ficha aporta y la BD no tiene es el DATO:

    comunidades hoy: 0 referencias catastrales, 0 CIF
    las fichas traen: 698 catastros, 736 CIF, 711 presidentes

CASADO por via + numero + municipio:
  - la carpeta-direccion de primer nivel sigue la convencion 'josearconesgil100'
  - la comunidad trae la direccion geocodificada ('Calle de Amaniel, 34, Madrid')
    o, en 607 filas, la direccion metida en el NOMBRE ('ENTREARROYOS 56 MADRID')
  - los numeros se comparan como CONJUNTO: 'sanfidel97-99' casa con el 97
Una carpeta que casa con VARIAS comunidades no se escribe: va a revision.

Nunca pisa dato existente: solo rellena huecos.

DRY-RUN por defecto. --apply para escribir.
Uso: python scripts/proyectar_comunidades_fichas.py [--apply]
"""
import os, sys, io, re, csv, unicodedata, subprocess
from collections import defaultdict, Counter
from difflib import get_close_matches
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

APPLY = "--apply" in sys.argv
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "--csv"]
REV_AMBIGUAS = r"C:\accesalia-fichas\comunidades_ambiguas.csv"
REV_SIN_CASAR = r"C:\accesalia-fichas\carpetas_sin_comunidad.csv"

TIPO_VIA = re.compile(r"^(calle|c|avenida|avda|avd|av|plaza|pza|pl|paseo|po|pso|camino|"
                      r"carretera|ctra|ronda|travesia|trav|glorieta|gta|bulevar|via)\b")
ARTICULOS = re.compile(r"\b(de|del|la|el|los|las|y)\b")

def sin_tildes(s):
    return "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn")

def normaliza_via(texto):
    """'Calle de Amaniel' / 'entrearroyos' -> 'amaniel' / 'entrearroyos'."""
    s = sin_tildes(texto).lower()
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    s = TIPO_VIA.sub(" ", s)
    s = ARTICULOS.sub(" ", s)
    return re.sub(r"[^a-z0-9]", "", s)

def numeros(texto):
    """'97-99' -> {97,99}. Descarta codigos postales y anios."""
    return {int(n) for n in re.findall(r"\d{1,3}", texto or "") if 0 < int(n) < 1000}

def letras_portal(texto):
    """'24 B' / '22C' / '36B' -> {'24b','22c','36b'}. La LETRA del portal
    distingue comunidades: Marques de Corbera 36B y 36C son dos edificios
    distintos, con carpeta propia cada uno."""
    return {m.group(1) + m.group(2).lower()
            for m in re.finditer(r"\b(\d{1,3})\s?([A-Za-z])\b", texto or "")}

def parte_via(texto):
    """Corta el texto en la parte de via (antes del primer numero)."""
    return re.split(r"\d", texto or "", maxsplit=1)[0]

# La carpeta va SIN espacios ('avbetanzos', 'virgendelafuencisla'), asi que los
# regex con \b no llegan: hay que quitar tipo de via y articulos tambien pegados.
# Se generan como claves ALTERNATIVAS, nunca sustituyendo a la original: si no,
# 'avila' se convertiria en 'ila'.
# Se prueban TODOS los prefijos, no el primero que encaje: en 'avdelamancha' la
# alternativa 'avd' se come la 'd' de 'de' y deja 'elamancha' en vez de 'mancha'.
PREFIJOS = ["avenida", "avda", "avd", "av", "plaza", "pza", "paseo", "pso", "po",
            "carretera", "ctra", "glorieta", "gta", "travesia", "trav", "tr",
            "calle", "cl", "camino", "ronda"]
ART_PEGADO = re.compile(r"(de|del|la|los|las)")

def claves(via):
    ks = {via}
    for p in PREFIJOS:
        if via.startswith(p) and len(via) - len(p) >= 5:
            ks.add(via[len(p):])
    for k in list(ks):
        sin_art = ART_PEGADO.sub("", k)
        if len(sin_art) >= 5:
            ks.add(sin_art)
    return {k for k in ks if len(k) > 4}

def sql(q):
    r = subprocess.run(DB + ["-c", q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    txt = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(txt); sys.exit(1)
    return list(csv.DictReader(io.StringIO(txt)))

def esc(s):
    return "'" + (s or "").replace("'", "''")[:300] + "'"

# ---------- 1. lado COMUNIDAD ----------
comunidades = sql("""
select id, coalesce(nombre,'') nombre, coalesce(direccion,'') direccion,
       coalesce(municipio,'') municipio, coalesce(cp,'') cp,
       coalesce(referencia_catastral,'') catastral, coalesce(cif_comunidad,'') cif,
       coalesce(administracion_id::text,'') administracion_id
  from comunidades
""")
idx = defaultdict(list)
for c in comunidades:
    if c["direccion"]:
        via_txt, num_txt = c["direccion"].split(",")[0], " ".join(c["direccion"].split(",")[1:2])
    else:                       # 607 filas llevan la direccion dentro del nombre
        via_txt, num_txt = parte_via(c["nombre"]), c["nombre"]
    c["via"], c["nums"] = normaliza_via(via_txt), numeros(num_txt)
    c["letras"] = letras_portal(c["direccion"] or c["nombre"])
    c["mun"] = normaliza_via(c["municipio"])
    c["claves"] = claves(c["via"])
    for k in c["claves"]:
        idx[k].append(c)

print(f"Comunidades: {len(comunidades)}  (indexables por via: {sum(len(v) for v in idx.values())})")

# ---------- 2. lado FICHA ----------
fichas = sql("""
select f.ficha_ref, f.ruta_dropbox, f.localidad, f.es_provincia, coalesce(f.titulo,'') titulo,
       coalesce(f.administracion_id::text,'') administracion_id,
       max(case when c.etiqueta='REF CATASTRAL' then c.valor end) catastral,
       max(case when c.etiqueta='CIF' and c.seccion='comunidad' then c.valor end) cif,
       max(case when c.etiqueta='CODIGO POSTAL' then c.valor end) cp,
       max(case when c.etiqueta='PRESIDENTE' and c.seccion='comunidad' then c.valor end) presidente,
       max(case when c.etiqueta='DNI PRESIDENTE' then c.valor end) dni
  from migracion_ficha f left join migracion_ficha_campo c on c.ficha_id=f.id and c.valor<>''
 group by 1,2,3,4,5,6
""")
for f in fichas:
    partes = f["ruta_dropbox"].split("\\")
    f["dir_folder"] = partes[2] if f["es_provincia"] == "t" and len(partes) > 2 else partes[0]
    f["via"] = normaliza_via(parte_via(f["dir_folder"]))
    f["claves"] = claves(f["via"])
    f["nums"] = numeros(f["dir_folder"])
    f["letras"] = letras_portal(f["dir_folder"])
    f["mun"] = normaliza_via(f["localidad"])

# ---------- 3. casar ----------
VIAS_BD = list(idx)

def compatible(f, c):
    if f["nums"] and c["nums"] and not (f["nums"] & c["nums"]):
        return False
    if f["letras"] and c["letras"] and not (f["letras"] & c["letras"]):
        return False
    if f["mun"] and c["mun"] and f["mun"] != c["mun"]:
        return False
    return True

def candidatos(f):
    vistos, out = set(), []
    for k in f["claves"]:
        for c in idx.get(k, []):
            if c["id"] not in vistos and compatible(f, c):
                vistos.add(c["id"]); out.append(c)
    if out:
        return out, "exacta"
    # Fallback por PARECIDO de via. Solo es seguro porque ademas se exige que
    # coincidan numero de portal y municipio: 'zamora12' nunca casara con
    # 'zamora25' por muy parecidas que sean las cadenas.
    if not f["nums"] or not f["mun"]:
        return [], None
    for k in f["claves"]:
        for cerca in get_close_matches(k, VIAS_BD, n=3, cutoff=0.86):
            for c in idx.get(cerca, []):
                if c["id"] not in vistos and compatible(f, c):
                    vistos.add(c["id"]); out.append(c)
    return out, ("aproximada" if out else None)

unicas, ambiguas, sin_casar = [], [], []
via_de_match = Counter()
for f in fichas:
    if not f["claves"]:
        sin_casar.append((f, [])); continue
    cs, modo = candidatos(f)
    ids = {c["id"] for c in cs}          # varias filas de la MISMA comunidad no son ambiguedad
    if len(ids) == 1:
        unicas.append((f, cs[0])); via_de_match[modo] += 1
    elif len(ids) > 1:
        ambiguas.append((f, cs))
    else:
        sin_casar.append((f, []))

carp = lambda lst: len({f["dir_folder"] for f, _ in lst})
print(f"\nFichas: {len(fichas)}   carpetas-direccion distintas: {len({f['dir_folder'] for f in fichas})}")
print(f"  casan con UNA comunidad : {len(unicas):5}  fichas  ({carp(unicas)} carpetas)")
print(f"  ambiguas (>1 comunidad) : {len(ambiguas):5}  fichas  ({carp(ambiguas)} carpetas) -> a revision")
print(f"  sin comunidad en la BD  : {len(sin_casar):5}  fichas  ({carp(sin_casar)} carpetas) -> no se crean")
print(f"     de los cuales por via exacta {via_de_match['exacta']}, "
      f"por via aproximada {via_de_match['aproximada']} (siempre con portal y municipio iguales)")
print(f"\nComunidades distintas alcanzadas: {len({c['id'] for _, c in unicas})} de {len(comunidades)}")

# ---------- 4. que aportaria el enriquecimiento ----------
ap = Counter()
for f, c in unicas:
    if (f["catastral"] or "").strip() and not c["catastral"]:
        ap["referencia_catastral"] += 1
    if (f["cif"] or "").strip() and not c["cif"]:
        ap["cif_comunidad"] += 1
    if (f["cp"] or "").strip() and not c["cp"]:
        ap["cp"] += 1
    if f["administracion_id"] and not c["administracion_id"]:
        ap["administracion_id"] += 1
    if (f["presidente"] or "").strip():
        ap["presidente"] += 1
print("\nDatos que se aportarian (solo donde la comunidad esta VACIA):")
for k, n in ap.most_common():
    print(f"   {k:22} {n}")

def rotulo(c):
    base = c["direccion"] or c["nombre"]
    return f"{base} [{c['municipio']}]" if c["municipio"] and c["municipio"] not in base.upper() else base

# Las ambiguas llevan TODO lo que la ficha sabe del edificio: sin el CIF, el
# catastro y la direccion tal como la escribieron, no hay forma de decidir cual
# de las candidatas es la buena sin abrir el .docx.
vistas, out = set(), []
for f, cs in ambiguas:
    # La clave es localidad+carpeta: hay nombres repetidos en localidades
    # distintas ('IGLESIA4' existe en tres), y dedupar solo por nombre
    # esconderia carpetas en los ficheros de revision.
    if (f["localidad"], f["dir_folder"]) in vistas:
        continue
    vistas.add((f["localidad"], f["dir_folder"]))
    out.append([f["dir_folder"], f["localidad"], f["titulo"],
                (f["cif"] or "").strip(), (f["catastral"] or "").strip(),
                (f["presidente"] or "").strip()[:40],
                " | ".join(sorted({rotulo(c) for c in cs})), ""])
with open(REV_AMBIGUAS, "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["carpeta", "localidad", "direccion_en_la_ficha", "cif_ficha",
                "catastro_ficha", "presidente_ficha", "candidatas", "cual_es"])
    w.writerows(sorted(out))
print(f"   -> {REV_AMBIGUAS}  ({len(out)} carpetas)")

vistas, out = set(), []
for f, _ in sin_casar:
    # La clave es localidad+carpeta: hay nombres repetidos en localidades
    # distintas ('IGLESIA4' existe en tres), y dedupar solo por nombre
    # esconderia carpetas en los ficheros de revision.
    if (f["localidad"], f["dir_folder"]) in vistas:
        continue
    vistas.add((f["localidad"], f["dir_folder"]))
    out.append([f["dir_folder"], f["localidad"], f["titulo"], (f["cif"] or "").strip()])
with open(REV_SIN_CASAR, "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["carpeta", "localidad", "direccion_en_la_ficha", "cif_ficha"])
    w.writerows(sorted(out))
print(f"   -> {REV_SIN_CASAR}  ({len(out)} carpetas)")

if not APPLY:
    print("\nDRY-RUN. Relanza con --apply para escribir.")
    sys.exit(0)

# ---------- 5. escritura ----------
def limpio(v, tope=60):
    v = re.sub(r"\s+", " ", (v or "")).strip()
    return v if 0 < len(v) <= tope else ""

RE_MAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
RE_TEL = re.compile(r"(?:\+34[\s.-]?)?[6789]\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}")

def persona(v):
    """'JUAN VICENTE JUANES DELGADO 609132969' -> nombre, telefono, email.
    La celda del presidente trae el contacto pegado y la tabla tiene columnas
    para el: dejarlo dentro del nombre seria tirar dato utilizable."""
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
    v = re.sub(r"\s+", " ", v).strip(" -–,;:.")
    return v, tel, email

vinc, enri, pers = [], [], []
hecho_com = set()
for f, c in unicas:
    vinc.append(f"update migracion_ficha set comunidad_id='{c['id']}' "
                f"where ficha_ref={esc(f['ficha_ref'])};")
    if c["id"] not in hecho_com:
        hecho_com.add(c["id"])
        cat = limpio(f["catastral"], 30).upper().replace(" ", "")
        cif = limpio(f["cif"], 15).upper().replace(" ", "")
        cp = limpio(f["cp"], 10)
        cp = cp if re.fullmatch(r"\d{5}", cp) else ""
        sets = [f"referencia_catastral = coalesce(nullif(referencia_catastral,''), nullif({esc(cat)},''))",
                f"cif_comunidad = coalesce(nullif(cif_comunidad,''), nullif({esc(cif)},''))",
                f"cp = coalesce(nullif(cp,''), nullif({esc(cp)},''))"]
        if f["administracion_id"]:
            sets.append(f"administracion_id = coalesce(administracion_id, '{f['administracion_id']}')")
        enri.append(f"update comunidades set {', '.join(sets)} where id='{c['id']}';")
    nom, tel, mail = persona(f["presidente"])
    nom = limpio(nom)
    if nom:
        doc = limpio(f["dni"], 20)
        pers.append("insert into personas_comunidad (comunidad_id, nombre, rol, documento, telefono, email) "
                    f"select '{c['id']}', {esc(nom)}, 'presidente', nullif({esc(doc)},''), "
                    f"nullif({esc(tel)},''), nullif({esc(mail)},'') "
                    f"where not exists (select 1 from personas_comunidad "
                    f"where comunidad_id='{c['id']}' and upper(nombre)=upper({esc(nom)}));")

# El vinculo se RECALCULA entero: si no, un acierto de una pasada antigua (con
# peor normalizacion) se queda pegado aunque ya no sea valido. Asi quedo una
# ficha de 'llanosdeescudero37' colgando de la comunidad del numero 8.
vinc.insert(0, "update migracion_ficha set comunidad_id = null;")

for etiqueta, sentencias in (("vinculos", vinc), ("enriquecimiento", enri), ("presidentes", pers)):
    if not sentencias:
        continue
    r = subprocess.run(DB[:-1], input=("begin;\n" + "\n".join(sentencias) + "\ncommit;").encode("utf-8"),
                       stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    salida = r.stdout.decode("utf-8", "replace").strip()
    print(f"  [{etiqueta}] {len(sentencias)} sentencias{'  ' + salida[-500:] if salida else '  ok'}")

print("\nHECHO.")

