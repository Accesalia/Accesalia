# -*- coding: utf-8 -*-
"""
LAS MANIAS DE LOS ORGANISMOS, SACADAS DE LAS NOTAS   (Monica, 5-oct-2026)

Ella creo 'manias_organismos' leyendo las fichas con el otro hilo: lo que cada
ayuntamiento, junta, COAM o tecnico EXIGE o interpreta a su manera. "Esas manias
son lo que nos va a salvar el culo."

Esto rescata las que ya estan dentro de las 774 notas cargadas de los tres
municipios barridos, que el otro hilo no va a ver porque el lee los pequenos.

EL CRITERIO ES SUYO Y ES "TODO DENTRO":

    "Yo guardaria todo: la tabla de manias no va a ir directa a produccion, va
     como bibliografia, y su mayor valor va a ser el PATRON DE REPETICION: si lo
     de hacer hincapie en humedades se repite 23 veces... hay que saberlo.
     Prefiero tener info de mas que de menos. Despues, con la tabla completa tras
     todas las pasadas, sera el momento de seleccionar lo relevante; pero para
     saber que es relevante hace falta acumular evidencia."

Asi que no se filtra por "esto parece mania de verdad y esto no". Entra todo lo
que mezcle un ORGANISMO con una EXIGENCIA. Lo unico que se deja fuera es el
formulario en blanco, que no es texto de nadie.

QUE SE GUARDA EN CADA COLUMNA:
  cita   - el texto de la nota ENTERO, sin tocar. Es lo que sostiene la mania:
           dentro de un ano nadie se acordara de donde salio.
  mania  - la frase que lleva la exigencia, recortada. No es una interpretacion
           mia: es el trozo de la cita donde esta la pista.
  tecnico / departamento - solo si la nota los nombra. Si no, vacio: no se deduce.
  fecha, oportunidad_id, nota_oportunidad_id - de donde viene, para poder volver.
  municipio_id - siempre. Ella: "siempre tenemos municipio. A veces sera
           relevante y a veces no (como visados), pero ponerlo no estorba y a
           veces aclara. Una mania del COAM tiene como origen una opp ligada a un
           municipio: se puede vincular."

Uso:
    python scripts/manias_desde_las_notas.py             <- marcha en seco
    python scripts/manias_desde_las_notas.py --escribir
"""
import csv
import io
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402

BARRA = chr(92)

ORGANISMO = re.compile(
    r"\bayto\b|ayuntamiento|urbanismo|\botaf\b|\bcoam\b|\badif\b|junta de distrito|"
    r"bomberos|patrimonio|medio ?ambiente|licencias|t[eé]cnic[oa]|sede electr|"
    r"catastro|registro|hacienda|confederaci[oó]n", re.I)

EXIGE = re.compile(
    r"requerimiento|requier|requeri|exig|no admit|no acept|obliga|hay que|nos pide|"
    r"piden|pide que|solicita|deber[áa]|no vale|rechaz|subsan|desfavorable|"
    r"aporta[rn]|hincapi[eé]|advierte|avisa de que|condicion|prohib|no deja|"
    r"nos dice que|informa de que|hace falta", re.I)

# El impreso en blanco no es de nadie: no es una mania. Se detecta SIN regex a
# proposito: la primera version usaba un patron con anidamiento exponencial
# -(?:(?:...)*)+- y se atascaba varios minutos en una nota de 8.000 caracteres.
# Un formulario en blanco no tiene prosa: son etiquetas en mayusculas y numeros.
def solo_formulario(t):
    letras = [c for c in t if c.isalpha()]
    if not letras:
        return True
    minusculas = sum(1 for c in letras if c.islower())
    return minusculas < len(letras) * 0.15


# A quien nombra la nota
DEPARTAMENTOS = [
    ("COAM", r"\bcoam\b"), ("ADIF", r"\badif\b"), ("OTAF", r"\botaf\b"),
    ("Urbanismo", r"urbanismo"), ("Licencias", r"licencias"),
    ("Medio Ambiente", r"medio ?ambiente"), ("Bomberos", r"bomberos"),
    ("Patrimonio", r"patrimonio"), ("Junta de distrito", r"junta de distrito"),
    ("Catastro", r"catastro"), ("Ayuntamiento", r"\bayto\b|ayuntamiento"),
]
# "la técnico Gema Bermejo", "el técnico municipal Juan Antonio Juara"
TECNICO = re.compile(
    r"t[eé]cnic[oa][s]?\s+(?:municipal\s+|del\s+ayto\s+|de\s+urbanismo\s+)?"
    r"((?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+|[A-ZÁÉÍÓÚÑ]{3,})(?:\s+(?:de|del|la)?\s*"
    r"(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+|[A-ZÁÉÍÓÚÑ]{3,})){1,3})")

