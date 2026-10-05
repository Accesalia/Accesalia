# -*- coding: utf-8 -*-
"""
LAS 33 NOTAS CORTAS DE LEGANES, LEIDAS UNA A UNA   (Monica, 5-oct-2026)

    "Esas notas hay que revisarlas leyendo. No podemos dejarlo asi."

Al cargar lo escrito en los huecos, 33 notas salieron de menos de 28 caracteres
y sin sentido: "Bajo B", "Isabel presidenta", "Antiguos presidentes", "Jose
Luis". Todas eran LA CABECERA DE UN BLOQUE, cortada de lo que venia debajo.

Se han leido las fichas. Aqui va cada una con su contenido entero, o fuera si
resulto ser un valor del impreso que ya esta en su campo.

Uso: python scripts/arreglar_las_cortas_leganes.py [--escribir]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402

# (carpeta, texto corto que hay hoy, texto bueno o None para quitarla)
ARREGLOS = [
    ("sangregorio4", "A junio 2024",
     "[CONTACTO] A junio 2024 · Presidente: Cruz Cecilio, 626 79 81 39 (3ºD) · "
     "Vicepresidente: Clemente, 660 85 78 72 (3ºC)"),
    ("sangregorio4", "Presidente anterior",
     "[HISTORIA] Presidente anterior: JOSE LUIS RAMIREZ BLAZQUEZ, DNI 70806952A"),
    ("fraymelchorcano22", "Abel Bernardos",
     "[CONTRATA] Jefe de obra: Cristian Rodríguez Nieto / Abel Bernardos"),
    ("plazadelainmaculada6", "Antiguo presidente:",
     "[HISTORIA] Antiguo presidente: ~~ANTONIO LOZANO VAZQUEZ~~ ~~08763561D~~ "
     "~~ES64 2100 3703 0813 0029 3950~~"),
    ("plazadelaflor6", "Antiguos presidentes",
     "[HISTORIA] Antiguos presidentes: ~~MOUSTAPHA EL HANI ENNAHOUTI (nuevo presi 2023) "
     "53900593R~~ · ~~JOSE CARLOS SANCHEZ MORENO, conseguida firma electrónica del "
     "presidente, 04155920G~~"),
    ("riomanzanares26", "Bajo B",
     "[CONTACTO] Presidenta a 14/03/2024: PILAR ÚBEDA PORTUGUÉS-MORCHÓN (Bajo B), "
     "DNI 70561662P, tlf 656 33 42 88 / 91 680 71 63"),
    ("torrubia4", "Christian", "[CONTRATA] Jefe de obra: Christian"),
    ("plazadelaflor6", "Cl Pensamiento 10", None),
    ("torrubia4", "Cl Pensamiento 10", None),
    ("rodrigodetriana5", "Colegiada nº 9441",
     "[NOTA] Administradora de Fincas AG, colegiada nº 9441"),
    ("ampurdan7", "Comercial Técnico",
     "[CONTRATA] Rehabilitaciones Integrales Roen, S.L.U. · ~~Jose Luis Jiménez~~ → "
     "Cristian, comercial técnico · 916 884 566 / 645 369 037 · www.roen.es · "
     "C/ Paloma nº4, Local, Leganés 28911"),
    ("riomanzanares26", "Deflex israel", "[TECNICO] FERNAN → Deflex Israel"),
    ("sanvaleriano1", "GUOHUA ZHENG (2ºb)",
     "[CONTACTO] Presidente: GUOHUA ZHENG (2ºB). Antes, ~~Mª Elena Montero Bernabé~~ "
     "~~52370200M~~ ~~627740247~~"),
    ("calderondelabarca8", "Isabel presidenta",
     "[CONTACTO] Isabel, presidenta · 619075177"),
    ("calderondelabarca6", "José Luis",
     "[CONTRATA] Constructora ROEN · José Luis · 601 31 84 84 · oficina@roen.es"),
    ("plazadelasfloras5", "Junio 2020", None),
    ("plazadelainmaculada6", "Octubre 2021", None),
    ("nuestraseñoradelamacarena9", "REQ CARLA dic 24",
     "[TECNICO] Consulta: Enrique · Proyecto: Susana · requerimientos: Carla, dic 2024"),
    ("rioja19", "Roberto rodriguez", "[CONTRATA] Jefe de obra: Roberto Rodríguez"),
    ("riomanzanares22", "Sevi vilas",
     "[NOTA] Junio 2023, nuevo asesor: SM Fincas · Sevi Vilas · 625 886 456 · "
     "Sevi.Vilas@smfincas.es · Info@smfincas.es · C/ Polvoranca, 7"),
    ("riomanzanares22", "Sm fincas", None),          # lo recoge la de arriba
    ("nuestraseñoradelamacarena9", "Vicepresidenta:",
     "[CONTACTO] Vicepresidenta: María Nieves (bajo B) · 645 835 526"),
    ("batalladeclavijo7", "administradora", None),
    ("polvoranca18", "diciembre 2019", None),
    ("rioduero65", "infinitas", "[NOTA] Qué cubre y periodo de la subvención: presentaciones infinitas"),
    ("guante8", "marcal asesores", None),
    ("torrubia4", "urbanismo",
     "[AYUNTAMIENTO] Urbanismo de Leganés: Antonio García González · 91 248 96 45 · "
     "antgarcia@leganes.org"),
]

# El titulo del proyecto no es una nota: es un valor del impreso.
FUERA_TITULO = "PROYECTO B"


def main():
    escribir = "--escribir" in sys.argv
    b = arrancar()
    print("\n*** %s ***\n" % ("ESCRIBIENDO" if escribir else "MARCHA EN SECO"))

    import csv, io
    com2carp = {}
    for f in csv.DictReader(io.open("cotejo_por_direccion.csv", encoding="utf-8"), delimiter="|"):
        if f["estado"] == "ok" and f["municipio"] == "LEGANES":
            com2carp[f["comunidad_id"]] = f["carpeta"]
    op2carp = {o["id"]: com2carp[o["comunidad_id"]]
               for o in b.leer("oportunidades?select=id,comunidad_id", por_tramos=True)
               if o["comunidad_id"] in com2carp}

    notas = [n for n in b.leer("notas_oportunidad?select=id,oportunidad_id,texto&texto=like.%5B*", por_tramos=True)
             if n["oportunidad_id"] in op2carp]

    cambia, quita = [], []
    for carp, corto, bueno in ARREGLOS:
        for n in notas:
            if op2carp[n["oportunidad_id"]] != carp:
                continue
            if n["texto"][7:].strip() != corto and n["texto"].split("] ", 1)[-1].strip() != corto:
                continue
            (quita if bueno is None else cambia).append((n, bueno))
    for n in notas:
        if FUERA_TITULO in n["texto"].upper() and "EJECUCI" in n["texto"].upper():
            quita.append((n, None))

    print("   a completar : %d" % len(cambia))
    for n, bueno in cambia[:6]:
        print("      %-34s -> %s" % (n["texto"][:34], bueno[:70]))
    print("   a quitar    : %d" % len(quita))
    for n, _ in quita[:8]:
        print("      %s" % n["texto"][:80])

    if not escribir:
        print("\n   (marcha en seco. Para hacerlo: --escribir)\n")
        return
    print("\n--- escribiendo ---")
    for n, bueno in cambia:
        b.actualizar("notas_oportunidad?id=eq." + n["id"], {"texto": bueno})
    print("   %d completadas" % len(cambia))
    for n, _ in quita:
        b.borrar("notas_oportunidad?id=eq." + n["id"])
    print("   %d quitadas" % len(quita))


if __name__ == "__main__":
    main()
