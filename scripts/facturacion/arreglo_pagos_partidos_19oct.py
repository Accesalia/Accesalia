# -*- coding: utf-8 -*-
"""PAGOS COBRADOS DOS VECES (Monica, 19-oct-2026; lo vio en Reina 5).

El cruce del 17-oct (casar_facturas_hitos.py, 2022-2024) casaba una factura EXACTA con un pago y, ademas, partia otra
factura de la misma direccion (de otro encargo: otro año de subvencion, otro proyecto) y la colgaba del mismo pago como
«trozo + resto». Y el del 12-oct dejo dos facturas en el pago anterior al suyo. Arreglo, con el OK de Monica:
  A) quitar los trozos: la factura colgada por error queda solo apuntada a su opp;
  B) llevar la factura a su pago (Angeles 6 Getafe, Santa Tecla 46);
  C) Ampurdan 12 (la 2022/114 se sustituyo por dos mitades: anulada), Albufera 250 (la complementaria sube el pago: manda la
     factura) y Delicias 1 (pago inicial 600 + 2.000 + 2.000 = proyecto 4.000 + CSS 600);
  y Jarama 24: fuera el enlace a una factura anulada.

  python scripts/facturacion/arreglo_pagos_partidos_19oct.py [--escribir]
"""
import sys, os, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
b = arrancar()
OPS = []


def fl(ref):
    emp, resto = ref.split(); anio, sn = resto.split('/'); serie, n = sn.split('-')
    f = b.leer('facturas?select=id,oportunidad_id,estado,lineas:factura_lineas(id,base)&origen=eq.factusol&empresa_emisora=eq.%s&anio=eq.%s&serie=eq.%s&numero=eq.%s'
               % (emp.lower(), anio, serie, n))
    assert len(f) == 1 and len([l for l in f[0]['lineas'] if float(l['base'])]) == 1, ref
    return f[0], [l for l in f[0]['lineas'] if float(l['base'])][0]['id']


def hoja_hitos(num):
    return b.leer('hitos_cobro?select=id,hito,importe,estado,hito_padre_id,notas,linea:linea_facturacion_id!inner(hoja:hoja_encargo_id!inner(numero_hoja,oportunidad_id))'
                  '&linea.hoja.numero_hoja=eq.' + num)


def enlaces(hito):
    return b.leer('factura_linea_hitos?select=factura_linea_id,importe&hito_cobro_id=eq.' + hito)


def op(t, d, porque): OPS.append((t, d, porque))


# ------------------------------------------------ A) quitar trozos de pagos que ya tienen su factura
A = [('HE-2024-0139', 'Accesalia 2022/1-234'), ('HE-2024-0071', 'Accesalia 2022/1-179'), ('HE-2024-0001', 'Accesalia 2022/1-100'),
     ('HE-2024-0055', 'Accesalia 2022/1-97'), ('PD-2022-0036', 'Accesalia 2024/1-154'), ('HE-2022-0002', 'Accesalia 2023/1-18')]
for hoja, ref in A:
    f, lid = fl(ref)
    hs = hoja_hitos(hoja)
    trozo = [h for h in hs if h['hito_padre_id'] and any(e['factura_linea_id'] == lid for e in enlaces(h['id']))]
    assert len(trozo) == 1, (hoja, ref, len(trozo))
    padre = trozo[0]['hito_padre_id']
    assert enlaces(padre), (hoja, 'el padre no tiene su factura')
    hijos = [h for h in hs if h['hito_padre_id'] == padre]
    for h in hijos:
        for e in enlaces(h['id']): op('desenlazar', (e['factura_linea_id'], h['id']), '%s: fuera %s' % (hoja, ref))
        op('borrar_hito', h['id'], '%s: trozo/resto de más (%s)' % (hoja, h['importe']))
    op('estado', (padre, 'completado'), hoja)
    if not f['oportunidad_id']:
        op('opp_factura', (f['id'], hs[0]['linea']['hoja']['oportunidad_id']), '%s: queda apuntada a la opp' % ref)
    op('nota_hito', (padre, 'Quitado el trozo de %s, que el cruce del 17-oct colgó por error de este pago (ya lo cobra su factura); es de otro encargo (Mónica, %s).' % (ref, HOY)), hoja)

