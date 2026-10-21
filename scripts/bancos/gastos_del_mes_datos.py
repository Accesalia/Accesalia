# -*- coding: utf-8 -*-
"""GASTOS DEL MES: los datos de cada gasto habitual y el enlace de cada apunte del banco con su gasto (Monica, 21-oct-2026).

1. A cada gasto habitual: el dia en que suele salir (mediana de 2026 en el banco), como aparece en el banco
   (como_aparece) o que tipos de apunte cuentan como suyos (tipos), y lo que ella ha dicho:
   - Sofise: cada 3 meses (mar, jun, sep, dic), 1.502,89.
   - Intereses de la linea de credito: cada 3 meses, el dia 1 (ene, abr, jul, oct).
   - Scene: UNA licencia, cada año en abril, ~2.700 (lo que se paga a FARO Europe).
   - Bricscad: una por puesto; en abril (2 puestos, 798,60) y en agosto (1 puesto, 399,30), a DGS Proyectos.
   - Revit: por puesto; el mes, por saber.
   - Curso de gestion de Daniel: 4 plazos de ~1.975,93 cada ~3 meses desde septiembre de 2026.
   - Comisiones pagadas en mano (el efectivo de la cuenta de Daniel): solo direccion.
2. Cada apunte de gasto del banco, al gasto de SU empresa que lo reconoce (como_aparece manda sobre tipos; si dos lo
   reconocen, el que toca ese mes).

  python scripts/bancos/gastos_del_mes_datos.py            (en seco: dice lo que haria)
  python scripts/bancos/gastos_del_mes_datos.py --escribir
"""
import sys, os, re, io, collections, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
ACC, DAN = 'accesalia', 'daniel_autonomo'

