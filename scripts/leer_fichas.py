# -*- coding: utf-8 -*-
"""
LEER LA FICHA DE DATOS DE CADA CARPETA DEL DROPBOX   (Monica, 4-oct-2026)

Su encargo, literal: "de todas, miraria en la ficha de datos quien es el
administrador y el presidente, y en todas copiaria en nuestro apartado notas lo
que venga en las notas de la ficha. Como hemos visto, la info que viene en notas
es en muchos casos lo verdaderamente interesante."

ESTO NO ESCRIBE NADA. Lee, extrae y deja un CSV para mirar.

HAY DOS MAQUETAS, no una:

  A) FICHA DATOS TECNICOS  -  la larga. Secciones en mayusculas
     (DATOS ADMINISTRADOR DE FINCAS, DATOS COMUNIDAD DE PROPIETARIOS,
     DATOS AYUNTAMIENTO, DATOS DEL PROYECTO, NOTAS) y debajo de cada
     etiqueta, su valor en la linea siguiente.

  B) FICHA DE DATOS ACCESALIA  -  la corta. Mismo estilo de etiqueta y
     valor debajo, pero sin ayuntamiento ni proyecto, y con el CIF y el
     presidente metidos DENTRO del bloque de NOTAS, en lineas del tipo
     "CIF:<tab>H78759537" y "Presidente:<tab>ANTONIO ESCOLAR".

POR QUE SE LEE ASI Y NO CON UNA PLANTILLA FIJA: un docx guarda el texto partido
en trozos, y una etiqueta puede venir sola en su parrafo y el valor en el
siguiente, o los dos en el mismo con un tabulador en medio. Se recorre la lista
de lineas buscando etiquetas y se coge lo que viene detras hasta la siguiente
etiqueta conocida. Es tosco y es a proposito: cualquier cosa mas lista se
equivoca en silencio con las fichas que no siguen el molde.
"""
import csv
import io
import os
import re
import sys
import zipfile

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

DROPBOX = r"C:\accesalia Dropbox\D SM\Ascensores y rehabilitaciones"
PROVINCIA = os.path.join(DROPBOX, "MADRID", "1APROVINCIA")
PINTA_FICHA = re.compile(r"ficha|datos", re.I)

# Las etiquetas, tal como aparecen. El orden no importa; lo que importa es que
# esten TODAS, porque el valor de una etiqueta es lo que hay hasta la siguiente.
ETIQUETAS = [
    "FECHA LLEGADA", "FECHA INICIO", "REF CATASTRAL", "CODIGO POSTAL",
    "EMPRESA/CLIENTE", "AGENTE COMERCIAL", "TIPO DE OBRA", "DISTRITO/AYTO",
    "TECNICO", "FECHA ENCARGO", "MEDIADOR", "DIRECCION", "DIRECCIÓN",
    "NOMBRE EMPRESA", "NOMBRE", "EMPRESA", "CIF", "PRESIDENTE",
    "DNI PRESIDENTE", "PERSONA DE CONTACTO", "TELEFONO", "TELÉFONO",
    "E-MAIL", "E_MAIL", "JUNTA DE DISTRITO", "TECNICO DEL AYTO",
    "PEM", "GESTION DE RESIDUOS", "SUPERFICIES A INTERVENIR",
    "Nº REF VISADO COAM", "Nº EXPEDIENTE AYUNTAMIENTO", "Nº LICENCIA",
    "DECLARACION O LICENCIA", "OTROS:", "NOTAS", "SUPERFICIES",
    "DATOS ADMINISTRADOR DE FINCAS", "DATOS COMUNIDAD DE PROPIETARIOS / PROMOTOR",
    "DATOS AYUNTAMIENTO", "DATOS DEL PROYECTO", "DATOS ENCARGO",
    "PROMOTOR", "DIRECCION FISCAL", "NOMBRE REPRESENTANTE", "NIF",
    "Nº DE PRESUPUESTO", "ADMINISTRADOR DE FINCAS", "HONORARIOS",
]
SECCIONES = ["DATOS ADMINISTRADOR DE FINCAS",
             "DATOS COMUNIDAD DE PROPIETARIOS / PROMOTOR",
             "DATOS AYUNTAMIENTO", "DATOS DEL PROYECTO", "DATOS ENCARGO",
             "PROMOTOR", "NOTAS"]



