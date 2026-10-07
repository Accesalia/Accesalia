# -*- coding: utf-8 -*-
"""Las 47 dudosas de Catastro (opps 2025-2026 salidas de la clon), RESUELTAS a mano por Monica (7-oct-2026)
en Descargas/opps_dudosas_catastro_47.csv, columna "Resuelta". Lo que ella escribe:
  - una referencia catastral (14 caracteres; si pega la de un inmueble, vale su parcela) -> esa parcela;
  - "la opp son ambos accesos" -> TODAS las parcelas que daba Catastro en ese numero;
  - un tipo de via (CL, AV, CM...) o la via entera ("AV PORTUGAL DE", "DEL") -> esa calle; se vuelve a pedir el numero a Catastro;
  - cambio de municipio ("es de san sebastian de los reyes") -> se busca en el callejero de ese municipio
    y se corrige el "(MUNICIPIO)" de comunidad_provisional;
  - "inviable ... cerrar" -> la opp se cierra como perdida, con su frase como motivo.
Los portales que se enlazan de cada parcela: los del numero de la carpeta (y su escalera, si la carpeta la dice);
si la parcela no tiene ese numero, todos sus portales (y se dice).
Usa las piezas de catastro_opps_2025_2026.py (mismo bajar ficha, mismos accesos).
  python scripts/barrido/catastro_dudosas_resueltas.py              -> marcha en seco: solo LEE Catastro y dice que haria
  python scripts/barrido/catastro_dudosas_resueltas.py --escribir
"""
import sys, os, re, csv, json, time, urllib.parse
AQUI = os.path.dirname(os.path.abspath(__file__))
import types
K = types.ModuleType('K')   # las piezas de catastro_opps_2025_2026.py, sin su ultima linea (que despacha consultar/escribir)
_src = open(os.path.join(AQUI, 'catastro_opps_2025_2026.py'), encoding='utf-8').read()
K.__dict__['__file__'] = os.path.join(AQUI, 'catastro_opps_2025_2026.py')
exec(compile(_src[:_src.rindex("\n{'consultar'")], 'catastro_opps_2025_2026.py', 'exec'), K.__dict__)
ESCRIBIR = '--escribir' in sys.argv
b = K.b
CSV = os.path.join(os.path.expanduser('~'), 'Downloads', 'opps_dudosas_catastro_47.csv')
SALIDA = os.path.join(AQUI, 'catastro_dudosas_resueltas.json')
REF = re.compile(r'(\d{7}[A-Z]{2}\d{4}[A-Z])')
APARTE = {'DAN-2025-321': 'Europa 22 Alcorcon: hay TRES opps del mismo edificio; se pregunta antes de tocar'}
# las 8 que siguieron en duda: propuesta tras mirar Catastro (pendiente de su OK). Sin "bis" en la carpeta -> la parcela del numero
# sin letra; con "bis" -> la (B); el tipo de via que ella marco no tiene ese numero y el otro si -> el otro.
PROPUESTA = {'DAN-2025-198': '2190603VK3528N (PZ VALDESERRANO 3: en CM no existe el numero)',
             'DAN-2026-167': '2771205VK4727B (CL CANILLAS 11: en CR no existe el numero)',
             'DAN-2025-128': '3510721VK4731B (la carpeta dice 65bis: CL CARLOS MARTIN ALVAREZ 65(B))',
             'CAR-2025-013': '8030321VK4783A (CL GALLO 22, no el 22(B))',
             'DAN-2025-385': '9993229VK3799D (CL SANCHEZ PRECIADO 38, no el 38(B))',
             'DAN-2025-157': '6345401VK2664N (AV PORTUGAL DE 46, no el 46(D))',
             'DAN-2025-263': '6346602VK2664N (CL CARCAVILLA 1, no el 1(D))',
             'DAN-2025-137': '8259209VK4785G (Monica: mal escrita, es avenida de Canillejas a Vicalvaro 68)'}
MUNI = {'ALV-2026-175': 'SAN SEBASTIAN DE LOS REYES', 'DAN-2025-043': 'LEGANES'}


def leer_csv():
    filas = list(csv.reader(open(CSV, encoding='cp1252', errors='replace'), delimiter=','))
    fs = [dict(codigo=r[0].strip(), carpeta=r[1].strip(), municipio=r[2].strip(), opciones=r[4].strip(), resuelta=r[5].strip()) for r in filas[1:] if r and r[0].strip()]
    for f in fs:
        if f['codigo'] in PROPUESTA: f['resuelta'] = '%s; Catastro: %s' % (f['resuelta'], PROPUESTA[f['codigo']])
    return fs


