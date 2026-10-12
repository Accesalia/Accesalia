# -*- coding: utf-8 -*-
"""ENLAZAR LAS FACTURAS DE FACTUSOL CON SU PROFORMA (Monica, 12-oct-2026): "en Factusol, al generar una factura,
vincularla a la proforma emitida en la app".

La factura lleva el codigo de la proforma DELANTE en su Referencia ("ACC-PF-26-10-0003 · RIO LLOBREGAT 10 3 de 3").
Despues de volcar las facturas (volcar_facturas_factusol.py), esto:
  1. busca en la Referencia de cada factura un codigo ACC-/AUT-/ECO-PF-AA-MM-NNNN de una proforma sin factura,
     de la MISMA empresa;
  2. apunta proformas.factura_id (y la oportunidad de la factura, si no la tenia);
  3. pasa los hitos de la proforma a las lineas de la factura (factura_linea_hitos): misma cantidad de lineas y
     mismas bases, una a una; o una sola linea por la base entera. Si no cuadra, lo dice y no lo inventa;
  4. factura cobrada: sus hitos (o subhitos) completos pasan a completado, y su hito padre a parcial/completado.

Relanzable: lo ya enlazado no se toca. Sin --escribir, solo dice lo que haria.

  python scripts/facturacion/enlazar_proformas.py [--escribir]
"""
import sys, os, re, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

CODIGO = re.compile(r'\b(ACC|AUT|ECO)-PF-(\d{2})-(\d{2})-(\d{4})\b', re.I)
EMPRESA = {'ACC': 'accesalia', 'AUT': 'daniel', 'ECO': 'ecobalance'}


def cerca(a, b, tol=0.5):
    return abs(float(a or 0) - float(b or 0)) <= tol


def main():
    escribir = '--escribir' in sys.argv
    b = arrancar()
    proformas = {p['codigo']: p for p in b.leer(
        'proformas?select=id,codigo,empresa,oportunidad_id,base,factura_id,estado,'
        'lineas:proforma_lineas(posicion,base,hitos:proforma_linea_hitos(hito_cobro_id,importe))&estado=eq.emitida')}
    ya = {p['factura_id'] for p in proformas.values() if p['factura_id']}
    facturas = b.leer('facturas?select=id,empresa_emisora,anio,serie,numero,referencia,estado,base,oportunidad_id,tipo,'
                      'lineas:factura_lineas(id,posicion,base)&referencia=not.is.null&tipo=eq.factura')
    enlazadas = {e['factura_linea_id'] for e in b.leer('factura_linea_hitos?select=factura_linea_id')}
    c = collections.Counter()
    tocados = set()
    for f in facturas:
        m = CODIGO.search(f['referencia'] or '')
        if not m or f['id'] in ya:
            continue
        codigo = '%s-PF-%s-%s-%s' % (m.group(1).upper(), m.group(2), m.group(3), m.group(4))
        num = '%s %s/%s-%s' % (f['empresa_emisora'], f['anio'], f['serie'], f['numero'])
        p = proformas.get(codigo)
        if not p:
            print('  %s: cita %s, que no existe o esta anulada' % (num, codigo)); c['proforma que no existe'] += 1; continue
        if p['factura_id']:
            print('  %s: %s ya tiene otra factura' % (num, codigo)); c['proforma ya facturada'] += 1; continue
        if EMPRESA[m.group(1).upper()] != f['empresa_emisora']:
            print('  %s: %s es de otra empresa' % (num, codigo)); c['empresa distinta'] += 1; continue
        if not cerca(f['base'], p['base'], 1):
            print('  %s: base %s y la proforma %s dice %s (se enlaza igual; mirarlo)' % (num, f['base'], codigo, p['base'])); c['importe distinto'] += 1

        # Las lineas de la factura y sus hitos
        fl = sorted(f['lineas'], key=lambda x: x['posicion'] or 0)
        pl = sorted(p['lineas'], key=lambda x: x['posicion'])
        enlaces = []
        if len(fl) == len(pl) and all(cerca(a['base'], b_['base']) for a, b_ in zip(fl, pl)):
            for a, b_ in zip(fl, pl):
                enlaces += [{'factura_linea_id': a['id'], 'hito_cobro_id': h['hito_cobro_id'], 'importe': h['importe'], 'como': 'proforma'} for h in b_['hitos']]
        elif len(fl) == 1 and cerca(fl[0]['base'], p['base']):
            enlaces = [{'factura_linea_id': fl[0]['id'], 'hito_cobro_id': h['hito_cobro_id'], 'importe': h['importe'], 'como': 'proforma'} for x in pl for h in x['hitos']]
        else:
            print('  %s: sus lineas no cuadran con las de %s: se enlaza la proforma, las lineas a mano' % (num, codigo)); c['lineas a mano'] += 1
        enlaces = [e for e in enlaces if e['factura_linea_id'] not in enlazadas]
        c['enlazadas'] += 1
        print('  %s -> %s (%d hitos)' % (num, codigo, len(enlaces)))
        if escribir:
            b.actualizar('proformas?id=eq.%s&factura_id=is.null' % p['id'], {'factura_id': f['id']})
            if not f['oportunidad_id'] and p['oportunidad_id']:
                b.actualizar('facturas?id=eq.%s&oportunidad_id=is.null' % f['id'], {'oportunidad_id': p['oportunidad_id']})
            if enlaces:
                b.insertar('factura_linea_hitos', enlaces)
            if f['estado'] == 'cobrada':
                tocados |= {e['hito_cobro_id'] for e in enlaces}

    # ESTADOS, como el casado del 10-oct: hito con factura cobrada = completado; su padre, segun sus subhitos.
    if escribir and tocados:
        padres = set()
        for h in b.leer('hitos_cobro?select=id,hito_padre_id&id=in.(%s)' % ','.join(tocados)):
            b.actualizar('hitos_cobro?id=eq.%s&estado=eq.pendiente' % h['id'], {'estado': 'completado'})
            if h['hito_padre_id']: padres.add(h['hito_padre_id'])
        for hid in padres:
            subs = b.leer('hitos_cobro?select=estado&hito_padre_id=eq.' + hid)
            hechos = sum(1 for x in subs if x['estado'] == 'completado')
            b.actualizar('hitos_cobro?id=eq.%s&estado=in.(pendiente,parcial)' % hid,
                         {'estado': 'completado' if hechos == len(subs) else ('parcial' if hechos else 'pendiente')})
    for k, v in c.most_common(): print('%5d  %s' % (v, k))
    if not escribir: print('(marcha en seco: --escribir para apuntarlo)')


if __name__ == '__main__':
    main()