# ---------------------------------------------------------------- LAS NOTAS
# TRES SITIOS CON NOTAS, Y SON COSAS DISTINTAS A PROPOSITO. La maqueta larga
# -unas 78 fichas de 410- no tiene un apartado de notas, tiene tres, cada uno
# con su encabezado, al mismo nivel que DATOS DEL PROYECTO o DATOS SUBVENCIONES:
#
#   notas (dentro de DATOS ADMINISTRADOR DE FINCAS) -> del administrador
#   NOTAS ENCARGO Y PROYECTO                        -> del encargo
#   NOTAS SUBVENCIONES                              -> de la subvencion
#
# Monica, 4-oct-2026, preguntando antes de decidir: "depende de si se han
# guardado expresamente como cosas diferentes o si simplemente es la misma cosa
# con notas internas distintas". Se guardaron expresamente como cosas distintas,
# asi que cada una va a su campo. La maqueta corta solo tiene NOTAS, y esa es la
# general.
#
# Y esto es lo que se venia a buscar. De una sola ficha (Alava 12):
#   "---------- Forwarded message --------- De: LORMAN ADMINISTRACIONES (...)
#    Solicitamos por favor nos remitais hoja de encargo CSS (...) - Sara
#    26/09 ENVIADA HE CSS POR CARLOS LUEGO DE QUE DANIEL INDICASE ENVIARLA (...)
#    26/09/2025 HE RECIBIDA FIRMADA"
# El correo entero, y debajo el diario: una fecha, una nota.
CABECERAS_NOTAS = ["NOTAS ENCARGO Y PROYECTO", "NOTAS SUBVENCIONES", "NOTAS"]

# Donde se corta un bloque de notas: en la siguiente cabecera de lo que sea.
CORTAN_NOTAS = set(SECCIONES) | set(CABECERAS_NOTAS) | {
    "DATOS SUBVENCIONES", "DATOS CONTRATA", "STATUS DOCUMENTACION CP",
    "SUPERFICIES A INTERVENIR", "DATOS ENCARGO",
}


def _cabecera(linea):
    """Si la linea es el encabezado de un bloque (de notas o de seccion)."""
    l = linea.strip().rstrip(":").strip().upper()
    if l in {c.upper() for c in CABECERAS_NOTAS}:
        return l
    if l in {c.upper() for c in CORTAN_NOTAS}:
        return l
    return None


# LAS NOTAS VAN ENTERAS, TAL COMO ESTAN ESCRITAS. No se filtra nada.
#
# Llegue a quitar dos cosas por mi cuenta: las etiquetas vacias del impreso
# ("Propiedad:", "CIF:" sin nada detras) y las 190 lineas que son etiqueta CON
# valor cuyo dato ya se guarda en su columna (CIF 73, PRESIDENTE 39, DNI,
# telefono...). Monica me paro, 4-oct-2026: "de nuevo estas tomando iniciativas
# que yo no tengo claro que son. Me estas diciendo que estas capando parte de las
# notas porque tu consideras que ese dato ya esta duplicado en otro sitio?".
#
# Tenia razon, y ademas choca con una regla suya: GUARDAR TODO, MOSTRAR LO UTIL.
# La nota es el documento tal como esta escrito. Si sobra algo, se esconde al
# pintarlo, no al guardarlo: lo que no se guarda no se recupera.
#
# (_vacia_de_formulario se deja escrita por si algun dia se quiere filtrar AL
#  MOSTRAR, pero no se usa al leer.)
def _vacia_de_formulario(linea):
    """Una linea que es SOLO etiquetas vacias del formulario: "Propiedad:",
       "CIF:", "PEM:	residuos:". No es contenido, es el impreso en blanco."""
    t = linea.strip()
    if not t:
        return True
    if es_etiqueta(t):   # una etiqueta sola, sin valor detras
        return True
    return bool(re.fullmatch(r"(?:[A-Za-zÀ-ſ°º\s/\.\-]{2,40}:\s*)+", t))


