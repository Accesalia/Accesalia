# -*- coding: utf-8 -*-
"""
LOS PRESIDENTES, A LA AGENDA                  (Monica, 5-oct-2026)

'personas_comunidad' son 543 filas y TODAS son presidentes. Es una segunda
agenda que se quedo fuera del modelo que ella decidio: la persona una vez, y el
puesto dice donde, como que y entre que fechas.

   "Los datos de una persona son los mismos en cualquier caso: nombre,
    apellidos, mail, telefono. (...) Por que no tener una agenda de contactos
    personales, con la persona_id y sus datos, sea quien sea? Y esa persona_id
    es la que se vincula a rol presidente, cargo administrador, cargo tecnico de
    urbanismo en Fuenlabrada."

CADA PRESIDENTE SE PARTE EN DOS:
  - 'persona'  -> nombre, apellidos, telefono. La agenda, y nada mas.
  - 'puesto'   -> cargo 'presidente', el DNI, y el "donde" apuntando a la
                  COMUNIDAD a traves de figura_legal_propietaria_id. Ese hueco
                  ya existia: el puesto sabe colgar de una empresa o de una
                  figura legal, y una comunidad es una figura legal.

EL DNI VA AL PUESTO, no a la persona: "cuando hay rol, el DNI iria ahi; cuando
hay puesto, el numero de colegiado. No le pido el DNI al comercial de BBVA".

QUE NO SE MIGRA, Y POR QUE:
  - Las ~21 filas con DOS PERSONAS pegadas y sus dos DNI juntos. No se parten por
    programa: hay que decidir quien es el presidente HOY y quien lo fue, y el
    orden NO lo dice -en Avila 3 la tachada era la segunda-. Se quedan donde
    estan y se resolveran al barrer sus municipios, que es "el sitio adecuado".
  - Lo que lleva ruido pegado -un piso, una nota, un telefono- SI se migra: el
    nombre limpio a la persona y el texto original entero a las notas del puesto,
    "por si acaso".

Uso:
    python scripts/presidentes_a_la_agenda.py             <- marcha en seco
    python scripts/presidentes_a_la_agenda.py --escribir
"""
import io
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402

DNI = re.compile(r"[0-9XYZ]\d{7}[A-HJ-NP-TV-Z]", re.I)
# dos nombres propios pegados o seguidos: la marca de "dos personas en una fila"
DOS_PERSONAS = re.compile(r"[a-záéíóúñ]{3}[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ]{2}")
# lo que no es el nombre: un piso, una aclaracion, un telefono
RUIDO = re.compile(r"\(.*?\)|\d[\d .\-]{6,}|\b\d+\s*[ºªo]\s*[A-Za-z]?\b|\b\d+\s*[A-D]\b")
TEL = re.compile(r"\b[6789]\d{2}[ .\-]?\d{2}[ .\-]?\d{2}[ .\-]?\d{2}\b")

PARTICULAS = {"de", "del", "la", "las", "los", "y", "da", "di", "van", "von"}


def partir_nombre(t):
    """Nombre y apellidos. Se parte por la primera palabra que empieza apellido:
       dos palabras de nombre como mucho, que es lo habitual en castellano."""
    ps = [p for p in t.split() if p]
    if len(ps) <= 1:
        return t, ""
    if len(ps) == 2:
        return ps[0], ps[1]
    # "MARIA DEL CARMEN BENITEZ SERRADILLA" -> nombre hasta donde acabe la particula
    corte = 1
    if len(ps) >= 4 and ps[1].lower() in PARTICULAS:
        corte = 3
    elif len(ps) >= 4:
        corte = 2
    return " ".join(ps[:corte]), " ".join(ps[corte:])


def main():
    escribir = "--escribir" in sys.argv
    b = arrancar()
    print("\n*** %s ***\n" % ("ESCRIBIENDO" if escribir else "MARCHA EN SECO"))

    filas = b.leer("personas_comunidad?select=id,comunidad_id,nombre,rol,documento,"
                   "telefono,email,notas,es_contacto_principal", por_tramos=True)
    coms = {c["id"]: c["nombre"] for c in b.leer("comunidades?select=id,nombre", por_tramos=True)}
    figuras = {f["id_comodin"] for f in b.leer("figura_legal_propietaria?select=id_comodin",
                                               por_tramos=True)}

    migran, enredadas, sin_figura, sin_nombre = [], [], [], []
    for f in filas:
        bruto = (f.get("nombre") or "").strip()
        if not bruto:
            sin_nombre.append(f)
            continue
        if len(DNI.findall(f.get("documento") or "")) >= 2 or DOS_PERSONAS.search(bruto):
            enredadas.append(f)
            continue
        if f["comunidad_id"] not in figuras:
            sin_figura.append(f)
            continue
        tel = f.get("telefono") or ""
        if not tel:
            m = TEL.search(bruto)
            if m:
                tel = m.group(0)
        limpio = RUIDO.sub(" ", bruto)
        limpio = re.sub(r"\s{2,}", " ", limpio).strip(" .,-/")
        if not limpio:
            sin_nombre.append(f)
            continue
        nombre, apellidos = partir_nombre(limpio)
        migran.append({
            "fila": f, "nombre": nombre, "apellidos": apellidos,
            "telefono": tel or None, "bruto": bruto,
            "cambio": limpio != bruto,
        })

    print("   se migran                 : %d" % len(migran))
    print("      de ellos, con ruido quitado del nombre: %d" % len([m for m in migran if m["cambio"]]))
    print("   DOS PERSONAS, no se tocan : %d" % len(enredadas))
    print("   comunidad sin figura legal: %d" % len(sin_figura))
    print("   sin nombre utilizable     : %d" % len(sin_nombre))
    print("\n   ejemplos de nombre partido:")
    for m in migran[:6]:
        print("      %-44s -> %-20s | %s" % (m["bruto"][:44], m["nombre"][:20], m["apellidos"][:26]))
    print("\n   ejemplos de ruido quitado:")
    for m in [x for x in migran if x["cambio"]][:6]:
        print("      %-50s -> %s %s" % (m["bruto"][:50], m["nombre"], m["apellidos"]))

    if not escribir:
        print("\n   (marcha en seco. Para hacerlo: --escribir)\n")
        return

    print("\n--- escribiendo ---")
    hechos = 0
    for m in migran:
        f = m["fila"]
        [per] = b.insertar_devolviendo("persona", [{
            "nombre": m["nombre"], "apellidos": m["apellidos"] or None,
            "telefono_personal": m["telefono"], "activa": True,
        }])
        notas = []
        if m["cambio"]:
            notas.append('En la ficha venia asi: "%s"' % m["bruto"])
        if (f.get("notas") or "").strip():
            notas.append(f["notas"].strip())
        b.insertar("puesto", [{
            "persona_id": per["id"],
            "figura_legal_propietaria_id": f["comunidad_id"],
            "cargo": "Presidente", "cargo_clave": "presidente",
            "documento": (f.get("documento") or "").strip() or None,
            "notas": ("\n".join(notas) or None),
        }])
        if (f.get("email") or "").strip():
            b.insertar("correo", [{"persona_id": per["id"], "email": f["email"].strip(),
                                   "principal": True, "etiqueta": "presidente"}])
        hechos += 1
    print("   %d presidentes migrados a persona + puesto" % hechos)
    print("   personas en la agenda: %d"
          % len(b.leer("persona?select=id", por_tramos=True)))
    print("   puestos de presidente: %d"
          % len(b.leer("puesto?select=id&cargo_clave=eq.presidente", por_tramos=True)))


if __name__ == "__main__":
    main()
