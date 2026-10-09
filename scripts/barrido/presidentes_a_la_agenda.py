# -*- coding: utf-8 -*-
"""LOS CONTACTOS DE LAS COMUNIDADES, A LA AGENDA                 (Monica, 9-oct-2026)

Sustituye al de scripts/presidentes_a_la_agenda.py (5-oct), que se paro "hasta que acaben los barridos".

Cada fila de personas_comunidad se parte en dos, como decidio el 4-oct:
  - persona -> nombre, apellidos, telefono (el del presidente es suyo, no de un puesto), correo;
  - puesto  -> su papel (presidente, vicepresidente, secretario, vecino, otro) colgado de la FIGURA LEGAL de la
               comunidad, con el DNI y las notas. El anterior lleva fecha de fin.

"El presidente pertenece a la comunidad, no a la oportunidad" (9-oct). La oportunidad guarda QUIEN LO TRAJO y
CON QUIEN HABLAMOS: pasan a apuntar a la PERSONA (quien_lo_trae) y a su PUESTO (puesto_id). Lo que era ese dia lo
dice el puesto con sus fechas. La tabla vieja NO se borra: es el rastro.

Solo comunidades con figura legal. Las de sin CIF esperan ("para el final").
Las 14 comunidades "enredadas" se escriben a mano (MANUAL), leidas en sus fichas: lo tachado es el anterior.

  python scripts/barrido/presidentes_a_la_agenda.py            -> marcha en seco
  python scripts/barrido/presidentes_a_la_agenda.py --escribir
"""
import sys, os, re, json, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, '..'))
from produccion import arrancar  # noqa: E402

b = arrancar()
SALIDA = os.path.join(AQUI, 'presidentes_a_la_agenda.json')
PARTICULAS = {'de', 'del', 'la', 'las', 'los', 'y'}
RUIDO = re.compile(r'\(.*?\)|\d[\d .\-]{6,}|\b\d+\s*[ºªo]\s*[A-Za-z]?\b|\b\d+\s*[A-D]\b')
TEL = re.compile(r'\b[6789]\d{2}[ .\-]?\d{2}[ .\-]?\d{2}[ .\-]?\d{2}\b')
EMAIL = re.compile(r'[\w.+-]+@[\w-]+\.[\w.]+')

