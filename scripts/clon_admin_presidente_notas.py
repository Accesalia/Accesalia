# -*- coding: utf-8 -*-
"""
RELLENAR LA TABLA-CLON: ADMINISTRADOR, PRESIDENTE Y NOTAS   (Monica, 4-oct-2026)

La clon tiene las 247 carpetas de Dropbox que no estaban en Monday y que aun no
tienen oportunidad. De sus fichas de datos salen tres cosas, y de las 247:
administrador en 103, presidente en 45 y NOTAS EN 182. Las notas son el objetivo
de toda esta pasada: "la info que viene en notas es en muchos casos lo
verdaderamente interesante".

PRESIDENTE Y NOTAS se copian tal cual: no hay nada que resolver.

DEL PRESIDENTE SOLO VA EL NOMBRE, y es decision de ella (4-oct-2026): "el
presidente es una persona, y a veces en la ficha vienen sus datos. No es que me
interese, porque son opps cerradas; el admin SI me interesa como fuente de futuro
trabajo, es totalmente distinto. (...) No merece la pena, creo yo."

Asi que el nombre va a un campo de texto -gratis, y sirve para reconocer el
expediente si aparece un papel- y el DNI que trae la ficha NO SE GUARDA: es un
dato personal de alguien de un expediente cerrado con el que no vamos a trabajar.
Montarle persona y puesto se paga donde va a haber trabajo, no aqui.

EL ADMINISTRADOR SI HAY QUE RESOLVERLO contra la lista limpia, y su regla manda:
"si son nuevos, los reviso yo y me los miro a mano, porque si no, nuestra lista
limpia de administradores se va a perder". Asi que aqui solo se vincula lo que se
puede demostrar, por una de estas cuatro vias, y SE GUARDA POR CUAL:

  1. resolucion   - ella ya lo resolvio a mano en resoluciones_administradores.csv
  2. exacto       - el nombre de la ficha es el nombre (comercial o legal) de una
  3. telefono     - MISMO FIJO = MISMA EMPRESA. Es su regla, literal: "cuando
                    tengo dudas, confirmo por el telefono FIJO publicado". Solo
                    fijos: con moviles dentro, un 687 mandaba media lista a la
                    misma empresa.
  4. prefijo      - "IGM" -> "IGM SERVICIOS JURIDICOS", y solo si hay UNA
                    candidata. Con dos o mas, no se elige: se le pasa a ella.

Lo que no entra por ninguna de las cuatro NO SE INVENTA: se queda vacio y sale
en 'clon_admin_sin_resolver.csv' con su contacto, telefono y correo, para que lo
mire. Es el mismo trato que la vez anterior, y funciono.

Uso:
    python scripts/clon_admin_presidente_notas.py            <- marcha en seco
    python scripts/clon_admin_presidente_notas.py --escribir
"""
import csv
import io
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402

MUNICIPIOS = ("ALCORCON", "ALCOBENDAS", "FUENLABRADA")
SIN_RESOLVER = "clon_admin_sin_resolver.csv"

# Lo que parece un administrador pero no lo es: son frases de nota. Si entraran
# como nombre de empresa, crearian basura en la lista limpia.
NO_ES_UN_ADMINISTRADOR = re.compile(
    r"^(contacto|a traves|atraves|a trav|pedido|no se|sin datos|ninguno|no hay|no tienen|"
    r"propietario|desconocid)", re.I)

# EL DIARIO PEGADO AL NOMBRE. Las fichas traen cosas como
# "LORMAN (pedidos docs el 13/06/2022)" o "ONIX ABOGADOS (SEPT 2022)": el nombre
# de la empresa y, entre parentesis, una anotacion de cuando se le pidio algo. Ya
# nos mordio antes con "Torres & Asociados Pedidos docs a novillo". Se corta.
DIARIO_PEGADO = re.compile(r"\s*[\(\[].*$|\s*-\s*pedid.*$", re.I | re.S)

