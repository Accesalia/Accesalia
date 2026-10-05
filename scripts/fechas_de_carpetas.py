# -*- coding: utf-8 -*-
"""
LA FECHA DE CADA CARPETA DEL DROPBOX          (Monica, 4-oct-2026)

Hace falta para poner 'oportunidades.fecha_apertura' al migrar las carpetas
antiguas, y de ahi sale el corte que ella quiere: todo lo de fecha <= 31-dic-2022
se cierra como "migrada de Dropbox", para que el listado de oportunidades
pendientes no arrastre 980 obsoletas.

ESTO NO ESCRIBE NADA, ni en la base ni en el Dropbox. Lee y deja un CSV.
Tampoco toca los fichas_<municipio>.csv que ya existen.

DOS FUENTES, Y EN ESTE ORDEN:

  1. LA FICHA. Si trae FECHA ENCARGO, esa manda: es el dato de negocio, escrito
     por quien estaba delante. Si no, FECHA LLEGADA; si no, FECHA INICIO.

  2. EL FICHERO MAS ANTIGUO DE LA CARPETA. El plan de ella era la fecha de
     creacion de la carpeta de la direccion. Esa fecha NO EXISTE, y lo he
     comprobado de las dos maneras:

       - Por la API de Dropbox, una carpeta devuelve solo tamano, id y nombre.
         Ninguna fecha.
       - En local, el 'ctime' de la carpeta dice 2025-04-18 para todas: es el
         dia que esta maquina sincronizo el Dropbox, no cuando se creo. Y su
         'mtime' es de anteayer, porque alguien ha tocado algo dentro.

     Lo que SI es de fiar es el 'mtime' de los FICHEROS: comprobado contra la
     API con tres ficheros de una carpeta, coincide exactamente con el
     'client_modified' de Dropbox (ap06.pdf: la API dice 2019-02-11 y el local
     dice 2019-02-11). Asi que la fecha orientativa de una carpeta es la del
     fichero mas viejo que tiene dentro.

     OJO: la otra fecha que da la API, 'modified_time', dice 2022-10-10 para
     todo, porque es el dia en que se migro el Dropbox. Si se cogiera esa, las
     980 carpetas saldrian de octubre de 2022 y el corte del 31-dic-2022 daria
     un resultado absurdo pero creible. No se usa.

Uso:
    python scripts/fechas_de_carpetas.py FUENLABRADA
    python scripts/fechas_de_carpetas.py ALCORCON ALCOBENDAS FUENLABRADA
"""
import csv
import datetime
import io
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# OJO: 'leer_fichas' ya reemplaza sys.stdout por un envoltorio utf-8 al
# importarse. Si aqui se pone otro ANTES del import, el suyo cierra el de aqui y
# todo print posterior revienta con "I/O operation on closed file". Asi que no se
# toca stdout: se deja el que pone el import.
from leer_fichas import DROPBOX, PROVINCIA, fichas_de, texto_del_docx  # noqa: E402

# Las tres etiquetas de fecha de la ficha, en orden de preferencia.
ETIQUETAS_FECHA = ["FECHA ENCARGO", "FECHA LLEGADA", "FECHA INICIO"]

# dd/mm/aaaa, dd-mm-aa, dd.mm.aaaa... y tambien "ENERO 2019" o "2019".
FECHA_DMA = re.compile(r"\b(\d{1,2})\s*[/\-\.]\s*(\d{1,2})\s*[/\-\.]\s*(\d{2,4})\b")
SOLO_ANIO = re.compile(r"\b(19[89]\d|20[0-4]\d)\b")
MESES = {
    "ENERO": 1, "FEBRERO": 2, "MARZO": 3, "ABRIL": 4, "MAYO": 5, "JUNIO": 6,
    "JULIO": 7, "AGOSTO": 8, "SEPTIEMBRE": 9, "SETIEMBRE": 9, "OCTUBRE": 10,
    "NOVIEMBRE": 11, "DICIEMBRE": 12,
}
MES_Y_ANIO = re.compile(r"\b(" + "|".join(MESES) + r")\s+(?:DE\s+)?(19[89]\d|20[0-4]\d)\b")

# Fuera de este rango, no es una fecha de encargo: es un numero mal leido.
PRIMERA = datetime.date(1995, 1, 1)
ULTIMA = datetime.date.today()


