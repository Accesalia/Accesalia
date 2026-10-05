# -*- coding: utf-8 -*-
"""
UNA TANDA: UN MUNICIPIO ENTERO   (Monica, 2/3-oct-2026)

Su metodo, hecho script para que sea el mismo en los 43 municipios:

    "coger un municipio, descargarnos sus rutas y matchear contra mi lista de
     julio. Las que hagan match, entonces si, ir a por su tarjeta del cif."

Y el motivo de hacerlo por municipio, que es suyo y es el acierto:

    "si hacemos el match por LOCALIDADES es muchisimo mas facil no equivocarse,
     no son 2.000 opciones, sino un par de cientos cada vez."

ESTO NO ESCRIBE NADA. Lee el disco, lee produccion, coteja y deja dos cosas:
  * tanda_<municipio>.csv  con el resultado de cada carpeta
  * las imagenes de los escaneos que hay que mirar a ojo

LAS DOS LECCIONES DEL PRIMER MUNICIPIO, que estan metidas aqui dentro:
  1. LA RUTA NO SE CONSTRUYE, SE COPIA. En Alcorcon asumi que todas las tarjetas
     colgaban de "1.DATOS/2.DOCUMENTACION" y acerte en 13 de 19. Hay carpetas de
     proyecto (una comunidad con rampa Y ascensor), convencion vieja en
     minusculas, y una con TILDE en DOCUMENTACION. Aqui se recorre el arbol.
  2. EL NUMERO MANDA EN EL COTEJO. Dos direcciones de la misma calle con distinto
     numero son dos comunidades distintas, y el parecido de texto no lo ve.

Uso:
    python scripts/tanda_municipio.py ALCOBENDAS
    python scripts/tanda_municipio.py ALCOBENDAS --sin-imagenes
"""
import collections
import csv
import difflib
import io
import os
import re
import sys
import unicodedata
import urllib.parse

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402

DROPBOX = r"C:\accesalia Dropbox\D SM\Ascensores y rehabilitaciones"
PROVINCIA = os.path.join(DROPBOX, "MADRID", "1APROVINCIA")
SALIDA_IMG = os.path.join(os.environ.get("TEMP", "."), "tarjetas")

# "cif" como PALABRA: asi no entra "CIFUENTES" (hay un DNI de Monica Cifuentes
# en una carpeta y lo pillaba).
PINTA_CIF = re.compile(r'(?<![a-z])cif(?![a-z])|c\.i\.f', re.I)
# Lo que dice de si mismo que no vale, y los IEE que llevan "CIF" en el nombre.
TRAMPAS = re.compile(r'incorrect|no vale|memoria|iee|cifuentes', re.I)
EXT_OK = {".pdf", ".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp"}
# Copias de trabajo: la buena esta mas arriba en el arbol.
# Lo que dice de si mismo que NO es el vigente. 'viejo' entro tarde: en
# marquesdevaldavia76 conviven `cif_viejo.pdf` y `Cif actual.pdf`, y mi regla
# cogia el viejo porque su ruta era UN CARACTER mas corta.
APARTADAS = re.compile(r'subvencion|antigu|doc trabajo|borrador|copia|viejo|caducad|anterior', re.I)
# Y lo que dice de si mismo que SI lo es: gana siempre.
VIGENTE = re.compile(r'actual|definitiv|nuev', re.I)

NIF = re.compile(r'\b([A-HJNPQRSUVW]\s?\d{7}\s?[0-9A-J])\b')


def aplanar(s):
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").upper()
    return s


def clave(s, municipio):
    """Sin tildes, sin el municipio pegado, y solo letras y numeros."""
    s = aplanar(s).replace(aplanar(municipio), "")
    return re.sub(r'[^A-Z0-9]', '', s)


def numeros(s):
    return sorted(re.findall(r'\d+', aplanar(s)))


def tarjetas_de(carpeta):
    """Todas las rutas con pinta de tarjeta bajo esa carpeta. SE RECORRE EL
       ARBOL: no se construye la ruta, se encuentra."""
    fuera = []
    for base, _, ficheros in os.walk(carpeta):
        for f in ficheros:
            nombre, ext = os.path.splitext(f)
            if ext.lower() in EXT_OK and PINTA_CIF.search(nombre) and not TRAMPAS.search(nombre):
                fuera.append(os.path.join(base, f))
    return fuera


def la_principal(rutas):
    """De varias copias, la de mas arriba en el arbol y fuera de las carpetas de
       trabajo. En Cannada 22 habia una en RAMPA 2025 y otra en ASCENSOR 2026:
       son el mismo documento, da igual cual."""
    buenas = [r for r in rutas if not APARTADAS.search(r)] or rutas
    marcadas = [r for r in buenas if VIGENTE.search(os.path.basename(r))]
    if marcadas:
        buenas = marcadas
    return sorted(buenas, key=lambda r: (r.count(os.sep), len(r)))[0]


