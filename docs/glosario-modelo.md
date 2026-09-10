# Glosario del modelo — una palabra por cosa

Acordado con Mónica el 9 de septiembre de 2026.

> **Estado: DECIDIDO, NO APLICADO.** Los nombres de la columna "pasará a llamarse"
> todavía NO existen en la base. Para consultar producción hoy hay que usar los
> nombres de la columna "hoy". El renombrado es un paso aparte, pendiente de hacer.

## Por qué

El nombre `empresa` prometía general y guardaba una sola especie: sus 279 filas
son todas administraciones de fincas, y no hay columna de tipo. El día que entren
las constructoras, ese nombre se cobra. Y hay siete conceptos distintos que en
lenguaje corriente se solapan: administrador (persona), administración de fincas
(empresa), comunidad de propietarios, dirección del proyecto, empresa
contratista, Administración pública y ECU.

**Regla de oro: "administración" a secas no se usa nunca.** O es
`administracion_fincas`, o es `organismo`.

## Los nombres

| lo que es | hoy se llama | pasará a llamarse |
|---|---|---|
| la empresa que administra la finca | `empresa` | `administracion_fincas` |
| el administrador (la persona) | `persona` | `persona` |
| su vínculo con la administración | `puesto` | `puesto` |
| la comunidad de propietarios | `comunidades` | `comunidad_propietarios` |
| la dirección postal | `comunidades.direccion` | `comunidad_propietarios.direccion_postal` |
| la forma corta con la que la llaman | `comunidades.nombre` | `comunidad_propietarios.direccion` |
| el nombre del proyecto (dirección + tipo) | *no existe* | `proyectos.nombre` |
| la empresa constructora | `contratas` | `empresa_contratista` |
| ayuntamiento, junta de distrito, CCAA, ECU | `licencias.organismo` (texto libre) | `organismo` (tabla, a detallar) |
| cómo llegó la administración de fincas | `administracion_origen` | `origen_administracion_fincas` |

`comunidades` se renombra porque la colisión ya está dentro de la propia tabla:
tiene una columna `comunidad_autonoma`.

El nombre del proyecto se compone con lo que ya hay:
`comunidad_propietarios.direccion` + `proyectos.tipo` → "SOLSONA 7 MADRID ASCENSOR".

## Personas: una identidad, muchos puestos

`persona` guarda al ser humano una sola vez. `puesto` dice dónde está, de qué y
**entre qué fechas** (`desde` / `hasta`). Decidido así porque:

- Ya funciona: los 411 administradores viven así desde julio, con 412 puestos.
- `puesto` ya tiene fechas, así que resuelve solo el caso de quien cambia de
  empresa o se va (Carlos García, comercial de mayo 2025 a mayo 2026) sin borrar
  a nadie ni dejar datos mintiendo.

**No obliga a mover nada hoy.** `equipo` (31), `personas_comunidad` (542) y
`contrata_contactos` (116) se quedan donde están. Lo que se decide es la
dirección: cuando entremos en contratas, sus contactos se suman a `persona` en
vez de crear una isla nueva.

## Homónimos

Hay 22 nombres repetidos, 54 personas de 411 (13%). No son duplicados: son
personas distintas, cada una en su administración (tres Enrique: Herraiz
Abogados, Marcal Asesores, JU 94). **El puesto las separa.**

No se puede impedir desde la base: no hay DNI de nadie, no hay nada único por lo
que agarrarlas. La identidad real es nombre + dónde trabaja + un teléfono o
correo. Por eso:

1. `persona` necesita una columna `apellidos`: hoy solo tiene `nombre`, por eso
   se ve "Alberto" a secas. No es que se perdieran: no hay dónde ponerlos.
2. Nunca enseñar una persona sin su puesto, ni en un desplegable: siempre
   "Enrique — Marcal Asesores".
3. Avisar al dar de alta ("ya hay tres José Luis, ¿es alguno?"), con la función
   `buscar_administradores_fuzzy` que ya está en producción. El duplicado se evita
   al entrar, no después.
