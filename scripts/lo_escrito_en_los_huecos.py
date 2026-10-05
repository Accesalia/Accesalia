# -*- coding: utf-8 -*-
"""
LO QUE SE ESCRIBIO EN LOS HUECOS DE LA FICHA        (Monica, 5-oct-2026)

    "Tu parseo descarta todo lo que viene por debajo del primer salto de linea
     fuera de las tablas, y en estas fichas antiguas se escribia mucho en los
     espacios en blanco intercalados. NO SE PUEDEN PARSEAR; hay que leer."

Tenia razon: en Leganes, 792 lineas no llegaban ni a un campo ni a una nota, en
89 de 91 carpetas. Entre ellas, teléfonos de presidentes, la contrata elegida,
el tecnico del ayuntamiento con su horario, y notas como "PONER EN COPIA PARA
TODO, LOS PRESIDENTES SON MUY MAYORES".

Se leyeron las 91 una a una. De ahi salieron ocho familias, y la regla que ella
dio para todas: lo que hoy no tiene casa va a NOTA CON SU ETIQUETA, y en una
barrida posterior se saca con una busqueda. "Pongamosle etiqueta, como a lo de
los tecnicos, para que sea facil identificarlo despues."

    [CONTACTO]      presidentes, vicepresidentes, secretarios, vecinos
    [HISTORIA]      lo tachado: quien era antes
    [TECNICO]       el tecnico de Accesalia y sus relevos
    [CONTRATA]      Roen, FAIN, Orona, Tresa... y quien es quien en ellas
    [AYUNTAMIENTO]  el tecnico del ayto, su telefono y sus horas
    [IBAN]          la cuenta de la comunidad
    [OBRA]          el tipo de obra en texto libre
    [TRAMITACION]   presentada / aprobada / concedida, con su fecha

LOS CONTACTOS NO SE PARTEN A MAQUINA. Van tambien como nota etiquetada, no como
filas de `personas_comunidad`: sacar nombre, telefono y papel de
"679 348 668 (Ruben - Presidente) lastraruben@gmail.com (poner siempre en copia)"
es inventarse la estructura, y su regla es no fabricar datos por heuristica. Con
la etiqueta puesta, crearlos despues es un rato; crearlos mal es un destrozo.

Uso:
    python scripts/lo_escrito_en_los_huecos.py             <- marcha en seco
    python scripts/lo_escrito_en_los_huecos.py --escribir
"""
import csv
import io
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar                              # noqa: E402
from leer_fichas import PROVINCIA, fichas_de, texto_del_docx, leer_ficha  # noqa: E402
from notas_de_las_apartadas import bloques_de                # noqa: E402

# El municipio por la linea de ordenes. Estaba fijo y eso ya rompio el cotejo
# una vez: las listas de municipios escritas a mano se olvidan.
MUNICIPIO = ([a.upper() for a in sys.argv[1:] if not a.startswith("-")] or ["LEGANES"])[0]

RUIDO = {"Ref", "notas", "Num cuenta", "(convocatoria, fecha e importe)", "Fachada:",
         "residuos:", "Año construcción", "Jefe obra", "Jefe de obra", "Inicio obra",
         "Consulta Urb", "Cp", "cp", "DIRECCION", "TELEFONO", "E-MAIL"}

IBAN = re.compile(r"\bES\d{2}[\s\d]{14,}")
TEL = re.compile(r"\b\d{3}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b|\b\d{9}\b")
AYTO = re.compile(r"@leganes\.org|t[eé]cnico del ayto|patrimonio\s*:", re.I)
CONTRATA = re.compile(r"\broen\b|\bfain\b|orona|tresa|inapelsa|bayfer|erco|proyecton|"
                      r"ascensores|contrata|constructora|jefe de obra|antegalia|cr servicios", re.I)
TRAMITA = re.compile(r"\b(presentada|aprobada|concedida|solicitada)\b", re.I)
RELEVO = re.compile(r"(->|=>|>)\s*\w")
# lo que es la direccion de alguien, que ya esta en su campo
DIRECCION = re.compile(r"^(xx+/|CDAD|CL |AV |C/|Calle |Plaza |Pza|Avda|Av\.|\d{5}\s)")


