# Lo que lee las tablas viejas de la hoja de encargo

Inventario del 25-oct-2026, para el cambio al sistema nuevo (he_versiones_hoja, he_estados_hoja, he_lineas_compromisos…).
Plan acordado con Mónica: **cero deuda técnica**. Se cambian todos y se suben **el mismo día que la migración** de los
datos viejos (la prepara otro hilo). Hasta entonces, el generador nuevo sigue de prueba (/gestiones/hoja-prueba).

Tablas viejas: hojas_encargo, versiones_hoja, conceptos_hoja, actuaciones_hoja, actuacion_accesos, revisiones_oferta(_documentos),
sustituciones_hoja, presupuesto_hojas, relacion_viabilidad_hojas, movimientos_hoja. De facturación: lineas_facturacion e
hitos_cobro (se quedan, pero colgarán de he_lineas_compromisos).

Tamaño: S = cambiar la consulta · M = cambiar la lógica · L = reescribir. Quién: **H** = este hilo (hojas), **F** = el hilo de facturación (accesalia-14).

## 1. Comercial (21)

| # | Fichero | Para qué | Qué usa de lo viejo | Tam. | Quién |
|---|---|---|---|---|---|
| 1 | lib/hojaEncargo.ts | El generador viejo entero, el PDF de versión, el portal, la ficha de comunidad | Todo | L (se jubila; lo sustituyen hojaCompromisos + hojaEmitir) | H |
| 2 | lib/revisionOferta.ts | Revisión de ofertas (/comercial/revision, contador, pendientes) | El paquete por opp y los estados de la hoja | L (pasa a he_estados_hoja: bandeja de Daniel) | H |
| 3 | lib/presupuesto.ts | Presupuesto de la opp | Elegir hojas y sus conceptos; presupuesto_hojas | M: **decidido 25-oct (opción A)**: el presupuesto se hace AL ENVIAR, con las hojas que van juntas (ok de Daniel + mismo pagador); se retira el presupuesto manual | H |
| 4 | lib/viabilidadComercial.ts | Viabilidad del comercial y su PDF | Honorarios de la última versión; «superada por la versión X» | M | H |
| 5 | lib/cabeceraOpp.ts | Cabecera de la ficha de la opp | Ganada/abierta, lo que quieren, ¿queda por cobrar? | M | H |
| 6 | lib/bloquesDecisionCierre.ts | Ficha de la opp, bloques 3 y 4 | Revisiones, versión firmada e importe, motivo de no firma, hitos | M | H |
| 7 | lib/bloqueDocumentacion.ts | Ficha de la opp, bloque 2 (Documentación): lista de hojas | Hojas, versiones, presupuesto por versión | M (aquí van las acciones de la hoja) | H |
| 8 | lib/estadoOportunidad.ts | Fase de cada opp (barrido y recálculo) | Fechas de hoja creada, enviada y firmada | M | H |
| 9 | lib/completa.ts | ¿Está completa la opp? | Si hay hoja enviada o firmada | S | H |
| 10 | lib/envioCorreo.ts | Enviar documentos a la comunidad | PDF de la versión; marca enviada | M (escribe «enviada» en he_estados_hoja) | H |
| 11 | lib/resumenComercial.ts | Resumen comercial (lista y mapa) | Estado y fechas de la hoja; alertas (SQL datos_alertas) | M | H |
| 12 | lib/anexoEdificio.ts | Anexo de la viabilidad | Tipos de proyecto pedidos | S | H |
| 13 | lib/catalogoBloques.ts | Catálogo de bloques | Cuántos usos tiene cada bloque | S | H |
| 14 | lib/citas.ts | Agenda: adjuntos de una cita | Número de hoja (FK citas_adjuntos.hoja_encargo_id) | S + FK | H |
| 15 | ~~lib/fichaReal.ts~~ | **RETIRADA 25-oct** (6c716dc): a archivo/; en su ruta, aviso «FALTA MONTARLA» | — | — | — |
| 16 | ~~lib/cockpit.ts~~ | **RETIRADA 25-oct** (d9ad856) | — | — | — |
| 17 | ~~app/archivo/oportunidad-antigua~~ | **RETIRADA 25-oct** (d9ad856, d9ab0a5) | — | — | — |
| 18 | app/comercial/oportunidades/[id]/Bloque34.tsx | Bloques 3 y 4 | Solo rótulos de procedencia | S | H |
| 19 | ~~app/comercial/ficha/[id]/page.tsx~~ | **RETIRADA 25-oct**: ahora es el aviso «FALTA MONTARLA» | — | — | — |
| 20 | lib/misPendientes.ts | Pendientes | SQL mis_avisos y vista oportunidades_por_completar | S + SQL | H |
| 21 | lib/gestionOportunidad.ts | Anular una opp | SQL anular_por_duplicada / anular_por_error | S + SQL | H |

## 2. Facturación y cobros (16 + 3 solo de facturación)

Todo de **F** (facturación), salvo el nacimiento de las líneas al firmar, que lo resuelve la regla de Mónica: facturación
lee he_lineas_compromisos y genera hitos_cobro una vez, en el ok comercial.

