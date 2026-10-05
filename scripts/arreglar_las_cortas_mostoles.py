# -*- coding: utf-8 -*-
"""
LAS CABECERAS CORTADAS DE MOSTOLES, LEIDAS UNA A UNA   (5-oct-2026)

Mismo caso que en Leganes: el impreso parte una anotacion en varias lineas y el
extractor las guarda sueltas. "Tecnico de patrimonio:" sin el nombre de debajo
no dice nada. Se probo a pegarlas a maquina y salio peor -unia el DNI de un
presidente con el telefono de otro-, asi que se leen.

Lo que mas sale en Mostoles es EL AYUNTAMIENTO: cinco departamentos con su
extension y su correo, repartidos por cuatro fichas distintas.

Uso: python scripts/arreglar_las_cortas_mostoles.py [--escribir]
"""
import csv
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402

# (carpeta, trozo que hay hoy, texto bueno o None para quitarlo)
ARREGLOS = [
    # --- el ayuntamiento de Mostoles, que estaba en cuatro trozos ---
    ("alfonsoxii10", "Técnica de Licencias",
     "[AYUNTAMIENTO] Técnica de Licencias de Móstoles: Mª Eugenia de Gregorio Martín"),
    ("alfonsoxii10", "Legalización de rampa:",
     "[TRAMITACION] Legalización de rampa · expediente nº U.053_TRIS.O/2022/89"),
    ("alfonsoxii10", "Técnico de patrimonio:",
     "[AYUNTAMIENTO] Técnico de Patrimonio de Móstoles: Alberto Fernández Pacheco, ext. 4235 · "
     "Concejalía de Patrimonio, Transportes y Movilidad · C/ Independencia 12, 2ª planta (28931) · "
     "916493792 · RegistroPatrimonio@mostoles.es"),
    ("alfonsoxii10", "Alberto Fernández Pacheco ext. 4235", None),
    ("alfonsoxii10", "Concejalía de Patrimonio, Transportes y Movilidad", None),
    ("alfonsoxii10", "Dirección: Calle Independencia nº 12- 2º Planta. C.P. (28931)", None),
    ("alfonsoxii10", "Tfno: 916493792 Mail: RegistroPatrimonio@mostoles.es", None),
    ("alfonsoxii10", "Patrimonio 916493792 Eva",
     "[AYUNTAMIENTO] Patrimonio de Móstoles: Eva · 916493792"),
    ("alfonsoxii10", "Andres presidente",
     "[CONTACTO] Andrés Jimeno, presidente · 669 69 45 39"),
    ("becquer19", "Tlf 91 664 75 00 Ext 4235",
     "[AYUNTAMIENTO] Móstoles, Patrimonio: 91 664 75 00 ext. 4235 · afernandezp@ayto-mostoles.es"),
    ("becquer19", "afernandezp@ayto-mostoles.es", None),
    ("becquer19", "URBANISMO: ggmuregistro@mostoles.es",
     "[AYUNTAMIENTO] Móstoles, Urbanismo: ggmuregistro@mostoles.es"),
    ("becquer19", "CONTRIBUYENTE: oac@mostoles.es",
     "[AYUNTAMIENTO] Móstoles, atención al contribuyente: oac@mostoles.es"),
    ("burgos6", "916647500 ext.2879",
     "[AYUNTAMIENTO] Móstoles, tramitaciones: 916647500 ext. 2879 · gmutramitaciones@mostoles.es"),
    ("burgos6", "gmutramitaciones@mostoles.es", None),
    ("castellon1", "91 664 75 00 Ext. 4231",
     "[AYUNTAMIENTO] Móstoles: 91 664 75 00 ext. 4231 · MBravoH.gmu@ayto-mostoles.es"),
    ("castellon1", "MBravoH.gmu@ayto-mostoles.es", None),
    ("plazadosdemayo5", "916647500 ext.4565",
     "[AYUNTAMIENTO] Móstoles: 916647500 ext. 4565 · rgonzalezb.gmu@mostoles.es"),
    ("plazadosdemayo5", "rgonzalezb.gmu@mostoles.es", None),

    # --- contratas partidas ---
    ("alcaldedemostoles9", "Jican Ascensores",
     "[CONTRATA] Jican Ascensores · comercial: Cecilio, 639 223 819 · 914652963"),
    ("alcaldedemostoles9", "Cecilio  639 223 819", None),
    ("alcaldedemostoles9", "Cecilio JICAN", None),
    ("alfonsoxii16", "Schindler Iberia | Sucursal Madrid Centro",
     "[CONTRATA] Schindler Iberia, sucursal Madrid Centro · Río Bullaque 2, 28034 Madrid · "
     "www.schindler.es · ~~Javier González Moya, TC Rehabilitaciones Madrid, +34 616991079, "
     "javier.gonzalez.moya@schindler.com~~ · ahora Daniel Díaz"),
    ("alfonsoxii16", "Río Bullaque, 2", None),
    ("alfonsoxii16", "28034 Madrid, España", None),
    ("alfonsoxii16", "www.schindler.es", None),
    ("helsinki7", "info@caretalsarpey.com",
     "[CONTRATA] Caretal Sarpey · Miguel Goñez Goñez (jefe de obra) · Sindo 687888811 · "
     "sindo@caretalsarpey.com · info@caretalsarpey.com · 91 664 30 94 / 91 613 18 96 · Arroyomolinos 28939"),
    ("helsinki7", "28.939 - Arroyomolinos - (Madrid)", None),
    ("helsinki7", "Telf: 91 664 30 94 – Tel: 91 613 18 96", None),

    # --- contactos partidos ---
    ("avCarlosV32", "Vicepresidente:",
     "[CONTACTO] Vicepresidente Roberto Alonso Fernández · 601255994 · roberto_alonso3@hotmail.com. "
     "Siempre mejor el vicepresidente por los cuartos y la cubierta"),
    ("avCarlosV32", "Siempre mejor el Vicepresidente por los cuartos y la cubierta", None),
    ("avCarlosV32", "601255994 – roberto_alonso3@hotmail.com", None),
    ("burgos6", "Vicepresidente",
     "[CONTACTO] Álvaro Arroyo Álvarez, vicepresidente (3ºD) · 622532549. "
     "El presidente falleció durante la tramitación"),
    ("burgos6", "El presidente falleció durante la tramitación", None),
    ("burgos6", "Alvaro Arroyo Alvarez (3º D)", None),
    ("helsinki7", "persona que lleva la Mancomunidad:  649.02.55.22 (Mª Angeles)",
     "[CONTACTO] Quien lleva la Mancomunidad: Mª Ángeles · 649 02 55 22"),
]


