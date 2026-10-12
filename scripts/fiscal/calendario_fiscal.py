"""Calendario fiscal (Monica, 12-oct-2026): genera el SQL de las obligaciones
fiscales de Accesalia, Ecobalance y Daniel de Soto autonomo, y sus vencimientos
de 2026 y 2027.

El estado de lo ya pasado sale del Excel de control de Monica
(G:/Mi unidad/MONICA ACCESALIA/DECLARACIONES - HACIENDA/Control Hacienda -
Vista por empresas.xlsx): OK = presentado. Lo fraccionado, de los PDF de
aplazamiento de las carpetas de declaraciones (sus plazos quedan por leer).

No escribe en la base: deja el SQL en la ruta que se le pase. Relanzable (on
conflict do nothing).

    python scripts/fiscal/calendario_fiscal.py <salida.sql>
"""
import re
import sys
from datetime import date, timedelta

import openpyxl

EXCEL = "G:/Mi unidad/MONICA ACCESALIA/DECLARACIONES - HACIENDA/Control Hacienda - Vista por empresas.xlsx"
HOJA_EXCEL = {"accesalia": "ACCESALIA", "ecobalance": "ECOBALANCE", "daniel_autonomo": "DANIEL"}
HOY = date(2026, 10, 12)

# Festivos nacionales que pueden caer en un plazo (los plazos pasan al siguiente dia habil).
FESTIVOS = {date(2026, 1, 1), date(2026, 1, 6), date(2026, 4, 3), date(2026, 5, 1), date(2026, 8, 15),
            date(2026, 10, 12), date(2026, 12, 8), date(2026, 12, 25),
            date(2027, 1, 1), date(2027, 1, 6), date(2027, 3, 26), date(2027, 8, 16), date(2027, 10, 12),
            date(2027, 11, 1), date(2027, 12, 6), date(2027, 12, 8)}


def habil(d):
    return d.weekday() < 5 and d not in FESTIVOS


def siguiente_habil(d):
    while not habil(d):
        d += timedelta(days=1)
    return d


def ultimo_habil(anio, mes):
    d = date(anio + (mes == 12), mes % 12 + 1, 1) - timedelta(days=1)
    while not habil(d):
        d -= timedelta(days=1)
    return d


def fin_de_mes(anio, mes):
    return date(anio + (mes == 12), mes % 12 + 1, 1) - timedelta(days=1)


