# Guía de estilo de la app

> Para no reinventar cada pantalla. Los valores de aquí están sacados de las
> pantallas que Mónica dio por buenas (la ficha de comunidad y su propuesta,
> 25-sep-2026), no de memoria. Si una pantalla nueva necesita algo que no está
> aquí, se habla antes de inventarlo.

## La paleta

Definida en `frontend/app/globals.css`. Se usan **los nombres**, nunca el hex
suelto: `bg-hueso`, `text-carbon`, `border-lima`.

| Nombre | Valor | Qué es |
|---|---|---|
| `carbon` | `#2b2b2b` | El carboncillo del logo. Todo el texto y la barra de arriba. |
| `carbon-soft` | `#3a3a3a` | Un punto menos duro. |
| `lima` | `#7ac943` | El verde de la marca. **Acción**: botón principal, lo que se pulsa. |
| `lima-dark` | `#5fa62f` | El mismo verde para texto sobre blanco, que el claro no se lee. |
| `lima-soft` | `#eef7e4` | Verde casi blanco. Fondo de las tarjetas **de dentro**. |
| `hueso` | `#f7f7f5` | El crema suavísimo. **Fondo de toda la app.** |
| `ajeno` | `#5b7fa6` | Azul pizarra: lo que **no depende de nosotros** (el arquitecto, el escaneo, el 3D). |
| `ajeno-soft` | `#e8eef5` | Su versión de fondo. |
| `alerta` | `#9f3a38` | Rojo apagado. Atasco. Avisa sin gritar. |

Y el ámbar de Tailwind, que hace de **crema intenso** para lo que falta:

| Uso | Clases |
|---|---|
| Fondo de "le falta" | `bg-amber-50/60` con `border-amber-200` |
| Aviso de verdad | `bg-amber-50` con `border-amber-300` |
| Texto caramelo sobre ese crema | `text-amber-900/80`, el título `text-amber-800/80` |
| Un dato que falta, dentro de una ficha | `text-amber-700/50` con la palabra «por completar» |

**Los grises tienen un suelo.** El texto pequeno necesita **4,5:1** de
contraste sobre su fondo (WCAG AA, y lo mismo pide la HIG). Sobre el crema de
las tarjetas eso deja fuera los grises muy claros: `carbon/45` da 2,7:1 y no
vale. Los minimos que se usan:

| Para qué | Clase | Contraste aprox. |
|---|---|---|
| Título de una tarjeta | `text-carbon/85` | 8,5:1 |
| Etiqueta de un campo | `text-carbon/70` | 5,6:1 |
| Pista o texto de apoyo | `text-carbon/65` | 5,1:1 |
| Pista dentro del recuadro | `placeholder:text-carbon/55` | 4,5:1 |

Solo lo **desactivado** puede bajar de ahí: la norma lo exime, y además tiene
que leerse como apagado.

**Nunca gris muerto.** Un hueco no es gris: es ámbar suave. El gris (`black/5`)
es solo para bordes y para lo apagado de verdad (lo que está desactivado).

## Los formularios de entrada

Un formulario no se lee, se rellena: tiene **su propia paleta**, más verde y más
cálida que la de las fichas. La montó Mónica en el taller el 26-sep-2026 y vale
de línea de salida para todos los formularios nuevos; otro formulario podrá
cambiarla, pero se parte de aquí.

| Nombre | Valor | Dónde |
|---|---|---|
| `form` | `#f5fbf0` | El fondo de la página. Verde pálido. |
| `form-card` | `#fffcf0` | La tarjeta, crema. |
| `form-dentro` | `#fcfbf8` | Una tarjeta dentro de otra. |
| `form-nuevo` | `#fff5cc` | Amarillo: **lo que se está creando nuevo** ahí mismo. |
| `form-nuestro` | `#eff5f1` | Lo nuestro: el comercial. |
| `form-quieto` | `#fafafa` | Gris: lo que no cambia nunca (el edificio). |

Y su forma, que también es suya:

1. **Guardar y Cancelar arriba**, en la misma línea que el título y a la
   derecha. Abajo quedan a tres pantallas de donde se está escribiendo.
2. **Lo que siempre se sabe, primero y a lo ancho.** En el alta de comunidad,
   la dirección y la primera nota, una al lado de la otra.
3. **La persona antes que la empresa.** A quien se visita es siempre una
   persona, no una entidad fiscal.
4. **Lo que se crea nuevo se despliega dentro**, en amarillo, sin salir de la
   pantalla. Nunca se manda a otra página a crear algo que hace falta aquí.
   **Y su caja se ve siempre, aunque esté cerrada**: con su título y un botón
   de «Crear» al lado. Si se esconde del todo hasta que alguien elige la opción
   adecuada, para quien la usa no existe.
5. **Lo demás, en columnas paralelas**, no en una pila. Lo que cruza a todas
   («otras personas de contacto») va a lo ancho por debajo.
6. **La pista va dentro del recuadro**, en gris, y desaparece al escribir. No
   como etiqueta fija encima, que ocupa el doble y se queda ahí molestando.
7. **Apretado, no gigante.** Un formulario se rellena de un vistazo: campo de
   `text-sm` con `px-3 py-1.5`, etiqueta de `text-[10px]`, tarjetas de `p-4` y
   huecos de `gap-3` dentro y `gap-4` entre tarjetas. En una ficha, que se lee,
   el texto va más grande; en un formulario, que se rellena, no.