# Leidas en las fichas de Dropbox el 9-oct-2026. (nombre, apellidos, dni, telefono, email, cargo, desde, hasta, nota)
F = 'anterior: tachado en la ficha; fecha real desconocida, se pone la de la ficha'
MANUAL = {
    'CP AMPURDAN 7 LEGANES': [
        ('Sagrario', 'Escribano López', '50270629N', None, None, 'presidente', None, None, 'Junta 2024-2025 (tablon de junio 2024)'),
        ('Antonio', 'Gallego Martín', '53448225C', '669286421', None, 'presidente', None, '2024-06-25', 'Tachado en la ficha; el tablon de junio 2024 ya da a Sagrario')],
    'CP AV COLMENAR VIEJO 18 SAN SEBASTIAN DE LOS REYES': [
        ('Ángel', 'Vega Orellana', '05378629X', '657497225', 'angelvegaorellana@gmail.com', 'presidente', None, None, '2º C'),
        ('María del Carmen', 'Moreno Reino', '07473515X', None, None, 'presidente', None, '2026-10-05', F)],
    'CP CALDERON DE LA BARCA 6 LEGANES': [
        ('Baldomero', 'Barragán Coronado', '50407675R', None, None, 'presidente', None, None, None),
        ('Sonia', 'Lozano', '53047679L', None, 'sonialozano305@hotmail.com', 'presidente', None, '2026-05-18', '3º A. ' + F)],
    'CP CDAD PROP AV DE LOS ESTADOS N 18 FUENLABRADA': [
        ('Félix', 'Serrano Rivero', '05873649R', None, None, 'presidente', None, None, None),
        ('Ángel Sebastián', 'Fernández Laorden', '51916894Y', None, None, 'presidente', None, '2026-04-14', 'Firmaba como presidente en 2023. ' + F)],
    'CP CDAD PROP CL FATIMA 6': [
        ('Milagros', 'Santos Ramos', '02086711J', None, None, 'presidente', None, None, 'P2-D'),
        ('Miguel Ángel', 'Gálvez Felipe', '76007040K', None, None, 'presidente', None, '2026-01-29', F)],
    'CP CDAD PROP CL ITALIA N 11 FUENLABRADA': [
        ('Ignacio', 'Catalán García', '01915212W', None, None, 'presidente', None, None, None),
        ('María del Carmen', 'Benítez Serradilla', '05618674G', None, None, 'presidente', None, '2026-03-05', 'Presidenta en la subvencion CAM NG 2022. ' + F)],
    'CP CDAD PROP CL LOS ANGELES N 14 FUENLABRADA': [
        ('José', 'Peña Díaz', '50036000Y', '630070460', None, 'presidente', '2024-12-11', None, '"Presidente actual 11/12/2024"'),
        ('Antonio', 'Sánchez Molina', '05603977G', None, None, 'presidente', None, '2024-12-11', 'Tachado en la ficha')],
    'CP CDAD PROP PS DEL OLIMPO N 16 FUENLABRADA': [
        ('Concepción', 'Martín Hernández', '11793111E', None, 'macu.7@hotmail.com', 'presidente', None, None, '"El presidente ha cambiado, a 28/02/2025 no hay acta de nombramiento"'),
        ('Adrián', 'Serrano', None, '653565942', 'adrianserrano1993@gmail.com', 'vicepresidente', None, None, '2º B'),
        ('Ángel Manuel', 'Estrada Muñoz', '50220479W', '651837467', None, 'presidente', None, '2025-02-28', 'Tachado en la ficha')],
    'CP MADRID 38-40 HUMANES DE MADRID': [
        ('Armando', 'Martín Varela', '70036493K', None, None, 'presidente', '2024-05-01', None, '"Mayo 2024: hay nuevo presidente"'),
        ('María del Carmen', 'Núñez Miranda', '04141824F', '660855935', None, 'presidente', None, '2024-05-01', 'Tachado en la ficha')],
    'CP SAN ANDRES 1 LEGANES': [
        ('Óscar', 'Benito Gereduz', '50449081F', '699402664', None, 'presidente', '2025-01-01', None, '"Nuevo presidente 2025"'),
        ('Ángel', 'Buitrago Gómez', '01485188D', None, None, 'presidente', None, '2025-01-01', 'Tachado en la ficha')],
    'CP SAN VALERIANO 1 LEGANES': [
        ('Guohua', 'Zheng', None, None, None, 'presidente', None, None, '2º B'),
        ('María Elena', 'Montero Bernabé', '52370200M', None, None, 'presidente', None, '2026-08-24', F)],
    'CP CDAD PROP CANARIAS 8 FUENLABRADA': [
        ('Antonio', 'Sánchez Fernández', '02096199W', '607737405', 'asf2731@gmail.com', 'presidente', '2025-06-01', None, '"Presidente en junio 2025"'),
        ('Jesús', 'Guío Rodríguez', '50057752T', None, None, 'presidente', None, '2025-06-01', 'Tachado en la ficha de mejora de accesibilidad'),
        ('Carmen', 'Álvarez García', '50938850Z', None, None, 'presidente', None, '2025-06-01', 'Presidenta en la ficha de octubre 2021; anterior a Jesus Guio. Fecha real desconocida')],
    'CP CDAD PROP CL LA CAÑADA N 22 ALCORCON': [
        ('Hugo Manuel', None, None, '618155949', None, 'presidente', None, None, 'Ficha del ascensor 2026: "revisar cuando llegue"'),
        ('Paula', 'Herradón Jiménez', '02178744T', None, None, 'presidente', None, '2026-01-01', '1º D. Presidenta en la ficha de la rampa 2025')],
    'CP AV CARDENAL HERRERA ORIA 283 MADRID': [
        ('Vanessa', 'García Jiménez', '47023728K', '679145169', 'vanessagj80@hotmail.com', 'presidente', None, None, 'Firma como presidenta en el borrador de 2026'),
        ('Julia', 'Monero', None, None, None, 'presidente', '2023-12-14', '2026-07-01', '"desde 14/12/2023". ' + F),
        ('Almudena', 'Uriarte Blanco', '00809783E', None, 'aalmudena@gmail.com', 'presidente', None, '2023-12-14', 'Sin tachar junto a Mercedes; orden con Julia Monero incierto'),
        ('Mercedes', 'Paule Sastre', '00378906G', '617210661', 'm.paulesastre@gmail.com', 'presidente', None, '2023-12-14', '3º dcha. Tachada en la ficha')],
}


