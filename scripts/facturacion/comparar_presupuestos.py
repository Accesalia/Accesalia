# -*- coding: utf-8 -*-
"""Empareja cada presupuesto de Factusol con el de la app y los compara (Monica, 10-oct-2026). SOLO LEE.

Pareja = mismo cliente (NIF igual, o las palabras de la direccion del nombre del cliente dentro del nombre de la
comunidad/pagador de la app) y, si hay varios, la fecha mas cercana. Luego se compara el total (base, sin IVA) y el
numero de lineas. Salida: comparacion.json + resumen.

  python scripts/facturacion/comparar_presupuestos.py <carpeta_salida>
"""
import sys, os, re, json, unicodedata, collections, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

VACIAS = {'CP', 'CDAD', 'CADAD', 'CMDA', 'CDA', 'P', 'PROP', 'EDIFICIO', 'RESIDENCIAL', 'EXISTENTE', 'EN', 'COMUNIDAD', 'PROPIETARIOS', 'DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL', 'Y', 'CL', 'CALLE', 'C',
          'AV', 'AVDA', 'AVENIDA', 'PZ', 'PLAZA', 'PS', 'PASEO', 'N', 'NO', 'MADRID', 'SL', 'SA', 'SLU'}


def pal(t):
    s = unicodedata.normalize('NFD', str(t or '').upper()); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return [p for p in re.sub(r'[^A-Z0-9 ]', ' ', s).split() if p not in VACIAS]


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    b = arrancar()
    ps = b.leer('presupuestos?select=id,origen,empresa_emisora,anio,numero,fecha,estado,pagador_nombre,pagador_nif,base,total,'
                'oportunidad_id,notas,presupuesto_lineas(id,concepto)')
    fac = [p for p in ps if p['origen'] == 'factusol']
    app = [p for p in ps if p['origen'] == 'app']
    coms = {c['id']: pal(c['nombre']) for c in b.leer('comunidades?select=id,nombre')}
    opp_com = {o['id']: o['comunidad_id'] for o in b.leer('oportunidades?select=id,comunidad_id')}
    por_nif = collections.defaultdict(list)
    for a in app:
        if a['pagador_nif']: por_nif[a['pagador_nif'].upper().replace('-', '')].append(a)
    res, c = [], collections.Counter()
    for f in fac:
        cand = por_nif.get((f['pagador_nif'] or '').upper().replace('-', ''), []) if f['pagador_nif'] else []
        como = 'nif'
        if not cand:
            pf = pal(f['pagador_nombre']); nums = [x for x in pf if x.isdigit()]; letras = [x for x in pf if not x.isdigit()][:3]
            if letras and nums:
                cand = [a for a in app if all(x in pal(a['pagador_nombre']) for x in letras) and nums[0] in pal(a['pagador_nombre'])]
            como = 'nombre'
        if not cand:
            # por la DIRECCION: del nombre del cliente o del texto de las lineas -> comunidad -> sus presupuestos de la app
            textos = [f['pagador_nombre'] or ''] + [m.group(1) for l in f.get('presupuesto_lineas', []) for m in
                      [re.search(r'existente en:?\s*(.{4,80}?)(?:\s+El total|\s+Incluye|[.]|$)', ' '.join((l.get('concepto') or '').split()), re.I)] if m]
            for t in textos:
                pt = pal(t); nums = [x for x in pt if x.isdigit()]; letras = [x for x in pt if not x.isdigit()][:3]
                if not (letras and nums): continue
                cs = {cid for cid, cp in coms.items() if all(x in cp for x in letras) and nums[0] in cp}
                cand = [a for a in app if opp_com.get(a['oportunidad_id']) in cs]
                if cand: como = 'direccion'; break
        if len(cand) > 1:
            # entre los del mismo cliente: primero el de MISMO total, luego el de fecha mas cercana
            fd = datetime.date.fromisoformat(f['fecha']) if f['fecha'] else None
            cand.sort(key=lambda a: (abs(float(a['base'] or 0) - float(f['base'] or 0)) >= 1,
                                     abs((datetime.date.fromisoformat(a['fecha']) - fd).days) if (a['fecha'] and fd) else 9999))
        a = cand[0] if cand else None
        r = {'factusol': '%s %s/%s' % (f['empresa_emisora'], f['anio'], f['numero']), 'fecha_f': f['fecha'], 'cliente': f['pagador_nombre'],
             'base_f': float(f['base'] or 0), 'lineas_f': len(f['presupuesto_lineas']), 'estado_f': f['estado']}
        if not a:
            r['veredicto'] = 'sin pareja en la app'
        else:
            r.update({'app': a['id'], 'como': como, 'varios': len(cand), 'fecha_a': a['fecha'], 'nombre_a': a['pagador_nombre'],
                      'base_a': float(a['base'] or 0), 'lineas_a': len(a['presupuesto_lineas']), 'hojas': (a['notas'] or '').replace('Generado desde las hojas: ', '')})
            d = round(r['base_a'] - r['base_f'], 2)
            r['diferencia'] = d
            r['veredicto'] = 'mismo total' if abs(d) < 1 else ('diferencia pequeña (<10%)' if r['base_f'] and abs(d) / r['base_f'] < 0.10 else 'total distinto')
        c[r['veredicto']] += 1
        res.append(r)
    json.dump(res, open(os.path.join(out, 'comparacion.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('presupuestos de Factusol: %d | de la app: %d' % (len(fac), len(app)))
    for k, n in c.most_common(): print('   %-30s %d' % (k, n))


if __name__ == '__main__':
    main()
