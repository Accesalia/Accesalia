# Generador de la hoja de encargo: el árbol (maqueta validada)

Validada por Mónica el 22-oct-2026 («está perfecto»). Pendiente de implementar.

- Maqueta: [hoja-encargo-arbol.html](hoja-encargo-arbol.html) · enlace vivo: https://claude.ai/artifact/AuXENT4jg4x8RPZqnWDqC4 (versión 30)
- Los importes y formas de pago de la maqueta son de EJEMPLO: en la app salen de la tarifa y del catálogo de bloques.
- Es solo la parte de las LÍNEAS. Falta: a quién va, dónde (accesos de cada actuación), comisión del administrador (invisible) y motivo del cambio de versión.

## El enfoque

El patrón de los generadores de presupuestos comerciales (CPQ: Salesforce, HubSpot, Odoo). Antes se rechazaron un formulario por pasos, un árbol de preguntas y un folio en blanco: «replicar lo que pasa en la cabeza del comercial», que al final quede una tablita tipo Excel perfectamente clara.

- La hoja nace de una oportunidad: dirección y destinatario arriba.
- **Catálogo siempre a la vista**, a la izquierda, en tres grupos que se distinguen (proyecto azul tinta, documento técnico berenjena, servicio teja), con una línea de su color a la izquierda. Lo que le interesa a la opp, en negrita con «les interesa». Botón «Añadir» a la derecha de cada uno, con un sombreado suave de su color. Sin buscador. La columna mide lo justo.
- **La hoja es una tabla** que empieza vacía: Qué | En el papel | Se cobra | Importe | Cómo se cobra | quitar. Total abajo, «+ IVA».

## Cómo se comporta cada paquete

1. Se añade desde el catálogo y entra como **CABECERA en mayúsculas**, con su clase (PROYECTO / DOC. TÉCNICO / SERVICIO) y su subtotal.
2. Si hay que decir **qué es** (la obra de accesibilidad, el tipo de SATE, las obras del conjunto, de qué es la subvención), eso va primero y SOLO: un desplegable en la fila. El conjunto despliega casillas en la propia fila (dos o más) y «Hecho». Hasta contestarlo no sale nada más.
3. Al elegirlo, lo elegido pasa a la cabecera («PROYECTO DE RAMPA», «PROYECTO CONJUNTO: ASCENSOR + SATE FACHADA») con un «cambiar» discreto, y aparecen **de golpe** las líneas fijas y **todas** las preguntas.
4. Las preguntas son filas en ámbar con Sí / No:
   - **Sí** → la pregunta desaparece y entra la CABECERA de lo elegido con sus líneas, con «Eliminar» junto al nombre (eliminar = contestar no).
   - **No** → queda la fila «¿…? No · cambiar», para que conste.
5. Las líneas se cuelgan de su cabecera con un **árbol de verdad** (línea vertical y ramas hasta la última). Las preguntas sin contestar no tienen rama: aún no forman parte de la hoja.
6. Cada línea: «sale / no sale» en el papel (texto, sin píldora; no sale en azul), se cobra sí / incluido, importe y forma de pago por defecto. **Lo que se cobra en negrita; lo incluido en gris con «incluido» en cursiva.** Lo quitado queda tachado y se puede volver a poner.
7. Un aviso arriba dice lo que falta contestar; sin contestar no se genera. Los subtotales y el total cuentan solo lo que ya está en la hoja. Miles con punto (9.800 €).

## Las reglas (de Mónica)

- **Proyecto básico y de ejecución** (ascensor / accesibilidad / eficiencia / conjunto): redacción del proyecto (se cobra) + toma de datos y modelado 3D + visado (no sale en el papel) + licencias. Preguntas: ¿DF?, ¿3 presupuestos?, ¿financiación? (SIEMPRE con proyecto), ¿CAES? (solo si hay eficiencia / SATE), ¿CSS?
- **Eficiencia energética**: SATE completo por defecto; fachada o cubierta, excluyentes.
- **Dirección facultativa** = cabecera con 3 líneas: inicio de obra (no sale), dirección facultativa (visitas de obra), certificado de fin de obra.
- **Subvención**: ¿de qué es? (accesibilidad / eficiencia) → tramitación (3,5 % de lo concedido, a la concesión) + DOCUMENTACIÓN TÉCNICA, que es una cabecera CON su precio (1.980 €, 100 % a la contratación) y lleva debajo IEE, libro del edificio y CEE. **CAES solo si la subvención es de eficiencia.**
- **CAES** se pregunta una sola vez aunque haya SATE y subvención de eficiencia.
- **CAES y financiación también se contratan sueltos** (están en el catálogo como servicios).
- 3 presupuestos, financiación, CAES y CSS, al decir que sí, entran como cabecera con su línea, igual que la DF.
- La CSS se llama «CSS» en todas partes.

## Por debajo (no se ve en pantalla, decidido aparte)

Ver la memoria `hoja-firmada-tres-fases`: las líneas de facturación son lo contratado, se cobre o no (`lineas_facturacion.desglose`); la hoja firmada pasa por ok comercial → facturación → el cobro del primer hito de cada concepto abre su área; las reglas de arrastre vivirán en el catálogo de bloques, no en el código de la pantalla.
