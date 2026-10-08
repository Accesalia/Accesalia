# REVISION DE LAS FIRMADAS: las respuestas de Monica (8-oct-2026) aplicadas a las tablas de TRABAJO.
# Va DESPUES de cargar_revision.py: si se recarga un lote, se vuelve a pasar este script.
import sys, json
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base

F = {f['numero_hoja']: f for f in base.leer('revision_firmadas?select=id,numero_hoja,nota,revision,pagador_razon_social,'
                                            'pagador_cif,pagador_iban,pagador_direccion,comunidad_id')}
con = {c['nombre']: c['id'] for c in base.leer('contratas?select=id,nombre')}

def nota(cod, texto, **cambios):
    f = F[cod]
    if texto and texto not in (f['nota'] or ''):
        cambios['nota'] = '\n'.join(x for x in (texto, f['nota']) if x)
    base.actualizar(f'revision_firmadas?id=eq.{f["id"]}', cambios)

# 1 · Javier Gonzalez Moya = comercial de SCHINDLER: su firma digital es Schindler aceptando la hoja
#     (regla de empresas: firmada, y paga la empresa). Juan Jose MOYA LOPEZ (Fatou) es otra persona.
SCHINDLER_MOYA = ['HE-2025-0015', 'HE-2025-0222', 'HE-2025-0223', 'HE-2025-0272', 'HE-2025-0333', 'HE-2025-0339',
                  'HE-2025-0413', 'HE-2025-0414', 'HE-2025-0422', 'HE-2025-0505', 'HE-2026-0082', 'HE-2026-0221',
                  'HE-2026-0253', 'HE-2026-0412', 'HE-2026-0413']
for c in SCHINDLER_MOYA:
    nota(c, 'Firma digital de Javier Gonzalez Moya, comercial de SCHINDLER (Monica, 8-oct): la acepta y paga Schindler.',
         firma_presente=True, pagador_tipo='empresa', contrata_id=con['SCHINDLER'], comunidad_id=None,
         pagador_razon_social='SCHINDLER S.A.', pagador_cif='A50001726', pagador_hay_que_crear=False)
#     Matiz (Monica): "paga Schindler, no la comunidad (EL PROYECTO)": la SUBVENCION la paga la comunidad.
#     Hoja solo de subvencion -> paga la comunidad; hoja mixta -> la linea de subvencion lleva nota.
bl_sub = {x['id'] for x in base.leer('bloques?select=id,codigo&codigo=like.TRAMITACION%20SUBVENCIONES*')}
hoja_com = {h['numero_hoja']: h['comunidad_id'] for h in base.leer('hojas_encargo?estado=eq.devuelta_firmada&select=numero_hoja,comunidad_id')}
for c in SCHINDLER_MOYA:
    L = base.leer(f'revision_firmadas_lineas?firmada_id=eq.{F[c]["id"]}&incluido=eq.false&comparacion=neq.sobra_en_base&select=id,bloque_id,nota')
    sub = [l for l in L if l['bloque_id'] in bl_sub]
    if sub and len(sub) == len(L):
        base.actualizar(f'revision_firmadas?id=eq.{F[c]["id"]}', {
            'pagador_tipo': 'comunidad', 'contrata_id': None, 'comunidad_id': hoja_com.get(c), 'pagador_razon_social': None,
            'pagador_cif': None, 'pagador_hay_que_crear': None,
            'nota': '\n'.join(x for x in (
                'Hoja solo de SUBVENCION: aunque la firme el comercial de Schindler (firma digital de Javier Gonzalez Moya), '
                'la paga la COMUNIDAD (Monica, 8-oct).',
                '\n'.join(s for s in (F[c]['nota'] or '').split('\n') if 'SCHINDLER' not in s.upper())) if x)})
    for l in sub if len(sub) < len(L) else []:
        if 'COMUNIDAD' not in (l['nota'] or ''):
            base.actualizar(f'revision_firmadas_lineas?id=eq.{l["id"]}',
                            {'nota': 'Esta linea (subvencion) la paga la COMUNIDAD; el proyecto, Schindler (Monica, 8-oct).'})
#     Rosa Maria Radal = la chica de ROSERSESE, contrata que pone ascensores.
for c in ['HE-2025-0403', 'HE-2025-0742', 'HE-2026-0056', 'HE-2026-0341', 'HE-2026-0470', 'HE-2025-0115']:
    nota(c, 'Firma digital de Rosa Maria Radal, de ROSERSESE (contrata de ascensores; Monica, 8-oct): paga Rosersese.',
         firma_presente=True, pagador_tipo='empresa', contrata_id=con['ROSERSESE'], comunidad_id=None,
         pagador_razon_social='ROSERSESE SERVICIOS INTEGRALES S.L.', pagador_cif='B98952690', pagador_hay_que_crear=False,
         revision='pendiente')

