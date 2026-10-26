# -*- coding: utf-8 -*-
r"""
LOS POLYCAM DE LAS OPPS DE 2026, SACADOS DE SU CARPETA DE DROPBOX  (Monica, 26-oct-2026)

    "Vamos a coger todas las oportunidades creadas en 2026. Vamos a entrar en
     Dropbox, en su carpeta, y a buscar el archivo del Polycam. Y cuando lo haya,
     lo vamos a dejar puesto en su parte correspondiente ... para que la parte
     que dice falta Polycam en los pasos ya no salga."

Opps de 2026 = fecha_apertura >= 2026-01-01, no anuladas, con dropbox_carpeta.
Se busca DENTRO de su carpeta, en el Dropbox sincronizado de este ordenador,
los ficheros de escaneo (.glb, y .zip/.usdz/.obj si salen en una carpeta 3D).
Las copias en conflicto de Dropbox no cuentan.

EN SECO por defecto: deja docs/polycam_de_dropbox_2026.xlsx para revisar.
Con --escribir (con su ok, 26-oct-2026) los sube COMO HISTORICOS:
  - el fichero al almacen del Polycam, en <id>/<nombre>, como el buzon;
  - su fila en escaneados_polycam con ruta_dropbox (la marca de historico: no
    va a la mesa de Alex) y la fecha del fichero en Dropbox como fecha y
    fecha_escaneo ("no es exacta, pero da mes y año");
  - colgado de TODOS los accesos de su opp.
Un mismo fichero es una sola fila aunque lo compartan dos opps. Si se vuelve a
lanzar, lo ya subido (misma ruta_dropbox) se salta.

    python scripts/polycam_de_dropbox_2026.py             # en seco
    python scripts/polycam_de_dropbox_2026.py --escribir  # lo sube
"""
import datetime
import json
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import collections
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402

DROPBOX = r"C:\accesalia Dropbox\D SM\Ascensores y rehabilitaciones"
SALIDA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                      "docs", "polycam_de_dropbox_2026.xlsx")

GLB = (".glb",)
OTROS = (".zip", ".usdz", ".obj", ".gltf", ".ply")


def es_conflicto(f):
    return "conflicted copy" in f.lower() or "copia en conflicto" in f.lower()


def escaneos(carpeta):
    """Los ficheros de escaneo de la carpeta, con su ruta relativa a DROPBOX."""
    raiz = os.path.join(DROPBOX, carpeta.replace("/", os.sep))
    if not os.path.isdir(raiz):
        return None
    hay = []
    for base, _, fich in os.walk(raiz):
        en3d = bool(re.search(r"3d|polycam|glb", base, re.I))
        for f in fich:
            if es_conflicto(f):
                continue
            ext = os.path.splitext(f)[1].lower()
            # Un zip en 6.3D no siempre es un escaneo: las fotos y los planos
            # recibidos (Ferial 25) y el 3D de la propuesta (Mendivil 64) no lo son.
            ajeno = re.search(r"foto|plano|propuesta|render|transfer", os.path.join(base, f), re.I)
            if ext in GLB or (ext in OTROS and not ajeno and (en3d or "polycam" in f.lower())):
                ruta = os.path.join(base, f)
                hay.append((os.path.relpath(ruta, DROPBOX).replace(os.sep, "/"),
                            os.path.getsize(ruta)))
    return hay


MOTIVO = "Traído de su carpeta de Dropbox (histórico, 26-oct-2026)"
ALMACEN = "almacen-polycam-y-fotos"


def limpio(nombre):
    """Nombre sin tildes ni rarezas, para la ruta del almacen."""
    base, ext = os.path.splitext(nombre)
    base = unicodedata.normalize("NFKD", base).encode("ascii", "ignore").decode()
    base = re.sub(r"[^A-Za-z0-9._-]+", "-", base).strip("-") or "escaneo"
    return base[:80] + ext.lower()


def peticion(base, metodo, camino, datos=None, tipo="application/json", extra=None):
    cab = dict(base.cab)
    cab["Content-Type"] = tipo
    cab.update(extra or {})
    r = urllib.request.Request(base.url + camino, data=datos, headers=cab, method=metodo)
    try:
        with urllib.request.urlopen(r, timeout=900) as x:
            return x.read().decode("utf-8") or "null"
    except urllib.error.HTTPError as e:
        raise RuntimeError("%s %s: %s %s" % (metodo, camino[:80], e.code, e.read().decode("utf-8", "replace")[:300]))


