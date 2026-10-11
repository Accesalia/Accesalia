# -*- coding: utf-8 -*-
"""
LAS VACACIONES DE 2026, DEL EXCEL DE RRHH A LA APP (Monica, 11-oct-2026).

Fuente: Drive, carpeta "vacaciones", "INTERNO vacaciones 2026.xlsx" (lo lleva
Alexandra). Una fila por persona y una columna por dia; el TIPO de dia va por
COLOR (hoja LEYENDA), no por texto:
  verde    vacaciones disfrutadas          -> ausencia aprobada, a cuenta de 2026
  amarillo vacaciones solicitadas          -> aprobada: "los de Navidad son
                                              pre-aprobados; si estan marcados, es
                                              que los cogieron" (Monica)
  azul     a cargo del año anterior        -> aprobada, a cuenta de 2025
  naranja  cierre de oficina               -> el calendario de la empresa, no la
                                              persona (la app ya lo descuenta)
  rosa     permiso retribuido              -> permiso_retribuido (no hay ninguno)
  rojo     no laborable                    -> festivo en el calendario (entre semana)
  negro    contrato no en vigor            -> se ignora

Decisiones suyas:
  - 23 dias en 2026; a quien entro este año, la parte que pone el propio Excel.
  - Maria y Carla, 84 h de compensacion cada una (jornada de 8 h).
  - Fuera: Ana Baraibar, Ernesto y Carlos Sepulveda (ex empleados, liquidados).
  - Beatriz empezo el 3-oct (parte proporcional); Oscar es externo: ficha sin
    vacaciones. A los dos se les crea la ficha de RRHH vacia.

  python scripts/rrhh_vacaciones_2026.py ver        -> solo enseña lo que haria
  python scripts/rrhh_vacaciones_2026.py escribir   -> lo carga en produccion
"""
import sys, os, datetime as dt, collections
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import openpyxl
from produccion import arrancar

EXCEL = sys.argv[2] if len(sys.argv) > 2 else os.path.join(AQUI, '..', 'vac2026.xlsx')
ORIGEN = 'Del Excel de RRHH "INTERNO vacaciones 2026" (Drive), cargado el 11-oct-2026.'
COLOR = {'FFFF0000': 'no_lab', 'FFFF9900': 'cierre', 'FFFFFF00': 'solicitada', 'FF00FF00': 'disfrutada',
         'FFFF00FF': 'permiso', 'FF4A86E8': 'anio_ant', 'FF000000': 'sin_contrato', 'FF660000': 'festivo_local'}

# Excel -> equipo.id. Comprobado uno a uno el 11-oct.
PERSONAS = {
    'DANIEL': 'c0cb1c89-8a84-4ded-8e54-708f68360b55', 'MONICA': '52fa7b0f-e72b-4338-b3f8-7ad0833a8ba7',
    'ANA SANTAMARTA': 'c13eee9c-3a2c-4874-93ff-921b8dace681', 'CARLA': '1c285016-c3c6-481f-b520-b4885be32406',
    'ISRAEL': '5a23973f-c7ad-4d9c-95f3-d107a8061f75', 'ALEX': 'df785c88-4ee8-41e2-b7b2-06ba12f453a8',
    'ALEJANDRA': '8772a14e-a371-448e-a13b-6357dfb027bf', 'MARIA': '1f46b8a3-be12-4174-85c3-0b58a677a3c2',
    'ALEXANDRA': '1a6d5258-ea8d-4bcd-ae03-163bf8649151', 'ADRIANA': '9a846dca-1c6d-45ee-804b-4e33d0ac410e',
    'ALEJANDRO B.': 'a7178793-f00d-40d9-9706-652593a7a3df', 'CARLOS DAZA': '9b227534-aae3-482c-a945-87441a21914b',
    'JACOB': '16ecae1a-6888-46a4-a226-0926e68d8a08', 'ABRAHAM': '6ba9ee7c-c335-48f5-a3cf-167985ccb724',
    'ALVARO': 'd61681e7-d776-4bfb-9168-33343bc695a8', 'IVAN': 'e2b15579-4cb0-4ecb-8418-e297fde578b3',
    'MARTA LA HOZ': '2456b5cd-7bce-41c9-aae1-c05ede8b98f2', 'ANGELA ACEVEDO': 'c3ee89d2-026b-4926-90b8-cd9ed23b36f9',
    'CLARIBEL SALAZAR': '6b9804ae-7c72-4f90-a842-7d14d9e7be70', 'JHONATAN': '070d1979-1648-49ea-b570-b55bc02bc0ed',
}
SALTAR = {'ANA BARAIBAR', 'ERNESTO', 'CARLOS SEPULVEDA'}
INACTIVOS = {'JHONATAN'}  # sus dias si, su saldo no: ya no trabaja aqui
BEATRIZ = '206e03ae-0ebd-4b1c-9859-8a96ec6a1698'
OSCAR = '52d28e3a-2701-4dae-8dd9-893fbb7756b3'
# Quien entro este año: el derecho que pone el Excel ("calculo dias vacaciones"),
# y Beatriz con la misma formula (23 x dias que quedan / 365).
INICIO = {'IVAN': '2026-07-20', 'MARTA LA HOZ': '2026-05-04', 'ANGELA ACEVEDO': '2026-06-02', 'CLARIBEL SALAZAR': '2026-08-17'}
DERECHO = {'IVAN': 10, 'MARTA LA HOZ': 15, 'ANGELA ACEVEDO': 14, 'CLARIBEL SALAZAR': 9}
COMPENSACION = {'MARIA': 84, 'CARLA': 84}


