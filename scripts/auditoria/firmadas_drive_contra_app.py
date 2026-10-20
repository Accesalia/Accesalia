# -*- coding: utf-8 -*-
"""¿Qué hojas FIRMADAS del Drive no están en la app? (Mónica, 20-oct-2026: «lo crítico son esas firmadas que se
descartaron; poco a poco: primero solo 2026»). La carga de octubre emparejaba cada firmada con su enviada y lo que no
casó se quedó fuera. Solo LEE: cada fichero de PRESUPUESTOS FIRMADOS del año contra las hojas de la app.

  Del nombre del fichero: la dirección (calle + número) y la fecha («dd-mm-aaaa»; si no trae, la del fichero).
  En la app: las opps cuyos PORTALES (accesos) tienen esa calle y ese número (o su nombre, si no tienen portales), y
  sus hojas (cualquier tipo y estado, menos anuladas) con su fecha de firma o de creación.
  Veredicto:
    ESTÁ            hoja de esa opp a ±21 días de la fecha del fichero
    HOJA OTRA FECHA la opp tiene hojas, pero ninguna de esas fechas (¿otro encargo? ¿falta esta?)
    OPP SIN HOJA    la opp existe y no tiene ninguna hoja
    SIN OPP         no se encuentra la dirección
    NO ES HOJA      facturas, códigos de pedido, órdenes de compra de contratas, actas
  python scripts/auditoria/firmadas_drive_contra_app.py 2026   -> docs/auditoria/firmadas_2026_contra_app.xlsx
"""
import sys, os, re, datetime, collections, unicodedata
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402
from openpyxl import Workbook  # noqa: E402
from openpyxl.styles import Font, PatternFill, Alignment  # noqa: E402

ANIO = sys.argv[1] if len(sys.argv) > 1 else '2026'
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
DRIVE = r'G:\Mi unidad\MONICA ACCESALIA\PRESUPUESTOS\PRESUPUESTOS FIRMADOS'
b = arrancar()


def plano(s):
    s = unicodedata.normalize('NFD', str(s or '').upper())
    return re.sub(r'[^A-Z0-9 ]', ' ', ''.join(c for c in s if unicodedata.category(c) != 'Mn'))


VACIAS = set('CP CDAD PROP C CL CALLE AV AVD AVDA AVENIDA PZ PZA PLAZA PS PASEO CTRA CM CAMINO RONDA TRAVESIA TR GTA GLORIETA DE DEL LA LAS LOS EL Y N NO '
             'PORTAL PORTALES ESC ESCALERA BLOQUE MADRID PRY PROYECTO CSS SUBV SUBVENCION SUBVENCIONES EXT EXTERNO ASC ASCENSOR ACCES DF DO SATE IEE LEE CEE '
             'FIRMADO FIRMADA PDF HOJA ENCARGO DR CAES CUBIERTA LIBRO EDF EDIFICIO INF INFORME PLATAFORMA RAMPA OC FAIN SCHINDLER THYSSEN TKE OTIS ORONA '
             'CODIGO CODIGOS PEDIDO PEDIDOS NEXT GEN GENERATION MODIF ARQUITECTO Y COPIA SIGNED VIAB VIABILIDAD MEMORIA'.split())
NO_HOJA = re.compile(r'factura|codigo|pedido|\boc\b|orden de compra|acta|justificante|desktop\.ini|\.ini$|localiz|localicador|control de pagos|confirmaci|terminos generales|\.gsheet$', re.I)


def fecha_de(nombre, mod):
    m = re.search(r'(\d{1,2})[-_. ](\d{1,2})[-_. ](20\d\d)', nombre)
    if m:
        try: return datetime.date(int(m.group(3)), int(m.group(2)), int(m.group(1))), True
        except ValueError: pass
    return datetime.date.fromisoformat(mod), False


ficheros = []
for raiz, _, fs in os.walk(DRIVE):
    for f in fs:
        ruta = os.path.join(raiz, f)
        mod = datetime.date.fromtimestamp(os.path.getmtime(ruta)).isoformat()
        fecha, del_nombre = fecha_de(f, mod)
        if str(fecha.year) == ANIO: ficheros.append((os.path.relpath(ruta, DRIVE), f, fecha, del_nombre))

# la app: opps vivas con sus portales y sus hojas
ops = {o['id']: o for o in b.leer('oportunidades?select=id,codigo,nombre,estado,comunidad_id&estado=neq.anulada&order=id')}
acc = {a['id']: a for a in b.leer('accesos?select=id,nombre_via,numero,municipio&order=id')}
por_opp = collections.defaultdict(list)
for r in b.leer('relacion_oportunidad_accesos?select=opp_id,acceso_id&hasta=is.null&order=opp_id'):
    if r['opp_id'] in ops: por_opp[r['opp_id']].append(acc[r['acceso_id']])
hojas = collections.defaultdict(list)
for h in b.leer('hojas_encargo?select=id,numero_hoja,tipo_documento,estado,fecha_firma,fecha_creacion,descripcion,oportunidad_id,'
                'versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(fecha_enviada,pdfs_firmados)&estado=neq.anulada&order=id'):
    if h['oportunidad_id']: hojas[h['oportunidad_id']].append(h)


def numero(n): return re.match(r'\d+', str(n or '')).group() if re.match(r'\d+', str(n or '')) else None


