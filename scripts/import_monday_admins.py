# -*- coding: utf-8 -*-
"""
Importa administraciones de fincas y personas desde el export de Monday a
Accesalia (Supabase). Idempotente (re-ejecutable sin duplicar).

Uso:
    python scripts/import_monday_admins.py            # DRY-RUN: informe, no escribe
    python scripts/import_monday_admins.py --apply    # escribe en la BD

Fuentes (en docs/):
    01a_ADMINISTRACIONES_DE_FINCAS_*.xlsx  -> administraciones_fincas (+comisiones, contactos)
    01b_Admin_PERSONAS_*.xlsx              -> administradores (personas)

Lee la service key de frontend/.env.local (o de la variable SUPABASE_SECRET_KEY).
URL base: SUPABASE_URL o http://127.0.0.1:54321.

Decisiones de mapeo: ver docs/ANALISIS_MIGRACION_MONDAY_admins.md.
"""
import os, sys, re, json, glob, unicodedata
import urllib.request, urllib.error
from collections import defaultdict
import openpyxl

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(RAIZ, "docs")
APPLY = "--apply" in sys.argv

# ---------------------------------------------------------------- config / REST
def cargar_key():
    k = os.environ.get("SUPABASE_SECRET_KEY")
    if k:
        return k
    env = os.path.join(RAIZ, "frontend", ".env.local")
    if os.path.exists(env):
        for ln in open(env, encoding="utf-8"):
            if ln.strip().startswith("SUPABASE_SECRET_KEY="):
                return ln.split("=", 1)[1].strip()
    sys.exit("No encuentro SUPABASE_SECRET_KEY (ni en env ni en frontend/.env.local).")

BASE = os.environ.get("SUPABASE_URL", "http://127.0.0.1:54321")
KEY = cargar_key()

def rest(method, path, body=None, prefer=None):
    url = f"{BASE}/rest/v1/{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("apikey", KEY)
    req.add_header("Authorization", "Bearer " + KEY)
    req.add_header("Content-Type", "application/json")
    if prefer:
        req.add_header("Prefer", prefer)
    try:
        with urllib.request.urlopen(req) as resp:
            txt = resp.read().decode()
            return json.loads(txt) if txt else []
    except urllib.error.HTTPError as e:
        raise SystemExit(f"REST {method} {path} -> {e.code}: {e.read().decode()}")

def get(path):
    return rest("GET", path)

def insert(table, row):
    return rest("POST", table, [row], prefer="return=representation")[0]

# ---------------------------------------------------------------- helpers datos
def norm(s):
    if not s:
        return ""
    s = unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()

def leer_xlsx(patron):
    ruta = glob.glob(os.path.join(DOCS, patron))
    if not ruta:
        sys.exit(f"No encuentro {patron} en docs/")
    wb = openpyxl.load_workbook(ruta[0], read_only=True, data_only=True)
    ws = wb.active
    filas = [list(r) for r in ws.iter_rows(values_only=True)]
    h = next(i for i, r in enumerate(filas) if r and str(r[0]).strip().lower() == "name")
    header = [str(c).strip() if c else "" for c in filas[h]]
    idx = {c: i for i, c in enumerate(header)}
    datos = [r for r in filas[h + 1:] if any(v not in (None, "") for v in r)]
    wb.close()
    return idx, datos

def cel(row, idx, col):
    i = idx.get(col)
    if i is None or i >= len(row) or row[i] is None:
        return ""
    return str(row[i]).strip()

def titlecase_muni(m):
    return m.title() if m and m.isupper() else m

def parse_comision(text):
    """(importe, porcentaje, parse_completo). Siempre conserva el texto en notas."""
    t = text.strip()
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*%", t)
    if m:
        return None, float(m.group(1).replace(",", ".")), True
    if re.fullmatch(r"\d+(?:[.,]\d+)?", t):
        return float(t.replace(",", ".")), None, True
    m3 = re.match(r"(\d+(?:[.,]\d+)?)", t)
    if m3:
        return float(m3.group(1).replace(",", ".")), None, False  # parcial
    return None, None, False

