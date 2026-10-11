# Clave, actuación y áreas

> Lo que une todo lo que pasa después de la firma. Decidido con Mónica el
> 11-oct-2026, en una sola conversación que empezó por la pantalla del
> expediente 360 y acabó en la pregunta de fondo: **¿qué une las distintas partes
> entre sí?** Su dibujo: `OneDrive/Imágenes/Screenshots/PROPUSTA CLAVE DIRECCIONS.png`.

## La idea en una línea

**Todo lo que hacemos tiene detrás un lugar físico.** Nadie pide un ascensor
teórico que valga para Madrid y para Valencia, ni tres presupuestos de algo que no
es un proyecto concreto. Ese lugar es **la clave**. Dentro de ella viven las
**actuaciones**, y cada cosa que hacemos lleva un **código** que dice dónde, de
qué venta y de qué área.

## Las piezas

```
CLAVE  DIR-00412          el lugar: (municipio + calle + número) × N
 │
 ├─ ACCESOS               debajo de la clave; se suman con el tiempo
 │    cada acceso pertenece a:
 │      · un EDIFICIO     lo físico  → fachada, IEE, Catastro, fotos
 │      · una COMUNIDAD   lo legal   → CIF, actas, presidente, cuenta
 │
 ├─ OPORTUNIDAD  DAN-2026-060      la venta, con su código y su ciclo propio
 │    └─ HOJAS DE ENCARGO           propuestas; la firmada es el contrato
 │         └─ LÍNEAS → HITOS ← FACTURAS
 │
 └─ ACTUACIONES           lo que nos hemos comprometido a hacer; cada una con
      sus accesos (un subconjunto de la clave)
        └─ ÁREAS          PRY, OBR, SUB, IEE, CAES, 3PP, FIN
```

### La clave

- Es **nuestra**, no de una administración. Ningún dato oficial sirve: la parcela
  junta portales que no tienen nada que ver, la dirección postal parte edificios
  (Etruria 26-28 + Lucano 65 es uno solo) y la comunidad se rompe con las
  mancomunidades y con los garajes.
- Normalmente es una calle y un número, pero es **(municipio + calle + número) × N**:
  Etruria, Cuestablanca y Las Norias caben.
- Tiene **id propio y estable**. Los accesos se suman debajo según vamos sabiendo, y
  el texto se corrige (descubrimos que también es el 30) sin que el id cambie. Si
  salen accesos (el 28 resulta ser otra cosa), se abre una clave nueva para ellos.
- **No es la tabla `comunidades`.** Una clave puede contener varias comunidades: una
  mancomunidad, o la comunidad de viviendas y la del garaje de debajo (Palomares 75).

### Cuándo nace la clave: solo a la firma

Muchas oportunidades no llegan nunca a firmarse. Si cada una creara su clave,
tendríamos docenas de claves que nacen muertas. Así que:

- **Antes de la firma**, la oportunidad vive con su propio ciclo, su código único y
  sus accesos. El Polycam, la viabilidad y las hojas enviadas cuelgan de ella.
- **Al recibir la hoja firmada (y verificada)**, se miran los accesos de la
  oportunidad:
  - **alguno ya está en una clave** → la oportunidad entra en esa clave, y los
    accesos nuevos se suman debajo;
  - **ninguno está en una clave** → clave nueva;
  - **caen en dos claves distintas** → decide una persona (o se fusionan).

Ejemplo: la mancomunidad creó la clave con la cubierta. Un portal pide después un
ascensor: su oportunidad cubre solo su acceso, pero entra en la clave de la
urbanización completa. Por eso importa **apuntar bien los accesos al firmar**: si
la cubierta se apuntó con los 8 portales de Palomares, Puerto Lápice entra solo en
la clave mañana; si se apuntó solo con el 75, abre una clave nueva.

Ni a la emisión (Palomares tiene 13 hojas enviadas: serían 13 actuaciones) ni al
cobro del primer hito (Schindler paga el 100% a la entrega del proyecto: sus
proyectos no existirían hasta estar hechos).

**El histórico** se genera con la misma regla, recorriendo las firmadas por orden
de fecha de firma. Las que caigan en dos claves, a una lista corta para Mónica.

### La actuación

- Nace **al firmar**. Antes, lo que se hace se puede cambiar (eso es la lista de
  deseos de la oportunidad, `oportunidad_tipos`).
- **Decide el proyecto, no el tiempo.** Un proyecto conjunto es una actuación,
  aunque toque SATE y ascensor. Dos proyectos separados son dos actuaciones,
  aunque se firmen el mismo día: piden dos proyectos para presentarse a la
  subvención y ejecutan el que se conceda, así que cada uno necesita su estado.
- **Una hoja posterior se suma a la misma actuación**: la subvención que se firma
  seis meses después del proyecto es de ese proyecto.
- Una solicitud de subvención no cubre dos actuaciones; si hace falta, los
  proyectos se fusionan en uno conjunto. Pero **un servicio sí puede colgar de dos
  actuaciones**: la subvención que exige ascensor y SATE resueltos (será lo
  habitual en 2027).
