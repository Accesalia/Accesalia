# -*- coding: utf-8 -*-
r"""
Trazado 1:1 de cada comunidad de Monday a SU carpeta de Dropbox.

REGLAS (Monica, jul-2026):
  1. La relacion comunidad <-> carpeta es **1:1 en los dos sentidos**. Una
     carpeta es de UNA comunidad y una comunidad tiene UNA carpeta.
  2. **Dropbox manda siempre.** Es la fuente original y ademas ahi se suben
     proyectos, licencias y todo lo demas: no aguantaria un nombre mal puesto.
     Monday es solo registro de datos y puede traer errores de traspaso.
  3. Una misma direccion PUEDE existir en varias localidades (polvoranca18 esta
     en Leganes, Fuenlabrada y Getafe). No se asume unicidad JAMAS.
  4. Cualquier ambiguedad se separa para revision humana, no se resuelve sola.

Tras el trazado, solo las fichas que viven en carpetas trazadas alimentan la
migracion de datos: son los proyectos vivos y es un subconjunto controlable.

No escribe nada. Produce en C:\accesalia-fichas\:
    trazado_ok.csv          pares comunidad <-> carpeta (1:1 confirmado)
    trazado_ambiguo.csv     para revisar (varias carpetas, o carpeta disputada)
    trazado_sin_carpeta.csv comunidades sin carpeta localizable

Uso: python scripts/trazar_monday_dropbox.py
"""
import os, sys, io, re, csv, subprocess, unicodedata
from collections import defaultdict
from difflib import SequenceMatcher
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

RAIZ = r"C:\accesalia Dropbox\D SM\Ascensores y rehabilitaciones\MADRID"
SAL = r"C:\accesalia-fichas"
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-q", "--csv"]

TIPO_VIA = re.compile(r"^(calle|c|avenida|avda|avd|av|plaza|pza|pl|paseo|po|pso|camino|"
                      r"carretera|ctra|ronda|travesia|trav|glorieta|gta|bulevar|via)\b")
ARTICULOS = re.compile(r"\b(de|del|la|el|los|las|y)\b")
PREFIJOS = ["avenida", "avda", "avd", "av", "plaza", "pza", "paseo", "pso", "po",
            "carretera", "ctra", "glorieta", "gta", "travesia", "trav", "tr",
            "calle", "cl", "camino", "ronda"]
ART_PEGADO = re.compile(r"(de|del|la|los|las)")

def sin_tildes(s):
    return "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn")

def norm_espacios(t):
    s = sin_tildes(t or "").lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", s)).strip()

def norm(t):
    s = sin_tildes(t).lower()
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return re.sub(r"[^a-z0-9]", "", ARTICULOS.sub(" ", TIPO_VIA.sub(" ", s)))

# Abreviaturas: la carpeta escribe 'avdrmendiguchiacarriche' y Monday
# 'Avenida Doctor Mendiguchia Carriche'. Se generan las dos formas.
ABREV = [("doctor", "dr"), ("santa", "sta"), ("santo", "sto"), ("nuestra", "ntra"),
         ("senora", "sra"), ("general", "gral"), ("hermanos", "hnos"),
         ("avenida", "av"), ("plaza", "pza"), ("paseo", "po"), ("travesia", "tr"),
         ("carretera", "ctra"), ("glorieta", "gta")]

def variantes_abrev(k):
    out = {k}
    for largo, corto in ABREV:
        for x in list(out):
            if largo in x:
                out.add(x.replace(largo, corto))
            if corto in x:
                out.add(x.replace(corto, largo))
    return out

def crudo(t):
    """Sin quitar tipo de via ni articulos: 'Camino de las Cruces' y
    'caminodelascruces' coinciden tal cual. Hace falta porque quitar articulos
    de un texto PEGADO los destroza ('caminodelascruces' -> 'scruces')."""
    return re.sub(r"[^a-z0-9]", "", sin_tildes(t or "").lower())

