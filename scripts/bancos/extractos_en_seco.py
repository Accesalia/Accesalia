# -*- coding: utf-8 -*-
"""LOS EXTRACTOS DEL BANCO, EN SECO (Monica, 21-oct-2026).

"Poder decir como se mueve el dinero": facturacion, ingresos, flujo de caja, y de ahi los gastos para las previsiones.
Cuentas: Accesalia = La Caixa ...0278980 + BBVA ...2149 (la del prestamo); Daniel = La Caixa ...0191207. 2025 y 2026.

1. COSER. Ella descarga la Caixa por tramos que se pisan (al 17-06, al 30-06...). Cada fila trae el saldo, asi que se
   cosen por la cadena de saldos: saldo = saldo anterior + importe. Donde no cuadra, se dice (falta un trozo).
2. CASAR cada movimiento, diciendo SIEMPRE por que:
   - FATIR<n> = remesa de recibos -> su Excel "Gestion Entregas" (n -> titular + "fac 279-2026") -> la factura.
     PR.FA<n> = la comision de esa remesa. DETIR<n> = devolucion de esa remesa; PR.DE<n> = sus gastos.
   - otros ingresos -> un cobro de la app del mismo importe y +-7 dias (justificantes ya subidos).
   - gastos -> sus Excel de gastos para la gestoria (mismo total, +-20 dias): su TIPO, no uno inventado.
   - internos: Accesalia <-> Daniel y Caixa -> BBVA (mismo importe, sale de una y entra en la otra, +-3 dias).
   - lo que el propio banco dice (nomina, Hacienda, SS, prestamo, cajero) se marca con esa palabra y su regla.
   Lo demas: SIN IDENTIFICAR. No se adivina.

SOLO LEE. Escribe un Excel para que ella lo revise; en la base no toca nada.

  python scripts/bancos/extractos_en_seco.py <carpeta_entrada> <excel_salida>
  carpeta_entrada: caixa_acc/*.xls  caixa_dan/*.xls  bbva_acc/*.xlsx  remesas/{acc,dan}_{2025,2026}.xlsx
                   gastos/{acc,dan}_{2025,2026}.xlsx
"""
import sys, os, re, glob, datetime, collections, io, warnings
import pandas as pd
import openpyxl
warnings.filterwarnings("ignore")
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

LINEA_CREDITO = 50000   # Monica, 21-oct: la Caixa de Accesalia tiene una linea de credito de 50.000 (por eso va en negativo)
DESDE, HASTA = datetime.date(2025, 1, 1), datetime.date(2026, 12, 31)
CUENTAS = {  # clave -> (empresa, nombre que se ve)
    'caixa_acc': ('accesalia', 'Accesalia · Caixa …0278980'),
    'bbva_acc': ('accesalia', 'Accesalia · BBVA …2149'),
    'caixa_dan': ('daniel', 'Daniel · Caixa …0191207'),
}


