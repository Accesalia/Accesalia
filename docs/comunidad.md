# Qué es una comunidad, y cuál es la unidad real

Criterio escrito el 30-sep-2026, después de destripar siete edificios de la
cartera. **Es un borrador para que Mónica lo corrija**, no una decisión cerrada.

El modelo se pensó a propósito **sin mirar cómo están hoy los datos**. Palabras de
Mónica: *"soluciones pasadas no tienen por qué ser soluciones óptimas. No me fiaría
de los datos que tenemos como ejemplo a seguir, porque hemos probado varias
soluciones y todas han ido mal por algo y todas dejan huellas en la doc, así que nos
pueden liar."*

---

## 1. La definición

> **Una comunidad es la que tiene un presidente y una junta que puede votar mi
> presupuesto.** — Mónica, literal.

Ya sea comunidad o mancomunidad. No es el edificio, no es el CIF, no es la parcela.

**La prueba es operativa, y es nuestra, no jurídica: ¿cuántos «sí» necesito?**

- Un solo sí y puedo trabajar en los cuatro accesos → **una comunidad**.
- Necesito dos síes → **dos comunidades**, aunque sea un edificio, una parcela y un
  CIF.

Es la definición útil para Accesalia porque **lo que vendemos es un sí**.

Con un matiz que es real: sobre un mismo edificio puede haber **órganos apilados**,
y cuál vota depende de qué se vota. La mancomunidad vota la cubierta; cada portal
vota su ascensor. Así que la comunidad no es "lo que decide todo": es un órgano con
su ámbito, y puede haber varios encajados. La hoja de encargo apunta a **cuál votó**.

---

## 2. El átomo: el ACCESO

Comprobado en Catastro sobre siete edificios de la cartera:

| edificio | nº de calle | escaleras | accesos |
|---|---|---|---|
| PICO CEJO 55, Madrid | 1 | — (vacía) | 1 |
| SIERRA MOLINA 11, Madrid | 1 | — (vacía) | 1 |
| PALMAS DE LAS 43, Móstoles | 1 | 1 | 1 |
| ETRURIA 26-28 + LUCANO 65, Madrid | 3 | 3 | 3 |
| AV ALBUFERA 250, Madrid | 1 | **9** | 9 |
| LAS FLORES 79-81, Alcorcón | 2 | 5 | 5 |
| CUESTABLANCA 2, Alcobendas | 202 | 32 | 203 |

**No es que a veces sea el portal y a veces la escalera. Es siempre lo mismo: el
acceso** — una escalera con su puerta a la calle. Lo que cambia es cómo se llama:

- un solo acceso → basta el número, y **la escalera viene vacía**
- varios accesos con el mismo número → se distinguen **por escalera** (Albufera 250,
  escaleras 1 a 9)
- cada acceso con su número → basta el número (Etruria 26, 28, Lucano 65)
- y a veces las dos cosas (Las Flores: 2 números × 5 escaleras)

> **El acceso se nombra con (calle, número, escalera)**, donde la escalera puede ir
> vacía cuando no hace falta.

**Ojo con el vocabulario:** el campo `portal` de Catastro (`dir.plp`) **está vacío en
los siete casos**. La palabra "portal" la usamos nosotras; Catastro lo llama
escalera (`loint.es`).

### La parcela NO es nuestra unidad

Tres razones, las tres en la cartera:

1. Una parcela puede tener **1 acceso o 203**. No mide nada.
2. Una comunidad puede abarcar **varias parcelas** — Plaza del Paular 1 y 2: un
   presidente, un CIF, dos parcelas.
3. Una parcela puede tener **varias comunidades** — Cuestablanca.

La parcela es **el contenedor de Catastro**. Es uno de los agrupadores, no el eje.

---

## 2 bis. Las DOS jerarquías, que no se anidan una en otra

Mónica, 30-sep-2026: *"nuestro modelo: mancomunidad — comunidad — subcomunidad. Y como
opp: dirección — número — escalera. Y baja en la dirección hasta que quede definido su
acceso a la calle."* Correcto, y son **dos jerarquías independientes**:

