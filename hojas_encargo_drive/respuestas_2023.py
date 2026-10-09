# FIRMADAS DE 2023: las respuestas de Monica (9-oct-2026) a las dudas de la relectura, en las tablas de TRABAJO
# (y lo poco que va directo: anular la 0090, crear los pagadores nuevos). Va despues de cargar_revision.py.
# Regla nueva (9-oct): "si hay FACTURA emitida para esa direccion, se firmo si o si" (FACTURAS ACC Y DAN/ACCESALIA);
# el nombre de la factura dice ademas a quien se facturo, y su texto el desglose.
#   python respuestas_2023.py [--escribir]
#   python respuestas_2023.py --vinagrande --escribir   (DESPUES de grupo3: el resto de Viñagrande, 'anulado')
import sys, json
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base
ESCRIBIR = '--escribir' in sys.argv
M = '(Monica, 9-oct)'
FAC = 'Hay factura emitida'

F = {f['numero_hoja']: f for f in base.leer('revision_firmadas?numero_hoja=like.HE-2023-*&select=id,numero_hoja,nota,hoja_encargo_id,total_base&order=id')}
con = {c['nombre']: c['id'] for c in base.leer('contratas?select=id,nombre&order=id')}
bl = {b['codigo']: b['id'] for b in base.leer('bloques?select=id,codigo&order=id')}
def lineas(cod): return base.leer(f'revision_firmadas_lineas?firmada_id=eq.{F[cod]["id"]}&select=id,orden,texto,importe&order=orden,id')
def plazos(lid): return base.leer(f'revision_firmadas_plazos?linea_id=eq.{lid}&select=id,orden,hito,importe&order=orden,id')
def poner(tabla, id_, cambios):
    print(f'   {tabla} {id_[:8]}: {cambios}')
    if ESCRIBIR: base.actualizar(f'{tabla}?id=eq.{id_}', cambios)
def nota(cod, texto, **cambios):
    f = F[cod]
    if texto and texto not in (f['nota'] or ''): cambios['nota'] = '\n'.join(x for x in (texto, f['nota']) if x)
    cambios.setdefault('revision', 'pendiente')
    print(cod, '|', texto)
    if ESCRIBIR: base.actualizar(f'revision_firmadas?id=eq.{f["id"]}', cambios)

if '--herrera' in sys.argv:
    nota('HE-2023-0046', f'Total 12.950 por la factura 101/2023 (el papel desglosa 11.000 + 2.950, que no suma). Adelanto 6.500 '
         f'COBRADO; el resto (6.450) se facturo (122/2024) y se ABONO por acuerdo con el cliente: resto ANULADO {M}.', total_base=12950)
    h = base.leer('hojas_encargo?numero_hoja=eq.HE-2023-0046&select=id')[0]['id']
    for lf in base.leer(f'lineas_facturacion?hoja_encargo_id=eq.{h}&select=id&order=id'):
        for x in base.leer(f'hitos_cobro?linea_facturacion_id=eq.{lf["id"]}&select=id,hito,importe,estado,notas&order=orden,id'):
            if x['hito'] == 'entrega' and float(x['importe'] or 0) == 6500: continue
            if x['estado'] != 'anulado':
                poner('hitos_cobro', x['id'], {'estado': 'anulado', 'notas': '\n'.join(y for y in (x['notas'], f'Resto ABONADO por acuerdo con el cliente (abono de la 122/2024): no se cobrara {M}.') if y)})
    print('ESCRITO' if ESCRIBIR else 'PRUEBA'); sys.exit()