8. **Cada casilla de elegir lleva su minibuscador.** El desplegable del
   navegador solo encuentra por el principio, y no enseña lo que se escribe:
   tecleando «roen» no aparece «ADMINISTRACIONES ROEN». El componente
   `Elegir` abre un panel con un buscador arriba que encuentra el trozo esté
   donde esté, sin tildes ni mayúsculas de por medio. Se usa en todas, tengan
   cinco opciones o doscientas ochenta.

## Las piezas

**La página.** `bg-hueso` de fondo (ya va en el `body`), barra superior
`bg-carbon` pegada arriba, y el contenido en `main` centrado:
`mx-auto max-w-[1300px] px-4 pb-16 pt-5 sm:px-6`. En formularios, `max-w-[1000px]`.

**La salida, siempre.** Lo primero de cada página es el enlace de volver:
`text-sm font-semibold text-carbon/55 hover:text-carbon`, con la flecha `←` y el
nombre del sitio al que vuelve. Ninguna pantalla es un callejón sin salida.

**La cabecera va sobre el fondo, sin tarjeta.** El nombre de la comunidad no se
mete en una card: se escribe grande sobre el crema, con una línea debajo.

```
<div className="mt-3 flex items-baseline gap-x-8 border-b border-black/10 pb-4">
  <h1 className="text-3xl font-bold leading-tight text-carbon sm:text-4xl">…</h1>
```

**La tarjeta.** Blanca, esquina grande, borde casi invisible y sombra mínima:
`rounded-2xl border border-black/5 bg-white p-5 shadow-sm`. Su título, pequeño y
en versalitas: `text-sm font-bold uppercase tracking-wider text-carbon/70`.

**La tarjeta de dentro.** El mismo lenguaje medio tono más apagado, en verde
casi blanco: `rounded-xl border border-lima/25 bg-lima-soft/50 p-4`.

**El campo.** Fondo blanco siempre, aunque esté dentro de una card de color:
`rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-base`, y al
enfocar `focus:border-lima`. Su etiqueta encima, diminuta:
`text-[11px] font-bold uppercase tracking-wide text-carbon/45`.

**El dato (solo lectura).** Etiqueta pequeña y el valor al lado, no debajo:
`text-[11px] font-bold uppercase tracking-wide text-carbon/55` + el valor en
`text-base text-carbon/90`.

**El botón principal.** `rounded-xl bg-lima px-6 py-3 text-base font-bold
text-carbon`, y al pasar por encima `hover:bg-lima-dark hover:text-white`. El
secundario es un borde: `rounded-xl border border-black/10 text-carbon/60`.

**El documento.** En un formulario tiene la forma de un campo: **su nombre
encima, pequeño, y debajo la caja**. Así cabe al lado del dato al que acompaña
—el DNI y el acta junto al número de DNI, la tarjeta junto al CIF— en vez de
envolverse a la línea siguiente. En una ficha, que se lee, va como píldora:

**El documento.** Siempre con cara de documento, esté o no:

```
📄  Tarjeta del CIF  (falta)     ← no subido: border-lima/30 bg-white text-lima-dark/55
📄  Tarjeta del CIF              ← subido:    border-lima/60 bg-lima-soft text-lima-dark
📄  Tarjeta del CIF  subir       ← en un ALTA, donde nunca está todavía
```

**Lo que está por montar.** Se ve, ocupa su sitio, no lleva a ningún lado, y lo
dice con una píldora: `rounded-full bg-black/5 px-2 py-0.5 text-[10px]
font-semibold uppercase tracking-wide text-carbon/40` con la palabra
«Próximamente». El porqué va en el `title`, que solo se ve al pasar el ratón.

## Las reglas de Mónica

1. **La etiqueta solo cuando el valor no se explica solo.** Un nombre de persona
   se explica; una referencia catastral es una retahíla de números que puede ser
   cualquier cosa, y esa sí la lleva.
2. **Nada de cartelitos explicativos.** Si hace falta una frase que explique un
   campo, el campo está mal puesto.
3. **Ver el dato sin clicar.** Los teléfonos a la vista, los resúmenes en la
   tarjeta. Esconder algo detrás de un clic es esconderlo.
4. **Si un dato cambia, no va en «el edificio».** El edificio es lo que no
   cambia nunca: año, viviendas, catastro. El CIF, la cuenta y el censo cambian.
5. **Un hueco no es un error.** Se enseña en ámbar suave y se sigue.
6. **Aprovechar la pantalla.** Nada de una columna estrecha con todo el ancho
   desperdiciado a los lados.
7. **Mosaico, no pila.** Si los campos caben juntos, van juntos. Un formulario
   no es una lista de cosas apiladas una debajo de otra: los campos se reparten
   en filas y se les da el ancho que pide su contenido, para que la pantalla se
   lea de un vistazo y no haya que bajar.

   - Lo normal es una rejilla de dos: `grid gap-4 sm:grid-cols-2`.
   - Cuando los anchos son distintos, se dicen: `sm:grid-cols-[2fr_1fr_1fr]`
     para un IBAN largo con dos números cortos al lado.
   - Lo que de verdad es largo ocupa la fila entera: `sm:col-span-2`.
   - En móvil todo se apila solo; el mosaico es de `sm:` para arriba.

   Ejemplo real, la card «La comunidad» del alta: el CIF en su línea, y debajo,
   en una sola, el IBAN y los dos números del censo.

## Lo que aún no está decidido

- El azul `ajeno` está definido pero casi sin usar: cuando entren las pantallas
  de producción y visado habrá que fijar dónde va.
- No hay modo oscuro y no se ha pedido.
- La tipografía es la del sistema (`--font-sans`). Nunca se ha hablado de traer
  una de fuera.
