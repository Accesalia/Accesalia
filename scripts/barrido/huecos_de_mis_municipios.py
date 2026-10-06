# -*- coding: utf-8 -*-
"""
LO ESCRITO EN LOS HUECOS, para los municipios que se barrieron leyendo (5/6-oct-2026)

El barrido ficha a ficha (34 pequenos + Parla + San Sebastian de los Reyes + Alcala)
cargo el diario (los bloques NOTAS) pero NO lo escrito en los huecos del impreso,
que el otro hilo si rescato en Leganes, Mostoles y Getafe. Para que quede HOMOGENEO
se usa SU extractor (`lineas_de` de scripts/lo_escrito_en_los_huecos.py: mismas
familias, mismo formato "[FAMILIA] texto") y SU cotejo por letras y numeros; solo
cambia el emparejamiento carpeta -> destino, que aqui se hace en memoria para no
reescribir cotejo_por_direccion.csv (que es suyo y se rehace entero):

    - la carpeta tiene fila en la clon  -> se anade a notas_de_la_ficha
    - si no, su oportunidad en produccion -> notas_oportunidad (fecha vacia)

Uso:
    python scripts/barrido/huecos_de_mis_municipios.py MUNICIPIO_CARPETA [...]      <- marcha en seco
    python scripts/barrido/huecos_de_mis_municipios.py MUNICIPIO_CARPETA --escribir
    (MUNICIPIO_CARPETA = el nombre de la carpeta de Dropbox: TRESCANTOS, BUITRAGO DE LOZOYA...)
"""
import io
import os
import re
import sys
import unicodedata
from urllib.parse import quote

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.argv_real = list(sys.argv)
sys.argv = [sys.argv[0]]                      # su modulo lee el municipio de argv al importarse
from lo_escrito_en_los_huecos import lineas_de  # noqa: E402
sys.argv = sys.argv_real
from produccion import arrancar                 # noqa: E402
from leer_fichas import PROVINCIA, fichas_de    # noqa: E402

T = 'comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una'


def limpio(s):
    s = unicodedata.normalize('NFKD', s or '')
    return ''.join(c for c in s if not unicodedata.combining(c)).lower()


GEN = r'(cdad|prop|comunidad|propietarios|calle|avda|avenida|paseo|plaza|carretera)'


def letras(s, muni=None):        # copia literal de cotejar_carpeta_con_comunidad.py
    t = limpio(s)
    if muni:
        t = t.replace(limpio(muni), ' ')
    t = re.sub(r'\b' + GEN + r'\b', ' ', t)
    t = re.sub(r'\b(cl|av|pz|ps|ctra|n|no|num|esc|escalera|portal|fase|bloque|bis|ed|edificio)\b', ' ', t)
    return re.sub(r'[^a-z]', '', t)


numeros = lambda s: set(re.findall(r'\d+', limpio(s)))


def destino(b, carpeta_muni, carp, coms, clon):
    # 1) la clon: por la ruta de Dropbox (el municipio oficial puede no ser el de la carpeta)
    tramo = '\\' + carpeta_muni + '\\' + carp
    filas = [c for c in clon if (c['ruta_dropbox'] or '').upper().endswith(tramo.upper()) or
             (c['ruta_dropbox'] or '').upper().startswith(('MADRID\\1APROVINCIA' + tramo).upper() + '\\')]
    if filas:
        return 'clon', filas
    # 2) produccion, con su cotejo
    lc, nc = letras(carp), numeros(carp)
    cand = []
    for c in coms:
        lo, no = letras(c['nombre'], c['municipio']), numeros(c['nombre'])
        if len(lc) < 4 or len(lo) < 4:
            continue
        pega_letras = lc == lo or (len(lc) >= 6 and lc in lo) or (len(lo) >= 6 and lo in lc)
        pega_num = ((not nc) or (not no) or nc == no or (len(nc) == 1 and nc <= no) or (len(no) == 1 and no <= nc))
        if pega_letras and pega_num:
            cand.append(c)
    return ('opp', cand) if cand else (None, [])


