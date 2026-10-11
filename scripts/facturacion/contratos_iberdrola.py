# -*- coding: utf-8 -*-
"""Los CONTRATOS DE IBERDROLA como documento firmado del encargo (Monica, 10/11-oct-2026: "con Iberdrola no hay hoja
de encargo, pero si contrato"; "las contratas facturan diferente pero NOSOTROS NO... Iberdrola si, porque lo exigen
asi, pero sus hitos son otros").

Tres contratos (Drive), leidos a mano: sus anexos "Calendario de Hitos y pagos". Cada uno entra como documento de
encargo tipo 'contrato' (codigo CT-año-numero), pagado por la contrata IBERDROLA, con su version 1 (enlace al PDF de
Drive, para el visor), sus lineas facturables y sus hitos con el importe del contrato. Pago: transferencia a 60 dias.

Despues se casan sus facturas de Factusol (2025-26): cada certificacion de la direccion de obra o de la coordinacion
de seguridad y salud ("de manera proporcional a la obra realmente ejecutada") es un SUBHITO de ese hito; lo demas
casa con su hito por el concepto.

  python scripts/facturacion/contratos_iberdrola.py [--escribir]
"""
import sys, os, re, json, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

IBERDROLA = '55806ee9-8e81-41e5-9ea1-e69e3b4e7eb9'
DRIVE = 'https://drive.google.com/file/d/%s/view'
PROP = 'de manera proporcional a la obra realmente ejecutada (por certificaciones)'

# (clave, nombre de la linea, [(hito, importe, nota)])
CONTRATOS = [
    {'opp': 'DAN-2022-017', 'fecha': '2023-07-18', 'drive': '1mHXOD0xcdiA2x6r-4jexaNqsmhoEi_u6', 'ref': 'ZAMORA 1 3 5',
     'descripcion': 'Contrato Iberdrola: Arquitectura Mision Completa + Next Generation (Zamora 1, 3 y 5, Fuenlabrada)',
     'lineas': [
         ('arq', 'Arquitecto: rehabilitacion energetica integral (proyecto, licencia, direccion de obra, CFO, legalizacion)', [
             ('entrega', 16966.79, 'PROYECTO: previa entrega de los proyectos visados (40%)'),
             ('licencia', 4241.70, 'GESTIONES DE LICENCIA DE OBRA: hasta la obtencion de la licencia (10%)'),
             ('otro', 16966.79, 'DIRECCION DE OBRA: ' + PROP + ' (40%)'),
             ('cfo', 2120.85, 'CERTIFICADO FINAL DE OBRA visado (5%)'),
             ('otro', 2120.85, 'LEGALIZACION OBRAS: licencia de primera ocupacion, libro del edificio y planos as built (5%)')]),
         ('css', 'Coordinacion de seguridad y salud', [
             ('pss', 525.00, 'NOMBRAMIENTO DEL COORDINADOR SyS: a la aprobacion del PSS (15%)'),
             ('otro', 2975.00, 'COORDINACION DE SEGURIDAD Y SALUD: ' + PROP + ' (85%)')]),
         ('subv', 'Gestion de las ayudas Next Generation (RD 853/2021)', [
             ('firma', 9840.00, 'ANALISIS Y ESTUDIOS PREVIOS: a la firma del contrato'),
             ('otro', 810.00, 'ELABORACION Y PREPARACION DE DOCUMENTACION: a su entrega'),
             ('presentacion', 810.00, 'SOLICITUD PRE-CONCESION: a la presentacion en la CCAA'),
             ('concesion', 2700.00, 'RESOLUCION POSITIVA PRE-CONCESION: a la pre-adjudicacion'),
             ('concesion', 1080.00, 'OBTENCION DE SUBVENCIONES: a la tramitacion final positiva')])]},
    {'opp': 'DAN-2023-154', 'fecha': '2025-07-17', 'drive': '1HV3XiW4dsMWzVt1Uqjp_9Lu68c1EKh1q', 'ref': 'SAN ROQUE 18',
     'descripcion': 'Contrato Iberdrola: Arquitectura Mision Completa + Next Generation (San Roque 18, Guadalajara)',
     'lineas': [
         ('arq', 'Arquitecto: rehabilitacion energetica integral (licencia, direccion de obra, CFO, legalizacion)', [
             ('licencia', 712.50, 'GESTIONES DE LICENCIA DE OBRA: hasta la obtencion de la licencia (5%)'),
             ('otro', 12112.50, 'DIRECCION DE OBRA: ' + PROP + ' (85%)'),
             ('cfo', 712.50, 'CERTIFICADO FINAL DE OBRA visado (5%)'),
             ('otro', 712.50, 'LEGALIZACION OBRAS: licencia de primera ocupacion, libro del edificio y planos as built (5%)')]),
         ('subv', 'Gestion de las ayudas Next Generation (RD 853/2021)', [
             ('concesion', 875.00, 'RESOLUCION POSITIVA PRE-CONCESION: a la pre-adjudicacion (50%)'),
             ('concesion', 875.00, 'OBTENCION DE SUBVENCIONES: a la tramitacion final positiva (50%)')])]},
    {'opp': 'DAN-2022-263', 'fecha': '2023-10-16', 'drive': '1PRLYHPsYnd1QJlyUjvnVR5Gohu24MDjo', 'ref': 'FERMIN CABALLERO 75',
     'descripcion': 'Contrato Iberdrola (Smart Clima): Proyecto + Libro del Edificio + ayudas (Conjunto Froilan Ponce de Leon, Fermin Caballero 75)',
     'lineas': [
         ('lee', 'Redaccion del libro del edificio', [
             ('firma', 8500.00, 'LIBRO DEL EDIFICIO: a la firma del contrato (consultoria previa)')]),
         ('pry', 'Redaccion de proyectos', [
             ('firma', 4037.50, 'TRABAJOS PREVIOS: a la firma del contrato (25%)'),
             ('entrega', 12112.50, 'PROYECTO: previa entrega de los proyectos visados (75%)')]),
         ('subv', 'Gestion de las ayudas Next Generation (RD 853/2021)', [
             ('otro', 2850.00, 'ELABORACION Y PREPARACION DE DOCUMENTACION: a su entrega')])]},
]


