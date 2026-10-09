# -*- coding: utf-8 -*-
"""Alta en la agenda de quien nos trajo cada opp y aun no estaba (Monica, 9-oct-2026).

"Ivan y Beatriz los creamos en agenda con su puesto de administradores o gestores de fincas en Marcal, y les
ponemos como quien lo trajo; y lo mismo con quien salga en las fichas." Sale de quien_lo_trajo_final.jsonl:
las opps con persona identificada (nombre en la ficha o en un correo) que no estaba en la agenda.

Cada persona, UNA vez (mismo nombre en la misma empresa = la misma). Su puesto, donde la ficha dice:
  - una administracion (empresa) o una contrata de las que ya tenemos -> ahi;
  - la propia comunidad (vecino, presidente) -> su figura legal, si la tiene;
  - si no se sabe donde, la persona sin puesto (se permite).

  python scripts/barrido/quien_lo_trajo_altas.py            -> marcha en seco
  python scripts/barrido/quien_lo_trajo_altas.py --escribir
"""
import sys, os, re, json, unicodedata, collections, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, '..'))
sys.path.insert(0, AQUI)
from produccion import arrancar  # noqa: E402
from presidentes_a_la_agenda import partir_nombre, alta  # noqa: E402

b = arrancar()
FINAL = os.path.join(AQUI, 'quien_lo_trajo_final.jsonl')
PRIMERA = os.path.join(AQUI, 'quien_lo_trajo_primera_lectura.json')
EMAIL = re.compile(r'[\w.+-]+@[\w-]+\.[\w.]+')


def k(s):
    s = unicodedata.normalize('NFD', str(s or '').upper().replace('&', ' Y ')); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^A-Z0-9]', '', s)


