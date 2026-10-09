# FIRMADAS DE 2022 (9-oct-2026): lo que resuelven las FACTURAS emitidas (regla de Monica: "si hay factura, se firmo";
# el nombre dice a quien se facturo y el texto el desglose) y lo que resuelve la propia app, en las tablas de TRABAJO.
# Va despues de cargar_revision.py. Las dudas que quedan se le preguntan a Monica.
#   python respuestas_2022.py [--escribir]
import sys, json
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base
ESCRIBIR = '--escribir' in sys.argv
M = '(9-oct, por las facturas)'

F = {f['numero_hoja']: f for f in base.leer('revision_firmadas?numero_hoja=like.HE-2022-*&select=*&order=id')}
con = {c['nombre']: c['id'] for c in base.leer('contratas?select=id,nombre&order=id')}
bl = {b['codigo']: b['id'] for b in base.leer('bloques?select=id,codigo&order=id')}
opp = lambda cod: base.leer(f'oportunidades?codigo=eq.{cod}&select=id,comunidad_id')[0]
def lineas(cod): return base.leer(f'revision_firmadas_lineas?firmada_id=eq.{F[cod]["id"]}&select=id,orden,texto,importe&order=orden,id')
def accion(txt, fn, *a):
    print('  ', txt)
    if ESCRIBIR: fn(*a)
def nota(cod, texto, **cambios):
    f = F[cod]
    if texto and texto not in (f['nota'] or ''): cambios['nota'] = f['nota'] = '\n'.join(x for x in (texto, f['nota']) if x)
    cambios.setdefault('revision', 'pendiente')
    print(cod, '|', texto[:150])
    if ESCRIBIR: base.actualizar(f'revision_firmadas?id=eq.{f["id"]}', cambios)
def mover(cod, opp_cod, comunidad_id=None):
    o = opp(opp_cod); cid = comunidad_id or o['comunidad_id']
    accion(f'{cod} -> {opp_cod}', lambda: (base.actualizar(f'hojas_encargo?id=eq.{F[cod]["hoja_encargo_id"]}', {'oportunidad_id': o['id'], 'comunidad_id': cid}),
                                          base.actualizar(f'revision_firmadas?id=eq.{F[cod]["id"]}', {'oportunidad_id': o['id'], 'comunidad_id': cid})))
def linea_nueva(cod, orden, texto, bloque, importe=None, porcentaje=None, incluido=False, plazos=()):
    def hacer():
        base.insertar('revision_firmadas_lineas', [{'firmada_id': F[cod]['id'], 'orden': orden, 'texto': texto, 'bloque_id': bl[bloque],
                       'importe': importe, 'porcentaje': porcentaje, 'incluido': incluido, 'comparacion': 'falta_en_base'}])
        lid = base.leer(f'revision_firmadas_lineas?firmada_id=eq.{F[cod]["id"]}&orden=eq.{orden}&select=id&order=id.desc&limit=1', por_tramos=False)[0]['id']
        if plazos: base.insertar('revision_firmadas_plazos', [dict(p, linea_id=lid, orden=k) for k, p in enumerate(plazos, 1)])
    accion(f'{cod}: linea nueva "{texto[:50]}" {importe or ""}{(" + %s %%" % porcentaje) if porcentaje else ""}', hacer)

# --- oportunidad equivocada
mover('HE-2022-0003', 'DAN-2021-128')            # Manresa 25-27 (factura 35/2022: "hoja de encargo de 31-01-2022")
nota('HE-2022-0003', f'Es de MANRESA 25-27 (el "56" tachado a mano): pasa a DAN-2021-128. CIF H79655569 (el de su factura 35/2022) {M}.', pagador_cif='H79655569')
mover('HE-2022-0042', 'DAN-2022-140')            # Brunete 11 Getafe
nota('HE-2022-0042', f'Es de BRUNETE 11 GETAFE (no de Rio Guadalquivir 10): pasa a DAN-2022-140. Hay facturas (31, 54 subv., 60 lic.) {M}.')
etr = opp('DAN-2019-049')['comunidad_id']
mover('HE-2022-0015', 'DAN-2022-104', etr)       # el SATE de Etruria, no el ascensor
nota('HE-2022-0015', f'Es el PROYECTO SATE (7.800): factura 45/2022 a la C P ETRURIA 26 28 Y LUCANO 65 (50 % = 3.900) => firmada. '
     f'Pasa a la opp del SATE (DAN-2022-104) {M}.', firma_presente=True, pagador_cif='H78325750')
if ESCRIBIR and not opp('DAN-2022-104')['comunidad_id']:
    base.actualizar('oportunidades?codigo=eq.DAN-2022-104', {'comunidad_id': etr})