def claves(v):
    ks = {v}
    for p in PREFIJOS:
        if v.startswith(p) and len(v) - len(p) >= 5:
            ks.add(v[len(p):])
    for k in list(ks):
        sa = ART_PEGADO.sub("", k)
        if len(sa) >= 5:
            ks.add(sa)
    for k in list(ks):
        ks |= variantes_abrev(k)
    return {k for k in ks if len(k) > 4}

def claves_de(texto):
    """Claves por los dos caminos: limpiando la via y en crudo."""
    return claves(norm(texto)) | claves(crudo(texto))

def nums(t):
    return {int(n) for n in re.findall(r"\d{1,3}", t or "") if 0 < int(n) < 1000}

def letras(t):
    return {m.group(1) + m.group(2).lower()
            for m in re.finditer(r"\b(\d{1,3})\s?([A-Za-z])\b", t or "")}

def portales(t):
    """'portal 4' / 'esc C' / 'escalera 4' -> {'portal4','escc','esc4'}.
    Lo escriben LAS DOS fuentes ('...16, portal 4' e 'iglesia16portal4'), asi que
    distingue comunidades hermanas del mismo numero sin inventar nada."""
    s = sin_tildes(t or "").lower()
    out = set()
    for m in re.finditer(r"(portal|escalera|esc|bloque|blq)\s*\.?\s*([a-z0-9](?:\s*-\s*[a-z0-9])*)", s):
        pref = "esc" if m.group(1).startswith("esc") else ("portal" if m.group(1) == "portal" else "blq")
        out.add(pref + m.group(2))
    return out

def via_de(t):
    return re.split(r"\d", t or "", maxsplit=1)[0]

# ---------- 1. carpetas reales ----------
carpetas = []
for d in os.scandir(RAIZ):
    if d.is_dir() and d.name.upper() != "1APROVINCIA":
        carpetas.append(("MADRID", d.name))
for loc in os.scandir(os.path.join(RAIZ, "1APROVINCIA")):
    if loc.is_dir():
        for d in os.scandir(loc.path):
            if d.is_dir():
                carpetas.append((loc.name, d.name))

idx = defaultdict(list)
for loc, nb in carpetas:
    c = {"loc": loc, "nb": nb, "ruta": f"{loc}\\{nb}", "nums": nums(nb),
         "letras": letras(nb), "mun": norm(loc), "portales": portales(nb)}
    for k in claves_de(via_de(nb)):
        idx[k].append(c)
LOCALIDADES = sorted({norm(l) for l, _ in carpetas} - {""}, key=len, reverse=True)
print(f"Carpetas de direccion en Dropbox: {len(carpetas)}   localidades: {len(LOCALIDADES)}")

# ---------- 2. comunidades de Monday ----------
r = subprocess.run(DB + ["-c", """
select c.id, coalesce(c.nombre,'') nombre, coalesce(c.direccion,'') direccion,
       coalesce(c.municipio,'') municipio,
       (select count(*) from proyectos p where p.comunidad_id = c.id) proyectos,
       case when m.registro_id is not null then 'MONDAY' else 'EXCEL' end origen
  from comunidades c
  left join (select distinct registro_id from migracion_monday
              where tabla_destino='comunidades') m on m.registro_id = c.id"""],
                   stdout=subprocess.PIPE)
com = list(csv.DictReader(io.StringIO(r.stdout.decode("utf-8", "replace"))))
print(f"Comunidades en la BD (venidas de Monday): {len(com)}")

def municipios(c):
    texto = " ".join(norm(x) for x in (c["municipio"], c["direccion"], c["nombre"]))
    hits = [l for l in LOCALIDADES if l and l in texto]
    return ({hits[0]} | {h for h in hits if h not in hits[0]}) if hits else set()

