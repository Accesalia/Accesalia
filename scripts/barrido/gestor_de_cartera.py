# -*- coding: utf-8 -*-
# Gestor de cartera de cada PERSONA de una administracion de fincas (puesto.comercial_id). Monica, 7-oct-2026:
#  - la cartera va persona a persona, no por empresa; es independiente de quien LLEVA cada oportunidad;
#  - el gestor = quien CAPTO su primera oportunidad (la mas antigua en la que la persona es el contacto, quien la trajo
#    o la administracion de la comunidad); si no tiene ninguna, Daniel;
#  - despues se cambia a mano en la ficha del administrador (solo Daniel, Monica y la secretaria comercial).
# Solo rellena las que estan VACIAS (no pisa un cambio hecho a mano). Sin --escribir: marcha en seco.
import sys, os, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar
ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
DANIEL = '72495d1c-0090-4346-b167-ed852fd69960'
nom = {c['id']: c['nombre'] for c in b.leer('comerciales?select=id,nombre')}
puestos = b.leer('puesto?select=id,persona_id,comercial_id,empresa!inner(tipo)&empresa.tipo=eq.administracion_fincas')
ops = b.leer('oportunidades?select=id,fecha_apertura,comercial_captador_id,puesto_id,quien_lo_trae,comunidad_id')
admin_de_com = collections.defaultdict(set)
for a in b.leer('comunidad_admin_responsable?select=comunidad_id,puesto_id&puesto_id=not.is.null'):
    admin_de_com[a['comunidad_id']].add(a['puesto_id'])
por_puesto = collections.defaultdict(list)
persona_a_puestos = collections.defaultdict(set)
for p in puestos: persona_a_puestos[p['persona_id']].add(p['id'])
for o in ops:
    ligados = set()
    if o['puesto_id']: ligados.add(o['puesto_id'])
    if o['quien_lo_trae']: ligados |= persona_a_puestos.get(o['quien_lo_trae'], set())
    if o['comunidad_id']: ligados |= admin_de_com.get(o['comunidad_id'], set())
    for pid in ligados: por_puesto[pid].append(o)
cuenta = collections.Counter(); cambios = []
for p in puestos:
    if p['comercial_id']: cuenta['ya tenia gestor (no se toca)'] += 1; continue
    lista = sorted((o for o in por_puesto.get(p['id'], []) if o['comercial_captador_id']), key=lambda o: o['fecha_apertura'] or '9999')
    g = lista[0]['comercial_captador_id'] if lista else DANIEL
    cuenta[('primera opp: ' if lista else 'sin opps: ') + nom[g]] += 1
    cambios.append((p['id'], g))
for k, v in cuenta.most_common(): print('%4d  %s' % (v, k))
if ESCRIBIR:
    for pid, g in cambios: b.actualizar('puesto?id=eq.' + pid, {'comercial_id': g})
    print('escritas:', len(cambios))
else:
    print('*** MARCHA EN SECO ***')