# Nombres de pila que suelen ir de segundo en un nombre compuesto (Maria Jose, Jose Luis, Juan Carlos...).
PILA = {'MARIA', 'MARÍA', 'JOSE', 'JOSÉ', 'LUIS', 'CARLOS', 'ANTONIO', 'MANUEL', 'JESUS', 'JESÚS', 'ANGEL', 'ÁNGEL',
        'CARMEN', 'ISABEL', 'TERESA', 'PILAR', 'ELENA', 'LUISA', 'JAVIER', 'FRANCISCO', 'MIGUEL', 'PABLO', 'IGNACIO',
        'ROSA', 'DOLORES', 'MERCEDES', 'VICTORIA', 'EUGENIA', 'CRISTINA', 'BEATRIZ', 'INMACULADA', 'GEMA', 'ANA',
        'ALBERTO', 'ANDRES', 'ANDRÉS', 'RAMON', 'RAMÓN', 'ENRIQUE', 'FERNANDO', 'AGUSTIN', 'AGUSTÍN', 'IRINA', 'ALICIA',
        'SEBASTIAN', 'SEBASTIÁN', 'DAVID', 'ALFONSO', 'RAFAEL', 'VICENTE', 'JUAN', 'PEDRO', 'MAR', 'NIEVES', 'SOLEDAD'}


def partir_nombre(t):
    """Nombre y apellidos. El nombre es la primera palabra, mas lo que la completa: 'del Carmen', 'de las
    Mercedes', o un segundo nombre de pila (Maria Jose). El resto, apellidos."""
    ps = [p for p in t.split() if p]
    if len(ps) <= 1: return t, None
    i = 1
    # 'del Carmen' / 'de las Mercedes' solo completan el nombre tras MARIA o JOSE: "Sonia de Vicente" es apellido.
    if ps[i].lower() in PARTICULAS and ps[0].upper().rstrip('.') in ('MARIA', 'MARÍA', 'Mª', 'MA', 'M'):
        while i < len(ps) and ps[i].lower() in PARTICULAS: i += 1
        i += 1
    elif ps[i].upper() in PILA and len(ps) >= 4:
        i += 1
    i = min(i, len(ps) - 1)
    return ' '.join(ps[:i]), ' '.join(ps[i:]) or None


def limpiar_nombre(bruto):
    """Quita lo que no es el nombre. Si hay un guion separando trozos, se queda el que tiene mas palabras
    ('PACO - FRANCISCO MUNOZ JIMENEZ' -> el segundo; 'MARIA LUISA GARCIA PONS - 5 Izquierda' -> el primero)."""
    t = EMAIL.sub(' ', bruto)
    t = re.sub(r'(?i)\b(vice)?(presidente|presidenta)\b(\s+del?\b)?\s*:?|\btel[eé]fono\s*:?|\bn[ºo°]\s*\d+\w*|\bpiso\b|\.-', ' ', t)
    t = RUIDO.sub(' ', t)
    trozos = [x.strip() for x in re.split(r'\s[-–]\s|\s[-–]$|^[-–]\s', t) if x.strip()]
    if trozos:
        t = max(trozos, key=lambda x: len(re.findall(r'[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,}', x)))
    t = re.sub(r'\s\d+\s*$|\s-?[A-Z]$', '', t)
    return re.sub(r'\s{2,}', ' ', t).strip(' .,-–/:')


