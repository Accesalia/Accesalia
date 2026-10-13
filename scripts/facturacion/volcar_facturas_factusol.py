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

  python scripts/facturacion/volcar_facturas_factusol.py <facturas_2025_2026.json> [--escribir] [--corregir [--solo accesalia/2026/287]] [--estados]
CORREGIDAS: Factusol corrige sobre la misma factura; las que ya estan se comparan y, con --corregir, se ponen al dia
(lo que decian antes queda en sus notas). Ver corregidas().
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
    # el tipo va en la clave: los abonos de Accesalia son serie 6, pero los de Daniel son serie 1, como sus facturas
    for tipo, ls_ in (('factura', d['lineas']), ('abono', d.get('lineas_abono', []))):
        for l in ls_:
            lin.setdefault((tipo, l['empresa'], l['anio'], str(l['TIPLFA']), int(l['CODLFA'])), []).append(l)
    filas = []
    for f in [dict(x, tipo='factura') for x in d['facturas']] + [dict(x, tipo='abono') for x in d.get('abonos', [])]:
        clave = (f['tipo'], f['empresa'], f['anio'], str(f['TIPFAC']), int(f['CODFAC']))
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
    if '--escribir' not in sys.argv:
        print('(marcha en seco)'); corregidas(b, filas); return
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
    corregidas(b, filas)


# CORREGIDAS EN FACTUSOL (Monica, 13-oct-2026, Navarra 28-30 2026/287: "errata, el cuerpo de la factura miente, hay que
# corregirla"). Factusol corrige SOBRE LA MISMA FACTURA (mismo numero, sin abono), asi que el volcado, que salta las que
# ya estan, nunca se enteraba. Ahora compara las que ya estan; con --corregir las pone al dia y deja en sus notas lo que
# decian antes (trazabilidad). Si cambia el IMPORTE de una linea ya casada con su hito, no la toca: se avisa y se mira a mano.
#   --solo accesalia/2026/287   limita la correccion a esa factura
CAMPOS = ('fecha', 'referencia', 'estado', 'estado_factusol', 'pagador_nombre', 'pagador_nif', 'base', 'total')


def corregidas(b, filas):
    solo = sys.argv[sys.argv.index('--solo') + 1] if '--solo' in sys.argv else None
    hoy = __import__('datetime').date.today().isoformat()
    app = {(x['tipo'], x['empresa_emisora'], x['anio'], x['serie'], x['numero']): x for x in
           b.leer('facturas?select=id,tipo,empresa_emisora,anio,serie,numero,notas,%s&origen=eq.factusol&order=id' % ','.join(CAMPOS))}
    cambiadas, estados = 0, []
    for f, clave, ls in filas:
        a = app.get((f['tipo'], f['empresa_emisora'], f['anio'], f['serie'], f['numero']))
        if not a:
            continue
        nombre = '%s%s/%s/%s' % ('abono ' if f['tipo'] == 'abono' else '', f['empresa_emisora'], f['anio'], f['numero'])
        dif = {k: (a[k], f[k]) for k in CAMPOS if str(a[k] if a[k] is not None else '') != str(f[k] if f[k] is not None else '')
               and not (k in ('base', 'total') and a[k] is not None and f[k] is not None and abs(float(a[k]) - float(f[k])) < 0.005)}
        la = {l['posicion']: l for l in b.leer('factura_lineas?factura_id=eq.%s&select=id,posicion,concepto,base' % a['id'])}
        dl = []
        for l in ls:
            x = la.get(l['POSLFA'])
            if x and ((x['concepto'] or '').strip() != (l['DESLFA'] or '').strip() or abs(float(x['base'] or 0) - float(n(l['TOTLFA']) or 0)) >= 0.005):
                dl.append((x, l))
        if not dif and not dl:
            continue
        if set(dif) <= {'estado', 'estado_factusol'} and not dl:
            estados.append(nombre)
            continue          # solo cambia el estado (cobrada, etc.): eso es la vida normal, no una correccion
        cambiadas += 1
        print('CORREGIDA EN FACTUSOL %s: %s%s' % (nombre, {k: v for k, v in dif.items()}, (' | %d linea(s) con otro texto o importe' % len(dl)) if dl else ''))
        if '--corregir' not in sys.argv or (solo and solo != nombre):
            continue
        casadas = [x for x, l in dl if abs(float(x['base'] or 0) - float(n(l['TOTLFA']) or 0)) >= 0.005
                   and b.leer('factura_linea_hitos?factura_linea_id=eq.%s&select=hito_cobro_id' % x['id'])]
        if casadas:
            print('   NO SE TOCA: cambia el importe de %d linea(s) ya casada(s); mirarla a mano' % len(casadas)); continue
        antes = ['%s: "%s"' % (k, v[0]) for k, v in dif.items()] + ['linea %s: "%s" (%s)' % (x['posicion'], (x['concepto'] or '').strip(), x['base']) for x, l in dl]
        nota = 'Corregida en Factusol (volcado %s, mismo numero). Antes: %s.' % (hoy, '; '.join(antes))
        b.actualizar('facturas?id=eq.%s' % a['id'], dict({k: v[1] for k, v in dif.items()}, notas=((a['notas'] or '') + '\n' + nota).strip()))
        for x, l in dl:
            b.actualizar('factura_lineas?id=eq.%s' % x['id'], {'concepto': l['DESLFA'], 'base': n(l['TOTLFA']), 'cantidad': n(l['CANLFA']), 'precio': n(l['PRELFA'])})
        print('   CORREGIDA EN LA APP (lo de antes, en sus notas)')
    print('corregidas en Factusol: %d | solo con otro estado (cobro): %d %s' % (cambiadas, len(estados), estados[:20]))
    if '--estados' in sys.argv and '--escribir' in sys.argv:
        poner_estados(b, filas, app, estados)