# (empresa, modelo, nombre, organismo, periodicidad, plazo, domiciliado, presenta, notas)
SOCIEDAD = [
    ("303", "IVA trimestral", "aeat", "trimestral", "1-20 de abril, julio y octubre; 1-30 de enero el 4T", True, "gestoria", None),
    ("111", "Retenciones de nóminas y profesionales", "aeat", "trimestral", "1-20 de abril, julio, octubre y enero", True, "gestoria", None),
    ("115", "Retenciones del alquiler del local", "aeat", "trimestral", "1-20 de abril, julio, octubre y enero", True, "gestoria", None),
    ("202", "Pago a cuenta del Impuesto de Sociedades", "aeat", "cuando_toque", "1-20 de abril, octubre y diciembre", True, "gestoria",
     "Toca si el ultimo Impuesto de Sociedades salio a pagar (Monica, 12-oct-2026: sale a pagar): 18 % de esa cuota."),
    ("349", "Operaciones intracomunitarias", "aeat", "cuando_toque", "1-20 de abril, julio y octubre; 1-30 de enero el 4T", False, "gestoria",
     "Solo si hay compras o ventas con la UE. No se hacen: el del 1T-2026 fue un caso excepcional, un error (debio hacerse con otra empresa)."),
    ("390", "Resumen anual del IVA", "aeat", "anual", "1-30 de enero", False, "gestoria", "Informativa: no se paga."),
    ("190", "Resumen anual de retenciones", "aeat", "anual", "1-31 de enero", False, "gestoria", "Informativa: no se paga."),
    ("180", "Resumen anual de retenciones del alquiler", "aeat", "anual", "1-31 de enero", False, "gestoria", "Informativa: no se paga."),
    ("347", "Operaciones con terceros (más de 3.005 euros)", "aeat", "anual", "1-28 de febrero", False, "gestoria", "Informativa: no se paga."),
    ("200", "Impuesto de Sociedades", "aeat", "anual", "1-25 de julio", True, "gestoria", None),
    ("CUENTAS", "Depósito de las cuentas anuales", "registro", "anual", "Hasta el 30 de julio (un mes despues de aprobarlas, antes del 30 de junio)", False, "gestoria",
     "Balance y cuenta de perdidas y ganancias, en el Registro Mercantil."),
    ("SS", "Seguros sociales", "tgss", "mensual", "Se cargan el ultimo dia habil del mes siguiente", True, "cargo_automatico", None),
]
OBLIGACIONES = (
    [("accesalia",) + o for o in SOCIEDAD]
    + [("accesalia", "IVTM", "Impuesto de circulación de los 4 coches", "ayuntamiento", "anual",
        "Madrid: 1 de abril a 30 de junio", True, "cargo_automatico",
        "Cuatro coches de empresa (Ford, Zoe, Jeep y Yaris), en Madrid (Monica cree). Tres a nombre de Accesalia; "
        "el Yaris, a nombre de un particular, pero es de la empresa y lo paga ella. Dia del cargo domiciliado por confirmar.")]
    + [("ecobalance",) + o for o in SOCIEDAD if o[0] not in ("115", "180", "349")]
    + [("daniel_autonomo",) + o for o in [
        ("303", "IVA trimestral", "aeat", "trimestral", "1-20 de abril, julio y octubre; 1-30 de enero el 4T", True, "gestoria", None),
        ("130", "Pago a cuenta del IRPF", "aeat", "trimestral", "1-20 de abril, julio y octubre; 1-30 de enero el 4T", True, "gestoria", None),
        ("390", "Resumen anual del IVA", "aeat", "anual", "1-30 de enero", False, "gestoria", "Informativa: no se paga."),
        ("347", "Operaciones con terceros (más de 3.005 euros)", "aeat", "anual", "1-28 de febrero", False, "gestoria", "Informativa: no se paga."),
        ("100", "Renta (IRPF anual)", "aeat", "anual", "Abril a 30 de junio (domiciliada, hasta el 25 de junio)", True, "gestoria", None),
        ("RETA", "Cuota de autónomo", "tgss", "mensual", "Se carga el ultimo dia habil de cada mes", True, "cargo_automatico", None),
    ]]
)
# Lo que el Excel de control no lleva (o lleva en blanco) solo se genera de hoy en adelante.
SOLO_FUTURO = {"SS", "RETA", "IVTM", "202"}

# Fraccionados que dicen las carpetas de declaraciones (el nombre del PDF lo dice).
FRACCIONADOS = {
    ("accesalia", "303", 2025, "3T"): "ACCESALIA/2025/303 IVA trimestral/fraccionamiento ivas accesalia 3T25.pdf",
    ("accesalia", "303", 2026, "2T"): "ACCESALIA/2026/303 IVA trimestral/aplazamiento parcial Accesalia 2t26.pdf",
    ("daniel_autonomo", "303", 2026, "1T"): "DANIEL/2026/303 IVA trimestral/Aplazamiento Daniel de Soto 303 1t 26.pdf",
    ("daniel_autonomo", "130", 2026, "1T"): "DANIEL/2026/130 IRPF PAGO FRACCIONADO trimestral/aplazamientos/Aplazamiento Daniel de Soto 130 1t 26.pdf",
    ("ecobalance", "200", 2025, "ANUAL"): "ECOBALANCE fin y rrhh/DECLARACIONES - HACIENDA Ecobalance/2025/200 IS anual - presentar 2026/APROBACION Y CALENDARIO FRACCIONAMIENTO.pdf",
}