def es_etiqueta(l):
    letras = [c for c in l if c.isalpha()]
    return (not letras) or sum(1 for c in letras if c.islower()) < len(letras) * 0.15


def familia(linea, bajo):
    if IBAN.search(linea):
        return "IBAN"
    if AYTO.search(linea) or "AYTO" in bajo.upper():
        return "AYUNTAMIENTO"
    if "TECNICO" in bajo.upper() or (RELEVO.search(linea) and len(linea.split()) <= 7):
        return "TECNICO"
    if CONTRATA.search(linea):
        return "CONTRATA"
    if TRAMITA.search(linea):
        return "TRAMITACION"
    if "TIPO DE OBRA" in bajo.upper():
        return "OBRA"
    if "~~" in linea:
        return "HISTORIA"
    if TEL.search(linea) or "@" in linea:
        return "CONTACTO"
    return "NOTA"


def lineas_de(ruta):
    """(familia, texto) de lo que no llega ni a un campo ni a una nota."""
    doc = [l.strip() for l in texto_del_docx(ruta) if l.strip()]
    capt = "\n".join(bloques_de(ruta).values())
    campos = "\n".join(str(v) for v in leer_ficha(ruta).values() if v)
    fuera, bajo = [], ""
    for l in doc:
        if es_etiqueta(l) and len(l.split()) <= 6 and "~~" not in l:
            bajo = l
            continue
        if l in capt or l in campos or l in RUIDO or len(l) < 4 or DIRECCION.match(l):
            continue
        fuera.append((familia(l, bajo), l))

    # NO SE INTENTA JUNTAR CABECERA Y CONTENIDO A MAQUINA. Se probo y salio
    # peor: entre dos lineas que se guardan hay etiquetas del impreso por medio,
    # asi que pegarlas unia el DNI de un presidente con el telefono de otro.
    # Ella ya lo habia dicho: "NO SE PUEDEN PARSEAR; hay que leer". Las cortas
    # se leen a mano, carpeta por carpeta, como se hizo en Leganes.
    return fuera



def main():
    escribir = "--escribir" in sys.argv
    b = arrancar()
    print("\n*** %s ***\n" % ("ESCRIBIENDO" if escribir else "MARCHA EN SECO"))

    opps_de = {}
    for o in b.leer("oportunidades?select=id,comunidad_id&comunidad_id=not.is.null", por_tramos=True):
        opps_de.setdefault(o["comunidad_id"], []).append(o["id"])
    ya = {(n["oportunidad_id"], n["texto"])
          for n in b.leer("notas_oportunidad?select=oportunidad_id,texto", por_tramos=True)}

    filas = [f for f in csv.DictReader(io.open("cotejo_por_direccion.csv", encoding="utf-8"), delimiter="|")
             if f["estado"] == "ok" and f["municipio"] == MUNICIPIO]

    nuevas, por_familia, sin_opp = [], {}, []
    for f in sorted(filas, key=lambda x: x["carpeta"]):
        rutas = fichas_de(os.path.join(PROVINCIA, f["municipio"], f["carpeta"]))
        if not rutas:
            continue
        opps = opps_de.get(f["comunidad_id"], [])
        if not opps:
            sin_opp.append(f["carpeta"])
            continue
        for fam, texto in lineas_de(rutas[0]):
            marcado = "[%s] %s" % (fam, " ".join(texto.split()))
            for oid in opps:
                if (oid, marcado) in ya:
                    continue
                ya.add((oid, marcado))
                nuevas.append({"oportunidad_id": oid, "fecha": None,
                               "texto": marcado, "origen": "ficha_dropbox"})
            por_familia[fam] = por_familia.get(fam, 0) + 1

    print("   carpetas leidas : %d" % len(filas))
    print("   notas a escribir: %d" % len(nuevas))
    for k in sorted(por_familia, key=lambda x: -por_familia[x]):
        print("      %-14s %3d" % (k, por_familia[k]))
    if sin_opp:
        print("   sin oportunidad : %d  %s" % (len(sin_opp), ", ".join(sin_opp[:5])))

    if not escribir:
        print("\n   (marcha en seco. Para hacerlo: --escribir)\n")
        return
    print("\n--- escribiendo ---")
    print("   %d notas" % b.insertar("notas_oportunidad", nuevas))


if __name__ == "__main__":
    main()
