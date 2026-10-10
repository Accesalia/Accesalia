# -*- coding: utf-8 -*-
"""Vuelca EN CRUDO los presupuestos de Factusol a `presupuestos` / `presupuesto_lineas` con origen='factusol'
(Monica, 10-oct-2026). Es la mitad "Factusol" del control de calidad: luego se generan los de la app y se comparan.

Entrada: presupuestos_2025_2026.json, sacado de COPIAS de los .accdb (ver memoria factusol-datos) con
sacar_pre.ps1. Tal cual: no se interpreta el concepto ni se casa con nada todavia.
Empresas: 001 Daniel, 002 Accesalia, 003 Ecobalance. Estado: 0 pendiente, 1 aceptado (19 de 21 tienen factura que
sale de ellos); 2 y 3 sin confirmar -> 'otro' (el codigo se guarda en estado_factusol). Forma de pago: 01
transferencia, 02 cargo en cuenta (las unicas que se usan).

  python scripts/facturacion/volcar_presupuestos_factusol.py <presupuestos_2025_2026.json> [--escribir]
"""
import sys, os, json, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

EMPRESA = {'001': 'daniel', '002': 'accesalia', '003': 'ecobalance'}
ESTADO = {0: 'pendiente', 1: 'aceptado'}
FORMA = {'01': 'transferencia', '02': 'cargo_en_cuenta'}


def n(x):
    return None if x in (None, '') else round(float(x), 2)


def main():
    d = json.load(open(sys.argv[1], encoding='utf-8-sig'))
    b = arrancar()
    lin = {}
    for l in d['lineas']:
        lin.setdefault((l['empresa'], l['anio'], str(l['TIPLPS']), int(l['CODLPS'])), []).append(l)
    filas = []
    for p in d['presupuestos']:
        clave = (p['empresa'], p['anio'], str(p['TIPPRE']), int(p['CODPRE']))
        iva = [{'tipo': n(p['PIVA%dPRE' % i]), 'base': n(p['BAS%dPRE' % i]), 'cuota': n(p['IIVA%dPRE' % i])}
               for i in (1, 2, 3) if n(p['BAS%dPRE' % i])]
        filas.append(({'origen': 'factusol', 'empresa_emisora': EMPRESA[p['empresa']], 'anio': int(p['anio']),
                       'serie': str(p['TIPPRE']), 'numero': int(p['CODPRE']), 'fecha': p['FECPRE'],
                       'estado': ESTADO.get(int(p['ESTPRE']), 'otro'), 'estado_factusol': int(p['ESTPRE']),
                       'pagador_nombre': (p['CNOPRE'] or '').strip() or None, 'pagador_nif': (p['CNIPRE'] or '').strip() or None,
                       'pagador_domicilio': (p['CDOPRE'] or '').strip() or None, 'pagador_poblacion': (p['CPOPRE'] or '').strip() or None,
                       'pagador_cp': (p['CCPPRE'] or '').strip() or None, 'pagador_provincia': (p['CPRPRE'] or '').strip() or None,
                       'forma_pago': FORMA.get(str(p['FOPPRE'])), 'base': round(sum(x['base'] for x in iva), 2) if iva else 0,
                       'iva_desglose': iva, 'irpf_porcentaje': n(p['PRET1PRE']), 'irpf_importe': n(p['IRET1PRE']), 'total': n(p['TOTPRE'])},
                      sorted(lin.get(clave, []), key=lambda l: l['POSLPS'] or 0)))
    print('presupuestos: %d | lineas: %d' % (len(filas), sum(len(x[1]) for x in filas)))
    if '--escribir' not in sys.argv: print('(marcha en seco)'); return
    cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
    # los que ya esten (se relanza sin duplicar): el indice unico parcial no sirve de on_conflict en la API
    ya = {(x['empresa_emisora'], x['anio'], x['serie'], x['numero']) for x in
          b.leer('presupuestos?select=empresa_emisora,anio,serie,numero&origen=eq.factusol')}
    hechos = 0
    for p, ls in filas:
        if (p['empresa_emisora'], p['anio'], p['serie'], p['numero']) in ya: continue
        req = urllib.request.Request(b.url + '/rest/v1/presupuestos?select=id',
                                     data=json.dumps([p], ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
        with urllib.request.urlopen(req) as r: res = json.loads(r.read().decode('utf-8'))
        if not res: continue   # ya estaba
        pid = res[0]['id']
        if ls:
            b.insertar('presupuesto_lineas', [{'presupuesto_id': pid, 'posicion': l['POSLPS'], 'concepto': l['DESLPS'],
                                               'cantidad': n(l['CANLPS']), 'precio': n(l['PRELPS']), 'base': n(l['TOTLPS']),
                                               'total': n(l['TOTLPS'])} for l in ls])
        hechos += 1
    print('volcados: %d' % hechos)


if __name__ == '__main__':
    main()