# --- Manzanares 22: el lector las cruzo; en la app la 0032 es el SATE y la 0033 la subvencion (facturas 88 y 91 de 2022)
A = base.leer('revision_firmadas?numero_hoja=in.(HE-2022-0032,HE-2022-X032)&select=id,numero_hoja,total_base,nota')[0]
B = F['HE-2022-0033']
def cruzar():
    # cada fila sigue con SU hoja; se intercambian las LINEAS (con sus plazos), el total y la nota
    la = [l['id'] for l in base.leer(f'revision_firmadas_lineas?firmada_id=eq.{A["id"]}&select=id&order=id')]
    lb = [l['id'] for l in base.leer(f'revision_firmadas_lineas?firmada_id=eq.{B["id"]}&select=id&order=id')]
    for i in la: base.actualizar(f'revision_firmadas_lineas?id=eq.{i}', {'firmada_id': B['id']})
    for i in lb: base.actualizar(f'revision_firmadas_lineas?id=eq.{i}', {'firmada_id': A['id']})
    base.actualizar(f'revision_firmadas?id=eq.{A["id"]}', {'numero_hoja': 'HE-2022-0032', 'total_base': B['total_base'],
                    'nota': f'En la app la 0032 es el SATE: lineas cruzadas con la 0033 (facturas 88 y 91 de 2022) {M}.' + chr(10) + (B['nota'] or '')})
    base.actualizar(f'revision_firmadas?id=eq.{B["id"]}', {'total_base': A['total_base'],
                    'nota': f'En la app la 0033 es la subvencion: lineas cruzadas con la 0032 {M}.' + chr(10) + (A['nota'] or '')})
if A['total_base'] and float(A['total_base']) == 1500:
    accion('Manzanares: se cruzan las lineas de 0032 (-> SATE 7.800) y 0033 (-> subvencion 1.500)', cruzar)
F['HE-2022-0032'] = base.leer('revision_firmadas?numero_hoja=in.(HE-2022-0032,HE-2022-X032)&select=*')[0]

# --- firmadas porque hay factura (y a quien)
for c, t in [('HE-2022-0043', 'facturas 161 (proyecto 3.600) y 172 (subv.) de 2022; el sello es de la misma comunidad (Sierra Madrona 36)'),
             ('HE-2022-0045', 'hay facturas a CP PLAZA DE LAS FLORAS 5 (70/2021 y CSS 28/2023), aunque no de esta subvencion'),
             ('HE-2022-0094', 'factura 181/2022 de la subvencion; las lineas son las de la hoja firmada que viene en el PDF de la 0093')]:
    nota(c, f'Firmada: {t} {M}.', firma_presente=True)
nota('HE-2022-0043', '', pagador_cif=None)
nota('HE-2022-0047', f'Paga FAIN: facturas 116/2022 y 187/2024 a FAIN (pedido 253210, orden 800143024) {M}.', contrata_id=con['FAIN'],
     pagador_tipo='empresa', pagador_razon_social='FAIN ASCENSORES S.A', comunidad_id=None, pagador_hay_que_crear=False)
nota('HE-2022-0085', f'Paga FAIN: facturas 204/2022 y 69/2023 a FAIN (pedido de compras 262893) {M}.', contrata_id=con['FAIN'],
     pagador_tipo='empresa', pagador_razon_social='FAIN ASCENSORES S.A', comunidad_id=None, pagador_hay_que_crear=False)
nota('HE-2022-0012', f'Paga ELECNOR: factura 28/2022 a ELECNOR (memoria de cubierta, 500) {M}.', contrata_id=con['ELECNOR'], pagador_tipo='empresa',
     comunidad_id=None, pagador_hay_que_crear=False)
nota('HE-2022-0010', f'Total 8.090: las facturas 37 y 43 de 2022 cobran "2.000 / 2.095 de un total de 8.090" {M}.')
nota('HE-2022-0020', f'Total 2.000 (1.500 proyecto + 500 CSS): las facturas a FAIN hablan de "1.500"; el 2.100 del papel no suma {M}.', total_base=2000)
nota('HE-2022-0021', f'CIF H80089824 = la comunidad "CP AV CARDENAL HERRERA ORIA 260" (direccion fiscal de Cadalso de los Vidrios 2, '
     f'segun las facturas de FAIN): factura a esa comunidad. OJO: el mismo edificio esta dos veces en la app {M}.')
nota('HE-2022-0073', f'IBAN resuelto por el digito de control: ES34 0081 7115 1700 0160 7971 {M}.', pagador_iban='ES34 0081 7115 1700 0160 7971')
nota('HE-2022-0086', f'CIF H81432817 (el de su factura 238/2022). IBAN SIN CONFIRMAR (no se lee): pedirlo a la comunidad {M}.',
     pagador_cif='H81432817', pagador_iban=None)
nota('HE-2022-0070', f'IBAN SIN CONFIRMAR: dos lecturas validas (ES06 2100 6894 1513 0028 6518 / ES06 2100 6854 1513 0028 6578): pedirlo {M}.',
     pagador_iban=None)
nota('HE-2022-0077', f'Manda el PDF 2 (factura 163/2022: adelanto 6.000 de un total de 20.850) {M}.')

