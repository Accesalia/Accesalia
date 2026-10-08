# REVISION DE LAS FIRMADAS: las 29 DUDAS resueltas por Monica (8-oct-2026), en las tablas de TRABAJO.
# Va despues de respuestas_revision.py. Deja las 29 en 'pendiente' para que grupo2_lineas.py las pase.
import sys
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base

F = {f['numero_hoja']: f for f in base.leer('revision_firmadas?select=id,numero_hoja,nota,revision,hoja_encargo_id')}
con = {c['nombre']: c['id'] for c in base.leer('contratas?select=id,nombre')}
bl = {b['codigo']: b['id'] for b in base.leer('bloques?select=id,codigo')}
def nota(cod, texto, **cambios):
    f = F[cod]
    if texto and texto not in (f['nota'] or ''): cambios['nota'] = '\n'.join(x for x in (texto, f['nota']) if x)
    cambios.setdefault('revision', 'pendiente')
    base.actualizar(f'revision_firmadas?id=eq.{f["id"]}', cambios)
def lineas(cod): return base.leer(f'revision_firmadas_lineas?firmada_id=eq.{F[cod]["id"]}&select=*&order=orden')
def plazos(lid, ps):
    base.borrar(f'revision_firmadas_plazos?linea_id=eq.{lid}')
    base.insertar('revision_firmadas_plazos', [dict(p, linea_id=lid, orden=k) for k, p in enumerate(ps, 1)])
M = '(Monica, 8-oct)'

# A · datos de cobro
for c in ['HE-2025-0137', 'HE-2025-0321', 'HE-2024-0011']:
    nota(c, f'CIF: se queda el de la app {M}.', pagador_cif=None)
nota('HE-2025-0137', 'Monica da H79728959, pero NO cumple el digito de control (el de la app H79720959 si): pendiente de la tarjeta.')
nota('HE-2025-0590', f'IBAN: el que cumple el control, 1500 en vez de 1550 {M}.', pagador_iban='ES65 0081 0337 1500 0152 1260')
for c in ['HE-2025-0332', 'HE-2025-0062']:
    nota(c, f'IBAN SIN CONFIRMAR: comprobar con la comunidad antes de girar recibos {M}.', pagador_iban=None)
nota('HE-2023-0001', f'La CSS (800) va como linea aparte del total de 4.500: total 5.300 {M}.', total_base=5300)
# B · viva / firmada
nota('HE-2025-0184', f'Firmada: la firma de debajo de la tabla es del cliente {M}.', firma_presente=True)
nota('HE-2025-0670', f'Firmada: el sello de la administracion vale como firma {M}.', firma_presente=True)
nota('HE-2025-0273', 'FIRMADA. Administracion TROMPETA DE ORO, marcada "no volver a trabajar": firmaron, cobramos, nos '
     f'devolvieron el recibo y se negaron a pagarlo {M}. (La nota ya esta en la administracion desde el 5-oct.)', firma_presente=True)
nota('HE-2025-0346', 'FIRMADA y CERRADA: cambiaron de administrador y el pago quedo a medias; la nueva presidenta se niega a '
     f'mantener el contrato firmado {M}. Los "3 pagos jul-ago-sep 25" que añadio la comunidad quedan en el texto.', firma_presente=True)
# C · quien paga
for c in ['HE-2025-0124', 'HE-2025-0544']:
    nota(c, f'Paga IBERLEAN, contratista de ascensores (firma Miguel Angel Gonzalez Alemany) {M}.', pagador_tipo='empresa',
         contrata_id=con['IBERLEAN ACCESIBILIDAD'], comunidad_id=None, pagador_razon_social='IBERLEAN ACCESIBILIDAD S.L.',
         pagador_hay_que_crear=False, firma_presente=True)
nota('HE-2025-0436', f'Paga FAIN: la acepto por correo con sus codigos de pedido {M}.', pagador_tipo='empresa', contrata_id=con['FAIN'],
     comunidad_id=None, pagador_razon_social='FAIN ASCENSORES S.A.', pagador_cif='A28303485', pagador_hay_que_crear=False, firma_presente=True)
nota('HE-2025-0501', f'Paga LUXOR ESPACIOS (factura emitida a Luxor) {M}.', pagador_tipo='empresa', contrata_id=con['LUXOR ESPACIOS'],
     comunidad_id=None, pagador_razon_social='LUXOR ESPACIOS', pagador_hay_que_crear=False, firma_presente=True)
