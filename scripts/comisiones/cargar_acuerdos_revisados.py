# -*- coding: utf-8 -*-
"""LOS ACUERDOS DE COMISION REVISADOS POR MONICA (17-oct-2026), uno a uno, en su
Excel docs/comisiones_administradores_para_revisar.xlsx. Monday no era fiable: lo
que ella dio por bueno entra VERIFICADO; lo que no, POR REVISAR. Los 51 de
acuerdos_comision (Monday) se marcan como sustituidos, sin borrarlos.

Contrata: el numero es % del PEM. «En B» de Eurolinova: «de todo, tambien lo
nuestro». Marcal Leganes, contrata «pendiente de negociar». Susana y Silvia Gomez
(Administracion Gomez): cada una cobra lo de su cartera («solo lo suyo»).
Alvaro Martin Cicero: en la agenda no tiene puesto en Marcal (a confirmar).

  python scripts/comisiones/cargar_acuerdos_revisados.py [--escribir]
"""
import sys, os, json, unicodedata, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
MONICA = b.leer('equipo?email=eq.gerencia.accesalia@gmail.com&select=id')[0]['id']
if b.leer('comision_acuerdos?select=id&limit=1') and ESCRIBIR:
    raise SystemExit('comision_acuerdos ya tiene filas: no se carga dos veces.')


def k(s): return unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()


EMP = {k(e['nombre_accesalia']): e['id'] for e in b.leer('empresa?select=id,nombre_accesalia')}
def emp(n): return EMP[k(n)]


def persona(empresa, quien):
    if quien is None: return None
    if empresa is None:
        return b.leer(f'persona?select=id&id=eq.{quien}')[0]['id']
    ps = b.leer(f"puesto?select=persona_id,p:persona_id(nombre,apellidos)&hasta=is.null&empresa_id=eq.{emp(empresa)}")
    m = sorted({p['persona_id'] for p in ps if p['p'] and quien in k(' '.join(x for x in [p['p']['nombre'], p['p']['apellidos']] if x))})
    assert m, (empresa, quien)
    return m[0]   # Ana Gines esta dos veces en la agenda: se coge la primera