# Plazos de cada aplazamiento, leidos de su PDF de concesion: (fecha de cargo, principal, intereses).
PLAZOS = {
    ("accesalia", "303", 2025, "3T"): [("2025-12-22", 5135.14, 34.86), ("2026-01-20", 5135.14, 52.58), ("2026-02-20", 5135.14, 70.30),
        ("2026-03-20", 5135.14, 86.30), ("2026-04-20", 5135.14, 104.02), ("2026-05-20", 5135.14, 121.17),
        ("2026-06-22", 5135.14, 138.89), ("2026-07-20", 5135.14, 156.03), ("2026-08-20", 5135.21, 173.75)],
    ("accesalia", "303", 2026, "2T"): [("2026-09-21", 5787.76, 39.94), ("2026-10-20", 5787.76, 59.27), ("2026-11-20", 5787.76, 79.23),
        ("2026-12-21", 5787.76, 98.56), ("2027-01-20", 5787.76, 118.53), ("2027-02-22", 5787.80, 138.50)],
    ("daniel_autonomo", "303", 2026, "1T"): [("2026-06-22", 2532.73, 17.20), ("2026-07-20", 2532.73, 25.65), ("2026-08-20", 2532.73, 34.39),
        ("2026-09-22", 2532.73, 43.13), ("2026-10-20", 2532.73, 51.59), ("2026-11-20", 2532.74, 60.33)],
    ("daniel_autonomo", "130", 2026, "1T"): [("2026-06-22", 613.62, 4.17), ("2026-07-20", 613.62, 6.22), ("2026-08-20", 613.62, 8.33),
        ("2026-09-22", 613.62, 10.45), ("2026-10-20", 613.62, 12.50), ("2026-11-20", 613.67, 14.62)],
    ("ecobalance", "200", 2025, "ANUAL"): [("2026-09-22", 3416.24, 20.91), ("2026-10-20", 3416.24, 32.32), ("2026-11-20", 3416.24, 44.11),
        ("2026-12-21", 3416.24, 55.51), ("2027-01-20", 3416.24, 67.30), ("2027-02-22", 3416.24, 79.09), ("2027-03-22", 3416.24, 89.73),
        ("2027-04-20", 3416.24, 101.52), ("2027-05-20", 3416.24, 112.93), ("2027-06-21", 3416.24, 124.72), ("2027-07-20", 3416.24, 136.12),
        ("2027-08-20", 3416.30, 147.91)],
}


def vencimientos(modelo, ejercicio):
    """(periodo, fecha_limite, fecha_domiciliacion) de un ejercicio."""
    s = siguiente_habil
    if modelo in ("303", "111", "115", "130", "349"):
        cuarto = 30 if modelo in ("303", "130", "349") else 20
        out = [(f"{t}T", s(date(ejercicio, m, 20)), s(date(ejercicio, m, 15))) for t, m in ((1, 4), (2, 7), (3, 10))]
        out.append(("4T", s(date(ejercicio + 1, 1, cuarto)), s(date(ejercicio + 1, 1, 25 if cuarto == 30 else 15))))
        return out
    if modelo == "202":
        return [(f"{p}P", s(date(ejercicio, m, 20)), s(date(ejercicio, m, 15))) for p, m in ((1, 4), (2, 10), (3, 12))]
    if modelo == "390":
        return [("ANUAL", s(date(ejercicio + 1, 1, 30)), None)]
    if modelo in ("190", "180"):
        return [("ANUAL", s(date(ejercicio + 1, 1, 31)), None)]
    if modelo == "347":
        return [("ANUAL", s(fin_de_mes(ejercicio + 1, 2)), None)]
    if modelo == "200":
        return [("ANUAL", s(date(ejercicio + 1, 7, 25)), s(date(ejercicio + 1, 7, 20)))]
    if modelo == "CUENTAS":
        return [("ANUAL", s(date(ejercicio + 1, 7, 30)), None)]
    if modelo == "100":
        return [("ANUAL", s(date(ejercicio + 1, 6, 30)), s(date(ejercicio + 1, 6, 25)))]
    if modelo == "IVTM":
        return [("ANUAL", s(date(ejercicio, 6, 30)), None)]
    if modelo == "SS":
        return [(f"{m:02d}", ultimo_habil(ejercicio + (m == 12), m % 12 + 1), None) for m in range(1, 13)]
    if modelo == "RETA":
        return [(f"{m:02d}", ultimo_habil(ejercicio, m), None) for m in range(1, 13)]
    raise ValueError(modelo)


def estados_excel():
    """{(empresa, modelo, ejercicio, periodo): valor de la celda}"""
    wb = openpyxl.load_workbook(EXCEL, data_only=True)
    out = {}
    for empresa, hoja in HOJA_EXCEL.items():
        anios = None
        for fila in wb[hoja].iter_rows(values_only=True):
            if fila[1] == "Modelo / periodo":
                anios = fila
                continue
            m = re.match(r"^\s*([A-Z0-9]+)\W+(\w+)\s*$", str(fila[1] or ""))  # "111 \u00b7 T1"
            if not anios or not m:
                continue
            modelo, per = m.groups()
            per = {"Anual": "ANUAL"}.get(per, per)
            per = per[1] + per[0] if per[:1] in ("T", "P") else per  # T1 -> 1T, P1 -> 1P
            if modelo in ("PYG", "BAL"):
                modelo = "CUENTAS"
            for anio, valor in zip(anios[3:], fila[3:]):
                if isinstance(anio, int) and valor:
                    out[(empresa, modelo, anio, per)] = str(valor).strip()
    return out