def portales_de(parcela):
    """solo LEE: los portales (numero, escalera, via) de una parcela, como los agrupa guardar_ficha."""
    d = json.loads(K.pedir(K.OVC + '/Consulta_DNPRC?RefCat=%s&Provincia=&Municipio=' % parcela)).get('consulta_dnprcResult') or {}
    fincas = K.lista((d.get('lrcdnp') or {}).get('rcdnp')) or K.lista((d.get('bico') or {}).get('bi'))
    return sorted({(K.sitio(f)['tipo_via'], K.sitio(f)['nombre_via'], K.sitio(f)['numero'], K.sitio(f)['escalera']) for f in fincas})


def elegir(portales, numeros, esc, suf):
    if suf and [p for p in portales if p[2] in ['%s(%s)' % (n, suf) for n in numeros]]:   # 342c -> 342(C); 1bis -> 1(B)
        return [p for p in portales if p[2] in ['%s(%s)' % (n, suf) for n in numeros]], ''
    del_num = [p for p in portales if p[2] in numeros]
    if esc and [p for p in del_num if p[3] == esc]: del_num = [p for p in del_num if p[3] == esc]
    return (del_num, '') if del_num else (portales, 'la parcela no tiene el numero %s: TODOS sus portales' % '/'.join(numeros))


def numeros_de(carpeta):
    m = re.match(r'^([^\d]+?)\s*(\d+)(.*)$', carpeta)
    if not m: return None, [], '', ''
    resto = m.group(3).split(chr(92))[0]
    esc = re.search(r'esc([a-z0-9])\b', resto, re.I)
    suf = re.match(r'^\s*(bis|[a-z])(?![a-z])', resto, re.I)
    suf = ('B' if suf.group(1).lower() == 'bis' else suf.group(1).upper()) if suf else ''
    return m.group(1), [m.group(2)] + re.findall(r'\d+', re.sub(r'esc\w*', '', resto, flags=re.I)), (esc.group(1).upper() if esc else ''), suf


def resolver(f, o, munis):
    r = {'codigo': f['codigo'], 'carpeta': f['carpeta'], 'resuelta': f['resuelta'], 'opp': o['id']}
    t = f['resuelta']; tl = t.lower()
    if f['codigo'] in APARTE: r['accion'] = 'aparte'; r['motivo'] = APARTE[f['codigo']]; return r
    if 'inviable' in tl: r['accion'] = 'cerrar'; return r
    letras, numeros, esc, suf = numeros_de(f['carpeta'])
    muni = MUNI.get(f['codigo'], f['municipio'])
    if muni != f['municipio']: r['municipio_nuevo'] = muni
    refs = REF.findall(t.upper())
    if refs:
        parcelas = [x[:14] for x in refs]
    elif 'ambos' in tl:
        parcelas = [x.strip() for x in f['opciones'].split('|') if x.strip()]
    else:
        M = munis[muni]
        if f['opciones'] and not r.get('municipio_nuevo'):
            ops = [x.strip() for x in f['opciones'].split('|')]
            a = ' '.join(t.upper().split())
            c = [x for x in ops if x == a] or [x for x in ops if x.split()[0] == a] or [x for x in ops if x.split()[-1] == a]
            if len(c) != 1: r['accion'] = 'duda'; r['motivo'] = 'no se cual de %s es "%s"' % (ops, t); return r
            tipo, busq = c[0].split(' ', 1)
        else:
            cand = K.candidatas(M['id'], letras)
            if len(cand) != 1: r['accion'] = 'duda'; r['motivo'] = '%d calles en %s para "%s"' % (len(cand), muni, letras); return r
            tipo, busq = cand[0]['tipo_via'], cand[0]['busqueda']
        r['calle'] = '%s %s' % (tipo, busq)
        q = urllib.parse.urlencode({'Provincia': M['provincia'], 'Municipio': M['nombre'], 'Sigla': tipo, 'Calle': busq, 'Numero': numeros[0],
                                    'Bloque': '', 'Escalera': '', 'Planta': '', 'Puerta': ''})
        d = json.loads(K.pedir(K.OVC + '/Consulta_DNPLOC?' + q)).get('consulta_dnplocResult') or {}
        fincas = K.lista((d.get('lrcdnp') or {}).get('rcdnp')) or K.lista((d.get('bico') or {}).get('bi'))
        parcelas = sorted({K.parcela_de(x) for x in fincas if K.parcela_de(x)})
        if len(parcelas) != 1:
            r['accion'] = 'duda'; r['motivo'] = '%s %s: %s' % (r['calle'], numeros[0], '%d parcelas %s' % (len(parcelas), parcelas) if parcelas else 'Catastro no encuentra el numero')
            return r
    r['accion'] = 'enlazar'; r['parcelas'] = {}
    for p in parcelas:
        ps, aviso = elegir(portales_de(p), numeros, esc, suf)
        r['parcelas'][p] = {'portales': ['%s %s %s%s' % (x[0], x[1], x[2], ' esc ' + x[3] if x[3] else '') for x in ps], 'aviso': aviso,
                            'numeros': sorted({x[2] for x in ps}), 'escaleras': sorted({x[3] for x in ps})}
    return r


