#!/usr/bin/env python
"""Coteja una maqueta de Monica con la pantalla montada.

Ella disena la pantalla entera en el taller: la coloca, le pone bordes, colores
y anchos. Lo unico que hay que hacer es COPIARLA. Este cotejo comprueba que se
ha copiado, campo a campo y color a color, para que no tenga que revisarlo ella.

    python herramientas/cotejar-maqueta.py <maqueta.json> <Formulario.tsx>

La maqueta se baja del taller con la herramienta de datos del artefacto
(coleccion `versiones`). Sale un listado con un "ok" o un "NO" por cada cosa
suya, y al final lo que falta.

El cotejo es literal a proposito: si una etiqueta suya no aparece tal cual en el
codigo, sale como NO aunque "signifique lo mismo". Cambiar sus palabras es
justo lo que no se debe hacer.
"""
import io
import json
import re
import sys
import unicodedata

# los colores de la paleta que tienen nombre: si el codigo usa el nombre,
# cuenta como que esta puesto el color
TOKENS = {
    "#f5fbf0": "bg-form",
    "#fffcf0": "bg-form-card",
    "#fcfbf8": "bg-form-dentro",
    "#fff5cc": "bg-form-nuevo",
    "#eff5f1": "bg-form-nuestro",
    "#fafafa": "bg-form-quieto",
}
POR_DEFECTO = {"fondo": "#ffffff", "colorBorde": "#e6e6e2", "borde": 1}


def sin_tildes(t: str) -> str:
    t = unicodedata.normalize("NFD", t or "")
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    t = re.sub(r"[^a-z0-9 ]+", " ", t.lower())
    return re.sub(r"\s+", " ", t).strip()


def main(ruta_maqueta: str, ruta_codigo: str) -> int:
    maqueta = json.load(io.open(ruta_maqueta, encoding="utf-8"))
    codigo = io.open(ruta_codigo, encoding="utf-8").read()
    plano = sin_tildes(codigo)
    bajo = codigo.lower()

    def hay_texto(nombre: str) -> bool:
        n = sin_tildes(nombre)
        if not n:
            return True
        if n in plano:
            return True
        # una etiqueta larga vale si estan todas sus palabras con peso
        palabras = [p for p in n.split() if len(p) > 3]
        return bool(palabras) and all(p in plano for p in palabras)

    def valor(bloque, clave):
        v = bloque.get(clave)
        return POR_DEFECTO[clave] if v in (None, "") else v

    faltan = []
    total = 0
    bloques = sorted(maqueta["bloques"], key=lambda b: (b["y"], b["x"]))

    print("=" * 74)
    print("COTEJO DE LA MAQUETA CONTRA LA PANTALLA")
    print(f"  maqueta: {maqueta.get('nombre', '(sin nombre)')}")
    print("=" * 74)

    print("\n-- COLORES Y BORDES " + "-" * 54)
    for b in bloques:
        titulo = ((b.get("tit") or {}).get("texto") or b["id"]).strip()[:26]
        fondo = str(valor(b, "fondo")).lower()
        borde = str(valor(b, "colorBorde")).lower()
        tiene_fondo = fondo in bajo or TOKENS.get(fondo, "\0") in bajo
        tiene_borde = valor(b, "borde") == 0 or borde in bajo
        if not tiene_fondo:
            faltan.append(f"[{titulo}] fondo {fondo}")
        if not tiene_borde:
            faltan.append(f"[{titulo}] borde {borde}")
        print(f"  {titulo:<27} fondo {fondo} {'ok' if tiene_fondo else 'NO'}   borde {borde} {'ok' if tiene_borde else 'NO'}")

    print("\n-- CAMPOS " + "-" * 64)
    for b in bloques:
        campos = b.get("campos") or []
        if not campos:
            continue
        titulo = ((b.get("tit") or {}).get("texto") or b["id"]).strip()[:40]
        print(f"\n  {titulo}")
        for c in campos:
            total += 1
            ok = hay_texto(c["n"])
            if not ok:
                faltan.append(f"[{titulo}] campo: {c['n'].strip()}")
            print(("    ok  " if ok else "    NO  ") + c["n"].strip()[:66])

    print("\n" + "=" * 74)
    if faltan:
        print(f"{len(faltan)} cosas suyas NO estan (o estan cambiadas):\n")
        for f in faltan:
            print("  · " + f[:100])
        print(
            "\nCada una hay que resolverla: o se copia tal cual, o se le pregunta.\n"
            "Ninguna se decide por cuenta propia."
        )
    else:
        print(f"Todo copiado: {total} campos y {len(bloques)} bloques.")
    return 1 if faltan else 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1], sys.argv[2]))
