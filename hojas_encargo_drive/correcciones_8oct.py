# CORRECCIONES tras la comprobacion del volcado (Monica, 8-oct-2026). Escribe en prod con su OK.
#
# 1. MARQUES DE CORBERA 24B: HE-2026-0072 (firmada el 04-02 y dejada SIN EFECTO) se volco como
#    anulada llevandose DENTRO la firmada buena del 14-05-2026 (adenda: ascensor + SATE + subv),
#    que se quedaba sin hoja. Se da de alta como hoja propia, HE-2026-0781 (siguiente numero), que
#    SUSTITUYE a la 0072. Datos LEIDOS de la firmada (el cruce no traia la linea del SATE):
#    proyecto ascensor 6.940 + proyecto SATE 7.220 + subvencion 1.980 fijo y 3,5% a exito =
#    16.140 + IVA. La hoja lleva la fecha de la plantilla (30/01/2026): se respeta, con nota.
#    El PDF ya esta en Storage (subido con la 0072): se cambia de hoja, no se resube.
# 2. NTRA SRA DE LA MACARENA 9 LEGANES (HE-2026-0231): firmada sin fecha en el nombre; leida de
#    dentro: "Fecha firma 19/3/2026".
import sys, uuid
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base

# --- 1 · Corbera 24B -------------------------------------------------------------------------
vieja = base.leer('hojas_encargo?numero_hoja=eq.HE-2026-0072&select=*')[0]
vv = base.leer(f'versiones_hoja?hoja_encargo_id=eq.{vieja["id"]}&select=id,pdfs_firmados')[0]
PDF_BUENO = f'almacen:documentos-comerciales/hojas-encargo/{vieja["id"]}/firmada-v1-2-f40b1d76.pdf'
if base.leer('hojas_encargo?numero_hoja=eq.HE-2026-0781&select=id'): sys.exit('HE-2026-0781 ya existe')
if PDF_BUENO not in (vv['pdfs_firmados'] or []): sys.exit('el PDF del 14-05 no esta en la 0072')
serie = base.leer('series_documento?tipo=eq.HE&anio=eq.2026&select=ultimo')[0]['ultimo']
if serie != 780: sys.exit(f'la serie HE-2026 va por {serie}, no por 780: revisar')

bl = {b['codigo']: b['id'] for b in base.leer('bloques?select=id,codigo')}
tp = {t['nombre']: t['id'] for t in base.leer('tipos_proyecto?select=id,nombre')}
accesos = [r['acceso_id'] for r in base.leer(f'relacion_oportunidad_accesos?opp_id=eq.{vieja["oportunidad_id"]}&select=acceso_id')]

hid, vid = str(uuid.uuid4()), str(uuid.uuid4())
FP = ('Honorarios de arquitectura (14.160): 50% a la contratacion en concepto de provision de fondos '
      '(7.080 + IVA), 50% restante a la entrega del Proyecto (7.080 + IVA). Subvencion: tramo fijo 100% a '
      'la contratacion; tramo variable (3,5%) a la concesion de cada subvencion, tras su ingreso en la '
      'cuenta de la comunidad.')
NOTA = ('Adenda que SUSTITUYE a HE-2026-0072 (proyecto ascensor + subvencion, firmada el 04-02-2026 y dejada '
        'sin efecto): pasa a proyecto conjunto de ascensor y envolvente termica. Firmada el 14-05-2026 por '
        'Beatriz Repiso Cano (CP MARQUES DE CORBERA 24B, H79235271). La fecha impresa (30/01/2026) es la de '
        'la hoja original. La firmada recoge lo ya abonado: 5.450 + IVA (pendiente 10.690 + IVA): dato de '
        'facturacion.')
base.insertar('hojas_encargo', [{
    'id': hid, 'numero_hoja': 'HE-2026-0781', 'oportunidad_id': vieja['oportunidad_id'],
    'comunidad_id': vieja['comunidad_id'], 'pagador_tipo': 'comunidad', 'emisor': 'accesalia',
    'fecha_creacion': '2026-01-30', 'fecha_firma': '2026-05-14', 'estado': 'devuelta_firmada',
    'fecha_estado': '2026-05-14', 'descripcion': 'Ascensor, SATE envolvente completa, Subvenciones'}])
base.actualizar('series_documento?tipo=eq.HE&anio=eq.2026', {'ultimo': 781})
base.insertar('versiones_hoja', [{
    'id': vid, 'hoja_encargo_id': hid, 'numero_version': 1, 'fecha_generada': '2026-01-30',
    'fecha_enviada': '2026-01-30', 'importe_base': 16140, 'iva_porcentaje': 21, 'forma_pago': FP,
    'notas': NOTA, 'pdfs_firmados': [PDF_BUENO]}])

def c(bloque, texto, importe=None, pct=None, fp=None):
    inc = importe is None and pct is None
    return {'hoja_encargo_id': hid, 'version_hoja_id': vid, 'bloque_id': bl[bloque], 'descripcion': texto,
            'importe': importe, 'porcentaje': pct, 'incluido': True,
            'desglose': 'incluido' if inc else 'se_cobra', 'forma_pago': fp}
