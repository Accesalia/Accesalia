# -*- coding: utf-8 -*-
r"""
OPPS QUE PARECEN LA MISMA, EN SECO  (Monica, 20-oct-2026)

Opps vivas (no anuladas) que comparten portales vivos (relacion_oportunidad_accesos
con hasta nulo): los mismos, o los de una dentro de los de la otra. Se juntan en
GRUPOS (Palomares 75-77-79 son cuatro opps, no seis parejas).

De cada opp se saca lo que pide el encargo: apertura, estado, hojas, presupuestos y
proformas, facturas (con emisor y año: «Daniel 2023/1-86»), notas del diario,
citas, carpeta de Dropbox y tipo de obra (el de las hojas y el «Tipo de obra:» de
origen_notas), y si alguna memoria o script ya la nombra.

NO ESCRIBE en la base. Deja docs/opps/opps_duplicadas_en_seco.xlsx con la
propuesta de cada grupo, que es la de PROPUESTA (abajo), puesta a mano leyendo.

Uso:
    python scripts/opps_duplicadas_en_seco.py           # el Excel
    python scripts/opps_duplicadas_en_seco.py --volcar  # ademas, todo en texto
"""
import glob
import io
import os
import re
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import openpyxl  # noqa: E402
from openpyxl.styles import Alignment, Font, PatternFill  # noqa: E402

from produccion import arrancar  # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "docs", "opps", "opps_duplicadas_en_seco.xlsx")
MEMORIA = os.path.expanduser(r"~\.claude\projects\c--Users-mfavi-ACCESALIA\memory")

EMISOR = {"daniel": "Daniel", "accesalia": "Accesalia", "ecobalance": "Ecobalance"}


def en(ids):
    return "in.(%s)" % ",".join(sorted(ids))


def por_tandas(base, plantilla, ids, n=60):
    ids, filas = sorted(ids), []
    for i in range(0, len(ids), n):
        filas += base.leer(plantilla % en(ids[i:i + n]))
    return filas


def tipo_de_obra(origen):
    """El «Tipo de obra:» de origen_notas, sin lo tachado (~~...~~)."""
    m = re.search(r"Tipo de obra:\s*(.+?)(?:\.\s|\n|$)", origen or "")
    if not m:
        return ""
    return re.sub(r"~~.*?~~\s*(?:\([^)]*\))?\s*(?:->)?\s*", "", m.group(1)).strip()


def citada_en(codigos):
    """Ficheros de memoria y scripts que ya nombran cada codigo."""
    sitios = glob.glob(os.path.join(MEMORIA, "*.md")) + glob.glob(os.path.join(RAIZ, "scripts", "**", "*.py"), recursive=True)
    yo = os.path.abspath(__file__)
    hits = defaultdict(list)
    for f in sitios:
        if os.path.abspath(f) == yo:
            continue
        try:
            txt = io.open(f, encoding="utf-8", errors="ignore").read()
        except OSError:
            continue
        for c in codigos:
            if c and c in txt:
                hits[c].append(os.path.basename(f))
    return hits


def grupos(rel):
    """Opps que comparten portales, por componentes, con la condicion de que en
       cada pareja los portales de una esten todos en la otra."""
    por_opp = defaultdict(set)
    for r in rel:
        por_opp[r["opp_id"]].add(r["acceso_id"])
    por_acc = defaultdict(set)
    for o, accs in por_opp.items():
        for a in accs:
            por_acc[a].add(o)
    padre = {}

    def raiz(x):
        while padre.get(x, x) != x:
            x = padre[x]
        return x
    parejas = set()
    for opps in por_acc.values():
        for a in opps:
            for b in opps:
                if a < b:
                    sa, sb = por_opp[a], por_opp[b]
                    if sa <= sb or sb <= sa:
                        parejas.add((a, b))
                        padre[raiz(a)] = raiz(b)
    comp = defaultdict(set)
    for a, b in parejas:
        comp[raiz(a)].update((a, b))
    return list(comp.values()), por_opp, parejas


