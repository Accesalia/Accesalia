# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda RESTO: las letras sueltas (U: urgel25; W: witerico20; Z: zaida20, zaida22, zurbano23; y 2demayo6). 7-oct-2026. Sin --escribir: marcha en seco.
# La T (madrid_t.py) y la V (en tres trozos) se preparan a la vez.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de, _lineas

PU.update(barbara_atiko='3be7307e-e30e-4a53-b5da-3048d6758f54')

crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))


def bloque(c, i, j):
    """lineas i..j (incluidas) de la ficha, sin las vacias."""
    return '\n'.join(l for l in _lineas(c)[i:j + 1] if l.strip()).strip()


# ================================================================= 0. AGENDA (nada nuevo)

# ================================================================= 1. PRODUCCION (1 carpeta, 1 oportunidad)
rellenar('wt20', 'WITERICO 20', 'witerico20', {'fecha_apertura': '2026-04-28',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia: el escaneo 3D y la ficha, 28/04/2026). Contacta: Barbara Mendez (ATIKO GESTION; C/ Amparo 86, 28012; '
                    'administracion@atikogestion.es). Tipo de obra: SILLA SALVAESCALERA. HE enviada 29/04/2026. Comercial interno: ALVARO.'},
    ('plataforma',), n=fijar('witerico20', 2026, ('2026-04-29', 'Sin fecha delante; la fecha va dentro de la nota.')),
    adm=PU['barbara_atiko'], trae_pu=PU['barbara_atiko'], captador=ALVARO, lleva=ALVARO)

# ================================================================= 2. CLON
assert bloque('zaida22', 86, 101).startswith('Buenas tardes Daniel'), bloque('zaida22', 86, 101)[:40]
REVS = [
    ('urgel25', '2024-12-18', 'VANESA (DEL BRIO Y BLANCO)', None, None,
     'URGEL 25 MADRID. Fecha: 12/2024 (dia: la nota, 18/12/2024; el escaneo 3D llega por wetransfer el 19/12/2024). Contacto: Vanesa, de DEL BRIO Y BLANCO '
     '(vanesa@delbrioyblanco.es). Tipo de obra: ASCENSOR. Distrito Carabanchel. CP 28019. Presidenta: Asuncion Perez (1o A; 695 918 889). No es Seo de Urgel (produccion).\n\n'
     + crudo('urgel25', 2024)),
    ('zurbano23', '2025-03-18', 'JOAQUIN (VECINO)', None, None,
     'ZURBANO 23 MADRID. Fecha: 03/2025 (dia: el escaneo y las fotos, 18/03/2025). Contacto: Joaquin, vecino (609 233 446; joaquinmallo@hotmail.com). Tipo de obra: '
     'ACCESIBILIDAD CON ASCENSOR + SUBV. Distrito Chamberi. CP 28010. En la carpeta, el modelo 3D y el informe de viabilidad (mar-2025).\n\n' + crudo('zurbano23', 2025)),
    ('zaida22', '2014-12-12', 'PEDRO ARANDA (THYSSEN)', 'H80074586', '7620209VK3772B',
     'ZAIDA 22 MADRID. Fecha: 12/12/2014 (la de la ficha). Agente comercial: THYSSEN; mediador, Pedro Aranda (659 91 12 43). Contacto: Isabel; y Mariangeles Garcia (659 448 229; '
     'mangelesgarcia@magabogadoscarabanchel.es; dato antiguo, no esta en la agenda), parece la administracion. Tipo de obra: ASCENSOR (presupuestos de Thyssen, Anylor, Acuamol y '
     'Otis, 2014-2015; honorarios, mar-2016). Propiedad: CP ZAIDA 22 (CIF H80074586). Presidente: Jose Alberto Cortes Sanchez (50101503M). CP 28019. Fachada 20,45 m. '
     'PEM 50.000 (residuos 300). Junta de Distrito 11 Carabanchel (Av. Plaza de Toros 17 / Plaza de Carabanchel 1; citas 91 480 35 35); expediente 111/2017/02389, '
     'tecnico Sara. En la carpeta: consulta urbanistica aprobada (sep-2017), proyecto (mar-2017), licencia concedida (abr-2018), certificaciones de obra (jun-dic 2019), fin de '
     'obra (2020), subvenciones (2022) y la reclamacion de la bonificacion del ICIO: denegada (2021), providencia de apremio (feb-2022), reclamacion de la comunidad a TKE y '
     'burofax recibido en Accesalia (jun-2023). En las notas de la ficha, sin fecha, el correo de Pedro Aranda para la consulta urbanistica:\n\n' + bloque('zaida22', 86, 101)),
    ('2demayo6', '2015-04-01', 'LUIS NUNES (THYSSEN)', None, None,
     'CALLE DOS DE MAYO 6 MADRID. Fecha: 04/2015 (dia desconocido; el croquis, la oferta y el plano son del 09/05/2015). Ref: "xxx/2023" (el dwg se volvio a guardar el '
     '24/05/2023 y la ficha el 24/10/2023; no hay notas de 2023). Cliente: THYSSEN (Luis Nunes; en la agenda, Luis Miguel Nunes, de TKE). Tipo de obra: ASCENSOR POR HUECO '
     '(proteccion de escalera). Distrito 01 - Centro (Universidad). No es la Plaza del Dos de Mayo 3 (produccion). Notas de la ficha: "PROTECCION ESCALERA"; "08/05/ Visita a '
     'Junta del distrito. Se plantea consulta urbanistica especial" (sin ano; por los ficheros, 08/05/2015).'),
]
for carp, fecha, trajo, cif, ref, t in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV)

fila('zaida20', '2017-10-16', 'cerrada', MIG, 'PEDRO ARANDA (THYSSEN)', None, None,
     'ZAIDA 20 MADRID. Fecha: 16/10/2017 (la de la ficha). Agente comercial: THYSSEN; mediador, Pedro Aranda. Ficha vacia salvo el contacto y los datos de la Junta, los mismos que '
     'en la de Zaida 22 (Mariangeles Garcia, 659 448 229, mangelesgarcia@magabogadoscarabanchel.es; Junta de Carabanchel, citas 91 480 35 35). Propiedad: CP ZAIDA 20. CP 28019. '
     'Hay un presupuesto (oct-2017).')

# ================================================================= 3. MANIAS: ninguna.

resumen()