def leer_texto(ruta):
    """Si el PDF trae capa de texto util, devuelve (nif, denominacion). Si no,
       None: habra que mirarlo con los ojos."""
    if not ruta.lower().endswith(".pdf"):
        return None
    try:
        import pypdfium2 as pdfium
        doc = pdfium.PdfDocument(ruta)
        txt = "\n".join(doc[i].get_textpage().get_text_range() for i in range(min(2, len(doc))))
    except Exception:
        return None
    if not txt or len(txt.strip()) < 150:
        return None
    plano = re.sub(r'\s+', ' ', txt)
    # Un OCR viejo y malo deja basura con pinta de texto. Si no aparecen las
    # palabras de la tarjeta, no me fio y va a la pila de mirar.
    if not re.search(r'IDENTIFICACI|Denominaci', plano, re.I):
        return None
    m = NIF.search(plano.upper())
    if not m:
        return None
    den = ""
    d = re.search(r'Denominaci[oó]n\s*(?:o\s*)?(?:Raz[oó]n\s*Social)?\s*[:\-]?\s*'
                  r'([A-ZÑÁÉÍÓÚ][^\n]{5,90}?)(?:\s+Anagrama|\s+Domicilio|$)', plano)
    if d:
        den = d.group(1).strip()
    return (m.group(1).replace(" ", ""), den)


def main():
    if len(sys.argv) < 2:
        sys.exit("Falta el municipio. Ej: python scripts/tanda_municipio.py ALCOBENDAS")
    municipio = sys.argv[1].upper()
    con_imagenes = "--sin-imagenes" not in sys.argv

    raiz = os.path.join(PROVINCIA, municipio)
    if not os.path.isdir(raiz):
        sys.exit("No existe la carpeta de %s en el Dropbox." % municipio)

    b = arrancar()
    # El municipio va en la URL: si lleva espacios ("ALCALA DE HENARES") hay que
    # codificarlos o la peticion ni sale. Nos mordio en 20 municipios de 43.
    comunidades = b.leer("comunidades?select=id,nombre,cif_comunidad&municipio=ilike."
                         + urllib.parse.quote(municipio))
    carpetas = sorted(d for d in os.listdir(raiz) if os.path.isdir(os.path.join(raiz, d)))
    print("\n%s: %d carpetas en Dropbox, %d comunidades en tu lista\n"
          % (municipio, len(carpetas), len(comunidades)))

    coms = [(c, clave(c["nombre"], municipio), numeros(c["nombre"])) for c in comunidades]

    filas, usadas = [], set()
    for carp in carpetas:
        k, nums = clave(carp, municipio), numeros(carp)
        mejor, razon = None, 0.0
        for c, ck, cn in coms:
            if nums != cn:          # EL NUMERO MANDA
                continue
            r = difflib.SequenceMatcher(None, k, ck).ratio()
            if r > razon:
                mejor, razon = c, r
        if mejor and razon >= 0.90:
            estado = "casa"
        elif mejor and razon >= 0.70:
            estado = "dudoso"
        else:
            estado, mejor, razon = "sin pareja", mejor, razon
        if estado in ("casa", "dudoso"):
            usadas.add(mejor["id"])

        rutas = tarjetas_de(os.path.join(raiz, carp))
        ruta = la_principal(rutas) if rutas else ""
        rel = os.path.relpath(ruta, DROPBOX) if ruta else ""
        lectura = leer_texto(ruta) if ruta else None
        filas.append({
            "carpeta": carp, "estado": estado,
            "comunidad": (mejor or {}).get("nombre", ""),
            "comunidad_id": (mejor or {}).get("id", ""),
            "cif_en_base": (mejor or {}).get("cif_comunidad") or "",
            "parecido": round(razon, 2),
            "n_tarjetas": len(rutas),
            "ruta": rel,
            "nif_leido": lectura[0] if lectura else "",
            "denominacion_leida": lectura[1] if lectura else "",
            "como_se_lee": ("texto" if lectura else ("mirar" if ruta else "sin tarjeta")),
        })

    casan = [f for f in filas if f["estado"] in ("casa", "dudoso")]
    a_mirar = [f for f in casan if f["como_se_lee"] == "mirar"]
    print("casan con tu lista : %d de %d carpetas" % (len(casan), len(filas)))
    print("  con tarjeta      : %d" % len([f for f in casan if f["ruta"]]))
    print("    se leen solas  : %d" % len([f for f in casan if f["como_se_lee"] == "texto"]))
    print("    hay que MIRAR  : %d" % len(a_mirar))
    print("  sin tarjeta      : %d" % len([f for f in casan if not f["ruta"]]))
    print("fuera de tu lista  : %d carpetas" % len([f for f in filas if f["estado"] == "sin pareja"]))
    print("comunidades tuyas sin carpeta: %d"
          % len([c for c in comunidades if c["id"] not in usadas]))
    for c in comunidades:
        if c["id"] not in usadas:
            print("     ", c["nombre"])

    destino = "tanda_%s.csv" % municipio.lower().replace(" ", "_")
    with io.open(destino, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(filas[0].keys()))
        w.writeheader()
        w.writerows(filas)
    print("\nguardado: %s" % destino)

    if con_imagenes and a_mirar:
        os.makedirs(SALIDA_IMG, exist_ok=True)
        import pypdfium2 as pdfium
        from PIL import Image
        hechas = 0
        for f in a_mirar:
            origen = os.path.join(DROPBOX, f["ruta"])
            png = os.path.join(SALIDA_IMG, re.sub(r'[^a-z0-9]', '', f["carpeta"].lower()) + ".png")
            try:
                if origen.lower().endswith(".pdf"):
                    img = pdfium.PdfDocument(origen)[0].render(scale=2.2).to_pil()
                else:
                    img = Image.open(origen)
                img.thumbnail((1700, 1700))
                img.convert("RGB").save(png, quality=88)
                hechas += 1
            except Exception as e:
                print("  no se pudo preparar %s: %s" % (f["carpeta"], e))
        print("imagenes preparadas: %d en %s" % (hechas, SALIDA_IMG))


if __name__ == "__main__":
    main()
