# Encargo: barrer los municipios pequeños, leyendo las fichas

**Para una sesión dedicada.** Mónica, 5-oct-2026: los municipios con menos de 40
carpetas se leen **ficha a ficha**, no con un barrido automático.

> *"Me interesan sobre todo las notas, porque seguro que hay muchas de manías de
> técnicos y de ayuntamientos, particularidades que merece la pena extraer."*

Eso es el valor del encargo. Los campos los sacaría un programa; **las manías no**.

---

## 1. Qué municipios

`tandas_municipios_pequenos.csv` (raíz del repo). **Tanda 1: los 10 más pequeños,
13 carpetas en total.** Cuando esté, la tanda 2: 24 municipios, 193 carpetas.

| municipio | carpetas |
|---|---|
| CUBAS DE LA SAGRA · FRESNEDILLAS DE LA OLIVA · MECO · SEVILLA LA NUEVA · TORRELAGUNA · VELILLA DE SAN ANTONIO · VILLAFRANCA DEL CASTILLO | 1 cada uno |
| ARROYOMOLINOS · ESTREMERA · GUADARRAMA | 2 cada uno |

Los seis grandes (Leganés 286, Móstoles 120, Getafe 83, Alcalá 51, San Sebastián
de los Reyes 41, Parla 40) **no son de este encargo**: van por otra vía y en
paralelo. No tocarlos.

## 2. Cómo leer una ficha

```bash
cd /c/Users/mfavi/ACCESALIA && python - <<'PY'
import os, sys
sys.path.insert(0, 'scripts')
from leer_fichas import PROVINCIA, fichas_de, texto_del_docx
muni, carp = 'MECO', 'avenidadelaluz11'
r = fichas_de(os.path.join(PROVINCIA, muni, carp))[0]
for i, l in enumerate(texto_del_docx(r)):
    if l.strip():
        sys.stdout.write('%3d| %s\n' % (i, l[:160]))
PY
```

`texto_del_docx` **marca lo tachado entre `~~`**. Eso es la pieza más importante
de todo el encargo: ver la sección 4.

Y `leer_ficha(ruta)` devuelve ya los campos extraídos, por si sirve de punto de
partida. **Pero el encargo es leer**: el programa se equivoca en los casos raros,
que son justo los de estos municipios.

## 3. Dónde va cada cosa

Primero hay que saber **si esa carpeta tiene oportunidad** o no:

```
¿la comunidad existe y tiene oportunidad?
   SÍ  → es del listado de julio   → va a PRODUCCIÓN
   NO  → no estaba en Monday       → va a la TABLA-CLON
```

Para cotejar carpeta → comunidad hay dos caminos, en este orden:

1. **`documentos.origen_ruta_dropbox`** — quedó guardado al subir las tarjetas
   del CIF. Es el fiable.
2. **Por la dirección**, con `scripts/cotejar_carpeta_con_comunidad.py`. Ojo con
   sus tres trampas, que ya costaron una pasada cada una:
   - en las carpetas las palabras van **pegadas** (`dosdemayo28`), así que se
     comparan las letras seguidas, no por palabras;
   - **no se quitan los artículos**: `CASTILLA LA NUEVA`, `LOS ÁNGELES`, `LA VEGA`
     los llevan dentro del nombre de la calle;
   - si los dos lados traen **varios números, tienen que ser los mismos**: si no,
     `iglesia16portal1` encaja también con el portal 4.
3. **Si hay dos candidatas, manda la REFERENCIA CATASTRAL.** Resolvió las cuatro
   dudosas del otro día. Si sigue sin estar claro, **se pregunta**.

La tabla-clon se llama
`comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una` y tiene las
mismas columnas que harán falta en producción: es un **clon** a propósito.

## 4. LA REGLA MÁS IMPORTANTE: el tachado

En estas fichas, **texto tachado = esto ya no vale**. Lo descubrió Mónica, y antes
de verlo había 114 campos cargados con el dato viejo.

- **El campo se queda con lo NO tachado.**
- **Lo tachado va a la nota**, nunca se tira: es historia de esa comunidad.
- **Si TODO está tachado, el campo queda VACÍO.** *"Suele significar que no hay
  relevo: no sabemos quién es el nuevo admin, el comercial dejó de trabajar en la
  empresa, no sabemos quién es el nuevo presi."*
- **El orden NO dice cuál es el viejo.** Parece que el primero es el anterior,
  pero en Ávila 3 la tachada era la segunda. **Solo el tachado manda.**
- **No se reconstruyen fechas.** *"Es imposible saber las fechas, lo guardamos
  como notas y solo nos preocupamos de que quede el vigente en el campo de
  verdad."*

Ejemplo real:

```
~~LEANDRO MOLINERO~~ / ~~DAVID CASTILLO actual admin~~ Andrés Avila
   → el administrador es ANDRÉS ÁVILA; los otros dos, a la nota
```

## 5. Los campos, uno por uno

