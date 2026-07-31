# -*- coding: utf-8 -*-
r"""
Aplica las respuestas de Monica sobre las comunidades sin municipio fiable.

Ella reviso municipios_a_revisar.csv y escribio la respuesta en una columna
nueva que inserto despues de "comunidad" (asi trabaja: añade columnas). Por eso
la hoja se lee en crudo y no con DictReader, que fundiria las columnas sin
titulo.

Sus notas son texto libre ("Talavera de la Reina, CLM", "guadalajara capital",
"no esta en el monday"). No se interpretan adivinando: cada texto suyo esta en
la tabla RESPUESTAS de abajo con lo que significa. Si aparece un texto que no
esta en la tabla, el script para y avisa, en vez de inventarse un municipio.

Trae municipios nuevos al vocabulario, que hasta ahora salia solo del Dropbox:
Talavera de la Reina, Piedrahita, Avila, Valencia y Quart de Poblet. Y una
correccion de peso: RIO SEGURA 8 LEGANES tiene la ficha archivada en la carpeta
de Madrid, pero es de Leganes. Manda ella, no la carpeta.

Uso: python scripts/aplicar_municipios_revisados.py
"""
import io, os, re, sys, csv, subprocess

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HOJA = r"C:\accesalia-fichas\municipios_a_revisar.csv"
SALIDA = r"C:\accesalia-fichas\MUNICIPIOS_REVISADOS_A_PRODUCCION.sql"

DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-q", "--csv", "-c"]

# Que significa cada cosa de las que escribio. La clave es su texto normalizado.
# None = se queda vacio a proposito.
RESPUESTAS = {
    "municipio piedrahita prov avila com castilla y leon":
        ("PIEDRAHITA", "AVILA", "CASTILLA Y LEON"),
    "avila capital":
        ("AVILA", "AVILA", "CASTILLA Y LEON"),
    "guadalajara capital provincia guadalajara cm castilla la mancha":
        ("GUADALAJARA", "GUADALAJARA", "CASTILLA LA MANCHA"),
    "guadalajara capital":
        ("GUADALAJARA", "GUADALAJARA", "CASTILLA LA MANCHA"),
    "mun talavera de la reina provincia toledo com clm":
        ("TALAVERA DE LA REINA", "TOLEDO", "CASTILLA LA MANCHA"),
    "talavera de la reina clm":
        ("TALAVERA DE LA REINA", "TOLEDO", "CASTILLA LA MANCHA"),
    "valencia capital":
        ("VALENCIA", "VALENCIA", "COMUNIDAD VALENCIANA"),
    "quart de poblet valencia c valenciana":
        ("QUART DE POBLET", "VALENCIA", "COMUNIDAD VALENCIANA"),
    "muni parla cm madrid":
        ("PARLA", "MADRID", "COMUNIDAD DE MADRID"),
    "velilla de san antonio madrid":
        ("VELILLA DE SAN ANTONIO", "MADRID", "COMUNIDAD DE MADRID"),
    "leganes madrid":
        ("LEGANES", "MADRID", "COMUNIDAD DE MADRID"),
    "alcala de henares madrid":
        ("ALCALA DE HENARES", "MADRID", "COMUNIDAD DE MADRID"),
    "alcorcon madrid":
        ("ALCORCON", "MADRID", "COMUNIDAD DE MADRID"),
    "madrid capital":
        ("MADRID", "MADRID", "COMUNIDAD DE MADRID"),
    "no esta en el monday": None,
}

ACENTOS = str.maketrans("ÁÉÍÓÚÜÑáéíóúüñ", "AEIOUUNaeiouun")


