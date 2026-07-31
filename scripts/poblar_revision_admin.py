# -*- coding: utf-8 -*-
r"""
Rellena migracion_admin_revision: bloque ADMINISTRADOR de la ficha, en campos
normalizados, una fila por comunidad VIVA (Monday + trazada a su carpeta).

PRIMERA VUELTA: solo el caso ESTANDAR, aquel en el que todas las fichas de la
comunidad dicen lo mismo (a lo sumo un valor distinto por campo). Las que
declaran mas de un administrador quedan FUERA: son otro problema y tendran su
propia estrategia. No se guarda nada a medias ni como texto libre.

Normalizacion en este paso: solo la mecanica y reversible -espacios, correo a
minusculas, telefono a digitos-. Los nombres NO se tocan: si vienen pegados a un
telefono es un fallo de extraccion que hay que ver antes de decidir como cortar.

Idempotente: borra y rellena, preservando `revisado`/`nota_revision`.

DRY-RUN por defecto. --apply para escribir.
Uso: python scripts/poblar_revision_admin.py [--apply]
"""
import sys, io, re, csv, subprocess
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

APPLY = "--apply" in sys.argv
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"]
CAMPOS = {"NOMBRE": "nombre", "E-MAIL": "email", "TELEFONO": "telefono",
          "PERSONA DE CONTACTO": "persona", "DIRECCION": "direccion"}