def notas_por_bloques(lineas):
    """Devuelve {campo: texto} con las notas de cada sitio, separadas.

    Es el mismo recorrido que hacia falta para no truncarlas -el bloque llega
    hasta la siguiente cabecera, no hasta la primera linea que parezca etiqueta-,
    solo que ahora corta en la cabecera siguiente en vez de al final del
    documento. Separar sale igual de barato que no separar.
    """
    fuera = {"notas": [], "notas_admin": [], "notas_encargo": [], "notas_subvenciones": []}
    seccion, destino = None, None
    for l in lineas:
        cab = _cabecera(l)
        if cab:
            if cab == "NOTAS ENCARGO Y PROYECTO":
                destino = "notas_encargo"
            elif cab == "NOTAS SUBVENCIONES":
                destino = "notas_subvenciones"
            elif cab == "NOTAS":
                # el "notas" de la maqueta larga vive DENTRO del bloque del
                # administrador, y son las notas DEL ADMINISTRADOR
                destino = "notas_admin" if seccion == "DATOS ADMINISTRADOR DE FINCAS" else "notas"
            else:
                seccion, destino = cab, None
            continue
        if destino:
            fuera[destino].append(l.rstrip())
    return {k: chr(10).join(v).strip() for k, v in fuera.items()}


# EL TACHADO. En Word es una propiedad del "run" -el trocito de texto con un
# mismo formato-, no del parrafo: por eso en una misma linea conviven el valor
# viejo tachado y el nuevo sin tachar. Se marca con ~~ a los lados.
TACHADO = re.compile(r"<w:strike(?:\s[^>]*)?/>|<w:strike[^>]*w:val=\"(?:true|1|on)\"", re.I)
MARCA = "~~"


def sin_tachar(texto):
    """El texto quitando lo tachado. Para los CAMPOS: ahi solo vale lo vigente.
       Si todo estaba tachado, devuelve cadena vacia, que es lo correcto: ese ya
       no es, y no sabemos quien es ahora."""
    if not texto or MARCA not in texto:
        return (texto or "").strip()
    return re.sub(r"~~.*?~~", " ", texto).replace("  ", " ").strip(" 	-/,;")


def solo_tachado(texto):
    """Lo contrario: lo que estaba tachado, para guardarlo como historia."""
    return [t.strip() for t in re.findall(r"~~(.*?)~~", texto or "") if t.strip()]


def texto_del_docx(ruta):
    """El texto de un .docx, parrafo a parrafo. Los .doc viejos no se abren.

    NO se juntan las casillas de una fila, y hubo que probarlo para saberlo. Toda
    la ficha son tablitas -etiqueta en una casilla, valor en la de al lado-, asi
    que parecia que habia que leer la fila entera. Al hacerlo, las notas mejoraban
    (mediana de 52 a 295 caracteres) pero se hundia TODO lo demas: administrador
    176 -> 4, referencia catastral 168 -> 4, quien nos lo trajo 113 -> 22.

    Lo que lo zanjo fue ella, 4-oct-2026: "la fecha y el texto van juntos en la
    misma casilla, eso si lo garantizo, jamas se dividen en dos casillas". Asi que
    juntar la fila no aportaba nada que no se tuviera ya. Un parrafo, una linea.

    EL TACHADO SE CONSERVA, MARCADO. Era el agujero mas gordo de todo el dia:
    Word permite tachar texto, en estas fichas el tachado significa ESTO YA NO
    VALE, y yo lo estaba leyendo como si fuera vigente. Lo vio ella repasando los
    presidentes, 4-oct-2026: "sale un patron muy claro: el primero siempre es el
    presidente antiguo, el segundo el nuevo. El primero, antiguo, esta tachado, el
    segundo no". Y luego: "el tachado aplica a comerciales, contratas,
    presidentes, administradores... todo".

    71 de 380 fichas llevan texto tachado y 130 campos se habian extraido con el
    valor viejo dentro:

        infantas9  admin_contacto  "LEANDRO MOLINERO / DAVID CASTILLO actual admin"
        arboleda1  admin_correo    "info@ciudadela.eu  david.castillo@ciudadela.eu"
        avila3     presidente      "OSCAR PEREZ GONZALEZ  MARGARITA GONZALEZ BLANCO"

    El tachado va primero y el vigente despues, siempre.

    Aqui se marca entre ~~ y ~~. Quien lee campos usa 'sin_tachar()' y se queda
    con lo vigente; quien lee notas lo conserva, porque tachado no es borrado: es
    "esto fue asi". Y si TODO el valor esta tachado, el campo se queda VACIO: su
    regla, y es la de la vida real -"suele significar que no hay relevo: no
    sabemos quien es el nuevo admin, el comercial dejo de trabajar en la
    empresa"-.
    """
    try:
        with zipfile.ZipFile(ruta) as z:
            xml = z.read("word/document.xml").decode("utf-8", "replace")
    except Exception:
        return None

    def _suelto(frag):
        frag = re.sub(r"<w:tab[^>]*/>", chr(9), frag)
        frag = re.sub(r"<w:br[^>]*/>", chr(10), frag)
        t = re.sub(r"<[^>]+>", "", frag)
        return (t.replace("&amp;", "&").replace("&lt;", "<")
                 .replace("&gt;", ">").replace("&quot;", '"').replace("&apos;", "'"))

    # Se recorre RUN a RUN porque el tachado es una propiedad del run, no del
    # parrafo: en la misma linea conviven lo viejo tachado y lo nuevo sin tachar.
    trozos = []
    for m in re.finditer(r"</w:p>|<w:r[ >].*?</w:r>", xml, re.S):
        t = m.group(0)
        if t == "</w:p>":
            trozos.append(chr(10))
            continue
        texto = _suelto(t)
        if not texto:
            continue
        if TACHADO.search(t):
            trozos.append(MARCA + texto.strip() + MARCA if texto.strip() else texto)
        else:
            trozos.append(texto)
    return [l.strip() for l in "".join(trozos).split(chr(10))]


