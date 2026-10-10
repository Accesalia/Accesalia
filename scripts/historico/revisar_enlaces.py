# -*- coding: utf-8 -*-
"""
REVISAR LOS ENLACES DE datos_proyecto CON SU OPORTUNIDAD (10-oct-2026)

El primer volcado se fio de la referencia catastral de la hoja, y la hoja SE
COPIA de una obra a otra sin cambiarla: la plantilla de 2026
("DATOS del Proyecto_XXXXXXX.xlsx") trae la de la obra de ejemplo, y ocho
obras distintas acabaron en CAR-2026-001. Lo unico que no se copia es la
CARPETA de la direccion ("camarena200", "gallegos12"). Asi que LA CARPETA
MANDA:

  1. La carpeta de la direccion es la primera de la ruta en minusculas
     (las de municipio van en MAYUSCULAS: MADRID\\1APROVINCIA\\GETAFE\\magdalena3).
  2. Si la direccion de la hoja no es la de su carpeta, la hoja esta copiada:
     su referencia catastral no vale y queda un aviso.
  3. Un enlace por referencia catastral solo vale si la oportunidad es la de la
     carpeta. Si no, se busca por la carpeta: el nombre de la oportunidad
     ("MAGDALENA 3 GETAFE") o la carpeta que guardan las que vienen de la clon
     ("magdalena3 (GETAFE)").
  4. Las copias de la hoja en carpetas de fin de obra, trabajo, subvencion o
     consulta urbanistica se quitan cuando la obra ya tiene su hoja principal.

Uso:
  python scripts/historico/revisar_enlaces.py             # en seco: que cambiaria
  python scripts/historico/revisar_enlaces.py --escribir
"""
import collections
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402
from leer_datos_proyecto import campo, llano  # noqa: E402

VIA = r"^(AVENIDA|AVDA|AV|CALLE|CL|C|PLAZA|PZA|PZ|PASEO|PS|PSO|CARRETERA|CTRA|CAMINO|CM|TRAVESIA|TRV|RONDA|RD|GLORIETA|GTA|BULEVAR)\.?\s+"
ARTICULO = r"^(DE LA|DE LOS|DE LAS|DEL|DE|LA|EL|LOS|LAS)\s+"
COPIA = re.compile(r"/(3\.\s*)?OBRAS?/|/TRABAJO/|SUBVENCI|CONSULTA URBAN", re.I)
AVISO_COPIA = "hoja copiada de otra obra: su dirección y referencia catastral no son de esta carpeta"


def compacto(s):
    return re.sub(r"[^A-Z0-9]", "", llano(s or ""))


def sin_via(s):
    s = re.sub(VIA, "", llano(s or ""))
    return re.sub(ARTICULO, "", s)


def carpeta_direccion(ruta):
    """La primera carpeta con minusculas, sin espacios y con un numero: la de
    la direccion ("camarena200"). Las genericas ("_anteriores NO BORRAR",
    "PROYECTO X") no lo son."""
    for p in ruta.replace("\\", "/").split("/")[:-1]:
        if p != p.upper() and " " not in p and not p.startswith("_") and re.search(r"\d", p) and not re.match(r"^\d", p):
            return p
    return ruta.replace("\\", "/").split("/")[-2]


def es_carpeta_de_direccion(p):
    return bool(p) and p != p.upper() and " " not in p and "," not in p and not p.startswith("_") \
        and re.search(r"\d", p) and not re.match(r"^\d", p)


def casa(nombre_opp, carpeta):
    """¿Es esta oportunidad la de esta carpeta? Por una palabra larga de la
    calle y el numero. La carpeta lleva delante el tipo de via
    ("avalbufera250") y el nombre puede ir abreviado ("PASEO DR SEVERO OCHOA 10"
    frente a "paseodoctorseveroochoa10"). Las de la clon se llaman como la
    carpeta ("rioja57")."""
    car = compacto(carpeta)
    nom = llano(nombre_opp or "")
    if not nom:
        return False
    if " " not in nom:
        return compacto(nom) == car
    m = re.match(r"^(.*?)(\d.*)$", sin_via(nom))
    if not m:
        return None  # el nombre no trae numero ("C. MADRID"): no se puede saber
    calle, resto = m.group(1), m.group(2)
    palabras = re.findall(r"[A-Z]{4,}", calle) or [compacto(calle)]
    numeros = re.findall(r"\d+", resto.split("  ")[0])
    ok_calle = any(w in car for w in palabras if w)
    # Con el guion: "faro4-6" lleva el 4 y el 6, no el 46.
    car_num = re.sub(r"[^A-Z0-9-]", "", llano(carpeta))
    ok_num = any(re.search(r"(?<!\d)%s(?!\d)" % n, car_num) for n in numeros)
    return ok_calle and ok_num