# PALABRAS QUE NO DISTINGUEN A NADIE. Media lista se llama "administracion de
# fincas algo": si cuentan, todas se parecen a todas. Se descuentan para comparar,
# igual que en el cotejo de direcciones se descuenta el tipo de via.
GENERICAS = {
    "administracion", "administraciones", "administrador", "administradores",
    "adm", "admon", "admin", "fincas", "finca", "abogados", "abogada", "asesores",
    "asesoria", "asesoramiento", "gestion", "gestores", "servicios", "servicio",
    "juridicos", "juridica", "consulting", "consultores", "inmuebles", "grupo",
    "sl", "slu", "slp", "sa", "scp", "cb", "sociedad", "de", "del", "y", "e",
    "la", "el", "los", "las",
}


def palabras(s):
    """Las palabras que DISTINGUEN, sin acentos y sin las genericas."""
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = s.replace("&", " y ")
    trozos = [t for t in re.split(r"[^a-z0-9]+", s) if t]
    return {t for t in trozos if t not in GENERICAS}


def pelado(s):
    """Sin acentos, sin puntuacion, en minusculas. 'LIZÁN  S.L.U.' -> 'lizanslu'."""
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c)).replace("&", "y")
    return "".join(c for c in s.lower() if c.isalnum())


def un_fijo(t):
    """Solo fijos espanoles (empiezan por 8 o 9). Los moviles no identifican
       empresa: son de la persona y se la lleva al cambiar de trabajo."""
    for n in re.findall(r"\d{9}", re.sub(r"[^\d]", " ", t or "")):
        if n[0] in "89":
            return n
    return None


