# -*- coding: utf-8 -*-
"""Alta de las hojas enviadas que no entraron en el volcado de Drive (Monica, 10-oct-2026).

Salieron al comparar los presupuestos de Factusol con los de la app: presupuestos hechos en Factusol (jul-oct 2026)
cuya hoja de encargo no estaba en la app, o ni siquiera su oportunidad. Las hojas estan en
PRESUPUESTOS\\HOJAS ENCARGO AUTOMATICAS de Drive (Google Docs), leidas el 10-oct; los importes, tal cual dicen.
Dos oportunidades nuevas (Los Pedroches 2 y Pedro de Valdivia 5, Leganes), con su comunidad "CP ...": el captador es
quien genero la hoja (Daniel / Alvaro), con el codigo que daria la app (siglas-año-siguiente).

Cada hoja: hojas_encargo (HE de la serie, enviada) -> versiones_hoja (v1, enlace al Google Doc) -> conceptos_hoja con
su bloque y su desglose, igual que el volcado de Drive.

  python scripts/facturacion/alta_hojas_recientes.py [--escribir]
"""
import sys, os, json, urllib.request, urllib.parse
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

DANIEL, ALVARO = '72495d1c-0090-4346-b167-ed852fd69960', '4dd3347a-d885-4439-aafb-dc3f7f7acd95'
B = {'toma': 'ebfcadcd-3d07-4600-8b29-a1306bf7f950', 'proyecto': '8b6d9e03-7d62-4ad7-9680-b94fd87a0ace',
     'licencia': 'bd7a6b5d-922a-44be-9b42-eb403f7f3f1e', 'presupuestos': '5152f512-698c-4379-891e-0bab8f4e14a7',
     'fin': '4e5357bb-295f-4d9e-a122-19edee63a36c', 'css': 'ce1d5e27-ca65-4da7-b9c4-870cd258c6ca',
     'subv': '852aed94-17aa-4cd8-a076-9de71544986f', 'iee': '7497f0b0-12dc-45d9-a631-37a4bd96f879',
     'lee': 'fa110e1a-683a-45af-8b30-9891616ce340', 'cee': 'ebc8f541-6530-4f24-8b54-5a5a3875a89a',
     'df': 'ccf33839-f832-42da-911c-9e55624be00f'}
PAGO_PRY = 'A la contratación, en concepto de provisión de fondos: 50% del total de los honorarios. A la entrega del Proyecto: 50% restante. CSS: a la firma del Plan de Seguridad y Salud, 100%.'
PAGO_SUBV = 'Subvención: a la concesión de cada subvención, 3,5% del importe concedido tras su ingreso en la cuenta de la comunidad. Documentación técnica: a la contratación, 100%.'


def proyecto(importe, presupuestos=False):
    c = [('TOMA DE DATOS Y MODELADO 3D', None, None, 'incluido', 'toma'),
         ('Proyecto (incluye Proyecto, Tramitación de Licencia, Dirección Facultativa)', importe, None, 'se_cobra', 'proyecto'),
         ('REDACCIÓN DEL PROYECTO BÁSICO Y DE EJECUCIÓN', None, None, 'incluido', 'proyecto'),
         ('TRAMITACIÓN DE LICENCIAS Y PERMISOS', None, None, 'incluido', 'licencia')]
    if presupuestos: c.append(('SOLICITUD Y ANÁLISIS DE PRESUPUESTOS', None, None, 'incluido', 'presupuestos'))
    c += [('FIN DE OBRA', None, None, 'incluido', 'fin'), ('DIRECCIÓN FACULTATIVA', None, None, 'incluido', 'df'),
          ('Coordinación de Seguridad y Salud', 920, None, 'se_cobra', 'css')]
    return c


def subvencion(doc, accesibilidad=False):
    c = [('GESTIÓN DE SUBVENCIONES ACCESIBILIDAD', None, None, 'incluido', 'subv')] if accesibilidad else []
    c += [('GESTIÓN DE SUBVENCIONES DE EFICIENCIA ENERGÉTICA', None, None, 'incluido', 'subv'),
          ('INFORME DE EVALUACIÓN DEL EDIFICIO (IEE)', None, None, 'incluido', 'iee'),
          ('LIBRO DEL EDIFICIO', None, None, 'incluido', 'lee'),
          ('CERTIFICADO DE EFICIENCIA ENERGÉTICA', None, None, 'incluido', 'cee'),
          ('Documentación Técnica Anexa / Tramitación de Subvenciones', doc, 3.5, 'se_cobra', 'subv')]
    return c


