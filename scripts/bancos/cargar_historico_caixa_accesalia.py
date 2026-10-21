# -*- coding: utf-8 -*-
"""EL EXTRACTO ANTIGUO DE LA CAIXA DE ACCESALIA (oct-2018 a dic-2024) EN LA APP (Monica, 21-oct-2026: «si, vamos a cargarlo»).

Su fichero «movimientos cuenta accesalia desde 2015 a 2025.XLS» (Drive: ACCESALIA/2025/movimientos bancarios Accesalia/
Anterior) trae otro formato: Ingreso (+) / Gasto (-), Saldo (+) / Saldo (-), y el texto repartido en «Concepto
complementario 1..10». Se traduce al de ahora (Movimiento / Más datos) para que valgan las mismas reglas:
  - transferencias (codigo 99): el concepto en el complementario 2, el beneficiario en el 3;
  - remesas: «FATIR<n>» sale del complementario 1; el resto, el complementario 1 sin el «CORE» del principio.
Se cose por el saldo con lo que ya hay (el primer apunte de 2025 tiene que empalmar con el ultimo de 2024), y entra
DELANTE (orden negativo). Se clasifica con reglas_movimientos y los gastos habituales; las nominas, en su mes.
La cuenta de Daniel de esos años NO esta cargada: lo que va a Daniel De Soto que no son los 3.500 de su nomina
(«Adelanto al administrador», facturas suyas) se marca como interno, sin pareja.

  python scripts/bancos/cargar_historico_caixa_accesalia.py <fichero.xls> [--escribir]
"""
import sys, os, re, io, uuid, collections
import pandas as pd
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402
from nominas_a_su_mes import mes_de  # noqa: E402

CUENTA = 'caixa_accesalia'


def leer(fichero):
    x = pd.read_excel(fichero, header=None).iloc[4:]
    x.columns = range(x.shape[1])
    filas = []
    for _, r in x.iterrows():
        if pd.isna(r[4]):
            continue
        d, m, y = str(r[4]).split('/')
        dv = str(r[5]).split('/') if pd.notna(r[5]) else None
        importe = round(float(r[6]) if pd.notna(r[6]) else -float(r[7]), 2)
        saldo = round(float(r[8]) if pd.notna(r[8]) else float(r[9]), 2)   # «Saldo (-)» ya viene con su signo
        comp = [str(r[c]).strip() for c in range(14, 24) if pd.notna(r[c]) and str(r[c]).strip()]
        codigo = str(r[10]).zfill(2) if pd.notna(r[10]) else ''
        fatir = re.search(r'\b(FATIR\d+|DETIR\d+)', ' '.join(comp))
        if fatir:
            concepto, mas = fatir.group(1), 'B86374055000'
        elif codigo == '99' and len(comp) >= 2:
            concepto, mas = comp[1], ' · '.join(comp[2:3])
        else:
            concepto = re.sub(r'^CORE', '', comp[0]) if comp else ''
            mas = ' · '.join(comp[1:3])
        filas.append(dict(fecha=f'{y}-{m}-{d}', fecha_valor=f'{dv[2]}-{dv[1]}-{dv[0]}' if dv else None, concepto=re.sub(r'\s+', ' ', concepto),
                          mas_datos=re.sub(r'\s+', ' ', mas) or None, importe=importe, saldo=saldo, referencia=str(r[13]).strip() if pd.notna(r[13]) else None))
    return list(reversed(filas))   # el banco las da de la mas nueva a la mas vieja


def prueba(p, t):
    try:
        return re.search(p, t) is not None
    except re.error:
        return p in t


