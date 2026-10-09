# PASO A PRODUCCION, GRUPO 1: COMUNIDADES (Monica, 8-oct-2026: "primero completar comunidades, con sus
# datos"). Sale de las tablas de trabajo revision_firmadas (lo leido en cada hoja firmada).
#   - CIF que falta en la comunidad -> el de la casilla de la hoja (solo si cumple el digito de control)
#   - IBAN que falta -> el de la hoja (solo si cumple el control IBAN); si hay varios, el de la firma mas reciente
#   - CIF de la app que NO cumple el control y la hoja trae uno que si: Doctor Vallejo 39, Batalla de Clavijo 7
#   - Comunidad nueva: FERENC PUSKAS 28 (la opp no tenia; CIF de la firma digital, IBAN de la casilla)
# Tubo 5 / Miralcampo: se queda la H de la app (comprobado en la tarjeta del CIF, Monica).
# Nunca se toca comunidades.nombre (curado a mano).
#   python grupo1_comunidades.py            (prueba)
#   python grupo1_comunidades.py --escribir
import sys, re, collections
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base
ESCRIBIR = '--escribir' in sys.argv

def limpio(s): return re.sub(r'[^A-Z0-9?]', '', (s or '').upper())
def cif_ok(c):
    c = limpio(c)
    if len(c) != 9 or '?' in c or not c[1:8].isdigit() or c[0] not in 'ABCDEFGHJNPQRSUVW': return False
    d = c[1:8]; a = sum(int(d[i]) for i in (1, 3, 5)); b = sum(sum(divmod(int(d[i]) * 2, 10)) for i in (0, 2, 4, 6))
    k = (10 - (a + b) % 10) % 10
    return c[8] in (str(k), 'JABCDEFGHI'[k])
def iban_ok(i):
    i = limpio(i)
    if not re.fullmatch(r'ES\d{22}', i): return False
    n = int(''.join(str(int(ch, 36)) for ch in i[4:] + i[:4]))
    return n % 97 == 1
def iban_bonito(i): i = limpio(i); return ' '.join(i[k:k + 4] for k in range(0, 24, 4))

# (8-oct, tarde) comunidades.iban ya no existe: las cuentas son de paso2_cuentas.py. Aqui solo el CIF.
C = {c['id']: dict(c, iban='-') for c in base.leer('comunidades?select=id,nombre,cif_comunidad&order=id')}
sin_cp = lambda x: re.sub(r'^CP\s+', '', x or '')   # (9-oct) los nombres llevan ahora 'CP ' delante
F = base.leer('revision_firmadas?pagador_tipo=eq.comunidad&select=numero_hoja,hoja_encargo_id,fecha_firma,pagador_cif,'
              'pagador_iban,comunidad_id,opp:oportunidad_id(id,comunidad_id)')
cif_nuevo, iban_cand = {}, collections.defaultdict(list)
for f in sorted(F, key=lambda f: f['fecha_firma'] or ''):
    cid = f['comunidad_id'] or f['opp']['comunidad_id']
    if not cid: continue
    if not C[cid]['cif_comunidad'] and cif_ok(f['pagador_cif']): cif_nuevo[cid] = limpio(f['pagador_cif'])
    if not C[cid]['iban'] and iban_ok(f['pagador_iban']): iban_cand[cid].append((f['fecha_firma'], iban_bonito(f['pagador_iban']), f['numero_hoja']))
# Fuera (8-oct): el CIF de la hoja no es el de ESA comunidad: garaje de Portugal 23 (no el portal), solo el 17 de
# Principes de España 17 y 19, solo Salamanca 1 de la comunidad conjunta Salamanca 1-3-5-7 y Empecinado 23.
NO_TOCAR_CIF = {'AV PORTUGAL 23 LEGANES', 'AV LOS PRINCIPES DE ESPAÑA 17 Y 19 COSLADA', 'SALAMANCA 1-3-5-7 Y EMPECINADO 23 MOSTOLES'}
cif_nuevo = {cid: v for cid, v in cif_nuevo.items() if sin_cp(C[cid]['nombre']) not in NO_TOCAR_CIF}
iban_cand = {cid: v for cid, v in iban_cand.items() if sin_cp(C[cid]['nombre']) not in NO_TOCAR_CIF}   # tampoco su IBAN (8-oct)
CORREGIR = {'H79444115': 'H79444105', 'E78007324': 'E78007234'}   # Doctor Vallejo 39, Batalla de Clavijo 7
cif_mal = {cid: CORREGIR[c['cif_comunidad']] for cid, c in C.items() if c['cif_comunidad'] in CORREGIR}

print('CIF que faltan:', len(cif_nuevo))
for cid, v in cif_nuevo.items(): print('  ', C[cid]['nombre'], '->', v)
print('CIF corregidos:', [(C[cid]['nombre'], C[cid]['cif_comunidad'], v) for cid, v in cif_mal.items()])
varios = {cid: v for cid, v in iban_cand.items() if len({x[1] for x in v}) > 1}
print('IBAN que faltan:', len(iban_cand), '| con IBAN distinto en varias hojas (se pone el de la firma mas reciente):', len(varios))
for cid, v in varios.items(): print('  ', C[cid]['nombre'], [(x[2], x[1]) for x in v])

ferenc = base.leer('oportunidades?codigo=eq.DAN-2026-206&select=id,comunidad_id')[0]
hoja_f = base.leer('hojas_encargo?numero_hoja=eq.HE-2026-0705&select=id')[0]
print('Ferenc Puskas 28: comunidad nueva' if not ferenc['comunidad_id'] else 'Ferenc Puskas 28: ya tiene comunidad')
if not ESCRIBIR: sys.exit('PRUEBA: no se ha escrito nada')

for cid, v in cif_nuevo.items(): base.actualizar(f'comunidades?id=eq.{cid}', {'cif_comunidad': v})
for cid, v in cif_mal.items(): base.actualizar(f'comunidades?id=eq.{cid}', {'cif_comunidad': v})
pass   # las cuentas: paso2_cuentas.py
if not ferenc['comunidad_id']:
    base.insertar('comunidades', [{'nombre': 'FERENC PUSKAS 28 MADRID', 'municipio': 'MADRID', 'provincia': 'MADRID', 'cp': '28052',
                                   'cif_comunidad': 'H16775991', 'iban': 'ES47 0081 7118 5100 0177 8678', 'activa': True}])
    nid = base.leer('comunidades?cif_comunidad=eq.H16775991&select=id')[0]['id']
    base.actualizar(f'oportunidades?id=eq.{ferenc["id"]}', {'comunidad_id': nid})
    base.actualizar(f'hojas_encargo?id=eq.{hoja_f["id"]}', {'comunidad_id': nid})
    base.actualizar('revision_firmadas?numero_hoja=eq.HE-2026-0705', {'comunidad_id': nid, 'pagador_hay_que_crear': False})
print('ESCRITO')
