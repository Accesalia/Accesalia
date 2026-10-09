# -*- coding: utf-8 -*-
"""Comunidad para las oportunidades CERRADAS que no la tienen (Monica, 9-oct-2026).

"Las cerradas: daremos la comunidad_id generando el nombre de la direccion. La ficha [de Catastro] ya se bajara el
dia que se quiera buscar, ahora no es necesario." Encargo cerrado = salida simple: solo el nombre y el municipio.

El nombre, con el estilo de la lista de comunidades ("LOPEZ DE HOYOS 163 MADRID", "AV ALBUFERA 250 MADRID",
"PLAZA DE LA FLOR 6 LEGANES": la calle sin tipo, los demas tipos delante). La carpeta va PEGADA ("eusebiomoran10"),
asi que se despega con, por orden:
  1. el TEXTO DE ORIGEN, si empieza por esa misma direccion bien escrita ("SANGENJO 19-21-23 MADRID. Carpeta...");
  2. el CALLEJERO guardado, con las reglas del script de Catastro (carpeta sin tipo = calle);
  3. si nada casa, no se inventa: queda en la lista de dudosas.
Si ya hay una comunidad con ese nombre (sin tildes ni mayusculas), la opp se engancha a ella: no se duplica.

  python scripts/barrido/comunidades_de_cerradas.py            -> marcha en seco, deja comunidades_de_cerradas.json
  python scripts/barrido/comunidades_de_cerradas.py --escribir -> crea las comunidades y engancha las opps
"""
import sys, os, re, json, unicodedata
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import catastro_opps_abiertas as cat  # noqa: E402  (callejero, variantes, alias de municipio)

b = cat.b
SALIDA = os.path.join(AQUI, 'comunidades_de_cerradas.json')
TIPO_NOMBRE = {'CL': '', 'AV': 'AV', 'PZ': 'PLAZA', 'PS': 'PASEO', 'CM': 'CAMINO', 'TR': 'TRAVESIA', 'UR': 'URB',
               'GL': 'GLORIETA', 'RD': 'RONDA', 'CR': 'CARRETERA', 'PJ': 'PASAJE', 'CJ': 'CALLEJON', 'CO': 'COLONIA'}
PREFIJOS_TEXTO = r'^(calle|c/|cl\.?|carpeta)\s+'


def sin_tildes(s):
    """Quita las tildes pero NO la eñe: la lista de comunidades escribe NUÑO, PEÑALARA."""
    s = str(s).replace('ñ', '').replace('Ñ', '')
    s = unicodedata.normalize('NFD', s); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return s.replace('', 'ñ').replace('', 'Ñ')


def clave(s):
    return re.sub(r'[^A-Z0-9]', '', sin_tildes(s).upper())


def partir(o):
    m = re.match(r'^(.*?) \(([^()]*)\)$', o['comunidad_provisional'] or '')
    carpeta, muni = (m.group(1), m.group(2)) if m else (o['comunidad_provisional'] or '', '')
    carpeta = re.sub(r'\s*\(.*?\)\s*', '', carpeta).strip()
    mm = re.match(r'^([^\d]+?)\s*(\d.*)$', carpeta)
    return carpeta, muni, (mm.group(1) if mm else carpeta), (mm.group(2) if mm else '')


def numeros_limpios(resto):
    """'19-21-23' -> '19-21-23'; '5bis' -> '5 BIS'; corta en la subcarpeta y en lo que no es numero de portal."""
    r = resto.split(chr(92))[0]
    m = re.match(r'^(\d+(?:\s*[-y]\s*\d+)*)\s*(bis|[a-z])?\b', r, re.I)
    if not m: return ''
    n = re.sub(r'\s*y\s*', '-', re.sub(r'\s*-\s*', '-', m.group(1)))
    return n + (' ' + m.group(2).upper() if m.group(2) else '')


def articulo_delante(via):
    """Catastro pone el articulo detras: 'ROBLES DE LOS' -> 'DE LOS ROBLES', 'MERCEDES DE LAS' -> 'DE LAS MERCEDES'."""
    m = re.match(r'^(.*?)\s+((?:DE\s+)?(?:LA|LAS|LOS|EL)|DEL|DE)$', via)
    return '%s %s' % (m.group(2), m.group(1)) if m else via


