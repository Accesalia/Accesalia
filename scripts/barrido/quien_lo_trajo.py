# -*- coding: utf-8 -*-
"""QUIEN LO TRAJO en las oportunidades abiertas de 2025-2026 (Monica, 9-oct-2026).

Leido por agentes en origen_notas, diario y fichas de Dropbox (quien_lo_trajo_final.jsonl) con sus reglas:
  1. tachado -> el ORIGINAL ("lo que habria pasado si se hubiera rellenado el campo el dia que se supo");
  2. el que RECOMIENDA, no el que llama (ese es "a quien contacto para esto");
  3. solo la empresa -> el JEFE de la empresa (o el titular / el administrador);
  4. nada -> VACIO (no se rellena con el administrador ni con el contacto por defecto).
Y "la contrata que aparece como contacto en la ficha vieja cuenta como quien lo trajo".

Escribe quien_lo_trae (persona) y vacia el enlace viejo quien_persona_comunidad_id (oportunidad_un_solo_quien).
Las que tienen nombre pero esa persona no esta en la agenda NO se tocan: quedan pendientes.

  python scripts/barrido/quien_lo_trajo.py            -> marcha en seco
  python scripts/barrido/quien_lo_trajo.py --escribir
"""
import sys, os, json, collections
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, '..'))
from produccion import arrancar  # noqa: E402

b = arrancar()
FINAL = os.path.join(AQUI, 'quien_lo_trajo_final.jsonl')

# Jefes que dio Monica (9-oct-2026) para las opps que solo nombran la empresa.
JEFE = {
    'EFFIC': 'a218ca44-4092-4fbb-aa95-5619205ebc89',              # "el comercial que haya": Francisco Javier Castro
    'CIUDADELA': '7fe206dd-fde5-4dad-bd54-bfe242505981',          # Paz Terradillo
    'DEL BRIO Y BLANCO': '310283fd-a755-475b-9924-3ab6ec8a6331',  # "Manuel" (en la agenda: Manuel Blanco Blanco)
    'ARRIALSI': '2013bffc-5682-49d7-8269-dd9d6aade89e',           # Silvia Arribas
    'SCHINDLER': '6fd7aecf-8b06-4cde-8a33-9929f205f1c9',          # Javier Parra
    'ROEN': '064f54e2-ac39-47f2-b14a-724ac667a290',               # Jose Luis Jimenez
    'ENVOLTERMIA': '6f8751f5-b45f-496c-9e5a-7baebc6927b2',        # Julio Garcia
    'MATEDECON': '12657d8a-008f-4e78-999a-604278c1cbca',          # Roberto Perez Gil
    # 10-oct: Trebol = Maribel, ALSER = Javier (Hernandez), AEA Fuenlabrada = Vanesa, Luxor = Sonia (Guillen),
    # PBM = Pedro (Barrios). Admin Atocha y MP Madrid: vacias. Escritas a mano el 10-oct (8 opps).
}
# "Cuenta, si: esa persona de esa contrata" (la contrata que sale como contacto en la ficha vieja).
CONTRATA_CONTACTO = {
    'DAN-2025-024': '5b37d6a5-ebb4-4730-ab6b-04bb530339a6',       # Francisco Javier Parra, COINSA
    'DAN-2026-135': '064f54e2-ac39-47f2-b14a-724ac667a290',       # Jose Luis, ROEN
    'DAN-2026-208': 'ee49f8f2-d977-4738-9edc-a86ac9d2b8a2',       # Oscar Fernandez, FGR
}


def main():
    escribir = '--escribir' in sys.argv
    fs = [json.loads(l) for l in open(FINAL, encoding='utf-8') if l.strip()]
    ops = {o['codigo']: o for o in b.leer('oportunidades?select=id,codigo,comunidad_id,quien_lo_trae,quien_persona_comunidad_id,'
                                          'quien_comercial_id&estado=eq.abierta&fecha_apertura=gte.2025-01-01')}
    # Lorman: "el administrador que viene" = el administrador vigente de esa comunidad, si es de Lorman
    adm = {}
    for r in b.leer('comunidad_admin_responsable?select=comunidad_id,puesto(persona_id,empresa(nombre_accesalia))&vigente=is.true'):
        p = r.get('puesto') or {}
        if p and 'LORMAN' in ((p.get('empresa') or {}).get('nombre_accesalia') or '').upper():
            adm[r['comunidad_id']] = p['persona_id']
    plan, c = [], collections.Counter()
    for f in fs:
        o = ops.get(f['codigo'])
        if not o: c['ya no esta abierta'] += 1; continue
        destino, por = f.get('agenda_persona_id'), f['regla']
        emp = (f.get('empresa') or '').upper()
        if not destino and f['regla'] == '3_jefe_empresa':
            destino = next((v for k, v in JEFE.items() if k in emp), None)
            if not destino and 'LORMAN' in emp: destino = adm.get(o['comunidad_id'])
        if f['codigo'] in CONTRATA_CONTACTO:
            destino, por = CONTRATA_CONTACTO[f['codigo']], 'contrata_contacto'
        if destino:
            if o['quien_lo_trae'] == destino and not o['quien_persona_comunidad_id']: c['ya igual'] += 1; continue
            plan.append((o['id'], {'quien_lo_trae': destino, 'quien_persona_comunidad_id': None})); c['escribe: ' + por] += 1
        elif o['quien_lo_trae'] or o['quien_persona_comunidad_id']:
            # "se vacian" (Monica): lo que hay hoy no lo respalda ninguna fuente, o la fuente dice otra persona que
            # aun no esta en la agenda (esa queda pendiente de dar de alta).
            plan.append((o['id'], {'quien_lo_trae': None, 'quien_persona_comunidad_id': None}))
            c['vacia: ' + ('nada lo dice' if f['regla'] == '4_vacio' else 'es otra persona, aun no en la agenda')] += 1
        else:
            c['no se toca (pendiente o ya vacia)'] += 1
    for k, v in sorted(c.items()): print('   %-40s %d' % (k, v))
    if not escribir: print('\n(marcha en seco)'); return
    for oid, cambios in plan: b.actualizar('oportunidades?id=eq.' + oid, cambios)
    print('escritas: %d' % len(plan))


if __name__ == '__main__':
    main()
