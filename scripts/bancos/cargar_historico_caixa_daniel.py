# -*- coding: utf-8 -*-
"""LA CUENTA DE DANIEL DE ANTES DE 2025 (dic-2022 a dic-2024) EN LA APP (Monica, 21-oct-2026: «la cuenta de Daniel
deberia estar en el Drive»).

Sus Excel de La Caixa (…0191207), del mismo formato que los de ahora, en DANIEL/2023/_movimientos bancarios y
DANIEL/2024/movimientos (y «movimientos antiguos»). Se cosen entre ellos por el saldo y con lo que ya hay (el primer
apunte de 2025 tiene que empalmar), y entran DELANTE (orden negativo). Se clasifican con reglas_movimientos y sus
gastos habituales (la casa, el efectivo = comisiones en mano, HNA…). Y ahora que estan las dos cuentas de esos años,
los traspasos de Accesalia a Daniel se emparejan como internos (mismo importe, ±3 dias).

  python scripts/bancos/cargar_historico_caixa_daniel.py <carpeta con los .xls/.xlsx> [--escribir]
"""
import sys, os, re, glob, uuid, collections
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402
from extractos_en_seco import leer_caixa, coser  # noqa: E402
from cargar_historico_caixa_accesalia import prueba  # noqa: E402

CUENTA = 'caixa_daniel'


def main():
    carpeta = sys.argv[1]
    b = arrancar()
    tramos = [(os.path.basename(f), leer_caixa(f)) for f in sorted(glob.glob(os.path.join(carpeta, '*0191207*')))]
    filas, informe, roturas = coser(tramos)
    if roturas:
        raise SystemExit(f'el saldo no cuadra entre los ficheros: {roturas[:3]}')
    primera = b.leer(f'movimientos_bancarios?select=orden,fecha,importe,saldo&cuenta=eq.{CUENTA}&order=orden.asc&limit=1', por_tramos=False)[0]
    clave = (primera['fecha'], round(float(primera['importe']), 2), round(float(primera['saldo']), 2))
    pos = [i for i, f in enumerate(filas) if (f['fecha'].isoformat(), f['importe'], f['saldo']) == clave]
    if not pos:
        raise SystemExit(f'no empalma con lo que hay: no encuentro el primer apunte cargado ({clave})')
    nuevas = filas[:pos[0]]
    print(f"{len(filas)} filas cosidas ({filas[0]['fecha']} → {filas[-1]['fecha']}); entran {len(nuevas)} "
          f"({nuevas[0]['fecha']} → {nuevas[-1]['fecha']}) y empalman con el primer apunte de la app {clave}")
    cargar(b, nuevas, primera, '--escribir' in sys.argv)


