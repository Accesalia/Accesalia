# -*- coding: utf-8 -*-
r"""
Vuelca al modelo limpio: empresa, persona, puesto, correo.

De donde sale cada cosa:
  empresa   migracion_admin_revision (lo extraido de las fichas)
            + las que entran del tablero de Monday
            + empresas_correcciones.csv   (lo que Monica corrigio a mano)
            - empresas_tablero_decisiones.csv, las marcadas fuera/duplicada
  persona   personas_final.csv     (una fila por persona)
  puesto    puestos_final.csv      (una fila por persona-en-empresa)
  correo    los correos de la ficha, repartidos entre puesto y empresa

Como se reparte un correo: si el trozo antes de la @ se parece al nombre de
alguien de esa casa, es SUYO; si no, es de la empresa. Asi "carmen@delbrioyblanco.es"
cuelga de Carmen y "info@delbrioyblanco.es" cuelga de Del Brio y Blanco.

Al final escribe puesto_id de vuelta en migracion_admin_revision, para que el
vinculo comunidad->persona deje de depender de volver a ejecutar los scripts.

DRY-RUN por defecto. --apply para escribir.
Uso: python scripts/volcar_modelo.py [--apply]
"""
import sys, io, re, csv, subprocess
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

APPLY = "--apply" in sys.argv
D = r"C:\accesalia-fichas"
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"]

