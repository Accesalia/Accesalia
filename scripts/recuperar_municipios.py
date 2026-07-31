# -*- coding: utf-8 -*-
r"""
Devuelve el municipio a empresa, desde el respaldo de produccion.

El municipio se perdio al retirar administraciones_fincas: empresa tiene
direccion (texto libre) pero no municipio, y el municipio hace falta para
filtrar la cartera por zona.

Casa por nombre normalizado. Los nombres que se escriben distinto salen de la
misma lista de equivalencias que se uso al subir a produccion, para no volver a
inventar reglas.

Los id de empresa son los mismos en local y en produccion (local se subio tal
cual), asi que el cruce se hace contra local y el SQL vale para las dos.

Uso: python scripts/recuperar_municipios.py
"""
import io, os, re, sys, csv, subprocess

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

RESPALDO = r"C:\accesalia-fichas\_respaldo_modelo_2026-07-30\RESCATE_PRODUCCION.sql"
SALIDA = r"C:\accesalia-fichas\RECUPERAR_MUNICIPIOS.sql"
SIN_CASAR = r"C:\accesalia-fichas\municipios_sin_casar.csv"

DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-q", "--csv", "-c"]

# columnas de administraciones_fincas, en el orden del insert del respaldo
COLS = ["id", "creado_en", "actualizado_en", "nombre", "cif", "telefono", "email",
        "direccion", "municipio", "notas", "activo", "estado", "fecha_paso_a_cliente",
        "motivo_fin", "fecha_fin", "titular_id", "comercial_id", "comercial_captador_id",
        "fecha_alta_cartera", "fecha_ultimo_contacto", "fecha_ultimo_encargo"]

# nombre viejo -> nombre_accesalia. La misma lista de generar_subida_produccion.py.
EQUIVALENCIAS = {
    "ACAYMA": "ACAYMA ASESORES",
    "AEA / MC GESTION FINCAS": "MC GESTION ADMINISTRACION DE FINCAS",
    "ABACO": "ABACO CONSULTORES Y ASESORES, S.L.",
    "ABOGADOS DE COSLADA": "ABOGADOS Y FINCAS COSLADA",
    "ADMINISTRACIONES RIVERA": "RIVERA",
    "AMGESTION": "AM EUROGESTION SL",
    "ARESTE": "CUESTA Y ARESTE",
    "BUJARUELO": "GESTIONES Y FINCAS BUJARUELO, S.L.",
    "DIMAS RODRIGUEZ RODRIGUEZ": "Asesoría DR",
    "FINCASA": "FINCASA FIXCONTE",
    "GESTORIA JIMENEZ MLJP, SLP": "Gestoría Jiménez",
    "LOZANO PASIPE": "Lozano Masipie SLP",
    "MIR YARA": "YARA ASESORES",
    "MONGE": "FINCAS MONGE",
    "ROSARIO MOLANO": "Gestoria MyM",
    "SANCHEZ ADMINISTRADOR DE FINCAS": "INMHO Gestion de la Propiedad (MOSTOLES)",
    "VERCO": "FINCAS VERCO SL",
}

ACENTOS = str.maketrans("ÁÉÍÓÚÜÑáéíóúüñ", "AEIOUUNaeiouun")