def recoger(base):
    opps = base.leer("oportunidades?select=id,codigo,nombre,estado,fecha_apertura,comunidad_id,"
                     "comercial_id,dropbox_carpeta,dropbox_ficha,origen_notas&estado=neq.anulada")
    vivas = {o["id"]: o for o in opps}
    rel = [r for r in base.leer("relacion_oportunidad_accesos?select=opp_id,acceso_id&hasta=is.null")
           if r["opp_id"] in vivas]
    gs, por_opp, parejas = grupos(rel)
    ids = set().union(*gs)
    accs = {a["id"]: a for a in por_tandas(base, "accesos?select=id,tipo_via,nombre_via,numero,escalera,municipio&id=%s",
                                            set().union(*(por_opp[o] for o in ids)))}
    com = {c["id"]: c["nombre"] for c in base.leer("comerciales?select=id,nombre")}
    cps = {c["id"]: c for c in por_tandas(base, "comunidades?select=id,nombre,cif_comunidad&id=%s",
                                           {vivas[o]["comunidad_id"] for o in ids if vivas[o]["comunidad_id"]})}
    hojas = por_tandas(base, "hojas_encargo?select=id,oportunidad_id,numero_hoja,codigo_anterior,estado,fecha_firma,"
                             "descripcion,tipo_documento,emisor&oportunidad_id=%s", ids)
    tipos = {t["id"]: t["nombre"] for t in base.leer("tipos_proyecto?select=id,nombre")}
    conc = por_tandas(base, "conceptos_hoja?select=hoja_encargo_id,tipo_proyecto_id&hoja_encargo_id=%s",
                      {h["id"] for h in hojas}) if hojas else []
    tipos_hoja = defaultdict(set)
    for c in conc:
        if c["tipo_proyecto_id"]:
            tipos_hoja[c["hoja_encargo_id"]].add(tipos[c["tipo_proyecto_id"]])
    facts = por_tandas(base, "facturas?select=oportunidad_id,empresa_emisora,anio,serie,numero,total,estado&oportunidad_id=%s", ids)
    notas = por_tandas(base, "notas_oportunidad?select=oportunidad_id,fecha,texto,origen&oportunidad_id=%s", ids)
    citas = por_tandas(base, "citas?select=oportunidad_id,inicio,asunto&oportunidad_id=%s", ids)
    ppto = por_tandas(base, "presupuestos?select=oportunidad_id,codigo,empresa_emisora,anio,numero&oportunidad_id=%s", ids)
    prof = por_tandas(base, "proformas?select=oportunidad_id,codigo&oportunidad_id=%s", ids)

    def de(filas):
        d = defaultdict(list)
        for f in filas:
            d[f["oportunidad_id"]].append(f)
        return d
    H, F, N, C, P, PF = de(hojas), de(facts), de(notas), de(citas), de(ppto), de(prof)
    citas_en = citada_en([vivas[o]["codigo"] for o in ids])

    fichas = {}
    for o in ids:
        v = vivas[o]
        cp = cps.get(v["comunidad_id"]) or {}
        fichas[o] = {
            "id": o, "codigo": v["codigo"] or "", "nombre": v["nombre"] or v["codigo"] or "",
            "estado": v["estado"], "apertura": v["fecha_apertura"] or "",
            "comercial": com.get(v["comercial_id"], ""),
            "comunidad": cp.get("nombre", ""), "cif": cp.get("cif_comunidad") or "", "comunidad_id": v["comunidad_id"],
            "carpeta": v["dropbox_carpeta"] or "", "ficha": v["dropbox_ficha"] or "",
            "tipo_obra": tipo_de_obra(v["origen_notas"]), "origen": v["origen_notas"] or "",
            "portales": sorted(" ".join(x for x in (accs[a]["nombre_via"], accs[a]["numero"],
                                                    ("esc. " + accs[a]["escalera"]) if accs[a]["escalera"] else "") if x)
                               for a in por_opp[o]),
            "accesos": por_opp[o],
            "hojas": ["%s%s %s%s%s" % (h["numero_hoja"] or h["codigo_anterior"] or "(sin código)",
                                       " (antes %s)" % h["codigo_anterior"] if h["codigo_anterior"] and h["numero_hoja"] else "",
                                       h["estado"],
                                       " firmada " + h["fecha_firma"] if h["fecha_firma"] else "",
                                       ": " + "/".join(sorted(tipos_hoja[h["id"]])) if tipos_hoja[h["id"]] else
                                       (": " + (h["descripcion"] or "")[:60] if h["descripcion"] else ""))
                      for h in sorted(H[o], key=lambda h: h["numero_hoja"] or "")],
            "facturas": ["%s %s/%s-%s (%s €)" % (EMISOR.get(f["empresa_emisora"], f["empresa_emisora"]), f["anio"],
                                                f["serie"], f["numero"], f["total"])
                         for f in sorted(F[o], key=lambda f: (f["empresa_emisora"], f["anio"], f["numero"]))],
            "ppto": [p["codigo"] or "%s %s/%s" % (p["empresa_emisora"], p["anio"], p["numero"]) for p in P[o]],
            "proformas": [p["codigo"] for p in PF[o]],
            "notas": sorted(N[o], key=lambda n: n["fecha"] or ""),
            "citas": C[o],
            "citada_en": citas_en.get(v["codigo"], []),
        }
    return gs, fichas, parejas