# ---- Limpieza: solo el RUIDO SEGURO. Lo dudoso se queda y se lee.
PLANTILLA_VISITA = ('Con motivo del proyecto', 'Solicitamos su cooperaci', 'En caso de que no vayan', 'Llamando al tlf 644 48 29 71',
                    'Enviando un correo electr', 'Contestando directamente', 'https://forms.gle', 'o escaneando el QR',
                    'Apreciamos su cooperaci', 'left4953000', 'INCLUDEPICTURE')
VACIAS = {'notas:', 'notas', 'propiedad:', 'presidente:', 'codigo postal:', 'referencia catastral:', 'pem: residuos:', 'pem:',
          'cuenta bancaria', 'no tienen', 'no lo se', 'constructora:', 'cdad prop', 'cp', '(madrid)', 'licencia o dr'}
DIA = re.compile(r'^(lunes|martes|miercoles|jueves|viernes|sabado|domingo) \d{1,2} de \w+ \(por la manana', re.I)
# Destinos que el cotejo automatico no acierta (leidos a mano, 6-oct-2026)
DESTINO_A_MANO = {'gregorioizquierdo53': 'GREGORIO IZQUIERDO 53', 'emiliocastelar4': 'EMILIO CASTELAR 4', 'tubo5': 'TUBO 5 HUMERA',
                  'avirun7': 'AV IRÚN 7', 'nuestraseñoradelloreto1': 'NUESTRA SEÑORA DE LORETO 1', 'año1492n6': 'CALLE 1492 NO 6', 'avilustración24': 'AV DE LA ILUSTRACIÓN 24', 'avlosprincipesdeespaña17-19pry_conj': 'AV LOS PRINCIPES DE ESPAÑA 17 Y 19'}
SALTAR = ('abrevadero2portal', 'abrevadero2zonascomunes')   # solo existen como accesos (Monica, 5-oct)
IMPRESO = {'nombre', 'direccion', 'persona de contacto', 'telefono', 'e-mail', 'cif', 'presidente', 'dni presidente', 'notas'}

