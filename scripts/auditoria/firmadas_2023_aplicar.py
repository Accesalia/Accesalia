# -*- coding: utf-8 -*-
"""Firmadas de 2023 del Drive (Mónica, 20-oct-2026: «sí, ok»): los 12 contratos de Thyssenkrupp Elevadores de la urb.
Puente Blanca, Majadahonda (31-oct-2019, 2.000 € cada uno: 60 % proyecto visado y presentado, 20 % inicio de la obra
civil, 20 % CFO; transferencia a 60 días o confirming), en PRESUPUESTOS FIRMADOS\\urb puente blanca majadahonda\\contrato
firmado. En la app eran notas de responsabilidad: pasan a CONTRATO con su PDF. Los pagos no se tocan (coinciden; el 2º
20 % se queda como «licencia», que es como lo facturó Thyssen). España 35-1 no tiene contrato en el Drive: sigue nota.
  python scripts/auditoria/firmadas_2023_aplicar.py [--escribir]
"""
import sys, os, re, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402
from pypdf import PdfReader  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
D = r'G:\Mi unidad\MONICA ACCESALIA\PRESUPUESTOS\PRESUPUESTOS FIRMADOS\urb puente blanca majadahonda\contrato firmado'
b = arrancar()
HOJA = {'AVDA ESPAÑA, 35-2': 'HE-2021-0036', 'AVDA ESPAÑA, 35-4': 'HE-2023-0170', 'AVDA ESPAÑA, 35-6': 'HE-2020-0025', 'AVDA ESPAÑA, 35-7': 'HE-2021-0037',
        'AVDA ESPAÑA, 35-8': 'HE-2021-0035', 'NORIAS, 20': 'HE-2021-0034', 'NORIAS, 22': 'HE-2020-0023', 'NORIAS, 24': 'HE-2023-0171',
        'NORIAS, 26': 'HE-2020-0020', 'SANTA BRIGIDA, 1-2': 'HE-2020-0026', 'SANTA BRIGIDA, 1-4': 'HE-2020-0022', 'SANTA BRIGIDA, 1-5': 'HE-2020-0021'}

plan = []
for f in sorted(os.listdir(D)):
    m = re.match(r'DANIEL DE SOTO - (.+?) - \d+\.pdf$', f)
    if not m: continue
    num = HOJA[m.group(1)]
    t = '\n'.join(p.extract_text() or '' for p in PdfReader(os.path.join(D, f)).pages)
    cto = re.search(r'CONTRATO ARQUITECTOS N[ºo] ?(M/\d+)', t).group(1)
    assert 'En Madrid, a 31 de octubre de 2019' in t and '2000 €' in t, f
    h = b.leer('hojas_encargo?select=id,tipo_documento,motivo_sin_firma,oportunidades(nombre),versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(id,notas),'
               'lineas_facturacion(id,importe)&numero_hoja=eq.' + num)[0]
    assert h['tipo_documento'] == 'nota_responsabilidad' and len(h['lineas_facturacion']) == 1 and float(h['lineas_facturacion'][0]['importe']) == 2000, num
    plan.append((h, num, cto, os.path.join(D, f)))
    print('%s %-34s nota -> contrato Thyssen %s (31-oct-2019) | %s' % (num, h['oportunidades']['nombre'][:34], cto, f))
assert len(plan) == 12
if not ESCRIBIR:
    print('EN SECO'); sys.exit()
for h, num, cto, ruta_pdf in plan:
    v = h['versiones_hoja'][0]
    ruta = 'almacen:documentos-comerciales/' + b.subir('documentos-comerciales', 'hojas-encargo/%s/firmada-v1-1-%s.pdf' % (h['id'], v['id'][:8]),
                                                       open(ruta_pdf, 'rb').read(), reemplazar=True)
    nota = ('Contrato de arquitecto %s con Thyssenkrupp Elevadores (31-oct-2019), del Drive: 2.000 €, 60 %% proyecto visado y presentado, 20 %% inicio de la '
            'obra civil, 20 %% CFO; transferencia a 60 días o confirming. Antes nota de responsabilidad: %s (Mónica, %s).' % (cto, h['motivo_sin_firma'], HOY))
    b.actualizar('versiones_hoja?id=eq.' + v['id'], {'pdfs_firmados': [ruta], 'notas': '\n'.join(x for x in (v['notas'], nota) if x)})
    b.actualizar('hojas_encargo?id=eq.' + h['id'], dict(tipo_documento='contrato', responsable_id=None, motivo_sin_firma=None, fecha_firma='2019-10-31',
                 fecha_estado='2019-10-31T00:00:00+00:00', descripcion='Contrato Thyssen %s · %s' % (cto, h['oportunidades']['nombre'])))
    b.actualizar('lineas_facturacion?id=eq.' + h['lineas_facturacion'][0]['id'], {'origen': 'contrato'})
    print(num, 'contrato', cto)
print('ESCRITO')
