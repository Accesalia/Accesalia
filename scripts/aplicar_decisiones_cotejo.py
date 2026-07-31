# -*- coding: utf-8 -*-
r"""
Lleva al puente (migracion_admin_cotejo) lo que Monica decidio en
C:\accesalia-fichas\cotejo_empresas.csv, y saca lo que queda por decidir.

Ella escribio en texto libre, no con los valores del CHECK. Se traduce asi:
  empieza por "no fusionar"  -> es_distinta   (sera administracion nueva)
  contiene    "fusionar"     -> es_la_misma
Las que senalan otra empresa en prosa ("la tenias mas abajo", "pertenece a
Cervantes") no se adivinan: van en MANUALES, escritas una a una con sus
palabras al lado, para que se puedan auditar.

Ojo con las que CAMBIARON de propuesta: la regla de correo exacto se anadio
DESPUES de su revision, asi que algunas filas ya no proponen lo que ella vio.
Su decision se tomo sobre otra pregunta y no vale: salen aparte para mirarlas.

DRY-RUN por defecto. --apply para escribir.
Uso: python scripts/aplicar_decisiones_cotejo.py [--apply]
"""
import sys, io, re, csv, subprocess
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

APPLY = "--apply" in sys.argv
HOJA = r"C:\accesalia-fichas\cotejo_empresas.csv"
APP = r"C:\accesalia-fichas\administraciones_app.tsv"
V2 = r"C:\accesalia-fichas\cotejo_empresas_v2.csv"
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"]

# Las que Monica resolvio en prosa senalando otra empresa. Se escriben a mano
# porque adivinarlas seria inventar; su frase queda al lado como justificacion.
MANUALES = {
    "Elena Villaraco Moreno":                    ("VILLARACO ASESORES",       "la tenias mas abajo"),
    "Maravillas Millan Fernandez Adminsitradora": ("CERVANTES ADMINISTRADORES", "pertenece a una admin llamada cervantes"),
    "FINCAS LA ELIPA, S.L.":                     ("MARTINEZ LIRIA",           "es la de martinez liria, fusionarla con esa"),
    "FINCAS MONGE":                              ("MONGE",                    "tenias la admi de monge mas abajo"),
}