def main():
    fichero = sys.argv[1]
    b = arrancar()
    filas = leer(fichero)
    for i in range(1, len(filas)):
        if abs(round(filas[i - 1]['saldo'] + filas[i]['importe'], 2) - filas[i]['saldo']) > 0.011:
            raise SystemExit(f"el saldo no cuadra dentro del fichero entre el {filas[i-1]['fecha']} y el {filas[i]['fecha']}")
    primera = b.leer(f'movimientos_bancarios?select=orden,fecha,importe,saldo&cuenta=eq.{CUENTA}&order=orden.asc&limit=1', por_tramos=False)[0]
    clave = (primera['fecha'], round(float(primera['importe']), 2), round(float(primera['saldo']), 2))
    pos = [i for i, f in enumerate(filas) if (f['fecha'], f['importe'], f['saldo']) == clave]
    if not pos:
        raise SystemExit(f'el fichero no empalma con lo que hay: no encuentro el primer apunte cargado ({clave})')
    nuevas = filas[:pos[0]]
    print(f"{len(filas)} filas en el fichero ({filas[0]['fecha']} → {filas[-1]['fecha']}); entran {len(nuevas)} ({nuevas[0]['fecha']} → {nuevas[-1]['fecha']}), "
          f"y empalman con el saldo del primer apunte de la app ({clave})")

    reglas = b.leer('reglas_movimientos?select=id,orden,sentido,patron,cuenta,tipo,se_repite,solo_direccion&activa=eq.true&order=orden')
    gastos = b.leer('gastos_habituales?select=id,empresa,como_aparece,tipos,meses&empresa=eq.accesalia')
    orden = int(primera['orden']) - len(nuevas)
    out, cuenta = [], collections.Counter()
    for f in nuevas:
        t = (f['concepto'] + ' ' + (f['mas_datos'] or '')).upper()
        fila = dict(id=str(uuid.uuid4()), cuenta=CUENTA, orden=orden, fichero_origen=os.path.basename(fichero), clase='gasto', tipo=None,
                    se_repite=None, como_se_sabe=None, regla_id=None, gasto_habitual_id=None, solo_direccion=False, mes_imputado=None, **f)
        orden += 1
        if f['concepto'].upper().startswith('DETIR'):
            fila.update(clase='devolucion', como_se_sabe='devolución de una remesa (DETIR)')
        elif re.search(r'SALDO PARA BBVA', t) or (f['importe'] > 0 and re.search(r'SOTO|TRASPASO', t)) or \
                (f['importe'] < 0 and 'SOTO' in t and not t.startswith('NOMINA') and abs(f['importe']) != 3500 and re.search(r'ADELANTO|ANTICIPO|FACTURA|FRA|TRASPASO', t)):
            fila.update(clase='interno', como_se_sabe='a o desde otra cuenta nuestra (la de Daniel de esos años no está cargada)')
        elif f['importe'] > 0:
            fila['clase'] = 'ingreso'
            rg = next((r for r in reglas if r['sentido'] == 'ingreso' and r['cuenta'] in (None, CUENTA) and prueba(r['patron'], t)), None)
            if rg:
                fila.update(tipo=rg['tipo'], regla_id=rg['id'], como_se_sabe=f"regla: «{rg['patron']}»")
            elif f['concepto'].upper().startswith('FATIR'):
                fila['como_se_sabe'] = 'remesa de recibos (FATIR): cobro a una comunidad'
        else:
            rg = next((r for r in reglas if r['sentido'] == 'gasto' and r['cuenta'] in (None, CUENTA) and prueba(r['patron'], t)), None)
            mes = int(f['fecha'][5:7])
            cand = [g for g in gastos if any(prueba(p, t) for p in (g['como_aparece'] or []))]
            if not cand and rg:
                cand = [g for g in gastos if rg['tipo'].upper() in [x.upper() for x in (g['tipos'] or [])]]
            cand.sort(key=lambda g: 0 if g['meses'] and mes in g['meses'] else 1)
            if rg:
                fila.update(tipo=rg['tipo'], regla_id=rg['id'], se_repite=rg['se_repite'], solo_direccion=rg['solo_direccion'], como_se_sabe=f"regla: «{rg['patron']}»")
            if cand:
                fila['gasto_habitual_id'] = cand[0]['id']
                fila['como_se_sabe'] = fila['como_se_sabe'] or 'como aparece en el banco, su gasto habitual'
            if fila['tipo'] == 'NÓMINAS':
                mi = mes_de(t, f['fecha'])
                fila['mes_imputado'] = mi if mi and mi != f['fecha'][:7] else None
        cuenta[(fila['clase'], fila['tipo'] or ('(gasto habitual)' if fila['gasto_habitual_id'] else '—'))] += 1
        out.append(fila)
    for (c, t), n in sorted(cuenta.items(), key=lambda x: -x[1])[:30]:
        print(f'{n:5d}  {c:10s} {t}')
    sin = sum(n for (c, t), n in cuenta.items() if c == 'gasto' and t == '—')
    print('gastos sin regla ni gasto habitual (cuentan como gasto de la actividad):', sin)
    if '--escribir' in sys.argv:
        if b.leer(f'movimientos_bancarios?select=id&cuenta=eq.{CUENTA}&fecha=lt.2025-01-01&limit=1', por_tramos=False):
            raise SystemExit('ya hay apuntes de antes de 2025: no se carga dos veces')
        b.insertar('movimientos_bancarios', out)
        print('cargados:', len(out))


if __name__ == '__main__':
    main()
