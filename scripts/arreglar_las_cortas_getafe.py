# -*- coding: utf-8 -*-
"""
LO LEIDO EN LAS 15 FICHAS DE GETAFE                    (Monica, 6-oct-2026)

    "Visto lo visto y como no son tantas carpetas, las leemos en vez de
     parsear. Leer una a una."

Getafe tiene 83 carpetas pero solo 15 con comunidad en la app. Se leyeron las 15
de una sentada y esto es lo que sale, ya puesto en su sitio.

Lo que mas aparece, y en cinco fichas distintas, es EL AYUNTAMIENTO DE GETAFE:
la tecnica de licencias con su extension directa, otra con horario de atencion
-L a J de 13:00 a 14:30- y el movil de licencias.

Uso: python scripts/arreglar_las_cortas_getafe.py [--escribir]
"""
import csv
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402

MUNI = "GETAFE"

# (carpeta, trozo que hay hoy, texto bueno o None para quitarlo)
ARREGLOS = [
    # --- el ayuntamiento de Getafe, repartido en cinco fichas ---
    ("titulcia12", "MODIFICACIONES INDICADAS A MARIA DEL MAR TECNICO AYUNTAMIENTO:",
     "[AYUNTAMIENTO] Getafe · Mª del Mar Filgueira Fuentes, Técnica de la Unidad de Licencias, "
     "Disciplina e Inspección · 91 202 79 42 ext. 27942 · mmar.filgueira@ayto-getafe.org. "
     "Es quien indica las modificaciones."),
    ("titulcia12", "mmar.filgueira@ayto-getafe.org", None),
    ("titulcia12", "Mª del Mar Filgueira Fuentes", None),
    ("titulcia12", "Técnica de la Unidad de Licencias, Disciplina e Inspección", None),
    ("titulcia12", "91 202 79 42 Ext. 27942", None),
    ("titulcia12", "L-J de 13.00 a 14.30h - 912027942",
     "[AYUNTAMIENTO] Getafe · Concepción Torre · 912027942 · concepcion.torre@ayto-getafe.org · "
     "atiende de lunes a jueves de 13:00 a 14:30"),
    ("titulcia12", "concepcion.torre@ayto-getafe.org", None),
    ("titulcia12", "Jaime Redondo arquitecto.", "[AYUNTAMIENTO] Getafe · Jaime Redondo, arquitecto"),
    ("perdiz5", 'Getafe 91 202 79 42 “licencias” -> 661726826',
     "[AYUNTAMIENTO] Getafe, licencias: 91 202 79 42, y un móvil directo, 661 726 826"),
    ("colibri5", "mmar.filgueira@ayto-getafe.org",
     "[AYUNTAMIENTO] Getafe · Mª del Mar Filgueira · mmar.filgueira@ayto-getafe.org · "
     "91 202 79 42 ext. 27942"),
    ("colibri5", "91 202 79 42 Ext. 27942", None),
    ("avespaña27", "91 202 79 42 Ext. 27942",
     "[AYUNTAMIENTO] Getafe, licencias: 91 202 79 42 ext. 27942"),
    ("avespaña33", "91 202 79 42 Ext. 27942",
     "[AYUNTAMIENTO] Getafe, licencias: 91 202 79 42 ext. 27942"),

    # --- contactos ---
    ("avgibraltar4-6-8", "Portal 6 1ºB",
     "[CONTACTO] Presidente: Jesús Maroto Romero (portal 6, 1ºB), DNI 47045453B. Antes, "
     "~~Santiago Olalde Fiandor, 618 060 599, santolfian@gmail.com, 51114779Q: dejó de ser "
     "presidente y vendió~~"),
    ("parla20", "YOLANDA LOPEZ / 626 68 63 16",
     "[CONTACTO] Presidenta: Yolanda López · 626 68 63 16"),

    # --- contratas ---
    ("avespaña27", "TKE Juan Carlos (28/07/26)",
     "[CONTRATA] TKE · Juan Carlos (28/07/2026). Antes, ~~Juan Luis Ruiz de Mier~~ y "
     "~~Abel Bernardos~~; y de FAIN, ~~Alberto Calleja~~"),
    ("avespaña33", "Abel Bernardos",
     "[CONTRATA] Jefe de obra: ~~Javier Cuenca~~ → Víctor Esquinas, con Abel Bernardos"),
    ("valencia10", "Abel Bernardos",
     "[CONTRATA] Jefe de obra: Juan Luis Ruiz de Mier y Abel Bernardos"),
    ("valencia10", "Juan Luis Ruiz de Mier", None),
    ("parla20", "fjvelasco@elecnor.com",
     "[CONTRATA] Elecnor · Javier Velasco · fjvelasco@elecnor.com"),
    ("parla20", "Javier Velasco", None),
    ("valdemorillo1", "franciscomiguel.lopez@fainascensores.com",
     "[CONTRATA] FAIN · Fran (Francisco Miguel López) · franciscomiguel.lopez@fainascensores.com"),
    ("valdemorillo1", "FRAN fain", None),

    # --- notas ---
    ("magdalena3", "COMERCIAL INTERNO: CARLOS y (PRY TECHO) DANIEL",
     "[NOTA] Dos comerciales: Carlos lo general y Daniel el proyecto del techo"),
    ("austria5", "Rivera Ortiz", "[NOTA] Administrador: Rivera Ortiz"),
]


def main():
    escribir = "--escribir" in sys.argv
    b = arrancar()
    print("\n*** %s ***\n" % ("ESCRIBIENDO" if escribir else "MARCHA EN SECO"))
    com2carp = {f["comunidad_id"]: f["carpeta"]
                for f in csv.DictReader(io.open("cotejo_por_direccion.csv", encoding="utf-8"), delimiter="|")
                if f["estado"] == "ok" and f["municipio"] == MUNI}
    op2carp = {o["id"]: com2carp[o["comunidad_id"]]
               for o in b.leer("oportunidades?select=id,comunidad_id", por_tramos=True)
               if o["comunidad_id"] in com2carp}
    notas = [n for n in b.leer("notas_oportunidad?select=id,oportunidad_id,texto&texto=like.%5B*", por_tramos=True)
             if n["oportunidad_id"] in op2carp]

    cambia, quita, sin_encontrar = [], [], []
    for carp, trozo, bueno in ARREGLOS:
        hallada = False
        for n in notas:
            if op2carp[n["oportunidad_id"]] != carp:
                continue
            if n["texto"].split("] ", 1)[-1].strip() != trozo:
                continue
            hallada = True
            (quita if bueno is None else cambia).append((n, bueno))
        if not hallada:
            sin_encontrar.append((carp, trozo[:50]))

    print("   a completar: %d" % len(cambia))
    print("   a quitar   : %d" % len(quita))
    if sin_encontrar:
        print("   NO ENCONTRADAS (mirar): %d" % len(sin_encontrar))
        for c, t in sin_encontrar:
            print("      %-20s %s" % (c[:20], t))

    if not escribir:
        print("\n   (marcha en seco. Para hacerlo: --escribir)\n")
        return
    print("\n--- escribiendo ---")
    for n, bueno in cambia:
        b.actualizar("notas_oportunidad?id=eq." + n["id"], {"texto": bueno})
    for n, _ in quita:
        b.borrar("notas_oportunidad?id=eq." + n["id"])
    print("   %d completadas, %d quitadas" % (len(cambia), len(quita)))


if __name__ == "__main__":
    main()
