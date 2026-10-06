# Lo que se escribía en los huecos del impreso: falta por rescatar

**Para la sesión que lleva los municipios pequeños.** Hay un fallo en cómo se
leen las fichas que afecta a **todos los municipios ya dados por cerrados**,
incluidos los 34 pequeños. Esto explica qué pasa, cuánto se pierde y cómo se
arregla.

Lo descubrió Mónica el 5-oct-2026, mirando una ficha:

> *"Tu parseo descarta todo lo que viene por debajo del primer salto de línea
> fuera de las tablas, y en estas fichas antiguas se escribía mucho en los
> espacios en blanco intercalados. **NO SE PUEDEN PARSEAR; hay que leer.**"*

---

## 1. Qué se pierde, medido

En Leganés, sobre 91 carpetas cotejadas:

| | |
|---|---|
| líneas que no llegan **ni a un campo ni a una nota** | **792** |
| de ellas, con un teléfono dentro | 48 |
| de ellas, tachadas (historia) | 150 |
| carpetas afectadas | **89 de 91** |

No son restos: son **teléfonos de presidentes y vicepresidentes, la contrata
elegida con su fecha, el técnico del ayuntamiento con su horario de atención, el
IBAN de la comunidad** y notas como *"PONER EN COPIA PARA TODO, LOS PRESIDENTES
SON MUY MAYORES"*.

Ejemplo real de lo que se caía entero (`rioduero65`):

```
~~AGUSTIN SACRISTAN GUERRO~~          ← presidente anterior
~~Secretario: Antonio 616350822 1º D~~
916936393 Antero (presidente)         ← teléfono del presidente ACTUAL
Vicente 654 63 80 59 (secretario)
```

**Comprobado que falta también en lo ya cerrado**: San Sebastián de los Reyes
tiene 101 líneas sin rescatar y Parla 54, incluidos 8 contactos del ayuntamiento.

## 2. La regla, en sus palabras

> *"El formulario **NO VA EN NOTAS**, pero hay cosas de ahí que se pueden
> extraer **COMO** nota."*

O sea, dos cosas distintas:

- **fuera**: el número de visado, el expediente, el PEM y las etiquetas impresas
  en mayúsculas (`MEMORIA CALIDADES`, `ACTA DE APROBACIÓN…`)
- **dentro**: lo que una persona escribió a mano en una casilla o en un hueco

## 3. Las etiquetas (decididas por ella)

Lo que hoy no tiene columna en la base va a **nota, con su etiqueta delante**, y
en una barrida posterior se saca con una búsqueda:

> *"Pongámosle etiqueta, como a lo de los técnicos, para que sea fácil
> identificarlo después."*

```
[CONTACTO]      presidentes, vicepresidentes, secretarios, vecinos, con su teléfono
[HISTORIA]      lo tachado: quién era antes
[TECNICO]       el técnico de Accesalia y sus relevos
[CONTRATA]      Roen, FAIN, Orona, Tresa… y quién es quién en ellas
[AYUNTAMIENTO]  el técnico del ayto, su teléfono, su extensión y sus horas
[IBAN]          la cuenta de la comunidad
[OBRA]          el tipo de obra en texto libre
[TRAMITACION]   presentada / aprobada / concedida, con su fecha
```

**Los contactos NO se parten a máquina**: sacar nombre, teléfono y papel de
`679 348 668 (Rubén - Presidente) lastraruben@gmail.com (poner siempre en copia)`
es inventarse la estructura, y su regla es no fabricar datos por heurística. Van
como nota etiquetada y después se crean bien.

## 4. Lo que NO funciona: no pierdas el tiempo

Se probaron tres formas de automatizarlo y **las tres fallaron**:

1. **línea a línea** → pierde el contexto. `"Presidente a marzo 2023:"` sin el
   nombre, el DNI y el teléfono que vienen debajo no dice nada. Mónica lo cantó
   mirando el Excel: *"el texto de la nota NO ESTABA"*.