# ---- Lo LEIDO a mano: (carpeta, como empieza el texto) -> None (fuera) o 'familia|texto bueno'
ARREGLOS = {
    # San Sebastian de los Reyes
    ('avsierra51', 'AVENIDA DE LA SIERRA 51'): None, ('año1492n6', 'CALLE 1492'): None, ('real7', 'REAL 7 SAN'): None,
    ('real9', 'CALLE REAL 9'): None, ('pilar17', '476885048895'): None, ('hontanillas2', 'Servicio Técnico de Urbanismo'): None,
    ('avcolmenarviejo18', '2 ASCENSORES VR'): 'OBRA|2 ASCENSORES VR CON DERRIBO + PLATAFORMA ELEVADORA + SUBV',
    ('jarama1', 'llamadas, sólo whatsapp)'): 'CONTACTO|Presidente Óscar Núñez Martínez: 699 013 984 (no atiende llamadas, sólo WhatsApp) · onumar@gmail.com',
    # Parla
    ('ciudades1', '91 624 03 46 urbanismo'): 'AYUNTAMIENTO|Parla · urbanismo 91 624 03 46',
    ('ciudades1', '91 202 47 24 (Valentín)'): 'AYUNTAMIENTO|Parla · Valentín (urbanismo) 91 202 47 24, de 9 a 14 h',
    ('fuentebella45', 'urbanismo@ayuntamientoparla.es'): 'AYUNTAMIENTO|Parla · urbanismo@ayuntamientoparla.es',
    ('fuentebella68', 'jose manuel Carrasco Alcolea'): 'CONTRATA|José Manuel Carrasco Alcolea <chema1978@hotmail.com> — es la contrata (Constructive Solutions), no el presidente',
    ('sananton70', 'Constructora'): None,
    # Alcala de Henares
    ('alvarodebazan4', '918883300 ext 4242'): 'AYUNTAMIENTO|Alcalá · Jesús Coiduras, técnico municipal · 918883300 ext 4242 · jmcoiduras@ayto-alcaladehenares.es',
    ('alvarodebazan4', 'jmcoiduras@'): None,
    ('cartagena4portal4', '918883300 ext 4242'): 'AYUNTAMIENTO|Alcalá · Jesús Coiduras, técnico municipal · 918883300 ext 4242 · jmcoiduras@ayto-alcaladehenares.es',
    ('cartagena4portal4', 'jmcoiduras@'): None,
    ('santateresa2', '918883300 ext 4242'): 'AYUNTAMIENTO|Alcalá · Jesús Coiduras, técnico municipal · 918883300 ext 4242 · jmcoiduras@ayto-alcaladehenares.es',
    ('santateresa2', 'jmcoiduras@'): None,
    ('barberanycollar48', 'asevillano@'): 'AYUNTAMIENTO|Alcalá · Alejandro Sevillano, arquitecto municipal · asevillano@ayto-alcaladehenares.es',
    ('luisvives11', 'Teléfono 91.888.33.00'): 'AYUNTAMIENTO|Alcalá · Oficina de Atención Urbanística · 91 888 33 00 ext. 4203/4225/4261/4273 · oficinadeatencionurbanistica@ayto-alcaladehenares.es',
    ('luisvives11', 'oficinadeatencionurbanistica@'): None,
    ('plazavilladetalence2', '918883300 Ext.4216'): 'AYUNTAMIENTO|Alcalá · Nacho Huesa, técnico municipal · 918883300 ext. 4216',
    ('plazavilladetalence2', 'PZ VILLA DE TALENCE'): None, ('plazavilladetalence2', 'Cervantes 2, Piso'): None,
    ('moral2', '+34639351942 Luis Javier Parra'): 'CONTRATA|Luis Javier Parra Rodríguez (Schindler Iberia, Service Leader Commercial) · 639 351 942 · javier.parra@schindler.com',
    ('moral2', 'Service Leader Commercial'): None, ('moral2', 'Mobile +34 639351942'): None, ('moral2', 'javier.parra@schindler.com'): None,
    ('moral2', 'Schindler Iberia'): None, ('moral2', 'Río Bullaque'): None,
    ('hernancortes13', 'JAVIER VELASCO (ELECNOR)'): 'CONTACTO|Javier Velasco (Elecnor) fjvelasco@elecnor.com + Omar Rafael Díaz Martínez (Elecnor) ordiaz@elecnor.com',
    ('hernancortes13', '+Omar Rafael'): None, ('hernancortes13', 'ordiaz@elecnor.com'): None, ('hernancortes13', 'Javier velasco'): None,
    ('hernancortes13', 'Javier Velasco Elecnor fjvelasco@elecnor.com LUCIA'): 'CONTACTO|Lucía Dávila (Elecnor)',
    ('hernancortes13', 'Javier Velasco Elecnor'): None, ('hernancortes13', 'fjvelasco@elecnor.com'): None, ('hernancortes13', 'Lucía dávila'): None,
    ('hernancortes13', 'María Martínez (Elecnor)'): 'CONTACTO|María Martínez (Elecnor, jefe de obra) martinez.maria@elecnor.es',
    ('escuelaspias1', 'Boris Céspedes'): None,
    ('escuelaspias1', '<b.cespedes@'): 'CONTRATA|Boris Céspedes (CEGA, jefe de obra) · b.cespedes@ascensorescega.com',
    ('emiliocastelar4', 'To: Administracion Fincas Valero <bufetevalero'): None,
    ('riocifuentes4', 'SUSTITUCIÓN 2 ASCENSORES'): 'OBRA|SUSTITUCIÓN 2 ASCENSORES (no lleva css)',
    ('miguelmoncada5', 'Director de Oficina'): None, ('miguelmoncada5', 'Teniente Ruiz 10'): None, ('miguelmoncada5', 'Tlf. 918 832 093'): None,
    ('vitoria1', 'Septiembre 2020'): None, ('sanasturioserrano1bis', 'Oscar Fernández'): None,
    # Los 34 pequenos
    ('velazquez21a31', 'Sonia Guillén Bravo'): 'CONTRATA|Sonia Guillén Bravo (Luxor Espacios, Dpto. Comercial) · móvil 665481878 · tel. 915211782',
    ('velazquez21a31', 'Departamento Comercial'): None, ('velazquez21a31', 'Cl. Segovia'): None, ('velazquez21a31', 'Móvil. 665481878'): None,
    ('velazquez21a31', 'Tel. 915211782'): None, ('velazquez21a31', 'Fax.'): None, ('velazquez21a31', 'www.luxorespacios'): None,
    ('cañadatoledana2', 'José David Rodriguez'): 'CONTRATA|José David Rodríguez Rodríguez (Emun, ingeniero-supervisor) · 652866533',
    ('cañadatoledana2', 'Ingeniero-Supervisor'): None, ('cañadatoledana2', 'Tfno.: 652866533'): None, ('cañadatoledana2', 'Cuenta'): None,
    ('cañadatoledana2', 'Pl. Mayor, 1'): None, ('cañadatoledana2', 'Madrid'): None,
    ('cañadatoledana2', 'urbanismo@ayto-grinon.es'): 'AYUNTAMIENTO|Griñón · urbanismo@ayto-grinon.es',
    ('lepanto9', '918903644 ext 4644'): 'AYUNTAMIENTO|San Lorenzo de El Escorial · técnico municipal · 918903644 ext 4644 · arosado@aytosanlorenzo.es',
    ('lepanto9', 'arosado@'): None,
    ('madrid38-40', 'Avenida Carabancheles'): None,
    ('madrid79', 'urbanismo al 661413901'): 'AYUNTAMIENTO|Humanes · urbanismo 661413901',
    ('madrid79', 'urbanismo@ayto-humanesdemadrid.es'): 'AYUNTAMIENTO|Humanes · urbanismo@ayto-humanesdemadrid.es (administración) · concejala Rosario Pérez',
    ('madrid79', 'OTROS: ARQUITECTO TÉCNICO'): 'AYUNTAMIENTO|Humanes · arquitecto técnico Agustín Guillén 661 426 787 · arquitectotecnico@ayto-humanesdemadrid.es',
    ('madrid79', 'arquitectotecnico@'): None,
    ('madrid79', 'EXPTE URB/427/2023'): 'AYUNTAMIENTO|Humanes · expediente URB/427/2023 · Raquel (urbanismo) 600726259',
    ('madrid79', '(PATRIMONIO) ROSA CABALLERO'): 'AYUNTAMIENTO|Humanes · Patrimonio: Rosa Caballero 91 6040300 ext 209',
    ('santiagoramonycajal9', '661413901 tlf consultas'): 'AYUNTAMIENTO|Humanes · 661413901 (consultas) · urbanismo@ayto-humanesdemadrid.es',
    ('santiagoramonycajal9', 'urbanismo@ayto-humanesdemadrid.es'): None,
    ('elgreco12', 'Teléfono Departamento de Urbanismo'): 'AYUNTAMIENTO|Mejorada del Campo · Urbanismo 916680500, de 9:00 a 13:30 de lunes a viernes, con CITA PREVIA',
    ('elgreco5', '22 noviembre 2019'): None,
    ('angelbarajas4', 'Fernando: 673 560 260'): None,
    ('angelbarajas4', '91 452 27 00 (PREGUNTAR'): 'AYUNTAMIENTO|Pozuelo · 91 452 27 00 (preguntar por Urbanismo) · licencias@pozuelo.madrid',
    ('angelbarajas4', 'licencias@pozuelo.madrid'): None,
    ('aragon-cerrolaza', 'CALLES ARAGON'): None, ('aragon-cerrolaza', 'CALLE ARAGON Y CERROLAZA'): None,
    ('urbjardindevillarejo', 'URBANZ, JARDIN'): None,
    ('avirun7', 'Crta. Mejorada 1'): None, ('vergara18', 'Crta. Mejorada 1'): None,
    ('mejico39', '916 884 566 - 645 369 037'): 'CONTRATA|Roen · 916 884 566 - 645 369 037',
    ('PedroRubindeCelis28', 'TIPO DE OBRA: INSTALACIÓN DE DOS'): 'OBRA|TIPO DE OBRA: INSTALACIÓN DE DOS ASCENSORES',
    ('buenamadre9', '~~EMPRESA :~~'): None,
    ('castilla13', '1-5 septiembre'): 'OBRA|Inicio de obra previsto: 1-5 septiembre 2026',
    ('federicogarcialorca42', 'comunidad'): None,
    ('galicia8', '912483700. Ext. 3222'): 'AYUNTAMIENTO|Pinto · Ramón Lucas Viña, arquitecto municipal · 912483700 ext. 3222 · rlucas@ayto-pinto.es',
    ('galicia8', 'rlucas@'): None,
    ('belgrado2', 'Cl Ronda de Saliente'): None, ('belgrado3', 'DIRECCIÓN: Cl. Ronda de Saliente'): None,
    ('cobre18', '916789573 (10.30h)'): 'AYUNTAMIENTO|Torrejón · José Ramón Valle, técnico municipal · 916789573 (a partir de las 10:30)',
    ('cuestadelasperdices33', 'CP 45300'): None, ('cuestadelasperdices33', 'Visita nuestra web'): None,
    ('cuestadelasperdices37', 'CP 45300'): None, ('cuestadelasperdices37', 'Visita nuestra web'): None,
    ('abastos78', '(Y RELACIÓN CON EL PROMOTOR)'): 'CONTACTO|Javier Picazo (presidente)',
    ('florida32', 'ASCENSOR (FAIN)'): 'OBRA|ASCENSOR (FAIN) + subvenciones (CDAD)',
}


