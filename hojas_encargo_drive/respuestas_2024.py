# FIRMADAS DE 2024: las respuestas de Monica (8-oct-2026) a las dudas de la relectura, en las tablas de TRABAJO
# (y lo poco que va directo: anular la 0023, crear Merca San Martin). Va despues de cargar_revision.py.
import sys, json
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base
M = '(Monica, 8-oct)'

F = {f['numero_hoja']: f for f in base.leer('revision_firmadas?select=id,numero_hoja,nota,hoja_encargo_id,pagador_iban,pagador_cif')}
con = {c['nombre']: c['id'] for c in base.leer('contratas?select=id,nombre')}
def nota(cod, texto, **cambios):
    f = F[cod]
    if texto and texto not in (f['nota'] or ''): cambios['nota'] = '\n'.join(x for x in (texto, f['nota']) if x)
    cambios.setdefault('revision', 'pendiente')
    base.actualizar(f'revision_firmadas?id=eq.{f["id"]}', cambios)

# A · datos de cobro que no se leen: pasan vacios y se piden
for c in ['HE-2024-0001', 'HE-2024-0015', 'HE-2024-0019', 'HE-2024-0076', 'HE-2024-0112', 'HE-2024-0141']:
    nota(c, f'IBAN SIN CONFIRMAR (lectura: {F[c]["pagador_iban"]}): pedirlo a la comunidad {M}.', pagador_iban=None)
for c in ['HE-2024-0143', 'HE-2024-0153']:
    nota(c, f'CIF SIN CONFIRMAR (lectura: {F[c]["pagador_cif"]}): pedirlo a la comunidad {M}.', pagador_cif=None)
nota('HE-2024-0153', 'IBAN: la unica lectura que cuadra es ES38 2085 8228 4903 3018 2228; confirmar.', pagador_iban=None)
nota('HE-2025-0492', f'IBAN resuelto por el digito de control {M}.')

# B · Schindler: si firma Moya (o Koves en la 0118), paga Schindler, tambien la subvencion
#     ("hubo una epoca en que Schindler incluia el pago de la subvencion en su oferta; ya no")
fd = json.load(open('tmp_revision/firmas_digitales.json', encoding='utf-8'))
moya = {k.rsplit('-', 1)[0] for k, v in fd.items() if any('Javier Gonz' in n and 'Moya' in n for n in v)}
for c in sorted(x for x in moya if x.startswith('HE-2024')) + ['HE-2024-0118']:
    if c not in F: continue
    nota(c, f'Firma Schindler (Javier Gonzalez Moya / Luis A. Gonzalez Koves): paga SCHINDLER, tambien la subvencion {M}.',
         firma_presente=True, pagador_tipo='empresa', contrata_id=con['SCHINDLER'], comunidad_id=None,
         pagador_razon_social='SCHINDLER S.A.', pagador_cif='A50001726', pagador_hay_que_crear=False)
nota('HE-2024-0156', f'La firma Luis A. Gonzalez Koves, pero aqui paga la COMUNIDAD {M}.', pagador_tipo='comunidad', contrata_id=None)
nota('HE-2024-0110', f'Paga IBERLEAN (firma digital de Miguel Angel Gonzalez Alemany) {M}.', pagador_tipo='empresa',
     contrata_id=con['IBERLEAN ACCESIBILIDAD'], comunidad_id=None, pagador_razon_social='IBERLEAN ACCESIBILIDAD S.L.',
     pagador_hay_que_crear=False, firma_presente=True)

# C · la 0023 NO VALE ("no vale -" en el nombre del archivo): anulada. La 0092 se queda como esta.
nota('HE-2024-0023', f'NO VALE (el archivo se llama "no vale - ..."): ANULADA {M}.', revision='corregido', firma_presente=False)
h = base.leer(f'hojas_encargo?id=eq.{F["HE-2024-0023"]["hoja_encargo_id"]}&select=id,estado')[0]
if h['estado'] != 'anulada':
    base.actualizar(f'hojas_encargo?id=eq.{h["id"]}', {'estado': 'anulada', 'version_firmada_id': None})
nota('HE-2024-0092', f'Se queda como esta: cambio de tramitador sin importes; la hoja de 2022 que trae dentro entra con 2022 {M}.')

# D · Laton, Ureka, propietarios-empresa
nota('HE-2024-0095', 'DIRECCION: la hoja dice "Laton 1": es ERRATA. Monica cree que es el 6 (son varias parcelas y la de '
     f'Catastro no era el 8); la opp esta como Laton 8. No se toca la direccion sin comprobarlo {M}.')
nota('HE-2024-0164', f'Grupo Ureka: CERRADA {M}. (En la app la contrata es "⛔ UREKA".)')
if not base.leer('empresas_propietarias?cif=eq.B88374707&select=id'):
    base.insertar('empresas_propietarias', [{'nombre_accesalia': 'MERCA SAN MARTIN S.L.', 'nombre_legal': 'MERCA SAN MARTIN S.L.',
                   'cif': 'B88374707', 'direccion': 'AV. DE MADRID 42, 28680 SAN MARTIN DE VALDEIGLESIAS'}])
merca = base.leer('empresas_propietarias?cif=eq.B88374707&select=id')[0]['id']
if not base.leer(f'figura_legal_propietaria?id_comodin=eq.{merca}&select=id_comodin'):
    base.insertar('figura_legal_propietaria', [{'id_comodin': merca, 'figura': 'Propietario Empresa'}])
nota('HE-2024-0125', f'Paga MERCA SAN MARTIN S.L. (B88374707), propietario-empresa en Av. Madrid 42 (la misma opp que Hipermercado '
     f'Charly, otro CIF: dos pagadores, cada uno el suyo) {M}.', pagador_tipo='particular', contrata_id=None, pagador_hay_que_crear=False)
nota('HE-2024-0063', f'Paga OSTALAZAR SL, propietario-empresa (ya en la app) {M}.', pagador_tipo='particular', contrata_id=None,
     pagador_hay_que_crear=False)
print('hecho; Merca San Martin =', merca)
