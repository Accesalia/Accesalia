# -*- coding: utf-8 -*-
"""CASAR LAS FACTURAS 2026/294-301 DE ACCESALIA con sus hitos (Monica, 16-oct-2026: "hay nuevas facturas en drive no
subidas; subelas y apuntalas a donde toca"). Volcadas de Factusol y con su PDF (volcar_facturas_factusol.py,
subir_pdfs_facturas.py). Mismas reglas que casar_facturas_hitos.py:
  - cada linea de factura, a su hito (factura_linea_hitos); factura cobrada -> hito completado;
  - si la factura cobra MENOS que el hito, es un trozo: SUBHITO con lo facturado y otro con el resto, pendiente;
  - "hay factura = se firmo": la hoja que no constaba firmada pasa a firmada, con nota para buscar el papel; si la hoja
    de la app no tiene importes (vienen del volcado de Drive), su linea y sus hitos salen de la hoja (PDF/Google Doc) y
    de la factura ("manda la factura");
  - la factura apunta a su oportunidad.
  294 DURATON 6 (DAN-2025-154): HE-2025-0181 (07/04/2025; la factura dice 07/04/2026, errata de año), firmada el
      13/10/2026 segun la factura. 6.500 (todo incluido) 50 % contratacion + 50 % entrega -> el 50 % de la contratacion.
  295 RIO GUADALQUIVIR 12 LEGANES (DAN-2024-037): CSS 960 = HE-2024-0003, PSS.
  296 TUBO 5 HUMERA (CAR-2025-087): 4.950, primer pago parcial del segundo plazo (9.900) de HE-2026-0356 -> subhito.
  297 GENIL 5 (ALV-2026-172): 35 % de 4.980 al encargo = HE-2026-0706.
  298 BOLSA 3 (ALV-2026-141): 50 % de 5.980 (HE-2026-0426) + subvenciones 1.980 (HE-2026-0427).
  299 TENERIFE 8 (DAN-2022-209): HE-2026-0189 v2 (05/10/2026): 3.980, 100 % a la contratacion. El Doc se titula
      "CANTIDAD NO COBRADA A FAIN 3980 €": se guarda como nota.
  300 BRAVO MURILLO 177 (ALV-2026-157): 6.611,57, pago parcial de la entrega (11.500) de HE-2026-0428 -> subhito.
  301 AV ESPANA 27 GETAFE (DAN-2022-170): DF y CSS 3.850 = HE-2026-0651 (920 CSS + 2.930 DF). Pendiente de cobro.

  python scripts/facturacion/casar_facturas_294_301.py [--escribir]
"""
import sys, os, datetime, json, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
b = arrancar()