def subir(base, ficheros):
    """ficheros: {ruta_dropbox: set(acceso_id)}."""
    ya = {r["ruta_dropbox"] for r in base.leer("escaneados_polycam?select=ruta_dropbox&ruta_dropbox=not.is.null")}
    hechos, fallos = 0, []
    for ruta, accs in sorted(ficheros.items()):
        if ruta in ya:
            continue
        local = os.path.join(DROPBOX, ruta.replace("/", os.sep))
        nombre = os.path.basename(ruta)
        cuando = datetime.datetime.fromtimestamp(os.path.getmtime(local)).astimezone()
        fila = None
        try:
            fila = json.loads(peticion(base, "POST", "/rest/v1/escaneados_polycam", json.dumps({
                "nombre_original_fichero": nombre,
                "fecha": cuando.isoformat(),
                "fecha_escaneo": cuando.date().isoformat(),
                "ruta_dropbox": ruta,
            }).encode("utf-8"), extra={"Prefer": "return=representation"}))[0]
            destino = "%s/%s" % (fila["id"], limpio(nombre))
            with open(local, "rb") as f:
                tipo = "model/gltf-binary" if nombre.lower().endswith(".glb") else "application/zip"
                peticion(base, "POST", "/storage/v1/object/%s/%s" % (ALMACEN, urllib.parse.quote(destino)), f.read(), tipo)
            peticion(base, "PATCH", "/rest/v1/escaneados_polycam?id=eq." + fila["id"],
                     json.dumps({"polycam": destino}).encode("utf-8"), extra={"Prefer": "return=minimal"})
            peticion(base, "POST", "/rest/v1/relacion_polycam_acceso?on_conflict=polycam_id,acceso_id",
                     json.dumps([{"polycam_id": fila["id"], "acceso_id": a, "automatico": True, "motivo": MOTIVO}
                                 for a in sorted(accs)]).encode("utf-8"),
                     extra={"Prefer": "return=minimal,resolution=ignore-duplicates"})
            hechos += 1
            print("ok  %s" % ruta, flush=True)
        except Exception as e:  # noqa: BLE001
            fallos.append((ruta, str(e)))
            print("MAL %s -> %s" % (ruta, e), flush=True)
            # que no quede una fila a medias: sin fichero o sin accesos
            if fila:
                try:
                    peticion(base, "DELETE", "/rest/v1/relacion_polycam_acceso?polycam_id=eq." + fila["id"])
                    peticion(base, "DELETE", "/rest/v1/escaneados_polycam?id=eq." + fila["id"])
                except Exception as e2:  # noqa: BLE001
                    print("    no se pudo quitar la fila", fila["id"], e2, flush=True)
    print("subidos:", hechos, " fallos:", len(fallos))
    for r, e in fallos:
        print("  ", r, e)


def main():
    base = arrancar()
    opps = base.leer("oportunidades?select=id,codigo,nombre,dropbox_carpeta,fecha_apertura"
                     "&fecha_apertura=gte.2026-01-01&anulada_en=is.null&order=fecha_apertura")
    rel = base.leer("relacion_oportunidad_accesos?select=opp_id,acceso_id&hasta=is.null")
    # "ya tenia Polycam" = por el buzon; los historicos de esta misma tanda no cuentan
    rpa = base.leer("relacion_polycam_acceso?select=acceso_id,motivo")
    con_poly = {r["acceso_id"] for r in rpa if r.get("motivo") != MOTIVO}
    accesos = collections.defaultdict(list)
    for r in rel:
        accesos[r["opp_id"]].append(r["acceso_id"])

    filas, cuenta = [], collections.Counter()
    for o in opps:
        ya = any(a in con_poly for a in accesos[o["id"]])
        if not o.get("dropbox_carpeta"):
            cuenta["sin carpeta"] += 1
            filas.append((o, "sin carpeta", "", 0, ya))
            continue
        hay = escaneos(o["dropbox_carpeta"])
        if hay is None:
            cuenta["carpeta no existe en local"] += 1
            filas.append((o, "carpeta no existe en local", "", 0, ya))
        elif not hay:
            cuenta["sin escaneo en la carpeta"] += 1
            filas.append((o, "sin escaneo en la carpeta", "", 0, ya))
        else:
            cuenta["con escaneo"] += 1
            for ruta, tam in hay:
                filas.append((o, "con escaneo", ruta, tam, ya))
    for k, v in cuenta.items():
        print("%-30s %d" % (k, v))
    print("ficheros:", sum(1 for f in filas if f[2]))

    from openpyxl import Workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Polycam 2026"
    ws.append(["codigo", "opp", "apertura", "que hay", "ya tenia polycam", "fichero", "MB", "carpeta"])
    for o, que, ruta, tam, ya in filas:
        ws.append([o.get("codigo"), o.get("nombre"), o.get("fecha_apertura"), que,
                   "si" if ya else "", ruta, round(tam / 1e6, 1) if tam else None,
                   o.get("dropbox_carpeta")])
    wb.save(SALIDA)
    print("->", SALIDA)

    if "--escribir" in sys.argv:
        ficheros = collections.defaultdict(set)
        for o, que, ruta, tam, ya in filas:
            if ruta and not ya:
                ficheros[ruta].update(accesos[o["id"]])
        sin_accesos = [r for r, a in ficheros.items() if not a]
        for r in sin_accesos:
            print("SIN ACCESOS, no se sube:", r)
            del ficheros[r]
        subir(base, ficheros)


if __name__ == "__main__":
    main()