def es_etiqueta(linea):
    """Devuelve la etiqueta si la linea ES una etiqueta (sola o con su valor
       detras de un tabulador o dos puntos)."""
    limpia = linea.strip().rstrip(":").strip()
    for e in ETIQUETAS:
        if limpia.upper() == e.upper().rstrip(":"):
            return e
    return None


def partir_en_campos(lineas):
    """Devuelve [(etiqueta, [lineas de valor])] en el orden del documento."""
    fuera, actual, valor = [], None, []
    for l in lineas:
        if not l:
            continue
        # "CIF:\tH78759537" y "Presidente:\tANTONIO ..." (maqueta corta)
        m = re.match(r"^([A-Za-zÁÉÍÓÚÑ ºª/\.\-]{2,40})\s*:\s*\t?\s*(.+)$", l)
        e = es_etiqueta(l)
        if e:
            if actual:
                fuera.append((actual, valor))
            actual, valor = e, []
        elif m and es_etiqueta(m.group(1)):
            if actual:
                fuera.append((actual, valor))
            fuera.append((es_etiqueta(m.group(1)), [m.group(2).strip()]))
            actual, valor = None, []
        elif actual:
            valor.append(l)
    if actual:
        fuera.append((actual, valor))
    return fuera


def vale_como_valor(v):
    """Un valor NO vale si en realidad es otra etiqueta del formulario, o si
       arrastra media ficha detras. Esto se añadio despues de ver que 141 de
       264 "presidentes" eran la etiqueta de al lado: "DNI PRESIDENTE", o
       "DNI: Codigo postal: 28943 Referencia catastral: ...". Un campo vacio
       en la ficha hace que el lector se trague la etiqueta siguiente, y eso
       es peor que no leer nada: ensucia en silencio."""
    v = (v or "").strip()
    if len(v) < 3:
        return False
    alto = v.upper()
    for e in ETIQUETAS:
        if alto == e.upper() or alto.startswith(e.upper() + " ") or alto.startswith(e.upper() + ":"):
            return False
    if ":" in v or "\t" in v:
        return False
    return True


def parece_nombre(v):
    """Un nombre de persona: al menos dos palabras, letras, y sin numeros."""
    if not vale_como_valor(v):
        return False
    if re.search(r"\d", v):
        return False
    palabras = [p for p in re.split(r"\s+", v.strip()) if len(p) > 1]
    return len(palabras) >= 2 and len(v) <= 60