# ------------------------------------------------ B1) Angeles 6 Getafe: la 2025/1-6 (30%) a los pagos de LICENCIA
hs = hoja_hitos('HE-2022-0119')
f6, l6 = fl('Accesalia 2025/1-6')
by = {(h['hito'], float(h['importe']), bool(h['hito_padre_id'])): h for h in hs}
for h in [h for h in hs if h['hito_padre_id']]:
    for e in enlaces(h['id']): op('desenlazar', (e['factura_linea_id'], h['id']), 'Angeles 6')
    op('borrar_hito', h['id'], 'Angeles 6: trozo/resto del 50%')
for h in [h for h in hs if not h['hito_padre_id'] and h['hito'] == 'entrega']: op('estado', (h['id'], 'completado'), 'Angeles 6: 50% cobrado (2023/1-177)')
for h in [h for h in hs if not h['hito_padre_id'] and h['hito'] == 'licencia']:
    op('enlazar', (l6, h['id'], float(h['importe'])), 'Angeles 6: 2025/1-6 al 30% de licencia')
    op('estado', (h['id'], 'completado'), 'Angeles 6')

# ------------------------------------------------ B2) Santa Tecla 46: el anteproyecto (2022/1-205, 900) es trozo de la ENTREGA
hs = hoja_hitos('PD-2022-0034')
f205, l205 = fl('Accesalia 2022/1-205')
lic = [h for h in hs if h['hito'] == 'licencia' and not h['hito_padre_id']][0]
ent = [h for h in hs if h['hito'] == 'entrega' and not h['hito_padre_id']][0]
op('desenlazar', (l205, lic['id']), 'Santa Tecla: el anteproyecto no es la licencia')
op('trozo', (ent['id'], 900, l205, 'completado', 'Anteproyecto (30%%): Accesalia 2022/1-205 (Mónica, %s).' % HOY), 'Santa Tecla')
op('trozo', (ent['id'], 600, None, 'pendiente', 'Resto de la entrega, sin facturar todavía.'), 'Santa Tecla')
op('estado', (ent['id'], 'parcial'), 'Santa Tecla')

# ------------------------------------------------ C1) Ampurdan 12: la 2022/114 se sustituyó por las dos mitades
hs = hoja_hitos('HE-2022-0126')
f114, l114 = fl('Daniel 2022/1-114')
padre = [h for h in hs if any(e['factura_linea_id'] == l114 for e in enlaces(h['id']))][0]
op('desenlazar', (l114, padre['id']), 'Ampurdan')
op('anular_factura', (f114['id'], 'Sustituida por las dos mitades Daniel 2023/1-17 y 2023/1-24 (Mónica, %s).' % HOY), 'Ampurdan')
op('estado', (padre['id'], 'completado'), 'Ampurdan')

# ------------------------------------------------ C2) Albufera 250: la complementaria sube el pago (manda la factura)
hs = hoja_hitos('HE-2022-0117')
f117, l117 = fl('Daniel 2024/1-117')
trozo = [h for h in hs if h['hito_padre_id'] and any(e['factura_linea_id'] == l117 for e in enlaces(h['id']))][0]
padre = trozo['hito_padre_id']
for h in [h for h in hs if h['hito_padre_id'] == padre]:
    for e in enlaces(h['id']): op('desenlazar', (e['factura_linea_id'], h['id']), 'Albufera')
    op('borrar_hito', h['id'], 'Albufera: trozo/resto')
op('importe', (padre, 4338.84, 'Manda la factura (Mónica, %s): la Daniel 2024/1-117 (1.188,84) es complementaria a la 2022/1-110 «por el resto de honorarios» del libro del edificio; el pago pasa de 3.150 a 4.338,84.' % HOY), 'Albufera')
op('enlazar', (l117, padre, 1188.84), 'Albufera')
op('estado', (padre, 'completado'), 'Albufera')

