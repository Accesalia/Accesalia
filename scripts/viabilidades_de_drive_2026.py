# -*- coding: utf-8 -*-
r"""
LOS INFORMES DE VIABILIDAD DE LAS OPPS DE 2026, SACADOS DEL DRIVE  (Monica, 26-oct-2026)

    "vamos con las viabilidades de esas opps, y las subimos a su sitio en la app"
    "todos se enviaron por correo, eso seguro, pero se guardan en alguna carpeta"

Estan en la carpeta compartida de Drive "HOJAS ENCARGO AUTOMATICAS", sincronizada
en este ordenador en G:\Mi unidad\MONICA ACCESALIA\PRESUPUESTOS\. El nombre del
fichero lleva la direccion y casi siempre la fecha:
    "CAMARENA 304 MADRID 22-07-2026 INFORME DE VIABILIDAD F .pdf"

Se cotejan los PDF con "VIABILIDAD" en el nombre contra los ACCESOS de las opps
de 2026 por CONJUNTO DE PALABRAS (memoria cotejo-por-conjunto-de-palabras): todas
las palabras de la calle y el numero tienen que estar en el nombre del fichero;
si empatan, desempata el municipio.

Se amplio a TODAS las opps, de cualquier año ("ya que los hemos encontrado, lo
hacemos todo").

EN SECO por defecto: deja docs/viabilidades_de_drive_2026.xlsx para revisar.
Con --escribir sube, COMO HISTORICAS (viabilidades.ruta_drive), solo:
  - los informes que casan con UNA sola opp (los que casan con varias, no);
  - en opps que aun no tienen viabilidad en la app;
  - sin las copias ("Copia de ...") y, de la misma opp y fecha, solo la "F"
    (la final) si la hay.
El PDF va a documentos-comerciales/viabilidades/<id>/, como los de la app, y la
fecha (rematada_en, enviada_en, creado_en) es la del nombre o, si no la trae, la
del fichero. Se crea ya enviada: no pasa por la mesa de Alex ni salta la nota de
Sali (esa salta al CAMBIAR enviada_en, no al crear).
"""
import json
import urllib.error
import urllib.parse
import urllib.request
import uuid
import collections
import datetime
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402

CARPETA = r"G:\Mi unidad\MONICA ACCESALIA\PRESUPUESTOS\HOJAS ENCARGO AUTOMATICAS"
SALIDA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                      "docs", "viabilidades_de_drive_2026.xlsx")

VACIAS = {"DE", "DEL", "LA", "LAS", "LOS", "EL", "Y", "E", "A"}
TIPOS = {"CALLE", "CL", "C", "AV", "AVDA", "AVENIDA", "PASEO", "PS", "PZ", "PLAZA", "PZA",
         "CAMINO", "CM", "RONDA", "TRAVESIA", "GLORIETA", "CARRETERA", "CTRA", "PASAJE", "URB"}
RUIDO = {"INFORME", "NFORME", "ESTUDIO", "VIABILIDAD", "F", "PLANTILLA", "COPIA", "PDF"}