def leer_excel():
    ws = openpyxl.load_workbook(EXCEL)['2026']
    hdr = [ws.cell(row=1, column=c).value for c in range(1, ws.max_column + 1)]
    ccal = hdr.index('calculo dias vacaciones') + 1
    fecha = lambda c: dt.date(2026, 1, 1) + dt.timedelta(days=c - 3)
    dias = {}       # nombre -> {fecha: categoria}
    festivos = collections.Counter()
    cierre = collections.Counter()
    for r in range(2, ws.max_row + 1):
        nom = ws.cell(row=r, column=1).value
        if not nom or not str(nom).strip():
            continue
        nom = str(nom).strip()
        suyo = {}
        for c in range(3, ccal):
            f = ws.cell(row=r, column=c).fill
            rgb = f.fgColor.rgb if f.fill_type == 'solid' and isinstance(f.fgColor.rgb, str) else None
            cat = COLOR.get(rgb)
            d = fecha(c)
            if cat == 'no_lab' and d.weekday() < 5:
                festivos[d] += 1
            if cat == 'cierre':
                cierre[d] += 1
            if cat:
                suyo[d] = cat
        dias[nom] = suyo
    # Un festivo o un cierre lo es para la empresa: el de casi todos (no el de uno).
    festivos = sorted(d for d, n in festivos.items() if n >= 10)
    cierre_empresa = sorted(d for d, n in cierre.items() if n >= 10)
    return dias, festivos, cierre_empresa


def tramos(fechas, no_laborables):
    """Agrupa dias laborables seguidos en tramos (desde, hasta, n). Un fin de
    semana o un festivo en medio no corta el tramo."""
    fechas = sorted(fechas)
    out = []
    for d in fechas:
        if out:
            desde, hasta, n = out[-1]
            hueco = [hasta + dt.timedelta(days=i) for i in range(1, (d - hasta).days)]
            if all(x.weekday() >= 5 or x in no_laborables for x in hueco):
                out[-1] = (desde, d, n + 1)
                continue
        out.append((d, d, 1))
    return out


