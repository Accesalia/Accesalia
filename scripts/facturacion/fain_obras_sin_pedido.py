# -*- coding: utf-8 -*-
"""FAIN: las obras con facturas SUELTAS (sin pedido ni hoja en la app) — «usemos sus armas: si les sirve a ellos, a
nosotros también» (Mónica, 19-oct-2026). Regla aprobada:
  1. si está nuestra hoja dirigida a FAIN (Drive, PRESUPUESTOS ENVIADOS/FIRMADOS) -> HOJA con ese papel;
  2. si no hay papel pero la factura lleva los CÓDIGOS de FAIN (FAIN no paga sin código) -> PEDIDO DE FAIN con esos
     códigos y la nota «no está el correo de códigos; los códigos salen de la factura»;
  3. sin papel ni código -> NOTA DE RESPONSABILIDAD.
Cada factura va a su pago por lo que dice (proyecto 50/30/20, CSS 80/20; manda la factura si FAIN repartió distinto).
Lo que falta ANTES de la primera factura de una obra empezada en 2019 = «facturado antes de 2020, no está en la app»
(Factusol en la app empieza en 2020; misma regla que Thyssen); lo que falta DESPUÉS queda pendiente para comprobar.
Montado a mano obra por obra leyendo cada factura. Fuera (dudas a Mónica): San Vicente 10, Dos de Mayo 73, Escuelas
Pías 4, Sierra de Albarracín 17, la CSS de Mendiguchía Carriche 27; Torrubia 4 (2022/1-42, rectificada) ya decidido.

  python scripts/facturacion/fain_obras_sin_pedido.py [--escribir]
"""
import sys, os, re, json, uuid, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
MONICA = '52fa7b0f-e72b-4338-b3f8-7ad0833a8ba7'
DRIVE = 'G:/Mi unidad/MONICA ACCESALIA/'
ENV = DRIVE + 'PRESUPUESTOS/PRESUPUESTOS ENVIADOS/'
b = arrancar()


def _reintentos(fn):  # un 502 de Cloudflare cortó la primera pasada: se reintenta lo que falle por la red
    import time, urllib.error
    def envuelta(*a, **k):
        for i in range(5):
            try: return fn(*a, **k)
            except (urllib.error.URLError, RuntimeError, ConnectionError) as e:
                if i == 4 or (isinstance(e, RuntimeError) and not re.search(r'5\d\d', str(e))): raise
                time.sleep(3 * (i + 1))
    return envuelta


for _m in ('leer', 'insertar', 'actualizar', 'borrar', 'subir'): setattr(b, _m, _reintentos(getattr(b, _m)))
FAIN = [c['id'] for c in b.leer('contratas?select=id,nombre&nombre=ilike.*fain*') if c['nombre'].upper().startswith('FAIN')][0]
BLOQUE = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo')}
P, A = 'pendiente', 'antes'
PR, CS, DF, IT, IP, CU, TS, TL = 'REDACCION PROYECTO', 'CSS', 'DF', 'INFORME TECNICO', 'INFORME PERICIAL', 'CONSULTA URBANISTICA', 'TRAMITACION SUBVENCIONES', 'TRAMITACION LICENCIAS'


def uno(texto, bloque, total, ref):  # trabajo de un solo pago
    return (texto, bloque, total, [('entrega', total, ref if isinstance(ref, list) else [ref], P)])


def pry(total, e, l, c, ie=None, il=None, ic=None, texto='Proyecto de instalación de ascensor'):  # 50/30/20 salvo importes de la factura
    return (texto, PR, total, [('entrega', ie or total * .5, e[0], e[1]), ('licencia', il or total * .3, l[0], l[1]), ('cfo', ic or total * .2, c[0], c[1])])


def css(total, pss, cfo):
    return ('Coordinación de Seguridad y Salud', CS, total, [('pss', total * .8, pss[0], pss[1]), ('cfo', total * .2, cfo[0], cfo[1])])


