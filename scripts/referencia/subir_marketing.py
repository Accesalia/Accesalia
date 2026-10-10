# -*- coding: utf-8 -*-
"""
SUBIR EL MATERIAL DE MARKETING (Monica, 10-oct-2026).

Los seis documentos que ella paso de Dropbox _MARKETING, al almacen privado
`referencia` (marketing/<slug>) y una fila en documentos_referencia por cada
uno. En el almacen, nombre sin tildes ni espacios; el original se guarda en
nombre_fichero para que la descarga salga con su nombre de siempre.

Solo produccion (scripts/produccion.py). Se puede repetir: reemplaza.
Uso: python scripts/referencia/subir_marketing.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from produccion import arrancar  # noqa: E402

MARKETING = r"C:\accesalia Dropbox\D SM\Ascensores y rehabilitaciones\_MARKETING"
PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation"

DOCUMENTOS = [
    # (titulo, ruta dentro de _MARKETING, ruta en el almacen, tipo)
    ("Dossier Accesalia (español)", "DOSSIER ACCESALIA ESPAÑOL.pdf", "marketing/dossier-accesalia-es.pdf", "application/pdf"),
    ("Dossier Accesalia (inglés)", "DOSSIER ACCESALIA ENGLISH.pdf", "marketing/dossier-accesalia-en.pdf", "application/pdf"),
    ("Tríptico para imprimir", r"Tríptico para imprimir\Tríptico.pdf", "marketing/triptico.pdf", "application/pdf"),
    ("Dossier SATE", "Dossier SATE.pdf", "marketing/dossier-sate.pdf", "application/pdf"),
    ("Tu subvención, de principio a fin · para comunidades", "Tu subvención, de principio a fin_comunidades.pptx",
     "marketing/tu-subvencion-comunidades.pptx", PPTX),
    ("Tu subvención, de principio a fin · para comerciales", "Tu subvención, de principio a fin_comerciales.pptx",
     "marketing/tu-subvencion-comerciales.pptx", PPTX),
]


def main():
    base = arrancar()
    ya = {f["fichero"] for f in base.leer("documentos_referencia?select=fichero&seccion=eq.marketing")}
    for orden, (titulo, ruta, destino, tipo) in enumerate(DOCUMENTOS, 1):
        origen = os.path.join(MARKETING, ruta)
        with open(origen, "rb") as fh:
            datos = fh.read()
        base.subir("referencia", destino, datos, tipo, reemplazar=True)
        if destino not in ya:
            base.insertar("documentos_referencia", [{
                "seccion": "marketing",
                "titulo": titulo,
                "fichero": destino,
                "nombre_fichero": os.path.basename(ruta),
                "tipo_mime": tipo,
                "tamano": len(datos),
                "orden": orden,
                "subido_por": "Volcado de Dropbox",
                "origen_ruta_dropbox": "_MARKETING\\" + ruta,
            }])
        print("%s: %.1f MB" % (titulo, len(datos) / 1e6))
        sys.stdout.flush()


if __name__ == "__main__":
    main()