NIF = re.compile(r"\b([A-HJNPQRSUVW]\s?\d{7}\s?[0-9A-J])\b")
# DNI (8 cifras) y NIE (X, Y o Z + 7 cifras). De los dos hay en las fichas:
# el presidente de Plaza Nicaragua 3 es X4205955Z.
DNI = re.compile(r"\b((?:\d{8}|[XYZ]\d{7})\s?[A-HJ-NP-TV-Z])\b")
CORREO = re.compile(r"[\w\.\-\+]+@[\w\.\-]+\.\w{2,}")
TELEFONO = re.compile(r"\b((?:\+34[ \-]?)?[6789]\d{2}[ \.\-]?\d{2}[ \.\-]?\d{2}[ \.\-]?\d{2})\b")


def leer_ficha(ruta):
    lineas = texto_del_docx(ruta)
    if lineas is None:
        return None
    # LOS CAMPOS SE LEEN SIN LO TACHADO, las notas CON ello. Un campo tiene
    # que decir quien es HOY; una nota tiene que contar lo que paso. Si no se
    # separa, el administrador acaba siendo "LEANDRO MOLINERO / DAVID CASTILLO
    # actual admin Andres Avila", que no es ninguno de los tres.
    limpias = [sin_tachar(x) for x in lineas]
    campos = partir_en_campos(limpias)
    todo = chr(10).join(x for x in limpias if x)

    # Lo tachado se guarda aparte: es historia de esa comunidad -que tuvo ese
    # administrador, ese presidente, esa contrata-. Monica, 4-oct-2026: "como
    # estamos reconstruyendo y es IMPOSIBLE saber las fechas, lo guardamos como
    # notas y solo nos preocupamos de que quede el vigente en el campo de
    # verdad. Reconstruir esas fechas no nos va a aportar nada funcional y nos
    # va a llevar semanas".
    _tachado = []
    for _l in lineas:
        for _t in solo_tachado(_l):
            if _t not in _tachado:
                _tachado.append(_t)

    # Las notas, cada una en su sitio. Ver notas_por_bloques.
    _notas = notas_por_bloques(lineas)

    d = {"cif": "", "presidente": "", "dni_presidente": "", "administrador": "",
         "admin_contacto": "", "admin_telefono": "", "admin_correo": "",
         "ayto_tecnico": "", "ref_catastral": "", "notas": "", "tachado": "",
         # tres sitios con notas, y son cosas distintas: ver notas_por_bloques
         "notas_admin": "", "notas_encargo": "", "notas_subvenciones": "",
         # QUIEN NOS TRAJO EL ENCARGO, que NO es nuestro comercial. Monica,
         # 4-oct-2026: "todos los datos de comercial que hay en esas fichas son
         # del comercial de terceros que nos contacta: Nacho Fain es el
         # comercial de FAIN que nos llamo para encargarnos ese proyecto".
         # Hasta 2023 el 80% del trabajo venia asi, de contratas; hoy ~20%.
         "trajo_empresa": "", "trajo_persona": "",
         # NUESTRO comercial. Monica, 4-oct-2026: "esta en rojo, fuera de
         # campos, y solo puede ser Carlos, Alvaro o Daniel. No hay ninguno
         # mas". Solo se recoge cuando la ficha lleva la etiqueta COMERCIAL
         # INTERNO: son 31 de 270 en Fuenlabrada. En el resto NO se deduce:
         # buscar el nombre suelto da 106, pero "Daniel" aparece tambien en las
         # notas hablando del arquitecto, no del comercial.
         "comercial_interno": "", "comercial_de_donde": ""}

    seccion = None
    for etiqueta, valor in campos:
        v = " ".join(valor).strip()
        if etiqueta in SECCIONES:
            seccion = etiqueta
            if etiqueta == "NOTAS":
                d["notas"] = "\n".join(valor).strip()
            continue
        if not v:
            continue
        if etiqueta in ("CIF",) and not d["cif"]:
            m = NIF.search(v.upper())
            if m:
                d["cif"] = m.group(1).replace(" ", "")
        elif etiqueta == "PRESIDENTE" and not d["presidente"]:
            if parece_nombre(v):
                d["presidente"] = v
        elif etiqueta == "DNI PRESIDENTE" and not d["dni_presidente"]:
            # si no hay un DNI de verdad, SE QUEDA VACIO. Antes se guardaba
            # el texto tal cual y acababa un "CARTA DE PERMISO PARA TRAMITAR
            # LICENCIA..." en el campo del documento de identidad.
            m = DNI.search(v.upper())
            if m:
                d["dni_presidente"] = m.group(1).replace(" ", "")
        elif etiqueta == "REF CATASTRAL" and not d["ref_catastral"]:
            # UNA REFERENCIA CATASTRAL SON 14 O 20 CARACTERES, y hay que
            # comprobarlo. Antes se cogia la primera palabra de lo que viniera,
            # y cuando el campo estaba vacio lo siguiente en la ficha es
            # "JEFE DE OBRA": acabaron 119 fichas con la referencia "JEFE" y
            # 6 con "FECHA". Si no tiene pinta de referencia, SE QUEDA VACIO.
            _rc = (v.split() or [""])[0].upper().strip(".,;:*")
            if re.fullmatch(r"[0-9A-Z]{14,20}", _rc):
                d["ref_catastral"] = _rc
        elif seccion == "DATOS ADMINISTRADOR DE FINCAS":
            if etiqueta in ("NOMBRE", "EMPRESA") and not d["administrador"]:
                if vale_como_valor(v):
                    d["administrador"] = v
            elif etiqueta == "PERSONA DE CONTACTO" and not d["admin_contacto"]:
                if vale_como_valor(v):
                    d["admin_contacto"] = v
            elif etiqueta in ("TELEFONO", "TELÉFONO") and not d["admin_telefono"]:
                d["admin_telefono"] = v
            elif etiqueta in ("E-MAIL", "E_MAIL") and not d["admin_correo"]:
                d["admin_correo"] = v
        elif seccion == "DATOS AYUNTAMIENTO" and etiqueta == "TECNICO DEL AYTO":
            d["ayto_tecnico"] = v
        elif seccion is None:
            # la cabecera, antes de la primera seccion: ahi esta quien nos trajo
            if etiqueta in ("EMPRESA/CLIENTE", "MEDIADOR") and not d["trajo_empresa"]:
                if vale_como_valor(v) and not re.fullmatch(r"[\d\s\.\-]+", v):
                    d["trajo_empresa"] = v
            elif etiqueta in ("AGENTE COMERCIAL", "PERSONA DE CONTACTO") and not d["trajo_persona"]:
                if parece_nombre(v):
                    d["trajo_persona"] = v

    # NUESTRO comercial. Dos reglas, las dos de Monica (4-oct-2026):
    #   1. Si la ficha lleva la etiqueta COMERCIAL INTERNO, manda lo que diga.
    #   2. Si NO la lleva, es de DANIEL: "es de la epoca de cuando no habia
    #      mas comercial que el. Salvo que diga lo contrario, es de Daniel
    #      siempre".
    # Por eso se guarda tambien DE DONDE sale: una cosa es un dato leido y
    # otra una regla suya, y quien lo mire manana tiene que distinguirlas.
    m = re.search(r"COMERCIAL\s+INTERNO\s*:?\s*([^\n]{0,40})", todo, re.I)
    hallados = []
    if m:
        hallados = [n for n in ("CARLOS", "ALVARO", "DANIEL")
                    if re.search(r"\b" + n + r"\b", m.group(1).upper())]
    if len(hallados) == 1:
        d["comercial_interno"] = hallados[0].capitalize()
        d["comercial_de_donde"] = "etiqueta de la ficha"
    elif len(hallados) > 1:
        d["comercial_interno"] = "VARIOS: " + ", ".join(hallados)
        d["comercial_de_donde"] = "la etiqueta nombra a varios: mirar a mano"
    else:
        d["comercial_interno"] = "Daniel"
        d["comercial_de_donde"] = "por defecto: sin etiqueta = Daniel"

    # La maqueta corta mete el CIF y el presidente DENTRO de las notas.
    d["tachado"] = " · ".join(_tachado)

    # las notas por bloques ganan a lo que saco partir_en_campos
    for _k, _v in _notas.items():
        if _v and len(_v) > len(d.get(_k) or ""):
            d[_k] = _v

    if not d["cif"]:
        m = re.search(r"CIF\s*:?\s*\t?\s*([A-HJNPQRSUVW]\s?\d{7}\s?[0-9A-J])", todo, re.I)
        if m:
            d["cif"] = m.group(1).replace(" ", "").upper()
    if not d["presidente"]:
        m = re.search(r"Presidente\s*:?\s*\t?\s*([^\n]{3,60})", todo, re.I)
        if m and parece_nombre(m.group(1).strip()):
            d["presidente"] = m.group(1).strip()
    if not d["dni_presidente"]:
        m = re.search(r"DNI\s*:?\s*\t?\s*(\d{8}\s?[A-HJ-NP-TV-Z])", todo, re.I)
        if m:
            d["dni_presidente"] = m.group(1).replace(" ", "").upper()
    if not d["administrador"]:
        m = re.search(r"EMPRESA\s*:\s*([^\n]{3,60})", todo, re.I)
        if m and vale_como_valor(m.group(1).strip()):
            d["administrador"] = m.group(1).strip()
    if not d["admin_correo"]:
        m = CORREO.search(todo)
        if m:
            d["admin_correo"] = m.group(0)
    return d