# ---------- 3. candidatas por comunidad ----------
for c in com:
    # OJO: `direccion` NO siempre viene geocodificada. Unas filas traen
    # 'Calle de Amaniel, 34, Madrid, España' y otras 'ANDALUCIA 6 FUENLABRADA'
    # en el mismo campo. Partir por comas a ciegas dejaba la calle como
    # 'andalucia6fuenlabrada' y sin numero, y no casaba con nada.
    if "," in c["direccion"]:
        trozos = [t.strip() for t in c["direccion"].split(",")]
        # 'Calle de, Calle Santa Eduvigis, 5': el primer trozo es SOLO un tipo de
        # via, la calle de verdad viene detras (errata de Monday que detecto Monica).
        if len(trozos) > 2 and TIPO_VIA.match(norm_espacios(trozos[0])) and not re.search(r"\d", trozos[0]) \
           and len(norm(trozos[0])) < 3:
            trozos = trozos[1:]
        vtxt, ntxt = trozos[0], (trozos[1] if len(trozos) > 1 else "")
    else:
        texto = c["direccion"] or c["nombre"]
        vtxt, ntxt = via_de(texto), texto
    c["nums"], c["letras"] = nums(ntxt), letras(c["direccion"] or c["nombre"])
    c["portales"] = portales(c["direccion"] or c["nombre"])
    c["muns"] = municipios(c)
    vistas, cands = set(), []
    for k in claves_de(vtxt):
        for x in idx.get(k, []):
            if x["ruta"] in vistas:
                continue
            if c["nums"] and x["nums"] and not (c["nums"] & x["nums"]):
                continue
            if c["letras"] and x["letras"] and not (c["letras"] & x["letras"]):
                continue
            if c["portales"] and x["portales"] and not (c["portales"] & x["portales"]):
                continue
            vistas.add(x["ruta"]); cands.append(x)
    # Una carpeta SIN numero ('LEGANES\polvoranca') encaja con cualquier portal
    # de esa calle y volvia ambiguas a sus vecinas (18, 26, 39). Si alguna
    # candidata trae el numero exacto, las que no lo traen dejan de contar.
    if c["nums"]:
        exactas_num = [x for x in cands if x["nums"] & c["nums"]]
        if exactas_num:
            cands = exactas_num
    # Tramo A: ademas coincide la localidad. Tramo B: solo si A esta vacio,
    # porque Dropbox manda y el municipio de Monday puede venir mal.
    c["A"] = [x for x in cands if not c["muns"] or x["mun"] in c["muns"]]
    c["B"] = cands

# ---------- 3bis. EXCEPCIONES puestas a mano ----------
# Cuando el automatismo no llega (erratas de numero en Monday, carpetas de otra
# region, nombres irreconciliables), Monica pega la carpeta y aqui manda eso.
EXC = os.path.join(SAL, "trazado_excepciones.csv")
etiqueta_de = lambda c: (c["direccion"] or c["nombre"])
por_etiqueta = defaultdict(list)
for c in com:
    por_etiqueta[etiqueta_de(c).strip()].append(c)
carpeta_por_ruta = {f"{loc}\\{nb}": {"loc": loc, "nb": nb, "ruta": f"{loc}\\{nb}",
                                     "nums": nums(nb), "letras": letras(nb),
                                     "mun": norm(loc), "portales": portales(nb)}
                    for loc, nb in carpetas}
n_exc, exc_falladas = 0, []
if os.path.exists(EXC):
    with open(EXC, encoding="utf-8-sig", newline="") as fh:
        for fila in csv.DictReader(fh):
            objetivo = por_etiqueta.get((fila["comunidad_monday"] or "").strip(), [])
            ruta_txt = (fila["carpeta"] or "").strip()
            carp = carpeta_por_ruta.get(ruta_txt)
            if not carp and ruta_txt:
                # Una ruta escrita a mano MANDA aunque el censo no conozca esa
                # carpeta: hay agrupaciones que no siguen la estructura habitual
                # (urbanizaciones con las direcciones dentro, bloques con ficha
                # propia). Basta con que exista en el disco.
                ARBOL = os.path.dirname(RAIZ)
                loc, _, nb = ruta_txt.rpartition("\\")
                for candidata in (os.path.join(ARBOL, ruta_txt),   # ruta completa desde el arbol
                                  os.path.join(RAIZ, ruta_txt),
                                  os.path.join(RAIZ, loc, nb),
                                  os.path.join(RAIZ, "1APROVINCIA", loc, nb)):
                    if os.path.isdir(candidata):
                        # la localidad es la carpeta padre que sea una localidad conocida
                        partes = [p for p in ruta_txt.split("\\")]
                        localidad = next((p for p in reversed(partes[:-1])
                                          if norm(p) in LOCALIDADES), loc or "MADRID")
                        carp = {"loc": localidad, "nb": nb, "ruta": ruta_txt,
                                "nums": nums(nb), "letras": letras(nb),
                                "mun": norm(localidad), "portales": portales(nb)}
                        carpeta_por_ruta[ruta_txt] = carp
                        break
            if len(objetivo) == 1 and carp:
                objetivo[0]["A"] = [carp]      # la excepcion sustituye al automatismo
                objetivo[0]["B"] = [carp]
                n_exc += 1
            else:
                exc_falladas.append([fila["comunidad_monday"], fila["carpeta"],
                                     "etiqueta repetida o ausente" if not len(objetivo) == 1
                                     else "la carpeta no existe"])
    print(f"Excepciones aplicadas a mano: {n_exc}" +
          (f"   (sin aplicar: {len(exc_falladas)})" if exc_falladas else ""))