```
QUIÉN VOTA  (la ley)                      CÓMO SE LLAMA  (el acceso)
mancomunidad   (complejo, art. 24)        calle
   comunidad   (art. 2.a)                    número
      subcomunidad (art. 2.d)                   escalera
```

- **De 0 a 3 niveles de órgano.** Lo normal es uno (la comunidad). Y puede haber
  **cero**: la vivienda unifamiliar de una persona física no tiene junta ni
  presidente. Conviene implementarlo como **autorreferencia** (`parte_de`) y no como
  tres tablas, para que una mancomunidad de mancomunidades no rompa nada.
- **La dirección NO está por encima de la comunidad**: es el **nombre de cada
  acceso**. Una comunidad puede tener accesos en **dos calles distintas** — Etruria 26,
  Etruria 28 y Lucano 65 son una sola comunidad. Así que la calle no envuelve al
  órgano; cuelga de cada acceso.
- **La parcela no está en ninguna de las dos.** Es el agrupador de Catastro, y es
  ortogonal: la parcela de Marcenado tiene 20 accesos repartidos entre varias
  comunidades.

### "Bajar hasta que quede definido": la regla, y la restricción que sale de ella

Se desciende calle → número → escalera **hasta que el acceso sea único**:

| edificio | ¿basta calle + número? | escalera |
|---|---|---|
| PICO CEJO 55 | sí, hay uno solo | **vacía** |
| ETRURIA 26 / 28 / LUCANO 65 | sí, cada acceso tiene su número | presente pero redundante |
| AV ALBUFERA 250 | **no**, hay nueve | **imprescindible** |
| MARCENADO (parcela de 20 accesos) | **no**, y la escalera C se repite en el nº1 y en el nº2 | **hacen falta los tres** |

> **De ahí sale la restricción de la base: (municipio, calle, número, escalera) tiene
> que ser único.** Y es la que impide volver a tener tres filas para la misma
> presidenta.

---

## 3. Los cuatro agrupadores

Cada uno agrupa accesos a su manera, y **ninguno se deduce de los otros**. Ésa es la
razón de que hagan falta los cuatro.

| agrupador | qué hace | quién lo decide |
|---|---|---|
| **Catastro** | agrupa accesos en **parcelas** | el Estado |
| **la junta** | agrupa accesos en **comunidad** | el título constitutivo |
| **la administración** | **un expediente por dirección postal** | la convocatoria |
| **el proyecto** | agrupa según lo técnico y lo económico | nosotras |
| *la dirección* | *es el nombre del acceso* | *Mónica: la lista de 26 días* |

### Los dos granos que no coinciden

Esto es el corazón del asunto:

| | Albufera 250 | Etruria + Lucano | Marcenado 1 |
|---|---|---|---|
| direcciones postales | **1** | **3** | 1 |
| escaleras | **9** | 3 | 3 |
| expedientes | **1** | **3** | 1 |
| ascensores / proyectos | 18 actuaciones | 3 | 3 |

**La dirección postal manda en la tramitación. La escalera manda en la obra.** Y no
coinciden de forma fiable. Ésa es la norma, no la excepción.

---

## 4. Lo que dice la ley

**Ley 49/1960 de Propiedad Horizontal.** La comunidad nace del **título
constitutivo** (art. 5): una escritura inscrita en el **Registro de la Propiedad**,
donde se fija la división en elementos privativos y su cuota de participación.

> **Catastro no tiene nada que ver con esto.** Catastro es fiscal y descriptivo; el
> Registro es donde vive la propiedad. Dos administraciones que describen el mismo
> ladrillo y **no tienen por qué coincidir**.

Y la ley ya nombra los tres niveles:

| lo que decimos | la ley |
|---|---|
| la comunidad del edificio | **comunidad de propietarios**, art. 2.a |
| la escalera o el bloque con su ascensor | **subcomunidad**, art. 2.d |
| la mancomunidad por encima | **complejo inmobiliario privado**, art. 24 |

