# -*- coding: utf-8 -*-
"""
LAS NOTAS DE LAS OPORTUNIDADES VIVAS           (Monica, 4-oct-2026)

EL OBJETIVO DE TODA LA PASADA POR DROPBOX. Sus palabras: "de todas, miraria en
la ficha de datos quien es el administrador y el presidente, y en todas copiaria
en nuestro apartado notas lo que venga en las notas de la ficha. La info que
viene en notas es en muchos casos lo verdaderamente interesante".

Y su prioridad, cuando se planteo si separar o no: "las notas de las que estan
cerradas son poco relevantes, pero las de mi listado de julio SI, porque son las
oportunidades vivas con las que trabajamos ahora". Estas son esas.

DONDE VA CADA UNA:
    notas + notas_encargo   -> notas_oportunidad
    notas_subvenciones      -> notas_subvencion
    notas_admin             -> se deja para otra pasada (son 7 y su sitio es
                               notas_administracion_fincas, que cuelga de la
                               empresa, no de la oportunidad)

UNA FECHA, UNA NOTA. Monica: "en notas, MUY A MENUDO -sobre todo las recientes-
empiezan con la fecha dd-mm-aa. Cada fecha, una nota". Asi que un bloque que
empieza por fecha se parte en una nota por fecha, y cada una se guarda con la
suya. Lo que NO empieza por fecha no se trocea: se queda de una pieza, porque
partir por lineas un correo reenviado lo destrozaria.

EL COTEJO CARPETA -> OPORTUNIDAD no se inventa: sale de
'documentos.origen_ruta_dropbox', que quedo guardado al subir las tarjetas del
CIF. Y una comunidad con DOS carpetas de fechas distintas se aparta en vez de
elegir: ya nos mordio con "SANTAMARIA LA BLANCA 3 Y 5 / IGLESIA 22".

Uso:
    python scripts/notas_de_julio.py             <- marcha en seco
    python scripts/notas_de_julio.py --escribir
"""
import csv
import io
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402
from leer_fichas import PROVINCIA, es_etiqueta, fichas_de, texto_del_docx  # noqa: E402


def modelo_y_notas(muni, carpeta):
    """(modelo, que hay bajo NOTAS) de una carpeta.

    SOLO SE TOCAN LAS FICHAS MODERNAS CON NOTAS LIMPIAS, y es decision de Monica
    (4-oct-2026): "si encuentras carpetas concretas cuya ficha tenga el modelo
    viejo y no el nuevo, las dejamos aparte y las leemos de otra manera.
    Solamente nos centramos en las que tienen este modelo con este apartado de
    notas".

    Por que el corte es por MODELO: en la maqueta vieja -FICHA DE DATOS
    ACCESALIA- el formulario impreso estaba vacio y la gente escribia los datos A
    MANO dentro del apartado de notas, asi que ahi "notas" no son notas. En la
    moderna el formulario tiene sus campos arriba y bajo NOTAS solo hay diario.
    Medido en las 410: la vieja trae mezcla en 101 de 110, la moderna trae nota
    limpia en 231 de 259. No es una tendencia, es el modelo."""
    import os as _os
    rutas = fichas_de(_os.path.join(PROVINCIA, muni, carpeta))
    if not rutas:
        return "(sin ficha)", "-"
    nombre = _os.path.basename(rutas[0]).upper()
    if "ACCESALIA" in nombre:
        modelo = "vieja"
    elif "TECNIC" in nombre or nombre.startswith("FICHA DATOS"):
        modelo = "moderna"
    else:
        modelo = "otra"
    lineas = texto_del_docx(rutas[0]) or []
    idx = [i for i, l in enumerate(lineas)
           if es_etiqueta(l) in ("NOTAS", "NOTAS ENCARGO Y PROYECTO", "NOTAS SUBVENCIONES")]
    if not idx:
        return modelo, "sin etiqueta"
    cuerpo = [l for l in lineas[idx[0] + 1:] if l.strip()]
    if not cuerpo:
        return modelo, "vacio"
    form = sum(1 for l in cuerpo
               if es_etiqueta(l.split(chr(9))[0].split(":")[0].strip())
               and len(l.strip()) > len(l.split(chr(9))[0].split(":")[0].strip()) + 1)
    return modelo, ("mezcla" if form else "limpia")

MUNICIPIOS = ("ALCORCON", "ALCOBENDAS", "FUENLABRADA")
BARRA = chr(92)

# Una linea que EMPIEZA por fecha abre una nota nueva. Se admite dd/mm/aa,
# dd-mm-aaaa, dd.mm.aa y el dia suelto con mes ("26/09 ENVIADA HE CSS").
ABRE_NOTA = re.compile(r"^\s*(\d{1,2})[/\-\.](\d{1,2})(?:[/\-\.](\d{2,4}))?\s*[:\-]?\s+(?=\S)")


def pelado(s):
    s = unicodedata.normalize("NFKD", s or "")
    return "".join(c for c in s if not unicodedata.combining(c)).lower().replace(" ", "")


