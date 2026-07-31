# -*- coding: utf-8 -*-
r"""
Convierte los 491 nombres de administracion de migracion_admin_revision (que son
COMUNIDADES, con la empresa repetida) en 317 empresas con id propio, y deja cada
comunidad apuntando a la suya (empresa_id).

Ese vinculo es lo que da valor al id: cuando el cotejo decida que una empresa
nuestra es una de las que ya existen, cambiar una fila del puente arrastra a
todas sus comunidades.

Agrupa solo por nombre_norm (conservadora: tildes, puntuacion, espacios). NO
fusiona por parecido: eso es una decision humana y sale en el cotejo.

Idempotente: rehace la tabla de empresas y los vinculos.

DRY-RUN por defecto. --apply para escribir.
Uso: python scripts/construir_empresas_admin.py [--apply]
"""
import sys, io, re, csv, subprocess
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

APPLY = "--apply" in sys.argv
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

SIN_TILDE = str.maketrans("áéíóúüñÁÉÍÓÚÜÑ", "aeiouunAEIOUUN")

def norm(v):
    """Conservadora: solo diferencias de escritura del MISMO texto."""
    return re.sub(r"[^A-Z0-9]", "", (v or "").translate(SIN_TILDE).upper())

# Ruido que no distingue a una administracion de otra. Se quita SOLO para
# proponer candidatas, nunca para agrupar.
FORMA = r"S\s*L\s*U|S\s*L\s*P|S\s*L|S\s*A\s*U|S\s*A|C\s*B|S\s*C"
OFICIO = (r"ADMINISTRACIONESDEFINCAS|ADMINISTRACIONDEFINCAS|ADMINISTRADORESDEFINCAS|"
          r"ADMINISTRADORDEFINCAS|ADMINISTRACIONES|ADMINISTRACION|ADMINISTRADORES|"
          r"ADMINISTRADOR|DEFINCAS|GESTIONDEFINCAS")

def clave(v):
    k = norm(v)
    k = re.sub(r"(?:%s)$" % FORMA.replace(r"\s*", ""), "", k)
    k = re.sub(OFICIO, "", k)
    return k or norm(v)

filas = sql("""
select comunidad_id, comunidad, localidad, nombre, email, telefono, direccion
  from migracion_admin_revision where nombre <> '' order by nombre""")
print(f"comunidades con administracion: {len(filas)}")

grupos = defaultdict(list)
for f in filas:
    grupos[norm(f["nombre"])].append(f)
print(f"empresas distintas (nombre_norm): {len(grupos)}")

empresas = []
for k, fs in grupos.items():
    escrituras = sorted({f["nombre"] for f in fs}, key=len, reverse=True)
    def primero(c):
        return next((f[c] for f in fs if f[c]), "")
    empresas.append({
        "norm": k, "nombre": escrituras[0],
        "variantes": " | ".join(escrituras[1:]),
        "clave": clave(escrituras[0]), "n": len(fs),
        "email": primero("email"), "telefono": primero("telefono"),
        "direccion": primero("direccion"),
        "comunidades": [f["comunidad_id"] for f in fs],
    })
empresas.sort(key=lambda e: -e["n"])

print(f"\n  con varias escrituras del mismo nombre : {sum(1 for e in empresas if e['variantes'])}")
print(f"  con mas de una comunidad              : {sum(1 for e in empresas if e['n'] > 1)}")
print(f"  con email                             : {sum(1 for e in empresas if e['email'])}")
print("\n  las que mas comunidades tienen:")
for e in empresas[:8]:
    print(f"     {e['n']:3}  {e['nombre'][:58]}")

# Aviso: distintas por nombre_norm pero iguales por clave_busqueda. NO se
# fusionan aqui; se ensenan porque son las primeras candidatas del cotejo.
por_clave = defaultdict(list)
for e in empresas:
    por_clave[e["clave"]].append(e)
juntas = [v for v in por_clave.values() if len(v) > 1]
print(f"\n  grupos que la clave de busqueda uniria (NO se unen aqui): {len(juntas)}")
for g in juntas[:8]:
    print(f"     {' <-> '.join(e['nombre'][:34] for e in g)}")

if not APPLY:
    print("\nDRY-RUN. --apply para escribir.")
    sys.exit(0)

vals = ",".join("(" + ",".join([esc(e["nombre"]), esc(e["norm"]), esc(e["clave"]),
                                esc(e["variantes"]), str(e["n"]), esc(e["email"]),
                                esc(e["telefono"]), esc(e["direccion"])]) + ")"
                for e in empresas)
links = "\n".join(
    f"update migracion_admin_revision set empresa_id = "
    f"(select id from migracion_admin_empresa where nombre_norm = {esc(e['norm'])}) "
    f"where comunidad_id in ({','.join(esc(c) + '::uuid' for c in e['comunidades'])});"
    for e in empresas)

# OJO: no se borra y se vuelve a crear. Los id tienen que SOBREVIVIR al rehacer:
# las hojas que revisa Monica se casan por empresa_id, y regenerarlos dejaba su
# trabajo huerfano. Se conserva la fila que ya existia con el mismo nombre_norm.
stmt = ("update migracion_admin_revision set empresa_id = null;\n"
        "create temp table _emp (nombre text, nombre_norm text, clave_busqueda text, "
        "variantes text, n_comunidades int, email text, telefono text, direccion text);\n"
        "insert into _emp values\n" + vals + ";\n"
        "insert into migracion_admin_empresa (nombre, nombre_norm, clave_busqueda, "
        "variantes, n_comunidades, email, telefono, direccion)\n"
        "select e.* from _emp e where not exists (select 1 from migracion_admin_empresa a "
        "where a.nombre_norm = e.nombre_norm);\n"
        "update migracion_admin_empresa a set nombre = e.nombre, clave_busqueda = e.clave_busqueda,\n"
        "  variantes = e.variantes, n_comunidades = e.n_comunidades, email = e.email,\n"
        "  telefono = e.telefono, direccion = e.direccion\n"
        "  from _emp e where a.nombre_norm = e.nombre_norm;\n"
        # las que ya no salen en ninguna ficha se van, con su fila del puente
        "delete from migracion_admin_cotejo c where c.empresa_id in\n"
        "  (select a.id from migracion_admin_empresa a\n"
        "    where not exists (select 1 from _emp e where e.nombre_norm = a.nombre_norm));\n"
        "delete from migracion_admin_empresa a\n"
        "  where not exists (select 1 from _emp e where e.nombre_norm = a.nombre_norm);\n"
        + links + "\n")
r = subprocess.run(DB, input=("begin;\n" + stmt + "commit;").encode("utf-8"),
                   stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
salida = r.stdout.decode("utf-8", "replace").strip()
if r.returncode:
    print(salida); sys.exit(1)

# El vinculo tiene que cubrir a TODAS: si falta alguna, el id no sirve para ella
c = sql("""select count(*) filter (where empresa_id is not null) con,
                  count(*) filter (where nombre <> '' and empresa_id is null) sin
             from migracion_admin_revision""")[0]
print(f"\nHECHO: {len(empresas)} empresas, {c['con']} comunidades vinculadas, "
      f"{c['sin']} sin vincular")
if int(c["sin"]):
    sys.exit(1)