def fichas_de(carpeta):
    fuera = []
    for base, _, fich in os.walk(carpeta):
        for f in fich:
            n, e = os.path.splitext(f)
            if e.lower() == ".docx" and PINTA_FICHA.search(n) and not n.startswith("~"):
                fuera.append(os.path.join(base, f))
    # la de mas arriba en el arbol
    return sorted(fuera, key=lambda r: (r.count(os.sep), len(r)))


def main():
    if len(sys.argv) < 2:
        sys.exit("Falta el municipio. Ej: python scripts/leer_fichas.py FUENLABRADA")
    municipio = sys.argv[1].upper()
    raiz = os.path.join(PROVINCIA, municipio)
    if not os.path.isdir(raiz):
        sys.exit("No existe la carpeta de %s." % municipio)

    filas = []
    for carp in sorted(d for d in os.listdir(raiz) if os.path.isdir(os.path.join(raiz, d))):
        rutas = fichas_de(os.path.join(raiz, carp))
        if not rutas:
            filas.append({"carpeta": carp, "ficha": "", "lectura": "sin ficha"})
            continue
        d = leer_ficha(rutas[0])
        if d is None:
            filas.append({"carpeta": carp, "ficha": os.path.relpath(rutas[0], DROPBOX),
                          "lectura": "no se abre"})
            continue
        d["carpeta"] = carp
        d["ficha"] = os.path.relpath(rutas[0], DROPBOX)
        d["lectura"] = "ok"
        filas.append(d)

    cols = ["carpeta", "lectura", "cif", "presidente", "dni_presidente",
            "administrador", "admin_contacto", "admin_telefono", "admin_correo",
            "trajo_empresa", "trajo_persona", "comercial_interno", "comercial_de_donde",
            "ayto_tecnico", "ref_catastral", "notas", "tachado", "notas_admin",
            "notas_encargo", "notas_subvenciones", "ficha"]
    destino = "fichas_%s.csv" % municipio.lower().replace(" ", "_")
    with io.open(destino, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for f in filas:
            w.writerow({c: (f.get(c) or "") for c in cols})

    ok = [f for f in filas if f.get("lectura") == "ok"]
    def con(c):
        return len([f for f in ok if (f.get(c) or "").strip()])
    print("\n%s: %d carpetas" % (municipio, len(filas)))
    print("  ficha leida        : %d" % len(ok))
    print("  sin ficha          : %d" % len([f for f in filas if f["lectura"] == "sin ficha"]))
    print("  no se abre         : %d" % len([f for f in filas if f["lectura"] == "no se abre"]))
    print()
    for c, rotulo in [("notas", "con NOTAS"), ("cif", "con CIF"),
                      ("presidente", "con presidente"), ("dni_presidente", "con DNI"),
                      ("administrador", "con administrador"),
                      ("admin_telefono", "con telefono del admin"),
                      ("admin_correo", "con correo del admin"),
                      ("comercial_interno", "con NUESTRO comercial"),
                      ("trajo_empresa", "con quien nos lo trajo"),
                      ("trajo_persona", "con su comercial"),
                      ("ayto_tecnico", "con tecnico del ayto"),
                      ("ref_catastral", "con ref catastral")]:
        print("  %-24s: %d" % (rotulo, con(c)))
    print("\nguardado: %s" % destino)


if __name__ == "__main__":
    main()