if '--vinagrande' in sys.argv:
    # Viñagrande (HE-2023-0132): "no se pagara el resto, se anulo el encargo. Pagaron solo la parte de la IEE ...
    # es mucha pasta como para contabilizarla como 'llegara' cuando no es asi". Lo cobrado (15 % al encargo:
    # 9 facturas de 975 = 8.775, 17-01-2024, a Envoltermia) se queda; lo demas, ANULADO.
    h = base.leer('hojas_encargo?numero_hoja=eq.HE-2023-0132&select=id')[0]['id']
    for lf in base.leer(f'lineas_facturacion?hoja_encargo_id=eq.{h}&select=id,descripcion&order=id'):
        for x in base.leer(f'hitos_cobro?linea_facturacion_id=eq.{lf["id"]}&select=id,hito,importe,estado,notas&order=orden,id'):
            if x['hito'] == 'encargo' and float(x['importe'] or 0) == 8775: continue
            if x['estado'] != 'anulado':
                poner('hitos_cobro', x['id'], {'estado': 'anulado', 'notas': '\n'.join(y for y in (x['notas'], f'Encargo ANULADO: no se cobrara {M}.') if y)})
    print('ESCRITO' if ESCRIBIR else 'PRUEBA'); sys.exit()

# A · firmadas: hay factura (o lo dice Monica)
nota('HE-2023-0007', f'Firmada {M}. {FAC}: 87/2023 "ELECNOR - SAHARA 83" (50 % de 10.750): paga ELECNOR.',
     firma_presente=True, pagador_tipo='empresa', contrata_id=con['ELECNOR'], comunidad_id=None,
     pagador_razon_social='ELECNOR SERVICIOS Y PROYECTOS S.A.U.', pagador_cif='A79486833', pagador_hay_que_crear=False)
nota('HE-2023-0025', f'Vale como hoja (estudio de costes con VºBº de la junta) {M}. {FAC}: 90 y 136 de 2023 a la comunidad.')
nota('HE-2023-0053', f'Firmada (sello y rubrica de la administradora fuera de la casilla) {M}. {FAC}: 126 y 173 de 2023.')
nota('HE-2023-0073', f'Firmada por la regla de las facturas {M}: hay facturas a C P MADRID 79 HUMANES (122/2023, 60/2025), '
     'aunque son del PROYECTO de ascensor (5.500), no de esta subvencion.', firma_presente=True)
nota('HE-2023-0074', f'Firmada (firma digital) {M}. {FAC}: 193/2023, 1.800, a "CP LORENZO LUZURIAGA DE MADRID MEC" (Q2868644B).',
     pagador_tipo='particular', comunidad_id=None, pagador_razon_social='CP LORENZO LUZURIAGA DE MADRID MEC', pagador_hay_que_crear=False)
nota('HE-2023-0096', f'Firmada ("P.O." sobre el sello del administrador) {M}. {FAC}: proyecto 63/2024, licencia, CSS y CFO.')
nota('HE-2023-0097', f'Firmada ("P.O." sobre el sello del administrador) {M}. {FAC}: subvenciones 226/2023.')
nota('HE-2023-0130', f'Firmada por la regla de las facturas {M}: 86/2024 a la comunidad (1.500 de subvenciones). OJO: el '
     'archivo se llamaba "no vale - falta num cuenta" y la hoja dice 2.225; la factura puede ser de la hoja siguiente.', firma_presente=True)
nota('HE-2023-0062', f'Firmada (firma fuera de la casilla) {M}. {FAC}: 130 y 178 de 2023 a MERITXELL PARAYRE SABES (34754143Q), '
     'que es quien paga (particular; cuenta del cargo ES77 0086 5102 1000 1588 5788). La hoja dice "Av. Monte 85"; la opp y la factura, 89.',
     pagador_tipo='particular', comunidad_id=None, pagador_razon_social='MERITXELL PARAYRE SABES', pagador_cif='34754143Q', pagador_hay_que_crear=False)

# 0012 Manresa 56: lo guardado es el correo de FAIN aprobando; la factura da el encargo
nota('HE-2023-0012', f'Lo guardado como firmada es el correo de FAIN (27-03-2023) aprobando el presupuesto {M}. {FAC}: 71/2023 '
     'a FAIN, pedido 282127: modificado de proyecto basico y de ejecucion, 1.900. (La 103/2024, 400 "adicional", pedido 323496, es otro encargo.)',
     total_base=1900, firma_presente=True)