def normal(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().upper()
    return re.sub(r"[^A-Z0-9]+", " ", s).strip()


def fecha_del_nombre(n):
    m = re.search(r"(\d{1,2})[-_. ](\d{1,2})[-_. ](\d{4}|\d{2})(?!\d)", n)
    if not m:
        return None
    d, mes, a = int(m.group(1)), int(m.group(2)), int(m.group(3))
    a = a + 2000 if a < 100 else a
    try:
        return datetime.date(a, mes, d)
    except ValueError:
        return None


def palabras_calle(nombre_via):
    p = normal(nombre_via).split()
    while p and p[0] in TIPOS:
        p = p[1:]
    return [x for x in p if x not in VACIAS]


ALMACEN = "documentos-comerciales"


def es_final(f):
    return "F" in normal(os.path.splitext(f)[0]).split()


def limpio(nombre):
    base, ext = os.path.splitext(nombre)
    base = unicodedata.normalize("NFKD", base).encode("ascii", "ignore").decode()
    base = re.sub(r"[^A-Za-z0-9._-]+", "-", base).strip("-") or "informe"
    return base[:90] + ext.lower()


def peticion(base, metodo, camino, datos=None, tipo="application/json", extra=None):
    cab = dict(base.cab)
    cab["Content-Type"] = tipo
    cab.update(extra or {})
    r = urllib.request.Request(base.url + camino, data=datos, headers=cab, method=metodo)
    try:
        with urllib.request.urlopen(r, timeout=300) as x:
            return x.read().decode("utf-8") or "null"
    except urllib.error.HTTPError as e:
        raise RuntimeError("%s %s: %s %s" % (metodo, camino[:80], e.code, e.read().decode("utf-8", "replace")[:300]))


def subir(base, elegidos):
    """elegidos: [(fichero, fecha, opp)]."""
    ya = {r["ruta_drive"] for r in base.leer("viabilidades?select=ruta_drive&ruta_drive=not.is.null")}
    hechos, fallos = 0, []
    for f, fecha, o in elegidos:
        if f in ya:
            continue
        vid = str(uuid.uuid4())
        ruta = "viabilidades/%s/%s" % (vid, limpio(f))
        cuando = datetime.datetime.combine(fecha, datetime.time(12, 0)).astimezone().isoformat()
        try:
            with open(os.path.join(CARPETA, f), "rb") as x:
                peticion(base, "POST", "/storage/v1/object/%s/%s" % (ALMACEN, urllib.parse.quote(ruta)),
                         x.read(), "application/pdf")
            peticion(base, "POST", "/rest/v1/viabilidades", json.dumps({
                "id": vid, "oportunidad_id": o["id"], "url_pdf": "almacen:%s/%s" % (ALMACEN, ruta),
                "ruta_drive": f, "creado_en": cuando, "rematada_en": cuando, "enviada_en": cuando,
            }).encode("utf-8"), extra={"Prefer": "return=minimal"})
            hechos += 1
            print("ok  %s -> %s" % (f, o["nombre"]), flush=True)
        except Exception as e:  # noqa: BLE001
            fallos.append((f, str(e)))
            print("MAL %s -> %s" % (f, e), flush=True)
    print("subidas:", hechos, " fallos:", len(fallos))


def main():
    base = arrancar()
    # Todas las opps, no solo las de 2026 (Monica, 26-oct: "ya que los hemos
    # encontrado, lo hacemos todo")
    opps = base.leer("oportunidades?select=id,codigo,nombre,fecha_apertura&anulada_en=is.null")
    rel = base.leer("relacion_oportunidad_accesos?select=opp_id,acceso_id&hasta=is.null")
    acc = {a["id"]: a for a in base.leer("accesos?select=id,municipio,nombre_via,numero")}
    viab = {v["oportunidad_id"] for v in base.leer("viabilidades?select=oportunidad_id")}
    poly = set()
    for r in base.leer("relacion_polycam_acceso?select=acceso_id"):
        poly.add(r["acceso_id"])
    oppd = {o["id"]: o for o in opps}
    de_opp = collections.defaultdict(list)
    for r in rel:
        if r["acceso_id"] in acc and r["opp_id"] in oppd:
            de_opp[r["opp_id"]].append(acc[r["acceso_id"]])

    ficheros = sorted(f for f in os.listdir(CARPETA)
                      if "VIABILIDAD" in normal(f) and f.lower().endswith(".pdf"))
    filas = []
    for f in ficheros:
        sin_ext = os.path.splitext(f)[0]
        # fuera la fecha (si no, "8-10-2026" casa con el portal 8) y separar
        # lo pegado ("Sepulveda160")
        limpio = re.sub(r"\d{1,2}[-_. ]\d{1,2}[-_. ](\d{4}|\d{2})(?!\d)", " ", sin_ext)
        limpio = re.sub(r"(?<=[A-Za-z])(?=\d)|(?<=\d)(?=[A-Za-z]{2})", " ", limpio)
        lista = [t for t in normal(limpio).split() if t not in RUIDO]
        toks = set(lista)
        cand = []
        for oid, accs in de_opp.items():
            for a in accs:
                calle = palabras_calle(a["nombre_via"])
                num = normal(a["numero"]).split()
                if not calle or not num:
                    continue
                # la calle va DELANTE de su numero: "2-POLVORANCA 8 LEGANES" no es
                # "Leganes 8" (regla 3 del cotejo)
                if all(c in toks for c in calle) and num[0] in toks and any(
                        lista[i] == num[0] and calle[-1] in lista[:i] for i in range(len(lista))):
                    mun = [x for x in normal(a["municipio"]).split() if x not in VACIAS]
                    cand.append((oid, len(calle), bool(mun) and all(x in toks for x in mun)))
                    break
        if len({c[0] for c in cand}) > 1:      # desempate: municipio, luego la mas especifica
            con_mun = [c for c in cand if c[2]]
            if con_mun:
                cand = con_mun
            largo = max(c[1] for c in cand)
            cand = [c for c in cand if c[1] == largo]
        ids = sorted({c[0] for c in cand})
        fecha = fecha_del_nombre(sin_ext)
        if not ids:
            filas.append((f, fecha, None, "sin opp"))
        for oid in ids:
            o = oppd[oid]
            que = "una opp" if len(ids) == 1 else "VARIAS opps (%d)" % len(ids)
            filas.append((f, fecha, o, que))

    # por opp: cuantos informes y cual es el ultimo
    por_opp = collections.defaultdict(list)
    for f, fecha, o, que in filas:
        if o:
            por_opp[o["id"]].append((fecha or datetime.date(1900, 1, 1), f))

    from openpyxl import Workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Informes"
    ws.append(["fichero", "fecha del nombre", "opp", "apertura opp", "como casa",
               "tiene polycam", "ya tiene viabilidad en la app", "informes de esa opp", "es el ultimo"])
    c = collections.Counter()
    for f, fecha, o, que in filas:
        if o:
            accs = de_opp[o["id"]]
            ultimo = max(por_opp[o["id"]])[1] == f
            ws.append([f, fecha, o["nombre"], o["fecha_apertura"], que,
                       "si" if any(a["id"] in poly for a in accs) else "",
                       "si" if o["id"] in viab else "", len(por_opp[o["id"]]), "si" if ultimo else ""])
        else:
            ws.append([f, fecha, None, None, que])
        c[que if not que.startswith("VARIAS") else "varias"] += 1
    # LO QUE SE SUBE
    unicos = collections.Counter(f for f, fecha, o, que in filas if o)
    por = collections.defaultdict(list)
    for f, fecha, o, que in filas:
        if o and unicos[f] == 1 and o["id"] not in viab and not normal(f).startswith("COPIA DE"):
            if not fecha:
                fecha = datetime.date.fromtimestamp(os.path.getmtime(os.path.join(CARPETA, f)))
            por[(o["id"], fecha)].append((f, fecha, o))
    elegidos = []
    for grupo in por.values():
        finales = [g for g in grupo if es_final(g[0])]
        elegidos += finales or grupo
    ws2 = wb.create_sheet("Se suben")
    ws2.append(["fichero", "fecha", "opp"])
    for f, fecha, o in sorted(elegidos, key=lambda x: x[2]["nombre"] or ""):
        ws2.append([f, fecha, o["nombre"]])
    wb.save(SALIDA)
    print("pdf:", len(ficheros), dict(c))
    print("se suben:", len(elegidos), "informes en", len({o["id"] for _, _, o in elegidos}), "opps")
    if "--escribir" in sys.argv:
        subir(base, elegidos)
    print("opps de 2026 con informe:", len(por_opp),
          " de ellas con polycam:", sum(1 for oid in por_opp if any(a["id"] in poly for a in de_opp[oid])))
    print("->", SALIDA)


if __name__ == "__main__":
    main()
