# -*- coding: utf-8 -*-
"""LAS PROFORMAS DE 2026 QUE YA EXISTIAN: LOS PEDIDOS DE FACTUSOL (Monica, 19-oct-2026). Alexandra emitia las
proformas en Factusol como pedidos de cliente (serie 1, del 1 al 37 en Accesalia 2026). Se vuelcan a la app con EL
MISMO NUMERO: el pedido 23 es la ACC-PF-26-0023. Desde ahi la app sigue la serie y el puente escribe en Factusol el
pedido con su mismo numero (un numero en los dos sitios).

Entrada: pedidos_2026.json, de sacar_pedidos_factusol.ps1 (COPIA de los .accdb).
  - Pedido YA FACTURADO (sus lineas de factura apuntan a el): se enlaza con su factura de la app, toma la oportunidad
    de la factura y, linea a linea, los hitos que la factura ya tiene casados. Si las lineas no cuadran, lo dice.
  - Pedido PENDIENTE: entra con sus lineas, SIN oportunidad ni hitos: eso se decide a mano (Monica / Alexandra), no
    se adivina. Sale en la lista de revision.
Se ignora la serie 9 (la prueba de importacion del 19-oct en Ecobalance). Si la app ya tiene proformas de ese año y
empresa, no hace nada: la numeracion la pone la base al insertar, en orden, y tiene que salir igual que en Factusol.

  python scripts/facturacion/volcar_proformas_factusol.py <pedidos_2026.json> [--escribir]
"""
import sys, os, json, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

EMPRESA = {'001': 'daniel', '002': 'accesalia', '003': 'ecobalance'}
ALEXANDRA = '1a6d5258-ea8d-4bcd-ae03-163bf8649151'


def n(x):
    return None if x in (None, '') else round(float(x), 2)


def t(x):
    return (str(x).strip() or None) if x is not None else None


