# La hoja «DATOS del Proyecto»: de dónde debe salir cada dato

Mónica, 10-oct-2026: la hoja `DATOS del Proyecto_<obra>.xlsx` (2.PROYECTO/1.ESCRITOS) es **universal**: con ella sacan los técnicos las memorias. 634 obras la tienen (2021-2026). Pestaña «es para WORD»: 223 campos con nombre, en fila.

**Su regla:** el Excel **no puede ser una segunda fuente de verdad**. Lo que la base ya sabe por su fuente oficial (Catastro, IEE, comunidad, equipo…) **sale de ahí**; del Excel solo se toma lo que **solo existe en el proyecto**.

Tres grupos:

| Grupo | Qué se hace con él |
|---|---|
| **A · Ya lo tenemos** (fuente oficial en la base) | No se guarda como dato. Se usa solo para **cotejar**: si el Excel dice otra cosa, se avisa (como «dirección no encontrada = mal escrita»). Más adelante, la app **rellena** estos campos del Excel, para que nadie los vuelva a teclear. |
| **B · Solo existe en el proyecto** | Es el dato del proyecto: se guarda en columnas de la base. |
| **C · Texto de la memoria** | Justificaciones y descripciones. Se conserva en el archivo del documento, no como dato. |

La hoja entera se archiva tal cual con su ruta y fecha (como se guarda un PDF): es la copia del documento, **la app no lee datos de ahí**.

---

## A · Ya lo tenemos (≈ 60 campos)

| Campos | Fuente oficial |
|---|---|
| `ARQ_*` (10): nombre, NIF, colegiado, dirección, teléfono, e-mail, firma | Ficha del equipo (Daniel) |
| `PROY_Referencia_Catastral`, `PROY_Tipo_de_Vía`, `PROY_Dirección_*` (7) | Accesos / Catastro |
| `PROMO_*` (10): nombre, CIF, dirección, representante y cargo | Comunidad (nombre «CP …», CIF) y agenda de personas (presidente) |
| `NORM._URBAN.`, `CLASE_DE_SUELO`, `USO_CARACTERÍSTICO`, `OTROS_USOS`, `DISTRITO`, `BARRIO`, `PLANEAMIENTO QUE LE AFECTA` (7) | Urbanismo (geoportal) y distritos. La pestaña «Planeamiento Urb.» del Excel (fecha del plan general por municipio) **pasa a una tabla de la base** (decidido: «todo lo que sea conocimiento común, mejor centralizado») |
| `ED Año de Construcción`, `ED Plantas sobre rasante`, `ED Plantas bajo rasante`, `ED Superficie construida total`, `ED/DC Número de viviendas`, `ED/DC Número de locales` (8) | Catastro |
| `LD Norte/Sur/Este/Oeste`, `PROY_Calle_limítrofe_1..3` (7) | **Catastro, de su cartografía** (parcelas que tocan a la nuestra). La ficha que ya bajamos NO los trae (es la de los inmuebles): hay que añadir esa consulta. Pendiente |
| `BLQ2_*` (3), `IEE_Fecha de visita` | **El IEE** de la comunidad. A veces ya existe (registro de la Comunidad de Madrid) y a veces lo hacemos nosotros: en los dos casos, app y arquitecto lo **consultan o lo generan desde una fuente común** |

## B · Solo existe en el proyecto (≈ 135 campos)

| Bloque | Campos | Para qué sirve |
|---|---|---|
| Qué es | `FECHA`, `PROY_Fase`, `PROY_Tipo_de_Obra`, `PROY_Tipo_de_Obra_SATE`, `PROY_Uds`, `PROY_Tipo_de_Edificio` | Tipo de obra y fecha (para el índice de precios) |
| Caso de actuación | Pestaña «Duraciones»: **Caso A–F** (A demoler escalera; B demoler y reconstruir; C cajear; D solo ascensor; E planta baja; F bajar ascensor existente) | **El criterio de «obras parecidas»** |
| Dinero y plazo | `EBSS PEM`, `EBSS Plazo`, `Nº operarios`, `Volumen mano de obra` (+ GG 13 % y BI 6 % de la pestaña de datos) | Estimación del PEM y de la duración |
| Residuos | `GR ASC *` y `GR SATE *` (14): superficie, m³, densidad, toneladas, coste de gestión | **Estimación de la fianza** |
| Superficies afectadas | `SS Nivel *`, `SS ASC Planta *`, `SS SATE Planta *`, `SS ASC+SATE *` (≈ 77) | Totales en columnas (m² ASC, m² SATE); por planta, tal cual |
| El edificio medido | `DC primer/último nivel`, `peldaños por planta`, `ED Altura a cornisa`, `ED Altura libre`, `ED Superficie por planta`, `ED Nº patios`, `ED Acceso`, `ED Núcleos de escalera` | Catastro no lo da: lo mide el proyecto |
| El ascensor | `AS_*` (16): tipo, carga, pasajeros, **paradas**, **recorrido**, foso, huida, hueco, cuarto de máquinas, cabina, puertas…; `CAB_*`, `EV_*`, `Estructura escalera niveles` | Comparar ascensores parecidos |
| Seguridad y salud | `EBSS Hospital`, `minutos+km` | Del proyecto |
| Certificado energético | `CEE_%` ahorro global y de demanda, `CEE_Núm_Registro_CAM` | **El CEE no existe hasta después del proyecto: lo da el arquitecto y la app bebe de su dato** (Mónica, 10-oct) |
| Subvención | `CEE_Porcentaje subvención`, `CEE_Cuantía máx vivienda` | Depende del caso: del arquitecto o del catálogo de convocatorias |
| Duraciones SATE | Pestaña «Duraciones»: m² SATE normal, antivandálico, cubierta, andamio | Estimación del SATE |

## C · Texto de la memoria (≈ 25 campos)

`DC Estado Actual_Descripción *`, `DC Entorno`, `DC Nueva ubicación del núcleo…`, `JF_*` (12 justificaciones), `DC Estado Modificado_Justificación`, `CTE *`, `CIMENTACIÓN_*`, `E.GEOTÉCNICO_Razones`, `Estado Modificado_Solución fachada/cubierta`, `DC Tendederos/Instalaciones/Cubierta`.

---

## Además del Excel

- **Presupuesto con importes:** siempre existe (sin él no se pide licencia). Los **14 capítulos fijos** (01 Medios auxiliares … 14 Control de calidad) con su importe y la fecha. Del BC3 con importes si está; si no, del PDF del proyecto.
- **Pendiente de comprobar:** si la plantilla cambió entre 2021 y 2026 (campos renombrados o nuevos).

---

## El circuito (Mónica, 10-oct-2026)

1. Al pasar el encargo al técnico, **la app le da el Excel con los campos que ya sabemos prerrellenados** (grupo A y lo que haya del B).
2. El técnico completa el resto y **lo devuelve a la app**.
3. La app lo guarda completo **como registro**: lo del grupo B como datos del proyecto, lo del A solo para cotejar, la hoja entera archivada.

El volcado de las 634 obras ya hechas es este mismo paso 3, en lote.