# D · importes y contenido
nota('HE-2024-0006', f'Total 5.500: la consulta (1.000) solo se cobra si no encargan el proyecto {M}.')
L = lineas('HE-2025-0005')
if not any((l['texto'] or '').startswith('Descuento del 12%') for l in L):
    base.insertar('revision_firmadas_lineas', [{'firmada_id': F['HE-2025-0005']['id'], 'orden': 99, 'texto': 'Descuento del 12% por '
                  'contratacion de Proyecto Conjunto', 'importe': -1760.40, 'incluido': False, 'comparacion': 'falta_en_base'}])
    lid = base.leer(f'revision_firmadas_lineas?firmada_id=eq.{F["HE-2025-0005"]["id"]}&orden=eq.99&select=id')[0]['id']
    plazos(lid, [{'hito': 'encargo', 'porcentaje': 25, 'texto': '25% a la contratacion'}] +
               [{'hito': 'otro', 'porcentaje': 25, 'texto': 'mensualidad del 25%'}] * 3)
nota('HE-2025-0005', f'Linea de descuento del 12% (-1.760,40): 14.670 - 1.760,40 = 12.909,60 {M}.')
#   Maroto 1: la subvencion SIEMPRE 100% a la contratacion (regla de Monica). De los 18.181,82 con CAES, la parte de
#   subvencion (1.980 en el desglose sin descuento) va al 100% al encargo; el resto (16.201,82) 50/50.
L = {l['orden']: l for l in lineas('HE-2025-0077')}
if L[1]['importe'] and float(L[1]['importe']) > 17000:
    base.actualizar(f'revision_firmadas_lineas?id=eq.{L[1]["id"]}', {'importe': 16201.82})
    base.actualizar(f'revision_firmadas_lineas?id=eq.{L[6]["id"]}', {'importe': 1980, 'incluido': False})
    plazos(L[6]['id'], [{'hito': 'encargo', 'porcentaje': 100, 'texto': 'Subvenciones: 100% a la contratacion'}])
nota('HE-2025-0077', 'La subvencion se cobra SIEMPRE al 100% al contratar (Monica, 8-oct); interpretado: de los 18.181,82, '
     '1.980 (subvencion, importe del desglose) al encargo y 16.201,82 al 50/50.')
#   Ronda de Segovia 29: solo el proyecto (con DF y CFO); nada mas
for l in lineas('HE-2025-0467'):
    if l['bloque_id'] in (bl['TRAMITACION SUBVENCIONES'], bl['IEE'], bl['CEE'], bl['CSS']):
        base.borrar(f'revision_firmadas_lineas?id=eq.{l["id"]}')
nota('HE-2025-0467', f'Solo el PROYECTO (con DF y fin de obra): no contratan nada mas; quitadas subvencion, IEE, CEE y CSS {M}.')
nota('HE-2026-0022', 'Pagan las DOS comunidades a partes iguales: 1.400 cada una. 17: H79755823 / ES89 2085 8222 7903 3005 '
     f'7726; 19: H80194400 / ES91 0081 0484 6900 0128 9539 {M}. Pendiente del pagador por linea.')
#   Piedrahita 2: se mantiene la subvencion de la base (la pagina 2 estara en otro archivo)
for l in lineas('HE-2025-0121'):
    if l['comparacion'] == 'sobra_en_base':
        base.actualizar(f'revision_firmadas_lineas?id=eq.{l["id"]}', {'comparacion': 'coincide', 'orden': 90,
                        'nota': 'Se mantiene (Monica): la pagina 2 estara en otro archivo'})
        if l['importe']: plazos(l['id'], [{'hito': 'encargo', 'porcentaje': 100, 'texto': 'Subvencion: 100% a la contratacion'}])
nota('HE-2025-0121', f'Se mantiene la subvencion de la base (1.980): la pagina 2 del PDF estara en otro archivo {M}.', total_base=7980)
nota('HE-2025-0392', f'Manda el papel: DF + subvencion con cesion de CAES, sin coste; solo 3,5% a exito {M}.')
nota('HE-2025-0450', f'Esta hoja es la SUBVENCION de 1.800 (hoja de 2024 aceptada por FAIN); proyecto y CSS van en su hoja '
     f'(HE-2024-0003). Cada hoja lo suyo, cada linea lo suyo {M}.')
for l in lineas('HE-2026-0259'):
    if l['bloque_id'] == bl['REDACCION PROYECTO']: base.actualizar(f'revision_firmadas_lineas?id=eq.{l["id"]}', {'bloque_id': bl['MEMORIA TECNICA']})
nota('HE-2026-0259', f'Es una MEMORIA VALORADA (bloque MEMORIA TECNICA) {M}.')
for c in ['HE-2025-0021', 'HE-2025-0211', 'HE-2025-0247', 'HE-2026-0073', 'HE-2026-0059']:
    nota(c, f'Pasa tal cual {M}.')
print('hecho')