2. **por bloques** → arrastra el impreso entero porque una sola línea del grupo
   era buena.
3. **pegar la cabecera con la línea siguiente** → une el DNI de un presidente con
   el teléfono de otro, porque entre medias hay etiquetas del impreso.

**La única que funciona es leer las fichas una a una** y escribir los arreglos a
mano. Así se hicieron las 91 de Leganés, las 41 de Móstoles y las 15 de Getafe.

## 5. Cómo se hace

```bash
cd /c/Users/mfavi/ACCESALIA

# 1 · RELEER las fichas. Los fichas_*.csv de antes del 4-oct por la tarde son de
#     un lector que no veía el TACHADO y que cogía "JEFE" como referencia
#     catastral (en Móstoles, 41 referencias inventadas de 77).
python scripts/leer_fichas.py MUNICIPIO

# 2 · Cotejar. Se le pasan TODOS los municipios leídos: rehace el fichero entero.
python scripts/cotejar_carpeta_con_comunidad.py MUNI1 MUNI2 ...

# 3 · Las fechas, igual: todos.
python scripts/fechas_de_carpetas.py MUNI1 MUNI2 ...

# 4 · El diario (sin el formulario delante, ya arreglado).
python scripts/notas_cotejadas_por_direccion.py [--escribir]

# 5 · Lo escrito en los huecos, etiquetado.
python scripts/lo_escrito_en_los_huecos.py MUNICIPIO [--escribir]

# 6 · LEER las cotejadas y arreglar a mano lo que salga partido.
#     Plantilla: scripts/arreglar_las_cortas_getafe.py
```

Para ver una ficha con el contexto de cada línea perdida —que es como se lee
rápido— hay un volcado en `scripts/lo_escrito_en_los_huecos.py:lineas_de()`, y el
patrón de lectura que funciona es imprimir cada línea **con la etiqueta del
impreso que tiene encima**. Ojo: **la etiqueta de encima miente a veces**. En
Ampurdán 7 ponía `JEFE DE OBRA` y Mónica lo leyó: era el *comercial* de Roen.

## 6. Dos avisos que ya costaron una pasada

- **Las listas de municipios no se escriben dentro de los scripts.**
  `cotejar_carpeta_con_comunidad.py` tenía dos listas fijas y al correrlo para
  Móstoles se llevó por delante las 286 filas de Leganés sin meter ninguna de
  Móstoles. Ya está arreglado, pero si aparece otro script con la lista dentro,
  es un fallo esperando.
- **Los municipios con espacios rompían la URL** (`SAN SEBASTIAN DE LOS REYES`).
  Arreglado el 6-oct.

## 7. Lo que hay que rehacer

| | estado |
|---|---|
| Alcorcón, Alcobendas, Fuenlabrada | **falta la pasada de huecos** |
| Leganés, Móstoles, Getafe | hechos, con lectura |
| San Sebastián de los Reyes | **falta**: 101 líneas |
| Parla | **falta**: 54 líneas |
| los 34 pequeños | **falta** — y los tienes tú en memoria con las correcciones de Mónica, por eso los haces tú |

## 8. Por qué merece la pena

Lo mejor que ha salido de esta pasada es **el mapa de los ayuntamientos**, que no
estaba en ningún sitio y que es quien decide las licencias:

- **Móstoles**: siete departamentos con extensión directa — licencias,
  patrimonio, tramitaciones, urbanismo, contribuyente — repartidos en cinco
  fichas distintas. Incluido un *"ojo, es muy pijotera"*.
- **Getafe**: Mª del Mar Filgueira, Técnica de Licencias, con su extensión; y
  Concepción Torre, que atiende de lunes a jueves de 13:00 a 14:30.
- **Leganés**: tres técnicos con nombre y horario — Noelia Martín (martes de 10 a
  14), Nuria Villanueva (de lunes a viernes por la mañana), Antonio García.

Van 35 notas `[AYUNTAMIENTO]` y suman con cada municipio.