def volcar(gs, fichas):
    for g in sorted(gs, key=lambda g: min(fichas[o]["nombre"] for o in g)):
        print("=" * 100)
        for o in sorted(g, key=lambda o: fichas[o]["apertura"]):
            f = fichas[o]
            print("%s | %s | %s | %s | %s | %s (%s)" % (f["codigo"], f["nombre"], f["estado"], f["apertura"],
                                                          f["comercial"], f["comunidad"], f["cif"]))
            print("   portales:", "; ".join(f["portales"]))
            print("   carpeta:", f["carpeta"], "| tipo de obra:", f["tipo_obra"])
            print("   hojas:", f["hojas"], "| ppto:", f["ppto"], "| proformas:", f["proformas"])
            print("   facturas:", f["facturas"], "| citas:", len(f["citas"]), "| citada en:", f["citada_en"])
            print("   origen:", f["origen"][:500].replace("\n", " "))
            for n in f["notas"][-4:]:
                print("   nota %s: %s" % (n["fecha"], (n["texto"] or "")[:160].replace("\n", " ")))


# --------------------------------------------------------------------------
# LA PROPUESTA, grupo a grupo, puesta a mano leyendo el volcado (20-oct-2026).
# (bloque, se queda, se anulan, por que / pregunta)
#   SEGURO  = el mismo encargo dos veces, o una vacia del mismo momento
#   VIEJA   = una de las dos vacia y de otro año: una sola respuesta para todas
#   DUDA    = para Monica
#   DOS     = dos encargos distintos: se quedan las dos
# --------------------------------------------------------------------------
SEGURO, VIEJA, DUDA, DOS = "Duplicada seguro", "Una vacía, de otro año", "Duda", "Dos encargos distintos"

