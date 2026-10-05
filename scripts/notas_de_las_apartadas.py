# -*- coding: utf-8 -*-
"""
LAS 23 QUE SE APARTARON, LEIDAS UNA A UNA        (Monica, 4-oct-2026)

Su encargo: "nos quedan fichas con un formulario raro escrito a mano. Yo, en vez
de parsearlo -que siempre da problemas y ya hemos visto que no funciona bien-, al
ser un numero razonable, te pediria que las leyeras una a una y extrajeras lo que
son notas. Y crearas las notas adecuadas en las tablas adecuadas. SOLO PARA ESTAS
DE JULIO, porque son las oportunidades que estamos manejando ahora".

Son 23: las que tienen oportunidad creada y se quedaron fuera del volcado
automatico por el modelo de su ficha.

LO QUE SE QUITA, Y SOLO ESTO: la ficha a mano que la maqueta vieja mete DENTRO
del apartado de notas. Es una lista fija de etiquetas, siempre las mismas, y
siempre CON DOS PUNTOS:

    Propiedad: / CIF: / Presidente: / DNI: / CTA BANCARIA: / Codigo postal: /
    Referencia catastral: / Fachada: / PEM: / residuos: / SUPEFICIES: /
    AMBITO ORDENACION: / DISTRITO:

Se exigen los dos puntos a proposito, y esto solo se ve leyendolas: en angeles7
el historial de presidentes esta METIDO EN MEDIO de esa ficha -"A JUNIO 2022:
TOMAS SANCHEZ JUAN / DNI 51871892S / 652861482 tomassinpelas@gmail.com"- entre el
DNI y el codigo postal. Un corte por posicion -"la nota empieza despues de la
ficha"- lo perderia. Y "DNI 51871892S" sin dos puntos es nota, no formulario.
Igual que "DISTRITO CENTRO-NOROESTE", que es un dato y se queda.

Todo lo demas se conserva: el orden, los correos reenviados, los numeros de
expediente, los telefonos. Lo que no se guarda no se recupera.

Uso:
    python scripts/notas_de_las_apartadas.py             <- marcha en seco
    python scripts/notas_de_las_apartadas.py --escribir
"""
import csv
import io
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar            # noqa: E402
from leer_fichas import es_etiqueta, texto_del_docx, SECCIONES  # noqa: E402
from notas_de_julio import trocear         # noqa: E402

LISTA = "apartadas_a_leer.csv"

CABECERAS = {"NOTAS", "NOTAS ENCARGO Y PROYECTO", "NOTAS SUBVENCIONES"}

# La ficha escrita a mano dentro de las notas. Los dos puntos son obligatorios.
FICHA_A_MANO = re.compile(
    r"^\s*(propiedad|cif|presidente|dni|cta\s+bancaria|c[oó]digo\s+postal|"
    r"referencia\s+catastral|fachada|pem|residuos|supe?rficies|"
    r"ambito\s+ordenacion|distrito)\s*:", re.I)

# Donde corta un bloque de notas: en la cabecera siguiente de lo que sea.
CORTA = {c.upper() for c in SECCIONES} | CABECERAS | {
    "DATOS SUBVENCIONES", "DATOS CONTRATA", "STATUS DOCUMENTACION CP",
    "SUPERFICIES A INTERVENIR", "DATOS ENCARGO", "DATOS DEL PROYECTO",
    "DATOS AYUNTAMIENTO"}


# Secciones tras las cuales ya no hay formulario: lo que venga es diario.
COLA_DEL_DOCUMENTO = {"SUPERFICIES A INTERVENIR", "DATOS ENCARGO", "DATOS DEL PROYECTO"}


def _cab(linea):
    l = linea.strip().rstrip(":").strip().upper()
    l = re.sub(r":\s*\d+$", "", l)       # "NOTAS:3900" es NOTAS
    return l if (l in CABECERAS or l in CORTA) else None