def main():
    escribir = "--escribir" in sys.argv
    b = arrancar()
    filas = b.leer("datos_proyecto?select=id,ruta,oportunidad_id,enlace,avisos,hoja")
    opps = b.leer("oportunidades?select=id,codigo,nombre,comunidad_provisional")
    por_id = {o["id"]: o for o in opps}
    nombre = lambda o: o["nombre"] or (o["comunidad_provisional"] or "").split(" (")[0]  # noqa: E731

    # Las oportunidades de cada carpeta: por la carpeta de la clon, o por el nombre.
    def de_carpeta(carpeta):
        car = carpeta.lower()
        exactas = [o for o in opps if (o["comunidad_provisional"] or "").lower().startswith(car + " (")]
        if exactas:
            return exactas
        return [o for o in opps if o["nombre"] and casa(o["nombre"], carpeta)]

    cambios = collections.Counter()
    principal = {}
    for f in filas:
        if not COPIA.search(f["ruta"].replace("\\", "/")):
            principal.setdefault(carpeta_direccion(f["ruta"]).lower(), f["id"])

    for f in filas:
        carpeta = carpeta_direccion(f["ruta"])
        ruta = f["ruta"].replace("\\", "/")
        if COPIA.search(ruta) and carpeta.lower() in principal and principal[carpeta.lower()] != f["id"]:
            cambios["copia quitada"] += 1
            print("✗ copia: %s" % f["ruta"])
            if escribir:
                b.borrar("presupuestos_proyecto?datos_proyecto_id=eq.%s" % f["id"])
                b.borrar("datos_proyecto?id=eq.%s" % f["id"])
            continue

        calle = campo(f["hoja"], "PROY_Dirección_Calle")
        num = campo(f["hoja"], "PROY_Dirección_Nº")
        hoja_buena = bool(calle) and casa("%s %s" % (calle, num or ""), carpeta)
        avisos = [a for a in (f["avisos"] or []) if a != AVISO_COPIA]
        if calle and not hoja_buena:
            avisos.append(AVISO_COPIA)

        actual = por_id.get(f["oportunidad_id"])
        nueva, enlace = None, None
        if not es_carpeta_de_direccion(carpeta):
            # No se sabe de que direccion es la carpeta: no se toca el enlace.
            nueva, enlace = f["oportunidad_id"], f["enlace"]
        elif actual and casa(nombre(actual), carpeta) is not False:
            nueva, enlace = actual["id"], f["enlace"]          # el enlace era bueno
        else:
            cands = de_carpeta(carpeta)
            if len(cands) == 1:
                nueva, enlace = cands[0]["id"], "carpeta %s" % carpeta
            elif len(cands) > 1:
                enlace = "carpeta %s: varias oportunidades (%s)" % (carpeta, ", ".join(sorted(o["codigo"] or "?" for o in cands)))
            else:
                enlace = "carpeta %s: ninguna oportunidad con esa dirección" % carpeta

        if nueva != f["oportunidad_id"]:
            antes = actual["codigo"] if actual else "—"
            despues = por_id[nueva]["codigo"] if nueva else "—"
            cambios["enlace cambiado" if (actual and nueva) else "enlace quitado" if actual else "enlace nuevo"] += 1
            print("%s → %s · %s · %s" % (antes, despues, carpeta, enlace))
        else:
            cambios["sin cambios"] += 1
        if escribir and (nueva != f["oportunidad_id"] or avisos != (f["avisos"] or [])):
            b.actualizar("datos_proyecto?id=eq.%s" % f["id"],
                         {"oportunidad_id": nueva, "enlace": enlace, "avisos": avisos or None})
            b.actualizar("presupuestos_proyecto?datos_proyecto_id=eq.%s" % f["id"], {"oportunidad_id": nueva})
    print("\n" + " · ".join("%s: %d" % kv for kv in cambios.most_common()))


if __name__ == "__main__":
    main()
