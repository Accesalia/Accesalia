# -*- coding: utf-8 -*-
"""Sube el PDF de cada factura de Factusol (2025 y 2026) al almacen privado `facturas` y lo apunta en facturas.url_pdf
(Monica, 10-oct-2026).

Los PDF estan en Drive, en FACTURAS ACC Y DAN/<ACCESALIA|DANIEL>/<año>/..., y el nombre empieza por el numero de
factura: "Factura 1-000005 CP PAULAR 1 FUENLABRADA 2ª mitad.pdf" = serie 1, numero 5. Se empareja POR NUMERO EXACTO
(empresa por la carpeta, año por la carpeta), sin adivinar nada. Solo los "Factura ..." y "Abono ...": se saltan justificantes,
proformas, pedidos y presupuestos; los ABONOS ("Abono 6-000012 ...") van a su abono. Ecobalance no tiene carpeta aqui.

  python scripts/facturacion/subir_pdfs_facturas.py [--escribir] [--anios 2020-2024]
17-oct-2026: --anios para los años viejos (por defecto 2025-2026). En 2020-2021 los PDF se llaman a la antigua, en
una carpeta FACTURAS: "000003.ANDES.13.pdf" (sin serie). Ahi el numero del nombre NO siempre es el de la factura (en
Daniel 2020, "000027.cl pedro rubin celix 28 pinto" es la 28): solo se sube si ADEMAS el texto del nombre coincide con
el de la factura (cliente, referencia o lineas). Lo que no coincide va a pdfs_facturas_a_revisar.csv, a mano.
"""
import sys, os, re, collections, unicodedata
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

RAIZ = r'G:\Mi unidad\MONICA ACCESALIA\FACTURAS Y GASTOS ACC Y DAN\FACTURAS ACC Y DAN'
CARPETA = {'accesalia': 'ACCESALIA', 'daniel': 'DANIEL'}
NOMBRE = re.compile(r'^(Factura|Abono)\s+(\d+)\s*-\s*0*(\d+)\b', re.I)
VIEJO = re.compile(r'^0*(\d{1,4})[ ._-]')


def palabras(t):
    t = unicodedata.normalize('NFKD', (t or '').lower()).encode('ascii', 'ignore').decode()
    return set(re.findall(r'[a-z]{4,}|\d+', t)) - {'pdf', 'calle', 'madrid', 'factura'}
SALTAR = ('justificante', 'proforma', 'pedido', 'movimientos', 'presupuesto', 'informes factusol')


def limpio(nombre):
    s = unicodedata.normalize('NFKD', nombre).encode('ascii', 'ignore').decode()
    return re.sub(r'[^A-Za-z0-9._-]+', '_', s).strip('_')


def anios():
    """--anios 2020-2024 o --anios 2023,2024; sin nada, 2025 y 2026."""
    if '--anios' not in sys.argv: return (2025, 2026)
    v = sys.argv[sys.argv.index('--anios') + 1]
    if '-' in v:
        a, z = (int(x) for x in v.split('-'))
        return tuple(range(a, z + 1))
    return tuple(int(x) for x in v.split(','))