def main():
    escribir = "--escribir" in sys.argv
    b = arrancar()
    print("\n*** %s ***\n" % ("ESCRIBIENDO" if escribir else "MARCHA EN SECO"))

    com2carp = {f["comunidad_id"]: f["carpeta"]
                for f in csv.DictReader(io.open("cotejo_por_direccion.csv", encoding="utf-8"), delimiter="|")
                if f["estado"] == "ok" and f["municipio"] == "MOSTOLES"}
    op2carp = {o["id"]: com2carp[o["comunidad_id"]]
               for o in b.leer("oportunidades?select=id,comunidad_id", por_tramos=True)
               if o["comunidad_id"] in com2carp}
    notas = [n for n in b.leer("notas_oportunidad?select=id,oportunidad_id,texto&texto=like.%5B*", por_tramos=True)
             if n["oportunidad_id"] in op2carp]

    cambia, quita = [], []
    for carp, trozo, bueno in ARREGLOS:
        for n in notas:
            if op2carp[n["oportunidad_id"]] != carp:
                continue
            cuerpo = n["texto"].split("] ", 1)[-1].strip()
            if cuerpo != trozo:
                continue
            (quita if bueno is None else cambia).append((n, bueno))

    print("   a completar: %d" % len(cambia))
    for n, bueno in cambia[:5]:
        print("      %-36s -> %s" % (n["texto"][:36], bueno[:64]))
    print("   a quitar   : %d" % len(quita))

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