# (opp, tipo, papel, [líneas])  tipo: pedido | hoja (enviada) | hoja_firmada | nota
OBRAS = [
    ('DAN-2020-083', 'pedido', None, [uno('Informe pericial', IP, 600, 'Daniel 2020/1-61')]),
    ('DAN-2021-042', 'hoja', ENV + 'HOJA DE ENCARGO av. betanzos 74 madrid fain.docx.pdf',
     [uno('Proyecto de plataforma elevadora (licencia, dirección de obra y CFO)', PR, 1500, 'Accesalia 2021/1-49')]),
    ('DAN-2022-221', 'pedido', None, [uno('Proyecto de instalación de ascensor (2020)', PR, 3500, 'Daniel 2020/1-9')]),
    ('DAN-2022-210', 'pedido', None, [uno('Cálculo de deflexiones', IT, 150, 'Accesalia 2022/1-114')]),
    ('DAN-2017-101', 'nota', None, [uno('Consulta previa de viabilidad', CU, 800, 'Accesalia 2022/1-55')]),
    ('DAN-2019-070', 'pedido', None, [uno('Modificación de 4 ascensores: memoria valorativa y gestión', PR, 2617.46, 'Daniel 2020/1-6')]),
    ('DAN-2021-155', 'pedido', None, [uno('Proyecto de plataforma elevadora vertical', PR, 1200, 'Daniel 2021/1-50')]),
    ('DAN-2020-044', 'pedido', None, [pry(2500, (['Daniel 2020/1-33'], P), (['Accesalia 2021/1-71#750'], P), (['Accesalia 2024/1-45'], P)),
                                      css(600, (['Accesalia 2021/1-71#480'], P), (['Accesalia 2022/1-52'], P))]),
    ('DAN-2019-044', 'pedido', None, [pry(2000, ([], A), (['Daniel 2020/1-19'], P), (['Daniel 2022/1-1#400'], P)),
                                      css(600, ([], P), (['Daniel 2022/1-1#120'], P)),
                                      ('Tramitación de subvenciones', TS, 480, [('presentacion', 240, ['Daniel 2022/1-1#240'], P), ('concesion', 240, ['Daniel 2022/1-96'], P)])]),
    ('DAN-2018-094', 'pedido', None, [pry(2500, ([], A), ([], A), (['Daniel 2022/1-2'], P)),
                                      ('Coordinación de Seguridad y Salud', CS, 600, [('pss', 600, ['Daniel 2022/1-13'], P)])]),
    ('DAN-2021-124', 'hoja', ENV + 'HOJA DE ENCARGO CHANTADA 46 MADRID.docx',
     [uno('Proyecto de reemplazo de dos ascensores', PR, 600, 'Accesalia 2022/1-67@proyecto'),
      ('Coordinación de Seguridad y Salud', CS, 600, [('pss', 600, ['Accesalia 2022/1-67@seguridad'], P)])]),
    ('DAN-2020-004', 'pedido', None, [('Nueva dirección facultativa', DF, 700, [('inicio_obra', 560, ['Daniel 2020/1-3'], P), ('cfo', 140, ['Daniel 2022/1-8'], P)])]),
    ('DAN-2020-081', 'pedido', None, [uno('Proyecto de mejora de la instalación del ascensor', PR, 400, 'Daniel 2020/1-26')]),
    ('DAN-2021-075', 'hoja_firmada', DRIVE + 'PRESUPUESTOS/PRESUPUESTOS FIRMADOS/EMILIO CASTELAR 4 ALCALA DE HENARES 20-09-2021 1000 EUR.pdf',
     [uno('Proyecto de plataforma elevadora', PR, 1000, 'Accesalia 2021/1-52'),
      ('Coordinación de Seguridad y Salud', CS, 600, [('pss', 600, ['Daniel 2022/1-6'], P)])]),
    ('DAN-2020-027', 'pedido', None, [pry(2500, (['Daniel 2020/1-23'], P), (['Daniel 2022/1-5'], P), (['Daniel 2024/1-44#500'], P)),
                                      css(600, (['Daniel 2022/1-53'], P), (['Daniel 2024/1-44#120'], P))]),
    ('DAN-2020-015', 'pedido', None, [('Nueva dirección facultativa', DF, 700, [('inicio_obra', 560, ['Daniel 2020/1-24'], P), ('cfo', 140, ['Daniel 2020/1-52'], P)])]),
    ('DAN-2026-010', 'pedido', None, [css(600, (['Accesalia 2023/1-108'], P), ([], P))]),
    ('DAN-2022-181', 'pedido', None, [pry(2500, (['Accesalia 2022/1-200'], P), ([], P), ([], P))]),
    ('DAN-2022-095', 'pedido', None, [('Coordinación de Seguridad y Salud', CS, 600, [('pss', 600, ['Accesalia 2022/1-33'], P)])]),
    ('DAN-2019-006', 'pedido', None, [uno('Planos de estado actual y reformado', PR, 250, 'Daniel 2020/1-11')]),
    ('DAN-2019-050', 'nota', None, [uno('Consulta previa de viabilidad', CU, 800, 'Accesalia 2022/1-57')]),
    ('DAN-2022-054', 'hoja', ENV + 'HOJA DE ENCARGO GOYA 55 MADRID.docx',
     [pry(1900, (['Accesalia 2022/1-53'], P), ([], P), ([], P)), css(600, ([], P), ([], P))]),
    ('DAN-2019-066', 'pedido', None, [pry(2500, (['Daniel 2020/1-7'], P), (['Daniel 2020/1-20'], P), (['Daniel 2021/1-22'], P)),
                                      css(600, (['Daniel 2020/1-37'], P), (['Daniel 2021/1-23'], P))]),
    ('DAN-2020-056', 'pedido', None, [uno('Cálculo de deflexiones', IT, 150, 'Daniel 2020/1-42')]),
    ('DAN-2021-080', 'hoja', ENV + 'HOJA DE ENCARGO TRAVESIA INFANTA MERCEDES 4 MADRID.docx',
     [pry(2500, (['Accesalia 2021/1-93#1250'], P), (['Accesalia 2021/1-93#750'], P), (['Accesalia 2022/1-158#500'], P)),
      css(600, (['Accesalia 2021/1-93#480'], P), (['Accesalia 2022/1-158#120'], P))]),
    ('DAN-2022-150', 'hoja', ENV + 'HOJA DE ENCARGO  ISLA MALAITA 5 MADRID.docx',
     [uno('Memoria valorada y coordinación de seguridad y salud (sustitución de ascensor)', PR, 1000, 'Accesalia 2022/1-216')]),
    ('DAN-2020-028', 'nota', None, [uno('Consulta previa de viabilidad', CU, 800, 'Accesalia 2022/1-59')]),
    ('DAN-2021-154', 'pedido', None, [uno('Informe (dos pedidos)', IT, 600, ['Daniel 2021/1-41', 'Daniel 2021/1-42'])]),
    ('DAN-2020-036', 'pedido', None, [uno('Deflexiones adicionales para el proyecto', IT, 300, 'Accesalia 2023/1-63')]),
    ('DAN-2021-057', 'pedido', None, [uno('Modificación de puertas de los ascensores', PR, 1200, 'Accesalia 2021/1-56')]),
    ('DAN-2021-135', 'pedido', None, [uno('Cálculo de deflexiones', IT, 150, 'Accesalia 2022/1-15')]),
    ('DAN-2020-043', 'pedido', None, [uno('Solicitud de proyecto de instalación de ascensor', PR, 400, 'Daniel 2021/1-8')]),
    ('DAN-2021-073', 'pedido', None, [uno('Modificación de ascensor y memoria valorada (4 portales)', PR, 1200,
                                          ['Accesalia 2021/1-64', 'Accesalia 2021/1-65', 'Accesalia 2021/1-66', 'Accesalia 2021/1-67'])]),
    ('DAN-2019-039', 'pedido', None, [uno('Cálculo de deflexiones', IT, 150, 'Daniel 2020/1-13')]),
    ('DAN-2020-082', 'pedido', None, [uno('Proyecto de plataforma elevadora vertical', PR, 1050, 'Daniel 2020/1-30')]),
    ('DAN-2022-224', 'pedido', None, [pry(3800, (['Accesalia 2022/1-230', 'Accesalia 2023/1-21'], P), (['Accesalia 2023/1-36'], P), ([], P)),
                                      css(500, (['Accesalia 2024/1-94'], P), ([], P))]),
    ('DAN-2022-057', 'pedido', None, [uno('Proyecto en obra', PR, 400, 'Accesalia 2024/1-103')]),
    ('DAN-2020-023', 'pedido', None, [uno('Informe pericial', IP, 600, 'Daniel 2020/1-62')]),
    ('DAN-2021-103', 'pedido', None, [('Proyecto de plataforma elevadora', PR, 1500, [('entrega', 900, ['Accesalia 2021/1-87'], P), ('cfo', 600, ['Accesalia 2024/1-68'], P)])]),
    ('DAN-2022-134', 'pedido', None, [uno('Proyecto de bajada a cota cero', PR, 1500, 'Accesalia 2023/1-11')]),
    ('DAN-2020-080', 'pedido', None, [uno('Cálculo de deflexiones', IT, 100, 'Daniel 2020/1-15')]),
    ('DAN-2009-001', 'pedido', None, [css(600, (['Accesalia 2023/1-229'], P), ([], P))]),
    ('DAN-2021-153', 'pedido', None, [('Coordinación de Seguridad y Salud', CS, 600, [('pss', 600, ['Daniel 2021/1-16'], P)])]),
    ('DAN-2021-104', 'pedido', None, [pry(2500, (['Accesalia 2021/1-90'], P), (['Accesalia 2022/1-87#1050'], P), (['Accesalia 2023/1-232#200'], P), 1250, 1050, 200),
                                      css(600, (['Accesalia 2022/1-87#480'], P), (['Accesalia 2023/1-232#120'], P))]),
    ('DAN-2019-028', 'pedido', None, [('Dirección facultativa y coordinación de seguridad y salud', DF, 1600,
                                       [('inicio_obra', 1300, ['Daniel 2021/1-1'], P), ('cfo', 300, ['Daniel 2022/1-34'], P)])]),
    ('DAN-2021-067', 'pedido', None, [uno('Proyecto de plataforma elevadora vertical', PR, 1200, 'Daniel 2021/1-56')]),
    ('DAN-2021-152', 'pedido', None, [uno('Cálculo de deflexiones', IT, 150, 'Daniel 2021/1-4')]),
    ('DAN-2022-036', 'pedido', None, [pry(3500, (['Accesalia 2022/1-80'], P), (['Accesalia 2023/1-6'], P), (['Accesalia 2024/1-152#700'], P)),
                                      css(600, (['Accesalia 2023/1-99'], P), (['Accesalia 2024/1-152#120'], P))]),
    ('DAN-2021-089', 'pedido', None, [uno('Memoria valorada del cuarto de contadores (embarque a 180º)', PR, 400, 'Accesalia 2021/1-54')]),
    ('DAN-2020-016', 'pedido', None, [pry(2500, (['Daniel 2020/1-21'], P), (['Daniel 2020/1-40'], P), (['Daniel 2021/1-95#500'], P)),
                                      css(600, (['Daniel 2020/1-64'], P), (['Daniel 2021/1-95#120'], P)),
                                      ('Tramitación y gestión de subvenciones (Comunidad de Madrid 2020)', TS, 960, [('presentacion', 960, ['Daniel 2020/1-32'], P)])]),
    ('DAN-2025-147', 'nota', None, [uno('Consulta previa de viabilidad', CU, 800, 'Accesalia 2022/1-58')]),
    ('DAN-2022-123', 'pedido', None, [uno('Gestión documental para la tramitación de la licencia', TL, 605, 'Accesalia 2024/1-223')]),
    ('DAN-2018-106', 'nota', None, [pry(2500, ([], A), ([], P), (['Accesalia 2021/1-79'], P))]),
    ('DAN-2019-016', 'nota', None, [uno('Consulta previa de viabilidad', CU, 800, 'Accesalia 2022/1-56')]),
    ('DAN-2019-078', 'pedido', None, [uno('Informe pericial', IP, 600, 'Daniel 2020/1-63')]),
    ('DAN-2022-041', 'hoja', ENV + 'HOJA DE ENCARGO SIETE OJOS 4 ALCORCON.docx',
     [pry(1500, (['Accesalia 2022/1-115'], P), (['Accesalia 2023/1-34'], P), (['Accesalia 2024/1-4'], P), texto='Proyecto de bajada a sótano del ascensor')]),
    ('DAN-2019-074', 'pedido', None, [pry(1500, (['Daniel 2020/1-14'], P), (['Accesalia 2021/1-50'], P), (['Accesalia 2022/1-47#225'], P), 750, 525, 225,
                                          texto='Proyecto de mejora de accesibilidad'),
                                      css(600, (['Accesalia 2022/1-13'], P), (['Accesalia 2022/1-47#120'], P))]),
    ('DAN-2021-101', 'pedido', None, [css(600, (['Accesalia 2025/1-52'], P), ([], P))]),  # Armenteros 28, segunda obra
]