def kk(s):
    """Nombre comparable: sin acentos, sin puntuacion, sin S.L. ni plurales de espacio."""
    s = (s or "").translate(ACENTOS).upper()
    s = re.sub(r"[.,&]", " ", s)
    s = re.sub(r"\b(S\s*L\s*U?|SLP|SCP|SL|SA)\b", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def trocea(s):
    """Los valores de un VALUES(...) de postgres, respetando las comillas dobladas."""
    out, cur, dentro, i = [], "", False, 0
    while i < len(s):
        c = s[i]
        if dentro:
            if c == "'" and i + 1 < len(s) and s[i + 1] == "'":
                cur += "'"; i += 2; continue
            if c == "'":
                dentro = False; i += 1; continue
            cur += c; i += 1; continue
        if c == "'":
            dentro = True; i += 1; continue
        if c == ",":
            out.append(cur); cur = ""; i += 1; continue
        cur += c; i += 1
    out.append(cur)
    return out


def sql(q):
    r = subprocess.run(DB + [q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    t = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(t); sys.exit(1)
    return list(csv.DictReader(io.StringIO(t)))


def lit(v):
    return "'" + str(v).replace("'", "''") + "'"


# ------------------------------------------------------------------ el respaldo
texto = open(RESPALDO, encoding="utf-8").read()
filas = re.findall(r"insert into administraciones_fincas values \((.*?)\);\n", texto, re.S)

viejas = []
for f in filas:
    v = trocea(f)
    if len(v) != len(COLS):
        continue
    d = dict(zip(COLS, v))
    # las creadas el 27-jul son las 150 filas basura; no aportan municipio
    if d["creado_en"].startswith("2026-07-27"):
        continue
    if d["municipio"] in ("NULL", ""):
        continue
    viejas.append(d)

print(f"administraciones del respaldo con municipio: {len(viejas)}")

# ------------------------------------------------------------------ las empresas
empresas = sql("select id, nombre_accesalia from empresa order by nombre_accesalia")
por_nombre = {}
for e in empresas:
    por_nombre.setdefault(kk(e["nombre_accesalia"]), e)
print(f"empresas en el modelo nuevo: {len(empresas)}")

# ------------------------------------------------------------------ el cruce
casadas, huerfanas, choques = {}, [], []
for d in viejas:
    nombre = EQUIVALENCIAS.get(d["nombre"].strip(), d["nombre"])
    e = por_nombre.get(kk(nombre))
    if not e:
        huerfanas.append(d)
        continue
    # en mayusculas, como los de comunidades: es el mismo concepto y los filtros
    # tienen que poder cruzarse sin andar normalizando en cada consulta
    muni = d["municipio"].strip().upper()
    previo = casadas.get(e["id"])
    if previo and previo[0] != muni:
        # dos administraciones viejas fundidas en una empresa con municipio distinto
        choques.append((e["nombre_accesalia"], previo[0], muni))
        continue
    casadas[e["id"]] = (muni, e["nombre_accesalia"])

print(f"casadas: {len(casadas)}   sin casar: {len(huerfanas)}   con municipio en conflicto: {len(choques)}")
for c in choques:
    print(f"   CONFLICTO  {c[0]}: se queda '{c[1]}', se descarta '{c[2]}'")

# ------------------------------------------------------------------ el SQL
lineas = [
    "-- Municipios recuperados del respaldo de produccion del 30-jul.",
    "-- Casados por nombre normalizado; los que no casan quedan a null y se veran",
    "-- en la app como municipio vacio, que es la verdad.",
    "",
    "begin;",
    "",
]
lineas.append("update empresa e set municipio = v.municipio from (values")
lineas.append(",\n".join(
    f"  ('{eid}'::uuid, {lit(muni)})"
    for eid, (muni, nombre) in sorted(casadas.items(), key=lambda x: x[1][1])))
lineas.append(") as v(id, municipio) where e.id = v.id;")
lineas += [
    "",
    "select count(*) as con_municipio from empresa where municipio is not null;",
    "",
    "commit;",
    "",
]
open(SALIDA, "w", encoding="utf-8").write("\n".join(lineas))
print(f"\n-> {SALIDA}  ({len(casadas)} updates)")

if huerfanas:
    with open(SIN_CASAR, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh, delimiter=";")
        # la ultima columna es para que Monica diga a que empresa de la app
        # corresponde cada una, o que no es ninguna
        w.writerow(["nombre_viejo", "municipio", "direccion", "estado",
                    "EMPRESA_EN_LA_APP"])
        for d in huerfanas:
            w.writerow([d["nombre"], d["municipio"],
                        "" if d["direccion"] == "NULL" else d["direccion"],
                        d["estado"], ""])
    print(f"-> {SIN_CASAR}  ({len(huerfanas)} sin casar)")
