# -*- coding: utf-8 -*-
"""
DONDE EMPIEZA EL DIARIO                            (Monica, 5-oct-2026)

    "El formulario NO VA EN NOTAS, pero hay cosas de ahi que se pueden extraer
     COMO nota."

El bloque de notas de la ficha arrastra delante los valores sueltos del impreso:
el numero de visado, el expediente, el PEM y las etiquetas en mayusculas del
formulario. Eso NO es diario.

LA FRONTERA. El diario empieza en la primera linea que es de una persona:
  - abre con una FECHA (14/06/2023, 9-12-25, 2025-10-09...), o
  - es un correo (De:, Para:, Asunto:, Subject:, Fwd:, Forwarded message), o
  - es PROSA: tiene suficientes minusculas y mas de cuatro palabras.
Desde ahi hacia abajo se guarda todo, sin tocar.

LO QUE SE CAE NO SE TIRA A CIEGAS: `candidatas()` devuelve las lineas
descartadas que parecen escritas a mano -prosa, o con fecha dentro- para que
ella las mire. Son las anotaciones dentro de las casillas del impreso, que SI
son nota.
"""
import re

FECHA = re.compile(r"^\s*~*\s*\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b|^\s*~*\s*\d{4}-\d{2}-\d{2}\b")
CORREO = re.compile(r"^\s*(De|Para|Asunto|Subject|From|To|Date|Fwd|RE|Enviado)\s*:|Forwarded message|^\s*-{5,}", re.I)

# Etiquetas del impreso: van en mayusculas y son cortas. No son prosa de nadie.
def _es_etiqueta(l):
    letras = [c for c in l if c.isalpha()]
    if not letras:
        return True
    return sum(1 for c in letras if c.islower()) < len(letras) * 0.15

# Codigos y numeros sueltos del formulario: visado TL/..., expediente, PEM.
CODIGO = re.compile(r"^[\s~]*[0-9A-Za-z/._()-]+[\s~]*$")


def es_prosa(l):
    """Escrito por una persona: minusculas de verdad y mas de cuatro palabras."""
    if _es_etiqueta(l):
        return False
    return len(l.split()) > 4


def donde_empieza(lineas):
    """El indice de la primera linea del diario. len(lineas) si no hay diario.

    Y despues RETROCEDE: la cabecera de un correo reenviado -el nombre de quien
    escribe, la hora, "para yo"- no es ni fecha ni prosa larga, asi que el corte
    se la dejaba fuera y partia el correo por la mitad. Si justo encima hay
    lineas que no son ni codigo ni etiqueta del impreso, son del mismo correo y
    se recuperan."""
    for i, l in enumerate(lineas):
        t = l.strip()
        if not t:
            continue
        if FECHA.search(t) or CORREO.search(t) or es_prosa(t):
            j = i
            while j > 0:
                a = lineas[j - 1].strip()
                if not a:
                    j -= 1
                    continue
                if CODIGO.match(a) or _es_etiqueta(a):
                    break
                j -= 1
            return j
    return len(lineas)


def partir(texto):
    """(formulario, diario). El diario se devuelve tal cual, sin tocar."""
    lineas = texto.split("\n")
    i = donde_empieza(lineas)
    return "\n".join(lineas[:i]), "\n".join(lineas[i:])


def candidatas(formulario):
    """De lo descartado, lo que parece escrito a mano y habria que mirar."""
    fuera = []
    for l in formulario.split("\n"):
        t = l.strip()
        if not t or CODIGO.match(t):
            continue
        # etiqueta corta del impreso, no
        if _es_etiqueta(t) and len(t.split()) <= 8:
            continue
        fuera.append(t)
    return fuera


# --------------------------------------------------------------------------
# LO QUE ALGUIEN ESCRIBIO DENTRO DE UNA CASILLA
#
# Monica, 5-oct-2026: "el formulario NO VA EN NOTAS, pero hay cosas de ahi que
# se pueden extraer COMO nota".
#
# Para distinguirlas se usa LA REPETICION, que no se equivoca: una etiqueta del
# impreso sale en decenas de fichas -"ACTA DE APROBACION DEL PRESIDENTE..."- y
# lo que escribio una persona sale en una sola. Lo que aparece en tres fichas o
# mas es del impreso.
#
# Y aparte se quitan los valores inequivocos: superficies, expedientes con el
# formato del ayuntamiento, correos sueltos y horas.

import collections

VALOR = re.compile(
    r"^[\d.,\s]+m2?³?²?$|^[\d.,\s]+$"
    r"|^[^@\s]+@[^@\s]+\.[a-z]{2,}[;\s]*$"
    r"|^\d{4}/\w+/\w+"
    r"|^\d{1,2}:\d{2}\b"
    r"|^(superficie|p\.?\s*(baja|tipo)|planta|total)\b", re.I)


def contar_etiquetas(formularios):
    """En cuantas fichas distintas sale cada linea. `formularios` es una lista
    de textos de formulario, uno por ficha."""
    c = collections.Counter()
    for f in formularios:
        for t in set(x.strip().upper() for x in candidatas(f)):
            c[t] += 1
    return c


def escritas_a_mano(formulario, cuenta, minimo=3):
    """Lo que escribio una persona dentro del impreso, POR BLOQUES.

    Linea a linea no sirve, y lo canto ella mirando el excel: "el texto de la
    nota NO ESTABA". Una anotacion ocupa varias lineas seguidas -"Presidente a
    marzo 2023:" y debajo el nombre, el DNI y el telefono- y cortada por la
    primera no dice nada.

    Asi que se agrupan las lineas seguidas y se guarda el GRUPO ENTERO si alguna
    de sus lineas la escribio una persona. Lo que arrastre de mas es el contexto
    que hace que se entienda."""
    bloques, actual = [], []
    for l in formulario.splitlines():
        t = l.strip()
        if not t:
            if actual:
                bloques.append(actual)
                actual = []
            continue
        actual.append(t)
    if actual:
        bloques.append(actual)

    fuera = []
    for b in bloques:
        util = [t for t in b
                if not CODIGO.match(t)
                and not (_es_etiqueta(t) and len(t.split()) <= 8)
                and cuenta[" ".join(t.split()).upper()] < minimo
                and not VALOR.match(" ".join(t.split()))]
        if not util:
            continue
        # El bloque entero, no solo la linea que lo delato.
        fuera.append(chr(10).join(" ".join(t.split()) for t in b))
    return fuera