def crear(tabla, fila):
    """Inserta UNA fila y la devuelve (con su id)."""
    cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
    r = urllib.request.Request(b.url + '/rest/v1/' + tabla, data=json.dumps(fila, ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(r) as x: return json.loads(x.read())[0]


def factura(n):
    f = b.leer(f'facturas?select=id,numero,fecha,estado,oportunidad_id,lineas:factura_lineas(id,posicion,base)'
               f'&empresa_emisora=eq.accesalia&anio=eq.2026&serie=eq.1&numero=eq.{n}&tipo=eq.factura')[0]
    f['lineas'] = sorted(f['lineas'], key=lambda l: l['posicion'] or 0)
    return f


def hoja(numero):
    return b.leer(f'hojas_encargo?select=id,numero_hoja,estado,oportunidad_id&numero_hoja=eq.{numero}')[0]


def hito(numero_hoja, prefijo):
    h = hoja(numero_hoja)
    for x in b.leer(f'hitos_cobro?select=id,hito,importe,estado,linea_facturacion_id,l:lineas_facturacion!inner(hoja_encargo_id)'
                    f'&l.hoja_encargo_id=eq.{h["id"]}'):
        if x['id'].startswith(prefijo): return x
    raise SystemExit(f'no encuentro el hito {prefijo} en {numero_hoja}')


enlaces, cambios, notas = [], [], []


def casa(lin, h, importe, cobrada):
    enlaces.append({'factura_linea_id': lin['id'], 'hito_cobro_id': h['id'], 'importe': importe, 'como': 'a_mano'})
    if cobrada and h['estado'] == 'pendiente': cambios.append(('hitos_cobro?id=eq.%s&estado=eq.pendiente' % h['id'], {'estado': 'completado'}))


def trozo(lin, h, importe, n, fecha, cobrada):
    """Subhito con lo facturado y otro con el resto; el padre, parcial."""
    resto = round(float(h['importe']) - importe, 2)
    print(f'   subhito {importe} + resto {resto} del hito {h["hito"]} {h["importe"]}')
    if not ESCRIBIR: return
    s = crear('hitos_cobro', {'linea_facturacion_id': h['linea_facturacion_id'], 'hito': h['hito'], 'orden': 1, 'importe': importe,
                              'estado': 'completado' if cobrada else 'pendiente', 'hito_padre_id': h['id'],
                              'notas': f'Subhito: factura accesalia 2026/{n} ({fecha}), pago parcial.'})
    b.insertar('hitos_cobro', [{'linea_facturacion_id': h['linea_facturacion_id'], 'hito': h['hito'], 'orden': 2, 'importe': resto,
                                'estado': 'pendiente', 'hito_padre_id': h['id'],
                                'notas': f'Resto del hito, sin facturar todavia (al casar la factura 2026/{n}, {HOY}).'}])
    enlaces.append({'factura_linea_id': lin['id'], 'hito_cobro_id': s['id'], 'importe': importe, 'como': 'a_mano'})
    cambios.append(('hitos_cobro?id=eq.%s' % h['id'], {'estado': 'parcial'}))


def firmar_con_linea(numero_hoja, version, fecha_firma, descripcion, total, hitos, lin, n, nota):
    """Hoja sin firmar con factura: a firmada, su linea y sus hitos de la hoja; el primero, casado."""
    h = hoja(numero_hoja)
    v = b.leer(f'versiones_hoja?select=id&hoja_encargo_id=eq.{h["id"]}&numero_version=eq.{version}')[0]
    print(f'   {numero_hoja}: {h["estado"]} -> devuelta_firmada ({fecha_firma}); linea {total} con hitos {hitos}')
    if b.leer(f'lineas_facturacion?select=id&hoja_encargo_id=eq.{h["id"]}&quitada_en=is.null'): raise SystemExit(f'{numero_hoja} ya tiene lineas')
    if not ESCRIBIR: return
    b.actualizar(f'hojas_encargo?id=eq.{h["id"]}', {'estado': 'devuelta_firmada', 'fecha_firma': fecha_firma, 'version_firmada_id': v['id'],
                                                   'fecha_estado': HOY + 'T00:00:00+00:00'})
    l = crear('lineas_facturacion', {'hoja_encargo_id': h['id'], 'descripcion': descripcion, 'importe': total, 'es_porcentaje': False,
                                     'origen': 'factura', 'emisor': 'accesalia',
                                     'notas': f'De la hoja y de la factura 2026/{n} (la hoja de la app no traia importes).'})
    primero = None
    for k, (que, pct) in enumerate(hitos):
        x = crear('hitos_cobro', {'linea_facturacion_id': l['id'], 'hito': que, 'orden': k + 1, 'porcentaje': pct,
                                  'importe': round(total * pct / 100, 2), 'estado': 'completado' if k == 0 else 'pendiente'})
        primero = primero or x
    enlaces.append({'factura_linea_id': lin['id'], 'hito_cobro_id': primero['id'], 'importe': float(lin['base']), 'como': 'a_mano'})
    notas.append({'hoja_encargo_id': h['id'], 'linea_facturacion_id': l['id'], 'fecha': HOY, 'origen': 'factusol', 'tipo': 'nota',
                  'autor': f'Casado con Factusol ({HOY})', 'texto': nota})


OPP = {}
# 294 DURATON 6
f = factura(294); OPP[f['id']] = hoja('HE-2025-0181')['oportunidad_id']; print('294')
firmar_con_linea('HE-2025-0181', 1, '2026-10-13', 'Proyecto para la instalación de ascensor (incluye toma de datos y modelado 3D, proyecto, licencia, CFO y CSS)',
                 6500.0, [('encargo', 50), ('entrega', 50)], f['lineas'][0], 294,
                 'Firmada segun la factura 2026/294 ("recibida en fecha 13/10/2026"). La factura cita la hoja "de fecha 07/04/2026": es la de 07/04/2025, errata de año. Buscar el papel firmado.')
# 295 RIO GUADALQUIVIR 12
f = factura(295); h = hito('HE-2024-0003', 'eb7ac21a'); OPP[f['id']] = hoja('HE-2024-0003')['oportunidad_id']; print('295')
casa(f['lineas'][0], h, 960.0, f['estado'] == 'cobrada')
# 296 TUBO 5
f = factura(296); OPP[f['id']] = hoja('HE-2026-0356')['oportunidad_id']; print('296')
trozo(f['lineas'][0], hito('HE-2026-0356', '6a1ab17e'), 4950.0, 296, f['fecha'], f['estado'] == 'cobrada')
# 297 GENIL 5
f = factura(297); OPP[f['id']] = hoja('HE-2026-0706')['oportunidad_id']; print('297')
casa(f['lineas'][0], hito('HE-2026-0706', '877762a8'), 1743.0, f['estado'] == 'cobrada')
# 298 BOLSA 3
f = factura(298); OPP[f['id']] = hoja('HE-2026-0426')['oportunidad_id']; print('298')
casa(f['lineas'][0], hito('HE-2026-0426', '11d8fc4e'), 2990.0, f['estado'] == 'cobrada')
casa(f['lineas'][1], hito('HE-2026-0427', '9358938a'), 1980.0, f['estado'] == 'cobrada')
# 299 TENERIFE 8
f = factura(299); OPP[f['id']] = hoja('HE-2026-0189')['oportunidad_id']; print('299')
firmar_con_linea('HE-2026-0189', 2, f['fecha'], 'Proyecto para la instalación de ascensor (incluye proyecto, tramitación de licencia y dirección facultativa)',
                 3980.0, [('encargo', 100)], f['lineas'][0], 299,
                 'Firmada segun la factura 2026/299 (version 2, de 05/10/2026). El Google Doc de la hoja se titula "Modificado TENERIFE 8 MADRID - 05/10/2026 - PRY ASC - CANTIDAD NO COBRADA A FAIN 3980 €". Buscar el papel firmado.')
# 300 BRAVO MURILLO 177
f = factura(300); OPP[f['id']] = hoja('HE-2026-0428')['oportunidad_id']; print('300')
trozo(f['lineas'][0], hito('HE-2026-0428', 'b4461e0e'), 6611.57, 300, f['fecha'], f['estado'] == 'cobrada')
# 301 AV ESPANA 27 GETAFE: una linea, dos hitos
f = factura(301); OPP[f['id']] = hoja('HE-2026-0651')['oportunidad_id']; print('301')
casa(f['lineas'][0], hito('HE-2026-0651', '7c25bcbf'), 920.0, f['estado'] == 'cobrada')
casa(f['lineas'][0], hito('HE-2026-0651', '2e2f31c7'), 2930.0, f['estado'] == 'cobrada')

print('enlaces: %d | cambios de estado: %d | notas: %d | facturas a su opp: %d' % (len(enlaces), len(cambios), len(notas), len(OPP)))
if not ESCRIBIR: print('(marcha en seco)'); raise SystemExit
ya = {(x['factura_linea_id'], x['hito_cobro_id']) for x in b.leer('factura_linea_hitos?select=factura_linea_id,hito_cobro_id&order=factura_linea_id,hito_cobro_id')}
nuevos = [e for e in enlaces if (e['factura_linea_id'], e['hito_cobro_id']) not in ya]
if nuevos: b.insertar('factura_linea_hitos', nuevos)
for ruta, cuerpo in cambios: b.actualizar(ruta, cuerpo)
if notas: b.insertar('notas_facturacion', notas)
for fid, opp in OPP.items():
    if opp: b.actualizar(f'facturas?id=eq.{fid}&oportunidad_id=is.null', {'oportunidad_id': opp})
print('hecho. Opps a recalcular:', ','.join(sorted(set(o for o in OPP.values() if o))))