def parse_fecha_desde(text):
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", text or "")
    if m:
        d, mth, y = m.groups()
        return f"{y}-{int(mth):02d}-{int(d):02d}"
    return None

# ---------------------------------------------------------------- carga fuentes
idxA, admins = leer_xlsx("01a_ADMINISTRACIONES_DE_FINCAS_*.xlsx")
idxP, personas = leer_xlsx("01b_Admin_PERSONAS_*.xlsx")

# ---------------------------------------------------------------- comerciales
# Distintos valores de 'Comercial interno' -> comerciales.
def comercial_partes(valor):
    if "@" in valor:
        nom = valor.split("@")[0].split(".")[0].capitalize()
        return nom, None, valor, True  # (nombre, apellidos, email, flag_confirmar)
    partes = valor.split()
    return partes[0], (" ".join(partes[1:]) or None), None, False

valores_comercial = sorted({cel(r, idxA, "Comercial interno") for r in admins if cel(r, idxA, "Comercial interno")})

# ---------------------------------------------------------------- informe acumulado
rep = defaultdict(int)
flags = []

def flag(msg):
    flags.append(msg)

# ---------------------------------------------------------------- estado heuristico
def estado_de(r):
    est = cel(r, idxA, "Estado")
    nombre = cel(r, idxA, "Name")
    if est == "Baneado":
        flag(f"BANEADO->cliente_baneado (revisar si es descontento/iniciativa suya): {nombre}")
        return "cliente_baneado"
    if est == "EMPLEADO":
        flag(f"Marcado EMPLEADO en Monday (revisar si es ruido a excluir): {nombre}")
    tiene_dir = bool(cel(r, idxA, "link to 0 LISTADO DE DIRECCIONES"))
    com_eco = cel(r, idxA, "Com Eco") == "SI"
    if tiene_dir or com_eco:
        return "cliente_activo"
    return "contacto"

# ---------------------------------------------------------------- construir notas
def notas_de(r):
    partes = []
    n = cel(r, idxA, "NOTAS")
    if n:
        partes.append(n)
    dirs = cel(r, idxA, "link to 0 LISTADO DE DIRECCIONES")
    if dirs:
        partes.append("[Edificios (Monday)]: " + dirs)
    caes = cel(r, idxA, "link to CAES")
    if caes:
        partes.append("[CAES (Monday)]: " + caes)
    per = cel(r, idxA, "Personas")
    return "\n".join(partes) or None, per

# ================================================================= EJECUCION
print("=" * 78)
print(f"IMPORT MONDAY -> ACCESALIA   ({'APPLY (escribe)' if APPLY else 'DRY-RUN (no escribe)'})")
print(f"Base: {BASE}")
print("=" * 78)

# --- Comerciales -----------------------------------------------------------
exist_com = {norm(f"{c['nombre']} {c.get('apellidos') or ''}"): c["id"]
             for c in get("comerciales?select=id,nombre,apellidos")}
map_comercial = {}  # valor Monday -> id (o None en dry-run)
for v in valores_comercial:
    nom, ape, email, confirmar = comercial_partes(v)
    clave = norm(f"{nom} {ape or ''}")
    if confirmar:
        flag(f"Comercial con email en vez de nombre: '{v}' -> creado como '{nom}' (CONFIRMAR nombre real)")
    if clave in exist_com:
        map_comercial[v] = exist_com[clave]
        rep["comerciales_reusados"] += 1
    else:
        rep["comerciales_creados"] += 1
        if APPLY:
            row = {"nombre": nom, "apellidos": ape, "email": email}
            cid = insert("comerciales", row)["id"]
            exist_com[clave] = cid
            map_comercial[v] = cid
        else:
            map_comercial[v] = None