def escribir_una(r):
    oid = r['opp']
    if r['accion'] == 'cerrar':
        b.actualizar('oportunidades?id=eq.' + oid, {'estado': 'cerrada'})
        b.insertar('motivo_cierre_oportunidad', [{'oportunidad_id': oid, 'resultado_final': 'perdido', 'motivo_perdido': r['resuelta'][:500],
                                                  'notas': 'Cerrada como perdida al revisar las dudosas de Catastro (Monica, 7-oct-2026): ' + r['resuelta']}])
        return
    if r.get('municipio_nuevo'):
        o = b.leer('oportunidades?select=comunidad_provisional&id=eq.' + oid)[0]
        b.actualizar('oportunidades?id=eq.' + oid, {'comunidad_provisional': re.sub(r'\([^()]*\)$', '(%s)' % r['municipio_nuevo'], o['comunidad_provisional'])})
    for p, info in r['parcelas'].items():
        muni, portales = K.guardar_ficha(p)
        for x in portales:
            if x['numero'] not in info['numeros'] or (x['escalera'] or '') not in info['escaleras']: continue
            acc = K.upsert('accesos', [{'municipio': muni, 'tipo_via': x['tipo_via'] or '', 'nombre_via': x['nombre_via'] or '', 'numero': x['numero'],
                                        'escalera': x['escalera'] or '', 'ref_catastral': p, 'ficha_catastro_portal_id': x['id']}],
                           'municipio,tipo_via,nombre_via,numero,escalera')[0]
            if not b.leer('relacion_oportunidad_accesos?select=opp_id&opp_id=eq.%s&acceso_id=eq.%s' % (oid, acc['id'])):
                b.insertar('relacion_oportunidad_accesos', [{'opp_id': oid, 'acceso_id': acc['id'],
                            'de_donde': 'Enlazada a Catastro desde la carpeta "%s"; dudosa resuelta por Monica (7-oct-2026): %s' % (r['carpeta'], r['resuelta'])}])
    b.actualizar('oportunidades?id=eq.' + oid, {'referencia_catastral': list(r['parcelas'])[0]})


def main():
    filas = leer_csv()
    ops = {o['codigo']: o for o in b.leer('oportunidades?select=id,codigo,comunidad_provisional&codigo=in.(%s)' % ','.join(f['codigo'] for f in filas))}
    munis = {m['nombre']: m for m in b.leer('municipios_catastro?select=id,nombre,provincia')}
    res = json.load(open(SALIDA, encoding='utf-8')) if os.path.exists(SALIDA) else {}
    for k, f in enumerate(filas):
        if f['codigo'] in res and res[f['codigo']].get('hecha'): continue
        if k and k % K.BLOQUE == 0: print('  ... pausa %d s' % K.PAUSA_BLOQUE); time.sleep(K.PAUSA_BLOQUE)
        if f['codigo'] not in res or res[f['codigo']]['resuelta'] != f['resuelta']:
            res[f['codigo']] = resolver(f, ops[f['codigo']], munis)
            json.dump(res, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
        r = res[f['codigo']]
        if r['accion'] == 'enlazar':
            det = ' + '.join('%s [%s]%s' % (p, ', '.join(i['portales']), ' (' + i['aviso'] + ')' if i['aviso'] else '') for p, i in r['parcelas'].items())
            print('%-13s %-28s ENLAZAR %s%s' % (r['codigo'], r['carpeta'][:28], det, ' | municipio -> ' + r['municipio_nuevo'] if r.get('municipio_nuevo') else ''))
        else:
            print('%-13s %-28s %s %s' % (r['codigo'], r['carpeta'][:28], r['accion'].upper(), r.get('motivo', r['resuelta'])))
        if ESCRIBIR and r['accion'] in ('enlazar', 'cerrar'):
            escribir_una(r); r['hecha'] = True
            json.dump(res, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    from collections import Counter
    print(Counter(r['accion'] for r in res.values()))
    if not ESCRIBIR: print('*** MARCHA EN SECO ***')


main()