def arreglo(carp, fam, txt):
    for (c, ini), nuevo in ARREGLOS.items():
        if c == carp and txt.startswith(ini):
            return None if nuevo is None else tuple(nuevo.split('|', 1))
    t = limpio(txt.replace('~', '')).strip(' .:')
    if t in IMPRESO or t.startswith('proyecto basico y de ejecucion'):
        return None
    return fam, txt


def es_ruido(texto, carp, muni):
    t = texto.strip()
    tl = limpio(t).strip(' .')
    if any(t.startswith(p) or p in t for p in PLANTILLA_VISITA) or tl in VACIAS:
        return True
    if '@' in t or re.search(r'\d{3}[\s.]?\d{2,3}[\s.]?\d{2,3}', t.replace(' ', '')) and not re.search(r'\b28\d{3}\b', t):
        return False
    lt, lc = letras(t, muni), letras(carp)
    if lt and lc and len(lc) >= 5 and (lc in lt or lt in lc) and len(t) < 80:      # la direccion de la propia comunidad
        return True
    if limpio(t).strip(' .') in (limpio(muni), 'alcala de henares', 'san sebastian de los reyes', 'ayuntamiento de ' + limpio(muni)):
        return True
    if re.search(r'\b28\d{3}\b', t) and not re.search(r'@|\d{9}|\d{3} \d{2,3} \d{2,3}', t) and len(t) < 90:   # una direccion postal suelta
        return True
    if t.startswith(('Edificio Caser', 'Edificio El Caser', 'C.P San Sebasti', 'Plaza de Constituci', 'Plaza de la Constituci')):
        return True
    return False


