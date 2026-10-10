# -*- coding: utf-8 -*-
"""Hitos de cobro: tipo y FECHA PREVISTA de los que estaban como 'otro' (Monica, 10-oct-2026).

1. TIPO. Los 'otro' cuyo texto dice el momento pasan a su tipo nuevo: pss ("a la firma del acta de seguridad y
   salud"), inicio_obra ("al inicio de (la) obra") y presentacion ("a la presentacion de la (solicitud de)
   subvencion"). Lo que no lo dice, sigue 'otro'.
2. FECHA PREVISTA de los pactados por fecha o por mes ("25% Enero de 2026", "un tercio el 01/04/2024", "4
   mensualidades comenzando el 01/10/2023"), LEIDOS UNO A UNO (tabla FECHAS, por el principio del id del hito): el
   dia que diga, o el dia 1 del mes; "finales de mayo" = el ultimo dia. Los que no dan fecha concreta no se tocan
   (HE-2024-0084 "4 mensualidades" sin mes de inicio; HE-2026-0022 "con la aprobacion del proyecto").
   "Para generar la alerta de facturacion y, sobre todo, la prevision de caja."

  python scripts/facturacion/hitos_tipo_y_fecha.py [--escribir]
"""
import sys, os, re, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

TIPO = [('pss', r'seguridad y salud|\bPSS\b|plan de seguridad'),
        ('inicio_obra', r'inicio de (la )?obra|l inicio de la obra|comienzo de (la )?obra'),
        ('presentacion', r'presentaci[oó]n( de la (solicitud|documentaci[oó]n))?( de)?( la)? (primera )?subvenci|a la presentaci[oó]n')]