# ---------- 4. resolver 1:1 (una carpeta no puede ser de dos comunidades) ----------
aspirantes = defaultdict(list)
for c in com:
    lista = c["A"] or c["B"]
    if len(lista) == 1:
        aspirantes[lista[0]["ruta"]].append(c)
disputadas = {ruta for ruta, cs in aspirantes.items() if len(cs) > 1}

ok, ambiguo, sin = [], [], []
for c in com:
    etiqueta = c["direccion"] or c["nombre"]
    lista, tramo = (c["A"], "A") if c["A"] else (c["B"], "B")
    rutas = " | ".join(x["ruta"] for x in lista[:6])
    if len(lista) == 1 and lista[0]["ruta"] in disputadas:
        otras = " ; ".join((o["direccion"] or o["nombre"]) for o in aspirantes[lista[0]["ruta"]]
                           if o["id"] != c["id"])
        ambiguo.append(["CARPETA DISPUTADA por varias comunidades", etiqueta, c["municipio"],
                        c["proyectos"], rutas, f"tambien la reclama: {otras}"])
    elif len(lista) == 1:
        x = lista[0]
        aviso = "" if tramo == "A" else "MUNICIPIO de Monday no cuadra: manda Dropbox"
        ok.append([c["id"], etiqueta, c["municipio"], x["ruta"], x["loc"], x["nb"],
                   c["proyectos"], aviso])
    elif len(lista) > 1:
        motivo = ("misma direccion en VARIAS LOCALIDADES" if len({x["mun"] for x in lista}) > 1
                  else "varias carpetas en la misma localidad")
        ambiguo.append([f"VARIAS CARPETAS ({motivo})", etiqueta, c["municipio"],
                        c["proyectos"], rutas, ""])
    else:
        sin.append([etiqueta, c["municipio"], c["proyectos"]])

def escribe(nombre, cab, filas):
    ruta = os.path.join(SAL, nombre)
    with open(ruta, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh); w.writerow(cab); w.writerows(sorted(filas))
    print(f"   -> {ruta}  ({len(filas)})")

print(f"\n=== TRAZADO 1:1 de las {len(com)} comunidades de Monday ===")
print(f"  TRAZADAS a UNA carpeta      : {len(ok):5}"
      f"   (de ellas {sum(1 for x in ok if x[7])} con el municipio de Monday mal)")
print(f"  AMBIGUAS (revisas tu)       : {len(ambiguo):5}")
print(f"  SIN CARPETA localizable     : {len(sin):5}")
print(f"\n  Carpetas de Dropbox usadas  : {len({x[3] for x in ok})} de {len(carpetas)}")
print(f"  Fuera del trazado quedan    : {len(carpetas) - len({x[3] for x in ok})} carpetas (historico, otra fase)")

escribe("trazado_ok.csv", ["comunidad_id", "comunidad_monday", "municipio_monday",
                           "carpeta_dropbox", "localidad_dropbox", "carpeta", "proyectos",
                           "aviso"], ok)