def q(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def main(salida):
    excel = estados_excel()
    obligaciones = [
        f"({q(emp)}, {q(mod)}, {q(nom)}, {q(org)}, {q(per)}, {q(plazo)}, {q(dom)}, {q(pres)}, {i + 1}, {q(notas)})"
        for i, (emp, mod, nom, org, per, plazo, dom, pres, notas) in enumerate(OBLIGACIONES)]
    filas, cuenta = [], {}
    for emp, mod, *_ in OBLIGACIONES:
        for ejercicio in (2025, 2026, 2027):
            for periodo, limite, domic in vencimientos(mod, ejercicio):
                if not (date(2026, 1, 1) <= limite <= date(2027, 12, 31)) and (emp, mod, ejercicio, periodo) not in FRACCIONADOS:
                    continue
                if mod in SOLO_FUTURO and limite < HOY:
                    continue
                valor = excel.get((emp, mod, ejercicio, periodo))
                if mod == "349" and valor is None:
                    continue  # solo cuando hubo operaciones
                estado, origen, nota = "previsto", "calendario", None
                if valor == "OK":
                    estado, origen = "presentado", "excel_control"
                elif valor == "BORRADOR":
                    estado, origen = "borrador", "excel_control"
                elif valor == "xxxx":
                    estado, origen = "no_aplica", "excel_control"
                elif valor and valor.startswith("FALTA"):
                    nota, origen = "En el Excel de control figura como FALTA.", "excel_control"
                elif valor is None and limite < HOY:
                    nota = "Ya vencido y sin dato en el Excel de control: confirmar."
                pdf = FRACCIONADOS.get((emp, mod, ejercicio, periodo))
                if pdf:
                    estado, nota = "fraccionado", f"Fraccionado o aplazado: {pdf}"
                cuenta[estado] = cuenta.get(estado, 0) + 1
                filas.append(f"({q(emp)}, {q(mod)}, {ejercicio}, {q(periodo)}, {q(limite.isoformat())}, "
                             f"{q(domic.isoformat() if domic else None)}, {q(estado)}, {q(origen)}, {q(nota)})")
    sql = [
        "-- Generado por scripts/fiscal/calendario_fiscal.py",
        "insert into obligaciones_fiscales (empresa, modelo, nombre, organismo, periodicidad, plazo, domiciliado, presenta, orden, notas) values",
        ",\n".join(obligaciones), "on conflict do nothing;",
        "insert into vencimientos_fiscales (obligacion_id, ejercicio, periodo, fecha_limite, fecha_domiciliacion, estado, origen, notas)",
        "select o.id, v.ejercicio, v.periodo, v.limite::date, v.domic::date, v.estado, v.origen, v.nota",
        "from (values", ",\n".join(filas),
        ") as v (empresa, modelo, ejercicio, periodo, limite, domic, estado, origen, nota)",
        "join obligaciones_fiscales o on o.empresa = v.empresa and o.modelo = v.modelo",
        "on conflict do nothing;",
        # Los ya vencidos, pagados (Monica, 12-oct-2026: "estan pagados seguro").
        "insert into vencimiento_plazos (vencimiento_id, numero, fecha, importe, estado, pagado_en, notas)",
        f"select v.id, p.numero, p.fecha::date, p.importe,",
        f"  case when p.fecha::date < {q(HOY.isoformat())} then 'pagado' else 'pendiente' end,",
        f"  case when p.fecha::date < {q(HOY.isoformat())} then p.fecha::date end, p.nota",
        "from (values", ",\n".join(
            f"({q(e)}, {q(m)}, {a}, {q(per)}, {n}, {q(f)}, {round(pr + it, 2)}, {q(f'Principal {pr:.2f} + intereses {it:.2f} (PDF de concesion)')})"
            for (e, m, a, per), lista in PLAZOS.items() for n, (f, pr, it) in enumerate(lista, 1)),
        ") as p (empresa, modelo, ejercicio, periodo, numero, fecha, importe, nota)",
        "join obligaciones_fiscales o on o.empresa = p.empresa and o.modelo = p.modelo",
        "join vencimientos_fiscales v on v.obligacion_id = o.id and v.ejercicio = p.ejercicio and v.periodo = p.periodo",
        "on conflict do nothing;",
    ]
    open(salida, "w", encoding="utf-8").write("\n".join(sql) + "\n")
    print(len(OBLIGACIONES), "obligaciones;", sum(cuenta.values()), "vencimientos", cuenta)


if __name__ == "__main__":
    main(sys.argv[1])