def kk(s):
    s = (s or "").translate(ACENTOS).lower()
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def sql(q):
    r = subprocess.run(DB + [q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    t = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(t); sys.exit(1)
    return list(csv.DictReader(io.StringIO(t)))


def lit(v):
    return "null" if v in (None, "") else "'" + str(v).replace("'", "''") + "'"


# ------------------------------------------------------------------- la hoja
filas = list(csv.reader(open(HOJA, encoding="utf-8-sig", newline="")))
cabecera, filas = filas[0], filas[1:]

# su respuesta es la primera columna sin titulo, que inserto despues de comunidad
try:
    col = cabecera.index("")
except ValueError:
    print("No encuentro la columna que añadio Monica. ¿Se ha guardado la hoja?")
    sys.exit(1)
print(f"su respuesta esta en la columna {col} (sin titulo, tras '{cabecera[0]}')")

# --------------------------------------------------------------- interpretar
decisiones, sin_entender, vacias = [], [], []
for f in filas:
    nombre = f[0].strip()
    nota = f[col].strip() if len(f) > col else ""
    if not nota:
        sin_entender.append((nombre, "(no escribio nada)"))
        continue
    clave = kk(nota)
    if clave not in RESPUESTAS:
        sin_entender.append((nombre, nota))
        continue
    trio = RESPUESTAS[clave]
    if trio is None:
        vacias.append(nombre)
    else:
        decisiones.append((nombre, trio, nota))

if sin_entender:
    print("\nHay notas que no se de que son. No se toca nada hasta aclararlo:")
    for n, nota in sin_entender:
        print(f"   {n}  ->  {nota!r}")
    sys.exit(1)

print(f"\ncomunidades a rellenar: {len(decisiones)}")
print(f"se quedan vacias a proposito (no estan en Monday): {len(vacias)}")
for n in vacias:
    print(f"   {n}")

# ------------------------------------------------ casar el nombre con su id
por_nombre = {}
for c in sql("select id, nombre, municipio from comunidades"):
    por_nombre.setdefault(c["nombre"], c)

updates, huerfanas = [], []
for nombre, (muni, prov, auto), nota in decisiones:
    c = por_nombre.get(nombre)
    if not c:
        huerfanas.append(nombre)
        continue
    if (c["municipio"] or "") == muni:
        continue                      # ya estaba bien, no hace falta tocarla
    updates.append((c["id"], muni, prov, auto, nombre, nota))

if huerfanas:
    print("\nEstas no las encuentro en comunidades (¿cambio el nombre?):")
    for n in huerfanas:
        print(f"   {n}")
    sys.exit(1)

print(f"cambian de verdad: {len(updates)}  (el resto ya estaba bien)")

# vocabulario nuevo que entra con esta tanda
ya = {c["municipio"] for c in sql("select distinct municipio from comunidades where municipio is not null")}
nuevos = sorted({u[1] for u in updates} - ya)
if nuevos:
    print(f"municipios que no existian en el vocabulario: {', '.join(nuevos)}")

# ------------------------------------------------------------------------ SQL
lineas = [
    "-- =============================================================================",
    "-- Municipios revisados a mano por Monica",
    "--",
    "-- Las 31 que quedaron vacias tras el cruce con el Dropbox, mas las 3 en las que",
    "-- la carpeta y el nombre discrepaban. Ella las miro una a una contra Monday.",
    "--",
    "-- Entran municipios que el Dropbox no tenia: Talavera de la Reina, Piedrahita,",
    "-- Avila, Valencia y Quart de Poblet. Y con Piedrahita y Avila entra una",
    "-- autonomia nueva, Castilla y Leon.",
    "--",
    "-- Siete comunidades se quedan vacias a proposito: no estan en Monday y no ha",
    "-- podido localizarlas. Vacio significa que no se sabe, que es la verdad.",
    "-- =============================================================================",
    "",
    "begin;",
    "",
]
for cid, muni, prov, auto, nombre, nota in sorted(updates, key=lambda x: x[4]):
    lineas.append(f"-- {nombre}  ->  {nota}")
    lineas.append(
        f"update comunidades set municipio = {lit(muni)}, provincia = {lit(prov)}, "
        f"comunidad_autonoma = {lit(auto)} where id = '{cid}';"
    )
lineas += [
    "",
    "commit;",
    "",
    "select coalesce(comunidad_autonoma,'(vacia)') as autonomia,",
    "       coalesce(provincia,'(vacia)') as provincia,",
    "       count(*) as comunidades",
    "  from comunidades group by 1,2 order by 3 desc;",
    "",
]
open(SALIDA, "w", encoding="utf-8").write("\n".join(lineas))
print(f"\n-> {SALIDA}  ({len(updates)} updates)")
