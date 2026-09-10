# Notas de trabajo — cartera de Álvaro y fichas de Marcal

Fuente: `C:\Users\mfavi\Downloads\HOJAS DE ENCARGO alvaro.xlsx` (162 filas con
contenido, ene–jul 2026) + fichas de Dropbox parseadas.

> Nada de esto está escrito en la base todavía.

## Marcado del Excel

- `suyo` (128 encargos, 60 administraciones) → la administración es de Álvaro.
- `prestado` (19 encargos, 5 administraciones) → la administración sigue siendo
  de Daniel; solo esa dirección concreta la lleva Álvaro.
  Son ARRIALSI, ATIKO GESTION, Administración de Fincas Monge, MARCAL ASESORES
  y VALENTIN ALCORA.
- `contrata, no admin` (3) → el encargo no viene de una administración.
- 12 filas sin marca: **pendiente de preguntar a Mónica**.

La columna ADMINISTRACIÓN no siempre lleva una administración de fincas: hay
contratas (SCHINDLER, TKE, y las marcadas por ella) y unos 15 vecinos
particulares. Es en realidad "quién trae el encargo".

## Los seis casos dudosos de MARCAL, resueltos por Mónica (2026-09-09)

MARCAL es una mega administración: ~50 administradores contratados, por toda la
Comunidad de Madrid. **El administrador se resuelve por dirección, no por firma.**
Las fichas parseadas lo traen: 29 direcciones, ~8 personas.

| dirección | resolución |
|---|---|
| `calderondelabarca8` | la llevan **los tres juntos** (Raquel Martín, Mariam, Emilio); vale contactar con cualquiera para temas de la comunidad |
| `alcarria60` | **Mariam Jebari** es la administradora; **Enrique** es para facturas y contabilidad |
| `sangregorio4` | la llevan **los dos** (Emilio y Toñi Cárdenas) |
| `rioduero12` | la llevan **las dos** (Mariam Jebari y Toñi Cárdenas) |
| `fuenlabrada95` | es **Toñi Cárdenas** (la ficha lo dice arriba, en "quién contacta") |
| Ntra. Sra. de la Macarena 11 (Leganés) | **no es de Marcal**: contacto Manuel Vázquez, `fincas@hernandezyvazquez.com`. Su ficha no está enganchada a ninguna comunidad |

El correo desambigua mejor que el nombre (`tonicardenas@` unifica tres grafías;
`iaguado@` revela que "Ivan agudo" es errata de Iván Aguado), pero no siempre:
`rgpd@marcalasesores.com` es un buzón genérico de la casa, no de una persona.

## Lo que esto pide del modelo

`comunidad_admin_responsable` ya admite **varias personas por comunidad** y con
vigencia (`comunidad_id`, `puesto_id`, `empresa_id`, `vigente`, `desde`, `hasta`).
Lo que NO tiene es **para qué es cada una**: no hay forma de decir que Mariam es
la administradora y Enrique el de facturas. Solo hay `notas`, texto libre.
Falta un rol. Pendiente de que Mónica diga qué roles existen.

## Aviso para quien lea las fichas

`migracion_ficha.carpeta` NO es la dirección: es la carpeta inmediata, y a veces
es una subcarpeta ("ascensor" se repite en 15 fichas). La dirección está en
`ruta_dropbox`, en el tramo anterior.