ALVARO = '88c819f4-ef7e-4512-9fd3-50dd9e24eb84'   # Alvaro Martin Cicero (no es Alvaro de Soto, el nuestro)
RAUL = '5c700627'
P, S, C = 'proyecto', 'subvenciones', 'contrata'
eur = lambda v: {'forma': 'eur', 'valor': v}
pct = lambda v: {'forma': 'pct', 'valor': v}
# (quien: (empresa, patron) | persona_id | None, alcance, [empresas], {condiciones}, verificado, extra, notas)
A = [
    (('DEL BRIO Y BLANCO', 'carlos'), 'empresas', ['DEL BRIO Y BLANCO'], {P: eur(1000), C: pct(3)}, True, {}, None),
    (('CIUDADELA', 'paz terradillo'), 'empresas', ['CIUDADELA'], {P: eur(1000), C: pct(3)}, True, {}, None),
    (('GESMADRID ADMINISTRADORES, S.L.', 'paz terradillo'), 'empresas', ['GESMADRID ADMINISTRADORES, S.L.'], {C: pct(3)}, True, {}, None),
    (('ALVAREZ ASESORES', 'luis carlos'), 'empresas', ['ALVAREZ ASESORES'], {P: eur(1500), C: pct(5)}, True, {}, None),
    (('MC GESTION ADMINISTRACION DE FINCAS', 'adolfo'), 'empresas', ['MC GESTION ADMINISTRACION DE FINCAS'], {P: eur(1000), C: pct(5)}, True, {}, None),
    ((None, ALVARO), 'empresas', ['MARCAL ASESORES (LEGANES)'], {P: eur(1000), C: {'forma': 'pct', 'valor': None, 'estado': 'pendiente', 'notas': 'Pendiente de negociar con él cuánto se lleva de la contrata.'}}, True, {},
     'En la agenda, Álvaro Martín Cicero no tiene puesto en Marcal: confirmar que es él.'),
    ((None, ALVARO), 'empresas', ['MARCAL ASESORES (CASTILLA LA MANCHA)'], {C: pct(3)}, True, {}, 'En la agenda, Álvaro Martín Cicero no tiene puesto en Marcal: confirmar que es él.'),
    ((None, ALVARO), 'empresas', ['MARCAL ASESORES (COLMENAR VIEJO)'], {C: pct(3)}, True, {}, 'En la agenda, Álvaro Martín Cicero no tiene puesto en Marcal: confirmar que es él.'),
    (('ADMINISTRACIONES ALCORA', 'valentin'), 'empresas', ['ADMINISTRACIONES ALCORA'], {P: eur(1000), S: eur(500), C: pct(3)}, True, {}, None),
    (('MUÑOZ Y PANDO (MUPAN)', 'oscar'), 'empresas', ['MUÑOZ Y PANDO (MUPAN)'], {P: eur(1000), C: pct(3)}, True, {}, None),
    (('ARRIALSI', 'silvia'), 'empresas', ['ARRIALSI'], {P: eur(1000), C: pct(3)}, True, {}, None),
    (('ROJO JUSDI', 'diego'), 'empresas', ['ROJO JUSDI'], {P: eur(1000), C: pct(3)}, True, {}, None),
    (('ATIKO', 'maria jose'), 'empresas', ['ATIKO'], {P: eur(1000)}, True, {}, None),
    (('FINCAS MONGE', 'fermin'), 'empresas', ['FINCAS MONGE'], {P: eur(1000), C: pct(3)}, True, {}, None),
    (('GESTIN SAP', 'isaac'), 'empresas', ['GESTIN SAP'], {P: eur(1000), C: pct(3)}, True, {}, None),
    (('ITACA FINCAS', 'fernando'), 'empresas', ['ITACA FINCAS'], {P: eur(1000), C: pct(3)}, True, {}, None),
    (('IGM SERVICIOS JURIDICOS', 'inmaculada'), 'empresas', ['IGM SERVICIOS JURIDICOS'], {P: eur(1500)}, True, {}, None),
    (('GRUPO EMBLA', 'juan leon'), 'empresas', ['GRUPO EMBLA'], {C: pct(3)}, True, {}, None),
    (('GRUPO EUROLINOVA', 'miguel'), 'empresas', ['GRUPO EUROLINOVA'], {C: {**pct(3), 'en_b': True}}, True, {}, 'Cobra en B, sin factura: de todo, también lo nuestro.'),
    (('GONZALEZ Y LOPEZ ABOGADOS SCP', 'gines'), 'empresas', ['GONZALEZ Y LOPEZ ABOGADOS SCP'], {P: eur(500), C: pct(3)}, True, {},
     'Ana Ginés está dos veces en la agenda («Ana Ginés Alvarez» y «Ana Isabel Ginés Álvarez»).'),
    ((None, RAUL), 'empresas', ['ACAYMA ASESORES'], {P: eur(3500)}, True, {}, 'Comercial externo: Acayma no cobra; cobra el intermediario que nos la trae.'),
    (('ADMINISTRACION GOMEZ', 'susana'), 'lo_suyo', [], {P: eur(1000), C: pct(3)}, True, {}, 'Cada una cobra lo de su cartera (Administración Gómez).'),
    (('ADMINISTRACION GOMEZ', 'silvia'), 'lo_suyo', [], {P: eur(1000), C: pct(3)}, True, {}, 'Cada una cobra lo de su cartera (Administración Gómez).'),
    # POR REVISAR
    (('AEA FINCAS VILLAVERDE', 'jose ramon'), 'empresas', ['AEA FINCAS VILLAVERDE'], {}, False, {}, 'Por confirmar los importes (Monday decía 1.000 € por proyecto).'),
    (('ASERPEMAR', 'pedro'), 'empresas', ['ASERPEMAR'], {}, False, {}, 'Por confirmar los importes (Monday: «sí, sin importe»).'),
    (('AEA FINCAS LEGANES', 'angel'), 'empresas', ['AEA FINCAS LEGANES'], {}, False, {}, 'Por confirmar los importes (Monday decía 1.000 € por proyecto).'),
    (('GESTAFIN', 'trigo'), 'empresas', ['GESTAFIN'], {}, False, {}, 'Por confirmar los importes (Monday decía 1.000 € por proyecto).'),
    (('SERVICIOS URBANOS', 'alfonso'), 'empresas', ['SERVICIOS URBANOS'], {}, False, {}, 'Por confirmar los importes (Monday decía 1.000 € por proyecto).'),
    (None, 'empresas', ['SM FINCAS'], {P: eur(1000), C: pct(3)}, False, {}, 'Duda: ¿cobra Belén o Mónica Cifuentes?'),
    (None, 'empresas', ['ABOGADOS Y FINCAS COSLADA'], {C: pct(3)}, False, {}, 'A Mónica no le consta.'),
    (None, 'empresas', ['FINCASA FIXCONTE'], {}, False, {}, 'A Mónica no le consta (Monday decía 3 % de contrata).'),
    (None, 'empresas', ['GUERRERO DADILLOS'], {}, False, {}, 'A Mónica no le consta (Monday decía 1.000 € por proyecto).'),
    (None, 'empresas', ['QR GESTION DE FINCAS'], {}, False, {}, 'Sin revisar (Monday decía 1.000 € por proyecto).'),
    # NO COBRA
    (('YARA ASESORES', 'estefania'), 'empresas', ['YARA ASESORES'], {}, True, {'no_cobra': True, 'vigente': False}, 'No cobra (revisión de Mónica, 17-oct).'),
]


