# -*- coding: utf-8 -*-
"""LOS APUNTES DE FACTURACION SALEN DE LA NOTA DEL HITO (Monica, 16-oct-2026, Pico de Artilleros HE-2025-0090: "sus
hitos son notas, no hitos. NO quiero perder las notas, son apuntes MUY relevantes para la facturacion").

La nota de un hito es el TEXTO DE LA HOJA para ese plazo ("A la entrega del Proyecto: 50% restante"). Al casar las
facturas de Factusol (10-13 oct) los scripts escribieron ENCIMA apuntes de facturacion ("Facturado por Daniel...,
anulado con abonos 3 y 4 y reemitido...", "Norma de FAIN", "Subhito: factura...", "Manda la factura..."). Aqui:
  1. cada linea de apunte pasa a notas_facturacion (tipo nota, origen factusol), enganchada a su hito, su linea y su
     hoja, con la fecha que cite (o la del ultimo cambio del hito). Nada se borra sin haberse copiado antes;
  2. la nota del hito se queda con lo que era texto de la hoja; si no queda nada, se recupera de la forma de pago de
     su concepto de la hoja (el trozo de su plazo, con las mismas reglas que lib/lineasDeHoja.ts). Si no se puede
     recuperar, queda vacia (el apunte ya esta en las notas de facturacion).

  python scripts/facturacion/apuntes_de_hitos_a_notas.py [--escribir]
"""
import sys, os, re, datetime, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
b = arrancar()

APUNTE = re.compile(
    r'\b(Monica|Mónica)\b|Norma de FAIN|^Subhito|^Resto del hito|^Resto de la linea|Manda la factura|^Certificacion:|'
    r'Plazo puesto por la factura|Patron de|Hoja duplicada|Facturado por|Factura final|^Facturas \d|Reparto de sus facturas|'
    r'factura (accesalia|daniel)|la hoja dec[ií]a|al casar|Forma de pago sin reconocer|no dice la forma de pago|Revisar el hito|'
    r'ABONADA|\(abono ', re.I)
# El momento de cobro por su texto: las mismas reglas y el mismo orden que lib/lineasDeHoja.ts (MOMENTOS).
MOMENTOS = [
    (r'seguridad y salud|\bpss\b', 'pss'), (r'contrataci[oó]n|encargo|provisi[oó]n de fondos|a la aceptaci[oó]n', 'encargo'),
    (r'entrega', 'entrega'), (r'licencia|declaraci[oó]n responsable', 'licencia'), (r'inicio de (la )?obra|inicio de las obras', 'inicio_obra'),
    (r'\bcfo\b|fin(al)? de (la )?obra', 'cfo'), (r'presentaci[oó]n', 'presentacion'), (r'concesi[oó]n|concedido', 'concesion'),
    (r'adjudicaci[oó]n', 'adjudicacion'), (r'firma', 'firma'),
]
FECHA = re.compile(r'(20\d\d-\d\d-\d\d)')


def momento(texto):
    return next((m for re_, m in MOMENTOS if re.search(re_, texto, re.I)), None)


def trozo_de(forma_pago, hito):
    if not forma_pago: return None
    partes = [p.strip() for p in re.split(r'\s*[·;+\n]\s*|\s+y\s+(?=\d)', forma_pago) if p.strip()]
    suyos = [p for p in partes if momento(p) == hito]
    return suyos[0] if len(suyos) == 1 else (forma_pago.strip() if len(partes) == 1 else None)


# 2a fuente: la RELECTURA de la hoja (notas_facturacion, origen lectura_hoja), con una linea por concepto:
#   "  · Proyecto Rehabilitacion de Envolvente...: 6.000 € — 50 % al encargo; 50 % a la entrega"
relectura = collections.defaultdict(list)
for n in b.leer('notas_facturacion?select=hoja_encargo_id,texto&origen=eq.lectura_hoja'):
    for x in (n['texto'] or '').split('\n'):
        if '—' in x: relectura[n['hoja_encargo_id']].append(x.strip().lstrip('·').strip())
descr = {l['id']: (l['descripcion'] or '') for l in b.leer('lineas_facturacion?select=id,descripcion')}


def de_la_relectura(hoja, linea, hito):
    d = re.sub(r'\W+', ' ', descr.get(linea, '')).strip().lower()[:40]
    for x in relectura.get(hoja, []):
        concepto, _, plazos = x.partition('—')
        if d and re.sub(r'\W+', ' ', concepto).strip().lower().startswith(d[:25]):
            return trozo_de(plazos, hito)
    return None


hitos = b.leer('hitos_cobro?select=id,hito,notas,actualizado_en,creado_en,linea_facturacion_id,hito_padre_id,'
               'l:lineas_facturacion(id,hoja_encargo_id,concepto_hoja_id,c:conceptos_hoja(forma_pago))&notas=not.is.null')
movidas, notas, nuevas = 0, [], []
recuperadas = vacias = quedan = vacias_sub = 0
ejemplos = collections.defaultdict(list)
for h in hitos:
    lineas = [x for x in h['notas'].split('\n') if x.strip()]
    ap = [x for x in lineas if APUNTE.search(x)]
    if not ap: continue
    resto = [x for x in lineas if not APUNTE.search(x)]
    for x in ap:
        f = FECHA.findall(x)
        notas.append({'hoja_encargo_id': (h['l'] or {}).get('hoja_encargo_id'), 'linea_facturacion_id': h['linea_facturacion_id'],
                      'hito_cobro_id': h['id'], 'fecha': f[-1] if f else (h['actualizado_en'] or h['creado_en'])[:10],
                      'origen': 'factusol', 'tipo': 'nota', 'autor': 'Apunte al casar las facturas (estaba en la nota del hito)',
                      'texto': x.strip()})
        movidas += 1
    if resto:
        nueva = '\n'.join(resto); quedan += 1; ejemplos['queda'].append(nueva[:90])
    else:
        nueva = trozo_de(((h['l'] or {}).get('c') or {}).get('forma_pago'), h['hito'])             or de_la_relectura((h['l'] or {}).get('hoja_encargo_id'), h['linea_facturacion_id'], h['hito'])
        if nueva: recuperadas += 1; ejemplos['recuperada'].append(f"{h['hito']}: {nueva[:90]}")
        else:
            vacias += 1
            if h['hito_padre_id']: vacias_sub += 1
            else: ejemplos['vacia'].append(f"{h['hito']} | {h['notas'][:80]}")
    nuevas.append((h['id'], nueva))

sin_hoja = sum(1 for n in notas if not n['hoja_encargo_id'])
print(f'hitos con apuntes: {len(nuevas)} | lineas de apunte a notas de facturacion: {movidas} (sin hoja: {sin_hoja})')
print(f'nota del hito: se queda el texto de la hoja {quedan} | recuperado de la forma de pago {recuperadas} | queda vacia {vacias} (de ellas, subhitos creados al casar: {vacias_sub})')
for k, v in ejemplos.items():
    print(' ', k, '->', *v[:6], sep='\n     ')
if not ESCRIBIR: print('(marcha en seco)'); raise SystemExit
# 1) primero se copian los apuntes; 2) despues se toca la nota del hito
b.insertar('notas_facturacion', notas)
for hid, nueva in nuevas:
    b.actualizar(f'hitos_cobro?id=eq.{hid}', {'notas': nueva})
print('hecho')