- **Un proyecto puede tener varias obras**: SATE con la cubierta ahora y la
  fachada después de hacer hucha; ascensor y rampa con dos contratas.
- El Dropbox ya lo hacía: **la carpeta de dirección es la clave y sus subcarpetas
  (SATE, ASC, RAMPA) son las actuaciones**. Lo que daba problemas era tratar el
  sitio como si fuera una actuación más.

### Los documentos

- **Cuelgan del acceso**, y están disponibles para toda clave que lo contenga.
- **El edificio tiene documentos propios**; la comunidad, los suyos (va con sus
  accesos); la mancomunidad, los de sus comunidades; la hoja, por la oportunidad.
- **Siempre accesibles, con avisos de validez**: el acta de 2022 sigue estando,
  pero se avisa de que el presidente ya es otro.
- **Accesible no es visible**: lo comercial, lo confidencial del diario o el DNI
  del presidente siguen dependiendo de quién mira.
- **Nunca se actúa a nivel de vivienda.** Norma de la casa.

## Los códigos

```
DIR-00412 · DAN-2026-060 · ÁREA · apellido
└──────── común a todo ─────────┘ └ lo decide cada área ┘
```

- **Hasta el área, todo común.** Dentro de cada área, la granularidad que necesite.
- El código es **de cada trabajo**, no de la hoja (la hoja ya tiene el suyo,
  `HE-2026-0781`). Una hoja con proyecto + CSS + 3 presupuestos + financiación
  da cuatro códigos.
- La granularidad está en las **líneas de la hoja**: de las 1.214 líneas de las
  firmadas, 1.204 ya dicen qué concepto son. Lo incluido sin precio también lleva
  código si hay que hacerlo.
- Como el código pasa por la oportunidad y no por el proyecto, **una DF, una CSS o
  un CFO se pueden abrir sin proyecto**: el matiz de lo contratado está en la
  oportunidad.

## Las áreas

| Área | Apellidos | Quién |
|---|---|---|
| **PRY** Proyecto | ASC, SATE, CUB, ACC… · CON (consulta urbanística) · PER (informe pericial) · memoria valorada | Accesalia, equipo técnico |
| **OBR** Obra | DF, CSS, CFO | Accesalia |
| **SUB** Subvención | por convocatoria presentada | Accesalia |
| **IEE** | IEE, LEE | Accesalia, persona fuera del equipo técnico |
| **CAES** | | Ecobalance |
| **3PP** 3 presupuestos | | Ecobalance |
| **FIN** Financiación | | Ecobalance |

- **Regla de PRY:** lo que consume tiempo de técnico va en Proyecto. Visado,
  licencia, toma de datos, mediciones y CEE son partes de PRY. La consulta
  urbanística es su fase previa: si luego viene el proyecto, es su continuación.
- **DF, CSS y CFO no son áreas**: son partes de la obra. Hay proyectos cuya obra no
  hacemos, y DF de proyectos ajenos.
- **El CEE es del proyecto** (sin proyecto no hay CEE). **El LEE, del IEE** (sin IEE
  no hay LEE).
- **La frontera Accesalia / Ecobalance cae en el área.** Al cortar por la firma de
  la hoja, áreas enteras quedan invisibles para los perfiles que no las llevan. Si
  algún día SUB pasa a Ecobalance, es cambiar quién lleva el área, sin tocar
  códigos.
- Bloqueos y pausas **no son áreas**: son el estado de cada una. Correos y diario
  son transversales.

## Las facturas

El paso intermedio existe y está bastante lleno:

```
hoja → línea de facturación → hitos de cobro ← línea de factura ← factura
```

La factura **cobra hitos** (o parte de un hito, o hitos de varias hojas), y por el
hito sube a la hoja, la oportunidad y la clave. A 11-oct: 576 de 882 facturas
tienen alguna línea atada a su hito (554 enteras); **306 sin atar**.
`facturas.oportunidad_id` es un atajo que sobra.

## Lo que hay en la base y lo que falta

- **Ya existe:** accesos con su comunidad (`accesos.figura_legal_propietaria_id`),
  oportunidad ↔ accesos, mancomunidad ↔ comunidades, documento ↔ accesos (vacía),
  hoja → líneas → hitos ← facturas, `actuaciones_hoja` + `actuacion_accesos`.
- **Falta:** la **clave** como pieza propia con sus accesos debajo; la
  **actuación** viviendo por su cuenta (hoy muere dentro de cada hoja); el
  **código** de cada área.
- **Monday** (proyectos, visados, licencias, obras del 22-jul) es un parte de
  estado atado a la comunidad, no a la venta: sirve para fechas y puntos de
  inflexión. **La verdad está en el Dropbox**, que se barrerá despacio: 2026
  primero, de fin de obra hacia atrás.

## Sin resolver

- Si un **PRY · ASC** se fusiona en un proyecto conjunto, su apellido deja de ser
  cierto: ¿se cambia el código o se conserva con nota?
- **Palomares 75**: accesos cruzados (las viviendas del 75 están en la comunidad del
  garaje y el garaje en la de viviendas, por el CIF), y las tres oportunidades del
  garaje apuntan al portal de viviendas. Aparcado para desenredar luego.
