# -*- coding: utf-8 -*-
"""COMUNIDADES DUPLICADAS: la misma direccion con dos CP (Monica, 13-oct-2026: "a lo demas, si, ok, se fusionan";
Castro 2: "Castro 2 y Travesia de Castro 2 son la misma, se fusionan, pero son CALLE, ambos").
Salieron al buscar en Catastro las opps antiguas sin accesos: el acceso ya era de OTRA CP, la de una opp mas reciente.
Sobrevive la CP que ya tiene el acceso (la de la opp abierta, o la del CIF: Manresa 17 H79612396); la del barrido del
9-oct se absorbe. Como Cadalso de los Vidrios 2 -> Herrera Oria 260: se mueven TODAS las referencias, rastro en
fusiones_comunidades, y se borra la absorbida. Despues, la opp antigua se busca en Catastro con el nombre de la
superviviente (scripts/catastro_opps_sin_accesos_todas.mts --solo=...).
  python scripts/fusionar_cp_duplicadas_13oct.py [--escribir]
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
b = arrancar()

PARES = [  # (opp antigua, nombre de la CP del barrido que se absorbe, nombre de la CP superviviente)
    ('DAN-2016-023', 'CP PASEO SANTA MARIA DE LA CABEZA 129 MADRID', 'CP PASEO SANTA MARIA DE LA CABEZA 129-131 MADRID'),
    ('DAN-2016-090', 'CP RIBERA DEL MANZANARES 85 MADRID', 'CP RIBERA DEL MANZANARES 85 MADRID'),
    ('DAN-2016-114', 'CP MANRESA 17 MADRID', 'CP MANRESA 17 MADRID'),
    ('DAN-2016-212', 'CP TRAVESIA CASTRO 2 GETAFE', 'CP CASTRO 2 GETAFE'),
    ('DAN-2017-068', 'CP AV PABLO NERUDA 29 MADRID', 'CP AV PABLO NERUDA 29 MADRID'),
    ('DAN-2017-134', 'CP FERNANDO EL CATOLICO 73 MADRID', 'CP FERNANDO EL CATOLICO 73 MADRID'),
    ('DAN-2022-291', 'CP RIOJA 57 LEGANES', 'CP RIOJA 57 LEGANES'),
    ('DAN-2023-199', 'CP PZ ARTEIJO 14 MADRID', 'CP PLAZA ARTEIJO 14 MADRID'),
]
# Todo lo que apunta a una comunidad (claves foraneas de la base, 13-oct) y lo que la nombra sin clave foranea.
REFS = [('beneficiarios_reparto_caes', 'comunidad_id'), ('comunidad_admin_responsable', 'comunidad_id'),
        ('condicionantes_comunidad', 'comunidad_id'), ('destinatarios_informe', 'comunidad_id'), ('documentos', 'comunidad_id'),
        ('expedientes', 'comunidad_id'), ('hojas_encargo', 'comunidad_id'), ('interaccion_comunidad', 'comunidad_id'),
        ('llamadas', 'donde_comunidad_id'), ('notas_expediente', 'comunidad_id'), ('observaciones_expediente', 'comunidad_id'),
        ('operaciones_caes', 'comunidad_id'), ('oportunidades', 'comunidad_id'), ('personas_comunidad', 'comunidad_id'),
        ('portal_autorizados', 'comunidad_id'), ('portal_recibidos', 'comunidad_id'), ('proyectos', 'comunidad_id'),
        ('relacion_mancomunidad_comunidades', 'mancomunidad_padre'), ('relacion_mancomunidad_comunidades', 'comunidad_hija'),
        ('resumenes_ia', 'comunidad_id'), ('revision_firmadas', 'comunidad_id'),
        ('accesos', 'figura_legal_propietaria_id'), ('puesto', 'figura_legal_propietaria_id'),
        ('comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una', 'figura_legal_propietaria_id'),
        ('cuentas_bancarias', 'titular_id'), ('lineas_facturacion', 'pagador_id')]

for opp, n_abs, n_sup in PARES:
    o = b.leer('oportunidades?codigo=eq.%s&select=id,comunidad_id' % opp)[0]
    ab = b.leer('comunidades?id=eq.%s&select=id,nombre,municipio,cif_comunidad' % o['comunidad_id'])[0]
    assert ab['nombre'] == n_abs, (opp, ab['nombre'])
    sup = [c for c in b.leer('comunidades?nombre=eq.%s&select=id,nombre,cif_comunidad' % n_sup.replace(' ', '%20')) if c['id'] != ab['id']]
    assert len(sup) == 1, (opp, n_sup, sup)
    SUP, ABS = sup[0]['id'], ab['id']
    cuenta = {('%s.%s' % (t, c)): len(b.leer('%s?%s=eq.%s&select=%s' % (t, c, ABS, c))) for t, c in REFS}
    cuenta = {k: v for k, v in cuenta.items() if v}
    print('%s: %s  ->  %s %s | refs: %s' % (opp, ab['nombre'], sup[0]['nombre'], sup[0]['cif_comunidad'] or '', cuenta))
    if not ESCRIBIR:
        continue
    b.leer('figura_legal_propietaria?id_comodin=eq.%s&select=id_comodin' % SUP) or b.insertar(
        'figura_legal_propietaria', [{'id_comodin': SUP, 'figura': 'Comunidad de Propietarios'}])
    for t, c in REFS:
        if cuenta.get('%s.%s' % (t, c)):
            b.actualizar('%s?%s=eq.%s' % (t, c, ABS), {c: SUP})
    quedan = [k for t, c in REFS for k in ['%s.%s' % (t, c)] if b.leer('%s?%s=eq.%s&select=%s' % (t, c, ABS, c))]
    if quedan:
        print('   QUEDAN referencias en %s: no se borra' % quedan)
        continue
    b.insertar('fusiones_comunidades', [{'cif': sup[0]['cif_comunidad'] or ab['cif_comunidad'] or '', 'superviviente_id': SUP, 'absorbida_id': ABS,
               'nombre_absorbida': ab['nombre'], 'municipio': ab['municipio'],
               'motivo': 'La misma direccion con dos CP: la del barrido del 9-oct (opp %s) y la que ya tenia el acceso en Catastro. '
                         '"Se fusionan" (Monica, 13-oct-2026).%s' % (opp, ' Castro 2 y Travesia de Castro 2 son la misma, y son CALLE.' if 'CASTRO' in n_sup else '')}])
    try:
        b.borrar('figura_legal_propietaria?id_comodin=eq.%s' % ABS)
        b.borrar('comunidades?id=eq.%s' % ABS)
        print('   fusionada y borrada la absorbida')
    except Exception as e:
        print('   fusionada; NO se pudo borrar la absorbida (%s): queda sin referencias' % e)
print('ESCRITO' if ESCRIBIR else '(en seco)')
