# -*- coding: utf-8 -*-
"""
SUBIR LAS TARJETAS DEL CIF AL ALMACEN  (Monica, 2-oct-2026)

Los documentos de tipo `tarjeta_cif` entraron en la base diciendo la verdad de
ese momento: backend='dropbox', la ruta exacta del fichero, y `storage_ref`
vacio, o sea "sabemos cual es y donde esta, pero no lo tenemos nosotros".

Esto cierra ese circulo: coge cada uno, lo sube a `tarjeta-cif` y le cambia el
backend a 'supabase'. La ruta de Dropbox NO se borra: queda de donde vino.

El fichero vive en la carpeta local de Dropbox de esta maquina. La escritura va a
PRODUCCION a traves de scripts/produccion.py, que aborta si la URL no es la de
produccion.

Uso:
    python scripts/subir_tarjetas_cif.py            # dice lo que haria
    python scripts/subir_tarjetas_cif.py --hazlo    # lo hace
"""
import io
import json
import mimetypes
import os
import sys
import urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402

DROPBOX = r"C:\accesalia Dropbox\D SM\Ascensores y rehabilitaciones"
ALMACEN = "tarjeta-cif"
HAZLO = "--hazlo" in sys.argv

TIPOS = {".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
         ".png": "image/png", ".bmp": "image/bmp", ".tif": "image/tiff",
         ".tiff": "image/tiff"}


def main():
    b = arrancar()

    tipo = b.leer("tipos_documento?select=id&nombre=eq.tarjeta_cif")
    if not tipo:
        sys.exit("No existe el tipo de documento `tarjeta_cif`. Falta la migracion.")
    tipo_id = tipo[0]["id"]

    docs = b.leer(
        "documentos?select=id,comunidad_id,origen_ruta_dropbox,backend,storage_ref"
        "&tipo_documento_id=eq." + tipo_id + "&storage_ref=is.null")
    print("tarjetas pendientes de subir: %d" % len(docs))
    if not docs:
        return

    subidas = fallos = 0
    for d in docs:
        rel = (d.get("origen_ruta_dropbox") or "").strip()
        if not rel:
            print("  SIN RUTA  %s" % d["id"]); fallos += 1; continue
        local = os.path.join(DROPBOX, rel)
        if not os.path.exists(local):
            print("  NO ESTA   %s" % rel); fallos += 1; continue

        ext = os.path.splitext(local)[1].lower()
        # La ruta en el almacen: la comunidad y el id del documento. El id hace
        # que nunca choque, ni aunque una comunidad tenga dos tarjetas (la vieja
        # y la nueva cuando le cambian la letra del CIF).
        destino = "%s/%s%s" % (d["comunidad_id"], d["id"], ext)

        with open(local, "rb") as fh:
            datos = fh.read()

        if not HAZLO:
            print("  subiria  %7.1f KB  %s" % (len(datos) / 1024.0, destino))
            continue

        try:
            b.subir(ALMACEN, destino, datos,
                    TIPOS.get(ext, mimetypes.guess_type(local)[0] or "application/octet-stream"))
        except Exception as e:
            print("  ERROR    %s -> %s" % (rel, e)); fallos += 1; continue

        # Y se apunta en la base: ya es nuestro. `origen_ruta_dropbox` se queda:
        # saber de donde vino un documento es parte del documento.
        pet = urllib.request.Request(
            b.url + "/rest/v1/documentos?id=eq." + d["id"],
            data=json.dumps({"backend": "supabase", "storage_ref": destino,
                             "actualizado_en": "now()"}).encode("utf-8"),
            headers=dict(b.cab, **{"Content-Type": "application/json",
                                   "Prefer": "return=minimal"}),
            method="PATCH")
        try:
            urllib.request.urlopen(pet).read()
        except Exception as e:
            print("  SUBIDO PERO NO APUNTADO  %s -> %s" % (destino, e)); fallos += 1; continue

        subidas += 1
        print("  ok       %7.1f KB  %s" % (len(datos) / 1024.0, destino))

    print("\nsubidas: %d | fallos: %d" % (subidas, fallos))
    if not HAZLO:
        print("(prueba en seco: nada subido. Repetir con --hazlo)")


if __name__ == "__main__":
    main()
