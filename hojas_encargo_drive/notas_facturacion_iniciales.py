# LA PRIMERA NOTA DE FACTURACION de cada hoja firmada (Monica, 8-oct-2026): "un resumen compacto de que se
# ha firmado, que se cobra y como". Se escribe sola desde lo que ya esta en la app (lineas de facturacion,
# plazos, pagadores, codigos) y lo que se dijo al releer el papel (tabla de trabajo). Origen 'lectura_hoja'.
# Reanudable: no repite en las hojas que ya tienen su nota de lectura.
#   python notas_facturacion_iniciales.py [--escribir] [--ver HE-2026-0781 ...]
import sys, re, collections
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base
ESCRIBIR = '--escribir' in sys.argv
VER = [a for a in sys.argv[1:] if a.startswith('HE-')]

def eur(x):
    x = float(x); s = f'{x:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    return (s[:-3] if s.endswith(',00') else s) + ' €'
def fecha(f): return '-'.join(reversed(f.split('-'))) if f else '?'
def pct(x): return f'{float(x):g}'.replace('.', ',') + ' %'
def concepto(d):
    d = (d or '').strip(); d = d.split(' (')[0] if len(d.split(' (')[0]) >= 12 else d
    return d if len(d) <= 80 else d[:80].rsplit(' ', 1)[0] + '…'
HITO = {'firma': 'a la firma', 'encargo': 'al encargo', 'entrega': 'a la entrega', 'licencia': 'a la licencia',
        'cfo': 'al fin de obra', 'concesion': 'a la concesión', 'otro': None}
FORMA = {'cargo_cuenta': 'cargo en cuenta', 'transferencia': 'transferencia', 'confirming': 'confirming'}

nombre = {}
for c in base.leer('comunidades?select=id,nombre,razon_social'): nombre[('comunidad', c['id'])] = c['razon_social'] or f"la comunidad ({c['nombre']})"
for c in base.leer('contratas?select=id,nombre,razon_social'): nombre[('contrata', c['id'])] = c['razon_social'] or c['nombre']
for e in base.leer('empresas_propietarias?select=id,nombre_legal,nombre_accesalia'): nombre[('empresa_propietaria', e['id'])] = e['nombre_legal'] or e['nombre_accesalia']
for p in base.leer('persona?select=id,nombre,apellidos'): nombre[('persona', p['id'])] = ' '.join(x for x in (p['nombre'], p['apellidos']) if x)
cuenta = {}
for c in base.leer('cuentas_bancarias?vigente=is.true&select=titular_tipo,titular_id,iban'): cuenta[(c['titular_tipo'], c['titular_id'])] = c['iban']

H = {h['id']: h for h in base.leer('hojas_encargo?estado=eq.devuelta_firmada&select=id,numero_hoja,fecha_firma,fecha_creacion,descripcion,version_firmada_id')}
L = collections.defaultdict(list)
for l in base.leer('lineas_facturacion?select=*'): L[l['hoja_encargo_id']].append(l)
P = collections.defaultdict(list)
for p in base.leer('hitos_cobro?select=linea_facturacion_id,hito,orden,porcentaje,importe,notas&order=orden'): P[p['linea_facturacion_id']].append(p)
C = collections.defaultdict(list)
for c in base.leer('codigos_cliente_linea?select=linea_facturacion_id,etiqueta,valor&order=orden'): C[c['linea_facturacion_id']].append(c)
INC = collections.defaultdict(list)
for c in base.leer('conceptos_hoja?desglose=eq.incluido&select=version_hoja_id,descripcion,bloque:bloque_id(nombre_corto,codigo)'):
    INC[c['version_hoja_id']].append((c['bloque'] or {}).get('nombre_corto') or (c['bloque'] or {}).get('codigo') or c['descripcion'])
R = {f['hoja_encargo_id']: f for f in base.leer('revision_firmadas?select=hoja_encargo_id,nota,fecha_emision')}
ya = {n['hoja_encargo_id'] for n in base.leer('notas_facturacion?origen=eq.lectura_hoja&select=hoja_encargo_id')}