def sql(q):
    r = subprocess.run(DB + ["--csv", "-c", q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    t = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(t); sys.exit(1)
    return list(csv.DictReader(io.StringIO(t)))

def ejecutar(stmt):
    r = subprocess.run(DB, input=("begin;\n" + stmt + "\ncommit;").encode("utf-8"),
                       stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if r.returncode:
        print(r.stdout.decode("utf-8", "replace")); sys.exit(1)

esc = lambda s: "'" + (s or "").replace("'", "''") + "'"
nul = lambda s: esc(s) if (s or "").strip() else "null"
T = str.maketrans("ÁÉÍÓÚÜÑáéíóúüñ", "AEIOUUNaeiouun")
kk = lambda v: re.sub(r"[^A-Z0-9]", "", (v or "").upper().translate(T))
g = lambda f, k: (f.get(k) or "").strip()
NOES = re.compile(r"(?i)^no( |$)")
RE_MAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")

def leer(nombre):
    try:
        return list(csv.DictReader(open(rf"{D}\{nombre}", encoding="utf-8-sig")))
    except FileNotFoundError:
        return []

# ---------------------------------------------------------------- decisiones
FUERA, DEL_TABLERO = set(), set()
for f in leer("empresas_tablero_decisiones.csv"):
    (FUERA if g(f, "decision") in ("fuera", "duplicada") else DEL_TABLERO).add(kk(g(f, "empresa")))

CORR = defaultdict(dict)
for f in leer("empresas_correcciones.csv"):
    campo, valor = g(f, "campo"), g(f, "valor")
    if g(f, "accion") == "renombrar":
        CORR[kk(g(f, "empresa"))]["nombre"] = valor
    elif campo in ("email", "telefono", "direccion", "cif", "notas"):
        CORR[kk(g(f, "empresa"))][campo] = valor

# ---------------------------------------------------------------- empresas
filas = sql("""
select coalesce(nullif(c.nombre_final,''), e.nombre) nombre,
       string_agg(distinct nullif(r.email,''),   ' | ') emails,
       string_agg(distinct nullif(r.telefono,''),' | ') telefonos,
       string_agg(distinct nullif(r.direccion,''),' | ') direcciones
  from migracion_admin_revision r
  join migracion_admin_empresa e on e.id = r.empresa_id
  left join migracion_admin_cotejo c on c.empresa_id = e.id
 group by 1""")

empresas = {}
for f in filas:
    n = f["nombre"]
    if NOES.match(n) or kk(n) in FUERA:
        continue
    empresas[kk(n)] = {"nombre": n, "emails": f["emails"] or "",
                       "telefono": (f["telefonos"] or "").split(" | ")[0],
                       "direccion": (f["direcciones"] or "").split(" | ")[0], "cif": "", "notas": ""}

# las que entran del tablero de Monday y ninguna ficha menciona
if DEL_TABLERO:
    tab = sql("""select a.nombre, coalesce(a.email,'') email, coalesce(a.telefono,'') telefono,
                        coalesce(a.direccion,'') direccion
                   from administraciones_fincas a
                  where exists (select 1 from migracion_monday m
                                 where m.registro_id=a.id and m.tabla_destino='administraciones_fincas')""")
    for t in tab:
        k = kk(t["nombre"])
        if k in DEL_TABLERO and k not in empresas and k not in FUERA:
            empresas[k] = {"nombre": t["nombre"], "emails": t["email"],
                           "telefono": t["telefono"], "direccion": t["direccion"],
                           "cif": "", "notas": "no sale en ninguna ficha: viene del tablero de Monday"}

# empresas que solo existen porque Monica dio de alta a alguien en ellas
for a in leer("altas_personas_empresa.csv"):
    k = kk(g(a, "empresa"))
    if k and k not in empresas and k not in FUERA:
        empresas[k] = {"nombre": g(a, "empresa"), "emails": "", "telefono": "",
                       "direccion": "", "cif": "", "notas": "alta de Monica"}

# lo que Monica corrigio manda sobre lo extraido
for k, c in CORR.items():
    if k not in empresas:
        continue
    if "nombre" in c:
        empresas[k]["nombre"] = c["nombre"]
    for campo in ("telefono", "direccion", "cif"):
        if c.get(campo):
            empresas[k][campo] = c[campo]
    if c.get("email"):
        empresas[k]["emails"] = c["email"]        # el correcto sustituye al sucio
    if c.get("notas"):
        empresas[k]["notas"] = ((empresas[k]["notas"] + " | ") if empresas[k]["notas"] else "") + c["notas"]

# un renombrado puede fundir dos claves en una
final = {}
for e in empresas.values():
    k = kk(e["nombre"])
    if k in final:
        for campo in ("emails", "telefono", "direccion", "cif", "notas"):
            if not final[k][campo]:
                final[k][campo] = e[campo]
    else:
        final[k] = e
empresas = final

# ---------------------------------------------------------------- personas y puestos
# Si Monica renombro una empresa, los puestos vienen con el nombre viejo:
# hay que traerlos al nuevo o se quedan huerfanos (paso con AlonsoGest).
RENOMBRA = {k: c["nombre"] for k, c in CORR.items() if "nombre" in c}
todos = leer("puestos_final.csv")
for p in todos:
    nuevo = RENOMBRA.get(kk(g(p, "empresa")))
    if nuevo:
        p["empresa"] = nuevo
puestos = [p for p in todos if kk(g(p, "empresa")) in empresas]
descolgados = [p for p in todos if kk(g(p, "empresa")) not in empresas]

# IDENTIDAD = nombre + empresa. El Alberto de Fincas Monge y el de Grupo Integral
# son dos personas distintas: se comprobo uno a uno con el correo. Agrupar solo
# por nombre los fundiria en un unico seNor con dos trabajos, que es falso.
# La excepcion es donde Monica dijo que si es la misma (Paz Terradillo, que
# trabajo en Gesmadrid y monto Ciudadela): esos dos puestos son de UNA persona.
MISMA = {}
for a in leer("altas_personas_empresa.csv"):
    if g(a, "misma_persona_que_en"):
        MISMA[(kk(g(a, "persona")), kk(g(a, "empresa")))] = kk(g(a, "misma_persona_que_en"))

def identidad(p):
    k = (kk(g(p, "persona")), kk(g(p, "empresa")))
    return (k[0], MISMA.get(k, k[1]))

ids_persona = {}
for p in puestos:
    ids_persona.setdefault(identidad(p), g(p, "persona"))
personas = ids_persona

# ---------------------------------------------------------------- correos
gente_de = defaultdict(list)
for p in puestos:
    gente_de[kk(g(p, "empresa"))].append((g(p, "persona"), identidad(p)))

FACTURA = re.compile(r"(?i)factura|conta|admon|cobro")
def de_quien(local, personas_casa):
    """Si el trozo antes de la @ contiene el nombre o el apellido de alguien de
    la casa, el correo es suyo. 'carmen@' -> Carmen; 'info@' -> la empresa."""
    l = kk(local)
    mejor, largo = None, 0
    for nombre, ident in personas_casa:
        for t in re.split(r"[^A-Z0-9]+", (nombre or "").upper().translate(T)):
            if len(t) >= 4 and t in l and len(t) > largo:
                mejor, largo = ident, len(t)
    return mejor

correos = []
for k, e in empresas.items():
    vistos = set()
    for m in RE_MAIL.findall(e["emails"] or ""):
        m = m.strip().lower()
        if m in vistos:
            continue
        vistos.add(m)
        local = m.split("@")[0]
        correos.append({"empresa_k": k, "identidad": de_quien(local, gente_de.get(k, [])),
                        "direccion": m,
                        "etiqueta": "facturacion" if FACTURA.search(local) else "general"})

# ---------------------------------------------------------------- resumen
repetidos = defaultdict(set)
for (n, e) in personas:
    repetidos[n].add(e)
print(f"EMPRESAS a crear : {len(empresas)}")
print(f"PERSONAS a crear : {len(personas)}"
      f"   (de ellas {sum(1 for v in repetidos.values() if len(v) > 1)} nombres que se repiten"
      f" en varias casas y son gente DISTINTA)")
print(f"PUESTOS a crear  : {len(puestos)}")
print(f"CORREOS a crear  : {len(correos)}"
      f"   ({sum(1 for c in correos if c['identidad'])} de persona, "
      f"{sum(1 for c in correos if not c['identidad'])} de empresa)")
if descolgados:
    print(f"\n  OJO: {len(descolgados)} puestos se quedan fuera porque su empresa no entra:")
    for p in descolgados[:10]:
        print(f"     {g(p,'empresa')[:34]:34} {g(p,'persona')}")
cerrados = [p for p in puestos if g(p, "estado") == "cerrado"]
if cerrados:
    print(f"\n  puestos CERRADOS (ya no trabaja ahi): {len(cerrados)}")
    for p in cerrados:
        print(f"     {g(p,'persona')[:28]:28} en {g(p,'empresa')}")

if not APPLY:
    print("\nDRY-RUN. --apply para escribir.")
    sys.exit(0)

# ---------------------------------------------------------------- escribir
# Los id se generan AQUI, no se casan por nombre en SQL: dos personas pueden
# llamarse igual y casar por nombre las fundiria en una sola.
import uuid
hay = sql("select (select count(*) from empresa) e, (select count(*) from persona) p")[0]
if int(hay["e"]) or int(hay["p"]):
    print("\nLas tablas NO estan vacias. Vaciarlas antes de volcar, o esto duplicaria todo.")
    sys.exit(1)

id_empresa = {k: str(uuid.uuid4()) for k in empresas}
id_persona = {k: str(uuid.uuid4()) for k in personas}
id_puesto = {}
for p in puestos:
    id_puesto[(identidad(p), kk(g(p, "empresa")))] = str(uuid.uuid4())

ve = ",".join(f"({esc(id_empresa[k])}::uuid,{esc(e['nombre'])},{nul(e['cif'])},"
              f"{nul(e['direccion'])},{nul(e['telefono'])},{nul(e['notas'])})"
              for k, e in empresas.items())
vp = ",".join(f"({esc(id_persona[k])}::uuid,{esc(n)})" for k, n in personas.items())
vq = ",".join(
    f"({esc(id_puesto[(identidad(p), kk(g(p,'empresa')))])}::uuid,"
    f"{esc(id_persona[identidad(p)])}::uuid,{esc(id_empresa[kk(g(p,'empresa'))])}::uuid,"
    f"{nul(g(p,'cargo'))},{nul(g(p,'numero_colegiado'))},"
    f"{nul('Puesto cerrado: ya no trabaja aqui. Fecha de salida desconocida.' if g(p,'estado')=='cerrado' else '')})"
    for p in puestos)
vc = ",".join(
    f"({nul(id_puesto.get((c['identidad'], c['empresa_k'])) or '')},"
    f"{'null' if c['identidad'] else esc(id_empresa[c['empresa_k']])},"
    f"{esc(c['direccion'])},{esc(c['etiqueta'])})" for c in correos)

ejecutar(f"""
insert into empresa (id, nombre_accesalia, cif, direccion, telefono, notas)
values {ve};

insert into persona (id, nombre) values {vp};

insert into puesto (id, persona_id, empresa_id, cargo, numero_colegiado, notas)
values {vq};

create temp table _c (puesto_id text, empresa_id text, direccion text, etiqueta text);
insert into _c values {vc};
insert into correo (puesto_id, empresa_id, direccion, etiqueta)
select nullif(c.puesto_id,'')::uuid, nullif(c.empresa_id,'')::uuid, c.direccion, c.etiqueta
  from _c c
 where nullif(c.puesto_id,'') is not null or nullif(c.empresa_id,'') is not null;

-- uno principal por dueno: el primero de cada uno
update correo c set principal = true
  from (select distinct on (coalesce(puesto_id::text, empresa_id::text)) id
          from correo order by coalesce(puesto_id::text, empresa_id::text), direccion) p
 where c.id = p.id;

-- el vinculo comunidad -> puesto, para que deje de depender de los scripts
alter table migracion_admin_revision add column if not exists puesto_id uuid references puesto(id);
comment on column migracion_admin_revision.puesto_id is 'Que persona, en que empresa, lleva esta comunidad. Es el dato que alimentara comunidad_admin_responsable.';
""")

# comunidad -> puesto, resuelto con el fichero que ya sabe quien es quien
vinc, pares = leer("personas_por_comunidad.csv"), []
for v in vinc:
    ident = (kk(g(v, "persona")), kk(g(v, "empresa")))
    ident = (ident[0], MISMA.get(ident, ident[1]))
    pid = id_puesto.get((ident, kk(g(v, "empresa"))))
    if pid and g(v, "comunidad_id"):
        pares.append((g(v, "comunidad_id"), pid))
if pares:
    vv = ",".join(f"({esc(c)}::uuid,{esc(p)}::uuid)" for c, p in pares)
    ejecutar(f"""
create temp table _v (comunidad_id uuid, puesto_id uuid);
insert into _v values {vv};
update migracion_admin_revision r set puesto_id = v.puesto_id
  from _v v where r.comunidad_id = v.comunidad_id;""")
print(f"  comunidades enlazadas a su puesto: {len(pares)}")

c = sql("""select (select count(*) from empresa) empresa, (select count(*) from persona) persona,
                  (select count(*) from puesto) puesto, (select count(*) from correo) correo,
                  (select count(*) from migracion_admin_revision where puesto_id is not null) comunidades_con_puesto""")[0]
print(f"\nHECHO: {c}")