pel = lambda s: "".join(c for c in unicodedata.normalize("NFKD", s or "")
                        if not unicodedata.combining(c)).lower().replace(" ", "")


def frase_con_la_pista(texto):
    """La frase donde esta la exigencia. Recorte, no interpretacion."""
    trozos = re.split(r"(?<=[.;!?])\s+|\n", texto)
    for t in trozos:
        if EXIGE.search(t) and ORGANISMO.search(t):
            return " ".join(t.split())[:300]
    for t in trozos:
        if EXIGE.search(t):
            return " ".join(t.split())[:300]
    return " ".join(texto.split())[:300]


def main():
    escribir = "--escribir" in sys.argv
    b = arrancar()
    print("\n*** %s ***\n" % ("ESCRIBIENDO" if escribir else "MARCHA EN SECO"))

    municipios = {pel(m["nombre"]): m["id"]
                  for m in b.leer("municipios_catastro?select=id,nombre", por_tramos=True)}
    coms = {c["id"]: c for c in b.leer("comunidades?select=id,nombre,municipio", por_tramos=True)}
    op2com = {o["id"]: o["comunidad_id"] for o in
              b.leer("oportunidades?select=id,comunidad_id&comunidad_id=not.is.null", por_tramos=True)}

    # comunidad -> carpeta de Dropbox, para la ruta
    ruta_de = {}
    for d in b.leer("documentos?select=comunidad_id,origen_ruta_dropbox&origen_ruta_dropbox=not.is.null"):
        p = (d["origen_ruta_dropbox"] or "").replace("/", BARRA).split(BARRA)
        if len(p) >= 4 and p[1].upper() == "1APROVINCIA":
            ruta_de.setdefault(d["comunidad_id"], BARRA.join(p[:4]))
    if os.path.exists("cotejo_por_direccion.csv"):
        for f in csv.DictReader(io.open("cotejo_por_direccion.csv", encoding="utf-8"), delimiter="|"):
            if f["estado"] == "ok" and f["comunidad_id"]:
                ruta_de.setdefault(f["comunidad_id"],
                                   BARRA.join(["MADRID", "1APROVINCIA", f["municipio"], f["carpeta"]]))

    ya = {(m["nota_oportunidad_id"]) for m in
          b.leer("manias_organismos?select=nota_oportunidad_id", por_tramos=True)}

    filas, sin_municipio, descartadas = [], [], 0
    for n in b.leer("notas_oportunidad?select=id,oportunidad_id,fecha,texto", por_tramos=True):
        t = (n["texto"] or "").strip()
        if not t or n["id"] in ya:
            continue
        if not (ORGANISMO.search(t) and EXIGE.search(t)):
            continue
        if solo_formulario(t):
            descartadas += 1
            continue
        com = coms.get(op2com.get(n["oportunidad_id"]))
        if not com:
            continue
        mid = municipios.get(pel(com["municipio"] or ""))
        if not mid:
            sin_municipio.append(com["municipio"])
            continue
        dep = next((nom for nom, pat in DEPARTAMENTOS if re.search(pat, t, re.I)), None)
        mt = TECNICO.search(t)
        filas.append({
            "municipio_id": mid,
            "departamento": dep,
            "tecnico": (mt.group(1).strip() if mt else None),
            "mania": frase_con_la_pista(t),
            "cita": t,
            "fecha": n["fecha"],
            "oportunidad_id": n["oportunidad_id"],
            "nota_oportunidad_id": n["id"],
            "ruta_dropbox": ruta_de.get(com["id"], "(sin ruta)"),
            "origen": "ficha_dropbox",
        })

    from collections import Counter
    print("   manias a guardar          : %d" % len(filas))
    print("   formulario en blanco, fuera: %d" % descartadas)
    print("   sin municipio en el callejero: %d %s"
          % (len(sin_municipio), sorted(set(sin_municipio))[:4]))
    print("\n   por municipio : %s" % dict(Counter(
        next(k for k, v in municipios.items() if v == f["municipio_id"]) for f in filas)))
    print("   por departamento: %s" % dict(Counter(f["departamento"] or "(no lo dice)" for f in filas)))
    print("   con tecnico con nombre: %d" % len([f for f in filas if f["tecnico"]]))
    print("\n   ejemplos:")
    for f in filas[:5]:
        print("      [%s · %s] %s" % (f["departamento"] or "-", f["tecnico"] or "-", f["mania"][:110]))

    if not escribir:
        print("\n   (marcha en seco. Para hacerlo: --escribir)\n")
        return
    print("\n--- escribiendo ---")
    print("   %d manias guardadas" % b.insertar("manias_organismos", filas))
    print("   total en la tabla: %d"
          % len(b.leer("manias_organismos?select=id", por_tramos=True)))


if __name__ == "__main__":
    main()