# --- Rio Duero 12: la 0017 es el PROYECTO (su firmada guardada es la de la subvencion = la 0016). Hoja enviada
#     "HOJA DE ENCARGO RIO DUERO 12 LEGANES PRY.docx" (28-09-2022): 3.500 con licencia, DO y CFO; sin forma de pago.
#     Facturas a la comunidad: anteproyecto 30 % (173/2022), visado 20 % (8/2023), licencia 30 % (24/2026).
nota('HE-2022-0017', f'Es el PROYECTO de ascensor: 3.500 (hoja enviada PRY de 28-09-2022; su PDF firmado no esta, el guardado es el de '
     f'la 0016). Firmada: facturas 173/2022, 8/2023 y 24/2026 a la comunidad {M}.', total_base=3500, firma_presente=True,
     fecha_emision='2022-09-28')
if not lineas('HE-2022-0017'):
    linea_nueva('HE-2022-0017', 1, 'Proyecto para instalacion de ascensor (Proyecto Basico y de Ejecucion)', 'REDACCION PROYECTO', 3500)
    for k, (t, b) in enumerate([('Visado y tramitacion de la solicitud de Licencia', 'TRAMITACION LICENCIAS'), ('Direccion de Obra', 'DF'),
                                ('Certificacion Fin de Obra', 'CERTIFICADO FIN DE OBRA')], 2):
        linea_nueva('HE-2022-0017', k, t, b, incluido=True)

# --- Natalio Tortuero 6 (ELECNOR): la 0090 y la 0115 son el MISMO PDF (subvencion + proyecto, sin importes). 0090 = subvencion
#     (1.500, factura 222/2022, ABONADA en 2023 "por acuerdo con el cliente"); 0115 = proyecto (4.300: 50 % en 231/2022, abonada;
#     2a mitad en 45/2025 por el fin de obra)
for c in ('HE-2022-0090', 'HE-2022-0115'):
    nota(c, f'Paga ELECNOR (facturas a ELECNOR) {M}.', contrata_id=con['ELECNOR'], pagador_tipo='empresa', comunidad_id=None,
         pagador_razon_social='ELECNOR SERVICIOS Y PROYECTOS S.A.U.', pagador_cif='A79486833', pagador_hay_que_crear=False)
nota('HE-2022-0090', 'Solo la SUBVENCION: 1.500 (factura 222/2022) ABONADA en 2023 (abono 6-000001) por acuerdo con el cliente.', total_base=1500)
for l in lineas('HE-2022-0090'):
    if l['orden'] == 1: accion('0090 subv 1.500', base.actualizar, f'revision_firmadas_lineas?id=eq.{l["id"]}', {'importe': 1500})
nota('HE-2022-0115', 'Solo el PROYECTO: 4.300 (factura 231/2022 del 50 % abonada en 2023; 2a mitad 45/2025 por el fin de obra). La '
     'subvencion de este PDF es la 0090.', total_base=4300)
for l in lineas('HE-2022-0115'):
    if l['orden'] in (1, 2): accion(f'0115 fuera la linea {l["orden"]} (es de la 0090)', base.borrar, f'revision_firmadas_lineas?id=eq.{l["id"]}')
    if l['orden'] == 3: accion('0115 proyecto 4.300', base.actualizar, f'revision_firmadas_lineas?id=eq.{l["id"]}', {'importe': 4300})

# --- honorarios sobre el PEM (no es % de subvencion): linea propia, base 'PEM' (se pone en lineas_facturacion tras el grupo 3)
nota('HE-2022-0058', f'1 % del PEM: linea variable (factura 129/2024: "1 % del PEM del presupuesto firmado con la contrata", 1.141,30) {M}.')
if not any('PEM' in (l['texto'] or '') for l in lineas('HE-2022-0058')):
    linea_nueva('HE-2022-0058', 9, 'Honorarios variables: 1 % del PEM del presupuesto firmado con la contrata', 'REDACCION PROYECTO', None, 1,
                plazos=[{'hito': 'otro', 'porcentaje': None, 'importe': None, 'texto': 'Sobre el PEM del presupuesto firmado con la contrata'}])
nota('HE-2022-0123', f'1,5 % del PEM: linea variable aparte (no es % a exito) {M}.')
if not any('PEM' in (l['texto'] or '') and l['importe'] is None for l in lineas('HE-2022-0123')):
    linea_nueva('HE-2022-0123', 9, 'Honorarios variables: 1,5 % del PEM', 'REDACCION PROYECTO', None, 1.5,
                plazos=[{'hito': 'otro', 'porcentaje': None, 'importe': None, 'texto': 'Sobre el PEM'}])

# --- la 0111 es de 2023 (emitida 19-06-2023, 1.800): se renumera en la serie de 2023 despues del grupo 2
nota('HE-2022-0111', f'La hoja es de 2023 (emitida 19-06-2023, 1.800): pasa a la serie HE-2023 {M}.')
print('ESCRITO' if ESCRIBIR else 'PRUEBA')
