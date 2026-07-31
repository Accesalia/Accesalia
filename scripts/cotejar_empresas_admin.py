# -*- coding: utf-8 -*-
r"""
Rellena el puente migracion_admin_cotejo: para cada una de nuestras empresas,
que administracion de las que YA existen en la app es (si es que es alguna).

NO fusiona nada. Escribe una propuesta con su motivo, para revisar y decidir.
La fusion es un paso posterior que lee de aqui.

Las administraciones de la app se leen de C:\accesalia-fichas\administraciones_app.tsv
(id, nombre, email, n_comunidades), traidas de produccion una sola vez: alli
viven, y desde local no hay credenciales para consultarlas.

Como se propone un cruce, de mas fiable a menos:
  nombre_exacto   misma escritura normalizada
  dominio_correo  el correo apunta al mismo dominio propio (los freemail y los
                  colegios profesionales NO valen: gmail.com o cafmadrid.es los
                  comparten cientos de despachos distintos)
  clave_busqueda  igual al quitar S.L. y el ruido de oficio
  parecido        se parecen lo bastante como para mirarlo
  sin_candidata   no se parece a ninguna: sera una administracion nueva

Solo se propone UNA candidata por empresa, la mejor. Las demas se anotan en la
hoja para que Monica pueda elegir otra.

DRY-RUN por defecto. --apply para escribir.
Uso: python scripts/cotejar_empresas_admin.py [--apply]
"""
import sys, io, re, csv, subprocess
from difflib import SequenceMatcher
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

APPLY = "--apply" in sys.argv
APP = r"C:\accesalia-fichas\administraciones_app.tsv"
HOJA = r"C:\accesalia-fichas\cotejo_empresas.csv"
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"]

# Dominios que NO identifican a nadie: correo gratuito y colegios profesionales.
# Los comparten cientos de despachos distintos.
GENERICOS = {"gmail.com", "hotmail.com", "hotmail.es", "yahoo.es", "yahoo.com",
             "telefonica.net", "outlook.es", "outlook.com", "live.com", "gmx.es",
             "icloud.com", "terra.es", "movistar.es", "cafmadrid.es", "icam.es",
             "icaah.com", "e.telefonica.net", "onmicrosoft.com"}

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
    return re.sub(r"[^A-Z0-9]", "", (v or "").translate(SIN_TILDE).upper())

FORMA = r"SLU|SLP|SL|SAU|SA|CB|SC"
OFICIO = (r"ADMINISTRACIONESDEFINCAS|ADMINISTRACIONDEFINCAS|ADMINISTRADORESDEFINCAS|"
          r"ADMINISTRADORDEFINCAS|ADMINISTRACIONES|ADMINISTRACION|ADMINISTRADORES|"
          r"ADMINISTRADOR|DEFINCAS|GESTIONDEFINCAS")

def clave(v):
    k = re.sub(r"(?:%s)$" % FORMA, "", norm(v))
    return re.sub(OFICIO, "", k) or norm(v)

def correos(v):
    return [m.lower().rstrip(".,;") for m in re.findall(r"[\w.+-]+@[\w-]+\.[\w.-]+", v or "")]

def dominio(v):
    m = re.search(r"@([\w.-]+)", (v or "").lower())
    if not m:
        return ""
    d = m.group(1).strip(".,;")
    return "" if d in GENERICOS else d

# ---------- las dos listas ----------
nuestras = sql("""select id, nombre, nombre_norm, clave_busqueda, email, n_comunidades
                    from migracion_admin_empresa order by n_comunidades desc, nombre""")
suyas = []
with open(APP, encoding="utf-8") as fh:
    for l in fh:
        p = l.rstrip("\n").split("\t")
        if len(p) >= 4 and p[0]:
            suyas.append({"id": p[0], "nombre": p[1], "email": p[2], "n": int(p[3]),
                          "norm": norm(p[1]), "clave": clave(p[1]), "dom": dominio(p[2])})
print(f"nuestras empresas : {len(nuestras)}")
print(f"suyas (en la app) : {len(suyas)}")

por_norm, por_clave, por_dom, por_correo = {}, defaultdict(list), defaultdict(list), {}
for s in suyas:
    por_norm.setdefault(s["norm"], s)
    por_clave[s["clave"]].append(s)
    if s["dom"]:
        por_dom[s["dom"]].append(s)
    for c in correos(s["email"]):
        por_correo.setdefault(c, s)

def parecido(a, b):
    return SequenceMatcher(None, a, b).ratio()

def contenidas(k):
    """Una clave dentro de otra. Minimo 6 letras: con menos, 'AYA' o 'GTA'
    aparecen dentro de cualquier cosa y todo cruzaria con todo."""
    if len(k) < 6:
        return []
    return [s for s in suyas if len(s["clave"]) >= 6 and (k in s["clave"] or s["clave"] in k)]

