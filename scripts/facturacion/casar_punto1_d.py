# -*- coding: utf-8 -*-
"""PUNTO 1, ultimas (Monica, 12-oct-2026): con la norma de FAIN (50/30/20) y "manda la factura".
  - Piedrahita 2 (2025/363) e Isturiz 9 (2026/177): la factura es la SUMA de varios hitos.
  - San Andres 1 Leganes (2025/112, FAIN): la linea del proyecto sin hitos -> 50/30/20 y la licencia casada.
  - Dos de Mayo 71 (2025/239) y Reconquista 6 (2025/59), FAIN: "30 % de 4.000" = el pedido entero (proyecto 1.500 +
    bonificacion 1.000 + gestion de licencia 1.500): 50/30/20 en las tres y la factura casa con sus tres licencias.
  - Rio Duero 12 (2026/24): HE-2022-0017 (3.500 sin hitos) con el reparto de sus facturas 30/20/30/20
    (anteproyecto / visado / licencia / CFO) y la licencia casada.
  python scripts/facturacion/casar_punto1_d.py [--escribir]
"""
import sys, os, datetime
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat(); M = f'(Monica, {HOY})'
b = arrancar()
ya = {x['hito_cobro_id'] for x in b.leer('factura_linea_hitos?select=hito_cobro_id&order=factura_linea_id,hito_cobro_id')}
def fl(emisor, anio, num):
    f = b.leer(f'facturas?empresa_emisora=eq.{emisor}&anio=eq.{anio}&serie=eq.1&numero=eq.{num}&select=id,estado')[0]
    return f['estado'], [l for l in b.leer(f'factura_lineas?factura_id=eq.{f["id"]}&select=id,base&order=posicion') if l['base']][0]
def lineas(hoja, *palabras):
    h = b.leer(f'hojas_encargo?numero_hoja=eq.{hoja}&select=id')[0]['id']
    return [l for l in b.leer(f'lineas_facturacion?hoja_encargo_id=eq.{h}&select=id,descripcion,importe&order=id')
            if not palabras or any(p in (l['descripcion'] or '').upper() for p in palabras)]
def hitos(lid): return b.leer(f'hitos_cobro?linea_facturacion_id=eq.{lid}&hito_padre_id=is.null&select=id,hito,importe,estado&order=orden,id')
def enlazar(est, l_, hs, nota):
    print(f'   enlaza {l_["base"]} -> {[(h["hito"], h["importe"]) for h in hs]}  {nota}')
    if not ESCRIBIR: return
    b.insertar('factura_linea_hitos', [{'factura_linea_id': l_['id'], 'hito_cobro_id': h['id'], 'importe': float(h['importe']), 'como': 'a_mano'} for h in hs])
    if est == 'cobrada':
        for h in hs: b.actualizar(f'hitos_cobro?id=eq.{h["id"]}', {'estado': 'completado'})
def rehacer(l, reparto, nota):
    """reparto: [(hito, %)]; borra los hitos de la linea (que no tengan factura) y pone los nuevos"""
    hs = hitos(l['id'])
    if any(h['id'] in ya for h in hs): print('   ', l['descripcion'][:40], 'TIENE FACTURA: no se rehace'); return None
    imp = float(l['importe']); nuevos, acum = [], 0.0
    for k, (hito, pct) in enumerate(reparto, 1):
        v = round(imp * pct / 100, 2) if k < len(reparto) else round(imp - acum, 2); acum += v
        nuevos.append({'linea_facturacion_id': l['id'], 'hito': hito, 'orden': k, 'porcentaje': pct, 'importe': v, 'estado': 'pendiente', 'notas': nota})
    print(f'   rehace {l["descripcion"][:40]} {imp}: {[(n["hito"], n["importe"]) for n in nuevos]}')
    if not ESCRIBIR: return [dict(n, id='?') for n in nuevos]
    for h in hs: b.borrar(f'hitos_cobro?id=eq.{h["id"]}')
    b.insertar('hitos_cobro', nuevos)
    return hitos(l['id'])
FAIN = [('entrega', 50), ('licencia', 30), ('cfo', 20)]

