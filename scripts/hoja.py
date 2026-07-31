# -*- coding: utf-8 -*-
r"""
Escribir hojas de revision sin destruir el trabajo de Monica.

El problema, que ya ha pasado tres veces: un script genera una hoja, ella la
revisa a mano (a menudo AÑADIENDO columnas nuevas, que es su forma de trabajar),
y una segunda pasada del script la reescribe entera y se lleva su revision por
delante. Horas de trabajo perdidas y sin copia.

Regla, sin excepciones:

    escribir_hoja() NUNCA pisa un fichero que ya existe.

Si existe, lo deja intacto y escribe al lado con sufijo. Y antes de cualquier
cosa hace copia en _copias\.

Para releer lo que ella escribio, incluidas las columnas que se haya inventado,
usar leer_hoja(): devuelve las filas como dict SIN perder claves desconocidas.
"""
import os, csv, shutil

COPIAS = r"C:\accesalia-fichas\_copias"

def respaldar(ruta):
    """Copia de seguridad antes de tocar nada. Nunca pisa una copia anterior."""
    if not os.path.exists(ruta):
        return
    os.makedirs(COPIAS, exist_ok=True)
    base = os.path.basename(ruta)
    destino = os.path.join(COPIAS, base)
    n = 0
    while os.path.exists(destino):
        n += 1
        raiz, ext = os.path.splitext(base)
        destino = os.path.join(COPIAS, f"{raiz}_{n}{ext}")
    shutil.copy2(ruta, destino)
    return destino

def leer_hoja(ruta):
    """Las filas tal cual, conservando columnas que ella haya añadido a mano."""
    if not os.path.exists(ruta):
        return [], []
    with open(ruta, encoding="utf-8-sig", newline="") as fh:
        r = csv.DictReader(fh)
        return list(r), list(r.fieldnames or [])

def escribir_hoja(ruta, cabecera, filas, motivo=""):
    """Escribe SOLO si no existe. Si existe, escribe al lado y avisa.

    Devuelve la ruta realmente escrita."""
    respaldar(ruta)
    if os.path.exists(ruta):
        raiz, ext = os.path.splitext(ruta)
        alt = raiz + "_nueva" + ext
        n = 0
        while os.path.exists(alt):
            n += 1
            alt = f"{raiz}_nueva{n}{ext}"
        print(f"  OJO: {os.path.basename(ruta)} ya existe y NO se toca "
              f"(puede estar revisada).\n       Lo nuevo va a {os.path.basename(alt)}")
        ruta = alt
    with open(ruta, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(cabecera)
        w.writerows(filas)
    print(f"  -> {ruta}" + (f"  ({motivo})" if motivo else ""))
    return ruta