PROPUESTA = [
    # ---- duplicadas seguro
    (SEGURO, "DAN-2023-225", ["DAN-2023-227"], "Mismo día (6-7-2023), mismo ascensor, lo trae Vicente Real (FAIN). Dos carpetas con el nombre escrito distinto: plazadealmuñecar9 y pzalmuñecar9."),
    (SEGURO, "DAN-2023-199", ["DAN-2023-198"], "Mismo día (5-6-2023), sustitución de puertas, Juan Paramio (FAIN). Dos carpetas: plazaarteijo14 y pzarteijo14. Se queda la cerrada porque dice cómo acabó (perdida: «buscará otro arquitecto»)."),
    (SEGURO, "DAN-2023-013", ["DAN-2023-012"], "Mismo día, lo trae Óscar López (FAIN). La carpeta de la 012 tiene la errata «mediguchia»; se queda la que tiene la carpeta bien escrita."),
    (SEGURO, "DAN-2023-205", ["DAN-2023-216"], "La 216 solo tiene la cita de la agenda de Daniel del 29-6-2023 («david a av de la onu 76»); misma carpeta. La 205 tiene el SATE firmado (HE-2023-0038)."),
    (SEGURO, "DAN-2025-393", ["CAR-2025-069"], "La 069 está cerrada y vacía, abierta 10 días antes. OJO: la 393 cuelga también de un portal «Camino Viejo de Leganés 237, LEGANÉS» con la misma referencia catastral que el de Madrid: ese portal sobra."),
    (SEGURO, "DAN-2025-298", ["CAR-2025-024"], "La 024 está vacía (solo la nota del comercial). La 298 tiene las hojas de ascensor y subvenciones, pero no tiene carpeta: le pasa la de la 024 (GETAFE/plazajimenezdiaz7)."),
    (SEGURO, "DAN-2023-290", ["DAN-2024-170"], "La 170 está vacía: una sola nota que dice «Comunidad autónoma: Comunidad de Madrid»."),
    (SEGURO, "DAN-2025-151", ["ALV-2026-211"], "La 211 no tiene hoja ni nada más que una nota: la subvención Rehabilita 2026 que presentó Del Brío y Blanco el 3-6-2026. La subvención firmada de este ascensor es la HE-2025-0172, en la 151."),
    (SEGURO, "DAN-2022-291", ["DAN-2023-065"], "La 065 está vacía; su nota del 10-3-2023 (presupuesto Next Generation, lo trae Ángel Farelo) es la misma propuesta que ya sigue en la 291, que acaba con el abono de jun-2023. Se queda la cerrada."),
    (SEGURO, "ALV-2026-130", ["DAN-2024-284"], "La de 2024 está vacía. Misma administradora (Raquel Maestro, AGA Antonaya) y el mismo ascensor que se retoma en 2026."),
    (SEGURO, "ALV-2026-131", ["DAN-2024-285"], "Igual que el 13: la de 2024 está vacía; misma administradora y el mismo ascensor."),
    # ---- una vacia de otro año (una sola respuesta para todas)
    (VIEJA, "DAN-2022-074", ["DAN-2017-139"], "Las dos vacías. Mismo contacto (Loli, 620 82 93 45): en 2017-2020 con Thyssen, en 2022 el peritaje y los dos ascensores."),
    (VIEJA, "DAN-2026-104", ["DAN-2023-220"], "La de 2023 es el ascensor que no salió (presentación 3D, sin hoja); en 2026 lo retoma Iberlean y está firmado."),
    (VIEJA, "DAN-2023-244", ["DAN-2017-134"], "La de 2017 (Thyssen) está vacía; la de 2023 ya lo cuenta: «visto en 2017 con Thyssen»."),
    (VIEJA, "DAN-2025-204", ["DAN-2015-017"], "La de 2015 está vacía (fotos y presupuestos de ascensor); el ascensor de 2025 (CEGA) está firmado."),
    (VIEJA, "DAN-2021-015", ["DAN-2016-062"], "Las dos cerradas y vacías, misma carpeta: Thyssen en 2016, INVER en 2021."),
    (VIEJA, "ALV-2026-123", ["DAN-2021-026"], "La de 2021 está vacía (papeles de un proyecto de otro arquitecto); el ascensor de 2026 tiene sus hojas."),
    (VIEJA, "DAN-2022-156", ["DAN-2016-114"], "La de 2016 (Thyssen) está vacía y lleva copiada la nota del 4-5-2022 de la 156."),
    (VIEJA, "ALV-2026-186", ["DAN-2017-068"], "La de 2017 (Thyssen) está vacía: «igual que Riojanos 5 bis»."),
    (VIEJA, "DAN-2023-153", ["DAN-2016-104"], "La de 2016 está vacía y lleva copiadas tres notas de 2025-2026 que ya están en la 153."),
    (VIEJA, "DAN-2023-084", ["DAN-2016-090"], "La de 2016 (Enor) está vacía; la de 2023 es el SATE y la fotovoltaica."),
    (VIEJA, "DAN-2016-185", ["DAN-2019-037"], "Aquí la vacía es la nueva: «rehabilitación» de 2019, con solo dos PDF de Catastro. La de 2016 tiene los ascensores y su factura."),
    (VIEJA, "DAN-2016-023", ["DAN-2015-032"], "Las dos cerradas y vacías. La de 2015 no tiene ficha; la de 2016 tiene la oferta de Enor del ascensor."),
    # ---- dudas
    (DUDA, "", [], "La de 2023 es solo el portal 7; su nota (6-7-2023, Vicente Real, FAIN) está también en la de 2019 (portales 6 y 7). ¿Es el mismo ascensor? Si lo es, la 226 se junta en la 013."),
    (DUDA, "", [], "Mismo día, mismo Thyssen, mismo edificio (tres escaleras), pero dos huecos distintos (1240×1290 y 1500×1480) y dos carpetas (castro2 y travesiadecastro2). ¿Son dos escaleras distintas? Si no, se juntan."),
    (DUDA, "", [], "La 148 es la carpeta «paseodeextremadura244duplicado» y su ficha dice «CP Paseo Extremadura 244 BIS». ¿Es otro edificio, el 244 bis? En la base cuelgan del mismo portal."),
    (DUDA, "", [], "Las dos del 30-3-2023, Schindler, ascensor. Pero la 159 dice «Madrid, distrito Centro, CP 28004» (carpeta MADRID/sanonofre7) y la 160 es la travesía de San Sebastián de los Reyes. ¿Son dos edificios? Si sí, la 159 está colgada del portal equivocado."),
    (DUDA, "", [], "Mismo día y las mismas notas copiadas en las dos: una tiene la hoja del ascensor (HE-2025-0268) y la otra la de subvenciones (HE-2026-0120). Es el caso «proyecto + su subvención»: el 1-oct dijiste que eran dos opps; el 19-oct, que la subvención es otra hoja dentro de la misma opp. ¿Se juntan?"),
    (DUDA, "", [], "La 445 nació de la hoja HE-2025-0728, que pone «Málaga 8»; la 250 tiene la HE-2025-0727, correlativa. ¿Málaga 8 es otro edificio o una errata de la hoja?"),
    (DUDA, "", [], "La del conjunto (33, 35 y 37) está vacía; las siete hojas están en la del 37. ¿Hay un encargo del conjunto o la 041 sobra (se anularía por error)?"),
    (DUDA, "", [], "Misma carpeta («1. informe pericial») y mismo vecino (Fabio Aceto). La de 2019 es el informe pericial de viabilidad de la escalera G (enviado en ene-2022); la de 2025 tiene firmado un informe pericial (HE-2025-0434) y abarca seis escaleras. ¿Es el mismo informe que siguió?"),
    (DUDA, "", [], "Mismo día. La 024 (portal 19, ascensor) está vacía y dice ser «aparte de la rampa conjunta», pero la hoja de ascensor y subvenciones (HE-2026-0021) está en la 005, junto a la rampa. ¿Esa hoja es la del ascensor del 19 y pasa a la 024, o la 024 sobra?"),
    (DUDA, "", [], "La de 2024 está vacía, pero es el expediente de legalización (Disciplina Urbanística, nº 350/2024/35589), subcarpeta «exp legalizacion». ¿Es otro encargo, como la rampa de Emilio Castelar 4, o lo mismo?"),
    (DUDA, "", [], "La 313 (cubierta del garaje, firmada) y la 060 (conjunto con Ferroviarios 9 y 11, otra comunidad) son distintas. La 240 y la 315 están cerradas y vacías, son de la misma comunidad (la del garaje) y son la misma propuesta de ascensores, SATE y fotovoltaica entre sep-2022 y oct-2023. Tú separaste la 315 de la 240 el 11-oct. ¿Se juntan (la 240 en la 315) o la 240 guarda otra cosa?"),
    (DUDA, "", [], "No son duplicadas, pero hay que mirarlo: un conjunto (084, comunidad sin CIF) y cuatro por portal (082, 085, 086 y 087, cada una con su CIF); las cinco tienen su hoja de 3 presupuestos de arreglo de cubierta, todas firmadas el 11-5-2026. Salamanca 1 no tiene opp propia. ¿La del conjunto es la de la mancomunidad de la cubierta?"),
    (DUDA, "", [], "Son dos encargos (ascensor y SATE), pero en la del SATE están la HE-2022-0015 «Ascensor» y seis facturas con los mismos importes que las de la subvención del ascensor: Accesalia 2022/1-218 y 2022/1-219, 2023/1-58 y 2023/1-59, 2024/1-263 y 2024/1-264 (en la del ascensor están las 2022/1-220, 2023/1-57 y 2024/1-262: tres portales). ¿Pasan a la del ascensor?"),
    # ---- dos encargos distintos
    (DOS, "", [], "Lo dijiste tú el 18-oct: el proyecto de ascensor de 2023 y la rampa de 2025."),
    (DOS, "", [], "Lo dijiste tú el 6-oct: el SATE con proyecto externo de 2021 y el ascensor de 2026."),
    (DOS, "", [], "Lo dijiste tú el 18-oct: la mejora de accesibilidad de 2021 y la rampa del 37 bis de 2025."),
    (DOS, "", [], "Lo dijiste tú el 18-oct: la memoria valorada de 2021 y la bajada a cota cero de 2024."),
    (DOS, "", [], "Lo dijiste tú el 6-oct: la petición de un vecino de 2023 y la consulta vinculante con Elecnor de 2025. (Las notas de 2025 están copiadas también en la de 2023.)"),
    (DOS, "", [], "Lo dijiste tú el 6-oct: la plataforma de 2021 y la legalización de la rampa exterior de 2024."),
    (DOS, "", [], "Lo dijiste tú: «se guardan como dos opps y el conflicto se resuelve» (Román, vecino, para CEGA en 2025; Pepe Antón, Schindler, en 2026)."),
    (DOS, "", [], "Lo dijiste tú el 18-oct: la memoria valorada de 2021 (Elecnor) y el SATE de 2024."),
    (DOS, "", [], "Lo dijiste tú el 18-oct: el cambio de entrada del ascensor de 2021 y el SATE de 2024."),
    (DOS, "", [], "Lo dijiste tú el 18-oct: la IEE de 2021 y el SATE de 2026."),
    (DOS, "", [], "Lo dijiste tú el 18-oct: la obra del ascensor de 2021 y el libro del edificio de 2025."),
    (DOS, "", [], "Lo dijiste tú el 18-oct: el cálculo de deflexiones de 2021 (FAIN) y la subvención y el SATE de 2022."),
    (DOS, "", [], "Lo dijiste tú el 18-oct: la coordinación de seguridad del ascensor de 2020 y el SATE de 2024."),
    (DOS, "", [], "Lo dijiste tú el 5-oct: la rampa de 2024 y el ascensor (plataforma) de 2026."),
    (DOS, "", [], "Lo dijiste tú el 6-oct: el SATE con cubierta de 2022 (Matedecon) y la dirección de obra del SATE de 2025 (Arrialsi)."),
    (DOS, "", [], "La demolición de la vivienda (2022) y el proyecto de vallas de la parcela (2023), las dos de Ostalazar."),
    (DOS, "", [], "El proyecto de SATE de 2021 y el informe de carga del patio de 2023; cada una con sus facturas."),
    (DOS, "", [], "El ascensor y la subvención de 2021 (con sus facturas) y el SATE que retoman en 2025. (La hoja del SATE de 2022 que se canceló, HE-2021-0001, está en la del ascensor.)"),
    (DOS, "", [], "La reforma del local (2019) y su licencia de funcionamiento (2022), las dos de FAIN; y el SATE y la caldera de la comunidad (2023)."),
    (DOS, "", [], "El ascensor (2015-2020, obra terminada) y el SATE con aerotermia de 2022. (Dos notas están copiadas en las dos.)"),
    (DOS, "", [], "La accesibilidad de 2024 y el SATE de 2025, cada una con su hoja firmada."),
    (DOS, "", [], "Dos informes de foso reducido: el del ascensor principal (2022) y el del ascensor de servicio (2026). (Las notas de 2026 están copiadas en la de 2022.)"),
    (DOS, "", [], "El SATE de 2023 y la accesibilidad de 2025, cada una con su hoja firmada."),
    (DOS, "", [], "El ascensor que paga CEGA y el levantamiento del ático, que pide otro estudio de arquitectura."),
    (DOS, "", [], "El ascensor de 2021 y el SATE de 2023, cada una con sus hojas y facturas."),
    (DOS, "", [], "El SATE de 2019 y las humedades que salieron después del SATE (2025)."),
]

