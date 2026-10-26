# -*- coding: utf-8 -*-
"""CERRAR LAS OPPS ANTIGUAS SIN NADA (Monica, 26-oct-2026: «todas las opps con fecha de apertura 2024 o anterior se
cierran perdidas [...] cerrarlas a mano (un script) y listo»). Corregido por ella el mismo dia:
  - las GANADAS (hoja firmada) NO se cierran;
  - las que tienen FACTURA desaparecen solas con el cambio de la escalera del 26-oct (842164d): no se tocan;
  - las que tienen ALGO RECIENTE (hoja creada desde 2025, nota de una persona en 2026, junta desde jun-2025) tampoco:
    «son las candidatas perfectas a aparecer en Despeja y que decida el comercial»;
  - el resto, las que de verdad se cierran ahora: perdidas, con el motivo
    «Se cierran por antiguas en la migración de octubre de 2026».
El cierre es el mismo que el boton de la ficha (lib/gestionOportunidad.ts, cerrar): una fila en
motivo_cierre_oportunidad (perdido, motivo, fecha, su comercial) y la opp a «cerrada». Se puede reabrir.
La escalera (estado_oportunidad) la pone al dia el barrido de la noche.

  python scripts/opps/cerrar_antiguas_oct2026.py              (en seco: cuenta y deja la lista en un CSV)
  python scripts/opps/cerrar_antiguas_oct2026.py --escribir
"""
import sys, os, csv, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

MOTIVO = 'Se cierran por antiguas en la migración de octubre de 2026'
FIRMADA = {'firmada_recibida', 'ok_comercial', 'hitos_validados', 'primer_cobro', 'a_produccion', 'ok_administracion'}
VIVA = {'enviada', 'ok_daniel', 'pendiente_ok_daniel', 'borrador', 'firma_con_errores'}
SALIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'docs', 'opps', 'cerradas_por_antiguas_oct2026.csv')


def main():
    escribir = '--escribir' in sys.argv
    b = arrancar()
    ops = b.leer('oportunidades?select=id,codigo,nombre,comercial_id,estado,fecha_apertura,creado_en,'
                 'hojas:he_versiones_hoja(estado,creado_en),facturas(estado),notas:notas_oportunidad(fecha,autor_id),'
                 'juntas(fecha_junta)&estado=in.(abierta,pausada)&order=id')
    grupos = {'ganada': [], 'factura': [], 'reciente': [], 'cerrar': []}
    for o in ops:
        apertura = (o['fecha_apertura'] or o['creado_en'])[:10]
        if apertura > '2024-12-31':
            continue
        if any(h['estado'] in FIRMADA for h in o['hojas']):
            grupos['ganada'].append(o)
        elif any(f['estado'] != 'anulada' for f in o['facturas']):
            grupos['factura'].append(o)
        elif (any(h['estado'] in VIVA and h['creado_en'][:10] >= '2025-01-01' for h in o['hojas'])
              or any(n['autor_id'] and (n['fecha'] or '') >= '2026-01-01' for n in o['notas'])
              or any((j['fecha_junta'] or '') >= '2025-06-01' for j in o['juntas'])):
            grupos['reciente'].append(o)
        else:
            grupos['cerrar'].append(o)
    for k, v in grupos.items():
        print('%-9s %d' % (k, len(v)))
    pausadas = [o for o in grupos['cerrar'] if o['estado'] == 'pausada']
    if pausadas:
        raise SystemExit('Hay %d pausadas entre las que se cierran: su pausa habria que cerrarla. Nada escrito.' % len(pausadas))

    with open(SALIDA, 'w', newline='', encoding='utf-8-sig') as fh:
        w = csv.writer(fh, delimiter=';')
        w.writerow(['grupo', 'codigo', 'nombre', 'apertura'])
        for k in ('cerrar', 'reciente'):
            for o in sorted(grupos[k], key=lambda o: (o['fecha_apertura'] or o['creado_en'])):
                w.writerow([k, o['codigo'], o['nombre'], (o['fecha_apertura'] or o['creado_en'])[:10]])
    print('Lista:', os.path.normpath(SALIDA))
    if not escribir:
        print('En seco: nada escrito.')
        return

    hoy = datetime.date.today().isoformat()
    n = b.insertar('motivo_cierre_oportunidad', [{
        'oportunidad_id': o['id'], 'comercial_id': o['comercial_id'], 'resultado_final': 'perdido', 'motivo_perdido': MOTIVO,
        'notas': 'Cerrada por script (Mónica, 26-oct-2026): ' + MOTIVO + '.', 'fecha_cierre': hoy} for o in grupos['cerrar']])
    print('Cierres apuntados:', n)
    ids = [o['id'] for o in grupos['cerrar']]
    for i in range(0, len(ids), 100):
        b.actualizar('oportunidades?estado=eq.abierta&id=in.(%s)' % ','.join(ids[i:i + 100]), {'estado': 'cerrada'})
    print('Opps cerradas:', len(ids))


if __name__ == '__main__':
    main()
