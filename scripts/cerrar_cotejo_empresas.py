# -*- coding: utf-8 -*-
r"""
Cierra el cotejo de empresas:

  1. Recoge el "nombre definitivo para la app" que Monica escribio en la hoja de
     segunda vuelta (cotejo_empresas_v2.csv).
  2. Resuelve las FRANQUICIAS. MARCAL e INMHO tienen una casa por oficina, asi
     que el nombre solo no basta: hace falta el apellido de localidad. Se saca
     de la DIRECCION que trae la propia ficha, no de suponer.
  3. Da por aceptadas las demas propuestas: Monica confirmo que dejar una fila
     en blanco significa que la propuesta es correcta.
  4. Saca la hoja que falta (cotejo_empresas_nombres.csv) con el resto de
     empresas y su nombre definitivo ya propuesto, para que solo tenga que
     corregir lo que no le encaje.

DRY-RUN por defecto. --apply para escribir.
Uso: python scripts/cerrar_cotejo_empresas.py [--apply]
"""
import os, sys, io, re, csv, subprocess
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

APPLY = "--apply" in sys.argv
V2 = r"C:\accesalia-fichas\cotejo_empresas_v2.csv"
APP = r"C:\accesalia-fichas\administraciones_app.tsv"
HOJA3 = r"C:\accesalia-fichas\cotejo_empresas_nombres.csv"
COL_FINAL = "nombre definitivo para la app, sea o no el mismo que esta (por las erratas)"
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"]

# Franquicias: el apellido sale de la direccion de la ficha, que queda escrita
# aqui como prueba. Sin esto, MARCAL ASESORES se crearia como empresa nueva
# duplicando la oficina de Leganes que ya existe.
FRANQUICIAS = {
    "MARCAL ASESORES":                  ("MARCAL ASESORES (LEGANES)", "Av. de Fuenlabrada, 97, 28912 Leganes"),
    "MARCAL LEGANES":                   ("MARCAL ASESORES (LEGANES)", "AV FUENLABRADA, 97. 28912 LEGANES"),
    "AEA FINCAS":                       ("AEA FINCAS MOSTOLES",       "C/ Libertad 37, 28936 Mostoles"),
    "INMHO Gestion de la Propiedad SL": ("INMHO Gestion de la Propiedad (GETAFE)",  "Avenida de Aragon 7 Getafe"),
    "INMHO GESTION de La propiedad SLU": ("INMHO Gestion de la Propiedad (MOSTOLES)", "Avda. Dos de Mayo 66, 28934 Mostoles"),
}