# ------------------------------------------------ C3) Delicias 1: pago inicial 600 + 2.000 + 2.000 = proyecto 4.000 + CSS 600
hs = hoja_hitos('HE-2023-0111')
f43, l43 = fl('Accesalia 2024/1-43')
enc = [h for h in hs if h['hito'] == 'encargo' and not h['hito_padre_id'] and float(h['importe']) == 2000][0]
for h in [h for h in hs if h['hito_padre_id'] == enc['id']]:
    for e in enlaces(h['id']): op('desenlazar', (e['factura_linea_id'], h['id']), 'Delicias')
    op('borrar_hito', h['id'], 'Delicias: trozo/resto')
op('estado', (enc['id'], 'completado'), 'Delicias: 50% proyecto = 2024/1-66')
css = [h for h in hs if not h['hito_padre_id'] and float(h['importe']) == 300]
assert len(css) == 2
for h in css:
    op('enlazar', (l43, h['id'], 300.0), 'Delicias: la 2024/1-43 (600) es la CSS')
    op('estado', (h['id'], 'completado'), 'Delicias')
op('nota_hito', (enc['id'], 'El pago inicial (4.600 = proyecto 4.000 + CSS 600) se fraccionó en tres: 600 (Accesalia 2024/1-43, a la CSS) + 2.000 (2024/1-66) + 2.000 (2024/1-107) (Mónica, %s).' % HOY), 'Delicias')

# ------------------------------------------------ Jarama 24: fuera el enlace a la factura anulada
hs = hoja_hitos('HE-2025-0142')
f138, l138 = fl('Accesalia 2025/1-138')
assert f138['estado'] == 'anulada'
for h in hs:
    if any(e['factura_linea_id'] == l138 for e in enlaces(h['id'])): op('desenlazar', (l138, h['id']), 'Jarama: la 2025/1-138 está anulada')

for t, d, p in OPS: print('%-14s %s  (%s)' % (t, str(d)[:120], p))
print(len(OPS), 'operaciones')
if not ESCRIBIR:
    print('EN SECO'); sys.exit()

import uuid
for t, d, p in OPS:
    if t == 'desenlazar': b.borrar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % d)
    elif t == 'borrar_hito': b.borrar('hitos_cobro?id=eq.' + d)
    elif t == 'estado': b.actualizar('hitos_cobro?id=eq.' + d[0], {'estado': d[1]})
    elif t == 'opp_factura': b.actualizar('facturas?id=eq.%s&oportunidad_id=is.null' % d[0], {'oportunidad_id': d[1]})
    elif t == 'enlazar': b.insertar('factura_linea_hitos', [dict(factura_linea_id=d[0], hito_cobro_id=d[1], importe=d[2], como='a_mano')])
    elif t == 'importe':
        h = b.leer('hitos_cobro?select=notas&id=eq.' + d[0])[0]
        b.actualizar('hitos_cobro?id=eq.' + d[0], {'importe': d[1], 'notas': '\n'.join(x for x in (h['notas'], d[2]) if x)})
    elif t == 'nota_hito':
        h = b.leer('hitos_cobro?select=notas&id=eq.' + d[0])[0]
        b.actualizar('hitos_cobro?id=eq.' + d[0], {'notas': '\n'.join(x for x in (h['notas'], d[1]) if x)})
    elif t == 'trozo':
        padre = b.leer('hitos_cobro?select=linea_facturacion_id,hito&id=eq.' + d[0])[0]
        tid = str(uuid.uuid4())
        b.insertar('hitos_cobro', [dict(id=tid, linea_facturacion_id=padre['linea_facturacion_id'], hito=padre['hito'], orden=1, importe=d[1],
                   estado=d[3], hito_padre_id=d[0], notas=d[4])])
        if d[2]: b.insertar('factura_linea_hitos', [dict(factura_linea_id=d[2], hito_cobro_id=tid, importe=d[1], como='a_mano')])
    elif t == 'anular_factura':
        f = b.leer('facturas?select=notas&id=eq.' + d[0])[0]
        b.actualizar('facturas?id=eq.' + d[0], {'estado': 'anulada', 'notas': '\n'.join(x for x in (f['notas'], d[1]) if x)})
print('ESCRITO')
