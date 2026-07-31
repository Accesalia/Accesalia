# -*- coding: utf-8 -*-
r"""
Vuelca PERSONAS y PUESTOS al modelo limpio, aplicando lo que Monica anoto en
personas_consolidadas.csv (175 notas) y las reglas que esas notas revelaron.

Reglas mecanicas, todas sacadas de sus notas:
  1. Nombres pegados sin espacio: "JUAN LEONSandra Mas" -> dos personas.
  2. Nombre de pila y nombre completo EN LA MISMA EMPRESA son la misma persona:
     "VALENTIN" + "VALENTIN ALCOCER". Es el patron de sus ~60 "este y el
     siguiente son la misma persona".
  3. Lo que no es una persona se descarta: CONTABILIDAD, FACTURAS, secretaria,
     "Horario de", un ano suelto, un codigo postal.
  4. Lo tachado en la ficha ya viene excluido de origen.

Sus notas mandan sobre las reglas: si escribio un nombre correcto, ese vale.

El puesto se crea con la empresa a la que la ficha asocia a esa persona. Si una
persona sale en dos empresas, son DOS puestos: no se elige por ella.

DRY-RUN por defecto. --apply para escribir.
Uso: python scripts/volcar_personas_modelo.py [--apply]
"""
import sys, io, re, csv, subprocess
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

APPLY = "--apply" in sys.argv
HOJA = r"C:\accesalia-fichas\personas_consolidadas.csv"
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"]