# índice: (palabra significativa de la calle, número) -> opps
indice = collections.defaultdict(set)
for oid, accs in por_opp.items():
    for a in accs:
        n = numero(a['numero'])
        for w in plano(a['nombre_via']).split():
            if len(w) >= 3 and w not in VACIAS and n: indice[(w, n)].add(oid)
for oid, o in ops.items():  # opps sin portales: por su nombre
    if por_opp.get(oid): continue
    t = plano(o['nombre']); ns = re.findall(r'\b\d+\b', t)
    for w in t.split():
        if len(w) >= 3 and w not in VACIAS and not w.isdigit():
            for n in ns: indice[(w, n)].add(oid)


def opps_de(nombre):
    t = plano(re.sub(r'\d{1,2}[-_. ]\d{1,2}[-_. ]20\d\d', ' ', nombre.rsplit('.', 1)[0]))
    palabras = [w for w in t.split() if len(w) >= 3 and w not in VACIAS and not re.match(r'\d', w)]
    nums = [n for n in re.findall(r'\b(\d+)[A-Z]?\b', t) if len(n) <= 4]  # «24B», «22C»: el número del portal
    votos = collections.Counter()
    for w in palabras:
        for n in nums:
            for oid in indice.get((w, n), ()): votos[oid] += 1
    if not votos: return [], palabras, nums
    mejor = max(votos.values())
    return [oid for oid, v in votos.items() if v == mejor], palabras, nums


filas, cuenta = [], collections.Counter()
for rel, f, fecha, del_nombre in sorted(ficheros, key=lambda x: x[2]):
    if NO_HOJA.search(f):
        cuenta['NO ES HOJA'] += 1; filas.append(['NO ES HOJA', rel, fecha, '', '', '', '']); continue
    cands, palabras, nums = opps_de(f)
    if not cands:
        cuenta['SIN OPP'] += 1; filas.append(['SIN OPP', rel, fecha, '', '', '', 'palabras %s, números %s' % (' '.join(palabras), ' '.join(nums))]); continue
    cerca, otras = [], []
    for oid in cands:
        for h in hojas.get(oid, []):
            if h['fecha_firma']:
                d = abs((datetime.date.fromisoformat(h['fecha_firma'][:10]) - fecha).days); ok = d <= 21
            else:  # sin fecha de firma: la firmada llega después del envío (hasta 5 meses)
                envio = min([v['fecha_enviada'] for v in h.get('versiones_hoja') or [] if v.get('fecha_enviada')] or [h['fecha_creacion']])
                d = (fecha - datetime.date.fromisoformat(envio[:10])).days; ok = -7 <= d <= 150; d = abs(d)
            (cerca if ok else otras).append((d, h, oid))
    cods = ', '.join('%s %s' % (ops[o]['codigo'], ops[o]['nombre']) for o in cands[:3])
    if cerca:
        d, h, oid = min(cerca, key=lambda x: x[0])
        con_pdf = any(x.get('pdfs_firmados') for x in h.get('versiones_hoja') or [])
        v = 'ESTÁ' if h['estado'] == 'devuelta_firmada' else 'ESTÁ SIN FIRMAR'
        det = '%s (%s, %s, firma %s, creada %s%s)' % (h['numero_hoja'], h['tipo_documento'], h['estado'], h['fecha_firma'] or '-', h['fecha_creacion'],
                                                    ', con PDF firmado' if con_pdf else ', SIN PDF firmado')
    elif otras:
        v = 'HOJA OTRA FECHA'
        det = '; '.join('%s %s (%s)' % (h['numero_hoja'], h['fecha_firma'] or h['fecha_creacion'], h['estado']) for _, h, _ in sorted(otras, key=lambda x: x[0])[:4])
    else:
        v = 'OPP SIN HOJA'; det = ''
    cuenta[v] += 1
    filas.append([v, rel, fecha, cods, det, 'fecha del nombre' if del_nombre else 'fecha del fichero', ''])

for k in ['ESTÁ', 'ESTÁ SIN FIRMAR', 'HOJA OTRA FECHA', 'OPP SIN HOJA', 'SIN OPP', 'NO ES HOJA']: print('%-16s %4d' % (k, cuenta[k]))
wb = Workbook(); ws = wb.active; ws.title = 'Firmadas %s' % ANIO
ws.append(['Veredicto', 'Fichero (PRESUPUESTOS FIRMADOS)', 'Fecha', 'Opp', 'Hoja en la app', 'De dónde la fecha', 'Nota'])
for c in ws[1]: c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor='3D3D3D')
orden = {'OPP SIN HOJA': 0, 'HOJA OTRA FECHA': 1, 'ESTÁ SIN FIRMAR': 2, 'SIN OPP': 3, 'ESTÁ': 4, 'NO ES HOJA': 5}
for f in sorted(filas, key=lambda x: (orden[x[0]], x[2])): ws.append(f)
for i, w in enumerate([16, 70, 11, 50, 60, 16, 40]): ws.column_dimensions[chr(65 + i)].width = w
for r in ws.iter_rows(min_row=2):
    for c in r: c.alignment = Alignment(wrap_text=True, vertical='top')
ws.freeze_panes = 'A2'
destino = os.path.join(RAIZ, 'docs', 'auditoria', 'firmadas_%s_contra_app.xlsx' % ANIO)
wb.save(destino); print(destino)