escribe("trazado_ambiguo.csv", ["motivo", "comunidad_monday", "municipio_monday",
                                "proyectos", "carpetas_candidatas", "detalle"], ambiguo)
escribe("trazado_sin_carpeta.csv", ["comunidad_monday", "municipio_monday", "proyectos"], sin)

# ---------- 5. las de MONDAY que no casan, con pistas para revisarlas ----------
# Para cada una se buscan carpetas de SU localidad por dos caminos distintos:
# calle parecida (aunque este escrita de otra forma) y mismo numero de portal
# (util cuando el nombre de la calle no se parece en nada entre las dos fuentes).
por_localidad = defaultdict(list)
for loc, nb in carpetas:
    por_localidad[norm(loc)].append((loc, nb, nums(nb), norm(via_de(nb))))

# Lo que Monica ya anoto en la ronda anterior, para no pedirselo dos veces.
notas_previas = {}
prev = os.path.join(SAL, "monday_no_casan_REVISADO_Monica.csv")
if os.path.exists(prev):
    with open(prev, encoding="utf-8-sig", newline="") as fh:
        for fila in csv.DictReader(fh):
            n = (fila.get("carpetas_candidatas") or "").strip()
            if fila["motivo"].startswith("CARPETA DISPUTADA"):
                n = (fila.get("carpetas_con_calle_parecida") or "").strip()
            if n:
                notas_previas[(fila["comunidad_monday"] or "").strip()] = n

trazadas_ids = {x[0] for x in ok}
no_casan = []
for c in com:
    if c["origen"] != "MONDAY" or c["id"] in trazadas_ids:
        continue
    lista = c["A"] or c["B"]
    if lista:
        motivo = ("CARPETA DISPUTADA (otra comunidad reclama la misma)"
                  if len(lista) == 1 else
                  ("VARIAS CARPETAS en distintas localidades"
                   if len({x["mun"] for x in lista}) > 1 else "VARIAS CARPETAS en la misma localidad"))
        candidatas = " | ".join(x["ruta"] for x in lista[:6])
        parecidas = mismo_num = ""
    else:
        motivo = "SIN CARPETA que encaje"
        candidatas = ""
        vc = norm(via_de(c["direccion"].split(",")[0] if c["direccion"] else c["nombre"]))
        pool = [x for m in (c["muns"] or por_localidad) for x in por_localidad.get(m, [])]
        prox = sorted(((SequenceMatcher(None, vc, p[3]).ratio(), p) for p in pool if p[3]),
                      key=lambda t: -t[0])[:4]
        parecidas = " | ".join(f"{l}\\{nb}" for r_, (l, nb, _, _) in prox if r_ >= 0.6)
        mismo_num = " | ".join(f"{l}\\{nb}" for l, nb, nn, _ in pool if c["nums"] and nn & c["nums"])[:300]
    no_casan.append([motivo, etiqueta_de(c), c["municipio"], c["proyectos"],
                     notas_previas.get(etiqueta_de(c).strip(), ""),
                     candidatas, parecidas, mismo_num, ""])

escribe("monday_no_casan.csv",
        ["motivo", "comunidad_monday", "municipio_monday", "proyectos",
         "TU_NOTA_ANTERIOR", "carpetas_candidatas", "carpetas_con_calle_parecida",
         "carpetas_con_ese_numero_en_la_localidad", "TU_RESPUESTA"], no_casan)
print(f"\n=== MONDAY QUE NO CASAN: {len(no_casan)} ===")
for m, n in sorted(((m, sum(1 for x in no_casan if x[0] == m)) for m in {x[0] for x in no_casan}),
                   key=lambda x: -x[1]):
    print(f"  {n:4}  {m}")

print("\n--- AMBIGUAS: reparto por motivo ---")
for m, n in sorted(((m, sum(1 for a in ambiguo if a[0] == m)) for m in {a[0] for a in ambiguo}),
                   key=lambda x: -x[1]):
    print(f"  {n:4}  {m}")
print("\n--- 10 ambiguas de ejemplo ---")
for a in ambiguo[:10]:
    print(f"  {a[1][:46]:46} [{a[2]:<12}] -> {a[4]}")