# Las dudas y las distintas no llevan «se queda»: se casan con su grupo por estos
# codigos, en el mismo orden en que van arriba.
CODIGOS_SIN_QUEDA = [
    ["DAN-2019-013", "DAN-2023-226"], ["DAN-2016-209", "DAN-2016-212"], ["DAN-2016-148", "DAN-2016-193"],
    ["DAN-2023-159", "DAN-2023-160"], ["DAN-2025-206", "DAN-2025-207"], ["DAN-2024-250", "DAN-2025-445"],
    ["DAN-2026-041", "DAN-2026-133"], ["DAN-2019-053", "CAR-2025-007"], ["ALV-2026-005", "DAN-2026-024"],
    ["DAN-2016-005", "DAN-2024-273"], ["DAN-2022-240", "DAN-2023-315", "DAN-2024-313", "DAN-2026-060"],
    ["DAN-2026-082", "DAN-2026-084", "DAN-2026-085", "DAN-2026-086", "DAN-2026-087"], ["DAN-2019-049", "DAN-2022-104"],
    ["DAN-2023-316", "DAN-2025-125"], ["DAN-2021-079", "ALV-2026-019"], ["DAN-2021-148", "CAR-2025-088"],
    ["DAN-2021-145", "DAN-2024-162"], ["DAN-2023-143", "DAN-2025-149"], ["DAN-2021-075", "DAN-2024-050"],
    ["DAN-2025-127", "ALV-2026-050"], ["DAN-2021-150", "DAN-2024-030"], ["DAN-2021-146", "DAN-2024-019"],
    ["DAN-2021-147", "DAN-2026-234"], ["DAN-2021-141", "DAN-2025-390"], ["DAN-2021-152", "DAN-2022-276"],
    ["DAN-2020-079", "DAN-2024-081"], ["DAN-2024-195", "DAN-2026-047"], ["DAN-2022-229", "DAN-2025-416"],
    ["DAN-2022-180", "DAN-2023-299"], ["DAN-2021-094", "DAN-2023-036"], ["DAN-2021-114", "DAN-2025-297"],
    ["DAN-2019-054", "DAN-2022-269", "DAN-2023-093"], ["DAN-2015-024", "DAN-2022-218"], ["DAN-2024-117", "DAN-2025-182"],
    ["DAN-2022-073", "DAN-2026-025"], ["DAN-2023-255", "DAN-2025-025"], ["DAN-2024-191", "DAN-2024-286"],
    ["DAN-2021-077", "DAN-2023-212"], ["DAN-2019-034", "DAN-2025-228"],
]


