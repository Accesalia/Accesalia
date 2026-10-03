# La figura legal propietaria, y por qué la tabla `comunidades` mentía

Criterio escrito el **3-oct-2026**, después de una mañana entera de diseño con
Mónica y de haber migrado dos municipios (Alcorcón y Alcobendas) leyendo 28
tarjetas del CIF una a una. **Es la decisión, no un borrador** — lo que queda
abierto está marcado como tal al final.

La conversación empezó por un sitio y acabó en otro. Empezó preguntando dónde
guardar el CIF de una empresa, y acabó descubriendo que la tabla de la que cuelga
media aplicación no es lo que su nombre dice.

---

## 1. El problema, en una frase suya

> *«Lo que me chirría es esto: tengo una tabla llamada comunidades que alberga
> cosas que NO SON comunidades, que son los propietarios de los accesos. (…) Eso
> NO es una lista de comunidades sino de figuras fiscales que toman las
> decisiones que necesito para venderles algo.»* — Mónica, 3-oct-2026

Eso es exactamente lo que es. Y de ahí sale todo lo demás.

---

## 2. Las tres cosas que estaban mezcladas

En una sola fila de `comunidades` conviven hoy tres cosas de naturalezas
distintas:

| | qué es | ¿sobrevive a un cambio de dueño? |
|---|---|---|
| **el sitio** | dirección, municipio, catastro, coordenadas | sí, para siempre |
| **el titular** | CIF, nombre legal, presidente, administrador | no: cambia con la junta |
| **lo que se vende** | la opp, la hoja, el proyecto | muere con el encargo |

Y la prueba de que son cosas distintas no es teórica. **El alcance del titular no
tiene ninguna relación con el alcance del edificio**, y lo hemos visto en las
tarjetas de la AEAT:

- **Santa María la Blanca 3 + 5 + Iglesia 22** (Alcorcón): un CIF, una parcela,
  **tres portales**. Un titular que abarca más que un portal.
- **Santa Cruz de Marcenado 1, escaleras C, D y E** (Madrid): un CIF para **tres
  de las seis escaleras** del portal. Un titular que abarca menos que un portal.
- **Kerria 28 al 40** (Alcobendas): un CIF, una parcela, **ocho portales**.
- **Virgen de Icíar 15, escalera 4** (Alcorcón): un CIF para **una escalera** de un
  edificio en forma de H con 6+6.
- **Ostalazar** (`B28111516`): **una empresa, dos locales, dos municipios**
  distintos — Álava 6 de Fuenlabrada y Doctor Esquerdo 55 de Madrid.

A veces el titular es más grande que el edificio, a veces más pequeño, y a veces
cruza de municipio. **Son dos ejes independientes.**

---

## 3. Lo decidido

### 3.1 La forma, y es suya

> *«Una tabla relacional: `id_comodin` — `figura`, donde comodín es: comunidad,
> empresa, persona, organismo. Punto. **ESO ES LO QUE YO DECIDÍ.** (…) Cada
> acceso apunta a su `id_comodin`, sea cual sea el propietario. La figura solo es
> un identificador, los datos viven en su tabla: comunidades cuando es comunidad,
> empresa cuando es empresa, persona cuando es particular, organismo cuando sea
> organismo.»* — Mónica, 3-oct-2026

```
        accesos
           │  cada acceso apunta a un id_comodin, sea quien sea el dueño
           ▼
figura_legal_propietaria     id_comodin · figura      ← dos columnas, CERO datos

y el id_comodin ES el id de la fila donde viven los datos:

  Comunidad de Propietarios · Mancomunidad · Entidad Urbanística ·
  Subcomunidad · Comunidad sin título constitutivo  →  comunidades
  Propietario Empresa                               →  empresas_propietarias
  Propietario Particular                            →  persona
  Copropiedad Particular                            →  inmueble_varios_titulares
  Organismo                                         →  organismos (aún sin crear)
```

