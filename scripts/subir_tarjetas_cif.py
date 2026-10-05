# -*- coding: utf-8 -*-
"""
SUBIR A STORAGE LAS TARJETAS DEL CIF QUE SE QUEDARON EN DROPBOX
(Monica, 5-oct-2026)

Su decision, y es de arquitectura: "lo TECNICO -faro, revit, nube- queda en
dropbox. Lo COTIDIANO -ofimatica, fotos, mails- a supabase". Y antes:
"el Dropbox no deberia guardar ese tipo de documentos".

El agujero concreto: hay 105 filas de 'documentos' tipo tarjeta_cif, pero solo
28 con el fichero dentro. Las otras 77 tienen backend='dropbox' y solo apuntan a
la ruta, porque a mitad del 3-oct cambie de criterio y no lo dije. Si alguien
reorganiza una carpeta, esas 77 tarjetas dejan de ser localizables.

ESTO SOLO SUBE LAS QUE YA TIENEN FILA. Las carpetas que tienen un fichero con
pinta de CIF pero no tienen fila no se tocan: entre ellas hay trampas como
"Memoria cif incorrecto.pdf" o "+datos promotor y autorizacion falta el cif.pdf",
que no son la tarjeta. Esas se listan para mirarlas.

Convencion, la que ya existe (20261002240000_almacen_tarjeta_cif.sql):
  almacen 'tarjeta-cif', privado, ruta <comunidad_id>/<uuid>.<extension>

Uso:
    python scripts/subir_tarjetas_cif.py             <- marcha en seco
    python scripts/subir_tarjetas_cif.py --escribir
"""
import io
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402

DROPBOX = r"C:\accesalia Dropbox\D SM\Ascensores y rehabilitaciones"
ALMACEN = "tarjeta-cif"
TIPOS = {".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
         ".png": "image/png", ".bmp": "image/bmp", ".tif": "image/tiff",
         ".tiff": "image/tiff", ".heic": "image/heic", ".gif": "image/gif"}


def main():
    escribir = "--escribir" in sys.argv
    b = arrancar()
    print("\n*** %s ***\n" % ("SUBIENDO" if escribir else "MARCHA EN SECO"))

    filas = b.leer("documentos?select=id,comunidad_id,origen_ruta_dropbox,backend,storage_ref"
                   "&backend=eq.dropbox&origen_ruta_dropbox=not.is.null", por_tramos=True)
    pendientes, no_estan, pesados = [], [], 0
    total = 0
    for d in filas:
        ruta = os.path.join(DROPBOX, (d["origen_ruta_dropbox"] or "").replace("/", os.sep))
        if not os.path.isfile(ruta):
            no_estan.append(d["origen_ruta_dropbox"])
            continue
        t = os.path.getsize(ruta)
        total += t
        if t > 20 * 1024 * 1024:
            pesados += 1
        pendientes.append((d, ruta, t))

    print("   filas con backend=dropbox : %d" % len(filas))
    print("   el fichero existe         : %d  (%.1f MB en total)" % (len(pendientes), total / 1024 / 1024))
    print("   NO se encuentra el fichero: %d" % len(no_estan))
    for r in no_estan[:5]:
        print("      %s" % r[-70:])
    if pesados:
        print("   de mas de 20 MB           : %d" % pesados)

    if not escribir:
        print("\n   (marcha en seco. Para hacerlo: --escribir)\n")
        return

    print("\n--- subiendo ---")
    bien, mal = 0, []
    for d, ruta, _ in pendientes:
        ext = os.path.splitext(ruta)[1].lower()
        destino = "%s/%s%s" % (d["comunidad_id"], uuid.uuid4(), ext)
        try:
            with io.open(ruta, "rb") as fh:
                datos = fh.read()
            b.subir(ALMACEN, destino, datos, tipo=TIPOS.get(ext, "application/octet-stream"))
            b.actualizar("documentos?id=eq." + d["id"],
                         {"storage_ref": destino, "backend": "supabase"})
            bien += 1
        except Exception as e:
            mal.append((os.path.basename(ruta), str(e)[:90]))
    print("   subidas: %d" % bien)
    for f, e in mal[:6]:
        print("   FALLO %-40s %s" % (f[:40], e))

    q = b.leer("documentos?select=backend,storage_ref", por_tramos=True)
    print("\n   documentos con el fichero dentro: %d de %d"
          % (len([x for x in q if x["backend"] == "supabase"]), len(q)))


if __name__ == "__main__":
    main()