El art. 2.d define la subcomunidad como propietarios que disponen en comunidad de
*"determinados elementos o servicios comunes dotados de unidad e independencia
funcional o económica"*. Eso **es** la escalera con su ascensor.

*Los números de artículo están puestos de memoria: que los confirme la gestoría
antes de que vayan en un contrato.*

### La letra del CIF, que ya la tenemos

| letra | qué es | en la cartera |
|---|---|---|
| **H** | comunidad de propietarios (propiedad horizontal) | 522 |
| **E** | comunidad de bienes — **bloquea subvenciones**, ver abajo | 41 |
| A / B | sociedad anónima / limitada: **no son comunidades** | 4 |
| DNI | persona física: **vivienda unifamiliar** | 1 |

**La E no es una curiosidad, es un problema operativo.** Palabras de Mónica:
*"están en trámite de actualización precisamente porque tener E y no H les da
problemas con las subvenciones."* Así que la letra del CIF es una **señal comercial**:
una comunidad con `E` tiene un trámite pendiente **antes** de poder pedir la ayuda.
Son 41 en la cartera, y es candidato claro a aviso en la app.

**Y el cliente puede ser una persona física.** `52118110H` en COBRE 18 TORREJÓN está
bien puesto: es la casa de una trabajadora de Accesalia, una vivienda unifamiliar a la
que se le tramitó el proyecto para que pudiera acceder a la subvención. *"Es una
anomalía, no nuestro trabajo habitual."* Pero el modelo tiene que admitirla **sin
inventarle una junta falsa**: hay cliente, hay acceso y hay expediente, y no hay
presidente ni acta.

---

## 4 bis. Las tres patas, y la que no se puede automatizar

| | qué aporta | ¿automatizable? |
|---|---|---|
| **Catastro** | **el edificio**: parcela, accesos, inmuebles, año, superficie, uso, coeficiente | **sí**, por API y gratis |
| **la ley (LPH)** | **las formas posibles**: comunidad / subcomunidad / complejo inmobiliario, y cómo anidan | es vocabulario y reglas, no datos |
| **el campo** | **qué órgano existe aquí de verdad, y quién lo preside** | **no. Nunca.** |

### Resultado negativo, probado: Catastro NO revela las subcomunidades

Se probó si los coeficientes de participación sumaban 100 **por escalera** — lo que
habría significado que Catastro refleja la división del título constitutivo y nos dice
dónde están las subcomunidades. **No es así: suman 100 por PARCELA.**

```
PICO CEJO 55            100.000      ETRURIA + LUCANO    100.100
MARCENADO               100.080      AV ALBUFERA 250     100.190
LAS FLORES 79-81         96.010      PALMAS DE LAS 43      9.920  <- excepcion
```

Catastro refleja **una sola división horizontal por parcela**. La estructura de
órganos **no se puede deducir de ningún dato público**: está en el título constitutivo
o la sabe el administrador. Es dato que aporta el comercial, y no hay atajo.

**Y eso convierte el alta en una confirmación, no en un formulario.** Catastro dice
"aquí hay 9 accesos" y al comercial se le hace UNA pregunta: *¿esto es una comunidad,
nueve subcomunidades, o una mancomunidad de nueve?* El resto lo rellena Catastro.

**Aviso: no hacer aritmética con el coeficiente sin comprobarlo.** Palmas de Las 43
suma 9,92 y Las Flores 96,01.

### Y un hallazgo sobre Marcenado que confirma el átomo

La parcela `0158902VK4705G` **no es "Marcenado 1"**: son **300 fincas** que abarcan
Marcenado **1, 2 y 4** más **Acuerdo 34**, con **20 accesos** y escaleras de la A a la
K. La escalera **C aparece dos veces**, en Marcenado 1 y en Marcenado 2.

> **La escalera sola no identifica nada.** Hacen falta los tres: calle, número y
> escalera.

Y la referencia escrita el 30-sep para las tres filas de Marcenado es correcta pero
**gruesa**: apunta a la manzana entera, no a su escalera.