def main():
    b = arrancar()
    facs = {(f['tipo'], f['empresa_emisora'], f['anio'], f['serie'], f['numero']): f for f in
            b.leer('facturas?select=id,tipo,empresa_emisora,anio,serie,numero,url_pdf,pagador_nombre,referencia,'
                   'lineas:factura_lineas(concepto)&origen=eq.factusol')}
    viejos, revisar = [], []
    pdfs = collections.defaultdict(list)
    for emp, carpeta in CARPETA.items():
        for anio in anios():
            for dirpath, _, ficheros in os.walk(os.path.join(RAIZ, carpeta, str(anio))):
                if any(x in dirpath.lower() for x in SALTAR): continue
                for fi in ficheros:
                    m = NOMBRE.match(fi)
                    if m and fi.lower().endswith('.pdf'):
                        pdfs[(m.group(1).lower(), emp, anio, m.group(2), int(m.group(3)))].append(os.path.join(dirpath, fi))
                    elif fi.lower().endswith('.pdf') and VIEJO.match(fi) and 'proforma' not in fi.lower():
                        viejos.append(('abono' if 'abono' in dirpath.lower() else 'factura', emp, anio, int(VIEJO.match(fi).group(1)),
                                       os.path.join(dirpath, fi)))
    # Dos PDF con el mismo numero: uno lleva "(NO)" o "ELIMINADA" y el otro es el bueno ("CORRECTA").
    for k, v in pdfs.items():
        buenos = [r for r in v if not re.search(r'\(NO\)|ELIMINADA', os.path.basename(r), re.I)]
        if len(v) > 1 and len(buenos) == 1: pdfs[k] = buenos
    # LOS DE NOMBRE VIEJO: numero (sin serie) + el texto del nombre tiene que estar en la factura.
    for tipo, emp, anio, num, ruta in viejos:
        cand = [k for k in facs if k[0] == tipo and k[1] == emp and k[2] == anio and k[4] == num]
        f = facs[cand[0]] if len(cand) == 1 else None
        texto = ' '.join([f['pagador_nombre'] or '', f['referencia'] or ''] + [l['concepto'] or '' for l in f['lineas']]) if f else ''
        nombre = re.sub(r'^0*\d+[ ._-]', '', os.path.basename(ruta)).rsplit('.', 1)[0]
        if f and cand[0] not in pdfs and palabras(nombre) & palabras(texto):
            pdfs[cand[0]].append(ruta)
        else:
            revisar.append((emp, anio, num, os.path.basename(ruta), (f['pagador_nombre'] if f else 'sin factura con ese numero')))
    if revisar:
        print('PDF de nombre viejo SIN CASAR (a revisar): %d' % len(revisar))
        for r in revisar[:12]: print('   ', r)
        with open('pdfs_facturas_a_revisar.csv', 'w', encoding='utf-8-sig') as fh:
            fh.write('empresa;año;numero en el nombre;fichero;cliente de la factura con ese numero\n')
            for r in revisar: fh.write(';'.join(str(x) for x in r) + '\n')
    dobles = {k: v for k, v in pdfs.items() if len(v) > 1}
    sin_factura = [k for k in pdfs if k not in facs]
    sin_pdf = [k for k, f in facs.items() if k not in pdfs and k[1] in CARPETA and k[2] in anios()]
    print('PDF: %d | con su factura: %d | PDF sin factura en Factusol: %d | facturas sin PDF: %d | numeros con 2+ PDF: %d'
          % (len(pdfs), len(pdfs) - len(sin_factura), len(sin_factura), len(sin_pdf), len(dobles)))
    for k in sorted(sin_factura)[:15]: print('   PDF sin factura:', k, os.path.basename(pdfs[k][0]))
    for k in sorted(sin_pdf)[:30]: print('   factura sin PDF:', k)
    for k, v in list(dobles.items())[:10]: print('   doble:', k, [os.path.basename(x) for x in v])
    if '--escribir' not in sys.argv: print('(marcha en seco)'); return
    hechas = 0
    for k, rutas in pdfs.items():
        f = facs.get(k)
        if not f or f['url_pdf'] or len(rutas) > 1: continue   # los dobles se miran a mano
        ruta = '%s/%s/%s' % (k[1], k[2], limpio(os.path.basename(rutas[0])))
        with open(rutas[0], 'rb') as fh: b.subir('facturas', ruta, fh.read(), reemplazar=True)
        b.actualizar('facturas?id=eq.' + f['id'], {'url_pdf': 'almacen:facturas/' + ruta})
        hechas += 1
        if hechas % 100 == 0: print('  ...', hechas)
    print('subidas: %d' % hechas)


if __name__ == '__main__':
    main()
