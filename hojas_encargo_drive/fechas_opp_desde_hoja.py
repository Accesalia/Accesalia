# Opps abiertas DESPUES de su hoja firmada (Monica, 8-oct-2026): "se cambia la fecha de la opp y se
# hace = fecha de la hoja". Fecha de apertura = la de la hoja MAS ANTIGUA de la opp (firmada o no).
# El codigo de la opp (p. ej. DAN-2026-161 con hoja de 2025) NO se toca.
import sys, collections
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base

O = {o['id']: o for o in base.leer('oportunidades?select=id,codigo,fecha_apertura')}
hojas = collections.defaultdict(list)
for h in base.leer('hojas_encargo?select=oportunidad_id,fecha_creacion,estado'): hojas[h['oportunidad_id']].append(h)
cambios = {oid: min(h['fecha_creacion'] for h in hs) for oid, hs in hojas.items()
           if any(h['estado'] == 'devuelta_firmada' and h['fecha_creacion'] < O[oid]['fecha_apertura'] for h in hs)}
for oid, f in sorted(cambios.items(), key=lambda x: O[x[0]]['codigo']):
    base.actualizar(f'oportunidades?id=eq.{oid}', {'fecha_apertura': f})
    print(O[oid]['codigo'], O[oid]['fecha_apertura'], '->', f)
print('opps corregidas', len(cambios))
