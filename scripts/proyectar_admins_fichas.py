# -*- coding: utf-8 -*-
"""
CAPA 2 / proyeccion 1: administradores de fincas desde la staging de fichas.

Lee migracion_ficha_campo (seccion='administrador'), agrupa las ~1.130 menciones
en administradores UNICOS, los casa con los 269 de administraciones_fincas y
propone altas. Tambien crea contactos (persona de contacto) y escribe de vuelta
migracion_ficha.administracion_id.

TRES SEÑALES DE IDENTIDAD (union-find):
  1. nombre normalizado exacto (sin tildes, sin forma juridica, sin parentesis)
  2. dominio de correo CORPORATIVO -> mismo administrador
  3. telefono de 9 digitos
El dominio generico (gmail, hotmail...) y el del Colegio (cafmadrid.es, icam.es)
NO identifican: ahi conviven administradores distintos.

Las fusiones dudosas (mismo nombre salvo el prefijo "ADMINISTRACION DE FINCAS",
o uno contenido en el otro) NO se aplican: se listan para que las valides.

Nunca pisa dato existente: a un admin ya creado solo se le rellenan huecos.

DRY-RUN por defecto. --apply para escribir.
Uso: python scripts/proyectar_admins_fichas.py [--apply]
"""
import os, sys, io, re, csv, json, unicodedata, subprocess
from collections import defaultdict, Counter
from difflib import SequenceMatcher
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

APPLY = "--apply" in sys.argv
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "--csv"]

GENERICOS = {"gmail.com", "hotmail.com", "hotmail.es", "yahoo.es", "yahoo.com",
             "outlook.com", "outlook.es", "live.com", "msn.com", "terra.es",
             "telefonica.net", "movistar.es", "ono.com", "wanadoo.es", "icloud.com",
             "me.com", "aol.com", "gmail.es", "hotmail.co.uk",
             # Colegios profesionales: NO identifican. cafmadrid=Admin. de Fincas,
             # icam=Abogados Madrid, icaah=Abogados Alcala de Henares. Un dominio
             # de colegio unio GARCIA TORO con JIMENEZ GOMEZ, que no tienen que ver.
             "cafmadrid.es", "icam.es", "icaah.com", "icaah.es"}
JURIDICA = re.compile(r"\b(S\.?\s?L\.?\s?U?\.?|S\.?\s?A\.?|C\.?\s?B\.?|S\.?\s?L\.?\s?P\.?|SOCIEDAD LIMITADA)\b")
NO_ADMIN = re.compile(r"^(no\b|ninguno|sin admin|particular|n/?a$|-+$|\.+$|"
                      r"docs?\b|pedidos?\b|reclamad|hablado\b|llamad)", re.I)
RE_MAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
RE_TEL = re.compile(r"\d{9}")