def sql(q):
    r = subprocess.run(DB + ["--csv", "-c", q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    t = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(t); sys.exit(1)
    return list(csv.DictReader(io.StringIO(t)))

def esc(s):
    return "'" + (s or "").replace("'", "''") + "'"

g = lambda f, k: (f.get(k) or "").strip()

app_por_nombre = {}
with open(APP, encoding="utf-8") as fh:
    for l in fh:
        p = l.rstrip("\n").split("\t")
        if len(p) >= 2 and p[0]:
            app_por_nombre[p[1].upper()] = p[0]

hoja = list(csv.DictReader(open(HOJA, encoding="utf-8-sig")))
ahora = {c["empresa_id"]: c for c in sql("""
select c.empresa_id, e.nombre nuestra, coalesce(c.administracion_id::text,'') administracion_id,
       c.administracion, c.motivo, coalesce(c.parecido::text,'') parecido, e.n_comunidades
  from migracion_admin_cotejo c join migracion_admin_empresa e on e.id=c.empresa_id""")}

decididas, cambiadas, sin_resolver = [], [], []
for f in hoja:
    eid = g(f, "empresa_id")
    act = ahora.get(eid)
    if not act:
        continue
    texto = (g(f, "DECISION") + " " + g(f, "nota")).strip()
    if not texto:
        continue

    # La propuesta que ella vio vs la que hay ahora
    vista = g(f, "administracion_id")
    if vista != act["administracion_id"]:
        cambiadas.append((f, act, texto))
        continue

    t = texto.lower()
    if re.match(r"\s*no\s*fusionar", t):
        decididas.append((eid, "es_distinta", None, texto, act))
    elif g(f, "nuestra_empresa") in MANUALES:
        destino, motivo = MANUALES[g(f, "nuestra_empresa")]
        aid = app_por_nombre.get(destino.upper())
        if not aid:
            print(f"  AVISO: no encuentro '{destino}' en la app"); continue
        decididas.append((eid, "es_la_misma", aid, f"{texto} [-> {destino}]", act))
    elif "fusionar" in t and act["administracion_id"]:
        decididas.append((eid, "es_la_misma", act["administracion_id"], texto, act))
    else:
        sin_resolver.append((f, act, texto))

print(f"filas revisadas por Monica con texto : {sum(1 for f in hoja if g(f,'DECISION') or g(f,'nota'))}")
print(f"  se pueden aplicar tal cual         : {len(decididas)}")
print(f"  la propuesta CAMBIO desde entonces : {len(cambiadas)}")
print(f"  su texto no es una decision        : {len(sin_resolver)}")

if cambiadas:
    print("\n--- CAMBIARON de propuesta (su decision era sobre otra pregunta) ---")
    for f, act, texto in cambiadas:
        print(f"  {act['nuestra'][:34]:34}")
        print(f"     vio  : {g(f,'administracion_app') or '(ninguna)'}   [{g(f,'motivo')}]")
        print(f"     ahora: {act['administracion'] or '(ninguna)'}   [{act['motivo']}]")
        print(f"     dijo : {texto[:80]}")
if sin_resolver:
    print("\n--- texto que no es una decision (queda pendiente) ---")
    for f, act, texto in sin_resolver:
        print(f"  {act['nuestra'][:34]:34} [{act['motivo']:14}] -> {act['administracion'][:26]:26} | {texto[:52]}")

# ---------- hoja de segunda vuelta ----------
pendientes = [c for c in ahora.values()
              if c["motivo"] in ("parecido", "varias", "sin_candidata", "contenido")
              and c["empresa_id"] not in {d[0] for d in decididas}]
CAB = ["empresa_id", "nuestra_empresa", "n_comunidades", "administracion_app",
       "administracion_id", "motivo", "parecido", "que_paso", "DECISION", "nota"]
import os
if os.path.exists(V2):
    # Ya existe y esta revisada: NO se pisa. Regenerarla borro una columna entera
    # que Monica habia anadido a mano, con 44 nombres definitivos dentro.
    print(f"\n  {V2} ya existe: no se toca (esta revisada).")
elif True:
  with open(V2, "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(CAB)
    for f, act, texto in cambiadas:
        w.writerow([act["empresa_id"], act["nuestra"], act["n_comunidades"],
                    act["administracion"], act["administracion_id"], act["motivo"],
                    act["parecido"],
                    f"antes proponia '{g(f,'administracion_app') or 'ninguna'}' y dijiste: {texto}", "", ""])
    for f, act, texto in sin_resolver:
        w.writerow([act["empresa_id"], act["nuestra"], act["n_comunidades"],
                    act["administracion"], act["administracion_id"], act["motivo"],
                    act["parecido"], f"tu nota: {texto}", "", ""])
    for c in pendientes:
        w.writerow([c["empresa_id"], c["nuestra"], c["n_comunidades"], c["administracion"],
                    c["administracion_id"], c["motivo"], c["parecido"],
                    "sin decidir", "", ""])
print(f"\n  -> {V2}  ({len(cambiadas) + len(sin_resolver) + len(pendientes)} filas)")

if not APPLY:
    print("\nDRY-RUN. --apply para escribir las decisiones en el puente.")
    sys.exit(0)

stmt = "\n".join(
    f"update migracion_admin_cotejo set decision={esc(dec)}, "
    f"administracion_id={(esc(aid) + '::uuid') if aid else 'administracion_id'}, "
    f"nota={esc(texto)} where empresa_id={esc(eid)}::uuid;"
    for eid, dec, aid, texto, act in decididas)
r = subprocess.run(DB, input=("begin;\n" + stmt + "\ncommit;").encode("utf-8"),
                   stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
if r.returncode:
    print(r.stdout.decode("utf-8", "replace")); sys.exit(1)
print(f"\nHECHO: {len(decididas)} decisiones escritas en el puente.")