# --- Administraciones ------------------------------------------------------
exist_af = {norm(a["nombre"]): a["id"] for a in get("administraciones_fincas?select=id,nombre")}
map_af = {}  # norm(nombre) -> id (o None en dry-run si nuevo)
for r in admins:
    nombre = cel(r, idxA, "Name")
    if not nombre:
        rep["admin_sin_nombre"] += 1
        flag("Administracion sin nombre (fila ignorada)")
        continue
    clave = norm(nombre)
    notas, _ = notas_de(r)
    comercial_val = cel(r, idxA, "Comercial interno")
    row = {
        "nombre": nombre,
        "estado": estado_de(r),
        "municipio": titlecase_muni(cel(r, idxA, "LOCALIDAD")) or None,
        "telefono": cel(r, idxA, "Teléfono") or None,
        "email": cel(r, idxA, "Correo electrónico") or None,
        "direccion": cel(r, idxA, "Direccion") or None,
        "cif": cel(r, idxA, "CIF") or None,
        "notas": notas,
        "comercial_id": map_comercial.get(comercial_val) if comercial_val else None,
        "activo": cel(r, idxA, "Estado") != "Baneado",
    }
    if clave in exist_af:
        map_af[clave] = exist_af[clave]
        rep["admin_actualizadas"] += 1
        if APPLY:
            rest("PATCH", f"administraciones_fincas?id=eq.{exist_af[clave]}", body=row)
    else:
        rep["admin_creadas"] += 1
        if APPLY:
            aid = insert("administraciones_fincas", row)["id"]
            exist_af[clave] = aid
            map_af[clave] = aid
        else:
            map_af[clave] = None

# --- Personas --------------------------------------------------------------
TIPO_A_CARGO = {"ADMINISTRADOR": "administrador", "DIRECTIVO": "directivo", "ASISTENTE": "asistente"}
personas_por_af = defaultdict(list)  # norm(admin) -> [(nombre, tipo, id_o_None)]
for r in personas:
    nombre = cel(r, idxP, "Name")
    if not nombre:
        continue
    ref = cel(r, idxP, "00 Administradores")
    clave_af = norm(ref)
    if clave_af not in map_af:
        rep["personas_sin_administracion"] += 1
        flag(f"Persona sin administracion casada: {nombre} (ref: {ref})")
        continue
    tipo = cel(r, idxP, "TIPO")
    aid = map_af[clave_af]
    row = {
        "nombre": nombre,
        "cargo": TIPO_A_CARGO.get(tipo, tipo.lower() or None) if tipo else None,
        "telefono": cel(r, idxP, "Teléfono") or None,
        "email": cel(r, idxP, "Correo electrónico") or None,
        "administracion_id": aid,
    }
    rep["personas_casadas"] += 1
    pid = None
    # idempotencia: por (nombre, administracion) si ya aplicamos
    if APPLY and aid:
        ya = get(f"administradores?select=id&administracion_id=eq.{aid}&nombre=eq.{urllib.parse.quote(nombre)}")
        if ya:
            pid = ya[0]["id"]
            rest("PATCH", f"administradores?id=eq.{pid}", body=row)
            rep["personas_actualizadas"] += 1
        else:
            pid = insert("administradores", row)["id"]
            rep["personas_creadas"] += 1
    personas_por_af[clave_af].append((nombre, tipo, pid))

# --- Titular (heuristica) --------------------------------------------------
for clave_af, gente in personas_por_af.items():
    aid = map_af.get(clave_af)
    # decision del heuristico (independiente de tener ya el id, para el dry-run)
    elegido = None
    if len(gente) == 1:
        elegido = gente[0]
    else:
        directivos = [g for g in gente if g[1] == "DIRECTIVO"]
        if len(directivos) == 1:
            elegido = directivos[0]
    if elegido:
        rep["titulares_asignados"] += 1
        if APPLY and aid and elegido[2]:
            rest("PATCH", f"administraciones_fincas?id=eq.{aid}", body={"titular_id": elegido[2]})
    else:
        rep["titulares_sin_definir"] += 1