l12 = lineas('HE-2023-0012')
if l12:
    poner('revision_firmadas_lineas', l12[0]['id'], {'texto': 'Modificado de proyecto basico y de ejecucion (instalacion de ascensor)',
                                                     'bloque_id': bl['MODIFICACION DE PROYECTO'], 'importe': 1900})
    if not plazos(l12[0]['id']) and ESCRIBIR:
        base.insertar('revision_firmadas_plazos', [{'linea_id': l12[0]['id'], 'orden': 1, 'hito': 'entrega', 'porcentaje': 100, 'importe': None,
                                                     'texto': 'Factura 71/2023 (03-05-2023): 100 % del modificado'}])

# B · anulada
nota('HE-2023-0090', f'ANULADA (sello "ANULADO 23/11/2023"; su factura 219/2023 esta anulada y tiene abono 6-000010) {M}.',
     revision='corregido', firma_presente=False)
h = base.leer(f'hojas_encargo?id=eq.{F["HE-2023-0090"]["hoja_encargo_id"]}&select=id,estado')[0]
if h['estado'] != 'anulada':
    print('   hoja HE-2023-0090 -> anulada')
    if ESCRIBIR: base.actualizar(f'hojas_encargo?id=eq.{h["id"]}', {'estado': 'anulada', 'version_firmada_id': None})

# C · quien paga (por el nombre de la factura)
nota('HE-2023-0005', f'Paga FAIN {M}: facturas a FAIN de proyecto (38/2023, pedido 95003105), licencia y CSS.',
     pagador_tipo='empresa', contrata_id=con['FAIN'], comunidad_id=None, pagador_razon_social='FAIN ASCENSORES S.A', pagador_hay_que_crear=False)
nota('HE-2023-0089', f'Paga FAIN {M}: facturas a FAIN (240/2023; licencia y CSS en 2026).', firma_presente=True)
for c in ('HE-2023-0017', 'HE-2023-0018', 'HE-2023-0024'):
    nota(c, f'Paga ENVOLTERMIA {M}: hay factura a ENVOLTERMIA para esta direccion.', pagador_tipo='empresa',
         contrata_id=con['ENVOLTERMIA'], comunidad_id=None, pagador_razon_social='ENVOLTERMIA S.L.', pagador_cif='B02931558', pagador_hay_que_crear=False)
nota('HE-2023-0042', f'Paga la particular CARLA CONTRERAS NUÑEZ (52118110H) {M}: factura 88/2023 a su nombre.', pagador_hay_que_crear=False)

# D · importes (el desglose de las facturas)
for c, fac in (('HE-2023-0038', '104 y 133 de 2023'), ('HE-2023-0030', '92 y 114 de 2023')):
    nota(c, f'Importes por las facturas ({fac}): adelanto 7.500 en dos mitades de 3.750 y total 25.170 (21.600 proyecto + 3.570 '
            f'libro e IEE); el papel no cuadraba {M}.', total_base=25170)
for p in plazos(lineas('HE-2023-0038')[0]['id']):
    if p['hito'] in ('encargo', 'entrega'): poner('revision_firmadas_plazos', p['id'], {'importe': 3750})
nota('HE-2023-0027', f'Total por la factura 65/2023: 27.330 (21.473,57 proyecto + 5.856,43 libro e IEE), adelanto 7.000; la hoja '
     f'decia 28.050 {M}.', total_base=27330)
l27 = lineas('HE-2023-0027')[0]
poner('revision_firmadas_lineas', l27['id'], {'importe': 27330})
for p in plazos(l27['id']):
    if p['hito'] == 'concesion': poner('revision_firmadas_plazos', p['id'], {'importe': 20330})
nota('HE-2023-0044', f'Solo el 3,5 % a exito: se cobra a la concesion (el "100 % al encargo" no aplica) {M}.')

# E · Viñagrande: la 0132 es el contrato (9 portales, 207.450, Envoltermia); la 0133 es la version anterior
nota('HE-2023-0132', f'EL CONTRATO de la mancomunidad {M}: lo facturado a ENVOLTERMIA son 9 "hojas de pedido" de 15-01-2024 (Castillos 32 '
     'y Viñagrande 1, 3, 5, 7, 9, 13, 17, 29), 6.500 de adelanto por portal; sus totales suman 207.450 = esta tabla. Facturas 16 a '
     '24 de 2024 (975 c/u: el 15 % al encargo). EL ENCARGO SE ANULO: el resto NO se cobrara (plazos anulados).',
     total_base=207450, firma_presente=True, pagador_tipo='empresa', contrata_id=con['ENVOLTERMIA'], comunidad_id=None,
     pagador_razon_social='ENVOLTERMIA S.L.', pagador_cif='B02931558', pagador_hay_que_crear=False)