def trocear(texto, anio_de_referencia):
    """Parte un bloque de notas en [(fecha_iso|None, texto)].

    Si NINGUNA linea empieza por fecha, devuelve el bloque entero de una pieza:
    un correo reenviado partido por lineas no se entiende.
    """
    lineas = [l for l in (texto or "").split("\n")]
    cortes = [i for i, l in enumerate(lineas) if ABRE_NOTA.match(l)]
    if not cortes:
        t = "\n".join(lineas).strip()
        return [(None, t)] if t else []

    fuera = []
    # lo que va ANTES de la primera fecha es una nota sin fecha (la cabecera)
    if cortes[0] > 0:
        t = "\n".join(lineas[:cortes[0]]).strip()
        if t:
            fuera.append((None, t))
    for n, i in enumerate(cortes):
        fin = cortes[n + 1] if n + 1 < len(cortes) else len(lineas)
        trozo = "\n".join(lineas[i:fin]).strip()
        if not trozo:
            continue
        m = ABRE_NOTA.match(lineas[i])
        d, mes, a = int(m.group(1)), int(m.group(2)), m.group(3)
        if a is None:
            anio = anio_de_referencia          # "26/09" sin ano: el de la opp
        else:
            anio = int(a)
            if anio < 100:
                anio += 2000 if anio < 50 else 1900
        if d > 12 and mes <= 12:
            pass
        elif mes > 12 and d <= 12:
            d, mes = mes, d
        try:
            import datetime
            f = datetime.date(anio, mes, d).isoformat() if anio else None
        except (ValueError, TypeError):
            f = None
        fuera.append((f, trozo))
    return fuera


def main():
    escribir = "--escribir" in sys.argv
    b = arrancar()
    print("\n*** %s ***\n" % ("ESCRIBIENDO" if escribir else "MARCHA EN SECO"))

    fichas = {}
    for m in MUNICIPIOS:
        p = "fichas_%s.csv" % m.lower()
        if os.path.exists(p):
            for f in csv.DictReader(io.open(p, encoding="utf-8")):
                fichas[(m, pelado(f["carpeta"]))] = f

    fechas = {}
    for f in csv.DictReader(io.open("fechas_carpetas.csv", encoding="utf-8"), delimiter="|"):
        fechas[(f["municipio"], pelado(f["carpeta"]))] = f["fecha"]

    # carpeta -> comunidad, de las tarjetas del CIF que ya subimos
    docs = b.leer("documentos?select=comunidad_id,origen_ruta_dropbox&origen_ruta_dropbox=not.is.null")
    carpetas_de = {}
    for d in docs:
        p = (d["origen_ruta_dropbox"] or "").replace("/", BARRA).split(BARRA)
        if len(p) >= 4 and p[1].upper() == "1APROVINCIA":
            k = (p[2].upper(), pelado(p[3]))
            if k in fichas:
                carpetas_de.setdefault(d["comunidad_id"], set()).add(k)

    # una comunidad con DOS carpetas de fechas distintas: no se elige, se aparta
    en_disputa = {c for c, ks in carpetas_de.items()
                  if len({fechas.get(k) for k in ks}) > 1}

    opps = b.leer("oportunidades?select=id,comunidad_id,fecha_apertura&comunidad_id=not.is.null",
                  por_tramos=True)
    opps_de = {}
    for o in opps:
        opps_de.setdefault(o["comunidad_id"], []).append(o)

    filas_opp, filas_subv, sin_sitio = [], [], 0
    apartadas = []
    carpetas_usadas = set()
    for cid, ks in carpetas_de.items():
        if cid in en_disputa or cid not in opps_de:
            sin_sitio += len(ks)
            continue
        for k in ks:
            modelo, cont = modelo_y_notas(k[0], fichas[k]["carpeta"])
            if not (modelo == "moderna" and cont == "limpia"):
                apartadas.append((k, modelo, cont))
                continue
            f = fichas[k]
            carpetas_usadas.add(k)
            anio = None
            fe = fechas.get(k) or ""
            if fe[:4].isdigit():
                anio = int(fe[:4])
            for col, destino in (("notas", filas_opp), ("notas_encargo", filas_opp),
                                 ("notas_subvenciones", filas_subv)):
                for fecha, texto in trocear((f.get(col) or "").strip(), anio):
                    for o in opps_de[cid]:
                        destino.append({"oportunidad_id": o["id"], "fecha": fecha,
                                        "texto": texto, "origen": "ficha_dropbox"})

    print("carpetas cotejadas con una oportunidad : %d" % len(carpetas_usadas))
    print("APARTADAS por el modelo de la ficha      : %d" % len(apartadas))
    from collections import Counter as _C
    for (m, c), q in _C((m, c) for _, m, c in apartadas).most_common():
        print("     %-10s notas %-14s %d" % (m, c, q))
    print("carpetas apartadas (en disputa o sin opp): %d" % sin_sitio)
    print()
    print("notas_oportunidad : %d filas  (%d con fecha propia)"
          % (len(filas_opp), len([x for x in filas_opp if x["fecha"]])))
    print("notas_subvencion  : %d filas  (%d con fecha propia)"
          % (len(filas_subv), len([x for x in filas_subv if x["fecha"]])))

    print("\n--- COMO QUEDA EL CORTE 'una fecha, una nota' (4 ejemplos) ---")
    vistos = 0
    for x in filas_opp:
        if x["fecha"] and vistos < 4:
            print("   [%s] %s" % (x["fecha"], x["texto"][:110].replace("\n", " | ")))
            vistos += 1
    print("\n--- y una SIN fecha, que se queda de una pieza ---")
    for x in filas_opp:
        if not x["fecha"] and len(x["texto"]) > 200:
            print("   %s..." % x["texto"][:220].replace("\n", " | "))
            break

    if not escribir:
        print("\n   (marcha en seco. Para hacerlo: --escribir)\n")
        return

    print("\n--- escribiendo ---")
    if filas_opp:
        print("   notas_oportunidad: %d" % b.insertar("notas_oportunidad", filas_opp))
    if filas_subv:
        print("   notas_subvencion : %d" % b.insertar("notas_subvencion", filas_subv))
    print("\n--- comprobando contra produccion ---")
    print("   notas_oportunidad: %d filas" % len(b.leer("notas_oportunidad?select=id", por_tramos=True)))
    print("   notas_subvencion : %d filas" % len(b.leer("notas_subvencion?select=id", por_tramos=True)))


if __name__ == "__main__":
    main()