---

## 5. Los invariantes

Estas reglas sostienen el modelo, y ninguna necesita un "suele":

1. **Una factura, una entidad fiscal.** Siempre. No se puede facturar a dos CIFs a la
   vez; se parte en dos facturas.
2. **Cada entidad fiscal pertenece a un órgano.** Los "varios CIFs de una
   mancomunidad" son los CIFs de sus órganos miembros: lo resuelve el anidamiento.
3. **Un acceso pertenece a un solo órgano de base.** El ámbito de una mancomunidad es
   la unión de los de sus miembros, así que **se deduce, no se guarda**.
4. **El ámbito de un proyecto está dentro del de su encargo**, y el del encargo
   dentro del del órgano que lo aceptó.
5. **La dirección es etiqueta, nunca clave interna** — pero sí es la clave con la que
   la administración abre el expediente. Por eso el callejero oficial no es una
   comodidad: es el eje. Si el número no existe en el callejero, no hay expediente
   que abrir.
6. **El número de hojas de encargo no es una decisión de modelo: es una consecuencia
   de la tramitación.** Si hay tres, la administración pidió tres. Nunca se
   "ordenan" ni se fusionan.
7. **Lo que se guarda es el `id`, nunca el nombre.** Mónica, 30-sep-2026: *"el id de
   la opp es lo que hay que guardar, pero el nombre NO. Si la opp está codificada por
   id, no pasa nada: el dato nombre cambia, y las hojas de encargo se cancelan con
   nueva versión y listo."*

   **El caso real que lo demuestra:** `ALFONSO XII MADRID`. Javier Parra, de
   Schindler, llamó a Álvaro y le dio la dirección mal. Días después la corrigieron —
   era **Alfonso XIII 8, Parla** — pero ya se habían emitido hojas de encargo con la
   dirección equivocada. Con el nombre como clave eso es una fila huérfana para
   siempre; con el `id` como clave es **un campo que se corrige y unas versiones de
   hoja que se rehacen**.

   Y esto ya está soportado: `versiones_hoja` guarda una foto de cada versión, así
   que la dirección vieja **sobrevive donde tiene que sobrevivir** (en el documento
   que se envió) sin contaminar el dato vivo. La corrección no borra la historia.

---

## 6. Dónde está la oportunidad

> **La oportunidad es el intento de conseguir UN sí de UN órgano.**

Y lo estructural: **el desglose por acceso ocurre DESPUÉS del sí, no antes.**

```
ANTES DE LA FIRMA        LA BISAGRA              DESPUÉS DE LA FIRMA
oportunidad         →    hoja / hojas       →    proyectos y expedientes
1 órgano                 se parten por           1 expediente por
1 presidente             lo que exige la         dirección postal
1 conversación           subvención, y por
1 voto                   el CIF que factura
```

Una oportunidad, N hojas, N proyectos, N expedientes — y **cada desglose tiene un
motivo distinto**, que es por lo que no se pueden fundir.

Tres consecuencias:

1. **La oportunidad NO se crea por acceso.** Si el comercial abre una por dirección,
   la misma junta se persigue tres veces y el embudo miente. Es el riesgo real hoy,
   porque la lista de la que parte son direcciones.
2. **El número de accesos tiene que verse en la oportunidad desde el minuto uno**,
   porque multiplica el precio y el trabajo.
3. **La comisión cuelga de la oportunidad**, no de la hoja.

---

## 7. Lo que falta en la base de datos

Sorprendentemente poco. **Lo que ya cabe y no hay que tocar:**

- varios proyectos por comunidad — hay 20, con un máximo de 4
- varias hojas por comunidad — hay 238, con un máximo de 8
- la jerarquía parcela → portal → inmueble: `ficha_catastro`,
  `ficha_catastro_portal`, `ficha_catastro_inmueble` **ya existen y están bien
  diseñadas**. Están vacías (2 fichas, 0 portales, 0 inmuebles), eso es todo.

