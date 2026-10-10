# -*- coding: utf-8 -*-
"""Vuelca EN CRUDO las facturas de Factusol de 2025 y 2026 a `facturas` / `factura_lineas` con origen='factusol'
(Monica, 10-oct-2026: "extraer el campo de conceptos primero en crudo y DESPUES interpretar").

Entrada: facturas_2025_2026.json, de sacar_facturas_factusol.ps1 (COPIAS de los .accdb). Tal cual: no se interpreta
el concepto ni se casa con nada todavia; quien paga queda solo como texto (pagador_tipo/pagador_id, al casar).
Empresas: 001 Daniel, 002 Accesalia, 003 Ecobalance. Estado: 0 pendiente, 1 cobrada en parte, 2 cobrada, 4 anulada
(el codigo se guarda en estado_factusol). Forma de pago: 01 transferencia, 02 cargo en cuenta; las otras (03..07,
casi sin uso) quedan sin forma_pago y con su codigo en forma_pago_factusol.
ABONOS (rectificativas, F_FAB/F_LFB, serie 6, en negativo): en la misma tabla, con tipo='abono'.
Lineas: si Factusol apunta de que documento salen (DOCLFA 'P' = presupuesto, DTPLFA serie, DCOLFA numero), se guarda
y se enlaza con el presupuesto de Factusol ya volcado (misma empresa y año del fichero).

  python scripts/facturacion/volcar_facturas_factusol.py <facturas_2025_2026.json> [--escribir]
"""
import sys, os, json, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

EMPRESA = {'001': 'daniel', '002': 'accesalia', '003': 'ecobalance'}
ESTADO = {0: 'pendiente', 1: 'cobrada_en_parte', 2: 'cobrada', 4: 'anulada'}
FORMA = {'01': 'transferencia', '02': 'cargo_en_cuenta'}


def n(x):
    return None if x in (None, '') else round(float(x), 2)


def t(x):
    return (str(x).strip() or None) if x is not None else None


def main():
    d = json.load(open(sys.argv[1], encoding='utf-8-sig'))
    b = arrancar()
    presu = {(p['empresa_emisora'], p['anio'], p['serie'], p['numero']): p['id'] for p in
             b.leer('presupuestos?select=id,empresa_emisora,anio,serie,numero&origen=eq.factusol')}
    lin = {}
    for l in d['lineas'] + d.get('lineas_abono', []):   # el abono es serie 6: su clave no choca con la factura
        lin.setdefault((l['empresa'], l['anio'], str(l['TIPLFA']), int(l['CODLFA'])), []).append(l)
    filas = []
    for f in [dict(x, tipo='factura') for x in d['facturas']] + [dict(x, tipo='abono') for x in d.get('abonos', [])]:
        clave = (f['empresa'], f['anio'], str(f['TIPFAC']), int(f['CODFAC']))
        iva = [{'tipo': n(f['PIVA%dFAC' % i]), 'base': n(f['BAS%dFAC' % i]), 'cuota': n(f['IIVA%dFAC' % i])}
               for i in (1, 2, 3) if n(f['BAS%dFAC' % i])]
        filas.append(({'origen': 'factusol', 'tipo': f['tipo'], 'empresa_emisora': EMPRESA[f['empresa']], 'anio': int(f['anio']),
                       'serie': str(f['TIPFAC']), 'numero': int(f['CODFAC']), 'fecha': f['FECFAC'], 'referencia': t(f['REFFAC']),
                       'estado': ESTADO.get(int(f['ESTFAC']), 'otro'), 'estado_factusol': int(f['ESTFAC']),
                       'pagador_nombre': t(f['CNOFAC']), 'pagador_nif': t(f['CNIFAC']), 'pagador_domicilio': t(f['CDOFAC']),
                       'pagador_poblacion': t(f['CPOFAC']), 'pagador_cp': t(f['CCPFAC']), 'pagador_provincia': t(f['CPRFAC']),
                       'forma_pago': FORMA.get(str(f['FOPFAC'])), 'forma_pago_factusol': t(f['FOPFAC']),
                       'base': round(sum(x['base'] for x in iva), 2) if iva else 0, 'iva_desglose': iva,
                       'irpf_porcentaje': n(f['PRET1FAC']), 'irpf_importe': n(f['IRET1FAC']), 'total': n(f['TOTFAC'])},
                      clave, sorted(lin.get(clave, []), key=lambda l: l['POSLFA'] or 0)))
    print('facturas: %d | lineas: %d' % (len(filas), sum(len(x[2]) for x in filas)))
    if '--escribir' not in sys.argv: print('(marcha en seco)'); return
    cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
    # las que ya esten (se relanza sin duplicar): el indice unico parcial no sirve de on_conflict en la API
    ya = {(x['tipo'], x['empresa_emisora'], x['anio'], x['serie'], x['numero']) for x in
          b.leer('facturas?select=tipo,empresa_emisora,anio,serie,numero&origen=eq.factusol')}
    hechas = enlazadas = 0
    for f, clave, ls in filas:
        if (f['tipo'], f['empresa_emisora'], f['anio'], f['serie'], f['numero']) in ya: continue
        req = urllib.request.Request(b.url + '/rest/v1/facturas?select=id',
                                     data=json.dumps([f], ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
        with urllib.request.urlopen(req) as r: fid = json.loads(r.read().decode('utf-8'))[0]['id']
        filas_l = []
        for l in ls:
            doc = t(l.get('DOCLFA'))
            pid = presu.get((f['empresa_emisora'], f['anio'], t(l.get('DTPLFA')), int(l.get('DCOLFA') or 0))) if doc == 'P' else None
            enlazadas += bool(pid)
            filas_l.append({'factura_id': fid, 'posicion': l['POSLFA'], 'concepto': l['DESLFA'], 'cantidad': n(l['CANLFA']),
                            'precio': n(l['PRELFA']), 'base': n(l['TOTLFA']), 'origen_tipo': doc,
                            'origen_documento': ('%s-%s' % (t(l.get('DTPLFA')), l.get('DCOLFA'))) if doc else None, 'presupuesto_id': pid})
        if filas_l: b.insertar('factura_lineas', filas_l)
        hechas += 1
    print('volcadas: %d | lineas enlazadas a su presupuesto: %d' % (hechas, enlazadas))


if __name__ == '__main__':
    main()