# concepto -> cambios. tipos/como_aparece en MAYUSCULAS (como se comparan)
DATOS = {
    (ACC, 'Nóminas'): dict(dia=30, tipos=['NÓMINAS']),
    (ACC, 'Seguridad Social'): dict(dia=30, tipos=['SEGURIDAD SOCIAL']),
    (ACC, 'Nómina de Daniel'): dict(dia=29, tipos=['NÓMINA DE DANIEL (LO QUE SACA CADA MES PARA GASTAR)']),
    (ACC, 'Sofise (seguro de Daniel como arquitecto)'): dict(dia=22, tipos=['SEGUROS (EL DE DANIEL COMO ARQUITECTO)'],
                                                             cada='trimestral', meses=[3, 6, 9, 12], importe=1502.89,
                                                             notas='Cada 3 meses (mar, jun, sep, dic). En sep-2026 llegó además otro de 4.744,26'),
    (ACC, 'COAM'): dict(dia=18, tipos=['COAM']),
    (ACC, 'Software y apps'): dict(dia=16, tipos=['SOFTWARE Y APPS', 'APPLE']),
    (ACC, 'Material de oficina'): dict(dia=13, tipos=['MATERIAL DE OFICINA']),
    (ACC, 'Alquiler del local'): dict(dia=7, tipos=['ALQUILER']),
    (ACC, 'Tickets restaurante (empleados)'): dict(dia=24, tipos=['TICKETS RESTAURANTE (EMPLEADOS)']),
    (ACC, 'Préstamo BBVA'): dict(dia=4, como_aparece=['AMORTIZACION DE PRESTAMO', 'RECOBRO DEUDA VENCIDA']),
    (ACC, 'FARO (renting Siemens)'): dict(dia=7, como_aparece=['SIEMENS FINANCIAL'],   # antes «FARO» (se renombro en la 1.a pasada)
                                          tipos=['SIEMENS (RENTING DEL FARO, EL ESCÁNER DE NUBE DE PUNTOS)']),
    (ACC, 'Pequeños gastos'): dict(dia=18, tipos=['PEQUEÑOS GASTOS (PARTIDA MENSUAL)']),
    (ACC, 'Préstamo La Caixa'): dict(dia=1, como_aparece=[r'^PRES\.32413889744']),
    (ACC, 'Préstamo La Caixa (feb-2026, 13.386)'): dict(dia=1, como_aparece=[r'^PRES\.32641734910']),
    (ACC, 'GMA (gestoría)'): dict(dia=22, como_aparece=['GONZALO MALLO']),
    (ACC, 'Jeep'): dict(dia=20, como_aparece=['STELLANTIS'], tipos=['JEEP']),
    (ACC, 'Luz del local'): dict(dia=11, tipos=['LUZ DEL LOCAL']),
    (ACC, 'Zoe'): dict(dia=15, como_aparece=['RCI BANQUE'], tipos=['RENAULT (EL ZOE, COCHE DE EMPRESA)']),
    (ACC, 'Restaurantes'): dict(dia=20, tipos=['RESTAURANTES']),
    (ACC, 'Combustible'): dict(dia=20, tipos=['COMBUSTIBLE']),
    (ACC, 'Asisa'): dict(dia=6, tipos=['ASISA']),
    (ACC, 'Servicio de prevención (Quirón)'): dict(dia=23, tipos=['SERVICIO DE PREVENCIÓN (QUIRÓN)']),
    (ACC, 'Simyo (teléfono)'): dict(dia=28, tipos=['SIMYO']),
    (ACC, 'Gastos bancarios'): dict(dia=16, tipos=['GASTOS BANCARIOS']),
    (ACC, 'Dropbox'): dict(dia=22, tipos=['DROPBOX']),
    (ACC, 'Prosegur'): dict(dia=30, tipos=['PROSEGUR']),
    (ACC, 'Monday'): dict(dia=9, tipos=['MONDAY']),
    (ACC, 'Agua'): dict(dia=12, tipos=['CANAL ISABEL II']),
    (ACC, 'Seguros (Generali, Allianz, Zurich)'): dict(dia=7, tipos=['SEGUROS']),
    (ACC, 'Línea de crédito La Caixa (intereses)'): dict(dia=1, como_aparece=[r'^LIQUIDACION CTA'], cada='trimestral',
                                                          meses=[1, 4, 7, 10], importe=200,
                                                          notas='Se liquida el día 1 de ene, abr, jul y oct (entre 160 y 340)'),
    (ACC, 'Licencia Scene'): dict(dia=7, como_aparece=['FARO EUROPE'], cada='anual', meses=[4], importe=2700,
                                  accion='Pedir la renovación a FARO', notas='Una sola licencia (Mónica, 21-oct). 2.175 en mar-2025, 2.450 en abr-2026'),
    (ACC, 'Licencias Revit'): dict(accion='Revisar cuántos puestos hacen falta', notas='Una por puesto. ¿En qué mes se renueva?'),
    (ACC, 'Ford'): dict(como_aparece=['FCE BANK', 'FORD CREDIT']),
    (DAN, 'Casa'): dict(dia=17, tipos=['CASA']),
    (DAN, 'Mutualidad de Daniel (HNA)'): dict(dia=4, tipos=['HNA']),
    (DAN, 'Préstamo La Caixa (abr-2025, 60.000)'): dict(dia=1, como_aparece=[r'^PRES\.3252296076']),
    (DAN, 'Seguros de Daniel'): dict(dia=1, tipos=['SEGUROS', 'SEGUROS (OTRO DE DANIEL COMO AUTÓNOMO)']),
}
NUEVOS = [
    dict(empresa=ACC, concepto='Licencias Bricscad (2 puestos)', importe=798.60, cada='anual', meses=[4], dia=28,
         como_aparece=['DGS PROYECTOS'], accion='Revisar cuántos puestos hacen falta', notas='Una por puesto (Mónica, 21-oct)'),
    dict(empresa=ACC, concepto='Licencia Bricscad (1 puesto)', importe=399.30, cada='anual', meses=[8], dia=18,
         como_aparece=['DGS PROYECTOS'], accion='Revisar cuántos puestos hacen falta', notas='Una por puesto (Mónica, 21-oct)'),
    dict(empresa=ACC, concepto='Curso de gestión de Daniel', importe=1975.93, cada='plazos', meses=[9, 12, 3, 6], dia=11,
         desde='2026-09-01', hasta='2027-06-30', como_aparece=['JUANELIASCAMPO'],
         notas='4 plazos, cada ~3 meses (Mónica, 21-oct). Ojo: confirmar los meses'),
    dict(empresa=DAN, concepto='Comisiones pagadas en mano', importe=4500, cada='mensual', dia=12, solo_direccion=True,
         tipos=['COMISIONES PAGADAS EN MANO (EFECTIVO)'], notas='El efectivo de la cuenta de Daniel (Mónica, 21-oct). Media ene-sep 2026'),
    dict(empresa=DAN, concepto='Pequeños gastos', importe=127, cada='mensual', dia=18,
         tipos=['PEQUEÑOS GASTOS (PARTIDA MENSUAL)'], notas='Media ene-sep 2026 del banco'),
]
EMPRESA_DE_CUENTA = {'caixa_accesalia': ACC, 'bbva_accesalia': ACC, 'caixa_daniel': DAN}


