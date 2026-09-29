# Catastro y urbanismo: de dónde sale cada dato

*Escrito el 29-sep-2026. Todo lo de Catastro está **probado contra el servicio real**, no sacado de la documentación. Lo de urbanismo son enlaces que pasó Alex y que **están sin comprobar**.*

---

## Por qué esto importa

Mónica, 29-sep-2026:

> Para pedir las subvenciones, si el proyecto no casa con la dirección "oficial"
> tenemos que justificarlo con cincuenta papeles. **Si desde el minuto 1 cuadramos
> la dirección con Catastro, TODO sale oficial.**

Y de ahí sale el control de calidad que se le ocurrió a ella:
**si Catastro no encuentra la dirección, la dirección está mal escrita.** El canario
en la mina del alta de oportunidad.

Con un matiz, para no dar por malo lo que no lo es: "no lo encuentra" también pasa
en **Navarra y País Vasco** (tienen catastro propio y no están en el estatal), con
números **bis o con letra**, en **fincas de varios portales** donde la dirección
catastral es la del portal principal, y en **obra nueva** sin incorporar. Por eso el
aviso dice **REVÍSALA**, no "está mal".

---

## Catastro · lo que da, gratis y sin certificado

Todo esto está **probado**. Base: `https://ovc.catastro.meh.es`

### Las operaciones que existen

En `/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx` (XML) y en
`/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json` (JSON):

| operación | para qué |
|---|---|
| `ConsultaProvincia` · `ConsultaMunicipio` | los catálogos |
| **`ConsultaVia`** | **qué vías se llaman así, con su tipo** |
| **`ConsultaNumero`** | **qué números existen de verdad en esa vía** |
| **`Consulta_DNPLOC`** | por dirección → las fincas y sus inmuebles |
| **`Consulta_DNPRC`** | por referencia catastral |
| `Consulta_DNPPP` | por polígono y parcela (rústica) |

Y en `/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx`:

| operación | para qué |
|---|---|
| **`Consulta_CPMRC`** | referencia → **coordenadas** |
| `Consulta_RCCOOR` | coordenadas → referencia |

### Tres trampas que costaron un rato

1. **El parámetro de la referencia se llama `RefCat`.** Con `RC` o `RC1/RC2`
   contesta *"la referencia catastral es obligatoria"*, que despista mucho.
2. **`Provincia` es la PROVINCIA, no el municipio.** Mandando `Provincia=LEGANES`
   no encuentra nada; con `Provincia=MADRID&Municipio=LEGANES`, sí.
3. **`Coordenada_X` es la longitud y `Coordenada_Y` la latitud** — al revés de
   como se dice ("lat, long"). No avisa: devuelve otra parcela y tan tranquilo.

### Y tres formas distintas de contestar a la MISMA pregunta

`Consulta_DNPLOC` devuelve una de estas tres, y hay que leer las tres:

- `lrcdnp.rcdnp` → **lista** de inmuebles (el número tiene varios)
- `bico.bi` → **uno solo** (el número tiene uno)
- `numerero.nump` → **"ese número no existe, pero sí estos"** — con la lista

Leyendo solo la primera, respuestas correctas desaparecen **en silencio**: buscando
`MAYOR 14 MADRID` no salía la Calle Mayor, y sí salían Miguel Mayor y Osa Mayor.

### Qué datos trae

**Por cada inmueble** (con la referencia de parcela, 14 dígitos, o por dirección):

referencia · cargo · provincia y municipio (nombre y código INE) · **tipo de vía** ·
**nombre de vía** · **número** y segundo número · código de vía · **escalera ·
planta · puerta** · **código postal** · distrito municipal · **uso** (Residencial,
Oficinas, Comercial, Almacén-Estacionamiento…) · **superficie construida** ·
**coeficiente de participación** · **año de construcción**

**Pidiendo un inmueble concreto** (20 dígitos) añade:

