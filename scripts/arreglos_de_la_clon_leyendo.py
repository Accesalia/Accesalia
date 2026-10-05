# -*- coding: utf-8 -*-
"""
ARREGLOS DE LA TABLA-CLON, LEYENDO LAS FICHAS        (Monica, 5-oct-2026)

La primera pasada por la clon fue parseo; esta es lectura. Ella: "tu estas VIENDO
de verdad lo que pone, con criterio. Todo lo que veas arreglable, arreglalo".

  1. notas_de_la_ficha que son SOLO las etiquetas vacias del impreso viejo
     (Propiedad:, CIF:, PEM:...) -> vacia. "Vacio cuando no hay nada."
  2. trajo_empresa con la ristra '4768850488950037...ADMINISTRADOR DE FINCAS SI NO':
     es basura del impreso que va detras de MEDIADOR, que esta vacio -> vacio.
  3. castillalavieja12: nombre 'Anagrama Comercial:' -> el de su ficha.
  4. angeles12: admin_correo llevaba la cabecera del bloque con una anotacion;
     el correo bueno es el de debajo. La anotacion (fecha incluida) va a la nota.
  5. comunidad_autonoma: 'MADRID' -> 'COMUNIDAD DE MADRID', como en produccion.

Hecho a mano despues, con su OK (5-oct):
  6. Borradas 4 filas que no eran comunidades sino carpetas de trabajo de
     Fuenlabrada: 0-FAIN, 0-MODELOS, 0-plano urbano fuenlabrada dwg, planos chalet codi.
  7. Las 24 carpetas SIN ficha -> comercial_interno = 'Daniel'. Ella: "hasta abril
     de 2025 el unico comercial era Dani, todo lo viejo es suyo. Y si no lo fuera,
     Daniel es el jefe: si quiere reasignar, reasigna. En caso de duda, es de Daniel."

Sin --escribir es marcha en seco.
"""
import re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar

T = 'comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una'
ETQ = (r'^(Propiedad|CIF|Presidente|DNI|Código postal|Referencia catastral|Fachada|PEM|'
       r'residuos|SUPEFICIES|SUPERFICIES|AMBITO ORDENAC\w*|Técnico|Tecnico)\s*:?\s*$')

def solo_etiquetas(t):
    ls = [x for l in re.split(r'[\n\t]', t or '') for x in re.split(r'\s{2,}', l) if x.strip()]
    return bool(ls) and all(re.match(ETQ, x.strip(), re.I) for x in ls)

def main(escribir):
    b = arrancar()
    rs = b.leer(T + '?select=*', por_tramos=True)
    cambios = []   # (id, carpeta, {campo: nuevo}, explicacion)
    for r in rs:
        c = {}
        if solo_etiquetas(r['notas_de_la_ficha']):
            c['notas_de_la_ficha'] = None
        if r['trajo_empresa'] and re.search(r'\d{20,}.*ADMINISTRADOR DE FINCAS', r['trajo_empresa']):
            c['trajo_empresa'] = None
        if r['comunidad_autonoma'] == 'MADRID':
            c['comunidad_autonoma'] = 'COMUNIDAD DE MADRID'
        if r['carpeta'] == 'castillalavieja12' and r['nombre_en_la_ficha'] == 'Anagrama Comercial:':
            c['nombre_en_la_ficha'] = 'CP CASTILLA LA VIEJA 12 FUENLABRADA'
        if r['carpeta'] == 'angeles12' and (r['admin_correo'] or '').startswith('DATOS ADMINISTRADOR'):
            c['admin_correo'] = 'administracion@asesoriasl.com'
            c['notas_de_la_ficha'] = (r['notas_de_la_ficha'] or '') + \
                '\n\nEN LA CABECERA DEL ADMINISTRADOR (Sanchez & Lozano):\n' + r['admin_correo']
        if c:
            cambios.append((r['id'], r['carpeta'], c))
    for campo in ('notas_de_la_ficha', 'trajo_empresa', 'comunidad_autonoma',
                  'nombre_en_la_ficha', 'admin_correo'):
        afect = [cp for _, cp, c in cambios if campo in c]
        print('%-20s %3d  %s' % (campo, len(afect), ', '.join(afect[:25]) if campo != 'comunidad_autonoma' else ''))
    if not escribir:
        print('MARCHA EN SECO: %d filas a tocar.' % len(cambios)); return
    for i, _, c in cambios:
        b.actualizar(T + '?id=eq.' + i, c)
    print('escritas: %d filas' % len(cambios))

if __name__ == '__main__':
    main('--escribir' in sys.argv)