| # | Fichero | Para qué | Tam. |
|---|---|---|---|
| 1 | lib/cobros.ts | Ficha de facturación, por cobrar, caja, cobrar, panorámica, prever, Ecobalance (base de casi todo) | L |
| 2 | lib/nuevasHojas.ts | Nuevas hojas firmadas | L |
| 3 | lib/cosasAFacturar.ts | Cosas a facturar | L |
| 4 | lib/recorridoHoja.ts | Recorrido: bandeja, primer cobro, diario (movimientos_hoja → he_estados_hoja) | L |
| 5 | lib/lineasDeHoja.ts | Al firmar nacen líneas e hitos (se jubila: facturación lee la hoja nueva) | L |
| 6 | lib/recibidos.ts | Revisión de lo que sube la comunidad (al aceptar, firmada) — **compartido con H** | M |
| 7 | lib/facturacion.ts | Libro Accesalia, proformas | M |
| 8 | lib/ecobalance.ts | Ecobalance: 3 presupuestos y CAES | M |
| 9 | lib/nubes.ts | Asignar › Nubes | S/M |
| 10 | lib/proximosHitos.ts | Próximos hitos | S |
| 11 | lib/proformas.ts | Proformas | S |
| 12 | lib/facturasEmitidas.ts | Facturas emitidas | S |
| 13 | lib/facturableYa.ts | Facturable ya | S |
| 14 | lib/dineroMes.ts | Dinero del mes | S |
| 15 | lib/hojasFirmadas.ts | Todo lo contratado (SQL hojas_firmadas) | S + SQL |
| 16 | lib/panoramica.ts | Panorámica (SQL panoramica_cobros) | S + SQL |
| — | lib/enviarFactura.ts, lib/fichaFacturacion.ts, lib/portalDocumentacion.ts | Solo líneas/hitos | S |

## 3. Comisiones (2) — H, con el área de comisiones a medio montar

| Fichero | Para qué | Tam. |
|---|---|---|
| lib/comisionesComercial.ts | Comisiones del comercial | M |
| lib/comisionesAdmin.ts | Comisiones de administradores (puede leer ya he_lineas_compromisos.comision_importe) | M |

## 4. Paneles y fichas financieras (4) — H

| Fichero | Para qué | Tam. |
|---|---|---|
| lib/negocio.ts | Paneles de negocio (trabajo contratado, histórico, resultados) | M-L |
| lib/fichaFinanciera.ts | Ficha financiera de la opp | L |
| lib/carteraGestores.ts | Mis administradores (vistas SQL) | S + SQL |
| lib/listaAdministraciones.ts | Lista de administraciones (vistas SQL) | S + SQL |

## 5. Comunidad, portal y administración (6) — H

| Fichero | Para qué | Tam. |
|---|---|---|
| lib/fichaComunidad.ts | Ficha de comunidad | M |
| lib/administracion.ts | Lista de comunidades, ficha anterior | M |
| lib/portal.ts | Portal de la comunidad: hojas para firmar y subir firmadas | M |
| lib/comunidades.ts | Nº de hojas de la comunidad | S |
| lib/fichas.ts | Ficha de contrata: hojas que paga | S |
| lib/hojas.ts | **Código muerto** (nadie lo importa): borrar | S |

## 6. Técnico (1) — H

| lib/trabajosTecnico.ts | Asignar › Proyectos: tipos de las hojas firmadas | S |
|---|---|---|

## 7. Otros (2)

- lib/hojaPapel.ts: solo un comentario.
- supabase/functions/sali-dinero: el texto que le dice a Sali qué tablas mirar (cambiar a las nuevas).

## SQL que lee lo viejo (22 objetos)

- **Funciones:** anular_por_duplicada, anular_por_error, datos_alertas, hojas_firmadas (F), mis_avisos, panoramica_cobros (F); las
  notas de Sali: nota_sali_hoja_generada / _enviada / _firmada, sali_cambios_version, sali_lineas_version.
- **Triggers sobre lo viejo:** notas de Sali al generar, enviar y firmar; exigir motivo de versión; consolidar admin al firmar;
  último contacto con el admin. **Hacen falta sus equivalentes sobre he_estados_hoja** (que Sali apunte en el diario, que se
  consolide el admin al firmar, último contacto).
- **Vistas:** resultado_oportunidad, cartera_gestor_resumen, oportunidades_de_gestor, oportunidades_por_completar;
  fases_oportunidad ya está muerta (borrar).

## Orden

1. Las bases de cada cadena: estadoOportunidad (lo usa casi todo), revisionOferta → cabeceraOpp → resumenComercial, y la
   ficha de la opp (bloques 2, 3 y 4).
2. Envío a la comunidad, portal y recibidos (el camino de la hoja hasta volver firmada).
3. Ficha de comunidad, administración, paneles, comisiones y técnico.
4. El SQL (funciones, vistas, triggers) antes que lo que lo usa.
5. Puertas: botón de la opp, área comercial, agenda, viabilidad, correo de revisión → generador nuevo.
6. Borrar: lib/hojas.ts, fases_oportunidad, el generador viejo y, tras la migración, las tablas viejas.