# Nombres finales que Monica decidio en la PRIMERA hoja, que aun no tenia
# columna para ello: quedaron dichos en el texto de su decision.
NOMBRES_V1 = {
    # "FUSIONAR, ES ERRATA EN LA APP (NOMBRE CORRECO MASIPIE, CON M)"
    "Lozano Masipie SLP": "Lozano Masipie SLP",
    # La empresa estaba en la lista limpia con el nombre de su administradora,
    # y eso hacia que Rosario Molano fuese empresa y persona a la vez. La casa
    # se llama Gestoria MyM (rmolano@gestoria-mym.com); ella es la persona.
    "Gestoria MyM": "Gestoria MyM",
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

# Las franquicias se buscan por clave normalizada, no por texto exacto: al
# rehacer la lista puede ganar otra grafia ("Marcal asesores" en vez de "MARCAL
# ASESORES") y entonces no casaba, y el nombre acababa siendo la instruccion que
# Monica escribio en la hoja.
def kfr(v):
    return re.sub(r"[^A-Z0-9]", "",
                  (v or "").upper().translate(str.maketrans("ÁÉÍÓÚÜÑ", "AEIOUUN")))

FRANQUICIAS = {kfr(k): v for k, v in FRANQUICIAS.items()}

app_por_nombre, app_por_id = {}, {}
with open(APP, encoding="utf-8") as fh:
    for l in fh:
        p = l.rstrip("\n").split("\t")
        if len(p) >= 2 and p[0]:
            app_por_nombre[p[1].upper()] = p[0]
            app_por_id[p[0]] = p[1]

filas = sql("""
select c.empresa_id, e.nombre nuestra, coalesce(c.administracion_id::text,'') administracion_id,
       c.administracion, c.motivo, c.decision, e.n_comunidades, coalesce(e.direccion,'') direccion
  from migracion_admin_cotejo c join migracion_admin_empresa e on e.id=c.empresa_id
 order by e.n_comunidades desc, e.nombre""")

# ---------- 1. lo que escribio en la hoja v2 ----------
finales = {}
if os.path.exists(V2):
    for f in csv.DictReader(open(V2, encoding="utf-8-sig")):
        v = g(f, COL_FINAL)
        if v and g(f, "empresa_id"):
            finales[g(f, "empresa_id")] = v      # si repite fila, vale la ultima
print(f"nombres definitivos escritos por Monica: {len(finales)}")

# ---------- 1b. empresas duplicadas que detecto Monica ----------
# Dos empresas nuestras que son la misma casa escrita de dos formas. No lo pillo
# el cotejo porque cada una casaba con una fila distinta de la app.
DUP = {}
try:
    for f in csv.DictReader(open(r"C:\accesalia-fichas\empresas_duplicadas.csv",
                                 encoding="utf-8-sig")):
        DUP[kfr(g(f, "nombre_que_sobra"))] = g(f, "nombre_definitivo")
except FileNotFoundError:
    pass
print(f"empresas duplicadas que marco Monica  : {len(DUP)}")

# ---------- 2 y 3. resolver ----------
cambios, nuevas, franq = [], 0, []
for r in filas:
    eid, nombre = r["empresa_id"], r["nuestra"]
    aid, dec = r["administracion_id"], r["decision"]

    if kfr(nombre) in FRANQUICIAS:
        final, prueba = FRANQUICIAS[kfr(nombre)]
        # Si ya tenia candidata (INMHO Mostoles casa por correo con SANCHEZ
        # ADMINISTRADOR: es la misma casa, que cambio de nombre al entrar en la
        # franquicia), se CONSERVA esa fila y solo se le pone el nombre nuevo.
        # El apellido de localidad es como se llamara, no por donde se busca.
        # Manda el nombre de la franquicia, NO lo que adivino el cotejo: si el
        # apellido de oficina existe en la app, esa es. El cruce automatico no
        # sabe distinguir oficinas (casaba "AEA FINCAS" de Mostoles con la de
        # Leganes por compartir un correo), que es justo para lo que esta esto.
        destino = app_por_nombre.get(final.upper(), "") or aid
        dec = "es_la_misma" if destino else "crear_nueva"
        aid = destino or ""
        franq.append((nombre, final, ("fusiona con " + (r["administracion"] or final))
                      if destino else "nueva", prueba))
    elif dec == "propuesta":
        dec = "es_la_misma" if aid else "crear_nueva"

    # El nombre de la app se resuelve SIEMPRE por id contra la lista, no por el
    # texto guardado: las que se decidieron a mano lo tenian vacio.
    en_app = app_por_id.get(aid, "")
    final = (finales.get(eid) or NOMBRES_V1.get(nombre)
             or (en_app if dec == "es_la_misma" else nombre))
    if kfr(nombre) in FRANQUICIAS:
        final = FRANQUICIAS[kfr(nombre)][0]
    # Monica escribio los duplicados usando el nombre FINAL que veia en la hoja
    # ("FINCAS EN CASA"), no el crudo de la ficha ("Encasa Administracion de
    # Fincas del Sur S.L"). Mirando solo el crudo se quedaban 3 sin fusionar.
    if kfr(nombre) in DUP:
        final = DUP[kfr(nombre)]
    if kfr(final) in DUP:
        final = DUP[kfr(final)]
    if dec != "es_la_misma":
        aid, en_app = "", ""
        nuevas += 1
    cambios.append((eid, dec, aid, final, en_app))

print(f"  fusionan con una existente : {sum(1 for c in cambios if c[1] == 'es_la_misma')}")
print(f"  se crean nuevas            : {sum(1 for c in cambios if c[1] != 'es_la_misma')}")
print("\n  franquicias resueltas por su direccion:")
for n, f, q, p in franq:
    print(f"     {n[:34]:34} -> {f[:40]:40} [{q}]  {p[:38]}")

# ---------- 4. hoja con el resto ----------
CAB = ["empresa_id", "nuestra_empresa", "n_comunidades", "administracion_app",
       "que_pasa", "NOMBRE_DEFINITIVO", "nota"]
pend = [c for c in cambios if c[0] not in finales]
with open(HOJA3, "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(CAB)
    por_id = {r["empresa_id"]: r for r in filas}
    for eid, dec, aid, final, en_app in sorted(pend, key=lambda c: -int(por_id[c[0]]["n_comunidades"])):
        r = por_id[eid]
        w.writerow([eid, r["nuestra"], r["n_comunidades"], en_app,
                    "se funde con la de la app" if dec == "es_la_misma" else "se crea nueva",
                    final, ""])
print(f"\n  -> {HOJA3}  ({len(pend)} filas, con el nombre definitivo ya propuesto)")

if not APPLY:
    print("\nDRY-RUN. --apply para escribir.")
    sys.exit(0)

stmt = "\n".join(
    f"update migracion_admin_cotejo set decision={esc(dec)}, nombre_final={esc(final)}, "
    f"administracion={esc(en_app)}, "
    f"administracion_id={(esc(aid) + '::uuid') if aid else 'null'} "
    f"where empresa_id={esc(eid)}::uuid;"
    for eid, dec, aid, final, en_app in cambios)
r = subprocess.run(DB, input=("begin;\n" + stmt + "\ncommit;").encode("utf-8"),
                   stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
if r.returncode:
    print(r.stdout.decode("utf-8", "replace")); sys.exit(1)
print(f"\nHECHO: {len(cambios)} filas cerradas en el puente.")