def sql(q):
    r = subprocess.run(DB + ["--csv", "-c", q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    t = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(t); sys.exit(1)
    return list(csv.DictReader(io.StringIO(t)))

def esc(s):
    return "'" + (s or "").replace("'", "''") + "'"

def espacios(v):
    return re.sub(r"\s+", " ", v or "").strip()

def norm_tel(v):
    """La agrupacion cambia de ficha a ficha ('605 465 008', '91 022 82 32',
    '623.757.958 /// 910.090.695') y a veces dos numeros van pegados sin
    separador. Por eso no se busca un patron: se juntan los digitos y se corta
    de nueve en nueve. Si el resto no cuadra, se devuelve el valor CRUDO: mejor
    sucio y visible que limpio y perdido."""
    tels, resto = [], []
    for trozo in re.split(r"[^\d\s.\-–+]+", v):          # letras, /, ( ) parten
        for run in re.findall(r"\d[\d\s.\-–]*", trozo):
            d = re.sub(r"\D", "", run)
            while len(d) >= 9 and d[0] in "6789":
                tels.append(d[:9]); d = d[9:]
            if d:
                resto.append(d)
    if resto or not tels:
        return espacios(v)                                     # crudo, sin inventar
    return ", ".join(dict.fromkeys(tels))

# El NOMBRE de la ficha arrastra el seguimiento del pedido de documentacion:
# "ZOE ASESORES S.L. (pedido 30/5/22 ...)Lunes a jueves: De 9:30 a 14:00".
# Estos marcadores salen de mirar los 495 valores reales, no de suponer. Van
# ordenados por lo que aparece: pedidos de docs (131), fechas (132), parentesis
# (73), "a traves de" (38).
MARCAS = re.compile(r"""(?ix)
    pedid[oa]s?\b                        # pedidos docs / pedidos datos
  | a\s*trav[eé]s\s+de\b                 # derivacion, no es el administrador
  # sin \b delante a proposito: la nota suele ir PEGADA al nombre, sin espacio
  # ("GESAHBOXPedidos docs", "URBAGESTORESA traves de")
  | \bl\s*a\s*[vj]\b                     # L a V de 9 a 2
  | \b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado)\b
  | \bno\s+han?\s+(mandado|enviado)\b
  | \breclamad[oa]\b
  | \bcompromiso\b
  | \bnuevo\s+administrador\b
  | \d{1,2}\s*[/-]\s*\d{1,2}             # una fecha suelta
  | [\w.+-]+@[\w-]+\.[\w-]+              # correo pegado
  | \b\d{9}\b                            # telefono pegado
  | \b[A-Z]\d{8}\b                       # CIF pegado
""")
# Un parentesis solo corta si lo que hay dentro es una nota: en "A TRAVES DE CEGA
# (ADMINISTRACION DE FINCAS RAMIREZ)" el parentesis ES el nombre.
NOTA_PAREN = re.compile(r"(?i)pedid|docs|tlf|\d{1,2}[/-]\d{1,2}|mandan|record")

def partir_nombre(v):
    """-> (nombre, extras). Corta en la PRIMERA marca. Nunca tira texto:
    nombre + extras vuelve a ser el original."""
    v = espacios(v)
    cortes = [m.start() for m in MARCAS.finditer(v)]
    for m in re.finditer(r"\(", v):
        cierre = v.find(")", m.start())
        if NOTA_PAREN.search(v[m.start():cierre + 1 if cierre > 0 else len(v)]):
            cortes.append(m.start())
    if not cortes:
        return v, ""
    i = min(cortes)
    # el corte cae dentro de una palabra pegada ("GESAHBOXPedidos"): se respeta,
    # la mayuscula del marcador ya marca donde empieza la nota
    return v[:i].strip(" -–,;:.·|<>("), v[i:].strip()

def norm_mail(v):
    ms = re.findall(r"[\w.+-]+@[\w-]+\.[\w.-]+", v)
    if not ms:
        return espacios(v)                                     # crudo, sin inventar
    return ", ".join(dict.fromkeys(m.lower().rstrip(".,;") for m in ms))

# ---------- valores crudos por comunidad y campo ----------
filas = sql(r"""
select f.comunidad_id, f.ficha_ref, k.etiqueta, k.valor,
       coalesce(nullif(c.direccion,''), c.nombre) comunidad,
       coalesce(c.municipio,'') localidad
  from migracion_ficha f
  join comunidades c on c.id = f.comunidad_id
  join migracion_monday m on m.registro_id = c.id and m.tabla_destino = 'comunidades'
  join migracion_ficha_campo k
    on k.ficha_id = f.id and k.seccion = 'administrador' and k.valor <> ''
   -- lo tachado es la administracion ANTERIOR: no entra aqui. Se conserva en la
   -- staging y va a la tabla de cambios, pero no puede ser la vigente.
   and not k.tachado
 where k.etiqueta in ('NOMBRE','E-MAIL','TELEFONO','PERSONA DE CONTACTO','DIRECCION')
""")

com, fichas_de, valores = {}, defaultdict(set), defaultdict(lambda: defaultdict(set))
for f in filas:
    cid = f["comunidad_id"]
    com[cid] = (espacios(f["comunidad"]), espacios(f["localidad"]))
    fichas_de[cid].add(f["ficha_ref"])
    valores[cid][CAMPOS[f["etiqueta"]]].add(espacios(f["valor"]))

# ---------- separar estandar de conflictivas ----------
def solo_letras(s):
    return re.sub(r"[^0-9a-z]", "", (s or "").lower()
                  .translate(str.maketrans("áéíóúüñ", "aeiouun")))

MARCAS_NOTA = re.compile(r"(?i)pedid[oa]s?\b|a\s*trav[eé]s\s+de\b|\bl\s*a\s*[vj]\b|"
                         r"\b(lunes|martes|mi[eé]rcoles|jueves|viernes)\b|\d{1,2}\s*[/-]\s*\d{1,2}|\(")

def clave(v):
    """Para comparar dos escrituras del mismo dato: fuera la nota pegada."""
    m = MARCAS_NOTA.search(v or "")
    v = (v or "")[:m.start()] if m else (v or "")
    return re.sub(r"[^A-Z0-9]", "",
                  v.upper().translate(str.maketrans("ÁÉÍÓÚÜÑ", "AEIOUUN")))

def acuerdan(vs):
    """Dos fichas de la misma comunidad no discrepan solo por apuntar una
    persona mas: 'MIGUEL' y 'MIGUEL MARCOS BRIGIDANO' son la misma casa. Si
    todas las escrituras caben dentro de la mas larga, vale esa."""
    ks = sorted({clave(v) for v in vs if clave(v)}, key=len)
    if not ks:
        return None
    if all(k in ks[-1] for k in ks):
        return max(vs, key=lambda v: len(clave(v)))
    return None

# Conflictos que Monica reviso uno a uno. Sin esto se quedarian fuera para
# siempre: son discrepancias que ninguna regla puede resolver sola.
DECIDIDOS = {}
try:
    for f in csv.DictReader(open(r"C:\accesalia-fichas\conflictos_admin_resueltos.csv",
                                 encoding="utf-8-sig")):
        DECIDIDOS[f["comunidad_id"]] = (f["decision"], espacios(f["valor_nombre"]))
except FileNotFoundError:
    pass

estandar, conflicto, perdidos = [], [], []
for cid, campos in valores.items():
    resuelto = {c: (next(iter(vs)) if len({v.upper() for v in vs}) == 1 else acuerdan(vs))
                for c, vs in campos.items()}
    dec, valor = DECIDIDOS.get(cid, (None, ""))
    if dec:
        # se queda la escritura mas completa de cada campo; el nombre, si Monica
        # dio uno, manda sobre todo lo demas
        for c, vs in campos.items():
            if resuelto[c] is None:
                resuelto[c] = max(vs, key=lambda v: len(clave(v)))
        if valor:
            resuelto["nombre"] = valor
    if any(r is None for r in resuelto.values()):
        conflicto.append(cid)
        continue
    uno = resuelto
    nom, extras = partir_nombre(uno.get("nombre", ""))
    # El corte separa, no borra. Se comprueba aqui, ANTES de aplicar lo que
    # Monica corrigio a mano: lo que se audita es la regla, no su trabajo.
    if solo_letras(nom + extras) != solo_letras(uno.get("nombre", "")):
        perdidos.append((cid, uno.get("nombre", "")))
    estandar.append({
        "comunidad_id": cid, "comunidad": com[cid][0], "localidad": com[cid][1],
        "n_fichas": len(fichas_de[cid]),
        "nombre": nom, "extras": extras,
        "email": norm_mail(uno.get("email", "")),
        "telefono": norm_tel(uno.get("telefono", "")),
        "persona": uno.get("persona", ""),
        "direccion": uno.get("direccion", ""),
    })

# ---------- correcciones de la ficha misma ----------
# Distinto de conflictos_admin_resueltos: alli se elige entre lo que dicen varias
# fichas. Aqui lo escrito en el .docx ya NO ES CIERTO y Monica lo ha averiguado
# por fuera (llamando, mirando actas). Ejemplo: en Villasandino 10 la ficha dice
# INMHO porque asi se voto en junta, pero INMHO no llego a presentarse.
# Se aplica al final: manda sobre la extraccion y sobre las reglas.
CORREGIDO = defaultdict(dict)
try:
    for f in csv.DictReader(open(r"C:\accesalia-fichas\fichas_correcciones.csv",
                                 encoding="utf-8-sig")):
        if (f.get("comunidad_id") or "").strip() and (f.get("campo") or "").strip():
            CORREGIDO[f["comunidad_id"].strip()][f["campo"].strip()] = (f.get("valor") or "").strip()
except FileNotFoundError:
    pass
if CORREGIDO:
    n = 0
    for e in estandar:
        for c, v in CORREGIDO.get(e["comunidad_id"], {}).items():
            if c in e:
                e[c] = v; n += 1
    print(f"correcciones de ficha aplicadas: {n} campos en {len(CORREGIDO)} comunidades")

estandar.sort(key=lambda x: (x["localidad"], x["comunidad"]))
print(f"COMPROBACION del corte (nombre+extras == original): "
      f"{'OK' if not perdidos else str(len(perdidos)) + ' NO CUADRAN'}")
if perdidos:
    for cid, v in perdidos[:5]:
        print(f"   {v[:90]}")
    sys.exit(1)

# ---------- lo que Monica reviso a mano manda sobre lo extraido ----------
# Se lee del CSV en cada pasada, no se guarda solo en la BD: asi el script se
# puede relanzar entero sin perder su trabajo.
HOJA = r"C:\accesalia-fichas\admin_sin_nombre.csv"
COLS_HOJA = {"email": "email", "telefono": "telefono",
             "persona_de_contacto": "persona", "direccion": "direccion"}
revisadas, corregidas = {}, 0
try:
    hoja = list(csv.DictReader(open(HOJA, encoding="utf-8-sig")))
except FileNotFoundError:
    hoja = []
if hoja:
    por_texto = defaultdict(list)
    for f in estandar:
        por_texto[f["comunidad"]].append(f)
    for fila in hoja:
        # `comunidad_id` es la clave buena; el texto solo se usa la primera vez,
        # antes de que la hoja lo lleve escrito (casar por direccion ya ha
        # fallado otras veces al cambiar una direccion despues)
        destino = None
        if fila.get("comunidad_id"):
            destino = next((f for f in estandar if f["comunidad_id"] == fila["comunidad_id"]), None)
        else:
            iguales = por_texto.get(espacios(fila["comunidad"]), [])
            if len(iguales) == 1:
                destino = iguales[0]
            elif len(iguales) > 1:
                print(f"  AVISO: '{fila['comunidad']}' sale {len(iguales)} veces, no se aplica")
        if not destino:
            print(f"  AVISO: la hoja trae una comunidad que ya no esta: {fila['comunidad'][:60]}")
            continue
        revisadas[destino["comunidad_id"]] = fila
        if espacios(fila.get("NOMBRE_CORRECTO", "")):
            destino["nombre"] = espacios(fila["NOMBRE_CORRECTO"])
            corregidas += 1
        for c_hoja, c_bd in COLS_HOJA.items():
            v = espacios(fila.get(c_hoja, ""))
            if v != destino[c_bd]:
                destino[c_bd] = v
    print(f"\n  hoja revisada a mano: {len(hoja)} filas, {corregidas} con nombre recuperado")
print(f"comunidades vivas con bloque de administrador : {len(valores)}")
print(f"  ESTANDAR (todas sus fichas coinciden)       : {len(estandar)}")
print(f"  con mas de un administrador -> otra vuelta  : {len(conflicto)}")
print()
for c in ("nombre", "email", "telefono", "persona", "direccion"):
    print(f"  con {c:10}: {sum(1 for f in estandar if f[c])}")

print(f"\n  nombres partidos en nombre + extras : {sum(1 for f in estandar if f['extras'])}")
print(f"  nombres que quedan vacios al cortar : {sum(1 for f in estandar if f['extras'] and not f['nombre'])}")
largos = [f for f in estandar if len(f["nombre"]) > 45]
print(f"  nombres que AUN pasan de 45 letras  : {len(largos)}")
for f in largos[:6]:
    print(f"     {f['nombre'][:88]}")
print("\n  muestra del corte:")
for f in [x for x in estandar if x["extras"]][:8]:
    print(f"     {f['nombre'][:42]:42} || {f['extras'][:52]}")

# ---------- segunda hoja: nombres con dos cosas pegadas ----------
# No se detectan por longitud sino por como se pegan de verdad: una minuscula
# seguida de MAYUSCULA ("RedondoAdministracion"), un " o " que ofrece dos
# opciones, un punto en medio. Salen falsos positivos ("A.F. SERRANO LOBO") y
# se dejan pasar: los descarta Monica de un vistazo, y colar uno mal cortado
# cuesta mucho mas que mirar seis de mas.
PEGADO = re.compile(r"[a-záéíóúñ][A-ZÁÉÍÓÚÑ]|\s+o\s+|\w\.\s+[A-ZÁÉÍÓÚ]\w")
HOJA2 = r"C:\accesalia-fichas\admin_nombre_pegado.csv"
CAB2 = ["comunidad_id", "localidad", "comunidad", "nombre_extraido", "persona_extraida",
        "NOMBRE_CORRECTO", "PERSONA_CORRECTA"]
pegados = [f for f in estandar
           if f["nombre"] and (len(f["nombre"]) > 45 or PEGADO.search(f["nombre"]))]
try:
    hoja2 = list(csv.DictReader(open(HOJA2, encoding="utf-8-sig")))
except FileNotFoundError:
    hoja2 = []
if hoja2:
    ind = {f["comunidad_id"]: f for f in estandar}
    tocadas = 0
    for fila in hoja2:
        # solo las columnas conocidas: Excel puede anadir sobrantes sin cabecera
        if not any(espacios(fila.get(c, "")) for c in CAB2):
            continue                       # fila en blanco que deja Excel al final
        d = ind.get(espacios(fila.get("comunidad_id", "")))
        if not d:
            print(f"  AVISO: hoja de pegados, comunidad que ya no esta: {fila['comunidad'][:60]}")
            continue
        # En blanco = "dejalo como esta", que es lo que se pidio en la hoja. Para
        # vaciar un campo hay que decirlo, no callarse.
        if espacios(fila.get("NOMBRE_CORRECTO", "")):
            d["nombre"] = espacios(fila["NOMBRE_CORRECTO"]); tocadas += 1
        if espacios(fila.get("PERSONA_CORRECTA", "")):
            d["persona"] = espacios(fila["PERSONA_CORRECTA"])
    print(f"  hoja de nombres pegados: {len(hoja2)} filas, {tocadas} corregidas")
else:
    with open(HOJA2, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(CAB2)
        for f in sorted(pegados, key=lambda x: x["nombre"]):
            w.writerow([f["comunidad_id"], f["localidad"], f["comunidad"],
                        f["nombre"], f["persona"], "", ""])
    print(f"  -> {HOJA2}  ({len(pegados)} nombres a revisar)")

# Hoja de revision. Si ya existe es de Monica: NO se pisa, solo se le anade la
# columna comunidad_id la primera vez para dejar de casar por texto.
CAB = ["comunidad_id", "localidad", "comunidad", "lo_que_pone_la_ficha", "email",
       "telefono", "persona_de_contacto", "direccion", "NOMBRE_CORRECTO"]
if not hoja:
    sin_nombre = sorted((f for f in estandar if not f["nombre"]),
                        key=lambda x: (x["localidad"], x["comunidad"]))
    with open(HOJA, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(CAB)
        for f in sin_nombre:
            w.writerow([f["comunidad_id"], f["localidad"], f["comunidad"], f["extras"],
                        f["email"], f["telefono"], f["persona"], f["direccion"], ""])
    print(f"\n  -> {HOJA}  ({len(sin_nombre)} filas para revisar)")
elif "comunidad_id" not in hoja[0]:
    inv = {v["comunidad"]: k for k, v in revisadas.items()}
    with open(HOJA, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(CAB)
        for fila in hoja:
            w.writerow([inv.get(fila["comunidad"], "")] + [fila.get(c, "") for c in CAB[1:]])
    print(f"  -> hoja reescrita con comunidad_id (se conserva todo lo que escribiste)")
crudo_tel = [f for f in estandar if f["telefono"] and not re.fullmatch(r"\d{9}(, \d{9})*", f["telefono"])]
crudo_mail = [f for f in estandar if f["email"] and "@" not in f["email"]]
print(f"  telefonos que no se han podido normalizar (crudos): {len(crudo_tel)}")
for f in crudo_tel[:8]:
    print(f"     {f['telefono'][:88]}")
print(f"  correos que no parecen correo (crudos): {len(crudo_mail)}")

if not APPLY:
    print("\nDRY-RUN. --apply para escribir.")
    sys.exit(0)

# ---------- escritura, preservando la revision a mano ----------
cols = ["comunidad_id", "comunidad", "localidad", "n_fichas", "nombre", "extras",
        "email", "telefono", "persona", "direccion", "resuelto", "nota_revision"]
# Se dan por buenas las que se quedan con un nombre: venia limpio, se separo de
# su nota, o Monica lo recupero a mano. Las que ella miro y dejo en blanco
# tambien quedan cerradas: el dato no esta en ningun sitio.
for f in estandar:
    f["nota_revision"] = ""
    if f["nombre"]:
        f["resuelto"] = "true"
    elif f["comunidad_id"] in revisadas:
        f["resuelto"] = "true"
        f["nota_revision"] = "sin administrador en la ficha: irrecuperable (revisado por Monica)"
    else:
        f["resuelto"] = "false"
vals = ["(" + ",".join([esc(f["comunidad_id"]) + "::uuid", esc(f["comunidad"]),
                        esc(f["localidad"]), str(f["n_fichas"])] +
                       [esc(f[c]) for c in cols[4:-2]] +
                       [f["resuelto"], esc(f["nota_revision"])]) + ")" for f in estandar]

stmt = (
    "create temp table _rev as select * from migracion_admin_revision with no data;\n"
    f"insert into _rev ({','.join(cols)}) values\n" + ",\n".join(vals) + ";\n"
    "update _rev r set revisado = a.revisado from migracion_admin_revision a\n"
    " where a.comunidad_id = r.comunidad_id;\n"
    "delete from migracion_admin_revision;\n"
    f"insert into migracion_admin_revision ({','.join(cols)}, revisado)\n"
    # la temp no hereda los DEFAULT, asi que revisado llega nulo si nadie lo puso
    f"select {','.join(cols)}, coalesce(revisado,false) from _rev;\n"
)
r = subprocess.run(DB, input=("begin;\n" + stmt + "commit;").encode("utf-8"),
                   stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
print(r.stdout.decode("utf-8", "replace").strip())
if r.returncode:
    sys.exit(1)
print(f"\nHECHO: {len(estandar)} filas en migracion_admin_revision.")