nota('HE-2023-0133', f'Version anterior de la 0132 (12 filas con portales repetidos, 274.320): SUSTITUIDA por la HE-2023-0132 {M}.',
     revision='corregido')
S = json.load(open('a_enviada_sin_firmar.json', encoding='utf-8'))
if 'HE-2023-0133' not in S:
    S['HE-2023-0133'] = {'estado': 'enviada_comunidad', 'sustituida_por': 'HE-2023-0132'}
    if ESCRIBIR: json.dump(S, open('a_enviada_sin_firmar.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# F · lo que se aplica sin preguntar (criterios ya dados)
nota('HE-2023-0088', f'CIF SIN CONFIRMAR (lectura incompleta "H7807081"): pedirlo a la comunidad {M}.', pagador_cif=None)
nota('HE-2023-0124', f'CIF resuelto por el digito de control: H82827130 {M}.', pagador_cif='H82827130')
for c in ('HE-2023-0060', 'HE-2023-0061'):
    nota(c, f'Mismo PDF con dos hojas: la 0060 es la subvencion (1.500) y la 0061 el proyecto + CSS (4.100) {M}.')
nota('HE-2023-0107', f'Manda el papel: la subvencion tambien 60/20/20 con el resto {M}.')

# G · pagadores nuevos: las dos particulares (persona + puesto 'propietario' con su DNI) y el colegio
NUEVAS = [('CARLA', 'CONTRERAS NUÑEZ', '52118110H', 'Propietaria particular que nos encarga y paga la HE-2023-0042 (COBRE 18 TORREJON DE ARDOZ).'),
          ('MERITXELL', 'PARAYRE SABES', '34754143Q', 'Propietaria particular que nos encarga y paga la HE-2023-0062 (AV MONTE 89 URB SANTO DOMINGO ALGETE).')]
for nom, ape, dni, txt in NUEVAS:
    if base.leer(f'puesto?documento=eq.{dni}&select=id'): continue          # ya estaban en la agenda (Carla y Meritxell, 'propietaria')
    print('   persona nueva:', nom, ape, dni)
    if not ESCRIBIR: continue
    base.insertar('persona', [{'nombre': nom, 'apellidos': ape, 'activa': True, 'notas': f'{txt} {M}'}])
    pid = base.leer(f'persona?nombre=eq.{nom}&apellidos=eq.{ape.replace(" ", "%20")}&select=id&order=creado_en.desc&limit=1', por_tramos=False)[0]['id']
    base.insertar('puesto', [{'persona_id': pid, 'cargo': 'propietario', 'documento': dni, 'notas': txt}])
if not base.leer('empresas_propietarias?cif=eq.Q2868644B&select=id'):
    print('   empresa propietaria nueva: CP LORENZO LUZURIAGA DE MADRID MEC')
    if ESCRIBIR:
        base.insertar('empresas_propietarias', [{'nombre_accesalia': 'CP LORENZO LUZURIAGA DE MADRID MEC',
                       'nombre_legal': 'CP LORENZO LUZURIAGA DE MADRID MEC', 'cif': 'Q2868644B',
                       'direccion': 'VALENCIA DE DON JUAN 19, 28034 MADRID'}])
print('ESCRITO' if ESCRIBIR else 'PRUEBA')

# H · (9-oct, despues) Herrera Oria 283 (HE-2023-0046): total 12.950 (factura 101/2023; el papel desglosa 11.000 + 2.950,
#     que no suma). Adelanto 6.500 cobrado; el resto (6.450) se facturo en 2024 (122/2024) y se ABONO "por acuerdo con el
#     cliente" (abono 2024-0005): "lo cobrado se queda y el resto anulado". Ver --herrera (despues de grupo3).
