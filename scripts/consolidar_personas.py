# -*- coding: utf-8 -*-
r"""
Consolida la lista de PERSONAS aplicando lo que Monica reviso, y NO escribe en
las tablas del modelo: solo deja la lista consolidada y una hoja con lo que
todavia no ha visto nadie.

De donde sale cada decision:
  personas_consolidadas.csv   sus 175 notas
      "este y el siguiente son la misma persona"  -> 46 grupos, unidos por
                                                     adyacencia de filas
      "OJO!! dos nombres pegados: X y Y"          -> partir en los nombres que
                                                     ella misma escribe
      "nombre correcto: X"                        -> renombrar
      "no es un nombre / departamento / cargo"    -> descartar
  personas_decisiones.csv     los 10 casos sueltos que resolvio en prosa

Nada de reglas de parecido. Donde ella decidio, manda ella; donde no ha
decidido, la fila sale en la hoja para que la mire.

Uso: python scripts/consolidar_personas.py
"""
import sys, io, re, csv, subprocess
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HOJA = r"C:\accesalia-fichas\personas_consolidadas.csv"
DEC = r"C:\accesalia-fichas\personas_decisiones.csv"
ERR = r"C:\accesalia-fichas\personas_erratas.csv"
ACE = r"C:\accesalia-fichas\personas_aceptadas.csv"
SALIDA = r"C:\accesalia-fichas\personas_por_revisar.csv"
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "--csv", "-c"]