def casar(gs, fichas):
    """Cada grupo con su propuesta. Si un grupo se queda sin propuesta, o una
       propuesta sin grupo, se para: no se entrega nada a medias."""
    por_cod = {f["codigo"]: o for o, f in fichas.items()}
    sin_queda = iter(CODIGOS_SIN_QUEDA)
    casados = []
    for bloque, queda, anula, texto in PROPUESTA:
        cods = [queda] + anula if queda else next(sin_queda)
        ids = {por_cod[c] for c in cods}
        g = [g for g in gs if ids <= g]
        if len(g) != 1 or g[0] != ids:
            raise SystemExit("La propuesta de %s no casa con un grupo entero" % cods)
        casados.append((bloque, queda, anula, texto, g[0]))
    sobran = [g for g in gs if not any(g == c[4] for c in casados)]
    if sobran:
        raise SystemExit("Grupos sin propuesta: %s" % [[fichas[o]["codigo"] for o in g] for g in sobran])
    return casados


def notas_repetidas(fichas, de, a):
    ya = {((n["fecha"] or ""), (n["texto"] or "").strip()) for n in fichas[a]["notas"]}
    return sum(1 for n in fichas[de]["notas"] if ((n["fecha"] or ""), (n["texto"] or "").strip()) in ya)


def resumen_opp(f):
    trozos = ["%s · abierta el %s · %s" % (f["codigo"], f["apertura"] or "¿?", f["estado"])]
    if f["tipo_obra"]:
        trozos.append("Obra: " + f["tipo_obra"][:140])
    trozos.append("Hojas: " + ("; ".join(f["hojas"]) if f["hojas"] else "ninguna"))
    if f["facturas"]:
        trozos.append("Facturas: " + "; ".join(f["facturas"]))
    if f["ppto"]:
        trozos.append("Presupuestos: %d" % len(f["ppto"]))
    trozos.append("Notas: %d · Citas: %d" % (len(f["notas"]), len(f["citas"])))
    trozos.append("Carpeta: " + (f["carpeta"] or "sin carpeta"))
    return "\n".join(trozos)