base.insertar('conceptos_hoja', [
    c('TOMA DE DATOS Y MODELADO 3D', 'TOMA DE DATOS Y MODELADO 3D'),
    c('REDACCION PROYECTO', 'Proyecto Ascensor', 6940),
    c('REDACCION PROYECTO', 'Proyecto SATE', 7220),
    c('TRAMITACION LICENCIAS', 'TRAMITACIÓN DE LICENCIAS Y PERMISOS'),
    c('CERTIFICADO FIN DE OBRA', 'FIN DE OBRA'),
    c('CSS', 'COORDINACIÓN DE SEGURIDAD Y SALUD'),
    c('TRAMITACION SUBVENCIONES', 'GESTIÓN DE SUBVENCIONES (tramo fijo + tramo variable)', 1980, 3.5,
      'Tramo fijo: 100% a la contratacion. Tramo variable: 3,5% del importe concedido, a la concesion de cada subvencion'),
    c('IEE', 'INSPECCIÓN TÉCNICA DEL EDIFICIO (IEE), solo si no hay una previa valida'),
    c('CEE', 'CERTIFICADO DE EFICIENCIA ENERGÉTICA, solo si no hay uno previo valido'),
    c('DF', 'DIRECCIÓN FACULTATIVA'),
])
acts = [{'id': str(uuid.uuid4()), 'hoja_encargo_id': hid, 'tipo_proyecto_id': tp[n], 'orden': i}
        for i, n in enumerate(['Ascensor', 'SATE envolvente completa', 'Subvenciones'], 1)]
base.insertar('actuaciones_hoja', acts)
base.insertar('actuacion_accesos', [{'actuacion_id': a['id'], 'acceso_id': x} for a in acts for x in accesos])
base.insertar('sustituciones_hoja', [{'hoja_antigua_id': vieja['id'], 'hoja_nueva_id': hid,
                                      'nota': 'Adenda firmada el 14-05-2026: ascensor + SATE + subvencion'}])
base.actualizar(f'hojas_encargo?id=eq.{hid}', {'version_firmada_id': vid})
# la anulada se queda solo con SU firmada (la del "SIN EFECTO")
base.actualizar(f'versiones_hoja?id=eq.{vv["id"]}', {'pdfs_firmados': [p for p in vv['pdfs_firmados'] if p != PDF_BUENO]})
print('Corbera 24B: HE-2026-0781 creada', hid)

# --- 2 · Macarena 9 --------------------------------------------------------------------------
# La firma FAIN ASCENSORES S.A. (A28303485), no la comunidad: paga la contrata (Monica, 8-oct).
fain = base.leer('contratas?select=id,nombre&nombre=ilike.*FAIN*')
if len(fain) != 1: sys.exit(f'FAIN: {len(fain)} contratas con ese nombre, revisar: {fain}')
base.actualizar('hojas_encargo?numero_hoja=eq.HE-2026-0231', {
    'fecha_firma': '2026-03-19', 'fecha_estado': '2026-03-19',
    'pagador_tipo': 'contrata', 'pagador_contrata_id': fain[0]['id']})
print('Macarena 9: fecha de firma 19-03-2026, paga', fain[0]['nombre'])

# --- 3 · La Coruna 2 -------------------------------------------------------------------------
# El PDF de FIRMADOS "LA CORUNA 2 MADRID ASC 14-05-2026" es la hoja de ASCENSOR del 12-05
# (HE-2026-0361, 4.880 + CSS 920) con la casilla de firma de la comunidad EN BLANCO. Se colgo de la
# de subvencion (HE-2026-0371) como firmada. Ninguna esta firmada (Monica: "cuenta como enviada sin
# firmar, y es relevante: de esto depende pasar al siguiente hito comercial").
sub = base.leer('hojas_encargo?numero_hoja=eq.HE-2026-0371&select=id,fecha_creacion')[0]
asc = base.leer('hojas_encargo?numero_hoja=eq.HE-2026-0361&select=id')[0]
vs = base.leer(f'versiones_hoja?hoja_encargo_id=eq.{sub["id"]}&select=id,pdfs_firmados')[0]
va = base.leer(f'versiones_hoja?hoja_encargo_id=eq.{asc["id"]}&select=id,notas')[0]
base.actualizar(f'hojas_encargo?id=eq.{sub["id"]}', {'estado': 'enviada_comunidad', 'fecha_firma': None,
                'version_firmada_id': None, 'fecha_estado': sub['fecha_creacion']})
base.actualizar(f'versiones_hoja?id=eq.{vs["id"]}', {'pdfs_firmados': []})
nota = ('En PRESUPUESTOS FIRMADOS hay un PDF de esta hoja ("LA CORUNA 2 MADRID ASC 14-05-2026.pdf", '
        f'guardado en {(vs["pdfs_firmados"] or ["?"])[0]}) con la casilla de firma de la comunidad EN BLANCO: '
        'NO esta firmada.')
base.actualizar(f'versiones_hoja?id=eq.{va["id"]}', {'notas': '\n'.join(x for x in (va['notas'], nota) if x)})
print('La Coruna 2: HE-2026-0371 vuelve a enviada sin firmar; nota en HE-2026-0361')