# De lo dicho al releer (Monica y la lectura) solo pasa a facturacion lo que toca al cobro
CLAVE = re.compile(r'COBR|PAG[OAÓ]|FACTUR|ABONAD|NEGOCI|DEVOLV|DEVUEL|IBAN|CUENTA|PEDIDO|GRATIS|PAUSA|PENDIENTE|CERRAD', re.I)
def de_la_revision(nota):
    out = []
    for s in (nota or '').split('\n'):
        s = s.strip()
        if s.startswith(('Lectura:', 'Fecha de', 'Total:', 'Pagador:', 'Total sumado', 'Firma digital', 'Empresa:')): continue
        if 'PREGUNTADO' in s or 'PENDIENTE DE MONICA' in s: continue      # dudas ya resueltas
        if s.startswith('Abonado:') or ('Monica' in s and CLAVE.search(s)):
            out.append(re.sub(r'\s*\(Monica, 8-oct\)', '', s).replace('Abonado: Abonados :', 'Abonado:').strip())
    return out

def plazo_txt(p):
    q = HITO.get(p['hito'])
    cuanto = pct(p['porcentaje']) if p['porcentaje'] is not None else (eur(p['importe']) if p['importe'] is not None else '')
    return f"{cuanto} {q}".strip() if q else (p['notas'] or cuanto or 'otro').strip()

notas = []
for hid, h in H.items():
    if hid in ya: continue
    ls = L.get(hid, [])
    pags = list(dict.fromkeys((l['pagador_tipo'], l['pagador_id']) for l in ls if l['pagador_tipo']))
    rev = R.get(hid, {})
    lineas = [f"Firmada el {fecha(h['fecha_firma'])}" + (f" (emitida el {fecha(rev.get('fecha_emision'))})" if rev.get('fecha_emision') else '') + '.']
    for pg in pags:
        mias = [l for l in ls if (l['pagador_tipo'], l['pagador_id']) == pg]
        fc = {FORMA.get(l['forma_cobro']) for l in mias if l['forma_cobro']}
        cta = cuenta.get(pg)
        cab = f"Factura a {nombre.get(pg, pg[0])}" + (f" · {', '.join(sorted(fc))}" if fc else '') + (f" · cuenta {cta}" if cta and 'cargo en cuenta' in fc else '') + ':'
        lineas.append(cab)
        def linea(l, sangria):
            q = []
            if l['importe'] is not None: q.append(eur(l['importe']))
            if l['porcentaje'] is not None: q.append(f"{pct(l['porcentaje'])} de lo concedido")
            cod = ', '.join(f"{c['etiqueta']} {c['valor']}" for c in C.get(l['id'], []))
            return f"{sangria}· {concepto(l['descripcion'])}: {' + '.join(q) or 'sin importe'}" + (f" — códigos: {cod}" if cod else '')
        # las lineas que se cobran igual van juntas, con sus plazos dichos una vez
        grupos = collections.OrderedDict()
        for l in mias: grupos.setdefault('; '.join(plazo_txt(p) for p in P.get(l['id'], [])), []).append(l)
        for plz, g in grupos.items():
            if len(g) == 1:
                lineas.append(linea(g[0], '  ') + (f" — {plz}" if plz else ' — plazos sin definir en la hoja'))
            else:
                lineas.append(f"  Se cobran {plz}:" if plz else '  Sin plazos definidos en la hoja:')
                lineas += [linea(l, '    ') for l in g]
    if not ls: lineas.append('No hay nada que facturar en esta hoja.')
    inc = sorted(set(INC.get(h['version_firmada_id'], [])))
    if inc: lineas.append('Incluido sin cobrar aparte: ' + ', '.join(inc) + '.')
    lineas += de_la_revision(rev.get('nota'))
    texto = '\n'.join(lineas)
    notas.append({'hoja_encargo_id': hid, 'fecha': h['fecha_firma'], 'texto': texto, 'autor': 'Claude (relectura de la hoja firmada)',
                  'origen': 'lectura_hoja', '_cod': h['numero_hoja']})

for n in notas:
    if n['_cod'] in VER: print(f"\n===== {n['_cod']}\n{n['texto']}")
print('\nnotas a escribir:', len(notas))
if not ESCRIBIR: sys.exit('PRUEBA: no se ha escrito nada')
base.insertar('notas_facturacion', [{k: v for k, v in n.items() if k != '_cod'} for n in notas])
print('ESCRITO', len(notas))