def crear(tabla, fila):
    cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
    r = urllib.request.Request(b.url + '/rest/v1/' + tabla, data=json.dumps(fila, ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(r) as x: return json.loads(x.read())[0]


raul = b.leer(f"persona?select=id&id=like.{RAUL}*") if False else None
n = {'verificado': 0, 'por_revisar': 0, 'condiciones': 0}
for quien, alcance, empresas, conds, verif, extra, notas in A:
    if quien is None: pid = None
    elif quien[0] is None and quien[1] == RAUL:
        pid = [p['id'] for p in b.leer('persona?select=id&nombre=ilike.raul&apellidos=ilike.cerezo')][0]
    elif quien[0] is None: pid = quien[1]
    else: pid = persona(*quien)
    fila = {'persona_id': pid, 'alcance': alcance, 'revision': 'verificado' if verif else 'por_revisar', 'origen': 'revision_monica',
            'notas': notas, 'creado_por': MONICA, **({'verificado_por': MONICA, 'verificado_en': '2026-10-17T18:00:00+02:00'} if verif else {}), **extra}
    n['verificado' if verif else 'por_revisar'] += 1
    print(('VERIF ' if verif else 'REVIS ') + (empresas[0] if empresas else 'lo suyo'), pid and pid[:8], {s: c.get('valor') for s, c in conds.items()})
    if not ESCRIBIR: continue
    a = crear('comision_acuerdos', fila)
    for e in empresas: b.insertar('comision_acuerdo_empresas', [{'acuerdo_id': a['id'], 'empresa_id': emp(e)}])
    for sobre, c in conds.items():
        b.insertar('comision_condiciones', [{'acuerdo_id': a['id'], 'sobre': sobre, 'forma': c['forma'], 'valor': c.get('valor'),
                                              'estado': c.get('estado', 'pactada'), 'en_b': c.get('en_b', False), 'notas': c.get('notas')}])
        n['condiciones'] += 1
print(n)
if ESCRIBIR:
    b.actualizar('acuerdos_comision?sustituido=is.false', {'sustituido': True})
    print('acuerdos de Monday marcados como sustituidos')
else:
    print('(marcha en seco)')