def desde_texto(o, letras, numero, muni):
    """La primera frase del texto de origen, si es esta misma direccion."""
    t = (o.get('origen_notas') or '').strip().split('\n')[0]
    t = re.split(r'\.\s', t + ' ')[0].strip(' .')
    t = re.sub(r'^\s*\[[^\]]*\]\s*', '', t)                          # "[NOTA] ..."
    t = re.sub(r'\(.*?\)', ' ', t)                                  # "(3 ESCALERAS)"
    t = re.sub(r'^\s*propiedad:\s*(cp|cdad\.?|comunidad( de propietarios)?)?\s*', '', t, flags=re.I)
    t = re.sub(PREFIJOS_TEXTO, '', t, flags=re.I).strip()
    if not t or not numero or not re.search(r'\b%s\b' % re.escape(numero.split('-')[0].split(' ')[0]), t): return None
    if len(t) > 70: return None
    letras_t = clave(re.sub(r'\d.*$', '', t))
    vs = {clave(v) for v in cat.variantes(clave(letras))}
    if not any(v and v in letras_t for v in vs): return None
    t = re.sub(r'\s+', ' ', sin_tildes(t).upper()).strip()
    if muni and muni in t: t = t[:t.index(muni) + len(muni)]            # lo que va detras del municipio, fuera
    elif muni: t = '%s %s' % (t, muni)
    return re.sub(r'\s+', ' ', t)


def main():
    escribir = '--escribir' in sys.argv
    ops = b.leer('oportunidades?select=id,codigo,comunidad_provisional,origen_notas&estado=eq.cerrada&comunidad_id=is.null')
    munis = {m['nombre']: m for m in b.leer('municipios_catastro?select=id,nombre,provincia')}
    existentes = {clave(re.sub(r'^CP\s+', '', c['nombre'], flags=re.I)): c for c in b.leer('comunidades?select=id,nombre,municipio')}
    res, n_texto, n_call, n_dud, n_exist = {}, 0, 0, 0, 0
    for o in ops:
        carpeta, muni, letras, resto = partir(o)
        numero = numeros_limpios(resto)
        r = {'codigo': o['codigo'], 'carpeta': carpeta, 'municipio': muni}
        nombre = desde_texto(o, letras, numero, muni)
        if nombre:
            r['de'] = 'texto'; n_texto += 1
        else:
            M = munis.get(muni) or munis.get(cat.ALIAS_MUNICIPIO.get(muni, ''))
            cand = cat.candidatas(M['id'], letras) if (M and numero) else []
            if len(cand) == 1:
                v = cand[0]; tipo = TIPO_NOMBRE.get(v['tipo_via'], v['tipo_via'])
                nombre = ' '.join(x for x in (tipo, articulo_delante(v['busqueda']), numero, muni) if x)
                r['de'] = 'callejero'; n_call += 1
            else:
                r['de'] = 'dudosa: %s' % ('sin numero en la carpeta' if not numero else
                                          'municipio fuera del callejero' if not M else '%d calles en el callejero' % len(cand))
                n_dud += 1
        if not nombre:
            # "se lo creamos tal cual" (Monica, 9-oct-2026): la carpeta pegada, sin inventar nada.
            nombre = ('%s %s' % (sin_tildes(carpeta).upper(), muni)).strip()
            r['de'] += ' -> carpeta tal cual'
        if nombre:
            nombre = re.sub(r'\s+', ' ', nombre).strip()
            # "como nombre de comunidad a TODAS le ponemos delante CP" (Monica, 9-oct-2026).
            nombre = re.sub(r'^CP\s+', '', nombre)
            r['nombre'] = 'CP ' + nombre
            if clave(nombre) in existentes:
                r['existe'] = existentes[clave(nombre)]['id']; n_exist += 1
        res[o['id']] = r
    json.dump(res, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print('cerradas sin comunidad: %d' % len(ops))
    print('   nombre del texto de origen: %d' % n_texto)
    print('   nombre del callejero      : %d' % n_call)
    print('   dudosas                   : %d' % n_dud)
    print('   de ellas, la comunidad YA EXISTE (se engancha, no se crea): %d' % n_exist)
    if not escribir:
        print('\n(marcha en seco)'); return

    hechas = 0
    nuevas = {}
    # No son direcciones sino carpetas de trabajo: se apartan hasta que Monica diga (9-oct-2026).
    APARTADAS = {'DAN-2021-008', 'DAN-2019-067', 'DAN-2020-003', 'DAN-2017-149', 'DAN-2022-159'}
    for oid, r in res.items():
        if 'nombre' not in r or r['codigo'] in APARTADAS: continue
        k = clave(r['nombre'][3:])
        cid = r.get('existe') or nuevas.get(k)
        if not cid:
            [c] = cat.upsert('comunidades', [{'nombre': r['nombre'], 'municipio': r['municipio'] or None}], 'id')
            cid = c['id']; nuevas[k] = cid
        b.actualizar('oportunidades?id=eq.%s&comunidad_id=is.null' % oid, {'comunidad_id': cid})
        hechas += 1
    print('comunidades nuevas: %d | opps enganchadas: %d' % (len(nuevas), hechas))


if __name__ == '__main__':
    main()
