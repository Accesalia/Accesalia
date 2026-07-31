# -*- coding: utf-8 -*-
r"""
PASO 1 de personas: una lista consolidada que funde las personas sacadas de las
fichas con las de la app, y propone la empresa SOLO cuando esta clara.

Sale una hoja para revisar a mano, C:\accesalia-fichas\personas_consolidadas.csv,
con una fila por persona MAS una fila por cada empresa nuestra en la que no
tenemos ninguna persona. Asi se ve de un vistazo lo que falta.

Como se consolida:
  nombre con apellido  se funde entre fichas distintas
  nombre de pila solo  se funde SOLO dentro de la misma empresa. Hay 6 "Carlos"
                       en comunidades distintas y no tienen por que ser el mismo.

Cuando la empresa se deja EN BLANCO (a proposito, no por descuido):
  - la casilla de la ficha traia varias personas: eso suele ser un CAMBIO de
    administracion ("MARIAN JEBARI - TOÑI CARDENAS"), no dos companeros. Poner
    a las dos en la misma empresa seria inventarselo.
  - la persona aparece en fichas de empresas distintas.

DRY-RUN por defecto (solo escribe el CSV). --apply para guardarlo tambien en la BD.
Uso: python scripts/consolidar_personas_admin.py [--apply]
"""
import sys, io, re, csv, subprocess
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

APPLY = "--apply" in sys.argv
APP = r"C:\accesalia-fichas\administradores_app.tsv"
HOJA = r"C:\accesalia-fichas\personas_consolidadas.csv"
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "--csv"]