# 2 · Rafael Calvo 9: "un marron de Dani que al final lo hizo GRATIS para evitar problemas mayores"
nota('HE-2022-0001', 'Encargo hecho GRATIS por Daniel para evitar problemas mayores (Monica, 8-oct). La "firmada" es el correo.',
     total_base=0, revision='pendiente')
#     Sin firma (Monica, 8-oct, tras mirar facturas):
#     a) su PDF es la firmada de OTRA version: no se firmaron -> enviada sin firmar, sustituida por la buena
SUSTITUIDAS = {'HE-2025-0050': 'HE-2025-0055', 'HE-2025-0073': 'HE-2025-0077', 'HE-2025-0256': 'HE-2025-0261'}
for c, nueva in SUSTITUIDAS.items():
    nota(c, f'NO FIRMADA: su PDF es la firmada de {nueva}. Pasa a ENVIADA SIN FIRMAR, sustituida por {nueva} (Monica, 8-oct).',
         firma_presente=False, revision='corregido')
#     b) sin firma en el papel pero COBRADAS: valen como firmadas
for c in ['HE-2024-0002', 'HE-2025-0409', 'HE-2025-0736']:
    nota(c, 'Sin firma en el papel, pero COBRADA y pagada por la comunidad (Monica, 8-oct): vale como firmada.',
         firma_presente=True, pagador_tipo='comunidad', revision='pendiente')
nota('HE-2026-0203', 'Sin firma en el papel, pero FACTURADA: pagaba FAIN, por eso no la firma la comunidad (Monica, 8-oct).',
     firma_presente=True, pagador_tipo='empresa', contrata_id=con['FAIN'], comunidad_id=None,
     pagador_razon_social='FAIN ASCENSORES S.A.', pagador_cif='A28303485', pagador_hay_que_crear=False, revision='pendiente')
nota('HE-2026-0059', 'Sin firma en el papel, pero el proyecto SE HIZO: FIRMADA y PENDIENTE DE COBRO (Monica, 8-oct). '
                     'Dato para facturacion.', firma_presente=True, revision='pendiente')
json.dump({c: {'estado': 'enviada_comunidad', 'sustituida_por': n} for c, n in SUSTITUIDAS.items()},
          open('a_enviada_sin_firmar.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# 5 · Casos sueltos
nota('HE-2025-0388', 'Queda FIRMADA (Monica, 8-oct). El correo de ALSER (firmaron la subvencion por error; en pausa) '
                     'importa para facturacion.', revision='pendiente')
nota('HE-2025-0394', 'Paga un PARTICULAR: Marcos Ramos Lama, propietario del 2o izq. (Monica, 8-oct).',
     pagador_tipo='particular', pagador_razon_social='MARCOS RAMOS LAMA', pagador_cif='51086553B', revision='pendiente')
#     Alberto Aguilera 68 / Amaniel 34: casillas de pago CRUZADAS -> se corrigen y se deja dicho
a, b = F['HE-2025-0279'], F['HE-2025-0280']
if 'CRUZADA' not in (a['nota'] or ''):
    campos = ['pagador_razon_social', 'pagador_cif', 'pagador_iban', 'pagador_direccion']
    for x, y, otra in ((a, b, 'HE-2025-0280 (Amaniel 34)'), (b, a, 'HE-2025-0279 (Alberto Aguilera 68)')):
        nota(x['numero_hoja'], f'CASILLA DE PAGO CRUZADA en el PDF: lleva los datos de {otra} y viceversa (mismo administrador, '
                               'mismo dia). Corregido: aqui van los datos de ESTA comunidad, sacados de la otra hoja.',
             comunidad_id=None, revision='pendiente', **{k: y[k] for k in campos})

# Fuera: no son hojas firmadas (Monica, 8-oct). Se apuntan para el paso a produccion.
fuera = {'HE-2025-0244': 'Es un estudio de costes (viabilidad), no una hoja firmada.',
         'HE-2026-0434': 'Es un contrato de TKE (ARQ_2296/2026), no una hoja de encargo.'}
for c in fuera:
    if c in F: base.borrar(f'revision_firmadas?id=eq.{F[c]["id"]}')
json.dump(fuera, open('fuera_de_firmadas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('hecho')
