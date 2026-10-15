# -*- coding: utf-8 -*-
"""
DOCUMENTOS DE EDIFICIOS PROTEGIDOS a Documentacion de referencia (Monica, 11-oct-2026):
"por municipios, acceso a los pdf o docs que hemos bajado + los enlaces de los
que los bajamos + la fecha de bajada (hoy) y la fecha probable en que habria que
revisar si siguen actualizados (6 meses)".

Tabla documentos_referencia, seccion 'proteccion'. Los PDF, en el almacen
privado "referencia", catalogos-proteccion/<municipio>/. Los que faltan en el
almacen se suben desde DESCARGAS (o la copia local); los que ya estan no se
tocan. Relanzable: la fila se reconoce por su fichero.

Uso:  python scripts/cargar_documentos_proteccion.py [escribir]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from produccion import arrancar  # noqa: E402

BAJADO, REVISAR = "2026-10-11", "2027-04-11"
DESCARGAS = os.path.expanduser("~/Downloads")
PAD = os.environ.get("PROTECCION_LOCAL", "")  # carpeta con las copias bajadas por Claude

AL = "https://urbanismo.ayto-alcaladehenares.es/wp-content/uploads/"
# (municipio, orden, titulo, descripcion, fichero en el almacen, url de origen, fichero local o None si ya esta subido)
DOCS = [
    ("LEGANES", 1, "Catálogo de edificios protegidos", "Memoria y fichas del catálogo",
     "catalogos-proteccion/leganes/catalogo-edificios-protegidos.pdf",
     "https://www.leganes.org/documents/43051/237993/0_36113_1.pdf/5de01afe-38cc-cd6b-f424-11368523b613", None),
    ("LEGANES", 2, "Plano del catálogo", None,
     "catalogos-proteccion/leganes/plano-catalogo.pdf",
     "https://www.leganes.org/documents/43051/237993/0_36114_1.pdf/dd96ae00-8826-5e7b-d08b-1a618ac6d25f", None),
    ("FUENLABRADA", 1, "Plan General de 1999 (BOCM)", "El catálogo, en las páginas 95-111",
     "catalogos-proteccion/fuenlabrada/BOCM-1999-PGOU-Fuenlabrada.pdf",
     "https://www.ayto-fuenlabrada.es/documents/36561/141148/Publicaci%C3%B3n+BOCM+Aprobaci%C3%B3n+Definitiva.pdf/3cc5378f-eefe-4674-f86f-4b9a76a33298", None),
    ("MOSTOLES", 1, "Catálogo del Plan General (BOCM 25-04-2009)", None,
     "catalogos-proteccion/mostoles/BOCM-2009-catalogo-Mostoles.pdf",
     "https://www.bocm.es/boletin/CM_Orden_BOCM/2009/04/25/2009-04-25_14042009_0069.pdf", None),
    ("ALCOBENDAS", 1, "Catálogo de bienes y espacios protegidos", None,
     "catalogos-proteccion/alcobendas/catalogo-bienes-espacios-protegidos.pdf",
     "https://www.alcobendas.org/sites/default/files/2021-04/Cat%C3%A1logo%20de%20Bienes%20y%20Espacios%20Protegidos.pdf", None),
    ("ALCOBENDAS", 2, "Modificación del catálogo (BOCM 13-05-2021)", None,
     "catalogos-proteccion/alcobendas/modificacion-2021.pdf",
     "https://www.bocm.es/boletin/CM_Orden_BOCM/2021/05/13/BOCM-20210513-20.PDF", None),
    ("SAN SEBASTIAN DE LOS REYES", 1, "Normas de protección del casco antiguo", "No trae lista de edificios: solo la zona del casco",
     "catalogos-proteccion/san-sebastian-de-los-reyes/normas-proteccion.pdf",
     "https://www.ssreyes.org/documents/1678104/2095871/1469426355_932009115945.pdf/f3371a50-87e8-5934-e713-41a90064259a", None),
    ("ALCALA DE HENARES", 1, "Normas urbanísticas del Plan General (texto refundido, BOCM 20-11-2023)",
     "El subsuelo: capítulo 19, áreas arqueológicas A, B, C y D (págs. 180-188). Todo el municipio cae en alguna",
     "catalogos-proteccion/alcala-de-henares/normas-urbanisticas-pgou-2023.pdf",
     AL + "2023/11/Texto-Refundido-NNUU-DEL-PGOU-91_BOCM-20-11-23.pdf", "alc_Texto-Refundido-NNUU-DEL-PGOU-91_BOCM-20-11-23.pdf"),
    ("ALCALA DE HENARES", 2, "Catálogo de bienes protegidos del Plan General (1994)", None,
     "catalogos-proteccion/alcala-de-henares/catalogo-bienes-protegidos-1994.pdf",
     AL + "2025/08/CATALOGOBIENESPROTEGIDOS1994.pdf", "alc_CATALOGOBIENESPROTEGIDOS1994.pdf"),
    ("ALCALA DE HENARES", 3, "Listado de bienes protegidos según el Plan General", "Resumen de 2 páginas: unos 40 bienes con su dirección",
     "catalogos-proteccion/alcala-de-henares/listado-bienes-protegidos.pdf",
     "https://patrimoniohistorico.ayto-alcaladehenares.es/wp-content/uploads/2020/11/LISTADO-BIENES-PROTEGIDOS-SEGUN-EL-PLAN-GENERAL-DE-ORDENACION-URBANA.pdf", "listado_alcala.pdf"),
    ("ALCALA DE HENARES", 4, "Plan Especial del Casco Histórico: catálogo, fichas 1-100", "Texto refundido de 2024",
     "catalogos-proteccion/alcala-de-henares/casco-historico-catalogo-1-100.pdf",
     AL + "2024/05/04.CATALOGO_REFUNDIDO-1-100-1.pdf", "alc_04.CATALOGO_REFUNDIDO-1-100-1.pdf"),
    # El oficial pesa 52,5 MB y el almacen admite 50: partido en dos por paginas (1-59 y 60-118), sin tocar nada.
    ("ALCALA DE HENARES", 5, "Plan Especial del Casco Histórico: catálogo, fichas 101-218 (1ª mitad)", "Texto refundido de 2024. Páginas 1-59 del PDF oficial",
     "catalogos-proteccion/alcala-de-henares/casco-historico-catalogo-101-218-parte1.pdf",
     AL + "2024/05/04.CATALOGO_REFUNDIDO-101-218-1.pdf", "alc_cat101_parte1.pdf"),
    ("ALCALA DE HENARES", 6, "Plan Especial del Casco Histórico: catálogo, fichas 101-218 (2ª mitad)", "Texto refundido de 2024. Páginas 60-118 del PDF oficial",
     "catalogos-proteccion/alcala-de-henares/casco-historico-catalogo-101-218-parte2.pdf",
     AL + "2024/05/04.CATALOGO_REFUNDIDO-101-218-1.pdf", "alc_cat101_parte2.pdf"),
    ("ALCALA DE HENARES", 7, "Plan Especial del Casco Histórico: normas", "Texto refundido de 2024",
     "catalogos-proteccion/alcala-de-henares/casco-historico-normas.pdf",
     AL + "2024/05/03.NORMAS_REFUNDIDO.pdf", "alc_03.NORMAS_REFUNDIDO.pdf"),
    ("ALCALA DE HENARES", 8, "Plan Especial del Casco Histórico: planos", "Texto refundido de 2024",
     "catalogos-proteccion/alcala-de-henares/casco-historico-planos.pdf",
     AL + "2024/05/02.PLANOS_REFUNDIDO.pdf", os.path.join(DESCARGAS, "02.PLANOS_REFUNDIDO alcala.pdf")),
]

# 15-OCT-2026: los cinco municipios con opps abiertas que faltaban. Del visor de
# planeamiento de la Comunidad (IDEM) salvo donde se dice. Bajados por Claude el
# 15-oct (carpeta en PROTECCION_LOCAL_15OCT).
IDEM = "https://idem.madrid.org/cartografia/planea/planeamiento/planeamiento/"
PAD15 = os.environ.get("PROTECCION_LOCAL_15OCT", "")
DOCS_15OCT = [
    ("ARANJUEZ", 1, "Catálogo (PGOU 1996): normas de protección y arqueología", "Arqueología: capítulo 6, áreas A, B, C y D (págs. 21-27)",
     "catalogos-proteccion/aranjuez/normas-proteccion-y-arqueologia.pdf", IDEM + "Aranjuez/Vigente/catalogo_001_1.pdf", "aranjuez/catalogo_001_1.pdf"),
    ("ARANJUEZ", 2, "Catálogo: edificios monumentales", None,
     "catalogos-proteccion/aranjuez/edificios-monumentales.pdf", IDEM + "Aranjuez/Vigente/catalogo_001_2.pdf", "aranjuez/catalogo_001_2.pdf"),
    ("ARANJUEZ", 3, "Catálogo: elementos singulares", None,
     "catalogos-proteccion/aranjuez/elementos-singulares.pdf", IDEM + "Aranjuez/Vigente/catalogo_002.pdf", "aranjuez/catalogo_002.pdf"),
] + [
    ("ARANJUEZ", 3 + n, "Inventario de rehabilitación (%d de 5)" % n, "Fichas de edificios residenciales del casco",
     "catalogos-proteccion/aranjuez/inventario-rehabilitacion-%d.pdf" % n, IDEM + "Aranjuez/Vigente/catalogo_00%d.pdf" % (n + 2),
     "aranjuez/catalogo_00%d.pdf" % (n + 2))
    for n in range(1, 6)
] + [
    ("ARANJUEZ", 9, "Catálogo: sitios históricos y paseos arbolados", None,
     "catalogos-proteccion/aranjuez/sitios-y-paseos.pdf", IDEM + "Aranjuez/Vigente/catalogo_008.pdf", "aranjuez/catalogo_008.pdf"),
    ("ARANJUEZ", 10, "Catálogo: jardines históricos", None,
     "catalogos-proteccion/aranjuez/jardines.pdf", IDEM + "Aranjuez/Vigente/catalogo_009.pdf", "aranjuez/catalogo_009.pdf"),
    ("ARANJUEZ", 11, "Plano de protección del patrimonio (I)", "Área arqueológica sombreada, sin separar A-D",
     "catalogos-proteccion/aranjuez/plano-proteccion-1.pdf", IDEM + "Aranjuez/Vigente/planos_ordenacion_024.pdf", "aranjuez/planos_ordenacion_024.pdf"),
    ("GETAFE", 1, "Catálogo (PGOU 2003): introducción y listado", None,
     "catalogos-proteccion/getafe/catalogo-listado.pdf", IDEM + "Getafe/Vigente/CATALOGO_1.PDF", "getafe/CATALOGO_1.PDF"),
    ("GETAFE", 2, "Catálogo: fichas 1-10", None,
     "catalogos-proteccion/getafe/catalogo-fichas-1-10.pdf", IDEM + "Getafe/Vigente/CATALOGO_2.PDF", "getafe/CATALOGO_2.PDF"),
    ("GETAFE", 3, "Catálogo: fichas 11-20", None,
     "catalogos-proteccion/getafe/catalogo-fichas-11-20.pdf", IDEM + "Getafe/Vigente/CATALOGO_3.PDF", "getafe/CATALOGO_3.PDF"),
    ("GETAFE", 4, "Normas urbanísticas, Título IV", "Arqueología: arts. 120-122 (págs. 161-165 del PDF)",
     "catalogos-proteccion/getafe/normas-titulo-iv.pdf", "https://sede.getafe.es/portalGetafe/sede/RecursosWeb/DOCUMENTOS/1/0_11361_1.pdf",
     "getafe/sede_11361.pdf"),
    ("PARLA", 1, "Catálogo del Plan General (1997)", "7 edificios del casco",
     "catalogos-proteccion/parla/catalogo.pdf", IDEM + "Parla/Vigente/catalogo.pdf", "parla/catalogo.pdf"),
    ("PINTO", 1, "Catálogo (Revisión PGOU 2002)", "Arqueología: capítulo 4 (págs. 36-42 del PDF); el plano O-6.B no está",
     "catalogos-proteccion/pinto/catalogo.pdf", IDEM + "Pinto/Vigente/CATALOGO.PDF", "pinto/CATALOGO.PDF"),
    ("PINTO", 2, "Plano O-8: catálogo", None,
     "catalogos-proteccion/pinto/plano-catalogo.pdf", IDEM + "Pinto/Vigente/PLANOS_ORDENACION_22.PDF", "pinto/PLANOS_ORDENACION_22.PDF"),
    ("TORREJON DE ARDOZ", 1, "Normas urbanísticas (versión del Ayuntamiento, con el catálogo)",
     "Catálogo al final (págs. 281-298); arqueología: art. 29 bis (págs. 159-165)",
     "catalogos-proteccion/torrejon-de-ardoz/normas-urbanisticas.pdf",
     "https://www.ayto-torrejon.es/sites/default/files/intranet//MiPaginaDescargas/143_3.%20NORMAS%20URBANISTICAS.pdf",
     "torrejon/ayto_normas_urbanisticas.pdf"),
    ("TORREJON DE ARDOZ", 2, "Catálogo de bienes protegidos (visor, 1999)", None,
     "catalogos-proteccion/torrejon-de-ardoz/catalogo-visor.pdf", IDEM + "Torrejon_de_Ardoz/Vigente/CATALOGO_004.pdf", "torrejon/CATALOGO_004.pdf"),
    ("TORREJON DE ARDOZ", 3, "Descatalogación de Ctra. de Loeches 22-28 (BOCM 2014)", None,
     "catalogos-proteccion/torrejon-de-ardoz/descatalogacion-ctra-loeches.pdf",
     "https://www.ayto-torrejon.es/sites/default/files/intranet//MiPaginaDescargas/"
     "251_publicacion%20bocm%20aprob.def.modific.%20carretera%20loeches%2022%20a%2028.pdf",
     "torrejon/descatalogacion-ctra-loeches-22-28.pdf"),
]


def local(nombre):
    return nombre if os.path.isabs(nombre) else os.path.join(PAD, nombre)


if __name__ == "__main__":
    escribir = sys.argv[1:] == ["escribir"]
    b = arrancar()
    ya = {f["fichero"] for f in b.leer("documentos_referencia?select=fichero&seccion=eq.proteccion")}
    todos = [d + (BAJADO, REVISAR, local) for d in DOCS] + \
        [d + ("2026-10-15", "2027-04-15", lambda n: os.path.join(PAD15, n)) for d in DOCS_15OCT]
    for municipio, orden, titulo, desc, fichero, url, fl, bajado, revisar, donde in todos:
        tam = os.path.getsize(donde(fl)) if fl and fichero not in ya else None
        print(municipio, "|", titulo, "|", "subir %.1f MB" % (tam / 1e6) if tam else "ya en el almacen", "|", "fila ya" if fichero in ya else "fila nueva")
        if not escribir or fichero in ya:
            continue
        if fl:
            b.subir("referencia", fichero, open(donde(fl), "rb").read(), reemplazar=True)
        b.insertar("documentos_referencia", [{
            "seccion": "proteccion", "municipio": municipio, "orden": orden, "titulo": titulo,
            "descripcion": desc, "fichero": fichero, "nombre_fichero": fichero.rsplit("/", 1)[1],
            "tipo_mime": "application/pdf", "tamano": tam, "url_origen": url,
            "descargado_en": bajado, "revisar_en": revisar, "subido_por": "Claude (con Monica)",
        }])
    if not escribir:
        print("(solo mirar; para cargar: escribir)")
