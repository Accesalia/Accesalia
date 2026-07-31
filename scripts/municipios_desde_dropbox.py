# -*- coding: utf-8 -*-
r"""
Municipio, provincia y comunidad autonoma de cada comunidad, desde el Dropbox.

De donde sale el dato, y por que este camino y no otro:

El nombre de la comunidad acaba en la localidad, pero extraerlo del texto da
basura ("PARLA MADRID", "44 46 48 50 52 54", "PORTAL 1"): asi se hizo la primera
vez y hay 90 comunidades mal. El Dropbox lo resuelve sin adivinar nada, porque
cada ficha se extrajo de una carpeta de comunidad que vive dentro de una carpeta
de localidad:

    Ascensores y rehabilitaciones\<AUTONOMIA>\<PROVINCIA>\<MUNICIPIO>\<comunidad>

Madrid es el caso raro por ser uniprovincial: la capital cuelga directa
(es_provincia = false) y el resto de municipios van bajo 1APROVINCIA\.

migracion_ficha guarda esa ruta Y el comunidad_id, asi que el vinculo es
directo. Sobrevivio al cambio de ids de agosto porque su clave ajena quedo en
on update cascade. En produccion esta tabla ya no existe; en local si, y por eso
el calculo se hace aqui y se sube como UPDATE.

Lo que NO hace: inventar. Una comunidad sin ficha solo se rellena si algun
municipio de la lista cerrada del Dropbox aparece literalmente en su nombre o
en el municipio que ya tenia. Al ser lista cerrada, no puede salir un "PARLA
MADRID": o es un municipio real o no es nada. Lo demas se queda vacio y sale en
una hoja para que lo mire Monica.

Uso: python scripts/municipios_desde_dropbox.py
"""
import io, os, sys, csv, subprocess

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hoja import escribir_hoja

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

SALIDA = r"C:\accesalia-fichas\MUNICIPIOS_A_PRODUCCION.sql"
REVISAR = r"C:\accesalia-fichas\municipios_a_revisar.csv"
RESPALDO = r"C:\accesalia-fichas\municipios_antes_del_cambio.csv"

DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-q", "--csv", "-c"]

# La autonomia por su carpeta raiz. Madrid no aparece en la ruta cuando el
# municipio cuelga de 1APROVINCIA, asi que es el valor por defecto.
AUTONOMIA = {
    "CASTILLA LA MANCHA": "CASTILLA LA MANCHA",
    "COMUNIDAD VALENCIANA": "COMUNIDAD VALENCIANA",
    "CASTILLA Y LEON": "CASTILLA Y LEON",
    "CATALUÑA": "CATALUÑA",
}