# ESTADOS DE COBRO (Monica, 13-oct-2026: "ok"): el volcado nunca los ponia al dia, y una factura que pasa a cobrada en
# Factusol seguia pendiente en la app, con sus hitos. Con --estados: la factura toma el estado de Factusol y sus hitos
# casados le siguen (cobrada -> completado; si vuelve a pendiente -> pendiente). Un subhito completa a su padre cuando
# todos los subhitos estan completados y suman lo del padre.
def poner_estados(b, filas, app, nombres):
    for f, clave, ls in filas:
        nombre = '%s%s/%s/%s' % ('abono ' if f['tipo'] == 'abono' else '', f['empresa_emisora'], f['anio'], f['numero'])
        if nombre not in nombres:
            continue
        a = app[(f['tipo'], f['empresa_emisora'], f['anio'], f['serie'], f['numero'])]
        b.actualizar('facturas?id=eq.%s' % a['id'], {'estado': f['estado'], 'estado_factusol': f['estado_factusol']})
        nuevo = {'cobrada': 'completado', 'pendiente': 'pendiente'}.get(f['estado'])
        tocados = []
        if nuevo:
            for l in b.leer('factura_lineas?factura_id=eq.%s&select=id' % a['id']):
                for e in b.leer('factura_linea_hitos?factura_linea_id=eq.%s&select=hito_cobro_id' % l['id']):
                    h = b.leer('hitos_cobro?id=eq.%s&select=id,hito_padre_id,estado' % e['hito_cobro_id'])[0]
                    if h['estado'] in ('anulado', 'devuelto'):
                        continue
                    b.actualizar('hitos_cobro?id=eq.%s' % h['id'], {'estado': nuevo}); tocados.append(h['id'])
                    if h['hito_padre_id']:
                        p = b.leer('hitos_cobro?id=eq.%s&select=id,importe' % h['hito_padre_id'])[0]
                        subs = b.leer('hitos_cobro?hito_padre_id=eq.%s&select=importe,estado' % p['id'])
                        hecho = all(s['estado'] == 'completado' for s in subs) and abs(sum(float(s['importe'] or 0) for s in subs) - float(p['importe'] or 0)) < 0.01
                        b.actualizar('hitos_cobro?id=eq.%s' % p['id'], {'estado': 'completado' if hecho else 'parcial'})
        print('   ESTADO %s: %s -> %s; hitos casados puestos a %s: %d' % (nombre, a['estado'], f['estado'], nuevo, len(tocados)))


if __name__ == '__main__':
    main()