def una_fecha(texto):
    """Saca una fecha de un trozo de texto. Devuelve (iso, como_se_leyo) o None.

    Se admite 'ENERO 2019' -> 2019-01-01 y '2019' -> 2019-01-01 porque en las
    fichas viejas la fecha viene a menudo asi, y para lo que hace falta -saber
    si es anterior a 2023- el dia exacto no cambia nada. Lo que NO se hace es
    inventar: si no hay ni ano, no hay fecha.
    """
    if not texto:
        return None
    t = texto.upper()

    m = FECHA_DMA.search(t)
    if m:
        d, mes, a = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if a < 100:
            a += 2000 if a < 50 else 1900
        # Si el primer numero no puede ser dia pero el segundo si, estaba al reves.
        if d > 12 and mes <= 12:
            pass
        elif mes > 12 and d <= 12:
            d, mes = mes, d
        try:
            f = datetime.date(a, mes, min(d, 28) if d > 31 else d)
        except ValueError:
            f = None
        if f and PRIMERA <= f <= ULTIMA:
            return f.isoformat(), m.group(0).strip()

    m = MES_Y_ANIO.search(t)
    if m:
        f = datetime.date(int(m.group(2)), MESES[m.group(1)], 1)
        if PRIMERA <= f <= ULTIMA:
            return f.isoformat(), m.group(0).strip() + " (dia 1, no venia)"

    m = SOLO_ANIO.search(t)
    if m:
        f = datetime.date(int(m.group(1)), 1, 1)
        if PRIMERA <= f <= ULTIMA:
            return f.isoformat(), m.group(0) + " (solo el ano)"

    return None


def fecha_de_la_ficha(ruta):
    """Busca las tres etiquetas en el texto plano de la ficha, por orden."""
    try:
        lineas = texto_del_docx(ruta)
    except Exception:
        return None, "", ""
    todo = "\n".join(lineas)
    for et in ETIQUETAS_FECHA:
        # la etiqueta y lo que viene detras, en la misma linea o en la siguiente
        m = re.search(re.escape(et) + r"\s*:?\s*\t?\s*([^\n]{0,40})(?:\n([^\n]{0,40}))?", todo, re.I)
        if not m:
            continue
        for trozo in (m.group(1), m.group(2)):
            r = una_fecha(trozo)
            if r:
                return r[0], et, r[1]
    return None, "", ""


# FICHEROS QUE MIENTEN SOBRE LA FECHA, y no es un detalle: son ficheros que NO
# hicimos nosotros, y su mtime es la fecha de quien los hizo.
#
#   - Un DXF o un PDF bajado de Catastro se llama como la referencia catastral
#     (20 caracteres) y trae la fecha en que Catastro lo genero: hay uno de 2008
#     en una carpeta cuyo trabajo es de 2020 o mas tarde.
#   - '@preview.jpg' es un artefacto del propio Dropbox y dice 2001.
#   - Una ficha tecnica de producto -pintura intumescente, un ascensor- es del
#     fabricante y puede ser de cualquier ano.
#
# Si se cuelan, tiran la fecha de la carpeta anos atras y la carpeta acaba
# cerrada por el corte de 2022 sin merecerlo.
REF_CATASTRAL_FICHERO = re.compile(r"^[0-9]{4}[0-9A-Z]{3}[A-Z]{2}[0-9]{4}[A-Z]\d{4}[A-Z]{2}", re.I)
NO_ES_NUESTRO = re.compile(r"^@preview|^thumbs\.db$|^desktop\.ini$", re.I)


def miente_la_fecha(nombre):
    n = os.path.basename(nombre)
    raiz = os.path.splitext(n)[0]
    return bool(NO_ES_NUESTRO.match(n) or REF_CATASTRAL_FICHERO.match(raiz))


def fichero_mas_antiguo(carpeta, con_colados=False):
    """El mtime mas viejo de la carpeta, recursivo. Devuelve (iso, nombre).

    Por defecto se salta los ficheros que traen fecha ajena (ver arriba). Con
    con_colados=True no se salta ninguno, que es como se ve cuanto cambiaban.
    """
    mejor = None
    for base, _, fich in os.walk(carpeta):
        for f in fich:
            if f.startswith("~$") or f == ".DS_Store":
                continue
            if not con_colados and miente_la_fecha(f):
                continue
            p = os.path.join(base, f)
            try:
                t = os.path.getmtime(p)
            except OSError:
                continue
            if mejor is None or t < mejor[0]:
                mejor = (t, os.path.relpath(p, carpeta))
    if mejor is None:
        return "", ""
    f = datetime.date.fromtimestamp(mejor[0])
    if not (PRIMERA <= f <= ULTIMA):
        return "", mejor[1]
    return f.isoformat(), mejor[1]