# ------------------------------------------------------------------ facturas sueltas de FAIN, por referencia
fs = b.leer('facturas?select=id,empresa_emisora,anio,numero,fecha,oportunidad_id,lineas:factura_lineas(id,concepto,base,enl:factura_linea_hitos(hito_cobro_id))'
            '&pagador_nombre=ilike.*fain*&tipo=eq.factura&estado=neq.anulada')
POR_REF = {}
for f in fs:
    POR_REF['%s %s/1-%s' % (f['empresa_emisora'].replace('daniel', 'Daniel').replace('accesalia', 'Accesalia'), f['anio'], f['numero'])] = f


def linea_de(ref):
    base = ref.split('#')[1] if '#' in ref else None
    pal = ref.split('@')[1] if '@' in ref else None
    f = POR_REF[ref.split('#')[0].split('@')[0]]
    ls = [l for l in f['lineas'] if float(l['base'] or 0) > 0 and not l['enl']]
    if base: ls = [l for l in ls if abs(float(l['base']) - float(base)) < .01]
    if pal: ls = [l for l in ls if pal in l['concepto'].lower()]
    assert len(ls) == 1, (ref, [(l['base'], l['concepto'][:40]) for l in f['lineas']])
    return f, ls[0]


def codigos(textos):
    t = ' '.join(textos)
    out = []
    for k, pat in (('Pedido Fain', r'pedido\s*fain\s*:?\s*(\d{6,})'), ('Grafo/Orden', r'(?:grafo(?:/orden)?|n.?\s*de\s*orden|orden)\s*:?\s*(\d{6,})'),
                   ('Pedido de compra', r'pedido\s*(?:de\s*)?compras?\s*:?\s*(\d{5,})'), ('Pedido', r'n.?\s*(?:de\s*)?pedido\s*:?\s*(\d{5,})'),
                   ('Pedido obra', r'pedido\s*obra\s*:?\s*(\d{6,})'), ('Pedido proveedor', r'pedido\s*prove\w*\s*:?\s*([\d-]{5,})')):
        m = re.search(pat, t, re.I)
        if m and m.group(1) not in [v for _, v in out]: out.append((k, m.group(1)))
    return ' / '.join('%s %s' % kv for kv in out)


