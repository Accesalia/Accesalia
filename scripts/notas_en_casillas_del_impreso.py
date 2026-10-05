# -*- coding: utf-8 -*-
"""
NOTAS ESCRITAS DENTRO DE LAS CASILLAS DEL IMPRESO     (Monica, 5-oct-2026)

Al leer las 75 'notas sin cabecera' resulto que su diario YA estaba en
produccion. Lo unico que faltaba eran anotaciones escritas dentro de las
casillas del formulario (licencia, visado, expediente...). Ella: "yo meteria
todas, sobre todo si tienen fecha. Y si no tienen fecha, tambien, ya que las
hemos detectado. Es info que si no, vamos a perder".

Ademas se parte en dos la nota de Miraflores 12 que se guardo sin fecha con
dos fechas dentro (la fecha iba sola en su linea).

Sin --escribir es marcha en seco. Miraflores solo con --partir-miraflores
(modifica una fila ya guardada).
"""
import csv, io, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar
from leer_fichas import texto_del_docx

FILAS = {f['carpeta']: f for f in csv.DictReader(
    io.open('notas_sin_cabecera.csv', encoding='utf-8'), delimiter='|')}

def lineas(carpeta):
    return [l.strip() for l in texto_del_docx(FILAS[carpeta]['ruta']) if l.strip()]

def tramo(carpeta, desde, hasta):
    """Las lineas desde la que empieza por `desde` hasta la anterior a `hasta`."""
    ls = lineas(carpeta)
    i = next(k for k, l in enumerate(ls) if l.startswith(desde))
    j = next(k for k, l in enumerate(ls) if k > i and l.startswith(hasta))
    return '\n'.join(ls[i:j])

def linea(carpeta, contiene):
    return next(l for l in lineas(carpeta) if contiene in l)

# (carpeta, fecha, texto)
NOTAS = [
    ('italia35', '2023-03-27',
     tramo('italia35', 'Solicitud de fraccionamiento', 'SUPERFICIES A INTERVENIR')),
    ('sanjose9', None, linea('sanjose9', 'hay que recuperar el anexo 2')),
    ('callao31', '2023-10-31', linea('callao31', 'tramitado por el administrador')),
    ('turquia22', None, linea('turquia22', 'Va con compromiso')),
    ('islasbritanicas26', None, linea('islasbritanicas26', 'BODGAN')),
    ('delicias7', None, linea('delicias7', 'MARINA ORTEGA')),
]

MIRAFLORES = '808d3d20-cf22-4677-901b-32bd3d3a0cce'

def main(escribir):
    b = arrancar()
    filas = []
    for carp, fecha, texto in NOTAS:
        oid = FILAS[carp]['opps']
        assert ',' not in oid, carp
        ya = [n['texto'] for n in b.leer('notas_oportunidad?select=texto&oportunidad_id=eq.' + oid)]
        if texto in ya:
            print('YA ESTA', carp); continue
        filas.append({'oportunidad_id': oid, 'fecha': fecha, 'texto': texto,
                      'origen': 'ficha_dropbox'})
        print('== %s  [%s]\n%s\n' % (carp, fecha or 'sin fecha', texto))

    m = b.leer('notas_oportunidad?select=*&id=eq.' + MIRAFLORES)[0]
    uno, dos = m['texto'].split('\n\n', 1)
    print('== miraflores12  PARTIR la nota guardada en dos:')
    print('  [2022-07-06]\n%s\n  [2025-01-08]\n%s\n' % (uno, dos))

    if not escribir:
        print('MARCHA EN SECO: %d notas nuevas + Miraflores partida en dos.' % len(filas))
        return
    print('notas_oportunidad: %d' % b.insertar('notas_oportunidad', filas))
    if '--partir-miraflores' not in sys.argv:
        print('Miraflores 12 NO se toca: modifica una nota ya guardada, pendiente de su OK.')
        return
    b.actualizar('notas_oportunidad?id=eq.' + MIRAFLORES, {'fecha': '2022-07-06', 'texto': uno})
    b.insertar('notas_oportunidad', [{'oportunidad_id': m['oportunidad_id'], 'fecha': '2025-01-08',
                                      'texto': dos, 'origen': 'ficha_dropbox'}])
    print('Miraflores 12 partida.')

if __name__ == '__main__':
    main('--escribir' in sys.argv)