def main():
    b = arrancar()
    gastos = b.leer('gastos_habituales?select=id,empresa,concepto,cada,meses&order=concepto')
    por = {(g['empresa'], g['concepto']): g for g in gastos}
    for k in DATOS:
        if k not in por:
            raise SystemExit(f'No encuentro el gasto {k}')
    for n in NUEVOS:
        if (n['empresa'], n['concepto']) in por:
            raise SystemExit(f"Ya existe {n['concepto']}: no se crea dos veces")
    print(f'{len(DATOS)} gastos a completar, {len(NUEVOS)} nuevos')
    if ESCRIBIR:
        for (emp, con), cambios in DATOS.items():
            b.actualizar('gastos_habituales?id=eq.' + por[(emp, con)]['id'], cambios)
        claves = sorted({k for n in NUEVOS for k in n})   # PostgREST pide las mismas claves en todas las filas
        b.insertar('gastos_habituales', [dict(origen='extracto', **{k: n.get(k, False if k == 'solo_direccion' else None) for k in claves}) for n in NUEVOS])
        gastos = b.leer('gastos_habituales?select=id,empresa,concepto,cada,meses,como_aparece,tipos&order=concepto')
    else:   # en seco: los gastos como quedarian
        gastos = [dict(g, **{k: v for k, v in DATOS.get((g['empresa'], g['concepto']), {}).items()}) for g in gastos]
        gastos += [dict(n, id='nuevo:' + n['concepto']) for n in NUEVOS]

    # 2. el enlace de cada apunte de gasto con su gasto habitual
    movs = b.leer('movimientos_bancarios?select=id,cuenta,fecha,concepto,mas_datos,tipo&clase=eq.gasto&order=id')
    asignar, sin = collections.defaultdict(list), collections.Counter()
    for m in movs:
        emp = EMPRESA_DE_CUENTA[m['cuenta']]
        t = (m['concepto'] + ' ' + (m['mas_datos'] or '')).upper()
        tipo = (m['tipo'] or '').upper()
        mes = int(m['fecha'][5:7])
        cand = [g for g in gastos if g['empresa'] == emp and any(re.search(p, t) for p in (g.get('como_aparece') or []))]
        if not cand:
            cand = [g for g in gastos if g['empresa'] == emp and tipo in [x.upper() for x in (g.get('tipos') or [])]]
        if not cand:
            sin[m['tipo']] += 1
            continue
        cand.sort(key=lambda g: 0 if (g.get('meses') and mes in g['meses']) else 1)
        asignar[cand[0]['id']].append(m['id'])
    nombre = {g['id']: f"{g['empresa'][:3]} · {g['concepto']}" for g in gastos}
    for gid, ids in sorted(asignar.items(), key=lambda x: -len(x[1])):
        print(f'{len(ids):5d}  {nombre[gid]}')
    print('sin gasto habitual (saldrán en «Sin prever»):', sum(sin.values()))
    for t, n in sin.most_common(15):
        print(f'      {n:4d}  {t}')
    if ESCRIBIR:
        for gid, ids in asignar.items():
            for i in range(0, len(ids), 80):
                b.actualizar('movimientos_bancarios?id=in.(' + ','.join(ids[i:i + 80]) + ')', {'gasto_habitual_id': gid})
        print('enlazados:', sum(len(v) for v in asignar.values()))


if __name__ == '__main__':
    main()
