# Herramientas del barrido ficha a ficha (municipios)

Copiadas del hilo del 5-oct-2026 para no perderlas. Se usan desde la raiz del repo.

- `municipio.py "MUNICIPIO"` — lee un municipio entero: lo que hay en produccion, en la clon y las fichas de Dropbox.
  Filtrar las etiquetas vacias de la plantilla: `... | grep -v -E -f scripts/barrido/etiquetas.txt`
  (ojo: recorta los nombres de comunidad a 45 caracteres; buscar en produccion con `nombre=like.<prefijo>*`).
- `trocear2.py` — trocea las notas por fecha, tambien cuando la fecha va sola en su linea.
- `notas_de_ficha.py` — `notas(carpeta, anio)` y `ficha(carpeta)`; el municipio va en la variable de entorno `MUNICIPIO`.

Criterios y reglas: memoria `barrido-municipios-pequenos`.
