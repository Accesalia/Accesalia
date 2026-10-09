# PASO 2 del modelo de pagador (Monica, 8-oct-2026): las cuentas a la tabla cuentas_bancarias.
#   a) cada comunidad con IBAN en su ficha -> su cuenta VIGENTE (origen: la hoja firmada si sale de ahi,
#      si no "ficha de la comunidad")
#   b) las cuentas que traen las hojas firmadas (tabla de trabajo) y aun no estan: de comunidades y de
#      contratas. Si el titular ya tiene vigente, entra como HISTORICA (vigente = false), con su hoja.
# Solo entran los IBAN que cumplen el digito de control; los demas se listan.
#   python paso2_cuentas.py [--escribir]
import sys, re, collections
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base
ESCRIBIR = '--escribir' in sys.argv

def limpio(i): return re.sub(r'[^A-Z0-9]', '', (i or '').upper())
def valido(i):
    i = limpio(i)
    if not re.fullmatch(r'[A-Z]{2}\d{2}[A-Z0-9]{11,30}', i): return False
    return int(''.join(str(int(c, 36)) for c in i[4:] + i[:4])) % 97 == 1
def bonito(i): i = limpio(i); return ' '.join(i[k:k + 4] for k in range(0, len(i), 4))

ya = {(c['titular_tipo'], c['titular_id'], limpio(c['iban'])) for c in base.leer('cuentas_bancarias?select=titular_tipo,titular_id,iban&order=id')}
vigente = {(t, i) for t, i, _ in ya}
F = base.leer('revision_firmadas?select=numero_hoja,fecha_firma,pagador_tipo,pagador_iban,comunidad_id,contrata_id,'
              'opp:oportunidad_id(comunidad_id)&order=fecha_firma.desc')
de_hoja = {}                                                  # (tipo, id, iban) -> hoja mas reciente
for f in F:
    t, i = (('comunidad', f['comunidad_id'] or f['opp']['comunidad_id']) if f['pagador_tipo'] == 'comunidad'
            else ('contrata', f['contrata_id']) if f['pagador_tipo'] == 'empresa' else (None, None))
    if t and i and valido(f['pagador_iban']): de_hoja.setdefault((t, i, limpio(f['pagador_iban'])), (f['numero_hoja'], f['fecha_firma']))

# Fuera (8-oct): la cuenta de la hoja no es de ESA comunidad (la del garaje de Portugal 23; la del 17 en la
# comunidad 'Principes de España 17 y 19'). Mismo criterio que grupo1_comunidades.py.
NO_TOCAR = {'AV PORTUGAL 23 LEGANES', 'AV LOS PRINCIPES DE ESPAÑA 17 Y 19 COSLADA', 'SALAMANCA 1-3-5-7 Y EMPECINADO 23 MOSTOLES'}
nombre_com = {c['id']: re.sub(r'^CP\s+', '', c['nombre'] or '') for c in base.leer('comunidades?select=id,nombre&order=id')}   # (9-oct) sin el 'CP ' delante
de_hoja = {k: v for k, v in de_hoja.items() if not (k[0] == 'comunidad' and nombre_com.get(k[1]) in NO_TOCAR)}
nuevas, malas = [], []
for c in []:   # (8-oct, tarde) comunidades.iban ya no existe; las cuentas nuevas salen de las hojas (abajo)
    k = ('comunidad', c['id'], limpio(c['iban']))
    if k in ya: continue
    if not valido(c['iban']): malas.append((c['nombre'], c['iban'])); continue
    h = de_hoja.get(k)
    nuevas.append({'titular_tipo': 'comunidad', 'titular_id': c['id'], 'iban': bonito(c['iban']), 'vigente': True,
                   'origen': f'hoja {h[0]}' if h else 'ficha de la comunidad', 'notas': None})
    ya.add(k); vigente.add(k[:2])
for (t, i, iban), (hoja, fecha) in sorted(de_hoja.items(), key=lambda x: x[1][1] or '', reverse=True):
    if (t, i, iban) in ya: continue
    nuevas.append({'titular_tipo': t, 'titular_id': i, 'iban': bonito(iban), 'vigente': (t, i) not in vigente,
                   'origen': f'hoja {hoja}', 'notas': None if (t, i) not in vigente else f'Cuenta que traia la hoja {hoja} (firmada {fecha}); hoy hay otra vigente.'})
    ya.add((t, i, iban)); vigente.add((t, i))

n = collections.Counter((x['titular_tipo'], 'vigente' if x['vigente'] else 'historica', x['origen'].split()[0]) for x in nuevas)
for k, v in sorted(n.items()): print(f'{v:5d}', k)
print('IBAN de fichas de comunidad que NO cumplen el control (no entran):', len(malas))
for m in malas[:15]: print('   ', m)
if not ESCRIBIR: sys.exit('PRUEBA: no se ha escrito nada')
base.insertar('cuentas_bancarias', nuevas)
print('ESCRITO', len(nuevas))