def excel(casados, fichas):
    wb = openpyxl.Workbook()
    neg, ajuste = Font(bold=True), Alignment(wrap_text=True, vertical="top")
    gris = PatternFill("solid", fgColor="EEEEEE")
    cuenta = defaultdict(int)
    for c in casados:
        cuenta[c[0]] += 1

    ws = wb.active
    ws.title = "Resumen"
    filas = [
        ["Opps que comparten los mismos portales (20-oct-2026). EN SECO: no se ha escrito nada."],
        [],
        ["Duplicada seguro", cuenta[SEGURO], "Se anula una y lo suyo pasa a la otra."],
        ["Una vacía, de otro año", cuenta[VIEJA], "Una sola respuesta para todas: ¿se juntan en la que tiene contenido?"],
        ["Duda", cuenta[DUDA], "Una pregunta por caso."],
        ["Dos encargos distintos", cuenta[DOS], "Se quedan las dos. Casi todas las separaste tú."],
        [],
        ["Cómo se arregla una duplicada: con la función de anular por duplicada que ya tiene la app. Pasan a la que se queda las notas, citas, documentos,"],
        ["viabilidades, tareas, correos y demás; la anulada se suelta de los portales y queda con estado anulada, la fecha, quién y de cuál es duplicada."],
        ["Ninguna de las que se anularían tiene hojas, presupuestos ni facturas, así que no hay que mover nada de dinero."],
        ["La que se queda conserva su fecha de apertura. Si no tiene carpeta de Dropbox, se le pone la de la anulada (solo pasa en Jiménez Díaz 7)."],
    ]
    for f in filas:
        ws.append(f)
    ws["A1"].font = neg
    for col, w in zip("ABC", (24, 8, 80)):
        ws.column_dimensions[col].width = w

    for bloque in (SEGURO, VIEJA, DUDA, DOS):
        ws = wb.create_sheet(bloque[:31])
        cab = ["Edificio", "Propuesta", "Por qué / pregunta", "Opp 1", "Opp 2", "Más opps", "Tu respuesta"]
        ws.append(cab)
        for c in ws[1]:
            c.font, c.fill = neg, gris
        for b, queda, anula, texto, g in casados:
            if b != bloque:
                continue
            ops = sorted(g, key=lambda o: (fichas[o]["apertura"] or "", fichas[o]["codigo"]))
            nombre = fichas[ops[-1]]["nombre"]
            if queda:
                por_cod = {fichas[o]["codigo"]: o for o in g}
                rep = sum(notas_repetidas(fichas, por_cod[a], por_cod[queda]) for a in anula)
                prop = "Se queda %s. Se anula %s." % (queda, ", ".join(anula))
                if rep:
                    prop += " (%d nota%s de la anulada ya está%s igual en la otra.)" % (rep, "s" if rep > 1 else "", "n" if rep > 1 else "")
            else:
                prop = "Se quedan todas." if bloque == DOS else "Para ti."
            res = [resumen_opp(fichas[o]) for o in ops]
            ws.append([nombre, prop, texto, res[0], res[1], "\n\n".join(res[2:]), ""])
        for col, w in zip("ABCDEFG", (26, 26, 60, 48, 48, 48, 30)):
            ws.column_dimensions[col].width = w
        for fila in ws.iter_rows(min_row=2):
            for c in fila:
                c.alignment = ajuste
        ws.freeze_panes = "B2"

    ws = wb.create_sheet("Todas las opps")
    ws.append(["Grupo", "Código", "Nombre", "Apertura", "Estado", "Comercial", "Comunidad", "CIF", "Portales",
               "Carpeta de Dropbox", "Tipo de obra", "Hojas", "Facturas", "Presupuestos", "Notas", "Citas", "Propuesta"])
    for c in ws[1]:
        c.font, c.fill = neg, gris
    for i, (b, queda, anula, texto, g) in enumerate(casados, 1):
        for o in sorted(g, key=lambda o: fichas[o]["apertura"] or ""):
            f = fichas[o]
            que = ("se queda" if f["codigo"] == queda else "se anula" if f["codigo"] in anula else b.lower())
            ws.append([i, f["codigo"], f["nombre"], f["apertura"], f["estado"], f["comercial"], f["comunidad"], f["cif"],
                       "; ".join(f["portales"]), f["carpeta"], f["tipo_obra"], "; ".join(f["hojas"]),
                       "; ".join(f["facturas"]), len(f["ppto"]), len(f["notas"]), len(f["citas"]), que])
    ws.freeze_panes = "C2"
    ws.auto_filter.ref = ws.dimensions
    for col, w in zip("ABCDEFGHIJKLMNOPQ", (6, 14, 34, 11, 9, 10, 30, 11, 30, 34, 40, 50, 40, 6, 6, 6, 18)):
        ws.column_dimensions[col].width = w

    wb.save(SALIDA)
    return cuenta


if __name__ == "__main__":
    gs, fichas, parejas = recoger(arrancar())
    print(len(gs), "grupos,", len(parejas), "parejas,", len(fichas), "opps")
    if "--volcar" in sys.argv:
        volcar(gs, fichas)
    cuenta = excel(casar(gs, fichas), fichas)
    print(dict(cuenta), "->", SALIDA)
