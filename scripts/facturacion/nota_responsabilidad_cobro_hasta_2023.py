# -*- coding: utf-8 -*-
"""NOTA DE RESPONSABILIDAD DE COBRO (Monica, 26-oct-2026). Las facturas cobradas de 2023 hacia atras no tienen
justificante del banco (antes de 2023 no se descargaban). Para que la app entienda «hay justificante = cobrado» igual
antes que ahora, se les engancha UN MISMO PDF, con sus palabras:

    «Nota de responsabilidad de cobro: se ha comprobado que esta ingresado en cuenta, pero no tenemos justificante
    descargado. Lo damos por ingresado. Monica, oct 2026»

A cuales (sus decisiones del 26-oct):
  - las facturas (no abonos) de 2023 hacia atras en estado «cobrada» y sin ningun justificante;
  - las de 2022 en estado «pendiente», sin justificante: «estas las dejamos como cobradas y les ponemos el
    justificante; es solo que no las hemos marcado bien todavia» -> pasan a «cobrada», con una nota en la factura;
  - FUERA las «cobradas en parte» (la nota diria algo falso) y las anuladas.
Cada justificante: tipo «otro», importe = total de la factura, fecha de cobro = la de la factura («ponemos la misma de
factura»: la real no se sabe), subido por Monica. Los hitos no se tocan.
2025 y 2026 se completaran de otra manera.
SEGUNDA TANDA (Monica, 26-oct-2026: «tb las 90!! y las 51 de 2024»): las pendientes de 2020, 2021 y 2023 sin
justificante pasan a cobradas igual que las de 2022, y las cobradas de 2024 sin justificante llevan la misma nota:
  --anios 2020-2024 --pendientes 2020,2021,2023

  python scripts/facturacion/nota_responsabilidad_cobro_hasta_2023.py            (en seco: solo cuenta)
  python scripts/facturacion/nota_responsabilidad_cobro_hasta_2023.py --escribir
  (por defecto: hasta 2023, y pendientes solo las de 2022, como la primera tanda)
"""
import sys, os, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

MONICA = '52fa7b0f-e72b-4338-b3f8-7ad0833a8ba7'
RUTA = 'justificantes/nota_responsabilidad_cobro_hasta_2023.pdf'
JUSTIFICANTE = 'almacen:facturas/' + RUTA
NOTA_FACTURA = ('Marcada cobrada el 26-oct-2026 (Mónica): estaba en pendiente solo porque no se había marcado; '
                'ingresada en cuenta, con su nota de responsabilidad de cobro.')
LINEAS = [
    (18, 'Nota de responsabilidad de cobro'),
    (12, ''),
    (12, 'Se ha comprobado que está ingresado en cuenta, pero no tenemos'),
    (12, 'justificante descargado. Lo damos por ingresado.'),
    (12, ''),
    (12, 'Mónica'),
    (12, 'Octubre de 2026'),
]


def pdf(lineas):
    """Un PDF de una pagina A4 con Helvetica (WinAnsi: tildes y eñes), sin librerias."""
    def esc(t):
        return t.encode('cp1252').replace(b'\\', b'\\\\').replace(b'(', b'\\(').replace(b')', b'\\)')
    flujo = b'BT\n'
    y = 760
    for tam, txt in lineas:
        flujo += b'/F1 %d Tf 1 0 0 1 72 %d Tm (%s) Tj\n' % (tam, y, esc(txt))
        y -= tam + 10
    flujo += b'ET\n'
    objs = [
        b'<< /Type /Catalog /Pages 2 0 R >>',
        b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
        b'<< /Length %d >>\nstream\n' % len(flujo) + flujo + b'endstream',
    ]
    out = b'%PDF-1.4\n'
    pos = []
    for i, o in enumerate(objs, 1):
        pos.append(len(out))
        out += b'%d 0 obj\n' % i + o + b'\nendobj\n'
    xref = len(out)
    out += b'xref\n0 %d\n0000000000 65535 f \n' % (len(objs) + 1)
    out += b''.join(b'%010d 00000 n \n' % p for p in pos)
    out += b'trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n' % (len(objs) + 1, xref)
    return out


def argumento(nombre, defecto):
    return sys.argv[sys.argv.index(nombre) + 1] if nombre in sys.argv else defecto


def main():
    escribir = '--escribir' in sys.argv
    hasta = int(argumento('--anios', '2020-2023').split('-')[-1])
    pendientes = {int(x) for x in argumento('--pendientes', '2022').split(',')}
    b = arrancar()
    facs = b.leer('facturas?select=id,anio,empresa_emisora,estado,fecha,total,notas,tipo,cobros(id)'
                  '&anio=lte.%d&estado=in.(cobrada,pendiente)' % hasta)
    elegidas = [f for f in facs if f['tipo'] != 'abono' and not f['cobros']
                and (f['estado'] == 'cobrada' or (f['estado'] == 'pendiente' and f['anio'] in pendientes))]
    sin_fecha = [f for f in elegidas if not f['fecha']]
    if sin_fecha:
        raise SystemExit('Hay %d facturas sin fecha: no se puede poner la fecha de cobro. Nada escrito.' % len(sin_fecha))
    cuenta = collections.Counter((f['anio'], f['empresa_emisora'], f['estado']) for f in elegidas)
    for k in sorted(cuenta): print(k, cuenta[k])
    a_cobrada = [f for f in elegidas if f['estado'] == 'pendiente']
    print('Total: %d facturas (%d pasan de pendiente a cobrada), %.2f EUR'
          % (len(elegidas), len(a_cobrada), sum(float(f['total'] or 0) for f in elegidas)))
    if not escribir:
        print('En seco: nada escrito. Con --escribir se sube el PDF y se apunta.')
        return

    b.subir('facturas', RUTA, pdf(LINEAS), reemplazar=True)
    print('PDF subido:', JUSTIFICANTE)
    for f in a_cobrada:
        b.actualizar('facturas?id=eq.%s&estado=eq.pendiente' % f['id'],
                     {'estado': 'cobrada', 'notas': '\n'.join(x for x in (f['notas'], NOTA_FACTURA) if x)})
    print('Pasadas a cobrada:', len(a_cobrada))
    n = b.insertar('cobros', [{
        'factura_id': f['id'], 'fecha_cobro': f['fecha'], 'importe': f['total'], 'tipo': 'otro',
        'justificante': JUSTIFICANTE, 'subido_por': MONICA} for f in elegidas])
    print('Justificantes apuntados:', n)


if __name__ == '__main__':
    main()
