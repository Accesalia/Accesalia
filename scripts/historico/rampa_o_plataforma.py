# -*- coding: utf-8 -*-
"""
RAMPA O PLATAFORMA: lee los presupuestos del colegio de las obras de
accesibilidad (las que el tipo de obra llama plataforma, rampa o "mejora de
accesibilidad" sin ascensor) y cuenta lo que dicen sus partidas.

Monica, 11-oct-2026: "una plataforma es siempre mas cara, porque incluye la
maquina. La rampa es solo obra civil". Asi que lo que manda es si el
presupuesto trae la maquina (plataforma elevadora, salvaescaleras, silla...).

SOLO LEE. No escribe nada en la base; deja un CSV para revisar.
"""
import csv
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from produccion import arrancar  # noqa: E402

DROPBOX = r"C:\accesalia Dropbox\D SM\Ascensores y rehabilitaciones"
SALIDA = sys.argv[1] if len(sys.argv) > 1 else "rampa_o_plataforma.csv"

PALABRAS = {
    "rampa": r"\brampas?\b",
    "plataforma": r"plataformas?\s+(elevadora|salvaescaleras|vertical|inclinada|de\s+elevaci)",
    "salvaescaleras": r"salva\s*escaleras|silla\s+salva|oruga",
    "ascensor": r"\bascensor(es)?\b",
}


def texto_pdf(ruta):
    from pypdf import PdfReader
    return "\n".join(p.extract_text() or "" for p in PdfReader(ruta).pages)


# Una partida por unidades: "05.01   ud  PLATAFORMA ELEVADORA VERTICAL 180".
# Hay PDF que salen sin saltos de linea, asi que no se ancla al principio de la
# linea: la unidad (ud) seguida del titulo en MAYUSCULAS (las descripciones van
# en minusculas).
PARTIDA = re.compile(r"(?<![A-Za-z])(?:ud|Ud|UD|u|uds)\.?\s{1,6}([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ0-9 .,/()º°x+\-]{3,90})")
# Lo que no es la maquina aunque la nombre.
NO_MAQUINA = re.compile(r"^(INSTALACI|AYUDA|DEMOLI|DESMONT|LEVANTADO|RETIRADA|DESMONTAJE|BOLET|NUEVO CUADRO|CUADRO|"
                        r"RECOLOCACI|PLACA|VIGA|ESTRUCTURA|PUERTA|LEGALIZA|ACOMETIDA|LINEA|LÍNEA|PROTECCI|"
                        r"DERIVACI|TOMA|PUESTA|CERTIFICA|REVISI|PROYECTO)")


def partidas_maquina(texto):
    """Las partidas que son la maquina: plataforma/salvaescaleras/silla, o ascensor."""
    maq, asc = [], []
    for m in PARTIDA.finditer(texto):
        titulo = re.sub(r"\s+", " ", m.group(1)).strip()
        if NO_MAQUINA.search(titulo):
            continue
        junto = re.sub(r"[\s.]+", "", titulo).upper()
        if junto.startswith("ASCENSOR"):
            asc.append(titulo)
        if re.search(r"^PLATAFORMA|PLATAFORMA(ELEVADORA|INCLINADA|VERTICAL|SALVA)|SALVAESCALERA|SILLA|ORUGA", junto):
            maq.append(titulo)
    return maq, asc


def clasificar(base):
    """Una fila por obra de accesibilidad, con lo que dice su presupuesto."""
    filas = base.leer(
        "datos_proyecto?select=id,tipo_obra,caso_actuacion,pem,ruta,"
        "presupuestos_proyecto(ruta)&or=(tipo_obra.ilike.*rampa*,tipo_obra.ilike.*plataforma*,"
        "tipo_obra.ilike.*salvaescal*,tipo_obra.ilike.*accesibilidad*)")
    filas = [f for f in filas if "ASCENSOR" not in (f["tipo_obra"] or "").upper()
             or re.search("PLATAFORMA|SALVAESCAL|RAMPA", f["tipo_obra"] or "", re.I)]
    out = []
    for f in filas:
        r = {"id": f["id"], "tipo_obra": f["tipo_obra"], "caso": f["caso_actuacion"],
             "pem": f["pem"], "carpeta": f["ruta"].split("\\2.PROYECTO")[0].split("\\PROYECTO")[0]}
        pres = [p["ruta"] for p in f.get("presupuestos_proyecto") or []]
        texto = ""
        for p in pres:
            try:
                texto += texto_pdf(os.path.join(DROPBOX, p))
            except Exception as e:  # noqa: BLE001
                r["error"] = str(e)[:80]
        r["presupuesto"] = "si" if texto else "no"
        for k, pat in PALABRAS.items():
            r[k] = len(re.findall(pat, texto, re.I))
        maquina, asc = partidas_maquina(texto)
        r["partida_maquina"] = " | ".join(maquina)[:200]
        r["partida_ascensor"] = " | ".join(asc)[:200]
        r["clase"] = ("" if not texto else "ascensor" if asc else "plataforma" if maquina
                      else "rampa" if r["rampa"] else "otra")
        out.append(r)
    return out


def main():
    out = clasificar(arrancar())
    campos = ["id", "carpeta", "tipo_obra", "caso", "pem", "presupuesto",
              "rampa", "plataforma", "salvaescaleras", "ascensor",
              "clase", "partida_maquina", "partida_ascensor", "error"]
    with open(SALIDA, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, campos, delimiter=";")
        w.writeheader()
        w.writerows(out)
    print(len(out), "obras ->", SALIDA)


if __name__ == "__main__":
    main()