**Lo que falta: un sitio donde vivan los accesos de una comunidad**, con su dirección
postal y su escalera. De no tenerlo salen los tres problemas que nos trajeron aquí:

- **Marcenado se partió en tres comunidades** porque la única forma de decir
  "escalera C" era inventarse una comunidad. Resultado: la presidenta duplicada tres
  veces, y en una de ellas con el apellido mal escrito, lo que parte la junta en dos
  a ojos de cualquier consulta.
- **Etruria cabe en una fila**, pero la fila pierde que son tres direcciones — y con
  ello pierde que son **tres expedientes**. La app no puede avisar.
- **`oportunidades.referencia_catastral` es un campo de texto**: no sostiene los tres
  accesos de Etruria ni los nueve de Albufera.

Y por eso hoy **el proyecto no tiene ámbito**: no hay forma de decir qué accesos
cubre. Con esa tabla, sí — y da igual que sean uno, tres o catorce.

**El grano de la lista de Mónica es el correcto:** 1.176 de las 1.228 filas (95,8 %)
ya son un solo acceso. Solo 52 nombran varios. No hay que desmontar sus 26 días:
falta el nivel de encima, que es más pequeño.

---

## 8. Campo vacío o fila: la regla que resuelve el "y si no toca"

Pregunta de Mónica: *"el modelo no sería esa tabla, pero con campos vacíos si no
toca? una opp es algo así como un nombre descriptivo de un conjunto de datos donde
algunos pueden ser null?"*

Sí en la mitad, y la mitad que no es la importante:

> **Un campo vacío dice "no hace falta". Nunca puede decir "hay tres".**

- **`escalera` es un campo, y puede ir vacío.** Un acceso tiene cero o un nombre de
  escalera. Pico Cejo 55 lo deja vacío y no cuesta nada. Su instinto es correcto: el
  caso normal no debe pagar por el excepcional.
- **Los accesos son filas, no campos.** Porque pueden ser 1, 3, 9 o 203, y eso no lo
  dice ningún hueco. La diferencia entre columna y tabla no es si está vacía: es
  **cuántas caben**.
- **Y la oportunidad no es un saco de campos opcionales**: es un nombre descriptivo
  (su etiqueta) **más el conjunto de accesos que cubre**. Ese conjunto puede tener un
  solo elemento, y entonces es una fila. Igual de barato que una columna.

**Por eso "crearlo siempre" sale gratis:** para las 1.176 comunidades de un solo
acceso es exactamente una fila, con la escalera vacía. Y la pregunta "¿cuántos síes
necesito?" se contesta contando, en un único sitio, sin excepciones que recordar.

---

## 8 bis. Lo que ya está construido (1-oct-2026)

**`accesos_comunidad`** — 1.244 filas: 1.218 principales (una por comunidad con
referencia) y 26 accesos adicionales. Generada de lo que ya estaba escrito, sin teclear
un dato.

> **OJO CON EL NOMBRE DE LA TABLA.** Aviso de Mónica: *"pon en algún sitio que lo de
> accesos viene porque son accesos a la calle y son los que determinan la unidad, si no
> en dos semanas alguien verá ese nombre y creerá que es una tabla de cosas técnicas."*
> En un estudio de accesibilidad «acceso» suena a rampa o a ascensor. **Aquí un acceso
> es un portal: una escalera con su puerta a la calle.** Está escrito en el `comment on
> table` para quien la abra.

**Mancomunidad / comunidad / subcomunidad: no son tres tablas, son la misma.** Viven en
`comunidades` con dos columnas nuevas, porque por la definición de Mónica los tres **son
comunidades** — todos tienen presidente y junta que vota. Como abuela, madre e hija están
en la tabla de personas.

| columna | qué contesta | de dónde sale |
|---|---|---|
| `figura` | **qué generación eres**: mancomunidad / comunidad / subcomunidad | el título constitutivo, lo sabe el administrador |
| `parte_de_id` | **quién es tu madre** | la estructura; puede faltar |

