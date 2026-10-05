# -*- coding: utf-8 -*-
"""
LAS 75 FICHAS CUYO DIARIO NO TIENE CABECERA     (Monica, 4-oct-2026)

Deja 'notas_sin_cabecera.csv' con una fila por carpeta: su comunidad, sus
oportunidades y la COLA del documento -lo que va detras de la ultima seccion
conocida-, que es donde esta el diario.

Por que hace falta: estas fichas escriben el diario pegado detras de
'DATOS ENCARGO', sin la etiqueta NOTAS, asi que el lector normal no lo ve. Y el
lector de las apartadas si lo ve pero arrastra los valores sueltos del impreso
que van justo antes (el PEM, el numero de visado, una X).

Ella: "como este es el caso de PRODUCCION, no del clon, y es relevante para el
futuro, no me fio del script: prefiero leerlas una a una, aunque tardemos mas".
Asi que esto NO extrae: solo pone delante lo que hay que leer.

5-oct-2026: la primera version comparaba trozo entero y letra a letra, y daba
75 cuando el diario YA estaba en produccion: fallaba por las lineas en blanco,
por las marcas ~~ del tachado y porque el primer trozo arrastra el formulario.
Ahora compara LINEA A LINEA sin espacios ni ~~. Lo que queda fuera tras leerlo
a mano (el PEM, los visados, una X) se apunta, linea por linea, en
'notas_sin_cabecera_revisadas.csv' con lo que se decidio. Una carpeta deja de
salir solo si lo que queda fuera es EXACTAMENTE lo ya revisado: si la ficha
cambia, vuelve a salir.
"""
import csv, io, os, re, sys, unicodedata
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar
from leer_fichas import PROVINCIA, es_etiqueta, fichas_de, texto_del_docx
from notas_de_las_apartadas import bloques_de
from notas_de_julio import trocear

BARRA = chr(92)
REVISADAS = 'notas_sin_cabecera_revisadas.csv'
# para comparar: sin marcas de tachado ni espacios de ningun tipo
pelado = lambda s: re.sub(r'\s+', '', (s or '').replace('~~', ''))

def revisadas():
    """{(municipio, carpeta): set(lineas leidas y decididas como formulario)}"""
    r = {}
    if os.path.exists(REVISADAS):
        for f in csv.DictReader(io.open(REVISADAS, encoding='utf-8'), delimiter='|'):
            r.setdefault((f['municipio'], f['carpeta']), set()).add(f['linea'])
    return r
pel = lambda s: ''.join(c for c in unicodedata.normalize('NFKD', s or '')
                        if not unicodedata.combining(c)).lower().replace(' ', '')

def main():
    b = arrancar()
    fichas = {}
    for m in ('ALCORCON', 'ALCOBENDAS', 'FUENLABRADA'):
        for f in csv.DictReader(io.open('fichas_%s.csv' % m.lower(), encoding='utf-8')):
            fichas[(m, pel(f['carpeta']))] = f

    c2com = {}
    for d in b.leer('documentos?select=comunidad_id,origen_ruta_dropbox&origen_ruta_dropbox=not.is.null'):
        p = (d['origen_ruta_dropbox'] or '').replace('/', BARRA).split(BARRA)
        if len(p) >= 4 and p[1].upper() == '1APROVINCIA':
            c2com.setdefault((p[2].upper(), pel(p[3])), d['comunidad_id'])
    if os.path.exists('cotejo_por_direccion.csv'):
        for f in csv.DictReader(io.open('cotejo_por_direccion.csv', encoding='utf-8'), delimiter='|'):
            if f['estado'] == 'ok' and f['comunidad_id']:
                c2com.setdefault((f['municipio'], pel(f['carpeta'])), f['comunidad_id'])

    opps_de, nombres = {}, {}
    for o in b.leer('oportunidades?select=id,comunidad_id&comunidad_id=not.is.null', por_tramos=True):
        opps_de.setdefault(o['comunidad_id'], []).append(o['id'])
    for c in b.leer('comunidades?select=id,nombre&municipio=in.(ALCORCON,ALCOBENDAS,FUENLABRADA)', por_tramos=True):
        nombres[c['id']] = c['nombre']
    guardadas = {}
    for n in b.leer('notas_oportunidad?select=oportunidad_id,texto', por_tramos=True):
        guardadas.setdefault(n['oportunidad_id'], []).append(pelado(n['texto']))
    vistas = revisadas()

    filas = []
    for k, com in sorted(c2com.items()):
        if k not in fichas or com not in opps_de:
            continue
        rutas = fichas_de(os.path.join(PROVINCIA, k[0], fichas[k]['carpeta']))
        if not rutas:
            continue
        bl = bloques_de(rutas[0])
        quiero = [t for _, t in trocear(bl['oportunidad'], None)]
        tengo = '|'.join(t for oid in opps_de[com] for t in guardadas.get(oid, []))
        sin = [l.strip() for t in quiero for l in t.split('\n')
               if l.strip() and pelado(l) not in tengo]
        if not sin or set(sin) <= vistas.get((k[0], fichas[k]['carpeta']), set()):
            continue
        filas.append({'municipio': k[0], 'carpeta': fichas[k]['carpeta'],
                      'comunidad': nombres.get(com, '?'),
                      'opps': ','.join(opps_de[com]), 'ruta': rutas[0],
                      'caracteres': sum(len(t) for t in sin)})

    filas.sort(key=lambda x: (x['municipio'], x['carpeta']))
    with io.open('notas_sin_cabecera.csv', 'w', encoding='utf-8', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=['municipio','carpeta','comunidad','opps','ruta','caracteres'],
                           delimiter='|')
        w.writeheader()
        for f in filas:
            w.writerow(f)
    print('%d carpetas a leer -> notas_sin_cabecera.csv' % len(filas))

if __name__ == '__main__':
    main()