def que_hito(texto, base_cert):
    """De una linea de factura de Iberdrola, a que hito va (el indice dentro de la linea) y si es certificacion."""
    t = texto.upper()
    if 'NOMBRAMIENTO DEL COORDINADOR' in t: return ('css', 'pss', False)
    if 'COORDINACI' in t and 'SEGURIDAD' in t: return ('css', 'otro', True)
    if 'GESTIONES DE LICENCIA' in t: return ('arq', 'licencia', False)
    if 'CERTIFICADO FINAL DE OBRA' in t: return ('arq', 'cfo', False)
    if 'LEGALIZACI' in t: return ('arq', 'legalizacion', False)
    if 'RESOLUCI' in t and 'PRE-CONCESI' in t: return ('subv', 'pre', False)
    if 'DIRECCI' in t and 'OBRA' in t: return ('arq', 'otro', True)
    if 'CERTIFICACI' in t:   # continuacion: "4ª Certificacion 15,27% de 2.975,00"
        return ('css', 'otro', True) if base_cert == 'css' else ('arq', 'otro', True)
    return None


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

    for c in CONTRATOS:
        [o] = b.leer('oportunidades?select=id,comunidad_id&codigo=eq.' + c['opp'])
        total = round(sum(i for _, _, hs in c['lineas'] for _, i, _ in hs), 2)
        print('\n==', c['opp'], c['ref'], c['fecha'], 'total %.2f' % total)
        ya = b.leer('versiones_hoja?select=hoja_encargo_id&url_pdf_hoja=like.*%s*' % c['drive'])
        if ya: print('   ya esta dado de alta'); hoja_id = ya[0]['hoja_encargo_id']
        elif not escribir: print('   (seco)'); continue
        else:
            codigo = rpc('siguiente_codigo', {'p_tipo': 'CT', 'p_anio': int(c['fecha'][:4])})
            h = alta('hojas_encargo', {'numero_hoja': codigo, 'tipo_documento': 'contrato', 'oportunidad_id': o['id'], 'comunidad_id': o['comunidad_id'],
                                       'pagador_tipo': 'contrata', 'pagador_contrata_id': IBERDROLA, 'emisor': 'accesalia',
                                       'fecha_creacion': c['fecha'], 'fecha_firma': c['fecha'], 'estado': 'devuelta_firmada',
                                       'fecha_estado': c['fecha'] + 'T00:00:00+00:00', 'descripcion': c['descripcion']})
            hoja_id = h['id']
            v = alta('versiones_hoja', {'hoja_encargo_id': hoja_id, 'numero_version': 1, 'fecha_generada': c['fecha'], 'fecha_enviada': c['fecha'],
                                        'url_pdf_hoja': DRIVE % c['drive'], 'pdfs_firmados': [DRIVE % c['drive']], 'importe_base': total,
                                        'iva_porcentaje': 21, 'forma_pago': 'Transferencia bancaria a 60 dias fecha factura, por hitos (anexos del contrato).',
                                        'notas': 'Contrato de Iberdrola dado de alta el 11-oct-2026 desde el PDF de Drive.'})
            b.actualizar('hojas_encargo?id=eq.' + hoja_id, {'version_firmada_id': v['id']})
            for clave, nombre, hs in c['lineas']:
                l = alta('lineas_facturacion', {'hoja_encargo_id': hoja_id, 'descripcion': nombre, 'importe': round(sum(i for _, i, _ in hs), 2),
                                                'es_porcentaje': False, 'origen': 'contrato', 'verificado': True, 'emisor': 'accesalia',
                                                'pagador_tipo': 'contrata', 'pagador_id': IBERDROLA, 'forma_cobro': 'transferencia',
                                                'notas': 'clave:' + clave})
                b.insertar('hitos_cobro', [{'linea_facturacion_id': l['id'], 'hito': ht, 'orden': k + 1, 'importe': imp, 'estado': 'pendiente', 'notas': nota}
                                           for k, (ht, imp, nota) in enumerate(hs)])
            print('   alta', codigo)
        casar(b, c, hoja_id, escribir)


