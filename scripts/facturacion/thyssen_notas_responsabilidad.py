# -*- coding: utf-8 -*-
"""THYSSEN (hoy TKE): el histórico consultable (Mónica, 19-oct-2026: «mejor tener el histórico consultable»; «estamos
trabajando para reabrir esas puertas»).

Thyssen no firmaba hoja; sus obras (opps de 2014-2018, proyecto de ascensor) solo tenían FACTURAS sueltas apuntadas a la
opp. A cada opp con facturas a Thyssen se le hace su NOTA DE RESPONSABILIDAD (a nombre de Mónica) con una línea de
proyecto y los tres pagos de Thyssen, que cobra SIEMPRE 60 / 20 / 20 (Mónica: «sí»):
  60 % proyecto y presentación de licencia · 20 % licencia · 20 % fin de obra.
  - el total sale de lo que dicen sus facturas («20 % de 5.000», «60 %» = 3.000 -> 5.000, «20 %» = 400 -> 2.000...);
    las que no dicen porcentaje son el 20 % de su fase (las fichas de Dropbox confirman proyectos completos de Thyssen);
  - cada factura va a su pago por lo que dice; si cubre dos (Imperial 23: licencia + fin de obra) se reparte;
  - lo ANTERIOR a la primera factura que hay en la app se facturó antes de 2019, cuando no había FactuSOL: queda
    completado con esa nota (Mónica: «1 ok»); lo POSTERIOR sin factura queda pendiente, para que lo compruebe («2 ok»).
  - «Extremadura 244 DUPLICADO» es la dirección (244 bis), no una copia de la factura.

  python scripts/facturacion/thyssen_notas_responsabilidad.py [--escribir]
"""
import sys, os, re, json, uuid, datetime, collections, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
MONICA = '52fa7b0f-e72b-4338-b3f8-7ad0833a8ba7'
TKE = 'f181ab05-fc99-4415-91af-2c5b62389a55'
FASES = [('entrega', 60), ('licencia', 20), ('cfo', 20)]
b = arrancar()
BLOQUE = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo')}
TIPO = {x['clave']: x['id'] for x in b.leer('tipos_proyecto?select=id,clave')}


def fases_de(t):
    t = re.sub(r'\(?\s*resta de abonar[^)]*\)?', '', t.lower())  # «(Resta de abonar el 20 % por fin de obra)» no es lo que cobra
    f = []
    if re.search(r'60\s*%|realizaci[oó]n de proyecto', t): f.append('entrega')
    if re.search(r'licencia|inicio de obra', t) and not re.search(r'60\s*%', t): f.append('licencia')
    if re.search(r'fin de obra|final de obra|\bcfo\b', t): f.append('cfo')
    return f


facturas = b.leer('facturas?select=id,empresa_emisora,anio,numero,fecha,estado,oportunidad_id,lineas:factura_lineas(id,concepto,base,'
                  'enl:factura_linea_hitos(hito_cobro_id))&pagador_nombre=ilike.*thyssen*&estado=neq.anulada&order=fecha')
ya = {h['oportunidad_id'] for h in b.leer('hojas_encargo?select=oportunidad_id&pagador_contrata_id=eq.' + TKE)}
por_opp = collections.defaultdict(list)
for f in facturas:
    if not f['oportunidad_id'] or f['oportunidad_id'] in ya: continue
    for l in f['lineas']:
        if float(l['base'] or 0) > 0:
            assert not l['enl'], (f['anio'], f['numero'])
            por_opp[f['oportunidad_id']].append((f, l))