def limpiar(lineas, carp, muni):
    """quita el ruido seguro y junta 'Cabecera:' con lo que la sigue."""
    out = []
    for fam_txt in lineas:
        fam, txt = fam_txt[1:fam_txt.index(']')], fam_txt[fam_txt.index(']') + 2:]
        if es_ruido(txt, carp, muni):
            continue
        if DIA.match(limpio(txt)):
            fam, txt = 'OBRA', 'Visita de toma de datos a las viviendas: ' + txt
        if out and out[-1][1].rstrip().endswith(':') and len(out[-1][1]) < 40:
            pf, pt = out.pop()
            fam = pf if pf != 'NOTA' else fam
            txt = pt + ' ' + txt
        out.append((fam, txt))
    # una cabecera que se quedo sola al final no dice nada
    out = [(f, t) for f, t in out if not (t.rstrip().endswith(':') and len(t) < 40)]
    out = [x for x in (arreglo(carp, f, t) for f, t in out) if x]
    return ['[%s] %s' % (f, t) for f, t in out]


def main():
    escribir = '--escribir' in sys.argv
    munis = [a for a in sys.argv[1:] if not a.startswith('-')]
    b = arrancar()
    clon = b.leer(T + '?select=id,municipio,carpeta,ruta_dropbox,notas_de_la_ficha', por_tramos=True)
    total = 0
    for cm in munis:
        base = os.path.join(PROVINCIA, cm)
        coms = b.leer('comunidades?select=id,nombre,municipio,oportunidades(id)&municipio=ilike.%s' % quote(cm.replace(' ', '*')), por_tramos=True)
        coms = [c for c in coms if c['oportunidades']]
        print('\n######## %s (%d comunidades con opp)' % (cm, len(coms)))
        for carp in sorted(os.listdir(base)):
            if not os.path.isdir(os.path.join(base, carp)):
                continue
            rutas = [r for r in fichas_de(os.path.join(base, carp)) if 'conflicto' not in r.lower()]
            if not rutas:
                continue
            lineas, vistas = [], set()
            for r in rutas:
                for fam, texto in lineas_de(r):
                    t = ' '.join(texto.split())
                    if t not in vistas:
                        vistas.add(t); lineas.append('[%s] %s' % (fam, t))
            if carp.startswith(SALTAR):
                continue
            lineas = limpiar(lineas, carp, cm)
            if not lineas:
                continue
            if carp in DESTINO_A_MANO:
                objs = [c for c in coms if c['nombre'].upper().startswith(DESTINO_A_MANO[carp].upper())]
                tipo = 'opp'
            else:
                tipo, objs = destino(b, cm, carp, coms, clon)
            if tipo == 'clon':
                ya = '\n'.join((o['notas_de_la_ficha'] or '') for o in objs)
            elif tipo == 'opp' and len(objs) == 1:
                oid = objs[0]['oportunidades'][0]['id'] if len(objs[0]['oportunidades']) == 1 else None
                ya = '\n'.join(n['texto'] for n in b.leer('notas_oportunidad?select=texto&oportunidad_id=eq.%s' % oid)) if oid else ''
            else:
                ya = ''
            # ya cargado: la linea entera, o su texto sin la etiqueta, ya esta en una nota
            nuevas = [l for l in lineas if l not in ya and l[l.index(']') + 2:] not in ya]
            if not nuevas:
                continue
            dest = ('CLON ' + ','.join(o['carpeta'] for o in objs)) if tipo == 'clon' else \
                   ('OPP ' + objs[0]['nombre'] if tipo == 'opp' and len(objs) == 1 else ('?? ' + ' || '.join(o['nombre'] for o in objs) if objs else '?? SIN DESTINO'))
            print('\n== %s  ->  %s  (%d)' % (carp, dest, len(nuevas)))
            for l in nuevas:
                print('   ' + l[:200])
            total += len(nuevas)
            if escribir and tipo == 'clon' and len(objs) == 1:
                o = objs[0]
                b.actualizar(T + '?id=eq.' + o['id'], {'notas_de_la_ficha': ((o['notas_de_la_ficha'] or '') + '\n\nLO ESCRITO EN LOS HUECOS DE LA FICHA:\n' + '\n'.join(nuevas)).strip()})
            elif escribir and tipo == 'opp' and len(objs) == 1 and len(objs[0]['oportunidades']) == 1:
                b.insertar('notas_oportunidad', [{'oportunidad_id': objs[0]['oportunidades'][0]['id'], 'fecha': None, 'texto': l, 'origen': 'ficha_dropbox'} for l in nuevas])
    print('\nTOTAL lineas: %d %s' % (total, '(ESCRITAS)' if escribir else '(marcha en seco)'))


if __name__ == '__main__':
    main()