def casar(b, c, hoja_id, escribir):
    lineas = {(l['notas'] or '').replace('clave:', ''): l for l in b.leer('lineas_facturacion?select=id,notas&hoja_encargo_id=eq.' + hoja_id)}
    hitos = {}
    for clave, l in lineas.items():
        for h in b.leer('hitos_cobro?select=id,hito,importe,notas,estado,hito_padre_id&linea_facturacion_id=eq.%s&hito_padre_id=is.null&order=orden' % l['id']):
            nota = (h['notas'] or '').upper()
            sub = 'legalizacion' if 'LEGALIZACI' in nota else 'pre' if 'RESOLUCION POSITIVA PRE-CONCESI' in nota else h['hito']
            hitos.setdefault((clave, sub), h)
    facs = b.leer('facturas?select=id,numero,anio,fecha,estado,factura_lineas(id,posicion,base,concepto)&pagador_nombre=ilike.*IBERDROLA*&referencia=ilike.*%s*&order=fecha'
                  % c['ref'].replace(' ', '%20'))
    ya = {x['factura_linea_id'] for x in b.leer('factura_linea_hitos?select=factura_linea_id')}
    for f in facs:
        base_cert = None
        for fl in sorted(f['factura_lineas'], key=lambda x: x['posicion']):
            texto = ' '.join((fl['concepto'] or '').split())
            q = que_hito(texto, base_cert)
            if not q: print('   ?? sin hito:', f['numero'], fl['base'], texto[:80]); continue
            clave, sub, cert = q
            if cert: base_cert = clave
            h = hitos.get((clave, sub))
            print('   %s/%s %10.2f -> %s %s%s' % (f['anio'], f['numero'], fl['base'], clave, sub, ' (certificacion = subhito)' if cert else ''))
            if not escribir or not h or fl['id'] in ya: continue
            destino = h['id']
            if cert:
                n = len(b.leer('hitos_cobro?select=id&hito_padre_id=eq.' + h['id']))
                s = urllib.request.Request(b.url + '/rest/v1/hitos_cobro', headers=dict(b.cab, **{'Content-Type': 'application/json', 'Prefer': 'return=representation'}),
                                           method='POST', data=json.dumps([{
                                               'linea_facturacion_id': lineas[clave]['id'], 'hito': h['hito'], 'orden': n + 1, 'importe': fl['base'],
                                               'estado': 'completado' if f['estado'] == 'cobrada' else 'pendiente', 'hito_padre_id': h['id'],
                                               'fecha_prevista': f['fecha'],
                                               'notas': 'Certificacion: factura %s/%s (%s). %s' % (f['anio'], f['numero'], f['fecha'], texto[:140])}]).encode('utf-8'))
                with urllib.request.urlopen(s) as r: destino = json.loads(r.read().decode('utf-8'))[0]['id']
            elif f['estado'] == 'cobrada':
                b.actualizar('hitos_cobro?id=eq.%s&estado=eq.pendiente' % h['id'], {'estado': 'completado'})
            b.insertar('factura_linea_hitos', [{'factura_linea_id': fl['id'], 'hito_cobro_id': destino, 'importe': fl['base'], 'como': 'automatico'}])
    if not escribir: return
    # los hitos proporcionales: parcial mientras falte, completado si las certificaciones cobradas llegan al total
    for (clave, sub), h in hitos.items():
        subs = b.leer('hitos_cobro?select=importe,estado&hito_padre_id=eq.' + h['id'])
        if not subs: continue
        cobrado = sum(float(s['importe']) for s in subs if s['estado'] == 'completado')
        est = 'completado' if cobrado >= float(h['importe']) - 1 else ('parcial' if cobrado else 'pendiente')
        b.actualizar('hitos_cobro?id=eq.' + h['id'], {'estado': est})


if __name__ == '__main__':
    main()
