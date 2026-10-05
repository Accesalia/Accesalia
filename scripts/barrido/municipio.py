import os, sys, datetime
from urllib.parse import quote
sys.path.insert(0, 'scripts')
from leer_fichas import PROVINCIA, fichas_de, texto_del_docx
from produccion import arrancar
muni = sys.argv[1]
b = arrancar()
d = os.path.join(PROVINCIA, muni)
coms = b.leer("comunidades?select=id,nombre,referencia_catastral&municipio=eq.%s" % quote(muni))
print('### PRODUCCION: %d comunidades en %s' % (len(coms), muni))
for c in coms:
    ops = b.leer('oportunidades?select=id,codigo,estado,fecha_apertura,quien_lo_trae,puesto_id,persona_comunidad_id,origen_notas,tipos:oportunidad_tipos(count),vivos:relacion_oportunidad_accesos(count)&comunidad_id=eq.' + c['id'])
    for o in ops:
        nn = len(b.leer('notas_oportunidad?select=id&oportunidad_id=eq.' + o['id']))
        print('  %-45s | opp %s %s ap=%s notas=%d tipos=%d accesos=%d trajo=%s contacto=%s' % (c['nombre'][:45], o['id'][:8], o['estado'], o['fecha_apertura'], nn, o['tipos'][0]['count'], o['vivos'][0]['count'], bool(o['quien_lo_trae']), bool(o['puesto_id'] or o['persona_comunidad_id'])))
    if not ops: print('  %-45s | SIN OPP' % c['nombre'][:45])
cl = b.leer("comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una?select=carpeta&municipio=eq.%s" % quote(muni))
print('### CLON:', [x['carpeta'] for x in cl])
solo = sys.argv[2:]
for carp in sorted(os.listdir(d)):
    if solo and carp not in solo: continue
    c = os.path.join(d, carp)
    if not os.path.isdir(c): continue
    fs = []
    for raiz, _, f in os.walk(c):
        for x in f:
            p = os.path.join(raiz, x)
            try: fs.append((datetime.datetime.fromtimestamp(os.path.getmtime(p)).date(), os.path.relpath(p, c)))
            except OSError: pass
    fs.sort()
    print('\n' + '=' * 30, carp, '| %d ficheros | primero %s %s | ultimo %s' % (len(fs), fs[0][0] if fs else '-', fs[0][1][:50] if fs else '', fs[-1][0] if fs else '-'))
    for r in fichas_de(c):
        print('---', os.path.relpath(r, d))
        for i, l in enumerate(texto_del_docx(r)):
            if l.strip(): sys.stdout.write('%3d| %s\n' % (i, l[:230]))