def cargar(b, nuevas, primera, escribir):
    """Clasifica y mete delante de lo que hay (orden negativo) las filas `nuevas` (formato de leer_caixa)."""
    reglas = b.leer('reglas_movimientos?select=id,orden,sentido,patron,cuenta,tipo,se_repite,solo_direccion&activa=eq.true&order=orden')
    gastos = b.leer('gastos_habituales?select=id,empresa,como_aparece,tipos,meses&empresa=eq.daniel_autonomo')
    orden = int(primera['orden']) - len(nuevas)
    out, cuenta = [], collections.Counter()
    for f in nuevas:
        t = (f['movimiento'] + ' ' + f['mas_datos']).upper()
        fila = dict(id=str(uuid.uuid4()), cuenta=CUENTA, orden=orden, fecha=f['fecha'].isoformat(),
                    fecha_valor=f['fecha_valor'].isoformat() if f['fecha_valor'] else None, concepto=f['movimiento'], mas_datos=f['mas_datos'] or None,
                    importe=f['importe'], saldo=f['saldo'], referencia=None, fichero_origen=f.get('fichero'), clase='ingreso' if f['importe'] > 0 else 'gasto',
                    tipo=None, se_repite=None, como_se_sabe=None, regla_id=None, gasto_habitual_id=None, solo_direccion=False, mes_imputado=None)
        orden += 1
        sentido = 'ingreso' if f['importe'] > 0 else 'gasto'
        if f['movimiento'].upper().startswith('DETIR'):
            fila.update(clase='devolucion', como_se_sabe='devolución de una remesa (DETIR)')
        elif re.search(r'ACCESALIA|02002789|SOLUCIONES ACCESIBILIDAD', t) and not re.search(r'NOMINA', t):
            # a o desde la cuenta de Accesalia aunque no aparezca su pareja (Monica, 21-oct)
            fila.update(clase='interno', como_se_sabe='a o desde la cuenta de Accesalia')
        else:
            rg = next((r for r in reglas if r['sentido'] == sentido and r['cuenta'] in (None, CUENTA) and prueba(r['patron'], t)), None)
            if rg:
                fila.update(tipo=rg['tipo'], regla_id=rg['id'], se_repite=rg['se_repite'] if sentido == 'gasto' else None,
                            solo_direccion=rg['solo_direccion'], como_se_sabe=f"regla: «{rg['patron']}»")
            if sentido == 'gasto':
                mes = f['fecha'].month
                cand = [g for g in gastos if any(prueba(p, t) for p in (g['como_aparece'] or []))]
                if not cand and rg:
                    cand = [g for g in gastos if rg['tipo'].upper() in [x.upper() for x in (g['tipos'] or [])]]
                cand.sort(key=lambda g: 0 if g['meses'] and mes in g['meses'] else 1)
                if cand:
                    fila['gasto_habitual_id'] = cand[0]['id']
                    fila['como_se_sabe'] = fila['como_se_sabe'] or 'como aparece en el banco, su gasto habitual'
                elif not rg:
                    # Monica, 21-oct: «lo de esos años que sobre, sí, personal de Daniel» (él mezclaba mucho)
                    fila.update(tipo='PERSONAL DE DANIEL', se_repite='no', como_se_sabe='Mónica, 21-oct: lo que sobra de antes de 2025 en la cuenta de Daniel, personal')
        if (fila['tipo'] or '').startswith('PRÉSTAMO DE MÓNICA A DANIEL (sin devolver)'):
            fila['tipo'] = 'PRÉSTAMO DE MÓNICA A DANIEL (devuelto)'   # los de antes constan devueltos (Monica, 21-oct)
        cuenta[(fila['clase'], fila['tipo'] or ('(gasto habitual)' if fila['gasto_habitual_id'] else '—'))] += 1
        out.append(fila)
    for (c, t), n in sorted(cuenta.items(), key=lambda x: -x[1])[:25]:
        print(f'{n:5d}  {c:10s} {t}')

    # Los internos con Accesalia de esos años (mismo importe, ±3 dias, uno sale y el otro entra)
    import datetime
    acc = b.leer(f"movimientos_bancarios?select=id,fecha,importe,clase,interno_con&cuenta=eq.caixa_accesalia&fecha=gte.{out[0]['fecha']}&fecha=lte.{out[-1]['fecha']}")
    usados, parejas = set(), []
    d = lambda s: datetime.date.fromisoformat(s)
    for x in out:
        if x['clase'] not in ('ingreso', 'gasto') or x['tipo'] in ('NÓMINAS',):
            continue
        t = (x['concepto'] + ' ' + (x['mas_datos'] or '')).upper()
        for a in acc:
            if a['id'] in usados or a['interno_con'] or abs(float(a['importe']) + x['importe']) > 0.011 or abs((d(a['fecha']) - d(x['fecha'])).days) > 3:
                continue
            if x['importe'] > 0 and not re.search(r'TRASPASO|TRANSF|SOLUCIONES|ACCESAL|SOTO', t) and a['clase'] != 'interno':
                continue
            usados.add(a['id'])
            parejas.append((x, a))
            x.update(clase='interno', tipo=None, gasto_habitual_id=None, interno_con=a['id'],
                     como_se_sabe=f"sale de una cuenta nuestra y entra en otra el {a['fecha']}, mismo importe")
            break
    print('internos emparejados con Accesalia:', len(parejas))
    if escribir:
        if b.leer(f"movimientos_bancarios?select=id&cuenta=eq.{CUENTA}&fecha=lt.{nuevas[-1]['fecha'].isoformat()}&fecha=gte.{nuevas[0]['fecha'].isoformat()}&limit=1", por_tramos=False):
            raise SystemExit('ya hay apuntes de esas fechas: no se carga dos veces')
        claves = sorted({k for x in out for k in x})
        b.insertar('movimientos_bancarios', [{k: x.get(k) for k in claves} for x in out])
        for x, a in parejas:
            b.actualizar('movimientos_bancarios?id=eq.' + a['id'], {'clase': 'interno', 'interno_con': x['id'], 'tipo': None, 'gasto_habitual_id': None,
                                                                    'como_se_sabe': f"sale de una cuenta nuestra y entra en otra el {x['fecha']}, mismo importe"})
        print('cargados:', len(out))


if __name__ == '__main__':
    main()
