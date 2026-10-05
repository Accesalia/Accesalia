# Encargo: las 75 fichas cuyo diario no lleva la etiqueta NOTAS

> **CERRADO el 5-oct-2026.** Al leerlas una a una resultó que las 75 sí llevaban
> la etiqueta NOTAS y su diario ya estaba en producción: el comprobador fallaba por
> las líneas en blanco, el tachado `~~` y el formulario pegado al primer trozo.
> Faltaban solo 6 anotaciones escritas dentro de casillas del impreso
> (`scripts/notas_en_casillas_del_impreso.py`) y partir una nota de Miraflores 12.
> El comprobador ahora va línea a línea y da `0 carpetas a leer`; lo leído como
> formulario queda en `notas_sin_cabecera_revisadas.csv`. Lo de abajo es el
> planteamiento original, que resultó equivocado en su diagnóstico.

**Para una sesión dedicada solo a esto.** Mónica, 4-oct-2026:

> *"Como este es el caso de producción, no del clon, y es relevante para el
> futuro, no me fío del script: prefiero leerlas una a una, aunque tardemos más."*

Eso es exactamente el encargo. **No se automatiza. Se leen.**

---

## 1. Qué hay que hacer

Hay **75 carpetas de Dropbox** cuya ficha de datos contiene un diario de verdad
—correos reenviados, llamadas, acuerdos, requerimientos del ayuntamiento— que
**no ha llegado a producción**. Hay que leer cada ficha, decidir dónde empieza el
diario, y meter esas notas en `notas_oportunidad`.

La lista está en **`notas_sin_cabecera.csv`** (raíz del repositorio), separada por
`|`, con una fila por carpeta:

| columna | qué es |
|---|---|
| `municipio` · `carpeta` | la carpeta en Dropbox |
| `comunidad` | el nombre de la comunidad en la base |
| `opps` | los uuid de sus oportunidades, separados por coma |
| `ruta` | la ruta completa del .docx |
| `caracteres` | cuánto texto se está perdiendo (orientativo, para priorizar) |

## 2. Por qué no vale un script

Estas fichas escriben el diario **pegado detrás del bloque `DATOS ENCARGO`, sin
la etiqueta `NOTAS`**. Hay dos lectores y ninguno sirve:

- `notas_por_bloques()` de `scripts/leer_fichas.py` → busca la cabecera, **no lo
  ve**.
- `bloques_de()` de `scripts/notas_de_las_apartadas.py` → **sí lo ve**, pero
  arrastra los valores sueltos del impreso que van justo antes.

Ejemplo real, `FUENLABRADA/avfranciscojaviersauquillo22`. Lo que saca el segundo
lector empieza así:

```
66449,61                      ← el PEM
TL/008506/2022                ← nº de visado COAM
TL/015325/2025                ← otro visado
2022/DRN_01/000600            ← expediente del ayuntamiento
59,31                         ← superficies
MEMORIA CALIDADES             ← etiquetas del bloque DATOS ENCARGO
PRESUPUESTO DEL CLIENTE
X
ACTA DE APROBACION DEL PROYECTO JUNTA DE VECINOS
ACTA DE APROBACION DEL PRESIDENTE DE LA JUNTA DE VECINOS
APROBACION DE LA SOLUCION POR EL CLIENTE (ANTES DE VISAR)
Fwd: [External] ENCARGO ARQUITECTOS          ← AQUÍ empieza el diario
Recibidos
Juan Bautista Paramio Rodriguez
22 abr 2022, 9:53
Buenos dias. Adjunto para encargó de proyecto. Los vecinos están muy
interesados en que con este proyecto se realice la rampa en la calle, que les
han denegado hacer en su día…
14/09/22 Juan Antonio Alvarez llama porque creía que este proyecto era de Fran.
Comenta que Mª Jesús Barba, vecina del 3ºE (tlf 697 454 305) tiene humedades…
```

Las once primeras líneas son el formulario. El diario empieza en `Fwd:`. **Dónde
está esa frontera es lo que hay que decidir leyendo, ficha por ficha.**

## 3. Cómo leer una ficha