| de la ficha | a dónde | notas |
|---|---|---|
| **administrador** | `empresa` → se vincula | **si es nuevo, NO se crea: se le pasa a Mónica.** Su lista está curada y no se ensucia |
| contacto, teléfono, correo del admin | clon: campos de texto | en producción, de momento no se tocan |
| **presidente** y su DNI | clon: campo `presidente` | **en producción NO se escribe**: la migración de presidentes a la agenda está aparcada hasta que acaben las barridas. Queda en el CSV de la ficha |
| **comercial interno** | `oportunidades.comercial_id` | ver reglas abajo |
| quién nos lo trajo | clon: `trajo_empresa` / `trajo_persona` | |
| **referencia catastral** | clon: `ref_catastral_de_la_ficha` | **BIBLIOGRAFÍA, no el dato bueno.** La buena sale de Catastro al crear la oportunidad y vive en `accesos`. Esta solo sirve para cotejar después. **No pasa a producción** |
| **fecha** | `fecha_apertura` | ver abajo |
| **NOTAS** | `notas_oportunidad` si hay opp; `notas_de_la_ficha` en la clon | **lo más valioso del encargo** |

### El comercial interno

- **Sin etiqueta en la ficha = DANIEL, siempre.** *"Es de la época de cuando no
  había más comercial que él."*
- **Carlos García**: abril-2025 → febrero-2026. **Álvaro de Soto**: desde
  enero-2026. **Beatriz Schiantarelli**: desde octubre-2026.
- Esas fechas son una **red de validación**: si una ficha nombra a Álvaro y es de
  2024, algo está mal leído. Están en `comerciales.fecha_alta` / `fecha_baja`.
- Si la etiqueta nombra a **dos**: el primero es el **captador**
  (`comercial_captador_id`) y el segundo **quien la lleva** (`comercial_id`).

### La fecha de apertura

1. `FECHA ENCARGO` → 2. `FECHA LLEGADA` → 3. `FECHA INICIO` →
4. el **fichero más antiguo** de la carpeta (`mtime`, nunca `ctime`).

**Si la ficha solo da el año**, se afina con el fichero más antiguo **siempre que
caiga dentro de ese mismo año**. Si se sale, se queda el 1 de enero.

Y ojo con dos fechas que mienten: el `ctime` de cualquier fichero dice 2025-04-18
(el día que se sincronizó el Dropbox), y los ficheros **descargados** (un DXF de
Catastro, una ficha técnica de fabricante) traen la fecha de quien los hizo.

**Si la fecha es ≤ 31-dic-2022**, esa oportunidad nace **cerrada**, con
`notas = 'migrada de Dropbox'`, y `fecha_cierre` y `resultado_final` **vacíos**:
no se sabe cuándo ni cómo acabó, y ponerlo sería inventarlo.

### Las notas

- **No se filtra nada dentro de la nota.** Si sobra algo, se esconde al pintarlo.
- **Una fecha, una nota** — `trocear()` de `scripts/notas_de_julio.py`.
- **Se parte SOLO cuando la fecha abre línea.** Una segunda fecha dentro de la
  frase suele ser una fecha *mencionada* (`cita con el técnico el 09-04-2026`), y
  partir ahí rompe la frase. Un correo reenviado va de una pieza.
- **La fecha vacía se queda vacía.** No se pone la de hoy ni la de la oportunidad.
- Hay fichas con **tres bloques de notas**: `NOTAS`, `NOTAS ENCARGO Y PROYECTO` y
  `NOTAS SUBVENCIONES`, más el `notas` del bloque del administrador. Y en algunas
  el diario está **sin cabecera**, pegado detrás de `DATOS ENCARGO`.
- **Mirar también las casillas del impreso**: en licencia, visado o expediente
  aparecen anotaciones que son diario. En la pasada anterior salieron seis así.

## 6. Lo que NO se toca

- **No se crean administradores nuevos.** Se listan y se le pasan a Mónica.
- **No se escriben presidentes en producción** (migración aparcada).
- **No se toca `equipo` ni nada de RRHH.**
- **No se tocan los seis municipios grandes.**
- **No se escribe en producción sin su OK.** Marcha en seco primero, siempre, y
  enseñarle qué entra antes de escribir. Esta regla no tiene excepciones.

## 7. Cómo trabajar

- `scripts/produccion.py` es la **única** puerta a la base: `base.leer`,
  `insertar`, `actualizar`, `borrar`. **Local no existe.**
- **Un municipio cada vez.** Al acabar cada uno: qué se cargó y qué quedó dudoso.
- Lo que no se resuelva leyendo va a **una lista corta** para Mónica, con la
  carpeta y lo que se ha visto. Ese método ya funcionó con los administradores.
- Los ficheros para ella, **a Descargas**, no a la raíz del repositorio.

## 8. Contexto que conviene tener

- Estado al 5-oct-2026: 3 municipios barridos de 43, **1.228 oportunidades**,
  **776 notas**, la tabla-clon con 247 carpetas.
- Memoria del proyecto en `.claude/projects/.../memory/` — sobre todo
  `el-tachado-de-las-fichas`, `notas-de-las-fichas-dropbox`,
  `fechas-de-carpetas-dropbox` y `tabla-clon-de-oportunidades`.
- Mónica decide los nombres de tablas y campos, y revisa todo lo que sea nuevo en
  sus listas limpias. En la duda, se pregunta: siempre sale mejor.
