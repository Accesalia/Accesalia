# -*- coding: utf-8 -*-
r"""
Genera el fichero SQL que lleva el modelo nuevo a produccion.

Todo va en UNA transaccion: o entra entero o no entra nada. Y antes de borrar
nada comprueba que el vinculo nuevo cubre al viejo; si no cuadra, aborta.

Que hace el SQL generado:
   1. crea las 6 tablas nuevas
   2. mete los datos (los uuid son los nuestros; en produccion no existen)
   3. anade las 14 filas que produccion no tiene (presidentes y observaciones)
   4. EXPANDE: columnas nuevas al lado de las viejas, rellenadas
   5. COMPRUEBA que no se pierde nada
   6. CONTRAE: borra columnas viejas y las 3 tablas del modelo antiguo

El comercial_id se traduce aqui: los tres comerciales tienen uuid distinto en
cada base y se casan por nombre, no por id.

Uso: python scripts/generar_subida_produccion.py
"""
import io, os, sys, csv, subprocess
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

SALIDA = r"C:\accesalia-fichas\SUBIR_A_PRODUCCION.sql"
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-q", "--csv", "-c"]

# los tres comerciales: uuid de local -> uuid de produccion (casados por nombre)
COMERCIAL = {
    "0a51f94e-dfcd-4acd-accd-5c2eadcd4b0f": "4dd3347a-d885-4439-aafb-dc3f7f7acd95",  # Alvaro De Soto
    "eae55eea-b83b-4b04-b934-b00bcad5dd37": "739e7fb5-2025-469e-b43c-1823319ee0e4",  # Carlosg
    "3ed96a40-1f25-4056-be9a-9b25b86fc660": "72495d1c-0090-4346-b167-ed852fd69960",  # Daniel de Soto
}

# nombres que se escriben distinto en produccion y en nuestro modelo. Salen del
# puente de la retirada en local, ya revisado con Monica.
EQUIVALENCIAS = [
    ("ACAYMA", "ACAYMA ASESORES"),
    ("AEA / MC GESTION FINCAS", "MC GESTION ADMINISTRACION DE FINCAS"),
    ("ABACO", "ABACO CONSULTORES Y ASESORES, S.L."),
    ("ABOGADOS DE COSLADA", "ABOGADOS Y FINCAS COSLADA"),
    ("ADMINISTRACIONES RIVERA", "RIVERA"),
    ("AMGESTION", "AM EUROGESTION SL"),
    ("ARESTE", "CUESTA Y ARESTE"),
    ("BUJARUELO", "GESTIONES Y FINCAS BUJARUELO, S.L."),
    ("DIMAS RODRIGUEZ RODRIGUEZ", "Asesoría DR"),
    ("FINCASA", "FINCASA FIXCONTE"),
    ("GESTORIA JIMENEZ MLJP, SLP", "Gestoría Jiménez"),
    ("LOZANO PASIPE", "Lozano Masipie SLP"),
    ("MIR YARA", "YARA ASESORES"),
    ("MONGE", "FINCAS MONGE"),
    ("ROSARIO MOLANO", "Gestoria MyM"),
    ("SANCHEZ ADMINISTRADOR DE FINCAS", "INMHO Gestion de la Propiedad (MOSTOLES)"),
    ("VERCO", "FINCAS VERCO SL"),
]