def bloques_de(ruta):
    """{destino: texto} leyendo TODAS las cabeceras de notas de la ficha.

    Si no hay ninguna cabecera, se coge lo que va detras de la ultima seccion
    conocida: hay fichas modernas donde el diario arranca sin etiqueta, justo
    detras de SUPERFICIES A INTERVENIR o de DATOS ENCARGO.
    """
    lineas = texto_del_docx(ruta) or []
    fuera = {"oportunidad": [], "subvencion": []}
    destino, visto_alguna = None, False
    ultima_seccion = -1
    for i, l in enumerate(lineas):
        c = _cab(l)
        if c:
            if c in CABECERAS:
                visto_alguna = True
                destino = "subvencion" if c == "NOTAS SUBVENCIONES" else "oportunidad"
            else:
                destino, ultima_seccion = None, i
            continue
        if destino and l.strip() and not FICHA_A_MANO.match(l):
            fuera[destino].append(l.rstrip())
            continue
        # EL DIARIO ESCRITO SIN CABECERA, al final del bloque del proyecto. En
        # franciscadelgado7 el diario entero -"31/07/2025 HE ENVIADA (...)
        # 08/01/2026 TASAS PAGADAS"- va detras de SUPERFICIES A INTERVENIR, sin
        # ninguna etiqueta de NOTAS delante, y luego aparece "NOTAS SUBVENCIONES"
        # vacia al final. Sin esto se perdia entero.
        if (destino is None and l.strip() and ultima_seccion >= 0
                and lineas[ultima_seccion].strip().rstrip(":").upper() in COLA_DEL_DOCUMENTO
                and not es_etiqueta(l) and not FICHA_A_MANO.match(l)):
            fuera["oportunidad"].append(l.rstrip())

    if not visto_alguna and ultima_seccion >= 0:
        resto = [l.rstrip() for l in lineas[ultima_seccion + 1:]
                 if l.strip() and not es_etiqueta(l) and not FICHA_A_MANO.match(l)]
        fuera["oportunidad"] = resto
    return {k: "\n".join(v).strip() for k, v in fuera.items()}


def main():
    escribir = "--escribir" in sys.argv
    b = arrancar()
    print("\n*** %s ***\n" % ("ESCRIBIENDO" if escribir else "MARCHA EN SECO"))

    filas = list(csv.DictReader(io.open(LISTA, encoding="utf-8"), delimiter="|"))
    fechas = {}
    for f in csv.DictReader(io.open("fechas_carpetas.csv", encoding="utf-8"), delimiter="|"):
        fechas[(f["municipio"], f["carpeta"])] = f["fecha"]

    # las que ya tienen notas de la pasada anterior no se tocan
    ya = {r["oportunidad_id"] for r in b.leer("notas_oportunidad?select=oportunidad_id", por_tramos=True)}

    nuevas_opp, nuevas_subv, vacias = [], [], []
    for f in filas:
        bl = bloques_de(f["ruta"])
        anio = None
        fe = fechas.get((f["municipio"], f["carpeta"])) or ""
        if fe[:4].isdigit():
            anio = int(fe[:4])
        opps = [x for x in f["opps"].split(",") if x and x not in ya]
        n_o = n_s = 0
        for clave, destino in (("oportunidad", nuevas_opp), ("subvencion", nuevas_subv)):
            for fecha, texto in trocear(bl[clave], anio):
                for oid in opps:
                    destino.append({"oportunidad_id": oid, "fecha": fecha,
                                    "texto": texto, "origen": "ficha_dropbox"})
                if clave == "oportunidad":
                    n_o += 1
                else:
                    n_s += 1
        print("%-11s %-26s  opp:%-3d subv:%-2d %s"
              % (f["municipio"][:11], f["carpeta"][:26], n_o, n_s,
                 "" if (n_o or n_s) else "<- sin notas"))
        if not (n_o or n_s):
            vacias.append(f["carpeta"])

    print("\nnotas_oportunidad : %d filas (%d con fecha)"
          % (len(nuevas_opp), len([x for x in nuevas_opp if x["fecha"]])))
    print("notas_subvencion  : %d filas" % len(nuevas_subv))
    print("carpetas sin nada que sacar: %d  %s" % (len(vacias), ", ".join(vacias)))

    if not escribir:
        print("\n   (marcha en seco. Para hacerlo: --escribir)\n")
        return
    print("\n--- escribiendo ---")
    if nuevas_opp:
        print("   notas_oportunidad: %d" % b.insertar("notas_oportunidad", nuevas_opp))
    if nuevas_subv:
        print("   notas_subvencion : %d" % b.insertar("notas_subvencion", nuevas_subv))
    print("\n--- total en produccion ---")
    print("   notas_oportunidad: %d" % len(b.leer("notas_oportunidad?select=id", por_tramos=True)))
    print("   notas_subvencion : %d" % len(b.leer("notas_subvencion?select=id", por_tramos=True)))


if __name__ == "__main__":
    main()