def main():
    if len(sys.argv) < 2:
        sys.exit("Falta el municipio. Ej: python scripts/fechas_de_carpetas.py FUENLABRADA")

    filas = []
    for municipio in [a.upper() for a in sys.argv[1:]]:
        raiz = os.path.join(PROVINCIA, municipio)
        if not os.path.isdir(raiz):
            print("  !! no existe la carpeta de %s, me la salto" % municipio)
            continue
        carpetas = sorted(d for d in os.listdir(raiz) if os.path.isdir(os.path.join(raiz, d)))
        print("%s: %d carpetas" % (municipio, len(carpetas)))
        for carp in carpetas:
            ruta = os.path.join(raiz, carp)
            rutas = fichas_de(ruta)
            de_ficha, etiqueta, como = (None, "", "")
            if rutas:
                de_ficha, etiqueta, como = fecha_de_la_ficha(rutas[0])
            de_fichero, cual = fichero_mas_antiguo(ruta)
            con_colados, cual_colado = fichero_mas_antiguo(ruta, con_colados=True)

            # LA FICHA MANDA, PERO SOLO HASTA DONDE SABE. Cuando la ficha trae
            # solo el ano ("2025") o solo mes y ano ("ENERO 2025"), el dia -o el
            # mes y el dia- lo pongo yo por convencion, y eso es una fecha MIA,
            # no suya. Si el fichero mas antiguo de la carpeta cae DENTRO de ese
            # mismo periodo, es mas preciso y manda el: la ficha sigue teniendo
            # razon en el ano, y el fichero afina el dia.
            #
            # Lo vio Monica, 4-oct-2026: "tus fechas artificiales, no las
            # habiamos corregido ya con lo de la fecha de la carpeta / primer
            # archivo dentro?". No: la del fichero solo se usaba cuando la ficha
            # no traia ninguna. Estaba calculada y sin mirar.
            #
            # Gana precision de verdad: mirasierra8 pasaba de 2025-01-01 a
            # 2025-12-29, estacion1 a 2025-10-20, plazadelaalbufera11 a
            # 2025-06-16. Y las tres encajan con la ventana del comercial que
            # firma la ficha, que antes las contradecia.
            #
            # EL FRENO: solo si cae dentro. migueldeunamuno27 tiene ficha de 2026
            # y su fichero mas viejo es de 2020 -un PROPUESTAHONORARIOS.pdf
            # reaprovechado-: ahi el fichero miente y se queda el ano de la ficha.
            afinada = None
            if de_ficha and de_fichero and ("no venia" in como or "solo el ano" in como):
                mismo = (de_fichero[:4] == de_ficha[:4]
                         if "solo el ano" in como else de_fichero[:7] == de_ficha[:7])
                if mismo and de_fichero > de_ficha:
                    afinada = de_fichero

            if afinada:
                fecha, fuente = afinada, "ficha (%s) + fichero, afinada" % etiqueta
            elif de_ficha:
                fecha, fuente = de_ficha, "ficha: " + etiqueta
            elif de_fichero:
                fecha, fuente = de_fichero, "fichero mas antiguo"
            else:
                fecha, fuente = "", "SIN FECHA"

            filas.append({
                "municipio": municipio,
                "carpeta": carp,
                "fecha": fecha,
                "fuente": fuente,
                "de_la_ficha": de_ficha or "",
                "como_venia_en_la_ficha": como,
                "del_fichero_mas_antiguo": de_fichero,
                "cual_fichero": cual,
                "sin_filtrar": con_colados if con_colados != de_fichero else "",
                "sin_filtrar_cual": cual_colado if con_colados != de_fichero else "",
                "antes_de_2023": "si" if fecha and fecha <= "2022-12-31" else ("no" if fecha else ""),
            })

    cols = ["municipio", "carpeta", "fecha", "fuente", "de_la_ficha",
            "como_venia_en_la_ficha", "del_fichero_mas_antiguo", "cual_fichero",
            "sin_filtrar", "sin_filtrar_cual", "antes_de_2023"]
    # OJO: este fichero es UNO para todos los municipios, y se reescribe entero.
    # Si se corre con un municipio suelto, se lleva por delante los anteriores
    # -me paso con Leganes el 5-oct-2026-. Hay que pasarle SIEMPRE todos los
    # municipios ya procesados, no solo el nuevo.
    destino = "fechas_carpetas.csv"
    with io.open(destino, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols, delimiter="|")
        w.writeheader()
        for f in filas:
            w.writerow(f)

    print()
    print("TOTAL: %d carpetas  ->  %s" % (len(filas), destino))
    print("  fecha de la FICHA         : %d" % len([f for f in filas if f["de_la_ficha"]]))
    print("  fecha del fichero antiguo : %d"
          % len([f for f in filas if not f["de_la_ficha"] and f["del_fichero_mas_antiguo"]]))
    print("  SIN NINGUNA FECHA         : %d" % len([f for f in filas if not f["fecha"]]))
    print()
    print("  anteriores a 2023 (se cerrarian): %d" % len([f for f in filas if f["antes_de_2023"] == "si"]))
    print("  de 2023 en adelante (se quedan) : %d" % len([f for f in filas if f["antes_de_2023"] == "no"]))
    print()
    # el reparto por ano, para ver de un golpe si la cosa tiene sentido
    from collections import Counter
    c = Counter(f["fecha"][:4] for f in filas if f["fecha"])
    print("  por ano:", "  ".join("%s=%d" % (a, n) for a, n in sorted(c.items())))

    # Y las que discrepan mucho: si la ficha dice una cosa y el fichero otra con
    # anos de diferencia, conviene mirarlas.
    raras = [f for f in filas if f["de_la_ficha"] and f["del_fichero_mas_antiguo"]
             and abs(int(f["de_la_ficha"][:4]) - int(f["del_fichero_mas_antiguo"][:4])) >= 3]
    print("  ficha y ficheros se llevan 3+ anos: %d (mirar a mano)" % len(raras))
    for f in raras[:10]:
        print("     %-28s ficha=%s  ficheros=%s" % (f["carpeta"][:28], f["de_la_ficha"], f["del_fichero_mas_antiguo"]))


if __name__ == "__main__":
    main()