DOC = 'https://docs.google.com/document/d/%s/edit'
HOJAS = [
    # (opp existente o clave de nueva, fecha, descripcion, conceptos, forma de pago, google doc)
    ('DAN-2026-203', '2026-07-31', 'Proyecto para REHABILITACIÓN DE CUBIERTA', proyecto(4580), PAGO_PRY, '1wJzs4NSj19IeIR3p818xAchrncpU_2p5mkMmVr1JE8A'),
    ('ALV-2026-192', '2026-09-29', 'Proyectos para ACCESIBILIDAD', proyecto(7200, presupuestos=True), PAGO_PRY, '1MY5WhNhXY29E57EfMlyEv4ss3LXnKWZm6Z55FKxpZok'),
    ('ALV-2026-193', '2026-09-29', 'Proyecto para SUSTITUCIÓN 6 ASCENSORES', proyecto(6000), PAGO_PRY, '1ERC9tAdgakyE1cxWq13ey4rFtHU7Y2kudQ4BqTxs0TM'),
    ('ALV-2026-193', '2026-09-29', 'SUBVENCIONES ACCESIBILIDAD Y EFICIENCIA ENERGÉTICA', subvencion(1980, accesibilidad=True), PAGO_SUBV, '1tX_Mwqzr_5odPLXzR_Ol4a9jjQwAwuPiXMg9hqOLEFk'),
    ('nueva:PEDROCHES', '2026-10-07', 'Proyecto para ENVOLVENTE TÉRMICA (SATE EN CUBIERTA Y FACHADA)', proyecto(9080), PAGO_PRY, '1Me1f94l7QzjrJApJzJG1otgxaw5y7mJJiPCUDK_7va8'),
    ('nueva:PEDROCHES', '2026-10-07', 'SUBVENCIONES DE EFICIENCIA ENERGÉTICA', subvencion(1980), PAGO_SUBV, '1wvCSfwaxZcs4S2-4hvYIwQzd6UlyHhMapATtdXEBGRs'),
    ('nueva:VALDIVIA', '2026-10-08', 'SUBVENCIONES EFICIENCIA ENERGÉTICA PROYECTO EXTERNO', subvencion(2650), PAGO_SUBV, '1R-8ds44wiFVFBAEbL1Gwdw-h_37GCC7ywCooOoD6-Qc'),
]
NUEVAS = {'PEDROCHES': ('CP LOS PEDROCHES 2 LEGANES', 'LOS PEDROCHES 2 LEGANES', '2026-10-07', DANIEL, 'DAN'),
          'VALDIVIA': ('CP PEDRO DE VALDIVIA 5 LEGANES', 'PEDRO DE VALDIVIA 5 LEGANES', '2026-10-08', ALVARO, 'ALV')}


def main():
    b = arrancar()
    escribir = '--escribir' in sys.argv
    cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'

    def alta(tabla, fila):
        req = urllib.request.Request(b.url + '/rest/v1/' + tabla, data=json.dumps([fila], ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
        with urllib.request.urlopen(req) as r: return json.loads(r.read().decode('utf-8'))[0]

    def rpc(nombre, args):
        req = urllib.request.Request(b.url + '/rest/v1/rpc/' + nombre, data=json.dumps(args).encode('utf-8'), headers=cab, method='POST')
        with urllib.request.urlopen(req) as r: return json.loads(r.read().decode('utf-8'))

    opps = {}
    for h in HOJAS:
        if not h[0].startswith('nueva:'):
            [o] = b.leer('oportunidades?select=id,comunidad_id,codigo&codigo=eq.' + h[0]); opps[h[0]] = o
    for k, (com, nombre, fecha, comercial, sig) in NUEVAS.items():
        ya = b.leer('comunidades?select=id&nombre=eq.' + urllib.parse.quote(com))
        print('nueva opp', k, nombre, fecha, sig, '| comunidad', com, '(ya existe)' if ya else '')
    for h in HOJAS:
        print('  hoja', h[0], h[1], h[2], '| cobra', [(c[0][:30], c[1], c[2]) for c in h[3] if c[3] == 'se_cobra'])
    if not escribir:
        print('(marcha en seco)'); return

    for k, (com, nombre, fecha, comercial, sig) in NUEVAS.items():
        c = (b.leer('comunidades?select=id&nombre=eq.' + urllib.parse.quote(com)) or [None])[0] or alta('comunidades', {'nombre': com, 'municipio': 'LEGANES'})
        ult = b.leer('oportunidades?select=codigo&codigo=like.%s-2026-*&order=codigo.desc&limit=1' % sig)
        n = int(ult[0]['codigo'].split('-')[-1]) + 1 if ult else 1
        o = alta('oportunidades', {'codigo': '%s-2026-%03d' % (sig, n), 'comunidad_id': c['id'], 'nombre': nombre, 'estado': 'abierta',
                                   'fecha_apertura': fecha, 'comercial_id': comercial, 'comercial_captador_id': comercial,
                                   'notas': 'Creada el 10-oct-2026 desde su hoja de encargo de Drive: tenia presupuesto en Factusol y no estaba en la app (Monica).'})
        opps['nueva:' + k] = o
        print('creada', o['codigo'], nombre)
    for opp_k, fecha, desc, conceptos, pago, doc in HOJAS:
        o = opps[opp_k]
        codigo = rpc('siguiente_codigo', {'p_tipo': 'HE', 'p_anio': 2026})
        base = sum(c[1] or 0 for c in conceptos if c[3] == 'se_cobra')
        h = alta('hojas_encargo', {'numero_hoja': codigo, 'oportunidad_id': o['id'], 'comunidad_id': o['comunidad_id'], 'pagador_tipo': 'comunidad',
                                   'emisor': 'accesalia', 'fecha_creacion': fecha, 'estado': 'enviada_comunidad', 'fecha_estado': fecha, 'descripcion': desc})
        v = alta('versiones_hoja', {'hoja_encargo_id': h['id'], 'numero_version': 1, 'fecha_generada': fecha, 'fecha_enviada': fecha,
                                    'url_pdf_hoja': DOC % doc, 'importe_base': base, 'iva_porcentaje': 21, 'forma_pago': pago,
                                    'notas': 'Alta el 10-oct-2026 desde el Google Doc de HOJAS ENCARGO AUTOMATICAS (no entro en el volcado).'})
        b.insertar('conceptos_hoja', [{'hoja_encargo_id': h['id'], 'version_hoja_id': v['id'], 'descripcion': d, 'importe': imp, 'porcentaje': pct,
                                       'desglose': des, 'bloque_id': B[bl], 'incluido': True} for d, imp, pct, des, bl in conceptos])
        print('hoja', codigo, o.get('codigo'), desc[:40], base)


if __name__ == '__main__':
    main()
