# -*- coding: utf-8 -*-
"""
SUBIR EL CATALOGO DE ASCENSORES AL ALMACEN (Monica, 10-oct-2026).

Alex, al elegir el 3D de catalogo en la mesa de viabilidades, "no le basta el
nombre, necesita ver el modelo": una miniatura en la lista y un "ver detalle"
con el modelo. El almacen `catalogo-venta` se preparo en julio y nunca se lleno.

Por tipo (AT1..AT16), en catalogo-venta/{codigo}/:
  thumb.webp          recorte de la lamina "CATALOGO DE ASCENSORES.png" de Jean
                      (axonometria + plantas: se reconoce la solucion de un vistazo)
  modelo.glb          el .glb que exporto Alex desde SketchUp (24-jul-2026)
  plano.pdf           el plano acotado
  renders/rNN.webp    las imagenes, a 1600 px
Los videos (250-800 MB cada uno) NO se suben: el .glb ya deja ver el modelo.

Solo produccion (scripts/produccion.py aborta si algo apunta a local).
Uso: python scripts/catalogo/subir_catalogo.py
"""
import io
import os
import re
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from produccion import arrancar  # noqa: E402

Image.MAX_IMAGE_PIXELS = None
RAIZ = r"C:\accesalia Dropbox\D SM\Ascensores y rehabilitaciones\_MODELOS DE ASCENSOR PARA PRESENTACIONES"
JEAN = os.path.join(RAIZ, "JEAN", "CATÁLOGO DE ASCENSORES ACCESALIA")
GLB = os.path.join(RAIZ, "ALEX - MODELOS FORMATO GLB")
ALMACEN = "catalogo-venta"

# Las ocho filas de la lamina (dibujo + rotulo), dos tipos por fila: 1-2, 3-4...
FILAS = [(1161, 2985), (3153, 5212), (5428, 7482), (7694, 9341),
         (9565, 11344), (11662, 13648), (14018, 16139), (16314, 18465)]


def numero(nombre):
    m = re.search(r"tipo\s*(\d+)", nombre, re.I)
    return int(m.group(1)) if m else None


def webp(img, lado):
    img = img.convert("RGB")
    img.thumbnail((lado, lado))
    b = io.BytesIO()
    img.save(b, "WEBP", quality=80)
    return b.getvalue()


def miniaturas():
    lamina = Image.open(os.path.join(JEAN, "CATALOGO DE ASCENSORES.png")).convert("RGB")
    w, h = lamina.size
    salida, n = {}, 1
    for y0, y1 in FILAS:
        for x0, x1 in ((0, w // 2), (w // 2, w)):
            t = lamina.crop((x0, max(0, y0 - 60), x1, min(h, y1 + 60)))
            ys, xs = np.where(np.asarray(t.convert("L")) < 235)
            t = t.crop((max(0, xs.min() - 40), max(0, ys.min() - 40),
                        min(t.width, xs.max() + 40), min(t.height, ys.max() + 40)))
            salida[n] = webp(t, 900)
            n += 1
    return salida


def orden_natural(s):
    return [int(x) if x.isdigit() else x for x in re.split(r"(\d+)", s)]


def main():
    base = arrancar()
    modelos = {f["codigo"]: f["id"] for f in base.leer("modelos_escalera?select=id,codigo")}
    glbs = {numero(f): os.path.join(GLB, f) for f in os.listdir(GLB) if f.lower().endswith(".glb")}
    carpetas = {numero(d): os.path.join(JEAN, d) for d in os.listdir(JEAN)
                if os.path.isdir(os.path.join(JEAN, d)) and numero(d)}
    thumbs = miniaturas()

    for n in range(1, 17):
        codigo = "AT%d" % n
        if codigo not in modelos:
            print("%s: no esta en modelos_escalera, se salta" % codigo)
            continue
        base.subir(ALMACEN, codigo + "/thumb.webp", thumbs[n], "image/webp", reemplazar=True)

        with open(glbs[n], "rb") as fh:
            base.subir(ALMACEN, codigo + "/modelo.glb", fh.read(), "model/gltf-binary", reemplazar=True)

        planos = [f for f in os.listdir(os.path.join(carpetas[n], "PLANOS")) if f.lower().endswith(".pdf")]
        if planos:
            with open(os.path.join(carpetas[n], "PLANOS", planos[0]), "rb") as fh:
                base.subir(ALMACEN, codigo + "/plano.pdf", fh.read(), "application/pdf", reemplazar=True)

        dir_img = os.path.join(carpetas[n], "IMAGENES")
        imagenes = sorted((f for f in os.listdir(dir_img) if f.lower().endswith(".png")), key=orden_natural)
        for i, f in enumerate(imagenes, 1):
            datos = webp(Image.open(os.path.join(dir_img, f)), 1600)
            base.subir(ALMACEN, "%s/renders/r%02d.webp" % (codigo, i), datos, "image/webp", reemplazar=True)

        base.actualizar("modelos_escalera?id=eq." + modelos[codigo],
                        {"tiene_plano": bool(planos), "n_renders": len(imagenes)})
        print("%s: miniatura, %s, %s, %d imagenes" % (
            codigo, os.path.basename(glbs[n]), planos[0] if planos else "SIN PLANO", len(imagenes)))
        sys.stdout.flush()


if __name__ == "__main__":
    main()