def sql(q):
    r = subprocess.run(DB + [q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    t = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(t); sys.exit(1)
    return list(csv.DictReader(io.StringIO(t)))

def lit(v):
    """Un valor tal cual, listo para meter en un VALUES."""
    if v is None or v == "":
        return "null"
    return "'" + str(v).replace("\\", "\\\\").replace("'", "''") + "'"

def volcar(tabla, columnas, orden="id", traducir=None):
    """Las filas de una tabla como INSERT de varias filas."""
    filas = sql(f"select {', '.join(columnas)} from {tabla} order by {orden}")
    if not filas:
        return f"-- {tabla}: sin filas\n"
    vals = []
    for f in filas:
        if traducir:
            f = traducir(f)
        vals.append("(" + ",".join(lit(f[c]) for c in columnas) + ")")
    out = [f"insert into {tabla} ({', '.join(columnas)}) values"]
    # en tandas de 200 para que ningun statement sea gigantesco
    for i in range(0, len(vals), 200):
        trozo = vals[i:i+200]
        if i:
            out.append(f"insert into {tabla} ({', '.join(columnas)}) values")
        out.append(",\n".join("  " + v for v in trozo) + ";")
    return "\n".join(out) + "\n"

# ---------------------------------------------------------------- DDL
ddl = subprocess.run(
    ["docker", "exec", "supabase_db_ACCESALIA", "pg_dump", "-U", "postgres", "-d", "postgres",
     "--schema-only", "--no-owner", "--no-privileges",
     "-t", "empresa", "-t", "empresa_departamento", "-t", "persona", "-t", "puesto",
     "-t", "correo", "-t", "comunidad_admin_responsable"],
    stdout=subprocess.PIPE).stdout.decode("utf-8", "replace")
# se quitan las lineas de configuracion de sesion, que en el editor sobran
ddl = "\n".join(l for l in ddl.split("\n")
                if not l.startswith(("SET ", "SELECT pg_catalog", "--", "\\")) and l.strip())

def tr_empresa(f):
    f = dict(f)
    f["comercial_id"] = COMERCIAL.get(f["comercial_id"], f["comercial_id"] or "")
    return f

partes = [f"""-- =============================================================================
-- SUBIDA A PRODUCCION — modelo de empresas, personas y administracion
--
-- TODO EN UNA TRANSACCION. Si algo falla, no entra nada.
--
-- Lo que hace:
--   1. crea empresa, empresa_departamento, persona, puesto, correo y
--      comunidad_admin_responsable
--   2. mete los datos ya depurados
--   3. anade 14 filas que produccion no tenia (8 presidentes, 6 observaciones)
--   4. reapunta lo que colgaba del modelo viejo
--   5. COMPRUEBA que no se pierde nada; si no cuadra, aborta
--   6. borra administraciones_fincas, administradores y contactos
--
-- Los uuid de comunidades ya son los de produccion: se alinearon en local.
-- Los de comerciales se traducen aqui, porque son distintos en cada base.
-- =============================================================================

begin;

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- 1. las tablas
-- ---------------------------------------------------------------------------
{ddl}

-- ---------------------------------------------------------------------------
-- 2. los datos
-- ---------------------------------------------------------------------------
"""]

partes.append(volcar("empresa",
    ["id","creado_en","actualizado_en","nombre_accesalia","nombre_legal","cif",
     "direccion","telefono","activa","notas","comercial_id"],
    orden="nombre_accesalia", traducir=tr_empresa))
partes.append(volcar("empresa_departamento",
    ["id","creado_en","actualizado_en","empresa_id","departamento","telefono","notas"]))
partes.append(volcar("persona", ["id","creado_en","actualizado_en","nombre","activa","notas"], orden="nombre"))
partes.append(volcar("puesto",
    ["id","creado_en","actualizado_en","persona_id","empresa_id","departamento_id","cargo",
     "numero_colegiado","telefono_empresa","telefono_personal","desde","hasta","notas"]))
partes.append(volcar("correo",
    ["id","creado_en","actualizado_en","puesto_id","departamento_id","empresa_id",
     "direccion","etiqueta","principal","notas"]))
partes.append(volcar("comunidad_admin_responsable",
    ["id","creado_en","actualizado_en","comunidad_id","puesto_id","empresa_id",
     "vigente","desde","hasta","notas"]))

open(SALIDA, "w", encoding="utf-8").write("\n".join(partes))
print(f"parte 1 (tablas + datos) -> {SALIDA}  ({os.path.getsize(SALIDA)//1024} KB)")