```bash
cd /c/Users/mfavi/ACCESALIA && python - <<'PY'
import os, sys
sys.path.insert(0, 'scripts')
from leer_fichas import PROVINCIA, fichas_de, texto_del_docx
muni, carp = 'FUENLABRADA', 'avfranciscojaviersauquillo22'
r = fichas_de(os.path.join(PROVINCIA, muni, carp))[0]
for i, l in enumerate(texto_del_docx(r)):
    if l.strip():
        sys.stdout.write('%3d| %s\n' % (i, l[:160]))
PY
```

## 4. Las reglas, y todas salieron de equivocarse hoy

1. **No se filtra nada dentro de la nota.** Llegué a quitar líneas por
   considerarlas duplicadas y Mónica me paró: *"¿me estás diciendo que estás
   capando parte de las notas porque tú consideras que ese dato ya está duplicado
   en otro sitio?"*. Lo que no se guarda no se recupera. Si sobra algo, se
   esconde al pintarlo.
2. **Lo que se deja fuera es el FORMULARIO, no la nota.** Los valores sueltos del
   impreso (el PEM, un número de visado, una `X`, `MEMORIA CALIDADES`) no son
   notas. En caso de duda, **se incluye**: es peor perderlo.
3. **Una fecha, una nota.** *"En notas, muy a menudo —sobre todo las recientes—
   empiezan con la fecha dd-mm-aa. Cada fecha, una nota."* Se usa
   `trocear(texto, anio)` de `scripts/notas_de_julio.py`, que ya lo hace.
4. **Se parte SOLO cuando la fecha abre línea.** De 942 líneas con fecha, 45
   llevan una segunda fecha *mencionada dentro del texto* (`cita con el técnico
   el 09-04-2026`). Partir ahí rompe la frase. Un correo reenviado va de una
   pieza.
5. **Si la comunidad tiene VARIAS oportunidades**, la carpeta va con la que tiene
   el acceso de esa dirección, **no con todas**. Salió de Santamaría la Blanca:
   un edificio en esquina con tres portales donde cada oportunidad ya tenía su
   acceso (`SANTA MARIA LA BLANCA 3 esc 1`, `… 5 esc 2`, `IGLESIA LA 22 esc 3`) y
   cada carpeta su pareja. Si las dos oportunidades comparten el mismo acceso, la
   regla no decide: **se pregunta**.
6. **La fecha vacía se deja vacía.** No se pone la de hoy ni la de la
   oportunidad: sería inventarla.

## 5. Dónde van

Tabla `notas_oportunidad`:

| campo | valor |
|---|---|
| `oportunidad_id` | el uuid de la columna `opps` (ver regla 5) |
| `fecha` | la de la nota, o vacía |
| `texto` | la nota entera |
| `origen` | `'ficha_dropbox'` |

Si alguna trae notas de subvención, van a `notas_subvencion`, misma forma.

Se escribe con `base.insertar('notas_oportunidad', filas)` de
`scripts/produccion.py`, **nunca a mano por SQL**.

## 6. Cómo trabajar

- **En tandas de 8 o 10**, escribiendo lo de cada tanda antes de seguir. Si se
  acaba el contexto, lo hecho queda en producción.
- **Marcha en seco primero, siempre**, y enseñarle a Mónica qué entra y qué se
  queda fuera antes de escribir.
- **No se escribe en producción sin su OK explícito.** Esta regla no tiene
  excepciones y se la ha saltado más de una vez.
- Lo que no se resuelva leyendo, **se le pasa a ella en una lista corta** con la
  carpeta y lo que se ha visto. Funciona: lo hizo hoy con los administradores.

## 7. Cómo comprobar al acabar

```bash
cd /c/Users/mfavi/ACCESALIA && python scripts/listar_notas_sin_cabecera.py
```

Regenera `notas_sin_cabecera.csv` comparando contra producción. **Cuando diga
`0 carpetas a leer`, el encargo está hecho.** Hoy dice 75.

## 8. Contexto que conviene tener

- `scripts/produccion.py` es la única puerta a la base. **Local no existe.**
- Las notas de la **tabla-clon** (las 247 carpetas que no estaban en Monday) **ya
  están al día** y no se tocan aquí. Esto es solo producción.
- Estado al cerrar el 4-oct-2026: **761 notas de oportunidad + 9 de subvención**,
  en **155 de 174** oportunidades de Alcorcón, Alcobendas y Fuenlabrada.
- Solo se han barrido 3 municipios de 43, a propósito, como test de estrés.
