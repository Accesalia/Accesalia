# -*- coding: utf-8 -*-
"""Genera los presupuestos de la APP (origen='app') desde las hojas de encargo, para compararlos con los de Factusol
(Monica, 10-oct-2026). "Una opp, un presupuesto, al menos esta vez que lo hacemos en retrospectiva. Seguro que salen
excepciones, pero de momento lo planteamos asi. Para presupuestos del futuro, lo pensaremos bien."

Por cada oportunidad con hojas de 2025-2026 enviadas o firmadas (sin anuladas ni sustituidas por otra):
  - lineas: firmadas -> lineas_facturacion (lo releido del papel); enviadas -> conceptos_hoja de su ultima version;
  - pagador: el de las lineas si lo hay; si no, la comunidad;
  - forma de pago: la de las lineas (cargo en cuenta / transferencia), si la hay;
  - fecha: la de envio mas reciente; IVA 21%.
Cada linea guarda hoja_encargo_id (y linea_facturacion_id en las firmadas): de donde sale.

  python scripts/facturacion/generar_presupuestos_app.py [--escribir]
"""
import sys, os, json, collections, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

FORMA = {'cargo_cuenta': 'cargo_en_cuenta', 'transferencia': 'transferencia'}


def main():
    b = arrancar()
    hojas = [h for h in b.leer('hojas_encargo?select=id,numero_hoja,estado,oportunidad_id,comunidad_id,fecha_creacion,'
                               'comunidades(nombre,cif_comunidad,domicilio_fiscal,municipio)&estado=in.(enviada_comunidad,devuelta_firmada)')
             if (h['numero_hoja'] or '')[3:7] in ('2025', '2026') and h['oportunidad_id']]
    sustituidas = {s['hoja_antigua_id'] for s in b.leer('sustituciones_hoja?select=hoja_antigua_id')}
    hojas = [h for h in hojas if h['id'] not in sustituidas]
    ids = {h['id'] for h in hojas}
    vers = collections.defaultdict(list)
    for v in b.leer('versiones_hoja?select=id,hoja_encargo_id,numero_version,fecha_enviada,fecha_generada'):
        if v['hoja_encargo_id'] in ids: vers[v['hoja_encargo_id']].append(v)
    ultima = {hid: max(vs, key=lambda v: v['numero_version'] or 0) for hid, vs in vers.items()}
    conceptos = collections.defaultdict(list)
    for c in b.leer('conceptos_hoja?select=id,hoja_encargo_id,version_hoja_id,descripcion,importe,porcentaje,incluido,incluido_en_concepto_id'):
        if c['hoja_encargo_id'] in ids: conceptos[c['hoja_encargo_id']].append(c)
    lineas = collections.defaultdict(list)
    for l in b.leer('lineas_facturacion?select=id,hoja_encargo_id,descripcion,importe,es_porcentaje,porcentaje,pagador_tipo,pagador_id,forma_cobro'):
        if l['hoja_encargo_id'] in ids: lineas[l['hoja_encargo_id']].append(l)
    contratas = {c['id']: c for c in b.leer('contratas?select=id,nombre,cif,domicilio_fiscal')}
    por_opp = collections.defaultdict(list)
    for h in hojas: por_opp[h['oportunidad_id']].append(h)

    presus = []
    for oid, hs in por_opp.items():
        hs.sort(key=lambda h: h['numero_hoja'])
        items, pagadores, formas, fechas = [], collections.Counter(), collections.Counter(), []
        for h in hs:
            v = ultima.get(h['id'])
            fechas.append((v or {}).get('fecha_enviada') or (v or {}).get('fecha_generada') or h['fecha_creacion'])
            if h['estado'] == 'devuelta_firmada' and lineas[h['id']]:
                for l in lineas[h['id']]:
                    items.append({'concepto': l['descripcion'], 'importe': None if l['es_porcentaje'] else l['importe'],
                                  'porcentaje': l['porcentaje'] if l['es_porcentaje'] else None, 'hoja': h['id'], 'linea': l['id']})
                    if l['pagador_tipo']: pagadores[(l['pagador_tipo'], l['pagador_id'])] += 1
                    if l['forma_cobro'] in FORMA: formas[FORMA[l['forma_cobro']]] += 1
            else:
                cs = [c for c in conceptos[h['id']] if not c['version_hoja_id'] or not v or c['version_hoja_id'] == v['id']]
                for c in cs:
                    items.append({'concepto': c['descripcion'], 'importe': c['importe'], 'porcentaje': c['porcentaje'],
                                  'hoja': h['id'], 'linea': None, 'incluido': bool(c['incluido_en_concepto_id'])})
        if not items: continue
        com = hs[0].get('comunidades') or {}
        if pagadores:
            (ptipo, pid), _ = pagadores.most_common(1)[0]
        else:
            ptipo, pid = 'comunidad', hs[0]['comunidad_id']
        nom = nif = dom = pob = None
        if ptipo == 'comunidad':
            nom, nif, dom, pob = com.get('nombre'), com.get('cif_comunidad'), com.get('domicilio_fiscal'), com.get('municipio')
        elif ptipo == 'contrata' and pid in contratas:
            c = contratas[pid]; nom, nif, dom = c['nombre'], c['cif'], c['domicilio_fiscal']
        base = round(sum(float(i['importe'] or 0) for i in items if not i.get('incluido')), 2)
        fs = [f for f in fechas if f]
        fecha = max(fs) if fs else None
        presus.append(({'origen': 'app', 'empresa_emisora': 'accesalia', 'anio': int(fecha[:4]) if fecha else None, 'serie': 'APP',
                        'fecha': fecha, 'estado': 'aceptado' if all(h['estado'] == 'devuelta_firmada' for h in hs) else 'pendiente',
                        'pagador_tipo': ptipo, 'pagador_id': pid, 'pagador_nombre': nom, 'pagador_nif': nif,
                        'pagador_domicilio': dom, 'pagador_poblacion': pob,
                        'forma_pago': formas.most_common(1)[0][0] if formas else None,
                        'base': base, 'iva_desglose': [{'tipo': 21, 'base': base, 'cuota': round(base * 0.21, 2)}],
                        'irpf_porcentaje': 0, 'irpf_importe': 0, 'total': round(base * 1.21, 2), 'oportunidad_id': oid,
                        'notas': 'Generado desde las hojas: ' + ', '.join(h['numero_hoja'] for h in hs)}, items))
    c = collections.Counter(len(set(i['hoja'] for i in it)) for _, it in presus)
    print('oportunidades -> presupuestos: %d | lineas: %d | hojas por presupuesto: %s'
          % (len(presus), sum(len(i) for _, i in presus), dict(sorted(c.items()))))
    print('por año: %s | aceptados (todas firmadas): %d' % (dict(collections.Counter(p['anio'] for p, _ in presus)),
                                                           sum(1 for p, _ in presus if p['estado'] == 'aceptado')))
    if '--escribir' not in sys.argv:
        print('(marcha en seco)'); return
    ya = {x['oportunidad_id'] for x in b.leer('presupuestos?select=oportunidad_id&origen=eq.app')}
    cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
    n = 0
    for p, it in presus:
        if p['oportunidad_id'] in ya: continue
        req = urllib.request.Request(b.url + '/rest/v1/presupuestos?select=id', data=json.dumps([p], ensure_ascii=False).encode('utf-8'),
                                     headers=cab, method='POST')
        with urllib.request.urlopen(req) as r:
            pid = json.loads(r.read().decode('utf-8'))[0]['id']
        b.insertar('presupuesto_lineas', [{'presupuesto_id': pid, 'posicion': k + 1, 'concepto': i['concepto'], 'cantidad': 1,
                                           'precio': i['importe'], 'base': 0 if i.get('incluido') else i['importe'],
                                           'iva_porcentaje': 21, 'irpf_porcentaje': 0,
                                           'total': 0 if i.get('incluido') else i['importe'],
                                           'hoja_encargo_id': i['hoja'], 'linea_facturacion_id': i['linea']} for k, i in enumerate(it)])
        n += 1
    print('escritos: %d' % n)


if __name__ == '__main__':
    main()