def d(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    if isinstance(v, datetime.datetime):
        return v.date()
    if isinstance(v, datetime.date):
        return v
    s = str(v).strip()
    for f in ('%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y'):
        try:
            return datetime.datetime.strptime(s[:10], f).date()
        except ValueError:
            pass
    return None


def n(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    if isinstance(v, (int, float)):
        return round(float(v), 2)
    s = str(v).replace('EUR', '').replace('.', '').replace(',', '.').strip()
    try:
        return round(float(s), 2)
    except ValueError:
        return None


def txt(v):
    return '' if v is None or (isinstance(v, float) and pd.isna(v)) else str(v).strip()


# ---------------------------------------------------------------- 1. leer y coser
def leer_caixa(f):
    x = pd.read_excel(f, header=None)
    filas = []
    for _, r in x.iloc[3:].iterrows():
        fe, im, sa = d(r[0]), n(r[4]), n(r[5])
        if fe is None or im is None:
            continue
        filas.append(dict(fecha=fe, fecha_valor=d(r[1]), movimiento=txt(r[2]), mas_datos=txt(r[3]),
                          importe=im, saldo=sa, ref=''))
    return list(reversed(filas))  # el banco las da de la mas nueva a la mas vieja


def leer_bbva(f):
    x = pd.read_excel(f, header=None)
    ini = next(i for i in range(len(x)) if txt(x.iloc[i, 2]).upper().startswith('F. CONTABLE')) + 1
    filas = []
    for _, r in x.iloc[ini:].iterrows():
        fe, im = d(r[2]), n(r[8])
        if fe is None or im is None:
            continue
        filas.append(dict(fecha=fe, fecha_valor=d(r[3]), movimiento=txt(r[5]),
                          mas_datos=' · '.join(t for t in (txt(r[6]), txt(r[7])) if t),
                          importe=im, saldo=n(r[9]), ref=txt(r[12])))
    return list(reversed(filas))


def clave(r):
    return (r['fecha'], r['fecha_valor'], r['movimiento'], r['importe'], r['saldo'])


def encadena(prev, r):
    return prev is None or abs(round(prev['saldo'] + r['importe'], 2) - r['saldo']) < 0.011


def coser(tramos):
    """tramos: [(fichero, filas cronologicas)]. Devuelve (filas, informe)."""
    tramos = [t for t in tramos if t[1]]
    tramos.sort(key=lambda t: (t[1][0]['fecha'], -len(t[1])))
    f0, acc = tramos.pop(0)
    for r in acc:
        r['fichero'] = f0
    informe = [(f0, acc[0]['fecha'], acc[-1]['fecha'], len(acc), 'base')]
    while tramos:
        ult = clave(acc[-1])
        mejor = None
        for i, (f, filas) in enumerate(tramos):
            pos = [j for j, r in enumerate(filas) if clave(r) == ult]
            if pos and (mejor is None or filas[-1]['fecha'] > tramos[mejor[0]][1][-1]['fecha']):
                mejor = (i, pos[-1] + 1, 'pisa')
        if mejor is None:  # no se pisan: que el primero encadene con el saldo
            for i, (f, filas) in enumerate(tramos):
                if filas[0]['fecha'] >= acc[-1]['fecha'] and encadena(acc[-1], filas[0]):
                    mejor = (i, 0, 'empalma por saldo')
                    break
        if mejor is None:
            restantes = [i for i, (f, filas) in enumerate(tramos) if filas[-1]['fecha'] > acc[-1]['fecha']]
            if not restantes:
                break
            i = min(restantes, key=lambda i: tramos[i][1][0]['fecha'])
            mejor = (i, 0, 'HUECO: no encadena')
        i, desde, como = mejor
        f, filas = tramos.pop(i)
        nuevas = filas[desde:]
        for r in nuevas:
            r['fichero'] = f
        if nuevas:
            informe.append((f, nuevas[0]['fecha'], nuevas[-1]['fecha'], len(nuevas), como))
            acc.extend(nuevas)
        # los tramos que ya quedan dentro de lo cosido se descartan
        tramos = [t for t in tramos if t[1][-1]['fecha'] > acc[-1]['fecha'] or clave(t[1][-1]) not in {clave(r) for r in acc[-400:]}]
    roturas = [(acc[i - 1]['fecha'], acc[i]['fecha']) for i in range(1, len(acc)) if not encadena(acc[i - 1], acc[i])]
    return acc, informe, roturas


# ---------------------------------------------------------------- 2. lo que ya sabemos
def filas_xlsx(f, hoja=None):
    wb = openpyxl.load_workbook(f, read_only=True, data_only=True)
    ws = wb[hoja] if hoja else wb.worksheets[0]
    vacias = 0
    for r in ws.iter_rows(values_only=True):
        if not any(c is not None and str(c).strip() for c in r):
            vacias += 1
            if vacias > 50:
                break
            continue
        vacias = 0
        yield r


RE_FAC = re.compile(r'(\d{1,4})\s*[-/]\s*(20\d\d|\d\d)(?!\d)')


def facturas_de(texto):
    out = []
    for num, an in RE_FAC.findall(texto or ''):
        an = int(an) + (2000 if len(an) == 2 else 0)
        if 2019 <= an <= 2027:
            out.append((an, int(num)))
    return out


def leer_remesas(carpeta):
    rem = {}  # (empresa, numero de entrega) -> dict
    for f in glob.glob(os.path.join(carpeta, 'remesas', '*.xlsx')):
        emp = 'accesalia' if os.path.basename(f).startswith('acc') else 'daniel'
        wb = openpyxl.load_workbook(f, read_only=True, data_only=True)
        for r in filas_xlsx(f, wb.sheetnames[0]):
            r = list(r) + [None] * 8
            try:
                ent = int(float(r[1]))
            except (TypeError, ValueError):
                continue
            rem[(emp, ent)] = dict(vence=d(r[2]), importe=n(r[4]), estado=txt(r[5]), titular=txt(r[6]),
                                   referencia=txt(r[7]), fichero=os.path.basename(f))
    return rem


def leer_gastos(carpeta):
    gas = []
    for f in glob.glob(os.path.join(carpeta, 'gastos', '*.xlsx')):
        emp = 'accesalia' if os.path.basename(f).startswith('acc') else 'daniel'
        wb = openpyxl.load_workbook(f, read_only=True, data_only=True)
        hoja = wb.sheetnames[0]
        cab = None
        for r in filas_xlsx(f, hoja):
            r = [txt(c) if not isinstance(c, (int, float, datetime.datetime)) else c for c in r]
            if cab is None:
                cab = [str(c).strip().upper() for c in r]
                ix = {k: next((i for i, c in enumerate(cab) if c.startswith(k)), None)
                      for k in ('TIPO', 'EMPRESA', 'Nº FACTURA', 'N� FACTURA', 'FECHA', 'CONCEPTO', 'TOTAL')}
                ix['FAC'] = ix['Nº FACTURA'] if ix['Nº FACTURA'] is not None else ix['N� FACTURA']
                continue
            tot, fe = n(r[ix['TOTAL']]), d(r[ix['FECHA']])
            if tot is None or fe is None:
                continue
            gas.append(dict(empresa=emp, tipo=txt(r[ix['TIPO']]), proveedor=txt(r[ix['EMPRESA']]),
                            factura=txt(r[ix['FAC']]) if ix['FAC'] is not None else '', fecha=fe,
                            concepto=txt(r[ix['CONCEPTO']]), total=tot, fichero=os.path.basename(f), usado=False))
    return gas


# ---------------------------------------------------------------- 3. casar
REGLAS = [  # (patron en movimiento + mas datos, tipo)  -- lo que dice el propio banco, con su palabra
    (r'^NOMINA', 'NÓMINAS'),
    (r'Q2826000H|AGENCIA TRIBUT|MINISTERIO DE ECONOMIA|IMPUESTOS|^MODELO|A\.? ?E\.? ?A\.? ?T\b', 'IMPUESTOS (Hacienda)'),
    (r'NOMINA|NÓMINA|HORAS EXTRAS', 'NÓMINAS'),
    (r'Q2875017B|COL\.? ?OFICIAL ARQU', 'COAM'),
    (r'HERMANDAD NACIONA|^HNA', 'HNA'),
    (r'APLAZAM', 'IMPUESTOS (aplazamiento)'),
    (r'TGSS|SEG\.?\s*SOCIAL|SEGURIDAD SOCIAL|TESORERIA GENERAL', 'SEGURIDAD SOCIAL'),
    (r'AMORTIZACION DE PRESTAMO|RECOBRO DEUDA VENCIDA|PRESTAMO|PRÉSTAMO|^PRES\.', 'PRÉSTAMO / CRÉDITO'),
    (r'LIQUIDACION Y FIN|FINIQ', 'NÓMINAS (finiquito)'),
    (r'^COMISION FACTURAS', 'COMISIÓN COMERCIALES'),
    (r'^PR\.FA|^PR\.DE|^COMISIONES|MANTENIMIENTO|^LIQUIDACION (CTA|DE INT|REMESA)', 'GASTOS BANCARIOS'),
    (r'REINT|CAJERO|EFECTIVO', 'RETIRADA DE EFECTIVO'),
    (r'AYTO|AYUNTAMIENTO|PAGO DE TRIBUTOS', 'AYUNTAMIENTO (tasas y tributos)'),
    (r'DGT SANCION', 'MULTAS (DGT)'),
    (r'^NOMINA', 'NÓMINAS'),
    (r'\bCASA\b.*DANIEL DE SOTO', 'CASA'),
    (r'DANIEL DE SOTO', 'NÓMINA DE DANIEL (lo que saca cada mes para gastar)'),   # Monica, 21-oct
    (r'^TRASPASO\s*$', 'TRASPASO (a una cuenta que no es de estas tres)'),
    (r'FCE BANK', 'FORD (furgoneta de empresa: cuota de FCE Bank)'),   # Monica, 21-oct
    (r'STELLANTIS', 'JEEP (eléctrico de empresa: cuota de Stellantis)'),   # Monica, 21-oct
]
REGLAS_INGRESO = [
    (r'CONSTIT\. PRESTAMO', 'PRÉSTAMO (lo que entra al firmarlo)'),
    (r'DEVOLUCION HACIENDA|DEVOLUCIONES TRIBUTARIA', 'IMPUESTOS (devolución de Hacienda)'),
    (r'^ANULACI', 'BANCO (anula un cargo)'),
    (r'ECOBALANCE', 'PRÉSTAMO ENTRE EMPRESAS (de Ecobalance)'),   # Monica, 21-oct: hizo falta dinero
    (r'FCE BANK', 'FORD (furgoneta): entra de FCE Bank'),
    (r'MONICA FAVIERES', 'PRÉSTAMO DE MÓNICA A DANIEL (sin devolver)'),   # Monica, 21-oct
]
# nombres del banco que son, sin duda, uno de SUS tipos (lista tipos de su Excel de gastos)
# Lo que Monica ha dicho de cada gasto (21-oct), con si se REPITE (para las previsiones).
# (patron, tipo, se repite, solo en la cuenta)  -- van antes que las reglas del banco
NO_DANIEL = r'(?!.*DANIEL DE SOTO)'
REVISADAS = [
    (r'RIANSARES|ESTUDIO VILLAVICIOSA|PARA HIPOTECA', 'CASA: compra de la casa', 'no', None),
    # Monica, 21-oct: la nomina de Daniel son los 3.500 que salen de ACCESALIA; lo que sale de SU cuenta hacia
    # «Daniel de Soto» (ponga «casa marzo» o solo «Junio 2026») es lo de la CASA
    (r'DANIEL DE SOTO', 'CASA', 'sí', 'caixa_dan'),
    (r'SANDRA COBO|GARCIA ASPERILLA', 'COLABORADORES EXTERNOS (ya no trabajan con nosotros)', 'no', None),
    (r'GARRIGUES|SANCHEZ DE LEON|GIBELLO', 'ABOGADOS (denuncias a Daniel)', 'no', None),
    (r'KIKUCHI|ENVOLTERMIA|LEGARION', 'PERSONAL DE DANIEL', 'no', None),
    (r'SOFISE', 'SEGUROS (el de Daniel como arquitecto)', 'sí', None),
    (r'ECOBALANCE', 'ENTRE EMPRESAS (pago a Ecobalance por servicios)', 'no', None),
    (r'GONZALO MALLO', 'GESTORÍA (GMA)', 'sí', None),
    (r'^(ADELANTO|ANTICIPO|ANTC|ANT)\b' + NO_DANIEL, 'ADELANTOS', 'no', None),
    (r'^DEVOLUCION (FAC|POR ER|COBRO)|^ABONO DE N|^ABONO \d+/\d+ DE N', 'DEVOLUCIONES A CLIENTES (facturas anuladas, servicios a los que se renunció)', 'no', None),
    (r'DIRECCION GRAL TRABAJO|DIRECCION GENERAL DE TRABAJO', 'SANCIÓN (inspección de trabajo: plan de prevención)', 'no', None),
    # tanda 3 (Monica, 21-oct)
    (r'^ABRIL26\s*$', 'CASA', 'sí', 'caixa_dan'),
    (r'^PAGO SUBVENCIONES', 'AYUDA DE VERANO (un chico que echó una mano; no vuelve)', 'no', None),
    (r'SEVIAM', 'GASTOS BANCARIOS (gestión de la cuenta)', 'sí', None),
    (r'^FARO Y MAS', 'DEVOLUCIÓN A MÓNICA (reparación del escáner que pagó ella)', 'no', None),
    (r'EUROVALORACIONES', 'CASA: tasación de Riansares 7', 'no', None),
    (r'QUIRON PREVENCION', 'SERVICIO DE PREVENCIÓN (Quirón)', 'sí', None),
    (r'GAZTAMBIDE', 'COLABORADORES EXTERNOS (ya no trabajan con nosotros)', 'no', None),
    (r'AMOVENS|AIR EUROPA|ENTERPRISE RENT|DOYOUSPAIN', 'PERSONAL DE DANIEL', 'no', None),
    (r'DIAGNOSTICAM|DGS PROYECTOS|EMILIO LEAL|CLICK ONLINE', 'SOFTWARE Y APPS', 'sí', None),
    (r'ENDESA', 'PERSONAL DE DANIEL', 'sí', 'caixa_dan'),
    (r'MYBOX', 'SEGUROS', 'sí', None),
    (r'PRIMA SEG\.? AUTONOM', 'SEGUROS (otro de Daniel como autónomo)', 'sí', None),
    (r'GASTOS CABLE', 'MATERIAL DE OFICINA', 'sí', None),
    (r'ALFONSO MESA', 'ALQUILER', 'sí', None),
    (r'SIEMENS', 'SIEMENS (renting del Faro, el escáner de nube de puntos)', 'sí', None),
    (r'RENAULT|\bZOE\b', 'RENAULT (el Zoe, coche de empresa)', 'sí', None),
    (r'REINT|CAJERO|EFECTIVO', 'COMISIONES PAGADAS EN MANO (efectivo)', 'sí', 'caixa_dan'),   # Monica, 21-oct: no es para casa
    (r'COL\.? ?PROF\.? ?ADMIN|G28840387', 'COLEGIO DE ADMINISTRADORES (un tema puntual)', 'no', None),
    (r'NOTARIA', 'PERSONAL DE DANIEL (notaría de un asunto suyo)', 'no', None),
    (r'PALAM[OÓ]S', 'PERSONAL DE DANIEL (su casa de Palamós)', 'no', None),
    # tanda 4 (Monica, 21-oct)
    (r'RCI BANQUE', 'RENAULT (el Zoe, coche de empresa)', 'sí', None),
    (r'GENERALI|ALLIANZ|ZURICH|REALE SEG|CAJA DE SEG', 'SEGUROS', 'sí', None),
    (r'MOEVE|CAMPODON|BOADILLA M-?\d*\s*DI|^E\.S\.|^EESS|TICKETS PENDIENTE', 'COMBUSTIBLE', 'sí', None),
    (r'PLUXEE', 'TICKETS RESTAURANTE (empleados)', 'sí', None),
    (r'VALCOCER|VALCO\b', 'PAGO PUNTUAL (Servicios Integrales Valcocer)', 'no', None),
    (r'DEL BRIO Y BLANCO', 'COMISIÓN DEL ADMINISTRADOR (ahora las paga Ecobalance)', 'no', None),
    (r'FARO EUROPE', 'SIEMENS: arreglo del Faro (puntual)', 'no', None),
    (r'PRODOTTI E SISTEMI', 'MATERIAL A PRUEBA PARA LAS OBRAS (aislamiento, puntual)', 'no', None),
    (r'FOUNDERZ', 'FORMACIÓN (curso de dos empleadas)', 'no', None),
    (r'ADEVINTA', 'SELECCIÓN DE PERSONAL (anuncios de InfoJobs)', 'no', None),
    (r'JUANELIASCAMPO', 'FORMACIÓN (curso de gestión empresarial de Daniel, a plazos)', 'plazos: quedan 3, cada ~3 meses', None),
    (r'COMISION FACTURA', 'COLABORADORES EXTERNOS (factura puntual)', 'no', None),
    (r'ENERGIA HOGAR', 'LUZ DEL LOCAL', 'sí', None),
    (r'NICALIA', 'SOFTWARE Y APPS (hosting de la web)', 'sí', None),
    (r'OFICINA VIRTUAL', 'IMPUESTOS Y TRÁMITES PUNTUALES (oficina virtual)', 'no', None),
    # tanda 5 (Monica, 21-oct)
    (r'TERMOGRAFIA APLICADA', 'PERSONAL DE DANIEL', 'no', None),
    (r'RAUL CEREZO|GOMEZ ORTEGA|LUADO MC|CIRCA TRADE|TRUTH SERVICIOS',
     'COLABORADORES EXTERNOS (comisiones; ahora las paga Ecobalance)', 'no', None),
    (r'AUTOESCUELA', 'FORMACIÓN (el carnet de un trabajador)', 'no', None),
    (r'CECILIA GARCIA|GRUAS', 'ACCIDENTE (la grúa)', 'no', None),
    # los pequenos, aprobados en bloque
    (r'RESTAURANTE|^REST\b|MESON|^BAR\b|CAFETERIA|^CAFE|EL CAFE|BURGER|PIZZA|SUSHI|KEBAP|CHURRERIA|PANADERIA|TANDOORI|ASIATICO'
     r'|CARLS JR|VIPS|TEITU|AYNAE|EL CORDERO|LA BRAÑA|TELEGRAFO|POSADA DEL CAMINO|ALFREDOS|PINTXAKI|TINGLADO|QUINTO SABOR'
     r'|CASA ALVAREZ|CASA BLASIUS|CASA MARI|SAONA|ONE HUNDRED|BOCADILLO|LA FLACA|WICKED SWEET|\bORIO\b|MADAME', 'RESTAURANTES', 'sí', None),
    (r'^E\.? ?S\.? |CEDIPSA|GASOLIN|COMBUST', 'COMBUSTIBLE', 'sí', None),
    (r'SEITT|PARKING|APARCAMIENTO|GARAJE OPORTO|VILLAPARK', 'PEAJES Y PARKING', 'sí', None),
    (r'AMAZON|AMZN|PCCOMPONENTES|PCCOM|MEDIA ?MARKT|MEDIAMARKT', 'MATERIAL DE OFICINA', 'sí', None),
    (r'HOSTINGER|GOOGLE CLOUD|SUPABASE|VERCEL|ANTHROPIC|MICROSOFT|BOLT BY|GLIDEAPPS|ACENS|GOOGLE ONE', 'SOFTWARE Y APPS', 'sí', None),
    (r'MERCADONA|LIDL|NETFLIX|DOMINOS|OCULUS|FARMACIA|FCIA|LEROY MERLIN|BAZAR|ESTANCO|^ONCE|LOVE HOME|TEXTILES|HIERBATURA'
     r'|MANACOR|MARKET BOADILLA|PHONE HOUSE', 'PERSONAL DE DANIEL', 'no', 'caixa_dan'),
]

# nombres del banco que son, sin duda, uno de SUS tipos
SINONIMOS = {'OPENAI': 'IA', 'CHATGPT': 'IA', 'CLAUDE': 'IA', 'COMBUST': 'COMBUSTIBLE', 'ALQUILER': 'ALQUILER',
             'CANAL DE ISABEL': 'CANAL ISABEL II'}


def casar(movs, rem, gas, facturas, cobros, tipos):
    fac_ix = {(f['empresa_emisora'], f['anio'], f['numero']): f for f in facturas if f['serie'] == '1'}
    cob_libres = list(cobros)
    con_cobro = {c['factura_id'] for c in cobros}

    def nombre_fac(f):
        return f"{'Accesalia' if f['empresa_emisora'] == 'accesalia' else 'Daniel'} {f['anio']}/1-{f['numero']}"

    def coger_cobro(m, factura_ids=None, otra_empresa=False):
        cand = [c for c in cob_libres if (otra_empresa or c['empresa'] == m['empresa']) and abs(c['importe'] - abs(m['importe'])) < 0.011
                and abs((c['fecha'] - m['fecha']).days) <= 10 and (factura_ids is None or c['factura_id'] in factura_ids)]
        if not cand:
            return None
        c = min(cand, key=lambda c: abs((c['fecha'] - m['fecha']).days))
        cob_libres.remove(c)
        c['casado'] = True
        m.setdefault('cobros', []).append(c['id'])
        return c

    for m in movs:
        m.update(clase='', detalle='', como='', factura='', oportunidad_id='', repite='')
        t = (m['movimiento'] + ' ' + m['mas_datos']).upper()
        mo = re.match(r'^(FATIR|DETIR|PR\.FA|PR\.DE)(\d+)', m['movimiento'].upper())
        if mo:
            kind, ent = mo.group(1), int(mo.group(2))
            r = rem.get((m['empresa'], ent))
            if kind in ('FATIR', 'DETIR'):
                m['clase'] = 'ingreso' if kind == 'FATIR' else 'devolución'
                if r:
                    nombres, ids = [], set()
                    for an, nu in (facturas_de(r['referencia']) or facturas_de(r['titular'])):
                        f = fac_ix.get((m['empresa'], an, nu))
                        nombres.append(nombre_fac(f) if f else f"{an}/1-{nu} (NO está en la app)")
                        if f:
                            ids.add(f['id'])
                            m['oportunidad_id'] = f.get('oportunidad_id') or ''
                    m['factura'] = ' + '.join(nombres)
                    m['detalle'] = r['titular']
                    m['como'] = f"remesa {ent} de su Excel ({r['referencia'] or 'sin factura apuntada'})"
                    if r['importe'] is not None and abs(r['importe'] - abs(m['importe'])) > 0.011:
                        m['como'] += f" · OJO: en su Excel la remesa es de {r['importe']:.2f}"
                    if kind == 'FATIR' and ids and not coger_cobro(m, ids):
                        c = coger_cobro(m, otra_empresa=True)
                        if c:
                            m['como'] += f" · en la app el cobro está en {c['factura']}"
                        else:
                            m['como'] += ' · la factura NO tiene este cobro en la app'
                else:
                    m['como'] = f'remesa {ent}: NO está en su Excel de remesas'
                continue
            m['clase'], m['detalle'] = 'gasto', 'GASTOS BANCARIOS'
            m['como'] = ('comisión de la remesa ' if kind == 'PR.FA' else 'gastos de la devolución ') + str(ent)
            continue

        if m['importe'] > 0:
            m['clase'] = 'ingreso'
            c = coger_cobro(m)
            if c:
                m['factura'], m['oportunidad_id'], m['detalle'] = c['factura'], c.get('oportunidad_id') or '', c['pagador']
                m['como'] = f"cobro de la app ({c['tipo']}, {c['fecha']:%d-%m-%Y}), mismo importe"
                continue
            # FAIN, Schindler...: una transferencia paga VARIAS facturas -> la suma de los cobros de un pagador en un dia
            grupos = collections.defaultdict(list)
            for c in cob_libres:
                if c['empresa'] == m['empresa'] and abs((c['fecha'] - m['fecha']).days) <= 10:
                    grupos[(c['fecha'], c['pagador'])].append(c)
            g = next((g for g in sorted(grupos.values(), key=lambda g: abs((g[0]['fecha'] - m['fecha']).days))
                      if len(g) > 1 and abs(sum(c['importe'] for c in g) - m['importe']) < 0.011), None)
            if g:
                for c in g:
                    cob_libres.remove(c)
                    c['casado'] = True
                    m.setdefault('cobros', []).append(c['id'])
                m['factura'] = ' + '.join(c['factura'] for c in g)
                m['detalle'] = g[0]['pagador']
                m['como'] = f"{len(g)} cobros de la app del {g[0]['fecha']:%d-%m-%Y} ({g[0]['tipo']}) que suman este importe"
                continue
            if 'FACTORING' in t or 'CONFIRMING' in t:
                for fe, g in sorted(((fe, g) for (fe, _), g in grupos.items()), key=lambda x: abs((x[0] - m['fecha']).days)):
                    tot = round(sum(c['importe'] for c in g), 2)
                    if 0 <= tot - m['importe'] <= 0.04 * tot:
                        for c in g:
                            cob_libres.remove(c)
                            c['casado'] = True
                            m.setdefault('cobros', []).append(c['id'])
                        m['factura'] = ' + '.join(c['factura'] for c in g)
                        m['detalle'] = g[0]['pagador'] + ' (confirming)'
                        m['como'] = (f"{len(g)} cobros de la app del {fe:%d-%m-%Y} que suman {tot:.2f}; "
                                     f"el banco paga {tot - m['importe']:.2f} menos: coste del anticipo")
                        break
                if m['como']:
                    continue
            # factura de la empresa con ese mismo total, emitida antes y SIN cobro en la app: se PROPONE
            cand = [f for f in facturas if f['empresa_emisora'] == m['empresa'] and f['total'] is not None
                    and abs(float(f['total']) - m['importe']) < 0.011 and f['estado'] != 'anulada' and f['fecha']
                    and 0 <= (m['fecha'] - d(f['fecha'])).days <= 400 and f['id'] not in con_cobro]
            regla = next(((tipo, pat) for pat, tipo in REGLAS_INGRESO if re.search(pat, t)), None)
            if regla:
                m['regla'] = ('ingreso', regla[1], None)
                regla = regla[0]
                m['detalle'], m['como'] = regla, 'lo dice el banco: «' + m['movimiento'] + ' · ' + m['mas_datos'] + '»'
            elif len(cand) == 1:
                f = cand[0]
                m['factura'], m['oportunidad_id'], m['detalle'] = nombre_fac(f), f.get('oportunidad_id') or '', f['pagador_nombre']
                m['como'] = f"PROPUESTA: única factura con ese total sin cobro en la app ({d(f['fecha']):%d-%m-%Y})"
            elif len(cand) > 1:
                m['como'] = f'SIN IDENTIFICAR · {len(cand)} facturas con ese total: ' + ', '.join(nombre_fac(f) for f in cand[:4])
            else:
                m['como'] = 'SIN IDENTIFICAR'
            continue

        # gasto: 1) su Excel de gastos (su TIPO manda)  2) lo que dice el banco  3) un nombre que es uno de sus tipos
        m['clase'] = 'gasto'
        cand = [g for g in gas if not g['usado'] and abs(g['total'] + m['importe']) < 0.011
                and abs((g['fecha'] - m['fecha']).days) <= 20]
        if cand:
            cand.sort(key=lambda g: (g['empresa'] != m['empresa'], abs((g['fecha'] - m['fecha']).days)))
            g = cand[0]
            g['usado'] = True
            # Monica, 21-oct: sus apuntes del Excel eran mucho menos detallados que esta revision -> NO clasifican,
            # solo se ensenan como referencia
            m['su_excel'] = (f"{g['tipo'].upper()} · {g['proveedor']} · {g['concepto']} · {g['fecha']:%d-%m-%Y}"
                             + ('' if g['empresa'] == m['empresa'] else ' (en la OTRA empresa)'))
        hecho = next(((tipo, rep_, pat, cta) for pat, tipo, rep_, cta in REVISADAS
                      if (cta is None or cta == m['cuenta']) and re.search(pat, t)), None)
        if hecho:
            m['detalle'], m['repite'] = hecho[:2]
            m['regla'] = ('gasto', hecho[2], hecho[3])
            m['como'] = 'Mónica, 21-oct: «' + m['movimiento'] + (' · ' + m['mas_datos'] if m['mas_datos'] else '') + '»'
            continue
        for pat, tipo in REGLAS:
            if re.search(pat, t):
                m['detalle'] = tipo
                m['regla'] = ('gasto', pat, None)
                m['como'] = 'lo dice el banco: «' + m['movimiento'] + (' · ' + m['mas_datos'] if m['mas_datos'] else '') + '»'
                break
        else:
            tipo = next((ti for ti in tipos if re.search(r'\b' + re.escape(ti) + r'\b', t)), None) or \
                next((v for k, v in SINONIMOS.items() if k in t), None)
            if tipo:
                m['detalle'], m['como'] = tipo, f'el banco pone «{m["movimiento"]}», que es uno de sus tipos'
                ti = next((ti for ti in tipos if re.search(r'\b' + re.escape(ti) + r'\b', t)), None)
                m['regla'] = ('gasto', r'\b' + re.escape(ti) + r'\b', None) if ti else \
                    ('gasto', re.escape(next(k for k, v in SINONIMOS.items() if k in t)), None)
            else:   # Monica, 21-oct: lo que queda va a una partida mensual de pequenos gastos, recurrentes pero diferentes
                m['detalle'], m['repite'] = 'PEQUEÑOS GASTOS (partida mensual)', 'sí'
                m['como'] = 'lo demás va a pequeños gastos (Mónica, 21-oct)'   # no empieza por «Mónica»: un interno lo puede reclamar


def internos(movs):
    """Lo que sale de una cuenta nuestra y entra en otra nuestra: mismo importe, +-3 dias, cuentas distintas."""
    entradas = [m for m in movs if m['importe'] > 0]
    usados = set()
    for m in sorted(movs, key=lambda m: m['fecha']):
        if m['importe'] >= 0 or id(m) in usados:
            continue
        if m['como'].startswith('Mónica, 21-oct'):   # ella ya ha dicho lo que es
            continue
        for e in entradas:
            if id(e) in usados or e['cuenta'] == m['cuenta']:
                continue
            if abs(e['importe'] + m['importe']) < 0.011 and abs((e['fecha'] - m['fecha']).days) <= 3:
                te = (e['movimiento'] + ' ' + e['mas_datos']).upper()
                tm = (m['movimiento'] + ' ' + m['mas_datos']).upper()
                senal = ('TRASPASO' in te or 'TRANSFER' in te or 'SOTO' in tm or 'SOLUCIONES ACCESIBILIDAD' in te
                         or 'ACCESALIA' in te or 'SOTO' in te or 'TRASPASO' in tm or 'TRANSFER' in tm or 'SU FRA' in tm)
                if not senal:
                    continue
                usados.update({id(e), id(m)})
                for a, b in ((m, e), (e, m)):
                    if a['como'] and a['como'] != 'SIN IDENTIFICAR' and not a['como'].startswith('lo dice'):
                        a['como'] += ' · y es '  # se queda lo que habia, se avisa
                    else:
                        a['como'] = ''
                    a['clase'] = 'interno'
                    a['pareja'] = b
                    a['detalle'] = ('a ' if a is m else 'de ') + CUENTAS[b['cuenta']][1]
                    a['como'] += f"sale de una cuenta nuestra y entra en otra el {b['fecha']:%d-%m-%Y}, mismo importe"
                break


def dar_formato(salida):
    """Columnas al ancho de lo que llevan (nunca estiradas), cabecera fija, importes con dos decimales."""
    from openpyxl.styles import Font, PatternFill
    wb = openpyxl.load_workbook(salida)
    for ws in wb.worksheets:
        ws.freeze_panes = 'A2'
        for c in ws[1]:
            c.font = Font(bold=True)
            c.fill = PatternFill('solid', fgColor='EDE7DD')
        for col in ws.columns:
            largo = max(len(str(c.value)) if c.value is not None else 0 for c in col)
            ws.column_dimensions[col[0].column_letter].width = min(max(8, largo + 2), 60)
            for c in col[1:]:
                if isinstance(c.value, float):
                    c.number_format = '#,##0.00;[Red]-#,##0.00'
                elif isinstance(c.value, (datetime.date, datetime.datetime)):
                    c.number_format = 'DD-MM-YYYY'
        ws.auto_filter.ref = ws.dimensions
    wb.save(salida)


# ---------------------------------------------------------------- 4. escribir (solo con --escribir y su OK)
CLAVE_CUENTA = {'caixa_acc': 'caixa_accesalia', 'bbva_acc': 'bbva_accesalia', 'caixa_dan': 'caixa_daniel'}
# nombres repetidos que se juntan al pasar a la app (Monica, 21-oct: «ok a todo»)
JUNTAR = {'IA': 'SOFTWARE Y APPS', 'AI': 'SOFTWARE Y APPS', 'CHATGPT': 'SOFTWARE Y APPS', 'GOOGLE CLOUD': 'SOFTWARE Y APPS',
          'SOFTWARE Y APPS (hosting de la web)': 'SOFTWARE Y APPS', 'GASTOS BANCARIOS (gestión de la cuenta)': 'GASTOS BANCARIOS',
          'IBERDROLA': 'LUZ DEL LOCAL'}
# lo que solo ve direccion
# Monica, 21-oct: la casa y lo personal de Daniel los VE Alexandra («va a tener que prever su saldo»)
SOLO_DIRECCION = ('COMISIONES PAGADAS EN MANO', 'COMISIÓN DEL ADMINISTRADOR', 'PRÉSTAMO DE MÓNICA A DANIEL',
                  'ABOGADOS (denuncias a Daniel)')


def tipo_app(t):
    return JUNTAR.get(t, t) if t else t


def solo_dir(t):
    return bool(t) and t.startswith(SOLO_DIRECCION)


def repite_app(r):
    if not r:
        return None, None
    if r.startswith('plazos'):
        return 'plazos', r.split(':', 1)[1].strip() if ':' in r else None
    return {'sí': 'si', 'si': 'si', 'no': 'no', 'variable': 'variable'}[r], None


def escribir(base, movs, tipos, tipo_repite, se_repiten):
    import uuid
    if base.leer('movimientos_bancarios?select=id&limit=1', por_tramos=False):
        raise SystemExit('movimientos_bancarios ya tiene filas: no se carga dos veces')

    def rep_de(tipo):   # el «se repite» por defecto de un tipo (lo mismo que se aplica a los movimientos)
        if tipo == 'NÓMINAS (finiquito)':
            return 'no'
        if tipo in se_repiten or tipo.startswith(('IMPUESTOS', 'PRÉSTAMO', 'SEGUROS', 'NÓMINA DE DANIEL', 'JEEP', 'RENAULT', 'SIEMENS')):
            return 'si'
        return {'sí': 'si', 'no': 'no'}.get(tipo_repite.get(tipo))

    # -- las reglas, en el orden en que se prueban
    reglas, orden = [], 0
    def regla(sentido, patron, cuenta, tipo, rep, origen):
        nonlocal orden
        orden += 10
        r = dict(id=str(uuid.uuid4()), orden=orden, sentido=sentido, patron=patron, cuenta=CLAVE_CUENTA.get(cuenta),
                 tipo=tipo_app(tipo), se_repite=rep, solo_direccion=solo_dir(tipo), origen=origen)
        reglas.append(r)
        return r
    ix = {}
    for pat, tipo, rep, cta in REVISADAS:
        ix[('gasto', pat, cta)] = regla('gasto', pat, cta, tipo, repite_app(rep)[0], 'Mónica, 21-oct')
    for pat, tipo in REGLAS:
        ix[('gasto', pat, None)] = regla('gasto', pat, None, tipo, rep_de(tipo), 'lo dice el banco')
    for ti in tipos:
        p = r'\b' + re.escape(ti) + r'\b'
        ix[('gasto', p, None)] = regla('gasto', p, None, ti, rep_de(ti), 'uno de sus tipos (lista de su Excel de gastos)')
    for k, v in SINONIMOS.items():
        ix[('gasto', re.escape(k), None)] = regla('gasto', re.escape(k), None, v, rep_de(v), 'uno de sus tipos (lista de su Excel de gastos)')
    for pat, tipo in REGLAS_INGRESO:
        ix[('ingreso', pat, None)] = regla('ingreso', pat, None, tipo, None, 'lo dice el banco')
    base.insertar('reglas_movimientos', reglas)
    print('reglas:', len(reglas))

    # -- los movimientos
    for m in movs:
        m['_id'] = str(uuid.uuid4())
    filas = []
    for m in movs:
        rep, nota = repite_app(m.get('repite'))
        tipo = tipo_app(m['detalle']) or None
        rg = ix.get(m.get('regla')) if m.get('regla') else None
        filas.append(dict(
            id=m['_id'], cuenta=CLAVE_CUENTA[m['cuenta']], orden=m['orden'], fecha=m['fecha'].isoformat(),
            fecha_valor=m['fecha_valor'].isoformat() if m['fecha_valor'] else None, concepto=m['movimiento'],
            mas_datos=m['mas_datos'] or None, importe=m['importe'], saldo=m['saldo'], referencia=m['ref'] or None,
            fichero_origen=m.get('fichero'), clase={'devolución': 'devolucion'}.get(m['clase'], m['clase']),
            tipo=tipo if m['clase'] != 'interno' else None, se_repite=rep if m['clase'] == 'gasto' else None,
            nota_repite=nota, como_se_sabe=m['como'] or None,
            regla_id=rg['id'] if rg and rg['tipo'] == tipo else None,
            facturas=m['factura'] or None, oportunidad_id=m['oportunidad_id'] or None,
            solo_direccion=solo_dir(m['detalle']) if m['clase'] != 'interno' else False,
            su_excel=m.get('su_excel') or None))
    base.insertar('movimientos_bancarios', filas)
    print('movimientos:', len(filas))
    # -- las parejas de los internos (despues: la fila de la pareja tiene que existir)
    n = 0
    for m in movs:
        if m.get('pareja') is not None:
            base.actualizar('movimientos_bancarios?id=eq.' + m['_id'], {'interno_con': m['pareja']['_id']})
            n += 1
    print('internos enlazados:', n)
    # -- cada cobro, con el apunte del banco que lo paga
    n = 0
    for m in movs:
        if m.get('cobros'):
            base.actualizar('cobros?id=in.(' + ','.join(m['cobros']) + ')', {'movimiento_bancario_id': m['_id']})
            n += len(m['cobros'])
    print('cobros enlazados:', n)


# ---------------------------------------------------------------- main
def main():
    entrada, salida = sys.argv[1], sys.argv[2]
    movs, cosido, roturas_todas = [], [], []
    for cta in CUENTAS:
        lector = leer_bbva if cta.startswith('bbva') else leer_caixa
        tramos = [(os.path.basename(f), lector(f)) for f in sorted(glob.glob(os.path.join(entrada, cta, '*.xls*')))]
        filas, informe, roturas = coser(tramos)
        for f, a, b, c, como in informe:
            cosido.append(dict(cuenta=CUENTAS[cta][1], fichero=f, desde=a, hasta=b, filas=c, como=como))
        for a, b in roturas:
            roturas_todas.append(dict(cuenta=CUENTAS[cta][1], entre=a, y=b))
        for i, r in enumerate(filas):
            r['orden'] = i + 1
            if DESDE <= r['fecha'] <= HASTA:
                r['cuenta'], r['empresa'] = cta, CUENTAS[cta][0]
                movs.append(r)
        print(f"{CUENTAS[cta][1]}: {sum(1 for r in filas if DESDE <= r['fecha'] <= HASTA)} movimientos "
              f"{filas[0]['fecha']} -> {filas[-1]['fecha']}, roturas de saldo: {len(roturas)}")

    base = arrancar()
    facturas = base.leer('facturas?select=id,empresa_emisora,anio,serie,numero,fecha,total,estado,pagador_nombre,oportunidad_id'
                         '&anio=gte.2024&empresa_emisora=in.(accesalia,daniel)&order=id')
    fid = {f['id']: f for f in facturas}
    cobros = []
    for c in base.leer('cobros?select=id,factura_id,fecha_cobro,importe,tipo&fecha_cobro=gte.2025-01-01&order=id'):
        f = fid.get(c['factura_id'])
        if not f or not c['fecha_cobro'] or c['importe'] is None:
            continue
        cobros.append(dict(id=c['id'], factura_id=c['factura_id'], empresa=f['empresa_emisora'], fecha=d(c['fecha_cobro']), importe=float(c['importe']),
                           tipo=c['tipo'], pagador=f['pagador_nombre'] or '', oportunidad_id=f.get('oportunidad_id'),
                           factura=f"{'Accesalia' if f['empresa_emisora']=='accesalia' else 'Daniel'} {f['anio']}/{f['serie']}-{f['numero']}",
                           casado=False))
    rem, gas = leer_remesas(entrada), leer_gastos(entrada)
    print(f'facturas {len(facturas)} · cobros 2025+ {len(cobros)} · remesas {len(rem)} · gastos de sus Excel {len(gas)}')

    tipos = set()
    for f in glob.glob(os.path.join(entrada, 'gastos', 'acc_*.xlsx')):
        wb = openpyxl.load_workbook(f, read_only=True, data_only=True)
        if 'lista tipos' in wb.sheetnames:
            tipos |= {txt(r[0]).upper() for r in filas_xlsx(f, 'lista tipos') if r and txt(r[0])}
    tipos -= {'TIPO', 'VARIOS', 'PROFESIONAL', 'SEGUROS'}
    tipos = sorted(tipos, key=len, reverse=True)
    casar(movs, rem, gas, facturas, cobros, tipos)
    # Monica, 21-oct: la nomina de Daniel son los 3.500; lo demas que se pasa desde Accesalia son gastos personales
    # suyos, a cuenta de beneficios
    for m in movs:
        if m['cuenta'] == 'caixa_acc' and m['detalle'].startswith('NÓMINA DE DANIEL') and abs(m['importe']) != 3500:
            m['detalle'], m['repite'] = 'PERSONAL DE DANIEL (se lo pasa desde Accesalia, a cuenta de beneficios)', 'no'
    # La furgoneta (Ford) iba en una especie de renting con pago final. Lo que dice el extracto:
    #   4-dic-2025 recibo de FCE por el resto (16.198,21) -> 8-dic vuelve, con fecha valor 4-dic: recibo DEVUELTO
    #   15-ene-2026 FCE cobra 102,68 · 26-feb-2026 transferencia a FORD CREDIT de 16.300,09: el resto, PAGADO
    #   21-may-2026 FCE devuelve una cuota (466,04). Despues ya no hay cuotas: la furgoneta esta pagada.
    for m in movs:
        tt = (m['movimiento'] + ' ' + m['mas_datos']).upper()
        if 'FORD CREDIT' in tt and m['importe'] < 0:
            m['detalle'] = 'FORD (furgoneta): pago del resto del renting, por transferencia'
            m['como'] = 'transferencia a Ford Credit tras devolverse el recibo de diciembre'
        elif 'FCE BANK' in tt and abs(m['importe']) >= 10000:
            if m['importe'] < 0:
                m['detalle'], m['como'] = 'FORD (furgoneta): recibo del pago final, DEVUELTO', 'vuelve el 8-dic con fecha valor 4-dic'
            else:
                m['detalle'], m['como'] = 'FORD (furgoneta): devolución del recibo del 4-dic', 'misma cifra y fecha valor 4-dic'
        elif 'FCE BANK' in tt and m['importe'] > 0:
            m['detalle'] = 'FORD (furgoneta): FCE devuelve una cuota'
    internos(movs)
    # Monica, 21-oct: las partidas grandes que salen solas SE REPITEN; los finiquitos, no
    # los tipos de su Excel de gastos (Monica, 21-oct)
    TIPO_REPITE = {t: 'sí' for t in ('ALQUILER', 'SIEMENS', 'HNA', 'JEEP', 'ASISA', 'RESTAURANTES', 'RENAULT', 'IBERDROLA', 'SIMYO',
                                    'GASTOS BANCARIOS', 'IA', 'AI', 'CHATGPT', 'DROPBOX', 'CAIXA BANK CRÉDITO', 'APPLE', 'SOFISE',
                                    'PROSEGUR', 'MONDAY', 'COMBUSTIBLE', 'CANAL ISABEL II', 'PEAJES Y PARKING', 'TAXI',
                                    'COLEGIO ARQUITECTOS', 'CASER', 'CASER SEGURO ACCIDENTES', 'GOOGLE CLOUD')}
    TIPO_REPITE.update({t: 'no' for t in ('MULTAS (DGT)', 'COMISIÓN COMERCIALES', 'AYUNTAMIENTO (tasas y tributos)')})
    SE_REPITEN = ('NÓMINAS', 'SEGURIDAD SOCIAL', 'IMPUESTOS', 'PRÉSTAMO', 'CASA', 'NÓMINA DE DANIEL', 'SEGUROS', 'COAM')
    for m in movs:
        if m['clase'] == 'gasto' and not m.get('repite'):
            if m['detalle'] == 'NÓMINAS (finiquito)':
                m['repite'] = 'no'
            elif m['detalle'] in SE_REPITEN or m['detalle'].startswith(('IMPUESTOS', 'PRÉSTAMO', 'SEGUROS', 'NÓMINA DE DANIEL')):
                m['repite'] = 'sí'
            elif m['detalle'] in TIPO_REPITE:
                m['repite'] = TIPO_REPITE[m['detalle']]
            elif m['detalle'].startswith(('JEEP', 'RENAULT', 'SIEMENS')):
                m['repite'] = 'sí'
            elif m['detalle'].startswith('FORD'):
                m['repite'] = 'no'   # la furgoneta ya esta pagada (feb-2026)

    # ---- Excel
    mv = pd.DataFrame([dict(Cuenta=CUENTAS[m['cuenta']][1], Fecha=m['fecha'], **{'Fecha valor': m['fecha_valor']},
                            Movimiento=m['movimiento'], **{'Más datos': m['mas_datos']}, Importe=m['importe'], Saldo=m['saldo'],
                            Clase=m['clase'], **{'Qué es': m['detalle'], 'Factura': m['factura'], '¿Se repite?': m.get('repite', ''), 'Cómo se ha sabido': m['como'], 'Su Excel decía': m.get('su_excel', ''),
                                                 'Fichero': m.get('fichero', '')}) for m in movs])
    mv['Mes'] = mv['Fecha'].map(lambda x: x.strftime('%Y-%m'))
    res = []
    for (cta, mes), g in mv.groupby(['Cuenta', 'Mes'], sort=True):
        ext = g[g['Clase'] != 'interno']
        res.append({'Cuenta': cta, 'Mes': mes,
                    'Entra (sin internos)': round(ext[ext.Importe > 0].Importe.sum(), 2),
                    'Sale (sin internos)': round(ext[ext.Importe < 0].Importe.sum(), 2),
                    'Internos': round(g[g['Clase'] == 'interno'].Importe.sum(), 2),
                    'Saldo a fin de mes': g.iloc[-1]['Saldo'],
                    'Saldo más bajo del mes': g['Saldo'].min(),
                    'Disponible de la línea (50.000)': round(LINEA_CREDITO + g['Saldo'].min(), 2) if cta == CUENTAS['caixa_acc'][1] else None,
                    'Sin identificar': int(g['Cómo se ha sabido'].str.startswith('SIN IDENTIFICAR').sum())})
    gastos_tipo = (mv[(mv.Clase == 'gasto')].assign(Tipo=lambda x: x['Qué es'].where(~x['Cómo se ha sabido'].str.startswith('SIN IDENTIFICAR'), 'SIN IDENTIFICAR'))
                   .groupby(['Cuenta', 'Tipo', 'Mes']).Importe.sum().unstack('Mes').fillna(0).round(2).reset_index())
    hasta = {CUENTAS[k][0]: max(m['fecha'] for m in movs if m['cuenta'] == k) for k in ('caixa_acc', 'caixa_dan')}
    sin_mov = pd.DataFrame([dict(Factura=c['factura'], Pagador=c['pagador'], Fecha=c['fecha'], Importe=c['importe'], Tipo=c['tipo'])
                            for c in cobros if not c['casado'] and c['fecha'] <= hasta[c['empresa']]])
    gas_sin = pd.DataFrame([dict(Excel=g['fichero'], Fecha=g['fecha'], Tipo=g['tipo'], Proveedor=g['proveedor'],
                                 Concepto=g['concepto'], Total=g['total']) for g in gas if not g['usado']])
    with pd.ExcelWriter(salida, engine='openpyxl') as xw:
        pd.DataFrame(res).to_excel(xw, sheet_name='Por mes', index=False)
        mv.drop(columns=['Mes']).to_excel(xw, sheet_name='Movimientos', index=False)
        mv[mv['Cómo se ha sabido'].str.startswith('SIN IDENTIFICAR')].drop(columns=['Mes']).to_excel(xw, sheet_name='Sin identificar', index=False)
        gastos_tipo.to_excel(xw, sheet_name='Gastos por tipo', index=False)
        sin_mov.to_excel(xw, sheet_name='Cobros app sin banco', index=False)
        gas_sin.to_excel(xw, sheet_name='Gastos Excel sin banco', index=False)
        pd.DataFrame(cosido).to_excel(xw, sheet_name='Cómo se ha cosido', index=False)
        pd.DataFrame(roturas_todas or [{'cuenta': 'ninguna', 'entre': '', 'y': ''}]).to_excel(xw, sheet_name='Roturas de saldo', index=False)
    dar_formato(salida)
    if '--escribir' in sys.argv:
        escribir(base, movs, tipos, TIPO_REPITE, SE_REPITEN)
    c = collections.Counter((m['clase'], m['como'].startswith('SIN IDENTIFICAR')) for m in movs)
    print('clases:', dict(c))
    print('cobros de la app sin movimiento:', len(sin_mov), '· gastos de sus Excel sin movimiento:', len(gas_sin))


if __name__ == '__main__':
    main()