plan, usadas = [], set()
HECHAS, A_MEDIAS = set(), {}
for h in b.leer('hojas_encargo?select=id,numero_hoja,oportunidad_id,descripcion&creado_en=gte.%sT00:00:00&pagador_contrata_id=eq.%s' % (HOY, FAIN)):
    if not h['descripcion'].startswith(('Pedido FAIN (c', 'Hoja de encargo a FAIN', 'Nota de responsabilidad')): continue
    if b.leer('lineas_facturacion?select=id&hoja_encargo_id=eq.' + h['id'], False): HECHAS.add(h['oportunidad_id'])
    else:
        assert not b.leer('versiones_hoja?select=id&hoja_encargo_id=eq.' + h['id'], False), h['numero_hoja']
        A_MEDIAS[h['oportunidad_id']] = h
for cod, tipo, papel, lineas in OBRAS:
    o = b.leer('oportunidades?select=id,codigo,nombre,comunidad_id&codigo=eq.' + cod)[0]
    if o['id'] in HECHAS: continue
    assert papel is None or os.path.exists(papel), papel
    L, textos, fechas, emisores = [], [], [], set()
    for texto, bloque, total, pagos in lineas:
        PG = []
        for h, imp, refs, si_vacio in pagos:
            trozos = []
            for ref in refs:
                f, l = linea_de(ref)
                assert l['id'] not in usadas, ref
                usadas.add(l['id']); trozos.append((f, l, float(l['base']), ref.split('#')[0].split('@')[0]))
                textos.append(l['concepto']); fechas.append(f['fecha']); emisores.add(f['empresa_emisora'])
            cob = sum(t[2] for t in trozos)
            assert cob <= imp + .01, (cod, texto, h, cob, imp)
            PG.append((h, round(imp, 2), trozos, si_vacio))
        assert abs(sum(p[1] for p in PG) - total) < .01, (cod, texto)
        L.append((texto, bloque, total, PG))
    emisor = 'daniel_autonomo' if emisores == {'daniel'} else 'accesalia'
    plan.append(dict(o=o, tipo=tipo, papel=papel, lineas=L, fecha=min(fechas), cods=codigos(textos), emisor=emisor))
    print('%-13s %-38s %-12s %s | %s' % (cod, o['nombre'][:38], tipo, ' + '.join('%s %g' % (l[0][:22], l[2]) for l in L), codigos(textos)[:70]))