No es duplicar: `figura` se puede saber **antes** de tener la fila de la madre, y cuando
las dos no cuadran eso también informa («dice que es subcomunidad y no sabemos de quién»).

**El candado que aún no se puede activar:** `(municipio, tipo_via, nombre_via, numero,
escalera)` debería ser único, porque un acceso pertenece a un solo órgano. Hoy hay filas
que comparten acceso porque la misma escalera se metió como varias comunidades (AV ANGELES
6 y AV ANGELES 6 LEGANES, las cuatro de NÉCTAR 31, las tres de MARCENADO). **La lista de
choques es la lista de fusiones pendientes**, y esas son decisión de Mónica.

**Y un error que casi cometemos:** `cotejo_catastro.candidatos` estaba haciendo **dos
trabajos** sin nada que los distinguiera — 26 eran «los otros accesos que también son
míos» y 164 «los portales hermanos entre los que elegí». Av España 35 de Majadahonda lo
enseña: tiene 8 portales y las filas `35-2` y `35-6` guardan las ocho cada una. Una carga
a ciegas habría metido 164 accesos en la comunidad equivocada. Es el síntoma exacto de la
tabla que faltaba: **un campo de notas acabando con dos significados dentro.**

**De rebote, un filón comercial:** de esos 164 hermanos, **99 no son clientes**. Son
portales de edificios donde ya se está trabajando con el vecino sin contratar.

---

## 9. Lo que NO está decidido

- **El órgano se crea siempre.** DECIDIDO por Mónica el 30-sep-2026.
- **El reparto histórico.** Qué filas de las 1.228 son en realidad accesos de un
  mismo órgano es decisión de Mónica, caso a caso. Las pistas están: mismo
  presidente + mismo CIF + mismo edificio. Pero **el mismo presidente no basta**:
  JON AZPITARTE preside dos comunidades con CIFs y parcelas distintas.
- ~~Los importes de subvención.~~ **CONFIRMADO por Mónica el 30-sep-2026: partir en
  más expedientes NO multiplica el dinero.** Los datos concedidos ya lo decían:
  Albufera cobró 830.000 € en un solo expediente (83 viviendas, 18 actuaciones,
  1,85 M€ protegible) y el máximo de la serie llega a 1,2 M€; los 100.000 € que se
  repiten 228 veces son el edificio típico de un ascensor, no un techo. Así que
  **no se parte un proyecto para multiplicar fondos**: el número de expedientes lo
  impone el número de direcciones postales, y no es una palanca.
- **El CIF `E`: aparcado.** Las 41 comunidades con CIF de comunidad de bienes tienen
  un trámite pendiente que les bloquea subvenciones, pero no toca ahora. Ver
  `memory/letras-del-cif.md`.

---

## Los siete casos, para probar cualquier esquema futuro

| caso | la prueba que pone |
|---|---|
| **PICO CEJO 55** | un acceso, escalera vacía: el caso normal no puede costar nada |
| **SANTA CRUZ DE MARCENADO 1** | 1 comunidad, 1 CIF, 1 parcela, 1 dirección, **3 escaleras, 3 proyectos** |
| **ETRURIA 26-28 + LUCANO 65** | 1 parcela, **2 calles, 3 direcciones, 3 expedientes**, 1 comunidad |
| **AV ALBUFERA 250** | 1 dirección, **9 escaleras, 1 expediente**, 18 actuaciones, 830.000 € |
| **MARIBLANCA (Aranjuez)** | 2 direcciones → **2 expedientes obligatorios** |
| **CUESTABLANCA 2** | 1 parcela, **203 accesos**, varias comunidades, bloques = escaleras (C = 48-52, CH = 54-76) |
| **MANCOMUNIDAD LOS CASTILLOS Y VIÑAGRANDE** | 14 parcelas bajo un nombre; encargo cerrado → una referencia y listo |

Ver `docs/catastro-y-urbanismo-madrid.md` (de dónde sale cada dato) y
`docs/glosario-modelo.md` (una palabra por cosa).
