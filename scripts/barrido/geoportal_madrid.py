# -*- coding: utf-8 -*-
"""
EL GEOPORTAL DE MADRID, A TABLAS (Monica, 9-oct-2026).

La ficha de la oportunidad solo lo pedia a demanda, al abrirse, y por eso
tardaba. Aqui se baja una vez y se guarda en las tablas que se disenaron para
ello el 29-sep (y que nadie llenaba):

  subvenciones  -> el censo ENTERO de subvenciones concedidas de Madrid capital
                   (VIVIENDA/REHABILITACION_ENERGETICA_CM, capa 0: 1.377 el 9-oct)
                   en subvencion_concedida, con la posicion que publica el
                   Ayuntamiento (lat/lng, pedida ya en EPSG:4326).
  urbanismo     -> por cada opp ABIERTA de Madrid capital, lo que dice el
                   geoportal de su edificio, una fila por fuente en
                   dato_urbanistico: edificio_protegido, condiciones_proteccion,
                   modelo_ascensor, apiru, arru. En `detalle` va la respuesta
                   ENTERA, para que la ficha la componga igual que si la hubiera
                   pedido ella.

Para preguntar al geoportal hacen falta las coordenadas UTM (EPSG:25830) del
edificio. Si la ficha de Catastro no las tiene, se piden a Catastro y se
guardan en su ficha (lat, lng, utm_x, utm_y): son las oficiales, no se calculan.

Lo que no se puede consultar NO se guarda como "no": se deja sin fila y sale
en el resumen, para reintentarlo. Se puede relanzar: lo ya bajado se salta.

  python scripts/barrido/geoportal_madrid.py subvenciones
  python scripts/barrido/geoportal_madrid.py urbanismo
"""
import sys, os, re, json, time, datetime, urllib.request, urllib.parse, urllib.error

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, '..'))
from produccion import arrancar

b = arrancar()
SIGMA = 'https://sigma.madrid.es/hosted/rest/services'
COOR = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_CPMRC'
# Para no darle la lata a dos servicios publicos y gratuitos.
PAUSA = 1.0

# Las mismas capas, y la misma forma de preguntar, que la ficha
# (frontend/lib/informeEdificio.ts, traerDeFuera).
FUENTES = [
    # fuente,               servicio,                                          capa, radio
    ('edificio_protegido',   'DESARROLLO_URBANO_ACTUALIZADO/EDIFICIOS_PROTEGIDOS_VIGENTE', 4, 0),
    ('condiciones_proteccion', 'PGOUM97/PG_ANALISIS_EDIFICACION',                  8, 0),
    # Los ascensores son PUNTOS, uno por portal: hay que buscar CERCA.
    ('modelo_ascensor',      'URBANISMO/MODELO_ASCENSORES_ESPACIO_PUBLICO',      1, 30),
    ('apiru',                'VIVIENDA/SUBVENCIONES_AMBITOS',                    2, 0),
    ('arru',                 'VIVIENDA/SUBVENCIONES_AMBITOS',                    1, 0),
]


def ahora():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def pedir_json(url, intentos=3):
    ultimo = None
    for n in range(intentos):
        if n:
            time.sleep(3 * n)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'Accept': 'application/json'}), timeout=60) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception as e:  # noqa
            ultimo = e
    raise ultimo


def pedir_texto(url, intentos=3):
    ultimo = None
    for n in range(intentos):
        if n:
            time.sleep(3 * n)
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                return r.read().decode('utf-8', 'replace')
        except Exception as e:  # noqa
            ultimo = e
    raise ultimo