M = lambda a, m, d=1: '%04d-%02d-%02d' % (a, m, d)
FECHAS = {
    # HE-2023-0064: 4 mensualidades desde el 01/10/2023
    'bfb9ea09': M(2023, 10), 'be76b19b': M(2023, 11), 'a5fd9cde': M(2023, 12), '6cd0ea91': M(2024, 1),
    # HE-2025-0064: mayo, junio, julio 2025
    '6a9bd960': M(2025, 5), 'da044ce7': M(2025, 6), '95884c12': M(2025, 7),
    # HE-2025-0323: junio, julio, septiembre, octubre (2025)
    'd4593661': M(2025, 6), '28f2372e': M(2025, 7), '2d7c3bf0': M(2025, 9), '00f40623': M(2025, 10),
    # HE-2026-0045: febrero a julio 2026
    '29b80053': M(2026, 2), '815ee18d': M(2026, 3), '4e81681f': M(2026, 4), 'e18eac25': M(2026, 5), 'b412381a': M(2026, 6), 'ac69537c': M(2026, 7),
    # HE-2026-0635: agosto a noviembre 2026
    'b6b98578': M(2026, 8), '170d4706': M(2026, 9), '1e9f62b5': M(2026, 10), '0bd0310b': M(2026, 11),
    # HE-2024-0011: 1/03, 01/04, 01/05/2024
    '41edc979': M(2024, 3), 'b96b432c': M(2024, 4), '3d2ede02': M(2024, 5),
    # HE-2024-0065: julio, agosto, septiembre 2024
    'd603ff42': M(2024, 7), 'd4c89672': M(2024, 8), '7ba03b52': M(2024, 9),
    # HE-2025-0750: enero a abril 2026
    '528d5855': M(2026, 1), 'fd0e85ec': M(2026, 2), '165bc6e2': M(2026, 3), '758e1564': M(2026, 4),
    # HE-2025-0005 (seis lineas): a primeros de febrero, marzo, abril 2025
    'f4c4c74c': M(2025, 2), '1ba13519': M(2025, 3), '66f2fa08': M(2025, 4), 'e42ad48e': M(2025, 2), 'b99a9f20': M(2025, 3), '07dc45f3': M(2025, 4),
    '4e11384b': M(2025, 2), '7bec957d': M(2025, 3), '9433b24c': M(2025, 4), '2b279c95': M(2025, 2), '50585b0a': M(2025, 3), 'ffe7bf3e': M(2025, 4),
    'c3ea984c': M(2025, 2), 'bf014322': M(2025, 3), '110cad8a': M(2025, 4), '20858d62': M(2025, 2), 'f1f372c0': M(2025, 3), '260460d8': M(2025, 4),
    # HE-2025-0009..0018: 1ª mensualidad, enero 2025
    'fb76e971': M(2025, 1), '67644837': M(2025, 1), 'a1365ba4': M(2025, 1), '3e284c8b': M(2025, 1), '70721020': M(2025, 1), '31f1b622': M(2025, 1),
    # HE-2025-0030: a primeros de marzo, abril, mayo 2025
    'd4d131a9': M(2025, 3), '97e6703b': M(2025, 4), '6469d7b3': M(2025, 5),
    # HE-2025-0035 (firmada en junio 2025): junio, septiembre, diciembre, marzo
    '6e5d9243': M(2025, 6), 'da3b85fc': M(2025, 9), '6ad92bc7': M(2025, 12), 'd87f1ec5': M(2026, 3),
    # HE-2025-0067: forma de pago corregida, agosto 2025
    '5b300175': M(2025, 8),
    # HE-2025-0745 (tres lineas, firmada en marzo 2026): 5 pagos de abril a agosto
    'c93fa323': M(2026, 4), 'a3c0401d': M(2026, 5), '8ed04356': M(2026, 6), '09726d20': M(2026, 7), '6c08f7f7': M(2026, 8),
    'a4fee279': M(2026, 4), '94ce4384': M(2026, 5), 'ec91e9cf': M(2026, 6), '8d740991': M(2026, 7), 'c11b043b': M(2026, 8),
    '8845a793': M(2026, 4), '2be38751': M(2026, 5), 'ad418333': M(2026, 6), 'c48c29dd': M(2026, 7), '7fb0ded2': M(2026, 8),
    # HE-2026-0200: a la presentacion; plazo maximo 15/09/2026
    '55408043': M(2026, 9, 15),
    # HE-2026-0450 / 0453 / 0451: segundo cobro, julio 2026
    'cfbb27d6': M(2026, 7), '59834651': M(2026, 7), '71030995': M(2026, 7),
    # HE-2026-0437: finales de mayo y de junio 2026
    '261de31d': M(2026, 5, 31), '5b11f5f9': M(2026, 6, 30),
    # HE-2026-0726 (firmada en septiembre 2026): octubre y diciembre
    '645d90bd': M(2026, 10), 'f95cebca': M(2026, 12),
    # HE-2024-0027 (dos lineas): 1ª, 01/03/2024
    '1d587ae1': M(2024, 3), '5b27d1f3': M(2024, 3),
    # HE-2024-0159 (tres lineas, firmada en diciembre 2024): 25% enero, 25% febrero (2025)
    'a206bf5e': M(2025, 1), 'b1bd6877': M(2025, 2), '7ad54820': M(2025, 1), '0468c95a': M(2025, 2), '53ed4e57': M(2025, 1), '05f43377': M(2025, 2),
}


def main():
    b = arrancar()
    H = b.leer('hitos_cobro?select=id,hito,notas,fecha_prevista')
    tipos, fechas = [], []
    for h in H:
        n = (h['notas'] or '').split('\n')[0]
        if h['hito'] == 'otro' and h['id'][:8] not in FECHAS:
            for t, pat in TIPO:
                # "a la presentacion de la licencia" no es la de la subvencion: sigue 'otro'
                if t == 'presentacion' and re.search(r'licencia', n, re.I): continue
                if re.search(pat, n, re.I): tipos.append((h['id'], t, n)); break
        if h['id'][:8] in FECHAS and not h['fecha_prevista']: fechas.append((h['id'], FECHAS[h['id'][:8]]))
    print('tipo nuevo:', collections.Counter(t for _, t, _ in tipos), '| fechas:', len(fechas), 'de', len(FECHAS))
    for t in ('inicio_obra', 'presentacion'):
        for _, tt, n in [x for x in tipos if x[1] == t][:6]: print('  ', tt, '|', n[:100])
    if '--escribir' not in sys.argv: print('(marcha en seco)'); return
    for hid, t, _ in tipos: b.actualizar('hitos_cobro?id=eq.' + hid, {'hito': t})
    for hid, f in fechas: b.actualizar('hitos_cobro?id=eq.' + hid, {'fecha_prevista': f})
    print('hecho')


if __name__ == '__main__':
    main()