De ahí una propiedad que importa: **para una comunidad el id del comodín es el id
de la comunidad**, así que el día que `accesos` apunte a la figura no se mueve ni
un dato — solo cambia a qué tabla apunta la clave ajena.

Y el precio, dicho claro: **Postgres no puede poner una clave ajena a cinco
tablas.** La correspondencia figura → tabla no la garantiza la base; hay que
vigilarla con un freno o un trigger. Es la única cosa que este modelo cuesta.

> **Lo que ponía aquí antes era mío, no suyo.** Había escrito «una tabla de
> identidad fiscal por tipo, con el CIF y el nombre dentro», que Mónica no dijo
> nunca; y al día siguiente me la discutí a mí mismo delante de ella como si
> fuera una decisión suya. Queda anotado porque el error es el mismo dos veces:
> escribir como decidido algo que no se había decidido.

### 3.2 Un titular, muchos accesos. Nunca al revés

**`1 figura legal → N accesos`**, y punto. No hace falta muchos-a-muchos.

Se consideró y se descartó. Cuando parecía que un acceso tenía dos titulares —el
caso de la casa de Mónica, con dos propietarios— la solución no es partir la
relación, es **subir un nivel**, que es como ya funciona la mancomunidad:

> *«Subimos un nivel. Como en mancomunidad: 1 mancomunidad - n comunidades - 1
> acceso. Lo que nos falta es que cuando hay más de 1 titular en 1 acceso, exista
> un paso intermedio que no rompa el modelo normal que se cumple en TODOS los
> demás casos.»*

Ese paso intermedio **es la propia figura**. La multiplicidad vive **dentro** del
titular, no en la relación:

- Una **comunidad de propietarios**: una figura, y dentro una persona con rol
  `presidente`. Los cincuenta propietarios que votan no se guardan nunca: no
  hacen falta.
- **Una casa con dos dueños**: la figura `Copropiedad Particular` —*«una cosa
  legal, la casa con sus bienes»*— y debajo **dos** personas con rol de
  propietario. Su forma es, en palabras suyas, **«como mancomunidad pero al
  revés»**: la mancomunidad está *encima* y agrupa comunidades; la copropiedad
  está *debajo* del acceso y apunta a sus personas.

  **No es `Comunidad sin título constitutivo`, y confundirlas tiene coste.** Esa
  otra figura es un edificio de vecinos al que le falta un papel, y eso es una
  señal de venta: mañana puede constituirse. Una casa de dos dueños no va a ser
  comunidad nunca. Mezclarlas ensucia el filtro «comunidades a las que les falta
  constituirse», que empezaría a devolver unifamiliares. *(Lo propuse mal y lo
  corrigió ella: «PUES MAL, ESA NO DEBE SER LA FIGURA».)*
- Una **comunidad de vecinos sin constituir**: una figura y **ninguna** persona
  dentro. Y de las de verdad hay varias en la cartera.

Esto último tiene una propiedad que conviene ver: **que una comunidad esté
constituida o no deja de ser una diferencia estructural y pasa a ser un dato.**
Una tiene presidente, la otra no. Nada se rompe y nada queda vacío a la fuerza.
Por eso la figura `Comunidad sin título constitutivo` ya vale tal como está.

### 3.3 No hay tabla de edificio

Se consideró y lo descartó ella, con razón:

> *«Que el paraguas sea el edificio es mala idea: un edificio puede contener
> varios accesos, varias comunidades, cada una dividirse en escaleras… el
> edificio no me dice nada útil.»*

El agrupador útil no es «qué hay en este edificio» sino **«qué accesos tiene este
titular»**, y eso lo da la relación directamente.

La prueba de que el edificio tampoco serviría: **la parcela de Catastro se
comporta de forma distinta en cada calle.** En Néctar 31 agrupa tres portales; en
Kerria, ocho; en Marqués de Corbera, **uno por portal** — el 36(B) y el 36(C) son
dos parcelas distintas, porque las letras entre paréntesis son los *duplicados* de
Catastro, no escaleras.

### 3.4 El id es de la cosa