def guardar(tabla, filas, conflicto):
    """Inserta o, si ya esta, actualiza (por la clave unica de la tabla)."""
    cab = dict(b.cab)
    cab['Content-Type'] = 'application/json'
    cab['Prefer'] = 'resolution=merge-duplicates,return=minimal'
    for i in range(0, len(filas), 200):
        tanda = filas[i:i + 200]
        p = urllib.request.Request(
            '%s/rest/v1/%s?on_conflict=%s' % (b.url, tabla, conflicto),
            data=json.dumps(tanda, ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
        try:
            with urllib.request.urlopen(p) as r:
                r.read()
        except urllib.error.HTTPError as e:
            raise RuntimeError('%s (fila %d): %s %s' % (tabla, i, e.code, e.read().decode('utf-8', 'replace')))


def limpia(atributos):
    return {k.split('.')[-1]: v for k, v in atributos.items()}


def numero(v):
    return v if isinstance(v, (int, float)) else None


# ------------------------------------------------------------- subvenciones
def subvenciones():
    servicio, capa = 'VIVIENDA/REHABILITACION_ENERGETICA_CM', 0
    q = urllib.parse.urlencode({'where': '1=1', 'outFields': '*', 'returnGeometry': 'true', 'outSR': '4326', 'f': 'json'})
    d = pedir_json('%s/%s/MapServer/%d/query?%s' % (SIGMA, servicio, capa, q))
    if d.get('exceededTransferLimit'):
        raise SystemExit('El geoportal ha cortado la respuesta: hay que pedirla por trozos.')
    filas = []
    for f in d.get('features', []):
        a = limpia(f['attributes'])
        g = f.get('geometry') or {}
        fecha = a.get('FECHA_SUBVENCION')
        filas.append({
            'direccion': (a.get('DIRECCION') or '').strip() or '(sin dirección)',
            'convocatoria': a.get('CONVOCATORIA'),
            'ayuda': a.get('AYUDA'),
            'fecha': datetime.datetime.fromtimestamp(fecha / 1000, datetime.timezone.utc).date().isoformat()
                     if isinstance(fecha, (int, float)) else None,
            'importe': numero(a.get('IMPORTE_SUBVENCION____')),
            'viviendas': int(a['VIVIENDAS_EDIFICIO']) if isinstance(a.get('VIVIENDAS_EDIFICIO'), (int, float)) else None,
            'ahorro_energia': numero(a.get('AHORRO_ENERGIA__kWh_año_')),
            'ahorro_co2': numero(a.get('AHORRO_CO2__kg_año_')),
            'distrito': a.get('DISTRITO'),
            'barrio': a.get('BARRIO'),
            'cp': str(a['COD_POSTAL']) if a.get('COD_POSTAL') is not None else None,
            'servicio': servicio,
            'capa': capa,
            'objectid': a.get('OBJECTID'),
            'detalle': a,
            'lat': g.get('y'),
            'lng': g.get('x'),
            'consultado_en': ahora(),
        })
    guardar('subvencion_concedida', filas, 'servicio,capa,objectid')
    sin_posicion = sum(1 for x in filas if x['lat'] is None)
    print('subvencion_concedida: %d guardadas (%d sin posicion)' % (len(filas), sin_posicion))


# ---------------------------------------------------------------- urbanismo
def coordenadas(ref):
    """Las de Catastro: (lat, lng) en grados y (x, y) en UTM 30N ETRS89."""
    def centro(srs):
        t = pedir_texto('%s?Provincia=&Municipio=&SRS=%s&RC=%s' % (COOR, srs, ref))
        x = re.search(r'<xcen>([^<]+)', t)
        y = re.search(r'<ycen>([^<]+)', t)
        return (float(x.group(1)), float(y.group(1))) if x and y else (None, None)
    lng, lat = centro('EPSG:4326')
    time.sleep(PAUSA)
    ux, uy = centro('EPSG:25830')
    return lat, lng, ux, uy


def en_el_punto(servicio, capa, x, y, radio):
    q = {'geometry': '%s,%s' % (x, y), 'geometryType': 'esriGeometryPoint', 'inSR': '25830',
         'spatialRel': 'esriSpatialRelIntersects', 'outFields': '*', 'returnGeometry': 'false', 'f': 'json'}
    if radio:
        q.update({'distance': str(radio), 'units': 'esriSRUnit_Meter'})
    d = pedir_json('%s/%s/MapServer/%d/query?%s' % (SIGMA, servicio, capa, urllib.parse.urlencode(q)))
    if 'error' in d:
        raise RuntimeError(str(d['error']))
    return d.get('features') or []


def fila_de(ref, fuente, servicio, capa, feature):
    url = '%s/%s/MapServer/%d' % (SIGMA, servicio, capa)
    if feature is None:
        return {'referencia': ref, 'fuente': fuente, 'hay': False, 'codigo': None, 'nombre': None, 'resumen': None,
                'pdfs': None, 'detalle': None, 'servicio': servicio, 'capa': capa, 'objectid': None, 'url': url,
                'consultado_en': ahora()}
    a = limpia(feature['attributes'])
    codigo = nombre = resumen = None
    pdfs = []
    if fuente == 'edificio_protegido':
        codigo, nombre, resumen = a.get('CEP_TX_NUMCAT'), a.get('CEP_TX_PROTECCION'), a.get('CEP_TX_CJTO_HOMOGENEO')
    elif fuente == 'condiciones_proteccion':
        nombre = a.get('PROTECCION')
        if a.get('PLANO_AE'):
            pdfs.append({'que': 'Plano de análisis de la edificación', 'url': a['PLANO_AE']})
    elif fuente == 'modelo_ascensor':
        nombre, resumen = a.get('DESCRIPCION'), a.get('DIRECCION')
        if a.get('INFORME'):
            pdfs.append({'que': 'Informe del modelo de ascensor', 'url': a['INFORME']})
        if a.get('MODELO'):
            pdfs.append({'que': 'Modelo de ascensor obligatorio', 'url': a['MODELO']})
    elif fuente == 'apiru':
        codigo, nombre = a.get('ID_APIRU'), a.get('NOMBRE_APIRU')
    elif fuente == 'arru':
        codigo, nombre = a.get('ID_ARRU'), a.get('NOMBRE_ARRU')
    return {'referencia': ref, 'fuente': fuente, 'hay': True,
            'codigo': str(codigo).strip() if codigo is not None else None,
            'nombre': str(nombre).strip() if nombre is not None else None,
            'resumen': str(resumen).strip() if resumen is not None else None,
            'pdfs': pdfs or None, 'detalle': a, 'servicio': servicio, 'capa': capa,
            'objectid': a.get('OBJECTID'), 'url': url, 'consultado_en': ahora()}


def urbanismo():
    opps = b.leer('oportunidades?select=referencia_catastral&estado=eq.abierta&referencia_catastral=not.is.null')
    refs = sorted({re.sub(r'\s', '', o['referencia_catastral']).upper()[:14] for o in opps})
    fichas = {}
    for i in range(0, len(refs), 150):
        trozo = ','.join(refs[i:i + 150])
        for f in b.leer('ficha_catastro?select=referencia,municipio,lat,lng,utm_x,utm_y&referencia=in.(%s)' % trozo):
            fichas[f['referencia']] = f
    madrid = [r for r in refs if (fichas.get(r, {}).get('municipio') or '').upper() == 'MADRID']
    hechas = {x['referencia'] for x in b.leer('dato_urbanistico?select=referencia&fuente=eq.arru')}
    falta = [r for r in madrid if r not in hechas]
    print('Madrid capital: %d edificios; ya bajados %d; faltan %d' % (len(madrid), len(madrid) - len(falta), len(falta)))

    fallos = []
    for n, ref in enumerate(falta, 1):
        f = fichas[ref]
        try:
            if not (f.get('utm_x') and f.get('utm_y')):
                lat, lng, ux, uy = coordenadas(ref)
                if ux is None:
                    raise RuntimeError('Catastro no da coordenadas')
                cambios = {'utm_x': ux, 'utm_y': uy, 'utm_srs': 'EPSG:25830'}
                if not (f.get('lat') and f.get('lng')) and lat is not None:
                    cambios.update({'lat': lat, 'lng': lng})
                b.actualizar('ficha_catastro?referencia=eq.' + ref, cambios)
                f.update(cambios)
                time.sleep(PAUSA)
            filas = []
            for fuente, servicio, capa, radio in FUENTES:
                feats = en_el_punto(servicio, capa, f['utm_x'], f['utm_y'], radio)
                filas.append(fila_de(ref, fuente, servicio, capa, feats[0] if feats else None))
                time.sleep(PAUSA)
            # Las cinco juntas o ninguna: una a medias no se guarda.
            guardar('dato_urbanistico', filas, 'referencia,fuente')
        except Exception as e:  # noqa
            fallos.append((ref, str(e)[:200]))
        if n % 25 == 0:
            print('  %d/%d (fallos: %d)' % (n, len(falta), len(fallos)), flush=True)

    print('Hecho: %d bajados, %d fallos' % (len(falta) - len(fallos), len(fallos)))
    for ref, motivo in fallos:
        print('  FALLO', ref, motivo)


if __name__ == '__main__':
    modo = sys.argv[1] if len(sys.argv) > 1 else ''
    if modo == 'subvenciones':
        subvenciones()
    elif modo == 'urbanismo':
        urbanismo()
    else:
        print(__doc__)