def sql(q):
    r = subprocess.run(DB + [q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    t = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(t); sys.exit(1)
    return list(csv.DictReader(io.StringIO(t)))

T = str.maketrans("áéíóúüñÁÉÍÓÚÜÑ", "aeiouunAEIOUUN")
def norm(v):
    return " ".join(re.sub(r"[^a-z ]", " ", (v or "").translate(T).lower()).split())
def esp(v):
    return re.sub(r"\s+", " ", v or "").strip()
g = lambda f, k: (f.get(k) or "").strip()

RE_MAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
RE_TEL = re.compile(r"\d[\d\s.\-]{7,}\d")
SEP = re.compile(r"\s*[,;/]\s*|\s+[-–]\s+|\s+[óÓ]\s+")   # " o " acentuada: "SANTIAGO EXT 6 O NURIA EXT 3"
PEGADO = re.compile(r"(?<=[a-záéíóúñ])(?=[A-ZÁÉÍÓÚÑ])")

def limpiar(v):
    v = esp(v)
    cortes = [m.start() for m in (RE_MAIL.search(v), RE_TEL.search(v),
              re.search(r"(?i)\b(dni|colegiad|ya\s+no\s+trabaja|l\s*a\s*[vj]\b|lunes|de\s+baja)", v)) if m]
    corto = v[:min(cortes)] if cortes else v
    if not esp(corto).strip(" -–,;:.()"):
        corto = RE_TEL.sub(" ", RE_MAIL.sub(" ", v))
    return esp(re.sub(r"\s*\(.*?\)?\s*$", "", corto)).strip(" -–,;:.()")

# Trozos que NO son una persona sino un dato pegado detras de ella. Se separan
# de su nombre y se guardan aparte, no se tiran: "Nuria Gonzalo DiezColegiada
# 8739" es una persona y su numero de colegiada, no dos personas.
ATRIBUTO = re.compile(r"""(?ix)
    ^colegiad\w*\s*(?P<col>\d+)?
  | ^no\s+encuentro
  | ^departamento\b
  | ^ext\b|\bext\s*\d
  | ^(secretaria|contabilidad|facturas?|administrativa|recepcion)\b
  | ^(horario|tlf|tel|telefono|movil)\b
""")

def trozos(valor):
    """-> [(nombre, atributos)]. Los atributos van pegados al nombre anterior."""
    out = []
    for t in SEP.split(valor or ""):
        for p in PEGADO.split(t):
            p = limpiar(p)
            if not p or len(norm(p)) < 3:
                continue
            m = ATRIBUTO.match(p)
            if m and out:
                out[-1][1].append(p)
                continue
            if m:
                continue                      # empieza por basura y no hay nombre
            out.append((p, []))
    return out

# ---------- lo que reviso Monica ----------
hoja = list(csv.DictReader(open(HOJA, encoding="utf-8-sig")))

# 1. grupos "misma persona", por adyacencia de filas
padre = list(range(len(hoja)))
def find(a):
    while padre[a] != a:
        padre[a] = padre[padre[a]]; a = padre[a]
    return a
def une(a, b):
    ra, rb = find(a), find(b)
    if ra != rb:
        padre[rb] = ra
for i, f in enumerate(hoja):
    t = g(f, "por_que").lower()
    if "misma persona" not in t:
        continue
    if ("sigueinte" in t or "siguiente" in t) and i + 1 < len(hoja):
        une(i, i + 1)
    if "anterior" in t and i - 1 >= 0:
        une(i - 1, i)

grupos = defaultdict(list)
for i, f in enumerate(hoja):
    if "misma persona" in g(f, "por_que").lower():
        grupos[find(i)].append(i)

# el nombre que se queda es el mas completo del grupo
canonico = {}
for v in grupos.values():
    nombres = [g(hoja[i], "PERSONA") for i in v if g(hoja[i], "PERSONA")]
    if not nombres:
        continue
    mejor = max(nombres, key=lambda x: (len(norm(x).split()), len(x)))
    for i in v:
        if g(hoja[i], "PERSONA"):
            canonico[norm(g(hoja[i], "PERSONA"))] = mejor

# 2. renombrar / descartar / partir
renombrar, descartar, partir = {}, set(), {}
for f in hoja:
    nota, per = g(f, "por_que"), g(f, "PERSONA")
    if not nota or not per:
        continue
    k = norm(per)
    m = re.search(r"(?i)nombre correcto:?\s*(.+)$", nota)
    if m:
        renombrar[k] = esp(m.group(1)).rstrip(".")
    elif re.search(r"(?i)no es (un )?nombre|departament|cargo, no nombre|nombre de empresa|"
                   r"ninguan de estas", nota):
        descartar.add(k)
    else:
        m = re.search(r"(?i)(?:dos|varios|\d+)\s+nombres?[^:]*:\s*(.+)$", nota)
        if m:
            trozos_nota = [esp(x) for x in re.split(r"\s+y\s+|\s*,\s*", m.group(1)) if esp(x)]
            if len(trozos_nota) > 1:
                partir[k] = trozos_nota

# 4. TODO lo que aparecia en su hoja cuenta como visto: dejar una fila en blanco
# significa "la propuesta esta bien", que es la norma que ella misma fijo.
vistos = {norm(g(f, "PERSONA")) for f in hoja if g(f, "PERSONA")}

# 4b. las que reviso en la hoja de pendientes y dio por buenas sin tocar nada.
# Se guardan aparte para que no vuelvan a salir como pendientes al rehacer.
aceptadas = set()
try:
    for f in csv.DictReader(open(ACE, encoding="utf-8-sig")):
        if g(f, "persona"):
            aceptadas.add((norm(g(f, "empresa")), norm(g(f, "persona"))))
except FileNotFoundError:
    pass

# 3. los 10 casos sueltos
sueltos = {}
for f in csv.DictReader(open(DEC, encoding="utf-8-sig")):
    sueltos[norm(g(f, "persona"))] = (g(f, "decision"), g(f, "empresa"))

# Donde Monica dijo que una persona esta en UNA empresa porque la comunidad
# cambio de administracion: su aparicion en la otra casa es historico, no un
# puesto vivo.
UNA_EMPRESA = {k: e for k, (d, e) in sueltos.items() if d == "una_persona_una_empresa"}

print(f"tu revision: {len(grupos)} grupos de misma persona, {len(renombrar)} renombrados, "
      f"{len(descartar)} descartes, {len(partir)} casillas a partir, {len(sueltos)} casos sueltos")
if partir:
    print("\n  casillas que se parten segun tu nota:")
    for k, v in list(partir.items())[:10]:
        print(f"     {k[:34]:34} -> {' + '.join(v)[:60]}")

# ---------- datos de hoy ----------
filas = sql("""
select r.comunidad_id, r.comunidad, r.persona, r.empresa_id,
       coalesce(nullif(c.nombre_final,''), e.nombre) empresa, r.email
  from migracion_admin_revision r
  join migracion_admin_empresa e on e.id = r.empresa_id
  left join migracion_admin_cotejo c on c.empresa_id = r.empresa_id
 where r.persona <> ''""")

ocur, fuera = [], 0
for f in filas:
    partes = None
    if norm(f["persona"]) in partir:
        partes = partir[norm(f["persona"])]
    lista = [(x, []) for x in partes] if partes else trozos(f["persona"])
    # Sus notas de "partir" van contra el nombre YA LIMPIO, no contra el texto
    # crudo de la ficha (que arrastra correo y telefono). Sin este segundo
    # intento, "DAVID CORTIJO DOMINGUEZRuth de Pablo Pacheco" no casaba.
    lista = [(x, a) for p, a in lista
             for x in (partir.get(norm(p)) or [p])] if not partes else lista
    for p, atrs in lista:
        k = norm(p)
        if k in descartar:
            fuera += 1; continue
        nom = renombrar.get(k, canonico.get(k, p))
        ocur.append({"nombre": esp(nom), "empresa": f["empresa"],
                     "comunidad_id": f["comunidad_id"],
                     "comunidad": f["comunidad"], "crudo": p, "atributos": atrs,
                     "revisado": k in vistos or k in sueltos,
                     "decidido": k in canonico or k in renombrar or k in partir})

# ---------- erratas que caza Monica revisando personas_lista ----------
# Se aplican DESPUES de todo lo demas, y se buscan por el nombre YA RESUELTO,
# que es el que ella ve en la hoja. Cuatro acciones y ninguna heuristica:
#   partir      una casilla que traia varias personas -> las que ella escribe
#   fusionar    varias filas que son la misma persona -> la que ella elige
#   renombrar   el nombre trae basura pegada (DNI, cargo, extension)
#   descartar   no es una persona
erratas = {}
try:
    for f in csv.DictReader(open(ERR, encoding="utf-8-sig")):
        erratas[(norm(g(f, "empresa")), norm(g(f, "persona")))] = (
            g(f, "accion"), [esp(x) for x in g(f, "valor").split(";") if esp(x)])
except FileNotFoundError:
    pass

aplicadas, sin_usar = set(), []
nuevo = []
for o in ocur:
    k = (norm(o["empresa"]), norm(o["nombre"]))
    if k not in erratas:
        nuevo.append(o); continue
    accion, vals = erratas[k]
    aplicadas.add(k)
    if accion == "descartar":
        continue
    for v in (vals if accion == "partir" else vals[:1]):
        x = dict(o); x["nombre"] = v; x["revisado"] = True; x["decidido"] = True
        nuevo.append(x)
ocur = nuevo
for o in ocur:
    if (norm(o["empresa"]), norm(o["nombre"])) in aceptadas:
        o["revisado"] = True
sin_usar = [k for k in erratas if k not in aplicadas]
print(f"\nerratas tuyas sobre personas_lista : {len(erratas)}  aplicadas: {len(aplicadas)}")
if sin_usar:
    print("  OJO, estas no han casado con ninguna fila (revisar el nombre):")
    for e, p in sin_usar:
        print(f"     {e[:34]:34} {p[:44]}")

# ---------- consolidar por (nombre, empresa) ----------
por = defaultdict(list)
for o in ocur:
    por[(norm(o["nombre"]), o["empresa"])].append(o)

sin_revisar = [k for k, v in por.items() if not any(x["revisado"] for x in v)]
print(f"\nocurrencias de persona            : {len(ocur)}   descartadas: {fuera}")
print(f"PERSONAS-EMPRESA distintas        : {len(por)}")
print(f"  que ya viste en tu hoja         : {len(por) - len(sin_revisar)}"
      f"  (de ellas {sum(1 for v in por.values() if any(x['decidido'] for x in v))} con decision explicita tuya)")
print(f"  SIN revisar (hoja nueva)        : {len(sin_revisar)}")

CAB = ["empresa", "persona", "tal_como_viene", "n_comunidades", "comunidades",
       "MISMA_QUE", "NOMBRE_CORRECTO", "DESCARTAR", "nota"]
with open(SALIDA, "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(CAB)
    for k in sorted(sin_revisar, key=lambda x: (x[1], x[0])):
        v = por[k]
        coms = sorted({x["comunidad"] for x in v})
        w.writerow([v[0]["empresa"], v[0]["nombre"], " | ".join(sorted({x["crudo"] for x in v})),
                    len(coms), " | ".join(coms[:3]), "", "", "", ""])
print(f"\n  -> {SALIDA}")

# ---------- la lista completa, para revisar ----------
LISTA = r"C:\accesalia-fichas\personas_lista.csv"
with open(LISTA, "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["empresa", "persona", "n_comunidades", "comunidades",
                "datos_pegados", "tal_como_viene_en_la_ficha", "ya_lo_viste",
                "administracion_anterior",
                "MISMA_QUE", "NOMBRE_CORRECTO", "DESCARTAR", "nota"])
    for k in sorted(por, key=lambda x: (x[1].upper(), x[0])):
        v = por[k]
        coms = sorted({x["comunidad"] for x in v})
        atrs = sorted({a for x in v for a in x.get("atributos", [])})
        crudos = sorted({x["crudo"] for x in v if norm(x["crudo"]) != norm(x["nombre"])})
        # esta fila esta en la lista pero NO es un puesto vivo: es la casa que
        # llevaba antes esa comunidad. Se marca para que la diferencia con
        # personas_solo.csv se vea, en vez de ser 4 filas de descuadre.
        vieja = "SI" if (norm(v[0]["nombre"]) in UNA_EMPRESA
                         and norm(v[0]["empresa"]) != norm(UNA_EMPRESA[norm(v[0]["nombre"])])) else ""
        w.writerow([v[0]["empresa"], v[0]["nombre"], len(coms), " | ".join(coms[:4]),
                    " | ".join(atrs), " | ".join(crudos),
                    "si" if any(x["revisado"] for x in v) else "NO", vieja, "", "", "", ""])
print(f"  -> {LISTA}  ({len(por)} filas: la lista completa)")

# ---------- la lista de PERSONAS (una fila por persona, no por puesto) ----------
# La identidad es el nombre, SALVO donde Monica dijo que dos personas se llaman
# igual y trabajan en empresas distintas (Daniel Gimenez, Jose Antonio): ahi la
# identidad es nombre + empresa, porque son gente diferente.
# La identidad es NOMBRE + EMPRESA, no el nombre solo. Un nombre de pila
# repetido en dos casas distintas es gente distinta: se comprobo uno a uno con
# el correo y no habia ni un caso en que fuera la misma persona cambiando de
# empresa (Alberto de gintegral.net no es el Alberto de fincasmonge.es).
# Excepcion: donde Monica dijo que una persona concreta esta en UNA empresa
# porque la comunidad cambio de administracion, se queda solo en esa.
gente = defaultdict(list)
descolgados = 0
for o in ocur:
    k = norm(o["nombre"])
    if k in UNA_EMPRESA and norm(o["empresa"]) != norm(UNA_EMPRESA[k]):
        descolgados += 1
        continue          # esa aparicion es de la administracion ANTERIOR
    gente[(k, o["empresa"])].append(o)
if descolgados:
    print(f"     apariciones descartadas por ser de la administracion anterior: {descolgados}")

PERS = r"C:{0}accesalia-fichas{0}personas_solo.csv".format(chr(92))
with open(PERS, "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["persona", "empresas", "n_empresas", "n_comunidades",
                "datos_pegados", "tal_como_viene_en_la_ficha", "ya_lo_viste",
                "ES_LA_MISMA_QUE", "NOMBRE_CORRECTO", "DESCARTAR", "nota"])
    for k in sorted(gente, key=lambda x: norm(gente[x][0]["nombre"])):
        v = gente[k]
        emps = sorted({x["empresa"] for x in v})
        coms = {x["comunidad"] for x in v}
        atrs = sorted({a for x in v for a in x.get("atributos", [])})
        crudos = sorted({x["crudo"] for x in v if norm(x["crudo"]) != norm(x["nombre"])})
        w.writerow([v[0]["nombre"], " | ".join(emps), len(emps), len(coms),
                    " | ".join(atrs), " | ".join(crudos),
                    "si" if any(x["revisado"] for x in v) else "NO", "", "", "", ""])
print(f"  -> {PERS}  ({len(gente)} PERSONAS = {len(gente)} PUESTOS, uno a uno)")

# ---------- el vinculo COMUNIDAD -> PERSONA, con el id de la comunidad ----------
# Es el dato que hoy solo existe como texto crudo en el puente. Aqui queda
# resuelto: que comunidad la lleva que persona, de que empresa. Al volcar, esto
# es lo que se convierte en puesto_id y deja de depender de este script.
VINC = r"C:{0}accesalia-fichas{0}personas_por_comunidad.csv".format(chr(92))
vinc = sorted({(o["comunidad_id"], o["comunidad"], o["empresa"], o["nombre"])
               for k, v in gente.items() for o in v})
with open(VINC, "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["comunidad_id", "comunidad", "empresa", "persona"])
    w.writerows(vinc)
com_con_persona = {r[0] for r in vinc}
print(f"  -> {VINC}  ({len(vinc)} vinculos)")
print(f"     comunidades con persona identificada: {len(com_con_persona)}"
      f"  de las {len({f['comunidad_id'] for f in filas})} que traen texto de persona")

# OJO: no contar sobre las claves de "gente", que ya llevan la empresa dentro:
# eso da 0 siempre y no demuestra nada. Lo que hay que contar es el NOMBRE.
empresas_por_nombre = defaultdict(set)
for (k, _), v in gente.items():
    empresas_por_nombre[k].add(v[0]["empresa"])
rep = {k: e for k, e in empresas_por_nombre.items() if len(e) > 1}
print(f"     nombres que aparecen en varias empresas: {len(rep)}"
      f"  (personas DISTINTAS por la regla nombre+empresa, comprobado con el correo)")
for k, e in sorted(rep.items())[:5]:
    print(f"        {k[:26]:26} {len(e)} casas")
