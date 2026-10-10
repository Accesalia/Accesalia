# -*- coding: utf-8 -*-
"""MOTOR DE PRESUPUESTOS DE LA APP (origen='app'), desde las hojas de encargo (Monica, 10-oct-2026).

Primero se usa en retrospectiva, para compararlo con los presupuestos hechos en Factusol y pulirlo hasta que haga lo
mismo; despues la app hara los presupuestos y nadie los hara en Factusol.

REGLAS (v2, Monica, 10-oct):
  - UN PRESUPUESTO POR ENVIO: las hojas de la oportunidad enviadas el mismo dia, en su ULTIMA version. (En la app se
    podran marcar a mano las hojas que entran; esto es el criterio para el pasado.)
  - Solo lo que SE COBRA es una linea con precio. La primera de cada hoja lleva el texto fijo: "Segun hoja de encargo de
    fecha ..., honorarios a la contratacion por <concepto> en edificio residencial existente en: <direccion>. El total
    de los honorarios incluye: - ...".
  - Lo INCLUIDO y lo que va A EXITO aparece, pero no cuenta: en una linea a 0.
  - Los bloques 'no_aparece' del catalogo (toma de datos y modelado 3D, tramitacion de licencias, solicitud y analisis
    de presupuestos, fin de obra) NO salen: solo dan el texto. Manda el desglose del BLOQUE por encima del del concepto
    (las hojas volcadas de Drive los traen como 'incluido').
  - Cabecera: quien paga (el de las lineas de la hoja firmada, o la comunidad), su forma de pago (cargo en cuenta /
    transferencia) e IVA 21%.
Cada linea guarda hoja_encargo_id (y linea_facturacion_id en las firmadas): de donde sale.

  python scripts/facturacion/generar_presupuestos_app.py [--escribir]
"""
import sys, os, re, json, collections, urllib.request
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
    bloque_desglose = {x['id']: x['desglose'] for x in b.leer('bloques?select=id,desglose')}
    conceptos = collections.defaultdict(list)
    for c in b.leer('conceptos_hoja?select=id,hoja_encargo_id,version_hoja_id,descripcion,importe,porcentaje,'
                    'incluido_en_concepto_id,desglose,bloque_id'):
        if c['hoja_encargo_id'] in ids: conceptos[c['hoja_encargo_id']].append(c)
    lineas = collections.defaultdict(list)
    for l in b.leer('lineas_facturacion?select=id,hoja_encargo_id,descripcion,importe,es_porcentaje,porcentaje,pagador_tipo,pagador_id,forma_cobro'):
        if l['hoja_encargo_id'] in ids: lineas[l['hoja_encargo_id']].append(l)
    contratas = {c['id']: c for c in b.leer('contratas?select=id,nombre,cif,domicilio_fiscal')}

    def fecha_envio(h):
        v = ultima.get(h['id']) or {}
        return v.get('fecha_enviada') or v.get('fecha_generada') or h['fecha_creacion']

    def aparece(c):
        if bloque_desglose.get(c.get('bloque_id')) == 'no_aparece': return 'no_aparece'
        return c.get('desglose') or ('se_cobra' if c.get('importe') else 'incluido')

    grupos = collections.defaultdict(list)
    for h in hojas: grupos[(h['oportunidad_id'], fecha_envio(h))].append(h)

    presus = []
    for (oid, fenv), hs in grupos.items():
        hs.sort(key=lambda h: h['numero_hoja'])
        com = hs[0].get('comunidades') or {}
        direccion = re.sub(r'^CP\s+', '', com.get('nombre') or '')
        items, pagadores, formas = [], collections.Counter(), collections.Counter()
        for h in hs:
            v = ultima.get(h['id'])
            fh = (v or {}).get('fecha_generada') or h['fecha_creacion']
            fh_txt = '%s/%s/%s' % (fh[8:10], fh[5:7], fh[:4]) if fh else ''
            cs = [c for c in conceptos[h['id']] if not c['version_hoja_id'] or not v or c['version_hoja_id'] == v['id']]
            if h['estado'] == 'devuelta_firmada' and lineas[h['id']]:
                # firmada: lo releido del papel manda en los importes
                cobra = [{'nombre': l['descripcion'], 'importe': None if l['es_porcentaje'] else l['importe'],
                          'pct': l['porcentaje'] if l['es_porcentaje'] else None, 'linea': l['id']} for l in lineas[h['id']]]
                for l in lineas[h['id']]:
                    if l['pagador_tipo']: pagadores[(l['pagador_tipo'], l['pagador_id'])] += 1
                    if l['forma_cobro'] in FORMA: formas[FORMA[l['forma_cobro']]] += 1
            else:
                cobra = [{'nombre': c['descripcion'], 'importe': c['importe'], 'pct': c['porcentaje'], 'linea': None}
                         for c in cs if aparece(c) == 'se_cobra']
            incluidos = [c['descripcion'] for c in cs if aparece(c) == 'incluido' and not c['incluido_en_concepto_id']]
            con_precio = [x for x in cobra if x['importe']]
            a_exito = ['%s (a éxito%s)' % (x['nombre'], ', %s %%' % x['pct'] if x['pct'] else '') for x in cobra if not x['importe']]
            for k, x in enumerate(con_precio):
                if k == 0:
                    txt = ('Según hoja de encargo de fecha %s, honorarios a la contratación por %s en edificio residencial '
                           'existente en: %s' % (fh_txt, x['nombre'], direccion))
                    if incluidos: txt += '. El total de los honorarios incluye: ' + ' '.join('- ' + i for i in incluidos)
                else:
                    txt = x['nombre']
                items.append({'concepto': txt, 'importe': x['importe'], 'hoja': h['id'], 'linea': x['linea']})
            if a_exito:
                items.append({'concepto': 'Incluido en el presupuesto, sin coste en este momento: ' + ' '.join('- ' + i for i in a_exito),
                              'importe': 0, 'hoja': h['id'], 'linea': None})
        if not items: continue
        if pagadores:
            (ptipo, pid), _ = pagadores.most_common(1)[0]
        else:
            ptipo, pid = 'comunidad', hs[0]['comunidad_id']
        nom = nif = dom = pob = None
        if ptipo == 'comunidad':
            nom, nif, dom, pob = com.get('nombre'), com.get('cif_comunidad'), com.get('domicilio_fiscal'), com.get('municipio')
        elif ptipo == 'contrata' and pid in contratas:
            c = contratas[pid]
            nom, nif, dom = c['nombre'], c['cif'], c['domicilio_fiscal']
        base = round(sum(float(i['importe'] or 0) for i in items), 2)
        presus.append(({'origen': 'app', 'empresa_emisora': 'accesalia', 'anio': int(fenv[:4]) if fenv else None, 'serie': 'APP',
                        'fecha': fenv, 'estado': 'aceptado' if all(h['estado'] == 'devuelta_firmada' for h in hs) else 'pendiente',
                        'pagador_tipo': ptipo, 'pagador_id': pid, 'pagador_nombre': nom, 'pagador_nif': nif,
                        'pagador_domicilio': dom, 'pagador_poblacion': pob,
                        'forma_pago': formas.most_common(1)[0][0] if formas else None,
                        'base': base, 'iva_desglose': [{'tipo': 21, 'base': base, 'cuota': round(base * 0.21, 2)}],
                        'irpf_porcentaje': 0, 'irpf_importe': 0, 'total': round(base * 1.21, 2), 'oportunidad_id': oid,
                        'notas': 'Generado desde las hojas: ' + ', '.join(h['numero_hoja'] for h in hs)}, items))

    cnt = collections.Counter(len(set(i['hoja'] for i in it)) for _, it in presus)
    print('presupuestos (uno por envio): %d | lineas: %d | hojas por presupuesto: %s'
          % (len(presus), sum(len(i) for _, i in presus), dict(sorted(cnt.items()))))
    print('lineas por presupuesto: %s' % dict(sorted(collections.Counter(len(i) for _, i in presus).items())))
    if '--escribir' not in sys.argv:
        print('(marcha en seco)'); return
    ya = {(x['oportunidad_id'], x['fecha']) for x in b.leer('presupuestos?select=oportunidad_id,fecha&origen=eq.app')}
    cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
    n = 0
    for p, it in presus:
        if (p['oportunidad_id'], p['fecha']) in ya: continue
        req = urllib.request.Request(b.url + '/rest/v1/presupuestos?select=id', data=json.dumps([p], ensure_ascii=False).encode('utf-8'),
                                     headers=cab, method='POST')
        with urllib.request.urlopen(req) as r:
            pid = json.loads(r.read().decode('utf-8'))[0]['id']
        b.insertar('presupuesto_lineas', [{'presupuesto_id': pid, 'posicion': k + 1, 'concepto': i['concepto'], 'cantidad': 1,
                                           'precio': i['importe'], 'base': i['importe'], 'iva_porcentaje': 21, 'irpf_porcentaje': 0,
                                           'total': i['importe'], 'hoja_encargo_id': i['hoja'], 'linea_facturacion_id': i['linea']}
                                          for k, i in enumerate(it)])
        n += 1
    print('escritos: %d' % n)


if __name__ == '__main__':
    main()