Cuando una figura no es una comunidad, su id **no se arrastra** del que tenía en
la tabla vieja: es el que se genera al dar de alta la empresa, la persona o el
organismo. Lo que apuntaba a la fila vieja se repunta al id nuevo.

Son **cinco filas** en toda la base, con cinco o seis referencias cada una. El
trabajo es pequeño; la decisión es lo que importaba.

### 3.5 Las personas no llevan tabla nueva: `persona` + `puesto`

Esto ya estaba decidido desde el **9-sep-2026** y escrito en
`docs/glosario-modelo.md`; lo único que se hizo el 3-oct fue reconocerlo:

> `persona` guarda al ser humano una sola vez. `puesto` dice dónde está, de qué y
> **entre qué fechas**. (…) **Lo que se decide es la dirección**: sus contactos se
> suman a `persona` en vez de crear una isla nueva.

Y el razonamiento de ella del 3-oct, que es el que lo cierra:

> *«Los datos de persona suelen ser iguales: lo que conservan de puesto en puesto
> —nombre, apellidos, DNI si toca, teléfono y mail personales, nº de colegiado—,
> los de su labor profesional —dónde trabaja, haciendo qué, desde y hasta
> cuándo— y los de contacto derivados del puesto. **Da igual si trabaja en un
> ayuntamiento, una contrata o un admin de fincas: esos datos valen para
> todos.** Los datos de empresa, no.»*

Por eso **la agenda es común y las entidades no**: un administrador me trae
negocio y un ayuntamiento me controla el trabajo; un ayuntamiento tiene
departamentos y una administración tiene un jefe y una cartera; y el CIF lo tiene
la empresa, no lo tiene el ayuntamiento, y el administrador solo si no es
autónomo. Nada de eso cabe en una tabla común.

Lo que sí hace falta: **`puesto` gana un apuntador a la figura**, y con él el
presidente de una comunidad, los dueños de una copropiedad y el apoderado de una
empresa salen sin inventar nada — con `cargo`, `desde` y `hasta`, que es el
historial que ella pidió para la ficha de persona y que hoy `personas_comunidad`
no tiene.

Las **542 filas de `personas_comunidad`** (todas `presidente`, 440 con
`documento`) se doblan ahí dentro **otro día**, y no será copiar: 67 de esas 542
llevan el piso, la fecha, el cargo o el teléfono metidos dentro del nombre. Está
medido y anotado en los pendientes de fontanería.

### 3.6 Una figura más: `Organismo`

Añadida a las siete de Mónica por el caso del castillo de Ávila, cuyo propietario
era el ayuntamiento. **La tabla de organismos no se crea con solo este caso**: los
organismos van a volver a aparecer, y con mucha más fuerza, por el lado de
licencias —ayuntamiento, junta de distrito, ECU, COAM— y conviene modelarlos
conociendo los dos usos y no solo este.

---

## 4. Lo que NO es la tabla de figuras, y es importante

Mónica pensaba que esa tabla iba a ser **su lista de «sitios que hemos tocado»**.
No lo es, y descubrirlo fue el giro de la mañana.

> *«Yo quiero tener una lista de "sitios que hemos tocado" sin más. Y de cada uno:
> qué salió de aquí y cuándo, a quién llamo si quiero ofrecerle algo más, en qué
> punto está lo que salió de aquí.»*

Esa lista **sale de `accesos` + `opp_accesos`**, no de las figuras. La figura es
donde aterrizas cuando preguntas *«¿a quién llamo?»*. Comprobado el 3-oct sobre
producción: **1.377 sitios tocados**, todos con hoja de encargo, 669 con proyecto,
y **655 sin nadie a quien llamar** — que es un agujero de datos, no de modelo.

Y la lista hay que **agruparla por dirección**, no por acceso suelto ni por
parcela. Néctar 31 son tres accesos, cinco oportunidades y cuatro filas de
«comunidad» en la base: para Mónica es **un sitio**.

---

## 5. Lo que este modelo regala