print('Piedrahita 2'); est, l_ = fl('accesalia', 2025, 363)
hs = [h for l in lineas('HE-2025-0121') if 'SUBVENC' not in (l['descripcion'] or '').upper() for h in hitos(l['id']) if h['hito'] == 'encargo' and h['id'] not in ya]
if abs(sum(float(h['importe']) for h in hs) - float(l_['base'])) < 2: enlazar(est, l_, hs, 'suma de los tres al encargo')
print('Isturiz 9'); est, l_ = fl('accesalia', 2026, 177)
hs = [h for l in lineas('HE-2026-0346') if (l['descripcion'] or '').upper().startswith('DOCUMENTACI') for h in hitos(l['id']) if h['id'] not in ya]
if abs(sum(float(h['importe']) for h in hs) - float(l_['base'])) < 2: enlazar(est, l_, hs, 'documentacion tecnica 990 + 990')
est, l_ = fl('accesalia', 2026, 268)   # "2a mitad por entrega de proyecto ascensor": la entrega del proyecto
hs = [h for l in lineas('HE-2026-0346', 'PROYECTO (ASCENSOR') for h in hitos(l['id']) if h['hito'] == 'entrega' and h['id'] not in ya]
if len(hs) == 1 and abs(float(hs[0]['importe']) - float(l_['base'])) < 2: enlazar(est, l_, hs, 'entrega del proyecto')

for nombre, (em, an, nu), hoja in [('Dos de Mayo 71', ('accesalia', 2025, 239), 'PD-2024-0017'),
                                   ('Reconquista 6', ('accesalia', 2025, 59), 'PD-2024-0028')]:
    print(nombre); est, l_ = fl(em, an, nu)
    if hoja is None:   # la linea sin hitos de San Andres 1 (la que el analisis encontro)
        h_ = [x for x in b.leer("hojas_encargo?select=id,numero_hoja,oportunidad:oportunidad_id(nombre,comunidad_provisional)&numero_hoja=in.(HE-2022-0079,HE-2022-0103,HE-2022-0081)")]
        ls = [l for x in h_ for l in lineas(x['numero_hoja'], 'PROYECTO') if not hitos(l['id'])]
        if len(ls) != 1: print('   no hay una sola linea sin hitos:', len(ls)); continue
        print('   linea de', [x['numero_hoja'] for x in h_ if any(l['id'] == ls[0]['id'] for l in lineas(x['numero_hoja']))])
    else:
        ls = lineas(hoja, 'PROYECTO', 'BONIFICACI', 'GESTI')
    lic = []
    for l in ls:
        nuevos = rehacer(l, FAIN, f'Norma de FAIN 50/30/20 {M}.')
        if nuevos: lic += [h for h in nuevos if h['hito'] == 'licencia']
    if lic and abs(sum(float(h['importe']) for h in lic) - float(l_['base'])) < 2: enlazar(est, l_, lic, 'licencias (30 %)')
    elif lic: print('   la suma de licencias', sum(float(h['importe']) for h in lic), 'no es', l_['base'], ': no se enlaza')

print('San Andres 1 Leganes (HE-2022-0079, la paga la comunidad)'); est, l_ = fl('accesalia', 2025, 112)
ls = [l for l in lineas('HE-2022-0079', 'PROYECTO') if not hitos(l['id'])]
if len(ls) == 1:
    nuevos = rehacer(ls[0], [('licencia', 30), ('otro', 70)], f'Manda la factura 2025/112 (30 % a la licencia); el resto, sin plazo en la hoja {M}.')
    if nuevos: enlazar(est, l_, [h for h in nuevos if h['hito'] == 'licencia'], 'licencia 30 %')
print('Rio Duero 12 (HE-2022-0017)'); est, l_ = fl('accesalia', 2026, 24)
ls = [l for l in lineas('HE-2022-0017', 'PROYECTO')]
if len(ls) == 1:
    nuevos = rehacer(ls[0], [('otro', 30), ('entrega', 20), ('licencia', 30), ('cfo', 20)],
                     f'Reparto de sus facturas: 30 % anteproyecto (173/2022), 20 % visado (8/2023), 30 % licencia (24/2026), 20 % CFO {M}.')
    if nuevos: enlazar(est, l_, [h for h in nuevos if h['hito'] == 'licencia'], 'licencia 30 %')
print('ESCRITO' if ESCRIBIR else '(en seco)')