def sql(q):
    r = subprocess.run(DB + ["-c", q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    txt = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(txt); sys.exit(1)
    return list(csv.DictReader(io.StringIO(txt)))

def sin_tildes(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")

# En la celda del NOMBRE suelen venir PEGADAS las notas de gestion
# ("DEL BRIO Y BLANCOPedidos docs cp 23/01", "ARRIALSIPedidos docs cp 04/07").
# Hay que limpiarlas ANTES de agrupar, o el mismo admin cae en dos grupos.
CORTES = re.compile(r"(?i)(pedidos?\s*docs?|pedidos?\s*datos|pedidos?\s+a\s|docs?\s*cp\b|"
                    r"reclamad|nuevo administrador|compromiso\b|colegiad|hablado\b|"
                    r"tele(f|fono|fo)\.?\s*:|\bcl\.\s|\bc/\s|<|https?:|[\w.+-]+@)")
def limpiar_nombre(s):
    s = re.sub(r"\s+", " ", s or "").strip()
    m = CORTES.search(s)
    if m and m.start() > 3:
        s = s[:m.start()]
    return re.sub(r"[\s,;:.\-–(\[]+$", "", s).strip()

def norm_nombre(s):
    s = sin_tildes(s).upper()
    s = re.sub(r"\(.*?\)|\[.*?\]", " ", s)        # notas metidas entre parentesis
    s = JURIDICA.sub(" ", s)
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def sin_prefijo(n):
    return re.sub(r"^(ADMINISTRACION(ES)?( DE)?( FINCAS)?|ADMON( DE)?( FINCAS)?|"
                  r"ADMINISTRADOR(ES)?( DE)?( FINCAS)?|FINCAS|GRUPO|ASESORIA|GESTION) ", "", n).strip()

# En la ficha los correos vienen PEGADOS unos a otros y a texto suelto:
# 'juanmanuel@gmfincas.comsonia.guillen', 'masacristan@telefonica.netfincasmartos'.
# Sin despegarlos, el regex se traga la palabra siguiente y guarda un correo falso.
TLD_PEGADO = re.compile(r"(?i)(\.(?:com|es|net|org|eu|info|biz|io|cat|gal|pt|fr|uk))(?=[a-z0-9])")

def mails(v):
    return [m.lower() for m in RE_MAIL.findall(TLD_PEGADO.sub(r"\1 ", v or ""))]

def tels(v):
    return RE_TEL.findall(re.sub(r"[ .\-()]", "", v or ""))

# ---------- union-find ----------
padre = {}
def raiz(x):
    padre.setdefault(x, x)
    while padre[x] != x:
        padre[x] = padre[padre[x]]; x = padre[x]
    return x
def unir(a, b):
    ra, rb = raiz(a), raiz(b)
    if ra != rb:
        padre[ra] = rb

# ---------- 1. menciones de administrador en las fichas ----------
filas = sql("""
select f.ficha_ref, c.etiqueta, c.valor
  from migracion_ficha f join migracion_ficha_campo c on c.ficha_id = f.id
 where c.seccion = 'administrador' and c.valor <> ''
   and c.etiqueta in ('NOMBRE','DIRECCION','TELEFONO','E-MAIL','PERSONA DE CONTACTO','NOTAS')
""")
por_ficha = defaultdict(dict)
for r in filas:
    por_ficha[r["ficha_ref"]].setdefault(r["etiqueta"], r["valor"])

menciones, descartadas = [], []
for ref, d in por_ficha.items():
    nombre = (d.get("NOMBRE") or "").strip()
    # La celda a veces contiene SOLO una nota de gestion ("Pedidos docs cp 22/09"):
    # no es un nombre, y si se cuela contamina el grupo entero.
    if not nombre or NO_ADMIN.match(nombre) or (CORTES.match(nombre) is not None):
        descartadas.append((ref, nombre)); continue
    # Un "nombre" de mas de 60 caracteres no es un nombre: es la ficha entera
    # pegada en la celda (nombre + direccion + telefono sin separadores). Dar de
    # alta eso ensucia la cartera; va a revision.
    if len(limpiar_nombre(nombre)) > 60:
        descartadas.append((ref, nombre)); continue
    n = norm_nombre(limpiar_nombre(nombre))
    if not n:
        descartadas.append((ref, nombre)); continue
    menciones.append({"ficha_ref": ref, "nombre": nombre, "norm": n,
                      "direccion": d.get("DIRECCION", ""), "telefono": d.get("TELEFONO", ""),
                      "email": d.get("E-MAIL", ""), "contacto": d.get("PERSONA DE CONTACTO", ""),
                      "notas": d.get("NOTAS", "")})

print(f"Fichas con bloque administrador y nombre util: {len(menciones)}")
print(f"Descartadas ('no tienen', vacio, basura):      {len(descartadas)}")
print(f"Nombres distintos en crudo:                    {len(set(m['nombre'] for m in menciones))}")
print(f"Nombres distintos ya normalizados:             {len(set(m['norm'] for m in menciones))}")

# ---------- 2. agrupar por las tres señales ----------
por_dominio, por_tel = defaultdict(list), defaultdict(list)
for m in menciones:
    clave = "N:" + m["norm"]
    m["clave"] = clave
    raiz(clave)
    for e in mails(m["email"]):
        dom = e.split("@")[1]
        if dom not in GENERICOS:
            por_dominio[dom].append(clave)
    for t in tels(m["telefono"]):
        por_tel[t].append(clave)

for dom, claves in por_dominio.items():
    for c in claves[1:]:
        unir(claves[0], c)
for t, claves in por_tel.items():
    for c in claves[1:]:
        unir(claves[0], c)

grupos = defaultdict(list)
for m in menciones:
    grupos[raiz(m["clave"])].append(m)
print(f"\n=> ADMINISTRADORES UNICOS tras agrupar: {len(grupos)}")

# nombre canonico = la forma limpia mas repetida del grupo
def canonico(ms):
    formas = Counter(limpiar_nombre(m["nombre"]) for m in ms)
    formas.pop("", None)
    if not formas:
        return limpiar_nombre(max((m["nombre"] for m in ms), key=len)) or "SIN NOMBRE"
    return formas.most_common(1)[0][0]

# ---------- 3. RETENER los grupos unidos por telefono/dominio con nombres
# realmente distintos. Compartir centralita no es ser el mismo despacho: una
# errata (JIMACO/JIMECO) se aplica sola, "MUPAN <= ADM MAFER" lo decide un humano.
# Palabras del gremio: estan en media cartera, no identifican a nadie.
GREMIO = {"ADMINISTRACION", "ADMINISTRACIONES", "ADMINISTRADOR", "ADMINISTRADORA",
          "ADMINISTRADORES", "ADMINIST", "ADMON", "ADM", "FINCAS", "ASESORES",
          "ASESORIA", "ASESORIAS", "GESTION", "GESTORIA", "ABOGADOS", "GRUPO",
          "SERVICIOS", "JURIDICOS", "COMUNIDADES", "PATRIMONIO", "TRAVES",
          "DE", "DEL", "LA", "EL", "Y", "A", "SL", "CB", "SLP", "SA"}

def propios(n):
    return {t for t in n.split() if len(t) >= 4 and t not in GREMIO and not t.isdigit()}

def emparentados(normas, base):
    """Comparten identidad si comparten un token propio (BRIO, ALCORA, ATIKO),
    admitiendo erratas (ALVAREZ/ALVARES, JIMECO/JIMACO)."""
    pb = propios(base)
    for n in normas:
        pn = propios(n)
        if not pn or pn & pb:
            continue
        if not pb:      # el canonico es todo generico ("SM FINCAS"): comparar entero
            if SequenceMatcher(None, base.replace(" ", ""), n.replace(" ", "")).ratio() >= 0.8:
                continue
            return False
        if any(SequenceMatcher(None, x, y).ratio() >= 0.82 for x in pb for y in pn):
            continue
        return False
    return True

retenidos = {}
for r, ms in grupos.items():
    normas = {n for n in (norm_nombre(limpiar_nombre(m["nombre"])) for m in ms) if len(n) >= 4}
    if len(normas) > 1 and not emparentados(normas, norm_nombre(canonico(ms))):
        retenidos[r] = sorted(normas)

# ---------- decisiones humanas sobre los grupos retenidos ----------
# Se leen por NOMBRE suelto, no por la cadena entera del grupo: al afinar el
# dedup la composicion de un grupo cambia, y una clave literal dejaria de casar.
DECISIONES = r"C:\accesalia-fichas\admins_a_revisar.csv"
decision = {}
if os.path.exists(DECISIONES):
    with open(DECISIONES, encoding="utf-8-sig", newline="") as fh:
        for fila in csv.DictReader(fh):
            d = (fila.get("fusionar_si_no") or "").strip().lower()
            if d in ("si", "sí", "no"):
                for n in (fila.get("nombres_unidos") or "").split(" + "):
                    decision.setdefault(n.strip(), d.replace("sí", "si"))

def veredicto(normas):
    votos = {decision[n] for n in normas if n in decision}
    return votos.pop() if len(votos) == 1 else None

fusionar, separar = 0, 0
for r in list(retenidos):
    v = veredicto(retenidos[r])
    if v == "si":                      # validado: es el mismo despacho
        del retenidos[r]; fusionar += 1
    elif v == "no":                    # comparten centralita, no identidad:
        separar += 1                   # se deshace la union, cada nombre por su lado
if decision:
    print(f"\nDecisiones leidas de {os.path.basename(DECISIONES)}: "
          f"{fusionar} grupos confirmados como uno, {separar} a separar")

# Deshacer la union de los marcados 'no': cada nombre normalizado vuelve a ser
# un administrador independiente.
if separar:
    nuevos_grupos = {}
    for r, ms in grupos.items():
        if r in retenidos and veredicto(retenidos[r]) == "no":
            for m in ms:
                nuevos_grupos.setdefault(("split", r, m["norm"]), []).append(m)
        else:
            nuevos_grupos[r] = ms
    grupos = nuevos_grupos
    retenidos = {r: v for r, v in retenidos.items() if r in grupos}
    print(f"   -> tras separar quedan {len(grupos)} administradores unicos")
print(f"   de los cuales RETENIDOS para que los valides: {len(retenidos)}")

# ---------- 4. casar con los 269 existentes ----------
existentes = sql("select id, nombre, coalesce(email,'') email, coalesce(telefono,'') telefono, "
                 "coalesce(direccion,'') direccion from administraciones_fincas")
idx_nombre, idx_dom, idx_tel = {}, {}, {}
for e in existentes:
    idx_nombre.setdefault(norm_nombre(e["nombre"]), e)
    for m in mails(e["email"]):
        dom = m.split("@")[1]
        if dom not in GENERICOS:
            idx_dom.setdefault(dom, e)
    for t in tels(e["telefono"]):
        idx_tel.setdefault(t, e)

casados, nuevos = [], []
for r, ms in grupos.items():
    if r in retenidos:                 # no se escribe nada de un grupo dudoso
        continue
    doms = {x.split("@")[1] for m in ms for x in mails(m["email"])} - GENERICOS
    telefonos = {t for m in ms for t in tels(m["telefono"])}
    normas = {m["norm"] for m in ms}
    hit, via = None, None
    for n in normas:
        if n in idx_nombre:
            hit, via = idx_nombre[n], "nombre"; break
    if not hit:
        for d in doms:
            if d in idx_dom:
                hit, via = idx_dom[d], "dominio"; break
    if not hit:
        for t in telefonos:
            if t in idx_tel:
                hit, via = idx_tel[t], "telefono"; break
    (casados if hit else nuevos).append({"grupo": ms, "existente": hit, "via": via,
                                         "canonico": canonico(ms)})

print(f"   casan con uno de los 269 existentes: {len(casados)}")
print(f"   altas nuevas:                        {len(nuevos)}")
print(f"   (por via: {dict(Counter(c['via'] for c in casados))})")

# ---------- 4. fusiones dudosas: se listan, NO se aplican ----------
canon = {r: canonico(ms) for r, ms in grupos.items()}
dudosas = []
claves = [(r, norm_nombre(c)) for r, c in canon.items()]
for i, (r1, n1) in enumerate(claves):
    for r2, n2 in claves[i + 1:]:
        a, b = sin_prefijo(n1), sin_prefijo(n2)
        if not a or not b or len(a) < 4 or len(b) < 4:
            continue
        # "ADMINISTRACION DE FINCAS" es subcadena de media cartera: solo cuenta la
        # contencion si el corto es buena parte del largo, no un generico suelto.
        corto, largo = sorted((a, b), key=len)
        if a == b or (corto in largo and len(corto) >= 0.6 * len(largo)):
            dudosas.append((canon[r1], canon[r2], len(grupos[r1]), len(grupos[r2])))

print(f"\n=== POSIBLES FUSIONES A VALIDAR (no se aplican): {len(dudosas)} ===")
for a, b, na, nb in sorted(dudosas, key=lambda x: -(x[2] + x[3]))[:20]:
    print(f"   '{a}' ({na} fichas)   <->   '{b}' ({nb} fichas)")

# Fichero APARTE del que revisa Monica, para no pisar sus anotaciones.
REVISAR = r"C:\accesalia-fichas\admins_retenidos_detalle.csv"
ubic = {r["ficha_ref"]: r for r in sql("""
select f.ficha_ref,
       case when f.es_provincia then split_part(f.ruta_dropbox,'\\',3)
            else split_part(f.ruta_dropbox,'\\',1) end carpeta,
       coalesce(nullif(m.direccion,''), m.nombre, '') comunidad
  from migracion_ficha f left join comunidades m on m.id = f.comunidad_id
""")}
print(f"\n=== RETENIDOS: {len(retenidos)} grupos, nombres distintos con mismo telefono/dominio ===")
for r, normas in sorted(retenidos.items(), key=lambda x: -len(grupos[x[0]]))[:12]:
    print(f"   {len(grupos[r]):3} fichas  {' + '.join(normas[:4])}")
with open(REVISAR, "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["fichas", "nombres_unidos", "nombre_por_carpeta", "comunidades",
                "telefonos", "emails", "fusionar_si_no"])
    for r, normas in sorted(retenidos.items(), key=lambda x: -len(grupos[x[0]])):
        ms = grupos[r]
        # Que nombre de admin aparece en QUE carpeta: es lo que permite decidir
        # si son dos despachos distintos o el mismo escrito de dos formas.
        detalle = sorted({f"{ubic.get(m['ficha_ref'],{}).get('carpeta','?')} = "
                          f"{limpiar_nombre(m['nombre'])}" for m in ms})
        comus = sorted({c for c in (ubic.get(m["ficha_ref"], {}).get("comunidad", "") for m in ms) if c})
        w.writerow([len(ms), " + ".join(normas), " | ".join(detalle), " | ".join(comus),
                    " ".join(sorted({t for m in ms for t in tels(m["telefono"])})),
                    " ".join(sorted({e for m in ms for e in mails(m["email"])})), ""])
print(f"   -> listado completo para revisar: {REVISAR}")

print(f"\n=== ALTAS NUEVAS: {len(nuevos)} (muestra de 25, por nº de fichas) ===")
for c in sorted(nuevos, key=lambda x: -len(x["grupo"]))[:25]:
    print(f"   {len(c['grupo']):3} fichas  {c['canonico']}")

print("\n=== 15 GRUPOS MAS GRANDES (variantes de nombre que se han unido) ===")
for r, ms in sorted(grupos.items(), key=lambda x: -len(x[1]))[:15]:
    formas = Counter(m["nombre"].strip() for m in ms)
    est = next((c["existente"]["nombre"] for c in casados if c["grupo"] is ms), None)
    marca = ("  [RETENIDO: lo validas tu]" if r in retenidos
             else f"  [ya existe: {est}]" if est else "  [ALTA NUEVA]")
    print(f"  {len(ms):3} fichas  {canon[r]}{marca}")
    if len(formas) > 1:
        print(f"           variantes: {' | '.join(list(formas)[:4])}")

if not APPLY:
    print("\nDRY-RUN. Revisa los numeros y relanza con --apply para escribir.")
    sys.exit(0)

# ---------- 5. escritura ----------
def esc(s):
    return "'" + (s or "").replace("'", "''")[:400] + "'"

def primer_mail(ms):
    for m in ms:
        e = mails(m["email"])
        if e:
            return e[0]
    return ""

def primer_tel(ms):
    for m in ms:
        t = tels(m["telefono"])
        if t:
            return t[0]
    return ""

def primera_dir(ms):
    for m in ms:
        if m["direccion"].strip():
            return re.sub(r"\s+", " ", m["direccion"]).strip()
    return ""

lineas = ["begin;"]
for c in nuevos:
    ms = c["grupo"]
    lineas.append(
        "insert into administraciones_fincas (nombre, email, telefono, direccion) values "
        f"({esc(c['canonico'])}, nullif({esc(primer_mail(ms))},''), "
        f"nullif({esc(primer_tel(ms))},''), nullif({esc(primera_dir(ms))},''));")
# a los existentes solo se les rellenan HUECOS, nunca se pisa lo que ya tienen
for c in casados:
    ms, e = c["grupo"], c["existente"]
    lineas.append(
        "update administraciones_fincas set "
        f"email = coalesce(nullif(email,''), nullif({esc(primer_mail(ms))},'')), "
        f"telefono = coalesce(nullif(telefono,''), nullif({esc(primer_tel(ms))},'')), "
        f"direccion = coalesce(nullif(direccion,''), nullif({esc(primera_dir(ms))},'')) "
        f"where id = '{e['id']}';")
lineas.append("commit;")

r = subprocess.run(DB[:-1], input="\n".join(lineas).encode("utf-8"),
                   stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
print(r.stdout.decode("utf-8", "replace")[-2000:])
if r.returncode:
    sys.exit(1)

# vincular cada ficha con su administracion + crear contactos
todos = sql("select id, nombre from administraciones_fincas")
por_norm = {norm_nombre(a["nombre"]): a["id"] for a in todos}
vinc, cont = [], []
for c in casados + nuevos:
    aid = c["existente"]["id"] if c["existente"] else por_norm.get(norm_nombre(c["canonico"]))
    if not aid:
        continue
    for m in c["grupo"]:
        vinc.append(f"update migracion_ficha set administracion_id='{aid}' where ficha_ref={esc(m['ficha_ref'])};")
    nombres = {re.sub(r"\s+", " ", m["contacto"]).strip() for m in c["grupo"] if m["contacto"].strip()}
    for n in nombres:
        # 'proposito' es vocabulario cerrado por CHECK: general|facturacion|obra|
        # documentacion|comercial. La procedencia se anota en notas.
        cont.append("insert into contactos (administracion_id, nombre, proposito, notas) "
                    f"select '{aid}', {esc(n)}, 'general', 'Importado de la ficha de datos (Dropbox)' "
                    f"where not exists (select 1 from contactos "
                    f"where administracion_id='{aid}' and upper(nombre)=upper({esc(n)}));")

# Dos transacciones separadas: un contacto que no pase una validacion no puede
# tumbar el vinculo ficha->administracion, que es lo caro de recalcular.
for etiqueta, sentencias in (("vinculos", vinc), ("contactos", cont)):
    r = subprocess.run(DB[:-1], input=("begin;\n" + "\n".join(sentencias) + "\ncommit;").encode("utf-8"),
                       stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    salida = r.stdout.decode("utf-8", "replace").strip()
    if salida:
        print(f"  [{etiqueta}] {salida[-800:]}")
print(f"\nHECHO: {len(nuevos)} altas, {len(casados)} enriquecidos, "
      f"{len(vinc)} fichas vinculadas, {len(cont)} contactos propuestos.")