plan = []
for oid, items in por_opp.items():
    if oid in ya: continue  # ya hecha (si se corta a medias, se vuelve a lanzar)
    o = b.leer('oportunidades?select=id,codigo,nombre,comunidad_id&id=eq.' + oid)[0]
    trozos, totales = [], set()
    for f, l in items:
        t = ' '.join(l['concepto'].split()); base = float(l['base'])
        fs = fases_de(t)
        assert fs, (o['nombre'], t)
        m = re.search(r'de\s+([\d\.]+)(?:,00)?\s*(?:€|\+|euros)', t)
        if m: totales.add(float(m.group(1).replace('.', '')))
        else: totales.add(round(base / (sum(p for fa, p in FASES if fa in fs) / 100)))
        por = base / len(fs)
        for fa in fs: trozos.append((fa, por, l['id'], '%s %s/1-%s' % (f['empresa_emisora'].replace('daniel', 'Daniel'), f['anio'], f['numero']), f['fecha']))
    assert len(totales) == 1, (o['nombre'], totales)
    T = totales.pop()
    hechas = [fa for fa, _ in FASES if any(z[0] == fa for z in trozos)]
    primera = min(i for i, (fa, _) in enumerate(FASES) if fa in hechas)
    pagos = []
    for i, (fa, p) in enumerate(FASES):
        imp = round(T * p / 100, 2)
        zs = [z for z in trozos if z[0] == fa]
        cob = round(sum(z[1] for z in zs), 2)
        assert cob <= imp + 0.01, (o['nombre'], fa, cob, imp)
        if zs: est = 'completado' if abs(cob - imp) < 0.01 else 'parcial'
        elif i < primera: est = 'antes2019'
        else: est = 'pendiente'
        pagos.append((fa, p, imp, est, zs))
    fecha = min(f['fecha'] for f, _ in items)
    plan.append(dict(o=o, T=T, pagos=pagos, fecha=fecha, refs=sorted({z[3] for z in trozos})))
    print('%-38s %6g | %s' % (o['nombre'][:38], T, ' · '.join('%s %g %s%s' % (fa, imp, est, ' (' + ', '.join(z[3] for z in zs) + ')' if zs else '') for fa, p, imp, est, zs in pagos)))
print(len(plan), 'notas de responsabilidad')
if not ESCRIBIR:
    print('EN SECO'); sys.exit()

for x in plan:
    o, T = x['o'], x['T']
    anio = int(x['fecha'][:4])
    req = urllib.request.Request(b.url + '/rest/v1/rpc/siguiente_codigo', data=json.dumps({'p_tipo': 'HE', 'p_anio': anio}).encode(),
                                 headers=dict(b.cab, **{'Content-Type': 'application/json'}), method='POST')
    cod = json.loads(urllib.request.urlopen(req).read())
    motivo = ('Thyssen (hoy TKE) no firmaba hoja de encargo; obra anterior a la app (%s). Consta por sus facturas (%s): proyecto de '
              'ascensor de %s € que Thyssen pagaba siempre 60 %% proyecto y presentación de licencia / 20 %% licencia / 20 %% fin de obra. '
              'Lo anterior a 2019 se facturó antes de FactuSOL (Mónica, %s).' % (o['codigo'], ', '.join(x['refs']), '{:,.0f}'.format(T).replace(',', '.'), HOY))
    hid, vid, lid = str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())
    b.insertar('hojas_encargo', [dict(id=hid, numero_hoja=cod, oportunidad_id=o['id'], comunidad_id=o['comunidad_id'], pagador_tipo='contrata',
               pagador_contrata_id=TKE, emisor='daniel_autonomo', fecha_creacion=x['fecha'], fecha_firma=x['fecha'], estado='devuelta_firmada',
               fecha_estado=x['fecha'] + 'T00:00:00+00:00', descripcion='Nota de responsabilidad · Thyssen · ' + o['nombre'],
               tipo_documento='nota_responsabilidad', responsable_id=MONICA, motivo_sin_firma=motivo)])
    b.insertar('versiones_hoja', [dict(id=vid, hoja_encargo_id=hid, numero_version=1, fecha_generada=x['fecha'], importe_base=T, iva_porcentaje=21,
               forma_pago='Norma de Thyssen: 60 % proyecto y presentación de licencia, 20 % licencia, 20 % fin de obra', notas=motivo)])
    b.actualizar('hojas_encargo?id=eq.' + hid, {'version_firmada_id': vid})
    b.insertar('lineas_facturacion', [dict(id=lid, hoja_encargo_id=hid, bloque_id=BLOQUE['REDACCION PROYECTO'], descripcion='Proyecto de instalación de ascensor (Thyssen)',
               importe=T, es_porcentaje=False, notas=motivo, origen='nota_responsabilidad', verificado=True, emisor='daniel_autonomo',
               pagador_tipo='contrata', pagador_id=TKE, forma_cobro='transferencia', creada_por=MONICA)])
    for orden, (fa, p, imp, est, zs) in enumerate(x['pagos'], 1):
        tid = str(uuid.uuid4())
        nota = 'Facturado antes de 2019: no está en FactuSOL (Mónica, %s).' % HOY if est == 'antes2019' else None
        b.insertar('hitos_cobro', [dict(id=tid, linea_facturacion_id=lid, hito=fa, orden=orden, porcentaje=p, importe=imp,
                   estado='completado' if est == 'antes2019' else est, notas=nota)])
        for z in zs: b.insertar('factura_linea_hitos', [dict(factura_linea_id=z[2], hito_cobro_id=tid, importe=round(z[1], 2), como='a_mano')])
    print(cod, o['nombre'])
print('ESCRITO')