resultado = []
for n in nuestras:
    dom = dominio(n["email"])
    cand, motivo, ratio = None, "sin_candidata", None
    otras = []

    mismo_correo = next((por_correo[c] for c in correos(n["email"]) if c in por_correo), None)

    if n["nombre_norm"] in por_norm:
        cand, motivo, ratio = por_norm[n["nombre_norm"]], "nombre_exacto", 1.0
    elif mismo_correo:
        # La direccion COMPLETA identica es identidad aunque el dominio sea de
        # los compartidos: anabelbarajas@icam.es es una persona concreta, no el
        # colegio. Asi salio que la ficha escribio "ICAM" donde iba su nombre.
        cand, motivo = mismo_correo, "correo_exacto"
        ratio = parecido(n["clave_busqueda"], cand["clave"])
    elif dom and len(por_dom.get(dom, [])) == 1:
        cand, motivo = por_dom[dom][0], "dominio_correo"
        ratio = parecido(n["clave_busqueda"], cand["clave"])
    elif len(por_clave.get(n["clave_busqueda"], [])) == 1:
        cand, motivo = por_clave[n["clave_busqueda"]][0], "clave_busqueda"
        ratio = parecido(n["clave_busqueda"], cand["clave"])
    elif contenidas(n["clave_busqueda"]):
        # La app tiene la misma casa abierta por oficinas ("MARCAL ASESORES
        # (LEGANES)"), asi que el nombre corto de la ficha no gana por parecido
        # aunque este dentro. Sin esto, MARCAL ASESORES se iba a MARAM ASESORES.
        dentro = contenidas(n["clave_busqueda"])
        if len(dentro) == 1:
            cand, motivo = dentro[0], "contenido"
            ratio = parecido(n["clave_busqueda"], cand["clave"])
        else:
            motivo, otras = "varias", dentro      # no se elige: decide Monica
    else:
        puntuadas = sorted(((parecido(n["clave_busqueda"], s["clave"]), s) for s in suyas),
                           key=lambda x: -x[0])
        if puntuadas and puntuadas[0][0] >= 0.80:
            ratio, cand = puntuadas[0]
            motivo = "parecido"
        otras = [s for r, s in puntuadas[1:4] if r >= 0.72]

    if cand and not otras:
        otras = [s for s in por_clave.get(n["clave_busqueda"], []) if s["id"] != cand["id"]]

    resultado.append({"n": n, "cand": cand, "motivo": motivo, "ratio": ratio,
                      "otras": otras, "dom": dom})

cuenta = defaultdict(int)
for r in resultado:
    cuenta[r["motivo"]] += 1
print("\nPropuestas por motivo:")
for m in ("nombre_exacto", "correo_exacto", "dominio_correo", "clave_busqueda",
          "contenido", "parecido", "varias", "sin_candidata"):
    if cuenta[m]:
        com = sum(int(r["n"]["n_comunidades"]) for r in resultado if r["motivo"] == m)
        print(f"   {m:16} {cuenta[m]:4}   ({com} comunidades)")

# Aviso: dos empresas nuestras que apuntan a la MISMA de la app. No es un error
# -son dos escrituras de la misma casa- pero conviene verlo antes de fusionar.
choques = defaultdict(list)
for r in resultado:
    if r["cand"]:
        choques[r["cand"]["id"]].append(r)
dobles = {k: v for k, v in choques.items() if len(v) > 1}
print(f"\n  administraciones de la app con VARIAS nuestras apuntando: {len(dobles)}")
for v in list(dobles.values())[:6]:
    print(f"     {v[0]['cand']['nombre'][:34]:34} <- {', '.join(r['n']['nombre'][:26] for r in v)}")

print("\n  muestra de las propuestas por parecido (las que hay que mirar):")
for r in resultado:
    if r["motivo"] == "parecido":
        print(f"     {r['ratio']:.2f}  {r['n']['nombre'][:40]:40} -> {r['cand']['nombre'][:40]}")

# ---------- hoja de revision ----------
CAB = ["empresa_id", "nuestra_empresa", "n_comunidades", "nuestro_email",
       "administracion_app", "administracion_id", "motivo", "parecido",
       "otras_candidatas", "DECISION", "nota"]
import os
if os.path.exists(HOJA):
    # La hoja ya revisada es de Monica: no se pisa NUNCA. Para regenerarla hay
    # que borrarla o moverla a mano, a conciencia.
    print(f"\n  {HOJA} ya existe: no se toca (esta revisada).")
else:
  with open(HOJA, "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(CAB)
    for r in sorted(resultado, key=lambda x: (x["motivo"] != "parecido",
                                              x["motivo"] != "sin_candidata",
                                              -int(x["n"]["n_comunidades"]))):
        w.writerow([r["n"]["id"], r["n"]["nombre"], r["n"]["n_comunidades"],
                    r["n"]["email"],
                    r["cand"]["nombre"] if r["cand"] else "",
                    r["cand"]["id"] if r["cand"] else "",
                    r["motivo"], f"{r['ratio']:.2f}" if r["ratio"] is not None else "",
                    " | ".join(s["nombre"] for s in r["otras"][:3]), "", ""])
print(f"\n  -> {HOJA}  ({len(resultado)} filas)")

if not APPLY:
    print("\nDRY-RUN. --apply para escribir el puente.")
    sys.exit(0)

vals = ",".join(
    "(" + ",".join([esc(r["n"]["id"]) + "::uuid",
                    (esc(r["cand"]["id"]) + "::uuid") if r["cand"] else "null",
                    esc(r["cand"]["nombre"] if r["cand"] else ""),
                    esc(r["motivo"]),
                    f"{r['ratio']:.3f}" if r["ratio"] is not None else "null"]) + ")"
    for r in resultado)
stmt = ("delete from migracion_admin_cotejo;\n"
        "insert into migracion_admin_cotejo (empresa_id, administracion_id, "
        "administracion, motivo, parecido) values\n" + vals + ";\n")
r = subprocess.run(DB, input=("begin;\n" + stmt + "commit;").encode("utf-8"),
                   stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
salida = r.stdout.decode("utf-8", "replace").strip()
if r.returncode:
    print(salida); sys.exit(1)
print(f"\nHECHO: {len(resultado)} filas en el puente, todas como 'propuesta'.")