def main():
    d = json.load(open(sys.argv[1], encoding='utf-8-sig'))
    escribir = '--escribir' in sys.argv
    b = arrancar()
    pedidos = [p for p in d['pedidos'] if str(p['TIPPCL']) == '1']
    lineas = {}
    for l in d['lineas']:
        lineas.setdefault((l['empresa'], str(l['TIPLPC']), int(l['CODLPC'])), []).append(l)
    factura_de = {}
    for x in d['de_factura']:
        factura_de.setdefault((x['empresa'], str(x['DTPLFA']), int(x['DCOLFA'])), set()).add((str(x['TIPLFA']), int(x['CODLFA'])))

    por_empresa = {}
    for p in sorted(pedidos, key=lambda p: (p['empresa'], int(p['CODPCL']))):
        por_empresa.setdefault(p['empresa'], []).append(p)

    revisar = []
    for e, ps in por_empresa.items():
        empresa = EMPRESA[e]
        nums = [int(p['CODPCL']) for p in ps]
        if nums != list(range(1, len(nums) + 1)):
            print('%s: los pedidos no van del 1 seguidos (%s): no se vuelca' % (empresa, nums)); continue
        ya = b.leer('proformas?select=id&empresa=eq.%s&anio=eq.2026' % empresa)
        if ya:
            print('%s: la app ya tiene %d proformas de 2026: no se vuelca' % (empresa, len(ya))); continue
        print('== %s: %d pedidos' % (empresa, len(ps)))
        for p in ps:
            num = int(p['CODPCL'])
            ls = sorted(lineas.get((e, '1', num), []), key=lambda l: l['POSLPC'] or 0)
            facts = sorted(factura_de.get((e, '1', num), set()))
            fapp = None
            if len(facts) == 1:
                serie, fnum = facts[0]
                r = b.leer('facturas?select=id,oportunidad_id,lineas:factura_lineas(id,posicion,base,hitos:factura_linea_hitos(hito_cobro_id))'
                           '&origen=eq.factusol&tipo=eq.factura&empresa_emisora=eq.%s&anio=eq.2026&serie=eq.%s&numero=eq.%s' % (empresa, serie, fnum))
                fapp = r[0] if r else None
            iva2 = n(p['BAS2PCL']) or n(p['BAS3PCL'])
            base = n(p['BAS1PCL']) or 0
            dom = ', '.join(x for x in (t(p['CDOPCL']), ' '.join(y for y in (t(p['CCPPCL']), t(p['CPOPCL'])) if y)) if x)
            fila = {'empresa': empresa, 'fecha': p['FECPCL'], 'oportunidad_id': fapp['oportunidad_id'] if fapp else None,
                    'pagador_nombre': t(p['CNOPCL']) or '(sin nombre)', 'pagador_nif': t(p['CNIPCL']), 'pagador_domicilio': dom or None,
                    'base': base, 'iva_porcentaje': n(p['PIVA1PCL']) or 0, 'iva': n(p['IIVA1PCL']) or 0,
                    'irpf_porcentaje': n(p['PRET1PCL']) or 0, 'irpf': n(p['IRET1PCL']) or 0, 'total': n(p['TOTPCL']),
                    'estado': 'emitida', 'factura_id': fapp['id'] if fapp else None, 'emitida_por': ALEXANDRA,
                    'notas': 'Volcada de Factusol (19-oct-2026): pedido de cliente 1/%d. Referencia: «%s».' % (num, t(p['REFPCL']) or '')}
            # lineas de la proforma y, si esta facturada, los hitos de la linea de factura de la misma posicion
            flin = sorted((fapp or {}).get('lineas', []), key=lambda l: l['posicion'] or 0)
            cuadra = fapp is not None and len(flin) == len(ls) and all(abs(float(a['base'] or 0) - float(n(l['TOTLPC']) or 0)) < 0.01 for a, l in zip(flin, ls))
            plin = []
            for i, l in enumerate(ls):
                hitos = [h['hito_cobro_id'] for h in flin[i]['hitos']] if cuadra else []
                plin.append(({'posicion': i + 1, 'concepto': t(l['DESLPC']) or '', 'base': n(l['TOTLPC']) or 0}, hitos, n(l['TOTLPC']) or 0))
            estado = ('FACTURADA %s/%s' % facts[0]) if facts else 'PENDIENTE'
            nh = sum(len(x[1]) for x in plin)
            aviso = []
            if iva2: aviso.append('lleva un 2º tipo de IVA')
            if facts and not fapp: aviso.append('su factura no esta en la app')
            if fapp and not cuadra: aviso.append('las lineas no cuadran con su factura: sin hitos')
            if fapp and cuadra and not nh: aviso.append('su factura no tiene hitos casados')
            if len(facts) > 1: aviso.append('sale en %d facturas' % len(facts))
            print('  PF-26-%04d  %s  %-55s %10.2f  %-16s lineas %d hitos %d %s' % (
                num, p['FECPCL'], (t(p['REFPCL']) or '')[:55], float(fila['total'] or 0), estado, len(plin), nh, ('· ' + '; '.join(aviso)) if aviso else ''))
            if not facts:
                revisar.append((num, p))
            if not escribir:
                continue
            cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
            req = urllib.request.Request(b.url + '/rest/v1/proformas?select=id,numero,codigo', data=json.dumps([fila], ensure_ascii=False).encode('utf-8'),
                                         headers=cab, method='POST')
            with urllib.request.urlopen(req) as r: hecha = json.loads(r.read().decode('utf-8'))[0]
            if hecha['numero'] != num:
                raise SystemExit('PARADO: la proforma del pedido %d ha salido con el numero %s (%s)' % (num, hecha['numero'], hecha['codigo']))
            for lin, hitos, base_l in plin:
                req = urllib.request.Request(b.url + '/rest/v1/proforma_lineas?select=id', data=json.dumps([dict(lin, proforma_id=hecha['id'])], ensure_ascii=False).encode('utf-8'),
                                             headers=cab, method='POST')
                with urllib.request.urlopen(req) as r: lid = json.loads(r.read().decode('utf-8'))[0]['id']
                if hitos:
                    imp = b.leer('hitos_cobro?select=id,importe&id=in.(%s)' % ','.join(hitos))
                    b.insertar('proforma_linea_hitos', [{'proforma_linea_id': lid, 'hito_cobro_id': h['id'], 'importe': n(h['importe']) or 0} for h in imp])
    print('\nPENDIENTES (sin oportunidad ni hitos: a decidir a mano): %d' % len(revisar))
    for num, p in revisar:
        print('  PF-26-%04d  %s  %s · %s · %s €' % (num, p['FECPCL'], t(p['REFPCL']), t(p['CNOPCL']), p['TOTPCL']))
    if not escribir:
        print('(marcha en seco)')


if __name__ == '__main__':
    main()