dirección literal · **dirección literal de la FINCA con el rango de portales**
(`AV PRESIDENTE CARMONA 3 N2-5`) · **tipo de parcela** (*"Parcela con varios
inmuebles (división horizontal)"*) · **superficie del SUELO** · enlace al mapa
oficial · **desglose de construcciones** (VIVIENDA 89 m² · ELEMENTOS COMUNES 17 m²)

**Coordenadas**, en el sistema que se pida:

| | esa misma finca |
|---|---|
| `EPSG:4326` grados | `-3,6978` · `40,4540` |
| `EPSG:25830` UTM 30N ETRS89 — **el bueno hoy, el que piden los CAES** | `440.828` · `4.478.387` |
| `EPSG:23030` UTM 30N ED50 — el antiguo | `440.938` · `4.478.594` |

Entre ETRS89 y ED50 hay **110 metros** de diferencia: es la razón clásica de que un
plano viejo y uno nuevo no casen.

**El croquis**, como imagen PNG, desde el WMS de cartografía. Necesita
**coordenadas**, no la referencia — pero la referencia da las coordenadas. Sale la
cartografía de verdad: manzanas, parcelas numeradas, **número de plantas de cada
cuerpo** (`VI+TZA`), **escaleras rotuladas** y nombres de calle. El zoom se elige
con el rectángulo que se pida.

### Lo que NO hay sin certificado digital

El **titular**, el **valor catastral** y la **certificación descriptiva y gráfica
sellada**. Los datos y el croquis, sí.

### Lo que la referencia NO distingue

**La referencia de 14 identifica la PARCELA, no el portal.** `0985203VK4708F` tiene
**89 inmuebles** repartidos entre AV PRESIDENTE CARMONA **3** (38) y **5** (51), con
escaleras A, B, C y D. Pero **cada inmueble sí trae su portal y su escalera**, así
que el reparto se saca de una sola llamada.

En la lista de comunidades hay varios casos: *Presidente Carmona 3 y 5*,
*Calderón de la Barca 6 y 8*, *Diario La Nación 18 y 20*.

### Cuánto tarda

Medido: **buscar la dirección, 1-3 segundos**, incluso abriéndose en abanico a
varias vías a la vez. El resto de la ficha, otros 3.

---

## Urbanismo de Madrid · PROBADO (29-sep-2026)

Enlaces que pasó Alex. **Los tres se han probado uno a uno contra el servicio
real** y los tres funcionan.

Son **ArcGIS REST**, en `sigma.madrid.es/hosted/rest/services/…`. Se consultan así:

```
<MapServer>?f=json                          -> las capas que tiene
<MapServer>/<capa>/query
   ?geometry=X,Y&geometryType=esriGeometryPoint
   &inSR=25830&spatialRel=esriSpatialRelIntersects
   &outFields=*&returnGeometry=false&f=json
```

### TRES COSAS QUE SOLO SE VEN MIRANDO

1. **Los tres trabajan en EPSG:25830** (UTM 30N ETRS89) — las mismas coordenadas
   que piden los CAES. Guardar las UTM no era un capricho: **es la moneda de
   cambio con el Ayuntamiento**.
2. **Los ascensores son PUNTOS, no zonas.** Hay 4.610, uno por portal. Preguntando
   "¿qué hay exactamente aquí?" da **cero siempre**; hay que preguntar
   **"¿qué hay a 25 metros?"** (`distance=25&units=esriSRUnit_Meter`).
3. **No admite paginación** (`resultRecordCount` da error). Para muestrear hay que
   pedir primero los ids (`returnIdsOnly=true`) y luego por `objectIds`.

### Edificios protegidos

```
https://geoportal.madrid.es/IDEAM_WBGEOPORTAL/visor_din.iam?clave=VISOR_IDE&ArcGIS=https://sigma.madrid.es/hosted/rest/services/DESARROLLO_URBANO_ACTUALIZADO/EDIFICIOS_PROTEGIDOS_VIGENTE/MapServer
```

### Qué elementos están protegidos, si lo está

Servicio: `PGOUM97/PG_ANALISIS_EDIFICACION/MapServer` · *"Análisis de la
Edificación"*. La capa útil es la **8, "Condiciones de protección"**.

**Respuesta real** (mismo punto):

```json
{"TIPOANEDIF": 1,
 "PROTECCION": "Áreas y elementos arquitectónicos protegidos",
 "PLANO_AE": "https://geoportal.madrid.es/.../PG97/PLANOS/AE/0106041.PDF"}
```

**Trae el PDF del plano.** Va en memorias e informes.

La protección **no es todo o nada**: puede ser el edificio entero, la fachada, **una
sola** de las fachadas, o **una sola escalera**. Encaja con el modelo de
parcela → portal/escalera → piso: **la escalera es a la vez la unidad de trabajo de
Accesalia y la unidad de protección**.

### Modelo homogéneo de ascensor

Servicio: `URBANISMO/MODELO_ASCENSORES_ESPACIO_PUBLICO/MapServer`, capa 1.
**4.610 puntos, uno por portal.**

**Respuesta real:**

```json
{"DIRECCION": "Calle de Los Yébenes, 229 ",
 "DESCRIPCION": "OCUPACIÓN DE ESPACIO PÚBLICO",
 "INFORME": "https://geoportal.madrid.es/.../ASCENSORES_CH/INF_C17_17.pdf",
 "MODELO":  "https://geoportal.madrid.es/.../ASCENSORES_CH/MOD_C17_17.pdf"}
```

`DESCRIPCION` toma valores como *OCUPACIÓN DE ESPACIO PÚBLICO* o *CASO PARTICULAR*.

**Los PDFs son de CONJUNTO, no de edificio**: el mismo `INF_C17_17.pdf` vale para
Los Yébenes 229 y 231. Se guardan **una vez** y se referencian desde cada finca.

Hay juntas de distrito que **exigen que todos los ascensores sigan un único modelo
concreto**, y solo en algunas calles de su distrito. Esto no es un dato del edificio
ni del suelo: **es una regla que depende de la calle**. Se le pregunta con
coordenadas, no se guarda en la ficha de una finca.

### IEE registrada

Ciudad de Madrid:
```
https://sede.madrid.es/sites/v/index.jsp?vgnextoid=72e1287e26d1e810VgnVCM1000001d4a900aRCRD&vgnextchannel=23a99c5ffb020310VgnVCM100000171f5a0aRCRD
```

Resto de municipios de la Comunidad de Madrid:
```
https://www.rieecm.es/portal/home
```

### ZIRE y ZETU

- **ZIRE** — Zona de Impulso a la Rehabilitación Energética
- **ZETU** — Zona de Especial Transformación Urbana

Propias del Ayuntamiento de Madrid, a través del geoportal. **Falta el enlace
concreto: pendiente de que lo pase Alex.** Cuando llegue se prueba igual que los
tres anteriores, y con todo en la mano se diseñan las tablas de lo urbanístico
—puede que fusionando algunas—.

---

## Las cuatro capas, y a qué pregunta contesta cada una

| capa | de dónde | qué dice |
|---|---|---|
| **Catastro** | Estado | **qué hay construido** — probado |
| **ZIRE · ZETU** | Ayuntamiento | **dónde hay dinero** — falta el enlace |
| **Protección · CIPHAN** | Patrimonio | **qué se puede tocar** — probado |
| **Modelos homogéneos** | juntas de distrito | **qué se puede vender** — probado |

Las tres últimas se contestan hoy a mano y **tarde**, cuando la viabilidad ya está
hecha. Saberlo **el día del Polycam** cambia la conversación con la comunidad.

Y la llave de las tres es la misma: **las coordenadas de la finca**, que ya sabemos
sacar de Catastro.