def main():
    escribir = '--escribir' in sys.argv
    fs = [json.loads(l) for l in open(FINAL, encoding='utf-8') if l.strip()]
    tipo = {r['codigo']: r.get('tipo') for r in json.load(open(PRIMERA, encoding='utf-8'))}
    ops = {o['codigo']: o for o in b.leer('oportunidades?select=id,codigo,comunidad_id,quien_lo_trae,comunidades(nombre)'
                                          '&estado=eq.abierta&fecha_apertura=gte.2025-01-01')}
    figuras = {f['id_comodin'] for f in b.leer('figura_legal_propietaria?select=id_comodin')}
    empresas = [(k(e['nombre_accesalia']), e['id'], e['nombre_accesalia']) for e in b.leer('empresa?select=id,nombre_accesalia') if e['nombre_accesalia']]
    contratas = [(k(c['nombre']), c['id'], c['nombre']) for c in b.leer('contratas?select=id,nombre') if c['nombre']]
    admin_de = {}
    for r in b.leer('comunidad_admin_responsable?select=comunidad_id,empresa_id&vigente=is.true'):
        if r.get('empresa_id'): admin_de[r['comunidad_id']] = r['empresa_id']

    def donde(f, o):
        e = k(f.get('empresa'))
        t = tipo.get(f['codigo'])
        if t in ('vecino', 'presidente') or e.startswith('CP') or 'CDAD' in e:
            return ('comunidad', o['comunidad_id'], (o.get('comunidades') or {}).get('nombre')) if o['comunidad_id'] in figuras else (None, None, None)
        if not e: return (None, None, None)
        e2 = re.sub(r'(SL|SLP|SA|SCP|SLU)$', '', e)
        for lista, cual in ((empresas, 'empresa'), (contratas, 'contrata')):
            c = [x for x in lista if re.sub(r'(SL|SLP|SA|SCP|SLU)$', '', x[0]) == e2]
            if not c:
                c = [x for x in lista if x[0] and (x[0] in e or e in x[0]) and min(len(x[0]), len(e)) >= 6]
            if len(c) > 1:  # varias sedes (MARCAL ASESORES (LEGANES)...): la que administra esa comunidad, si es una de ellas
                c = [x for x in c if x[1] == admin_de.get(o['comunidad_id'])] or ([x for x in c if 'LEGANES' in x[0]] if cual == 'empresa' else c)
            if len(c) == 1: return (cual, c[0][1], c[0][2])
        return (None, None, None)

    # Quien ya esta en la agenda en esa empresa/contrata, por su primer nombre: si coincide, NO se crea otro
    # (seria un duplicado, p.ej. "Javier" de Del Brio, que ya tiene dos Javier): queda pendiente.
    ya_hay = collections.defaultdict(set)
    for p in b.leer('puesto?select=empresa_id,contrata_id,persona(nombre)'):
        n1 = k((p.get('persona') or {}).get('nombre', '').split(' ')[0] if p.get('persona') else '')
        if p.get('empresa_id'): ya_hay[('empresa', p['empresa_id'])].add(n1)
        if p.get('contrata_id'): ya_hay[('contrata', p['contrata_id'])].add(n1)
    altas, sin_sitio, dudosas = {}, collections.Counter(), []
    for f in fs:
        o = ops.get(f['codigo'])
        if not o or not f.get('quien') or f.get('agenda_persona_id') or f['regla'] == '3_jefe_empresa' or o['quien_lo_trae']: continue
        cual, did, dnom = donde(f, o)
        if cual in ('empresa', 'contrata') and k(f['quien'].split(' ')[0]) in ya_hay[(cual, did)]:
            dudosas.append((f['codigo'], f['quien'], dnom)); continue
        nombre = re.sub(r'\s*\(.*?\)\s*', ' ', f['quien']).strip()
        mails = [m.lower() for m in EMAIL.findall(f.get('evidencia') or '')]
        ya = next((c_ for c_, a_ in altas.items() if mails and a_['emails'] & set(mails)), None)
        clave = ya or ((k(nombre), cual, did) if cual else (k(nombre), 'opp', o['id']))
        a = altas.setdefault(clave, {'nombre': nombre, 'donde': (cual, did, dnom), 'tipo': tipo.get(f['codigo']), 'opps': [], 'emails': set(),
                                     'comunidad': (o.get('comunidades') or {}).get('nombre')})
        if len(nombre) > len(a['nombre']): a['nombre'] = nombre
        if cual and not a['donde'][0]: a['donde'] = (cual, did, dnom)
        a['opps'].append(o['id'])
        for m in EMAIL.findall(f.get('evidencia') or ''): a['emails'].add(m.lower())
        if not cual: sin_sitio[f.get('empresa') or '(ninguna)'] += 1
    c = collections.Counter(a['donde'][0] or 'sin puesto' for a in altas.values())
    print('personas nuevas: %d para %d opps -> %s' % (len(altas), sum(len(a['opps']) for a in altas.values()), dict(c)))
    print('sin sitio (persona sin puesto), por lo que decia la ficha:', dict(sin_sitio.most_common(15)))
    print('NO se crean (ya hay alguien con ese nombre en esa empresa; pendiente):', dudosas)
    for a in sorted(altas.values(), key=lambda x: -len(x['opps']))[:12]:
        print('   %-28s %-10s %-40s opps=%d %s' % (a['nombre'][:28], a['donde'][0], (a['donde'][2] or '')[:40], len(a['opps']), ','.join(a['emails'])))
    if not escribir: print('\n(marcha en seco)'); return

    n = 0
    for a in altas.values():
        nom, ape = partir_nombre(a['nombre'])
        per = alta('persona', {'nombre': nom, 'apellidos': ape, 'activa': True,
                               'notas': 'Alta 9-oct-2026: quien nos trajo %d opp(s) (%s), segun su ficha de Dropbox o su correo.' % (len(a['opps']), a['comunidad'] or '')})
        cual, did, _ = a['donde']
        pu = None
        if cual:
            cargo = {'empresa': 'administrador de fincas', 'contrata': None,
                     'comunidad': a['tipo'] if a['tipo'] in ('vecino', 'presidente') else 'otro'}[cual]
            pu = alta('puesto', {'persona_id': per['id'], 'cargo': cargo,
                                 ('empresa_id' if cual == 'empresa' else 'contrata_id' if cual == 'contrata' else 'figura_legal_propietaria_id'): did})
        for m in a['emails']:
            alta('correo', {'persona_id': per['id'] if not pu else None, 'puesto_id': pu['id'] if pu else None, 'email': m,
                            'principal': True, 'etiqueta': 'general' if pu else 'personal'})
        for oid in a['opps']:
            b.actualizar('oportunidades?id=eq.%s&quien_lo_trae=is.null' % oid, {'quien_lo_trae': per['id'], 'quien_persona_comunidad_id': None}); n += 1
    print('altas: %d personas | opps con quien lo trajo: %d' % (len(altas), n))


if __name__ == '__main__':
    main()