Dos cosas salen gratis de la misma estructura, y las dos son comerciales:

1. **«Aquí no lo has tocado todo.»** Accesos del titular menos accesos de la opp.
   Con los datos de hoy: **138 sitios** con **216 portales** sueltos.
2. **Detección de mancomunidades.** Si los accesos de una opp caen en más de una
   parcela, casi seguro es una mancomunidad. Da **nueve** candidatas, y la primera
   de la lista se llama literalmente «MANCOMUNIDAD LOS CASTILLOS Y VIÑAGRANDE»:
   diez accesos, diez parcelas, un solo CIF.

Y un caso que lo ilustra entero: **Kerria**. Un ascensorista llamó por el portal
30; ni él ni Accesalia sabían que la comunidad son los portales **28 al 40**. La
tarjeta del CIF lo dice y los ocho accesos ya estaban en la base. De ahí sale una
oportunidad nueva —hablar con el administrador de los otros siete— y el campo
donde colgarla, `oportunidades.oportunidad_origen_id`, lleva vacío desde julio.

---

## 6. Lo que queda abierto

- ~~**Los nombres de las tablas.**~~ **CERRADO el 3-oct**, los puso ella:
  `figura_legal_propietaria` (la comodín), `inmueble_varios_titulares` (la
  copropiedad), `empresas_propietarias`, `organismos`. Y la figura nueva,
  `Copropiedad Particular`.
- ~~**`cotejo_catastro` y `accesos_comunidad`.**~~ **CERRADO el 3-oct**: no eran
  modelo, eran el acta de dos trabajos terminados. Están en el esquema
  `historico_de_tablas`, fuera del alcance de la aplicación.
- **`documentos`.** La tarjeta del CIF es de la figura —una empresa también tiene
  CIF—, pero el acta de una junta es de la comunidad. Decisión de ella, aplazada a
  propósito: *«documentos es más complejo, y además como va a apuntar a diferentes
  tablas, mejor creamos las tablas primero y luego decidimos en documentos qué
  apunta a cada una»*. Las 28 tarjetas ya guardadas apuntan hoy a `comunidad_id`.
- **El comodín ancho de `puesto`**, para las entidades que todavía no tienen
  tabla. Su lista de entidades fiscales del 3-oct: administraciones de fincas,
  contratistas, ECU, ayuntamiento, junta de distrito, comunidad autónoma, empresas
  de servicios (bancos, compradoras de CAEs) y colegios profesionales (COAM y los
  de otras comunidades). Hoy `puesto` solo puede apuntar a una administración de
  fincas o a una figura propietaria.
- **El renombrado de `comunidades`.** 40 referencias en 25 ficheros y 21 claves
  ajenas. Renombrar no toca ni los datos ni las claves: solo rompe lo que la llama
  por su nombre. Lo que sí obliga a cambiar claves ajenas es que **cinco filas se
  muden de tabla**.
- **El local comercial dentro de una comunidad.** Un local de Ostalazar en un
  edificio cuya comunidad es otra: los dos son titulares del mismo acceso en
  sentidos distintos. La figura `Subcomunidad` existe para eso. **Hoy no se da el
  caso y no se modela**, pero conviene saberlo.

---

## 7. Dos reglas de trabajo que salieron de aquí

> *«Los datos que haya ahora no mandan, son los datos que vamos completando. Si no
> hay de empresas es porque AÚN no los hemos metido.»*

Durante esta conversación usé tres veces «esta columna está vacía» como argumento
para concluir algo del modelo. **Es un error y está prohibido.** Una columna vacía
dice que todavía no se ha llegado ahí, no que el dato no exista.

> *«La app no la usa NADIE, estoy sola yo en diseño. Si se queda rota 5 minutos o
> 5 días, no pasa nada.»*

El coste de estos cambios **no es el riesgo**, es el rato de revisarlos. Y por eso
se hacen ahora: *«hacerlo bien ahora evita rehacer cuando la bola sea tan grande
que resulte un drama».*