# --- Contactos (col 'Personas' cuando no hay persona en 01b) ---------------
for r in admins:
    clave_af = norm(cel(r, idxA, "Name"))
    per = cel(r, idxA, "Personas")
    if per and not personas_por_af.get(clave_af):
        aid = map_af.get(clave_af)
        rep["contactos_creados"] += 1
        if APPLY and aid:
            ya = get(f"contactos?select=id&administracion_id=eq.{aid}&proposito=eq.general&nombre=eq.{urllib.parse.quote(per)}")
            if not ya:
                insert("contactos", {"administracion_id": aid, "proposito": "general", "nombre": per})

# --- Comisiones (Com Eco / Com Contrata) -----------------------------------
def crear_acuerdo(aid, pagador, beneficiario, importe, porc, fecha_desde, notas):
    if not (APPLY and aid):
        return
    ya = get(f"acuerdos_comision?select=id&administracion_id=eq.{aid}&pagador=eq.{pagador}&beneficiario=eq.{beneficiario}")
    if ya:
        return
    insert("acuerdos_comision", {
        "administracion_id": aid, "pagador": pagador, "beneficiario": beneficiario,
        "base_calculo": "por_proyecto" if pagador == "accesalia" else "por_pem",
        "importe": importe, "porcentaje": porc, "fecha_desde": fecha_desde,
        "vigente": True, "notas": notas,
    })

for r in admins:
    clave_af = norm(cel(r, idxA, "Name"))
    aid = map_af.get(clave_af)
    nombre = cel(r, idxA, "Name")
    # Com Eco: Accesalia paga al administrador
    if cel(r, idxA, "Com Eco") == "SI":
        txt = cel(r, idxA, "Com Eco Importes")
        imp, porc, ok = parse_comision(txt) if txt else (None, None, True)
        if txt and not ok:
            flag(f"Com Eco importe no parseable del todo ('{txt}') en {nombre} -> guardado en notas")
        rep["comisiones_eco"] += 1
        crear_acuerdo(aid, "accesalia", "administrador", imp, porc, parse_fecha_desde(txt),
                      ("Com Eco Monday: " + txt) if txt else "Com Eco (SI, sin importe)")
    # Com Contrata: la contrata paga al administrador
    if cel(r, idxA, "Com Contrata") == "SI":
        txt = cel(r, idxA, "Com contrata importes")
        imp, porc, ok = parse_comision(txt) if txt else (None, None, True)
        if txt and not ok:
            flag(f"Com Contrata importe no parseable ('{txt}') en {nombre} -> notas")
        rep["comisiones_contrata"] += 1
        crear_acuerdo(aid, "contrata", "administrador", imp, porc, parse_fecha_desde(txt),
                      ("Com Contrata Monday: " + txt) if txt else "Com Contrata (SI, sin importe)")

# ================================================================= INFORME
print("\n--- RECONCILIACION ---")
orden = [
    "comerciales_creados", "comerciales_reusados",
    "admin_creadas", "admin_actualizadas", "admin_sin_nombre",
    "personas_casadas", "personas_creadas", "personas_actualizadas", "personas_sin_administracion",
    "titulares_asignados", "titulares_sin_definir",
    "contactos_creados",
    "comisiones_eco", "comisiones_contrata",
]
for k in orden:
    print(f"  {k:28}: {rep.get(k, 0)}")

print(f"\n--- DUDOSOS / A REVISAR ({len(flags)}) ---")
for f in flags[:60]:
    print("  •", f)
if len(flags) > 60:
    print(f"  ... y {len(flags) - 60} mas")

if not APPLY:
    print("\n[DRY-RUN] No se ha escrito nada. Revisa el informe y ejecuta con --apply para importar.")
else:
    print("\n[APPLY] Importacion completada.")