def main():
    escribir = "--escribir" in sys.argv
    b = arrancar()
    print("\n*** %s ***\n" % ("ESCRIBIENDO" if escribir else "MARCHA EN SECO"))

    # ------------------------------------------------------------ las fichas
    fichas = {}
    for m in MUNICIPIOS:
        p = "fichas_%s.csv" % m.lower()
        if not os.path.exists(p):
            print("  !! falta %s" % p)
            continue
        for f in csv.DictReader(io.open(p, encoding="utf-8")):
            fichas[(m, pelado(f["carpeta"]))] = f

    # ------------------------------------------- la lista limpia de empresas
    emp = b.leer("empresa?select=id,nombre_accesalia,nombre_legal,telefono,municipio,direccion",
                 por_tramos=True)
    por_nombre, por_fijo, por_palabras = {}, {}, []
    for e in emp:
        for n in (e["nombre_accesalia"], e["nombre_legal"]):
            if n:
                por_nombre.setdefault(pelado(n), e)
                ps = palabras(n)
                if ps:
                    por_palabras.append((ps, e))
        f = un_fijo(e.get("telefono"))
        if f:
            por_fijo.setdefault(f, e)

    # ------------------------------------ lo que ella resolvio a mano
    resol = {}
    if os.path.exists("resoluciones_administradores.csv"):
        for f in csv.DictReader(io.open("resoluciones_administradores.csv", encoding="utf-8"),
                                delimiter="|"):
            if f.get("nombre_en_la_ficha") and f.get("es"):
                resol[pelado(f["nombre_en_la_ficha"])] = f["es"]

    def resolver(nombre, telefono):
        """Devuelve (empresa, por_que) o (None, motivo de no haberlo resuelto)."""
        if NO_ES_UN_ADMINISTRADOR.match(nombre.strip()):
            return None, "no es un administrador: es una frase de nota"
        nombre = DIARIO_PEGADO.sub("", nombre).strip() or nombre
        p = pelado(nombre)

        if p in resol:
            e = por_nombre.get(pelado(resol[p]))
            if e:
                return e, "resolucion de Monica"

        if p in por_nombre:
            return por_nombre[p], "exacto"

        f = un_fijo(telefono)
        if f and f in por_fijo:
            return por_fijo[f], "mismo telefono fijo (%s)" % f

        # CONJUNTO DE PALABRAS. Las que distinguen del nombre de la ficha tienen
        # que estar TODAS en el nombre de la empresa. "MONTES OCHOA" encaja en
        # "ADMINISTRACION MONTES OCHOA"; "FUNCASE" no encaja en nada.
        ps = palabras(nombre)
        if ps:
            cand = [e for s_, e in por_palabras if ps <= s_]
            ids = {e["id"] for e in cand}
            if len(ids) == 1:
                return cand[0], "conjunto de palabras"
            if len(ids) > 1:
                return None, "ambiguo: %d candidatas (%s)" % (
                    len(ids), ", ".join(sorted({e["nombre_accesalia"] for e in cand})[:3]))

        if len(p) >= 4:
            cand = [e for k, e in por_nombre.items() if k.startswith(p) or p.startswith(k)]
            ids = {e["id"] for e in cand}
            if len(ids) == 1:
                return cand[0], "prefijo unico"

        return None, "no esta en la lista"

    # ---------------------------------------------------------------- repaso
    clon = b.leer("comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una"
                  "?select=id,municipio,carpeta,notas")
    cambios, pendientes = [], []
    cuenta = {"resolucion de Monica": 0, "exacto": 0, "prefijo unico": 0}
    n_pres = n_notas = 0

    for c in clon:
        f = fichas.get((c["municipio"], pelado(c["carpeta"])))
        if not f:
            continue
        # las cuatro carpetas de trabajo no son comunidades: no se tocan
        if "NO ES UNA COMUNIDAD" in (c.get("notas") or ""):
            continue

        fila = {}
        pres = (f.get("presidente") or "").strip()
        notas = (f.get("notas") or "").strip()
        if pres:
            fila["presidente"] = pres
            n_pres += 1
        if notas:
            fila["notas_de_la_ficha"] = notas
            n_notas += 1

        nom = (f.get("administrador") or "").strip()
        if nom:
            e, por_que = resolver(nom, f.get("admin_telefono"))
            if e:
                fila["empresa_id"] = e["id"]
                clave = por_que if por_que in cuenta else ("telefono fijo"
                                                           if por_que.startswith("mismo tel") else por_que)
                cuenta[clave] = cuenta.get(clave, 0) + 1
            else:
                pendientes.append({
                    "nombre_en_la_ficha": nom,
                    "por_que_no": por_que,
                    "municipio": c["municipio"],
                    "carpeta": c["carpeta"],
                    "contacto": (f.get("admin_contacto") or "").strip(),
                    "telefono": (f.get("admin_telefono") or "").strip(),
                    "correo": (f.get("admin_correo") or "").strip(),
                })
        if fila:
            cambios.append((c, fila))

    print("DE LAS %d FILAS DE LA CLON:" % len(clon))
    print("  filas a tocar                 : %d" % len(cambios))
    print("  presidente a copiar           : %d" % n_pres)
    print("  notas a copiar                : %d   <- el objetivo" % n_notas)
    print()
    print("  ADMINISTRADOR RESUELTO: %d" % sum(cuenta.values()))
    for k, v in sorted(cuenta.items(), key=lambda x: -x[1]):
        if v:
            print("     %-26s %d" % (k, v))
    print("  SIN RESOLVER, van a %s: %d" % (SIN_RESOLVER, len(pendientes)))

    # agrupado por nombre, que es como se revisa
    grupos = {}
    for p in pendientes:
        grupos.setdefault(p["nombre_en_la_ficha"], []).append(p)
    print()
    print("  los nombres sin resolver (%d distintos):" % len(grupos))
    for nom, ps in sorted(grupos.items(), key=lambda x: -len(x[1])):
        print("     %-38s x%-2d  %s" % (nom[:38], len(ps), ps[0]["por_que_no"][:46]))

    cols = ["nombre_en_la_ficha", "por_que_no", "municipio", "carpeta",
            "contacto", "telefono", "correo"]
    with io.open(SIN_RESOLVER, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols, delimiter="|")
        w.writeheader()
        for nom, ps in sorted(grupos.items(), key=lambda x: -len(x[1])):
            for p in ps:
                w.writerow(p)

    if not escribir:
        print("\n   (marcha en seco. Para hacerlo: --escribir)\n")
        return

    print("\n--- escribiendo ---")
    for c, fila in cambios:
        b.actualizar("comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una?id=eq." + c["id"],
                     fila)
    print("   %d filas actualizadas" % len(cambios))

    cl = b.leer("comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una"
                "?select=empresa_id,presidente,notas_de_la_ficha")
    print("\n--- comprobando contra produccion ---")
    print("   con administrador : %d" % len([x for x in cl if x["empresa_id"]]))
    print("   con presidente    : %d" % len([x for x in cl if x["presidente"]]))
    print("   con notas         : %d" % len([x for x in cl if x["notas_de_la_ficha"]]))


if __name__ == "__main__":
    main()