def sql(q):
    r = subprocess.run(DB + [q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    t = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(t); sys.exit(1)
    return list(csv.DictReader(io.StringIO(t)))


def lit(v):
    return "null" if v in (None, "") else "'" + str(v).replace("'", "''") + "'"


ACENTOS = str.maketrans("ÁÉÍÓÚÜÑáéíóúüñ", "AEIOUUNaeiouun")


def kk(s):
    """Texto comparable: sin acentos, en mayusculas, sin puntuacion ni dobles espacios.

    Hace falta porque los nombres van escritos de mil maneras: GRINON y GRIÑON,
    SAN SEBASTIAN y SAN SEBASTIÁN, TALAVERA DE LA REINA.TOLEDO con el punto.
    """
    import re
    s = (s or "").translate(ACENTOS).upper()
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def descomponer(localidad):
    """De la carpeta de localidad a (municipio, provincia, autonomia).

    Sin barras es Madrid: la carpeta ES el municipio y la provincia es Madrid.
    Con barras, la ruta trae la autonomia delante y la provincia detras; el
    municipio es el ultimo tramo, salvo cuando la comunidad cuelga directa de la
    provincia, que entonces es la capital y coinciden.
    """
    tramos = [t for t in localidad.split("\\") if t and t != "1PROVINCIA"]
    if len(tramos) == 1 and tramos[0] not in AUTONOMIA:
        return tramos[0], "MADRID", "COMUNIDAD DE MADRID"
    autonomia = AUTONOMIA.get(tramos[0], "COMUNIDAD DE MADRID")
    provincia = tramos[1] if len(tramos) > 1 else tramos[0]
    municipio = tramos[-1]          # si es la capital, coincide con la provincia
    return municipio, provincia, autonomia


# --------------------------------------------------------------- desde fichas
fichas = sql("""
select distinct comunidad_id, localidad
from migracion_ficha
where comunidad_id is not null and localidad is not null and localidad <> ''
""")

desde_ficha, contradictorias = {}, []
for f in fichas:
    trio = descomponer(f["localidad"])
    previo = desde_ficha.get(f["comunidad_id"])
    if previo and previo != trio:
        contradictorias.append((f["comunidad_id"], previo, trio))
        continue
    desde_ficha[f["comunidad_id"]] = trio

print(f"comunidades resueltas por su ficha: {len(desde_ficha)}")
if contradictorias:
    print(f"  OJO: {len(contradictorias)} con fichas en localidades distintas; se dejan fuera")
    for c in contradictorias:
        desde_ficha.pop(c[0], None)

# La lista cerrada de municipios reales. Se construye con TODAS las carpetas de
# localidad, tengan comunidad enlazada o no: son municipios igualmente.
catalogo = {}
for f in sql("select distinct localidad from migracion_ficha where localidad is not null and localidad <> ''"):
    muni, prov, auto = descomponer(f["localidad"])
    catalogo[muni] = (prov, auto)
print(f"municipios distintos en el Dropbox: {len(catalogo)}")

# ------------------------------------------------------------ las comunidades
comunidades = sql("select id, nombre, municipio, provincia from comunidades order by nombre")

# El catalogo indexado por su forma comparable, del nombre mas largo al mas
# corto: asi "HUMANES DE MADRID" gana a "MADRID" cuando los dos encajan.
#
# Fuera del rastreo por nombre quedan las capitales de provincia de fuera de
# Madrid (Toledo, Guadalajara). Motivo: en los nombres, la provincia va detras
# del municipio ("TALAVERA DE LA REINA TOLEDO"), asi que casarian con la capital
# y seria falso. Madrid si entra: es uniprovincial y ahi no hay confusion, y
# ademas gana siempre el municipio que termina mas tarde.
CAPITALES_FUERA = {m for m, (prov, auto) in catalogo.items()
                   if m == prov and auto != "COMUNIDAD DE MADRID"}
catalogo_kk = sorted(((kk(m), m) for m in catalogo if m not in CAPITALES_FUERA),
                     key=lambda x: -len(x[0]))
if CAPITALES_FUERA:
    print(f"fuera del rastreo por nombre (capitales de provincia): {', '.join(sorted(CAPITALES_FUERA))}")


def buscar_en_texto(texto):
    """El municipio de la lista cerrada que aparece en el texto, el ultimo.

    "MADRID 38-40 HUMANES DE MADRID" es Humanes: el nombre de la comunidad
    empieza por la calle y acaba por la localidad, asi que gana el que termina
    mas tarde, y a igualdad de final, el mas largo.
    """
    t = kk(texto)
    if not t:
        return None
    mejor = None
    for clave, muni in catalogo_kk:
        pos = t.rfind(clave)
        if pos < 0:
            continue
        # solo vale si encaja en palabras completas, no dentro de otra
        antes_ok = pos == 0 or t[pos - 1] == " "
        fin = pos + len(clave)
        despues_ok = fin == len(t) or t[fin] == " "
        if not (antes_ok and despues_ok):
            continue
        if mejor is None or fin > mejor[0] or (fin == mejor[0] and len(clave) > len(mejor[1])):
            mejor = (fin, clave, muni)
    return mejor[2] if mejor else None


nuevos, revisar = {}, []
for c in comunidades:
    if c["id"] in desde_ficha:
        nuevos[c["id"]] = desde_ficha[c["id"]] + ("ficha",)
        continue
    # sin ficha: se busca un municipio real, primero en lo que ya tenia y
    # luego en el nombre de la comunidad, que acaba en la localidad
    muni = buscar_en_texto(c["municipio"])
    origen = "municipio que ya tenia"
    if not muni:
        muni = buscar_en_texto(c["nombre"])
        origen = "nombre de la comunidad"
    if muni:
        prov, auto = catalogo[muni]
        nuevos[c["id"]] = (muni, prov, auto, origen)
        continue
    revisar.append([c["nombre"], c["municipio"] or "", "(se queda vacio)",
                    "sin municipio y sin pista en el nombre" if not (c["municipio"] or "").strip()
                    else "ningun municipio real aparece en el nombre"])

# Las que si se rellenan pero donde la carpeta contradice al nombre. Gana la
# carpeta (el dato duro), pero se avisan: puede ser una ficha mal archivada.
for c in comunidades:
    if c["id"] not in desde_ficha:
        continue
    dice_el_nombre = buscar_en_texto(c["nombre"])
    puesto = desde_ficha[c["id"]][0]
    if dice_el_nombre and dice_el_nombre != puesto:
        revisar.append([c["nombre"], c["municipio"] or "", puesto,
                        f"la carpeta del Dropbox dice {puesto} y el nombre dice {dice_el_nombre}"])

por_origen = {}
for v in nuevos.values():
    por_origen[v[3]] = por_origen.get(v[3], 0) + 1
print(f"\nse rellenan {len(nuevos)}:")
for k, v in sorted(por_origen.items(), key=lambda x: -x[1]):
    print(f"   {v:5}  {k}")
print(f"a revisar a mano: {len(revisar)}")

# cuantas cambian de valor respecto a lo que hay
cambian = sum(1 for c in comunidades
              if c["id"] in nuevos and (c["municipio"] or "") != nuevos[c["id"]][0])
print(f"de las rellenadas, cambian de municipio: {cambian}")

# ------------------------------------------------------------------- respaldo
with open(RESPALDO, "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["id", "nombre", "municipio_antes", "provincia_antes"])
    for c in comunidades:
        w.writerow([c["id"], c["nombre"], c["municipio"] or "", c["provincia"] or ""])
print(f"\nrespaldo de lo que hay ahora -> {RESPALDO}")

# ------------------------------------------------------------------------ SQL
lineas = [
    "-- =============================================================================",
    "-- Municipio, provincia y comunidad autonoma de cada comunidad",
    "--",
    "-- El dato sale de la carpeta del Dropbox de la que se extrajo la ficha, no de",
    "-- adivinar el final del nombre. Lo que no tiene ficha solo se rellena si el",
    "-- municipio que ya tenia esta en la lista cerrada de municipios reales.",
    "-- Lo que no casa se queda vacio a proposito: esta en municipios_a_revisar.csv.",
    "-- =============================================================================",
    "",
    "begin;",
    "",
    "alter table comunidades add column if not exists comunidad_autonoma text;",
    "comment on column comunidades.comunidad_autonoma is 'Autonomia del edificio. Se deriva del municipio, no se teclea.';",
    "",
    "-- se limpia lo que habia: estaba extraido del nombre y 90 filas eran basura",
    "update comunidades set municipio = null, provincia = null;",
    "",
    "-- y se rellena de una vez, que es una sola pasada y no 1.200",
    "update comunidades c",
    "   set municipio = v.municipio, provincia = v.provincia,",
    "       comunidad_autonoma = v.comunidad_autonoma",
    "  from (values",
]
filas_valores = [
    f"    ('{cid}'::uuid, {lit(muni)}, {lit(prov)}, {lit(auto)})"
    for cid, (muni, prov, auto, origen) in sorted(nuevos.items(), key=lambda x: x[1][0])
]
lineas.append(",\n".join(filas_valores))
lineas += [
    "  ) as v(id, municipio, provincia, comunidad_autonoma)",
    " where c.id = v.id;",
    "",
    "-- comprobacion: ninguna comunidad puede quedar con provincia pero sin municipio",
    "do $$",
    "declare v_mal bigint;",
    "begin",
    "  select count(*) into v_mal from comunidades",
    "   where (municipio is null) <> (provincia is null)",
    "      or (municipio is null) <> (comunidad_autonoma is null);",
    "  if v_mal > 0 then",
    "    raise exception 'Hay % comunidades con las tres columnas descuadradas', v_mal;",
    "  end if;",
    "end $$;",
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
print(f"SQL para produccion         -> {SALIDA}  ({len(nuevos)} updates)")

# La columna vacia del final es para que Monica escriba el municipio bueno; el
# script que aplique sus respuestas la leera con leer_hoja y respetara cualquier
# otra columna que ella añada por su cuenta.
escribir_hoja(REVISAR,
              ["comunidad", "municipio_que_tenia", "que_se_ha_puesto", "por_que",
               "MUNICIPIO_CORRECTO"],
              [f + [""] for f in sorted(revisar)],
              f"{len(revisar)} comunidades para mirar a mano")
