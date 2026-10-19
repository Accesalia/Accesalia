# -*- coding: utf-8 -*-
"""FAIN: los 15 «pedidos» sin líneas eran el papel de los CÓDIGOS de facturación de una hoja que ya está en su opp
(Mónica, 19-oct-2026: «adelante con el arreglo»). El papel pasa a ser un documento más de la hoja de verdad (en su
versión firmada, con los códigos anotados) y el pedido vacío se ARCHIVA con la nota «duplicado de …». No se borra nada.

  python scripts/facturacion/fain_codigos_a_su_hoja.py [--escribir]
"""
import sys, os, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
PARES = {  # pedido vacío -> su hoja de verdad
    'HE-2022-0160': 'HE-2022-0013', 'HE-2023-0143': 'HE-2023-0012', 'HE-2024-0207': 'HE-2024-0120', 'HE-2024-0209': 'HE-2024-0149',
    'HE-2024-0214': 'HE-2024-0135', 'HE-2024-0219': 'HE-2024-0174', 'HE-2025-0761': 'HE-2024-0088', 'HE-2025-0762': 'HE-2025-0338',
    'HE-2025-0764': 'HE-2025-0480', 'HE-2025-0765': 'HE-2025-0264', 'HE-2025-0772': 'HE-2025-0603', 'HE-2025-0779': 'HE-2025-0507',
    'HE-2026-0807': 'HE-2026-0203', 'HE-2026-0810': 'HE-2026-0231', 'HE-2026-0822': 'HE-2026-0043',
}
b = arrancar()
plan = []
for vacio, buena in PARES.items():
    v = b.leer('hojas_encargo?select=id,oportunidad_id,estado,descripcion,codigo_anterior&numero_hoja=eq.' + vacio)[0]
    g = b.leer('hojas_encargo?select=id,oportunidad_id,version_firmada_id&numero_hoja=eq.' + buena)[0]
    assert v['oportunidad_id'] == g['oportunidad_id'], vacio
    assert not b.leer('lineas_facturacion?select=id&hoja_encargo_id=eq.' + v['id'], False), vacio
    vv = b.leer('versiones_hoja?select=id,notas,pdfs_firmados&hoja_encargo_id=eq.' + v['id'])
    assert len(vv) == 1
    gid = g['version_firmada_id'] or b.leer('versiones_hoja?select=id&order=numero_version.desc&limit=1&hoja_encargo_id=eq.' + g['id'], False)[0]['id']
    gv = b.leer('versiones_hoja?select=id,notas,pdfs_firmados&id=eq.' + gid)[0]
    nuevos = [p for p in (vv[0]['pdfs_firmados'] or []) if p not in (gv['pdfs_firmados'] or [])]
    plan.append((vacio, buena, v, vv[0], gv, nuevos))
    print('%s -> %s: %d papel(es) | %s' % (vacio, buena, len(nuevos), v['descripcion'][:80]))
if not ESCRIBIR:
    print('EN SECO'); sys.exit()

for vacio, buena, v, vv, gv, nuevos in plan:
    codigos = v['descripcion'].split(' · ')[0]
    b.actualizar('versiones_hoja?id=eq.' + gv['id'], {'pdfs_firmados': (gv['pdfs_firmados'] or []) + nuevos, 'notas': '\n'.join(x for x in (gv['notas'],
                 'Códigos de facturación de FAIN: %s. Papel guardado antes aparte como %s%s (Mónica, %s).'
                 % (codigos, vacio, ' / ' + v['codigo_anterior'] if v['codigo_anterior'] else '', HOY)) if x)})
    b.actualizar('versiones_hoja?id=eq.' + vv['id'], {'notas': '\n'.join(x for x in (vv['notas'],
                 'DUPLICADO de %s: era solo el papel de los códigos de FAIN; el papel está ahora en esa hoja (Mónica, %s).' % (buena, HOY)) if x)})
    b.actualizar('hojas_encargo?id=eq.' + v['id'], {'estado': 'archivada', 'fecha_estado': HOY + 'T00:00:00+00:00'})
print('ESCRITO')