# Varias personas en una fila (pegadas: "RUIZCRISTINA"; o "Nva Presidenta"; o separadas por "/"): no se parten.
# (la deteccion de filas enredadas esta en main)
NO_ES_PERSONA = re.compile(r'(?i)\bpedidos? datos\b|\badmin\b')


def limpio(s):
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', '', s.lower())).strip()


def alta(tabla, fila):
    cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
    req = urllib.request.Request(b.url + '/rest/v1/' + tabla, data=json.dumps([fila], ensure_ascii=False).encode('utf-8'),
                                 headers=cab, method='POST')
    try:
        with urllib.request.urlopen(req) as r: return json.loads(r.read().decode('utf-8'))[0]
    except urllib.error.HTTPError as e:
        raise RuntimeError('alta %s: %s %s' % (tabla, e.code, e.read().decode('utf-8', 'replace')))


def main():
    escribir = '--escribir' in sys.argv
    figuras = {f['id_comodin'] for f in b.leer('figura_legal_propietaria?select=id_comodin')}
    coms = {c['id']: c['nombre'] for c in b.leer('comunidades?select=id,nombre')}
    filas = b.leer('personas_comunidad?select=id,comunidad_id,nombre,rol,documento,telefono,email,notas')
    ya = {(p['figura_legal_propietaria_id'], limpio(p['persona']['nombre'] + ' ' + (p['persona']['apellidos'] or '')))
          for p in b.leer('puesto?select=figura_legal_propietaria_id,persona(nombre,apellidos)&figura_legal_propietaria_id=not.is.null')}

    plan, sin_figura, manual_pc, enredadas = [], 0, {}, []
    for f in filas:
        cid = f['comunidad_id']
        if cid not in figuras: sin_figura += 1; continue
        if coms.get(cid) in MANUAL:
            manual_pc.setdefault(cid, []).append(f['id']); continue
        bruto = (f['nombre'] or '').strip()
        tel = (f['telefono'] or '').strip() or (TEL.search(bruto).group(0) if TEL.search(bruto) else None)
        mail = (f['email'] or '').strip() or (EMAIL.search(bruto).group(0) if EMAIL.search(bruto) else None)
        if NO_ES_PERSONA.search(bruto): continue
        sin_parentesis = re.sub(r'\(.*?\)', ' ', bruto)
        if re.search(r'[a-záéíóúñ][A-ZÁÉÍÓÚÑ]{2}', sin_parentesis) or re.search(r'(?i)nva|/\s*[A-Za-z]', sin_parentesis) or                 len(limpiar_nombre(bruto).split()) >= 8 or len(re.findall(r'\d{8}', f['documento'] or '')) >= 2 or                 re.search(r'(?i)nva\.?\s*presiden', bruto) or                 len([w for w in (partir_nombre(limpiar_nombre(bruto))[1] or '').split() if w.lower() not in PARTICULAS]) >= 4:
            enredadas.append((coms.get(cid), bruto, f['documento'])); continue
        nombre_l = limpiar_nombre(bruto)
        if not nombre_l: continue
        n, a = partir_nombre(nombre_l)
        notas = []
        if nombre_l != bruto: notas.append('En la ficha venia asi: "%s"' % bruto)
        if (f['notas'] or '').strip(): notas.append(f['notas'].strip())
        plan.append({'pc': [f['id']], 'comunidad': cid, 'nombre': n, 'apellidos': a, 'dni': (f['documento'] or '').strip() or None,
                     'tel': tel, 'email': mail, 'cargo': f['rol'] or 'otro', 'desde': None, 'hasta': None,
                     'notas': '\n'.join(notas) or None})
    # duplicados dentro de la misma comunidad (Calvario 1, Corral de Cantos 19): una persona, juntando datos
    junto = {}
    for p in plan:
        k = (p['comunidad'], limpio(p['nombre'] + ' ' + (p['apellidos'] or ''))[:18])
        if k in junto:
            q = junto[k]; q['pc'] += p['pc']
            for c in ('dni', 'tel', 'email', 'apellidos'):
                if not q[c] and p[c]: q[c] = p[c]
            if len(p['nombre'] + (p['apellidos'] or '')) > len(q['nombre'] + (q['apellidos'] or '')) and p['dni']:
                q['nombre'], q['apellidos'] = p['nombre'], p['apellidos']
        else: junto[k] = p
    plan = list(junto.values())
    for nombre_com, gente in MANUAL.items():
        cid = next((i for i, n in coms.items() if n == nombre_com), None)
        if not cid or cid not in figuras: print('OJO manual sin comunidad/figura:', nombre_com); continue
        for i, (n, a, dni, tel, mail, cargo, desde, hasta, nota) in enumerate(gente):
            plan.append({'pc': manual_pc.get(cid, []) if i == 0 else [], 'comunidad': cid, 'nombre': n, 'apellidos': a, 'dni': dni,
                         'tel': tel, 'email': mail, 'cargo': cargo, 'desde': desde, 'hasta': hasta,
                         'notas': ('Leida en la ficha el 9-oct-2026. ' + (nota or '')).strip()})
    plan = [p for p in plan if (p['comunidad'], limpio(p['nombre'] + ' ' + (p['apellidos'] or ''))) not in ya]
    # AGENDA UNICA: la misma persona en varias comunidades es UNA persona con varios puestos. Se casa por DNI, o
    # por nombre completo cuando tiene apellidos (un nombre suelto como "JESUS" no basta para juntar).
    quien = {}
    for p in plan:
        k = ('dni', p['dni'].upper().replace('-', '').replace(' ', '')) if p['dni'] else             (('nom', limpio(p['nombre'] + ' ' + p['apellidos'])) if p['apellidos'] else ('solo', id(p)))
        p['persona_clave'] = '%s:%s' % k
        quien.setdefault(p['persona_clave'], []).append(p)
    json.dump(plan, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    from collections import Counter
    print('contactos de comunidades: %d | sin figura legal, esperan: %d' % (len(filas), sin_figura))
    print('a la agenda: %d puestos de %d personas -> %s' % (len(plan), len(quien), dict(Counter(p['cargo'] for p in plan))))
    print('   personas con varias comunidades: %d' % sum(1 for v in quien.values() if len(v) > 1))
    print('   ENREDADAS (varias personas en una fila), no se tocan: %d' % len(enredadas))
    for e in enredadas: print('      ', e)
    print('   anteriores con fecha de fin: %d | con DNI: %d | con telefono: %d | con correo: %d'
          % (sum(1 for p in plan if p['hasta']), sum(1 for p in plan if p['dni']), sum(1 for p in plan if p['tel']),
             sum(1 for p in plan if p['email'])))
    for p in plan[:5]: print('   ', p['nombre'], '|', p['apellidos'], '|', p['cargo'], '|', p['dni'], '|', coms[p['comunidad']])
    if not escribir:
        print('\n(marcha en seco)'); return

    mapa = {}
    personas = {}
    for p in plan:
        per = personas.get(p['persona_clave'])
        if not per:
            per = alta('persona', {'nombre': p['nombre'], 'apellidos': p['apellidos'], 'telefono_personal': p['tel'], 'activa': True})
            personas[p['persona_clave']] = per
        pu = alta('puesto', {'persona_id': per['id'], 'figura_legal_propietaria_id': p['comunidad'], 'cargo': p['cargo'],
                             'documento': p['dni'], 'desde': p['desde'], 'hasta': p['hasta'], 'notas': p['notas']})
        if p['email'] and not per.get('_correo'):
            per['_correo'] = True
            alta('correo', {'persona_id': per['id'], 'email': p['email'], 'principal': True, 'etiqueta': 'personal'})
        for pc in p['pc']: mapa[pc] = (per['id'], pu['id'])
    # las oportunidades: quien lo trajo -> la persona; con quien hablamos -> su puesto. Solo si estaban vacios.
    n1 = n2 = 0
    for o in b.leer('oportunidades?select=id,persona_comunidad_id,quien_persona_comunidad_id,puesto_id,quien_lo_trae'
                    '&or=(persona_comunidad_id.not.is.null,quien_persona_comunidad_id.not.is.null)'):
        cambios = {}
        if o['persona_comunidad_id'] in mapa and not o['puesto_id']: cambios['puesto_id'] = mapa[o['persona_comunidad_id']][1]; n1 += 1
        if o['quien_persona_comunidad_id'] in mapa and not o['quien_lo_trae']: cambios['quien_lo_trae'] = mapa[o['quien_persona_comunidad_id']][0]; n2 += 1
        if cambios: b.actualizar('oportunidades?id=eq.' + o['id'], cambios)
    json.dump(mapa, open(os.path.join(AQUI, 'presidentes_mapa.json'), 'w'), indent=0)
    print('escritas %d personas y puestos | opps: con quien hablamos %d, quien lo trajo %d' % (len(plan), n1, n2))


if __name__ == '__main__' and sys.argv[1:2] != ['reapuntar']:
    main()


def reapuntar():
    """Paso 2, aparte (9-oct-2026): las opps que apuntaban a la tabla vieja pasan a la persona y a su puesto.
    'Quien lo trae' admite UN solo enlace (oportunidad_un_solo_quien_check): al poner la persona se vacia el viejo.
    El rastro queda en presidentes_mapa.json (fila vieja -> persona, puesto) y en la tabla vieja, que no se borra."""
    plan = json.load(open(SALIDA, encoding='utf-8'))
    puestos = b.leer('puesto?select=id,persona_id,figura_legal_propietaria_id,persona(nombre,apellidos)'
                     '&figura_legal_propietaria_id=not.is.null')
    por = {(p['figura_legal_propietaria_id'], limpio(p['persona']['nombre'] + ' ' + (p['persona']['apellidos'] or ''))): p
           for p in puestos}
    mapa = {}
    for x in plan:
        pu = por.get((x['comunidad'], limpio(x['nombre'] + ' ' + (x['apellidos'] or ''))))
        if pu:
            for pc in x['pc']: mapa[pc] = (pu['persona_id'], pu['id'])
    json.dump(mapa, open(os.path.join(AQUI, 'presidentes_mapa.json'), 'w'), indent=0)
    n1 = n2 = 0
    for o in b.leer('oportunidades?select=id,persona_comunidad_id,quien_persona_comunidad_id,puesto_id,quien_lo_trae,quien_comercial_id'
                    '&or=(persona_comunidad_id.not.is.null,quien_persona_comunidad_id.not.is.null)'):
        cambios = {}
        if o['persona_comunidad_id'] in mapa and not o['puesto_id']:
            cambios['puesto_id'] = mapa[o['persona_comunidad_id']][1]; n1 += 1
        if o['quien_persona_comunidad_id'] in mapa and not o['quien_lo_trae'] and not o['quien_comercial_id']:
            cambios['quien_lo_trae'] = mapa[o['quien_persona_comunidad_id']][0]; cambios['quien_persona_comunidad_id'] = None; n2 += 1
        if cambios: b.actualizar('oportunidades?id=eq.' + o['id'], cambios)
    print('mapa: %d filas viejas | opps: con quien hablamos %d, quien lo trajo %d' % (len(mapa), n1, n2))


if __name__ == '__main__' and sys.argv[1:2] == ['reapuntar']:
    reapuntar()
