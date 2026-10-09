# LAS 4 FIRMADAS DE 2024 SIN PAGADOR (Monica, 9-oct-2026): "ok a ambas".
#  - HE-2024-0069 (renovacion de subvenciones de Etruria 26-28 y Lucano 65, firma la C.P.) estaba colgada de la
#    opp del SATE perdido (DAN-2022-104): pasa a la del ASCENSOR (DAN-2019-049), que ya tiene su comunidad.
#  - Nardos 2 y Angeles 12 (Fuenlabrada) y Dos de Mayo 73 (Mostoles): opps antiguas sin direccion ni comunidad;
#    se crea la comunidad (nombre via+numero+municipio, CIF de la hoja, figura Comunidad de Propietarios).
#  Despues: sus lineas de facturacion pasan a tener pagador (la comunidad) y la cuenta vigente si la hay.
#   python sin_pagador_2024.py [--escribir]
import sys, re
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base
ESCRIBIR = '--escribir' in sys.argv
M = '(Monica, 9-oct)'

def limpio(i): return re.sub(r'[^A-Z0-9]', '', (i or '').upper())
def valido(i):                                        # mismo control que paso2_cuentas.py
    i = limpio(i)
    if not re.fullmatch(r'[A-Z]{2}\d{2}[A-Z0-9]{11,30}', i): return False
    return int(''.join(str(int(c, 36)) for c in i[4:] + i[:4])) % 97 == 1
def bonito(i): i = limpio(i); return ' '.join(i[k:k + 4] for k in range(0, len(i), 4))

def rev(cod): return base.leer(f'revision_firmadas?numero_hoja=eq.{cod}&select=id,hoja_encargo_id,oportunidad_id,pagador_cif,pagador_iban,nota')[0]
def apuntar(r, texto, **c):
    c['nota'] = '\n'.join(x for x in (texto, r['nota']) if x)
    if ESCRIBIR: base.actualizar(f'revision_firmadas?id=eq.{r["id"]}', c)

hacer = {}                                           # hoja -> comunidad
# 1 · Etruria
r = rev('HE-2024-0069')
asc = base.leer('oportunidades?codigo=eq.DAN-2019-049&select=id,comunidad_id')[0]
print('HE-2024-0069 -> DAN-2019-049, comunidad', asc['comunidad_id'])
if ESCRIBIR and r['oportunidad_id'] != asc['id']:
    base.actualizar(f'hojas_encargo?id=eq.{r["hoja_encargo_id"]}', {'oportunidad_id': asc['id'], 'comunidad_id': asc['comunidad_id']})
    apuntar(r, f'Estaba en la opp del SATE perdido (DAN-2022-104); es del ASCENSOR: pasa a DAN-2019-049. La hoja lee CIF '
               f'E78325750; la comunidad tiene H78325750 (se deja el de la app) {M}.', oportunidad_id=asc['id'], comunidad_id=asc['comunidad_id'])
hacer['HE-2024-0069'] = (asc['comunidad_id'], r)

# 2 · comunidades nuevas
NUEVAS = {'HE-2024-0002': ('NARDOS 2 FUENLABRADA', 'FUENLABRADA'),
          'HE-2024-0038': ('ANGELES 12 FUENLABRADA', 'FUENLABRADA'),
          'HE-2024-0071': ('DOS DE MAYO 73 MOSTOLES', 'MOSTOLES')}
for cod, (nombre, mun) in NUEVAS.items():
    r = rev(cod)
    cif = r['pagador_cif'] if r['pagador_cif'] and re.fullmatch(r'[A-Z]\d{7}[0-9A-J]', r['pagador_cif']) else None
    ya = base.leer(f'comunidades?nombre=eq.{nombre.replace(" ", "%20")}&select=id') or (base.leer(f'comunidades?cif_comunidad=eq.{cif}&select=id') if cif else [])
    print(cod, '->', nombre, '| CIF', cif, '| YA EXISTE' if ya else '| se crea')
    if not ESCRIBIR: hacer[cod] = (None, r); continue
    if ya: cid = ya[0]['id']
    else:
        base.insertar('comunidades', [{'nombre': nombre, 'municipio': mun, 'cif_comunidad': cif, 'activa': True}])
        cid = base.leer(f'comunidades?nombre=eq.{nombre.replace(" ", "%20")}&select=id&order=creado_en.desc&limit=1', por_tramos=False)[0]['id']
        base.insertar('figura_legal_propietaria', [{'id_comodin': cid, 'figura': 'Comunidad de Propietarios'}])
    base.actualizar(f'oportunidades?id=eq.{r["oportunidad_id"]}', {'comunidad_id': cid})
    base.actualizar(f'hojas_encargo?id=eq.{r["hoja_encargo_id"]}', {'comunidad_id': cid})
    apuntar(r, f'Paga la COMUNIDAD; no estaba en la app: creada "{nombre}" {M}.', comunidad_id=cid, pagador_hay_que_crear=False)
    hacer[cod] = (cid, r)

# 3 · cuentas y pagador de las lineas
for cod, (cid, r) in hacer.items():
    iban = r['pagador_iban']
    cta = base.leer(f'cuentas_bancarias?titular_tipo=eq.comunidad&titular_id=eq.{cid}&vigente=is.true&select=id,iban') if cid else []
    print('  ', cod, '| cuenta vigente:', cta[0]['iban'] if cta else None, '| la hoja trae:', iban, '(valida)' if valido(iban) else '(no vale)' if iban else '')
    if not ESCRIBIR: continue
    if valido(iban) and not any(limpio(c['iban']) == limpio(iban) for c in cta):
        base.insertar('cuentas_bancarias', [{'titular_tipo': 'comunidad', 'titular_id': cid, 'iban': bonito(iban), 'vigente': not cta,
                                             'origen': f'hoja {cod}', 'notas': None if not cta else f'Cuenta que traia la hoja {cod}; hoy hay otra vigente.'}])
        cta = base.leer(f'cuentas_bancarias?titular_tipo=eq.comunidad&titular_id=eq.{cid}&vigente=is.true&select=id,iban')
    base.actualizar(f'lineas_facturacion?hoja_encargo_id=eq.{r["hoja_encargo_id"]}',
                    {'pagador_tipo': 'comunidad', 'pagador_id': cid, 'cuenta_id': cta[0]['id'] if cta else None})
print('ESCRITO' if ESCRIBIR else 'PRUEBA')