def sql(q):
    r = subprocess.run(DB + ["-c", q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    t = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(t); sys.exit(1)
    return list(csv.DictReader(io.StringIO(t)))

T = str.maketrans("áéíóúüñÁÉÍÓÚÜÑ", "aeiouunAEIOUUN")
def norm(v):
    return " ".join(re.sub(r"[^a-z ]", " ", (v or "").translate(T).lower()).split())

RE_MAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
RE_TEL = re.compile(r"\d[\d\s.\-]{7,}\d")
# Lo que no es un nombre: horarios, cargos pegados, notas de seguimiento.
RUIDO = re.compile(r"""(?ix)
    \b(l\s*a\s*[vj]|lunes|martes|mi[eé]rcoles|jueves|viernes)\b
  | \bde\s+\d{1,2}([:.]\d{2})?\s*a\s*\d{1,2}
  | \b(ext|extension|opc|opcion)\b
  | \bdni\b | \bcolegiado\b | \bde\s+baja\b | \bya\s+no\s+trabaja\b
  | \bmandar\b | \bllamarla?\b | \bactual\b
""")

def partir(v):
    """-> (nombre, extras). Igual que con las empresas: separar, nunca tirar."""
    v = re.sub(r"\s+", " ", v or "").strip()
    cortes = [m.start() for m in (RE_MAIL.search(v), RE_TEL.search(v), RUIDO.search(v)) if m]
    if not cortes:
        return v.strip(" -–,;:.()"), ""
    i = min(cortes)
    return v[:i].strip(" -–,;:.()"), v[i:].strip()

def sin_parentesis(v):
    """El parentesis suele ser la empresa, no parte del nombre: VANESA (DEL BRIO)."""
    return re.sub(r"\s*\(.*?\)?\s*$", "", re.sub(r"\s*\(.*?\)\s*", " ", v or "")).strip()

# ---------- nuestras personas ----------
# OJO: NO se parte por " y ". Muchas administraciones lo llevan en el nombre
# ("DEL BRIO Y BLANCO") y partirlo fabricaba dos personas llamadas "DEL BRIO" y
# "BLANCO" que no existen.
SEP = re.compile(r"\s*[,;/]\s*|\s+[-–]\s+")
filas = sql("""
select r.comunidad_id, r.comunidad, r.persona, r.empresa_id,
       coalesce(nullif(c.nombre_final,''), e.nombre) empresa
  from migracion_admin_revision r
  join migracion_admin_empresa e on e.id = r.empresa_id
  left join migracion_admin_cotejo c on c.empresa_id = r.empresa_id
 where r.persona <> ''""")

ocur = []
for f in filas:
    trozos = [t.strip() for t in SEP.split(f["persona"]) if t.strip()]
    for t in trozos:
        nom, extras = partir(sin_parentesis(t))
        if nom:
            ocur.append({"nombre": nom, "extras": extras, "empresa": f["empresa"],
                         "empresa_id": f["empresa_id"], "comunidad": f["comunidad"],
                         "compartida": len(trozos) > 1})

# clave de consolidacion
grupos = defaultdict(list)
for o in ocur:
    k = norm(o["nombre"])
    grupos[(k,) if len(k.split()) > 1 else (k, o["empresa_id"])].append(o)

# ---------- las de la app ----------
suyas = []
with open(APP, encoding="utf-8") as fh:
    for l in fh:
        p = l.rstrip("\n").split("\t")
        if len(p) >= 7 and p[0]:
            suyas.append({"id": p[0], "nombre": p[1], "email": p[2], "telefono": p[3],
                          "admin_id": p[4], "cargo": p[5], "n_com": int(p[6] or 0)})
# la empresa de la app se traduce a la nuestra por el puente
emp_de_app = {c["administracion_id"]: c["empresa"] for c in sql("""
select coalesce(c.administracion_id::text,'') administracion_id,
       coalesce(nullif(c.nombre_final,''), e.nombre) empresa
  from migracion_admin_cotejo c join migracion_admin_empresa e on e.id=c.empresa_id
 where c.administracion_id is not null""")}
for s in suyas:
    # el parentesis del nombre es la empresa, no parte del nombre
    s["limpio"] = re.sub(r"\s*\(.*?\)\s*", " ", s["nombre"]).strip()
    s["norm"] = norm(s["limpio"])
    s["empresa"] = emp_de_app.get(s["admin_id"], "")

# ---------- fusionar las dos listas ----------
por_norm_suyas = defaultdict(list)
for s in suyas:
    por_norm_suyas[s["norm"]].append(s)

personas, usadas = [], set()
for k, os_ in grupos.items():
    nombre = max((o["nombre"] for o in os_), key=len)
    empresas = sorted({o["empresa"] for o in os_})
    compartida = any(o["compartida"] for o in os_)
    coms = sorted({o["comunidad"] for o in os_})
    extras = " | ".join(sorted({o["extras"] for o in os_ if o["extras"]}))

    # ¿esta en la lista de la app?
    cands = por_norm_suyas.get(k[0], [])
    if len(cands) > 1 and len(empresas) == 1:
        cands = [c for c in cands if c["empresa"] == empresas[0]] or cands
    suya = cands[0] if len(cands) == 1 else None
    if suya:
        usadas.add(suya["id"])

    # Si la casilla traia varias personas pero todas apuntan a la MISMA empresa,
    # se propone igual y se avisa: dejarlo en blanco daria mas trabajo del que
    # ahorra, y la duda queda escrita para que se vea.
    if compartida and len(empresas) == 1:
        emp = empresas[0]
        por_que = "OJO: la casilla traia varias personas juntas, puede ser un cambio de administracion"
    elif len(empresas) > 1:
        emp, por_que = "", "aparece en fichas de %d empresas distintas" % len(empresas)
    else:
        emp, por_que = empresas[0], ""
    if not emp and suya and suya["empresa"]:
        emp, por_que = suya["empresa"], "la trae la app"

    personas.append({
        "empresa": emp, "persona": nombre,
        "origen": "ambas" if suya else "ficha",
        "email": (suya or {}).get("email", ""), "telefono": (suya or {}).get("telefono", ""),
        "cargo": (suya or {}).get("cargo", ""), "administrador_id": (suya or {}).get("id", ""),
        "n_com": len(coms), "comunidades": " | ".join(coms[:3]),
        "por_que": por_que, "extras": extras,
        "otras_empresas": " | ".join(empresas) if len(empresas) > 1 else "",
    })

# las de la app que no salen en ninguna ficha
for s in suyas:
    if s["id"] not in usadas:
        personas.append({
            "empresa": s["empresa"], "persona": s["limpio"], "origen": "app",
            "email": s["email"], "telefono": s["telefono"], "cargo": s["cargo"],
            "administrador_id": s["id"], "n_com": s["n_com"], "comunidades": "",
            "por_que": "solo esta en la app, no sale en ninguna ficha",
            "extras": "", "otras_empresas": ""})

# empresas nuestras sin ninguna persona
con_persona = {p["empresa"] for p in personas if p["empresa"]}
todas = sql("""select coalesce(nullif(c.nombre_final,''), e.nombre) empresa, e.n_comunidades
                 from migracion_admin_empresa e
                 left join migracion_admin_cotejo c on c.empresa_id = e.id""")
huecos = sorted({t["empresa"] for t in todas} - con_persona)
for e in huecos:
    personas.append({"empresa": e, "persona": "", "origen": "", "email": "", "telefono": "",
                     "cargo": "", "administrador_id": "", "n_com": 0, "comunidades": "",
                     "por_que": "no tenemos ninguna persona para esta empresa",
                     "extras": "", "otras_empresas": ""})

print(f"ocurrencias de persona en fichas : {len(ocur)}")
print(f"personas consolidadas (ficha)    : {len(grupos)}")
print(f"  ...de esas, tambien en la app  : {len(usadas)}")
print(f"personas solo de la app          : {len(suyas) - len(usadas)}")
print(f"empresas sin ninguna persona     : {len(huecos)}")
print(f"\nTOTAL filas de la hoja           : {len(personas)}")
print(f"  con empresa propuesta          : {sum(1 for p in personas if p['empresa'] and p['persona'])}")
print(f"  persona SIN empresa (en blanco): {sum(1 for p in personas if p['persona'] and not p['empresa'])}")
for p in personas:
    if p["persona"] and not p["empresa"]:
        print(f"     {p['persona'][:34]:34} {p['por_que'][:60]}")

CAB = ["EMPRESA", "PERSONA", "origen", "email", "telefono", "cargo", "n_comunidades",
       "comunidades", "por_que", "notas_pegadas", "otras_empresas",
       "EMPRESA_CORRECTA", "PERSONA_CORRECTA", "nota", "administrador_id"]
personas.sort(key=lambda p: (p["empresa"] == "", p["empresa"].upper(), p["persona"].upper()))
with open(HOJA, "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(CAB)
    for p in personas:
        w.writerow([p["empresa"], p["persona"], p["origen"], p["email"], p["telefono"],
                    p["cargo"], p["n_com"] or "", p["comunidades"], p["por_que"],
                    p["extras"], p["otras_empresas"], "", "", "", p["administrador_id"]])
print(f"\n  -> {HOJA}")