def sql(q):
    r = subprocess.run(DB + ["--csv", "-c", q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    t = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(t); sys.exit(1)
    return list(csv.DictReader(io.StringIO(t)))

def esc(s):
    return "'" + (s or "").replace("'", "''") + "'"

T = str.maketrans("áéíóúüñÁÉÍÓÚÜÑ", "aeiouunAEIOUUN")
def norm(v):
    return " ".join(re.sub(r"[^a-z ]", " ", (v or "").translate(T).lower()).split())

def espacios(v):
    return re.sub(r"\s+", " ", v or "").strip()

RE_MAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
RE_TEL = re.compile(r"\d[\d\s.\-]{7,}\d")

# Lo que NO es una persona. Sale de las notas de Monica: "es departamento, no
# persona", "cargo, no nombre", "lo detectado no es un nombre".
NO_ES_PERSONA = re.compile(r"""(?ix)
    ^(contabilidad|facturas?|facturacion|secretaria|administracion|departamento
     |recepcion|obras|incidencias|proveedores|gestion|oficina|no\s+hay
     |no\s+se\s+han?|no\s+tienen?.*|ninguno?|no\s+disponible.*)$
  | ^\d+$                          # un ano, un numero suelto
  | ^\d{5}\s                       # un codigo postal
  | ^(horario|tlf|tel|telefono|movil|mail|correo|de\s+baja|de\s+lunes)\b
  | ^(don|dona|doña)\b             # "Doña Isabel" no es el nombre, es el trato
  | no\s+corresponde
  | ^es\s+un[ao]?\s
  | ^esta\s+persona\b
""")

# Nombre pegado a otro sin espacio: "JUAN LEONSandra Mas"
RE_PEGADO = re.compile(r"(?<=[a-záéíóúñ])(?=[A-ZÁÉÍÓÚÑ])")
SEP = re.compile(r"\s*[,;/]\s*|\s+[-–]\s+")

def limpiar(v):
    """Quita del nombre lo que se le pego: correo, telefono, DNI, horario.

    Se corta desde donde empieza la basura, pero si eso no deja nada es que la
    basura iba DELANTE ("676 71 01 38 Montserrat Cabrera"): entonces se quita
    en el sitio y se conserva el nombre, que si no se perdia entero."""
    v = espacios(v)
    cortes = [m.start() for m in (RE_MAIL.search(v), RE_TEL.search(v),
                                  re.search(r"(?i)\b(dni|colegiad|ya\s+no\s+trabaja|"
                                            r"l\s*a\s*[vj]\b|lunes|de\s+baja)", v)) if m]
    corto = v[:min(cortes)] if cortes else v
    if not espacios(corto).strip(" -–,;:.()"):
        corto = RE_TEL.sub(" ", RE_MAIL.sub(" ", v))
    return espacios(re.sub(r"\s*\(.*?\)?\s*$", "", corto)).strip(" -–,;:.()")

fuera_por_regla = []

def trozos(valor):
    """Una casilla puede traer varias personas, con separador o pegadas."""
    out = []
    for t in SEP.split(valor or ""):
        for p in RE_PEGADO.split(t):
            p = limpiar(p)
            if not p or len(norm(p)) < 3:
                continue
            if NO_ES_PERSONA.search(p):
                fuera_por_regla.append(p)
                continue
            out.append(p)
    return out

# ---------- lo que dijo Monica ----------
correcciones = {}
try:
    for f in csv.DictReader(open(HOJA, encoding="utf-8-sig")):
        nota = (f.get("por_que") or "").strip()
        emp, per = (f.get("EMPRESA") or "").strip(), (f.get("PERSONA") or "").strip()
        if not nota or not per:
            continue
        m = re.search(r"(?i)nombre correcto:?\s*(.+)$", nota)
        if m:
            correcciones[(norm(emp), norm(per))] = ("renombrar", espacios(m.group(1)).rstrip("."))
        elif re.search(r"(?i)no es (un )?nombre|departament|cargo, no nombre|"
                       r"nombre de empresa|ninguan de estas", nota):
            correcciones[(norm(emp), norm(per))] = ("descartar", "")
except FileNotFoundError:
    print("  AVISO: no encuentro la hoja revisada, se aplican solo las reglas")

# ---------- ocurrencias ----------
filas = sql("""
select r.comunidad_id, r.comunidad, r.persona, r.empresa_id,
       coalesce(nullif(c.nombre_final,''), e.nombre) empresa
  from migracion_admin_revision r
  join migracion_admin_empresa e on e.id = r.empresa_id
  left join migracion_admin_cotejo c on c.empresa_id = r.empresa_id
 where r.persona <> ''""")

ocur, descartados = [], []
for f in filas:
    for p in trozos(f["persona"]):
        accion, valor = correcciones.get((norm(f["empresa"]), norm(p)), (None, ""))
        if accion == "descartar":
            descartados.append((f["empresa"], p)); continue
        if accion == "renombrar":
            p = valor
        ocur.append({"nombre": p, "empresa": f["empresa"], "comunidad": f["comunidad"]})

# ---------- consolidar dentro de cada empresa ----------
por_empresa = defaultdict(list)
for o in ocur:
    por_empresa[o["empresa"]].append(o)

personas, fusiones = [], 0
for emp, os_ in por_empresa.items():
    nombres = sorted({o["nombre"] for o in os_}, key=lambda x: -len(norm(x)))
    canon = {}
    for n in nombres:
        tn = norm(n).split()
        # el nombre corto que es principio de uno largo, en la MISMA empresa,
        # es la misma persona: "VALENTIN" dentro de "VALENTIN ALCOCER"
        largo = next((c for c in canon
                      if norm(c).split()[:len(tn)] == tn and len(norm(c).split()) > len(tn)), None)
        if largo:
            canon[n] = canon[largo]; fusiones += 1
        else:
            canon[n] = n
    agr = defaultdict(list)
    for o in os_:
        agr[canon[o["nombre"]]].append(o)
    for nom, lista in agr.items():
        personas.append({"nombre": nom, "empresa": emp,
                         "comunidades": sorted({x["comunidad"] for x in lista})})

nombres_unicos = {norm(p["nombre"]) for p in personas}
print(f"casillas de persona en las fichas : {len(filas)}")
print(f"  se parten en ocurrencias        : {len(ocur)}")
print(f"  descartadas por no ser personas : {len(descartados)} marcadas por Monica"
      f" + {len(fuera_por_regla)} por regla")
print(f"  fusionadas (pila + completo)    : {fusiones}")
print(f"\nPUESTOS a crear (persona en empresa): {len(personas)}")
print(f"PERSONAS distintas                  : {len(nombres_unicos)}")
print(f"  personas con puesto en 2+ empresas: "
      f"{len(personas) - len({(norm(p['nombre']), p['empresa']) for p in personas})}")
print("\n  muestra de descartes:")
for e, p in descartados[:8]:
    print(f"     {e[:30]:30} {p[:40]}")
print("\n  empresas con mas gente:")
for e, n in sorted(defaultdict(int, {p["empresa"]: sum(1 for x in personas if x["empresa"] == p["empresa"])
                                     for p in personas}).items(), key=lambda x: -x[1])[:8]:
    print(f"     {e[:40]:40} {n}")

if not APPLY:
    print("\nDRY-RUN. --apply para escribir.")
    sys.exit(0)

vp = ",".join(f"({esc(n)})" for n in sorted({p["nombre"] for p in personas}))
vq = ",".join(f"({esc(p['nombre'])},{esc(p['empresa'])})" for p in personas)
stmt = f"""
create temp table _p (nombre text);
insert into _p values {vp};
insert into persona (nombre)
select distinct p.nombre from _p p
 where not exists (select 1 from persona x where lower(btrim(x.nombre)) = lower(btrim(p.nombre)));

create temp table _q (nombre text, empresa text);
insert into _q values {vq};
insert into puesto (persona_id, empresa_id)
select pe.id, em.id from _q q
  join persona pe on lower(btrim(pe.nombre)) = lower(btrim(q.nombre))
  join empresa em on lower(btrim(em.nombre_accesalia)) = lower(btrim(q.empresa))
 where not exists (select 1 from puesto y where y.persona_id = pe.id and y.empresa_id = em.id);
"""
r = subprocess.run(DB, input=("begin;\n" + stmt + "commit;").encode("utf-8"),
                   stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
if r.returncode:
    print(r.stdout.decode("utf-8", "replace")); sys.exit(1)
c = sql("select (select count(*) from persona) personas, (select count(*) from puesto) puestos")[0]
print(f"\nHECHO: {c['personas']} personas, {c['puestos']} puestos")