sueltas = [l for f in fs for l in f['lineas'] if float(l['base'] or 0) > 0 and not l['enl'] and l['id'] not in usadas]
print('\n%d obras · %d líneas de factura colgadas · quedan %d sueltas (las dudas)' % (len(plan), len(usadas), len(sueltas)))
if not ESCRIBIR:
    print('EN SECO'); sys.exit()


def codigo(anio):
    req = urllib.request.Request(b.url + '/rest/v1/rpc/siguiente_codigo', data=json.dumps({'p_tipo': 'HE', 'p_anio': anio}).encode(),
                                 headers=dict(b.cab, **{'Content-Type': 'application/json'}), method='POST')
    return json.loads(urllib.request.urlopen(req).read())


for x in plan:
    o, tipo = x['o'], x['tipo']
    vid = str(uuid.uuid4())
    previa = A_MEDIAS.get(o['id'])
    hid, cod = (previa['id'], previa['numero_hoja']) if previa else (str(uuid.uuid4()), codigo(int(x['fecha'][:4])))
    if tipo == 'pedido':
        nota = ('Pedido de FAIN: no está el correo de códigos; los códigos salen de sus facturas (%s) — FAIN no paga sin código '
                '(«usemos sus armas», Mónica, %s).' % (x['cods'] or 'sin código legible', HOY))
        h = dict(tipo_documento='pedido', estado='devuelta_firmada', fecha_firma=x['fecha'], descripcion='Pedido FAIN (códigos de la factura) %s · %s' % (x['cods'], o['nombre']))
    elif tipo == 'nota':
        nota = ('Sin papel ni código de FAIN: consta por sus facturas, cobradas (Mónica, %s).' % HOY)
        h = dict(tipo_documento='nota_responsabilidad', estado='devuelta_firmada', fecha_firma=x['fecha'], responsable_id=MONICA, motivo_sin_firma=nota,
                 descripcion='Nota de responsabilidad · FAIN · ' + o['nombre'])
    else:
        nota = ('Nuestra hoja de encargo a FAIN (Drive: %s)%s; respaldo de sus facturas (Mónica, %s).'
                % (x['papel'].replace(DRIVE, ''), '' if tipo == 'hoja_firmada' else ', enviada y sin firmar', HOY))
        h = dict(tipo_documento='hoja_encargo', estado='devuelta_firmada' if tipo == 'hoja_firmada' else 'enviada_comunidad',
                 fecha_firma=x['fecha'] if tipo == 'hoja_firmada' else None, descripcion='Hoja de encargo a FAIN · ' + o['nombre'])
    h.update(id=hid, numero_hoja=cod, oportunidad_id=o['id'], comunidad_id=o['comunidad_id'], pagador_tipo='contrata', pagador_contrata_id=FAIN,
             emisor=x['emisor'], fecha_creacion=x['fecha'], fecha_estado=x['fecha'] + 'T00:00:00+00:00')
    if previa: b.actualizar('hojas_encargo?id=eq.' + hid, {k: v for k, v in h.items() if k not in ('id', 'numero_hoja')})
    else: b.insertar('hojas_encargo', [h])
    v = dict(id=vid, hoja_encargo_id=hid, numero_version=1, fecha_generada=x['fecha'], fecha_enviada=x['fecha'], importe_base=sum(l[2] for l in x['lineas']),
             iva_porcentaje=21, notas=nota, forma_pago='Norma de FAIN: proyecto 50/30/20, CSS 80/20 (manda la factura)')
    if x['papel']:
        ext = os.path.splitext(x['papel'])[1].lower()
        tipo_mime = 'application/pdf' if ext == '.pdf' else 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ruta = 'almacen:documentos-comerciales/' + b.subir('documentos-comerciales', 'hojas-encargo/%s/%s-v1-%s%s' % (hid, 'firmada' if tipo == 'hoja_firmada' else 'hoja', vid[:8], ext),
                                                           open(x['papel'], 'rb').read(), tipo=tipo_mime, reemplazar=True)
        if tipo == 'hoja_firmada': v['pdfs_firmados'] = [ruta]
        else: v['url_pdf_hoja'] = ruta
    b.insertar('versiones_hoja', [v])
    if tipo != 'hoja': b.actualizar('hojas_encargo?id=eq.' + hid, {'version_firmada_id': vid})
    for texto, bloque, total, PG in x['lineas']:
        lid = str(uuid.uuid4())
        b.insertar('lineas_facturacion', [dict(id=lid, hoja_encargo_id=hid, bloque_id=BLOQUE[bloque], descripcion=texto, importe=total, es_porcentaje=False, notas=nota,
                   origen={'pedido': 'pedido', 'nota': 'nota_responsabilidad'}.get(tipo, 'pdf'), verificado=True, emisor=x['emisor'],
                   pagador_tipo='contrata', pagador_id=FAIN, forma_cobro='transferencia', creada_por=MONICA)])
        for orden, (hh, imp, trozos, si_vacio) in enumerate(PG, 1):
            cob = sum(t[2] for t in trozos)
            est = 'completado' if (trozos and abs(cob - imp) < .01) or (not trozos and si_vacio == A) else ('parcial' if trozos else 'pendiente')
            tid = str(uuid.uuid4())
            b.insertar('hitos_cobro', [dict(id=tid, linea_facturacion_id=lid, hito=hh, orden=orden, porcentaje=round(100 * imp / total, 2), importe=imp, estado=est,
                       notas='Facturado antes de 2020: no está en la app (Mónica, %s).' % HOY if (not trozos and si_vacio == A) else None)])
            if len(trozos) == 1 and abs(cob - imp) < .01:
                b.insertar('factura_linea_hitos', [dict(factura_linea_id=trozos[0][1]['id'], hito_cobro_id=tid, importe=trozos[0][2], como='a_mano')])
            else:
                for f, l, base, ref in trozos:
                    sid = str(uuid.uuid4())
                    b.insertar('hitos_cobro', [dict(id=sid, linea_facturacion_id=lid, hito=hh, orden=1, importe=base, estado='completado', hito_padre_id=tid, notas=ref)])
                    b.insertar('factura_linea_hitos', [dict(factura_linea_id=l['id'], hito_cobro_id=sid, importe=base, como='a_mano')])
                if trozos and cob < imp - .01:
                    b.insertar('hitos_cobro', [dict(id=str(uuid.uuid4()), linea_facturacion_id=lid, hito=hh, orden=2, importe=round(imp - cob, 2), estado='pendiente',
                               hito_padre_id=tid, notas='Resto, sin facturar.')])
            for f, l, base, ref in trozos:
                if f['oportunidad_id'] != o['id']: b.actualizar('facturas?id=eq.' + f['id'], {'oportunidad_id': o['id']})
    print(cod, o['nombre'])
print('ESCRITO')