def preparar():
    dias, festivos, cierre = leer_excel()
    no_lab = set(festivos)
    ausencias = []
    for nom, suyo in dias.items():
        if nom in SALTAR or nom not in PERSONAS:
            continue
        por = collections.defaultdict(list)
        for d, cat in suyo.items():
            if d.weekday() >= 5 or d in no_lab:
                continue
            if cat == 'cierre' and d in cierre:
                continue  # va en el calendario de la empresa
            if cat in ('disfrutada', 'solicitada', 'cierre'):  # un "cierre" de uno solo es vacacion suya
                por[('vacaciones', 2026)].append(d)
            elif cat == 'anio_ant':
                por[('vacaciones', 2025)].append(d)
            elif cat == 'permiso':
                por[('permiso_retribuido', 2026)].append(d)
        # MARIA COGIO EL CIERRE EN JULIO (Monica, 11-oct-2026): "cogio los dias,
        # pero en julio; esta mal apuntado, pero los consumio". El cierre de agosto
        # ya se le descuenta por el calendario de la empresa, asi que esos dias de
        # julio se apuntan como "otra" -quedan registrados- y no descuentan dos veces.
        if nom == 'MARIA':
            julio = [d for d in por[('vacaciones', 2026)] if dt.date(2026, 7, 17) <= d <= dt.date(2026, 7, 31)]
            por[('vacaciones', 2026)] = [d for d in por[('vacaciones', 2026)] if d not in julio]
            for desde, hasta, n in tramos(julio, no_lab):
                ausencias.append({'persona_id': PERSONAS[nom], 'tipo': 'otra', 'desde': str(desde), 'hasta': str(hasta),
                                  'dias': n, 'estado': 'aprobada', 'a_cuenta_de': 2026,
                                  'notas': 'Cierre de oficina de agosto, cogido en julio (Monica, 11-oct-2026). ' + ORIGEN,
                                  '_quien': nom})
        for (tipo, cuenta), fs in por.items():
            for desde, hasta, n in tramos(fs, no_lab):
                ausencias.append({'persona_id': PERSONAS[nom], 'tipo': tipo, 'desde': str(desde), 'hasta': str(hasta),
                                  'dias': n, 'estado': 'aprobada', 'a_cuenta_de': cuenta, 'notas': ORIGEN,
                                  '_quien': nom})
    saldos = []
    for nom, pid in PERSONAS.items():
        if nom in INACTIVOS:
            continue
        saldos.append({'persona_id': pid, 'anio': 2026, 'dias_derecho': DERECHO.get(nom, 23), 'dias_arrastrados': 0,
                       'horas_compensacion': COMPENSACION.get(nom, 0), 'notas': ORIGEN, '_quien': nom})
    restan = (dt.date(2026, 12, 31) - dt.date(2026, 10, 3)).days + 1
    saldos.append({'persona_id': BEATRIZ, 'anio': 2026, 'dias_derecho': round(23 * restan / 365), 'dias_arrastrados': 0,
                   'horas_compensacion': 0, 'notas': 'Empezo el 3-oct-2026: parte proporcional de 23.', '_quien': 'BEATRIZ'})
    contratos = [{'persona_id': PERSONAS[n], 'desde': f, 'tipo': None, 'notas': 'Fecha de inicio segun el Excel de vacaciones 2026.'}
                 for n, f in INICIO.items()]
    contratos.append({'persona_id': BEATRIZ, 'desde': '2026-10-03', 'tipo': None, 'notas': 'Empezo el 3-oct-2026 (Monica).'})
    contratos.append({'persona_id': OSCAR, 'desde': '2026-10-15', 'tipo': 'externo',
                      'notas': 'Externo (freelance): sin vacaciones, no es empleado. Empieza el 15-oct-2026 (Monica).'})
    calendario = [{'fecha': str(d), 'tipo': 'festivo', 'descripcion': 'No laborable (Excel de vacaciones 2026)'} for d in festivos]
    calendario += [{'fecha': str(d), 'tipo': 'cierre_obligatorio', 'descripcion': 'Cierre de oficina de agosto'} for d in cierre]
    fichas = [{'persona_id': BEATRIZ, 'notas': 'Empezo el 3-oct-2026. Ficha creada vacia el 11-oct: faltan DNI, direccion e IBAN.'},
              {'persona_id': OSCAR, 'notas': 'Externo (freelance), empieza el 15-oct-2026. Ficha creada vacia el 11-oct.'}]
    return ausencias, saldos, contratos, calendario, fichas


def limpio(filas):
    return [{k: v for k, v in f.items() if not k.startswith('_')} for f in filas]


if __name__ == '__main__':
    modo = sys.argv[1] if len(sys.argv) > 1 else 'ver'
    aus, sal, con, cal, fic = preparar()
    print('CALENDARIO:', len(cal), 'dias ->', ', '.join(f"{c['fecha']} {c['tipo'][:6]}" for c in cal))
    print('CONTRATOS (fecha de inicio):', [(c['persona_id'][:8], c['desde']) for c in con])
    print('SALDOS 2026:')
    for s in sal:
        print('  ', s['_quien'].ljust(18), 'derecho', s['dias_derecho'], ' compensacion', s['horas_compensacion'], 'h')
    print('AUSENCIAS:', len(aus), 'tramos')
    por = collections.defaultdict(list)
    for a in aus:
        por[a['_quien']].append(f"{a['desde'][5:]}..{a['hasta'][5:]}({a['dias']}{'*2025' if a['a_cuenta_de'] == 2025 else ''})")
    for q, l in por.items():
        tot = sum(a['dias'] for a in aus if a['_quien'] == q and a['a_cuenta_de'] == 2026)
        print('  ', q.ljust(18), f'{tot:>3} dias de 2026 |', ' '.join(l))
    if modo != 'escribir':
        print('\n(modo ver: no se ha escrito nada)')
        sys.exit(0)
    b = arrancar()
    if b.leer('rrhh_ausencias?select=id', por_tramos=False) or b.leer('rrhh_saldo_vacaciones?select=id', por_tramos=False):
        raise SystemExit('Ya hay ausencias o saldos cargados: no se vuelve a cargar encima.')
    # Se puede relanzar si se corta: lo que ya esta, no se repite.
    if not b.leer('rrhh_anios?select=anio&anio=eq.2026', por_tramos=False):
        b.insertar('rrhh_anios', [{'anio': 2026, 'dias_vacaciones': 23, 'notas': '4 de Semana Santa, 10 de agosto, 4 de Navidad por turnos y 5 a elegir (Excel de RRHH).'}])
    if not b.leer('rrhh_calendario?select=id&limit=1', por_tramos=False):
        b.insertar('rrhh_calendario', cal)
    if not b.leer('rrhh_contratos?select=id&limit=1', por_tramos=False):
        b.insertar('rrhh_contratos', con)
    b.insertar('rrhh_saldo_vacaciones', limpio(sal))
    b.insertar('rrhh_ausencias', limpio(aus))
    b.insertar('rrhh_datos_personales', fic)
    print('\nCARGADO.')
