// lib/informeEdificio.ts
//
// EL INFORME DEL EDIFICIO (Monica, 29-sep-2026).
//
// Todo lo que se puede saber de un edificio SIN LLAMAR A NADIE, reunido en una
// ficha. Se adjunta al informe de viabilidad: "es buenisimo y sale gratis".
//
// Y la regla que lo gobierna: NO BASTA CON ENSEÑAR EL DATO, HAY QUE TRADUCIRLO.
// Un "70% residencial" no le dice nada a nadie; "con ese porcentaje entrais en
// Rehabilita Madrid" si. Por eso cada dato lleva, cuando procede, su `significa`.
//
// Las secciones son las que ordeno ella: identidad · el edificio · los usos ·
// proteccion · dinero · restricciones · lo que solo se sabe yendo.
//
// TODAS las fuentes estan probadas contra el servicio real el 29-sep-2026. El
// detalle y las trampas, en docs/catastro-y-urbanismo-madrid.md

import "server-only";
import { enElCatalogo, enlaceFicha, nombreBonito, sinTildes, type EnElCatalogo } from "./catalogoProteccion";

const CALL = "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json";
const COOR = "https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx";
const SIGMA = "https://sigma.madrid.es/hosted/rest/services";

export type Dato = {
  que: string;
  valor: string;
  /** La traduccion: que permite, que impide, que hay que hacer. */
  significa?: string;
  /** Cuando el dato no se ha podido averiguar y hay que preguntarlo o ir a verlo. */
  falta?: boolean;
  /** Un documento para comprobarlo: la ficha del catalogo, el plano... */
  enlace?: { texto: string; url: string };
};

export type Seccion = { titulo: string; datos: Dato[] };

/** Una subvencion ya concedida en la zona. Vale para dos cosas: saber si a ESTE
 *  edificio ya le dieron algo, y como argumento de venta -"a los de al lado les
 *  dieron 207.900 euros"-. */
export type SubvencionCerca = {
  direccion: string;
  importe: number | null;
  convocatoria: string | null;
  viviendas: number | null;
  ahorroCo2: number | null;
  /** Cuando se concedio (subvencion_concedida.fecha). Null si no consta: el
   *  visor del COAM no la da. */
  fecha: string | null;
  /** EL AÑO DE LA CONVOCATORIA, para la columna Año (Monica, 15-oct-2026: "para
   *  identificar cuando se pidio"). Sale del nombre de la convocatoria
   *  ("REHABILITA 2021", "Plan MAD-RE 18") o, en las del COAM, de su expediente
   *  (".../2022"); las Next Generation del Ayuntamiento lo toman de su gemela del
   *  COAM. Null si no se sabe (un plan de varios años, el PREE...). */
  anio: number | null;
  /** El año de la CONCESION (de la fecha). Junto al de la convocatoria dice
   *  cuanto se tardo. Null en las del COAM, que no dan fecha. */
  anioConcesion: number | null;
  /** De donde sale: "Ayuntamiento de Madrid" o "Comunidad de Madrid (COAM)". */
  fuente: string;
  aqui: boolean;
};

/** Una conclusion de venta. `tono`: lo que juega a favor, lo que hay que vigilar,
 *  y lo que solo cuenta como contexto. */
export type Conclusion = { texto: string; porque: string; tono: "favor" | "ojo" | "dato" };

export type InformeEdificio = {
  referencia: string;
  direccionOficial: string;
  municipio: string | null;
  lat: number | null;
  lng: number | null;
  utmX: number | null;
  utmY: number | null;
  croquis: string | null;
  aerea: string | null;
  visorCatastro: string;
  secciones: Seccion[];
  /** Lo que significa ESTE edificio, para la conversacion con el administrador. */
  conclusiones: Conclusion[];
  subvencionesCerca: SubvencionCerca[];
  /** De donde son las de subvencionesCerca (Monica, 15-oct-2026): "800m" = a
   *  menos de 800 m; "entorno" = a menos de 800 m habia menos de 5 y son 8 del
   *  municipio, elegidas al azar pero siempre las mismas para cada edificio. */
  ambitoSubvenciones: "800m" | "entorno";
  /** Cuando se pregunto a Catastro y al geoportal. Un dato de hace un año no es
   *  falso, pero conviene saber que es de hace un año. */
  consultadoEn: string;
  /** Los PDFs que hay que descargar y adjuntar. */
  pdfs: { que: string; url: string }[];
  /** Lo que no se ha podido saber y hay que ver en la visita. */
  soloYendo: string[];
  fallos: string[];
};

// ------------------------------------------------------------------ catastro

type Inm = {
  rc?: { pc1?: string; pc2?: string; car?: string; cc1?: string; cc2?: string };
  idbi?: { rc?: { pc1?: string; pc2?: string; car?: string; cc1?: string; cc2?: string } };
  dt?: {
    np?: string; nm?: string;
    locs?: { lous?: { lourb?: { dir?: { tv?: string; nv?: string; pnp?: string; plp?: string; snp?: string; cv?: string }; dp?: string; dm?: string; loint?: { es?: string; pt?: string; pu?: string } } } };
    loine?: { cp?: string; cm?: string };
  };
  debi?: { luso?: string; sfc?: string; cpt?: string; ant?: string };
};

const eur = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 0 }) + " €";

const num = (s?: string) => {
  const n = Number(String(s ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const urb = (i: Inm) => i.dt?.locs?.lous?.lourb;
const rcDe = (i: Inm) => i.rc ?? i.idbi?.rc;

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Catastro CORTA LA CONEXION si se le pregunta muy seguido: es lo que hacia que
 *  fallaran la finca y las coordenadas mientras la primera llamada iba bien. Asi
 *  que van una detras de otra, con pausa, y con un reintento. */
async function conCalma<T>(que: () => Promise<T>, reintentos = 1): Promise<T> {
  let ultimo: unknown;
  for (let n = 0; n <= reintentos; n++) {
    if (n > 0) await espera(900);
    try {
      return await que();
    } catch (e) {
      ultimo = e;
    }
  }
  throw ultimo instanceof Error ? ultimo : new Error(String(ultimo));
}

async function jsonDe(u: string): Promise<Record<string, unknown>> {
  const r = await fetch(u, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`Catastro respondio ${r.status}`);
  return r.json() as Promise<Record<string, unknown>>;
}

async function textoDe(u: string): Promise<string> {
  const r = await fetch(u, { cache: "no-store" });
  if (!r.ok) throw new Error(`Catastro respondio ${r.status}`);
  return r.text();
}

/** Pregunta a una capa del geoportal "que hay en este punto". `radio` en metros:
 *  hace falta para las capas de PUNTOS -los ascensores-, porque preguntando por
 *  el punto exacto no acierta NUNCA. */
async function enElPunto(servicio: string, capa: number, x: number, y: number, radio = 0, enGrados = false) {
  const q = new URLSearchParams({
    geometry: `${x},${y}`,
    geometryType: "esriGeometryPoint",
    inSR: "25830",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: enGrados ? "true" : "false",
    f: "json",
  });
  if (enGrados) q.set("outSR", "4326");
  if (radio > 0) {
    q.set("distance", String(radio));
    q.set("units", "esriSRUnit_Meter");
  }
  const d = (await jsonDe(`${SIGMA}/${servicio}/MapServer/${capa}/query?${q}`)) as {
    features?: { attributes: Record<string, string | number | null>; geometry?: { x?: number; y?: number } }[];
  };
  return d.features ?? [];
}

const limpiaClave = (k: string) => k.split(".").pop() ?? k;
const atributos = (a: Record<string, string | number | null>) =>
  Object.fromEntries(Object.entries(a).map(([k, v]) => [limpiaClave(k), v]));

// -------------------------------------------------------------- LO CRUDO
//
// Lo que se trae de fuera, tal cual. Se guarda entero y de aqui sale el informe
// SIEMPRE: da igual si acaba de llegar de Catastro o si lleva un mes guardado.
// Una sola derivacion, para que no haya dos caminos que digan cosas distintas.

export type Crudo = {
  inmuebles: Inm[];
  fincaLdt: string;
  tipoParcela: string;
  suelo: number | null;
  lat: number | null;
  lng: number | null;
  utmX: number | null;
  utmY: number | null;
  protegido: Record<string, unknown> | null;
  condiciones: Record<string, unknown> | null;
  ascensor: Record<string, unknown> | null;
  apiru: Record<string, unknown> | null;
  arru: Record<string, unknown> | null;
  cerca: SubvencionCerca[];
  /** "entorno" si `cerca` son las del municipio (ver ambitoSubvenciones). */
  ambitoCerca?: "800m" | "entorno";
  fallos: string[];
  consultadoEn: string;
  /** False cuando el informe sale de las tablas extraidas y el geoportal de
   *  Madrid no se ha consultado: entonces no se sabe, y no se dice "No". Sin el
   *  campo (lo guardado por la propia pantalla) es que si se consulto. */
  geoportal?: boolean;
  /** Recien traido de fuera: lo que hace falta para escribirlo en las tablas
   *  (no se guarda en la foto). */
  _fuera?: {
    /** Las fuentes del geoportal que no respondieron: esas no se guardan. */
    geoFallidas: string[];
    /** El censo de alrededor tal cual (con posicion y fecha), para
     *  subvencion_concedida. */
    censo: Record<string, unknown>[];
  };
};

// ------------------------------------------------------------------ el informe

function componer(ref: string, c: Crudo, catalogo?: EnElCatalogo): InformeEdificio | null {
  const { inmuebles, fincaLdt, tipoParcela, suelo, lat, lng, utmX, utmY } = c;
  const { protegido, condiciones, ascensor, apiru, arru, cerca } = c;
  const enElEntorno = c.ambitoCerca === "entorno";
  const dondeCerca = enElEntorno ? "en el entorno" : "a 800 m";
  const fallos = [...c.fallos];
  const pdfs: { que: string; url: string }[] = [];
  if (inmuebles.length === 0) return null;

  const primero = inmuebles[0];
  const dir = urb(primero)?.dir;
  const municipio = primero.dt?.nm ?? null;

  // --- 4 · cuentas sobre los inmuebles -------------------------------------
  const anios = inmuebles.map((i) => num(i.debi?.ant)).filter((n): n is number => n !== null);
  const anio = anios.length ? Math.min(...anios) : null;
  const plantas = Array.from(new Set(inmuebles.map((i) => urb(i)?.loint?.pt).filter((p): p is string => !!p)));
  const bajoRasante = plantas.filter((p) => p.startsWith("-"));
  const sobreRasante = plantas.filter((p) => !p.startsWith("-"));
  const escaleras = Array.from(new Set(inmuebles.map((i) => urb(i)?.loint?.es).filter((e): e is string => !!e))).sort();
  const portales = Array.from(
    new Set(
      inmuebles
        .map((i) => {
          const dd = urb(i)?.dir;
          return dd?.pnp ? [dd.tv, dd.nv, dd.pnp].filter(Boolean).join(" ") : null;
        })
        .filter((p): p is string => !!p),
    ),
  ).sort();

  const esVivienda = (i: Inm) => i.debi?.luso === "Residencial";
  const viviendas = inmuebles.filter(esVivienda);
  const comercio = inmuebles.filter((i) => i.debi?.luso === "Comercial" || i.debi?.luso === "Oficinas");
  const comercioBajo = comercio.filter((i) => ["00", "BJ", "-1"].includes(urb(i)?.loint?.pt ?? ""));
  const garaje = inmuebles.filter((i) => (i.debi?.luso ?? "").includes("Estacionamiento") || (i.debi?.luso ?? "").includes("Almacen"));

  const sup = (l: Inm[]) => l.reduce((t, i) => t + (num(i.debi?.sfc) ?? 0), 0);
  const supTotal = sup(inmuebles);
  const supVivienda = sup(viviendas);
  const pctNumero = inmuebles.length ? Math.round((viviendas.length / inmuebles.length) * 100) : 0;
  const pctSuperficie = supTotal ? Math.round((supVivienda / supTotal) * 100) : 0;

  const esMadrid = (municipio ?? "").toUpperCase() === "MADRID";
  // Madrid capital sin geoportal consultado: un hueco no es un "No" (9-oct-2026).
  const sinGeo = esMadrid && c.geoportal === false;
  const sinConsultar = (que: string) =>
    d(que, "Sin consultar todavía", "Es un dato del geoportal de Madrid y aún no se ha bajado.", true);

  // ZETU y ZIRE no son capas: se calculan. El Plan Rehabilita absorbio APIRU y
  // ARRU dentro de ZETU, y creo ZIRE para el resto de Madrid capital.
  const zona = !esMadrid || sinGeo ? null : apiru || arru ? "ZETU" : "ZIRE";

  if (condiciones?.PLANO_AE) pdfs.push({ que: "Plano de análisis de la edificación", url: String(condiciones.PLANO_AE) });
  if (ascensor?.INFORME) pdfs.push({ que: "Informe del modelo de ascensor", url: String(ascensor.INFORME) });
  if (ascensor?.MODELO) pdfs.push({ que: "Modelo de ascensor obligatorio", url: String(ascensor.MODELO) });

  // --- 6 · las secciones, con la traduccion ---------------------------------
  const d = (que: string, valor: string, significa?: string, falta?: boolean): Dato => ({ que, valor, significa, falta });

  // FUERA DE MADRID: el catalogo del municipio, si lo tenemos (Monica, 11-oct-2026).
  // Madrid capital sigue con su geoportal, sin tocar.
  const nombreMunicipio = nombreBonito(municipio);
  const conCatalogo = !esMadrid && catalogo?.bajadoEl != null;
  const fecha = (x: string) => (x ? new Date(x + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "");
  const COMO = { referencia: "la referencia catastral", parcela: "la manzana y parcela catastral", direccion: "la calle y el número" } as const;
  const datosCatalogo: Dato[] = !conCatalogo
    ? []
    : [
        ...(catalogo!.casados.length
          ? catalogo!.casados.map(({ fila, como }, n) => ({
              ...d(
                // Copy de Monica (15-oct-2026): "Probable proteccion. Revisar", y el
                // enlace al catalogo.
                catalogo!.casados.length > 1 ? `Probable protección (${n + 1})` : "Probable protección",
                "Revisar",
                `${fila.denominacion}${fila.direccion ? ` (${fila.direccion})` : ""}${fila.grado ? ` · ${fila.grado}` : ""}. ` +
                  `Sale en el catálogo municipal por ${COMO[como]}.`,
              ),
              enlace: { texto: `Ver en el catálogo${fila.pagina ? ` (pág. ${fila.pagina})` : ""}`, url: enlaceFicha(fila) },
            }))
          : [
              {
                ...d(
                  "¿Sale en el catálogo?",
                  `No sale en el de ${nombreMunicipio}`,
                  `Catálogo bajado${catalogo!.bajadoEl ? ` el ${fecha(catalogo!.bajadoEl)}` : ""}. Las zonas que se delimitan por calles no se cruzan solas: hay que mirar el plano.`,
                ),
                enlace: { texto: "Ver los documentos", url: "/referencia/proteccion" },
              },
            ]),
        ...(sinTildes(municipio) === "ALCALA DE HENARES"
          ? [
              {
                ...d(
                  "Arqueología",
                  "Todo el municipio (áreas A-D)",
                  "Cualquier obra que toque el subsuelo pide, como poco, informe arqueológico; en área A, excavación antes de la licencia. El área exacta depende de un plano que no tenemos.",
                ),
                enlace: { texto: "Ver la norma (pág. 180)", url: enlaceFicha({ documento_ruta: "catalogos-proteccion/alcala-de-henares/normas-urbanisticas-pgou-2023.pdf", pagina: 180 }) },
              },
            ]
          : []),
      ];

  const secciones: Seccion[] = [
    {
      titulo: "Identidad",
      datos: [
        d("Dirección oficial de Catastro", fincaLdt || [dir?.tv, dir?.nv, dir?.pnp].filter(Boolean).join(" "),
          "Es la que tiene que aparecer en el proyecto. Si no cuadra con la vuestra, hay que justificarlo con papeles en subvenciones y visado."),
        d("Referencia catastral", ref, "La clave con la que se identifica la finca en todos los trámites."),
        d("Municipio y código postal", [municipio, urb(primero)?.dp].filter(Boolean).join(" · ")),
        d("Coordenadas UTM (ETRS89 30N)", utmX && utmY ? `${Math.round(utmX)} · ${Math.round(utmY)}` : "—",
          "Son las que piden en los CAES."),
      ],
    },
    {
      titulo: "El edificio",
      datos: [
        d("Año de construcción", anio ? String(anio) : "—",
          anio === null ? undefined
            : anio < 2002 ? "Anterior a 2002: puede tener amianto, y hay que contarlo en el presupuesto."
            : "Posterior a 2002: sin amianto."),
        d("Plantas", `${sobreRasante.length} sobre rasante` + (bajoRasante.length ? ` + ${bajoRasante.length} bajo rasante` : ""),
          sobreRasante.length >= 4 ? "A partir de cuatro plantas, el ascensor deja de ser un capricho: es lo que más se vende." : undefined),
        d("Aislamiento", anio === null ? "—" : anio < 1979 ? "Sin aislamiento" : anio < 2006 ? "Aislamiento mínimo" : "Con aislamiento",
          anio === null ? undefined
            : anio < 1979 ? "Anterior a la NBE-CT-79: se construyó sin ninguna exigencia de aislamiento. Todo lo que se haga mejora."
            : anio < 2006 ? "Entre 1979 y el Código Técnico: aislamiento mínimo, muy por debajo de lo exigible hoy."
            : "Construido ya con el Código Técnico."),
        d("Superficie construida", `${supTotal} m²`),
        d("Superficie del suelo", suelo ? `${suelo} m²` : "—"),
        d("Tipo de parcela", tipoParcela || "—"),
        d("Portales", portales.length ? portales.join(", ") : "—",
          portales.length > 1 ? "Son varios portales en una misma finca: hay que decidir cuáles entran en el encargo." : undefined),
        d("Escaleras", escaleras.length ? escaleras.join(", ") : "—",
          escaleras.length > 1 ? "Podéis empezar por una y ampliar después: es lo habitual." : undefined),
        d("Patios", "Míralos en el croquis", undefined, true),
      ],
    },
    {
      titulo: "Los usos",
      datos: [
        d("Viviendas", `${viviendas.length} de ${inmuebles.length} inmuebles`),
        d("% residencial", `${pctNumero}% por número · ${pctSuperficie}% por superficie`,
          pctSuperficie >= 70
            ? "Por encima del 70% de uso residencial, que es lo que suelen exigir las ayudas de rehabilitación."
            : "Por debajo del 70%: conviene comprobar si eso deja fuera alguna convocatoria."),
        d("Locales y oficinas", comercio.length ? `${comercio.length}` + (comercioBajo.length ? ` (${comercioBajo.length} en planta baja)` : "") : "No hay",
          comercioBajo.length ? "Los locales de planta baja pagan derrama y suelen ser los que más se resisten en la junta." : undefined),
        d("Garaje o trasteros", garaje.length ? `Sí · ${garaje.length}` : "No",
          garaje.length ? "Hay bajo rasante: ojo con el foso del ascensor y con las instalaciones." : undefined),
        d("Superficie media por vivienda", viviendas.length ? `${Math.round(supVivienda / viviendas.length)} m²` : "—"),
      ],
    },
    {
      titulo: "Protección",
      datos: !esMadrid
        ? conCatalogo
          ? datosCatalogo
          : [d("¿Sale en el catálogo?", `Aún no tenemos el catálogo de ${nombreMunicipio}`,
              "No se puede dar por bueno que no esté protegido: hay que mirarlo en el PGOU del municipio.", true)]
        : sinGeo
        ? [sinConsultar("¿Está protegido?")]
        : [
            d("¿Está protegido?", protegido ? `Sí · ${protegido.CEP_TX_PROTECCION ?? "protegido"}` : "No",
              protegido
                ? "La obra pasa por Patrimonio y el margen es mucho menor. Hay que contarlo desde el principio."
                : "Sin protección: no hay trámite de Patrimonio."),
            d("Ficha del catálogo", protegido?.CEP_TX_NUMCAT ? String(protegido.CEP_TX_NUMCAT) : "—"),
            d("Conjunto homogéneo", protegido?.CEP_TX_CJTO_HOMOGENEO ? String(protegido.CEP_TX_CJTO_HOMOGENEO) : "—"),
            d("Qué está protegido", condiciones?.PROTECCION ? String(condiciones.PROTECCION) : "—",
              condiciones?.PLANO_AE ? "Hay plano de análisis de la edificación: está abajo, en los documentos." : undefined),
            d("¿Es BIC?", "—", "Bien de Interés Cultural: la protección más alta que existe. Consulta pendiente de montar.", true),
          ],
    },
    {
      titulo: "Dinero: a qué ayudas entra",
      datos: !esMadrid
        ? [d("Zona de subvención", "Fuera de Madrid capital: las ayudas son otras (Comunidad de Madrid)", undefined, true)]
        : sinGeo
        ? [sinConsultar("Zona de subvención"), sinConsultar("Subvenciones concedidas a 800 m")]
        : [
            d("Zona", zona ?? "—",
              zona === "ZETU"
                ? "ZETU es la zona de máxima subvención: hasta el 75% en accesibilidad y salubridad, y hasta el 50% en conservación."
                : "ZIRE: toda Madrid tiene derecho a ayudas, con porcentajes algo menores y enfoque en eficiencia energética."),
            d("Ámbito APIRU", apiru ? `${apiru.NOMBRE_APIRU ?? ""} · ${apiru.ID_APIRU ?? ""}` : "No",
              apiru ? "Área Preferente de Impulso a la Regeneración Urbana: barrio señalado como prioritario." : undefined),
            d("Ámbito ARRU", arru ? `${arru.NOMBRE_ARRU ?? ""} · ${arru.ID_ARRU ?? ""}` : "No",
              arru ? "Área de Regeneración y Renovación Urbana, de los planes estatales." : undefined),
            d("Licencia", apiru?.Licencia ? String(apiru.Licencia) : "—",
              "Aparece en el ámbito APIRU. Pendiente de confirmar qué significa exactamente."),
            d("¿Ya le concedieron algo a este edificio?", cerca.some((x) => x.aqui) ? "Sí" : "No",
              cerca.some((x) => x.aqui)
                ? "Ya han cobrado ayuda: conviene mirar de qué convocatoria y si queda algo por pedir."
                : undefined),
            d(`Subvenciones concedidas ${dondeCerca}`, cerca.length === 0 ? "Ninguna" : `${cerca.length} · ${eur(cerca.reduce((t, x) => t + (x.importe ?? 0), 0))}`,
              cerca.length > 0
                ? "Dinero que ya ha caído en el barrio. Es el mejor argumento que hay delante de una junta."
                : undefined),
            d(
              "CO₂ evitado cerca",
              cerca.some((x) => (x.ahorroCo2 ?? 0) > 0)
                ? `${Math.round(cerca.reduce((t, x) => t + (x.ahorroCo2 ?? 0), 0)).toLocaleString("es-ES")} kg/año`
                : "—",
              undefined,
              !cerca.some((x) => (x.ahorroCo2 ?? 0) > 0),
            ),
            d("¿Tiene IEE registrada?", "—",
              "Si ya la tiene y es antigua, o no la tiene, es de las primeras cosas que se pueden vender. Consulta pendiente de montar.", true),
          ],
    },
    {
      titulo: "Restricciones",
      datos: !esMadrid
        ? [d("Modelo de ascensor", "No se puede consultar fuera de Madrid capital", undefined, true)]
        : sinGeo
        ? [sinConsultar("¿Modelo de ascensor obligatorio?")]
        : [
            d("¿Hay ascensor ya?", "—",
              "No lo dice ningún dato. Se ve en la foto aérea de aquí arriba: el casetón de la azotea. Si no hay casetón, no hay ascensor.", true),
            d("¿Modelo de ascensor obligatorio?", ascensor ? `Sí · ${ascensor.DESCRIPCION ?? ""}` : "No",
              ascensor
                ? "La junta de distrito exige un modelo concreto. Hay que proyectarlo con ese modelo desde el principio, no adaptarlo después."
                : "Sin modelo impuesto: se puede proyectar el que convenga."),
          ],
    },
  ];

  // ------- las conclusiones: de los datos a la conversacion de venta -------
  const conc: Conclusion[] = [];
  const mete = (tono: Conclusion["tono"], texto: string, porque: string) => conc.push({ tono, texto, porque });

  if (zona === "ZETU")
    mete("favor", "Zona de máxima subvención", "Hasta el 75% en accesibilidad y salubridad, y hasta el 50% en conservación.");
  else if (zona === "ZIRE")
    mete("dato", "Entra en ayudas de rehabilitación", "Toda Madrid tiene derecho, con porcentajes algo menores que en ZETU.");
  else if (!esMadrid)
    mete("dato", "Fuera de Madrid capital", "Las ayudas son otras: las de la Comunidad de Madrid.");

  if (anio !== null && anio < 1979)
    mete("favor", "Se construyó sin aislamiento", "Anterior a la norma de 1979: no había ninguna exigencia. Todo lo que se haga mejora, y eso puntúa en las ayudas.");
  else if (anio !== null && anio < 2006)
    mete("favor", "Aislamiento muy por debajo de lo exigible", "Entre 1979 y el Código Técnico: mínimo, y hay mucho margen de mejora.");

  if (sobreRasante.length >= 4)
    mete("favor", `${sobreRasante.length} plantas sobre rasante`, "A partir de cuatro, el ascensor deja de ser un capricho: es lo que más se vende.");

  if (pctSuperficie >= 70)
    mete("favor", `${pctSuperficie}% de uso residencial`, "Por encima del 70%, que es lo que suelen exigir las convocatorias.");
  else
    mete("ojo", `Solo ${pctSuperficie}% de uso residencial`, "Por debajo del 70%: conviene comprobar si eso deja fuera alguna convocatoria.");

  if (portales.length > 1)
    mete("favor", `${portales.length} portales en la misma finca`, "Se puede empezar por uno y ampliar. Suele pasar: los vecinos de al lado se suman.");

  if (anio !== null && anio < 2002)
    mete("ojo", "Puede tener amianto", "Anterior a 2002. Hay que contarlo en el presupuesto y en los plazos.");

  if (protegido)
    mete("ojo", `Edificio protegido · ${protegido.CEP_TX_PROTECCION ?? ""}`, "La obra pasa por Patrimonio y el margen es mucho menor. Hay que contarlo desde el principio.");

  if (conCatalogo && catalogo!.casados.length)
    mete("ojo", "Posible protección: revisar", "Sale en el catálogo municipal, sin comprobar todavía. Si se confirma, la obra pasa por Patrimonio.");

  if (ascensor)
    mete("ojo", "Modelo de ascensor impuesto", "La junta de distrito exige un modelo concreto: hay que proyectarlo así desde el principio, no adaptarlo después.");

  if (comercioBajo.length)
    mete("ojo", `${comercioBajo.length} local(es) en planta baja`, "Pagan derrama y suelen ser los que más se resisten en la junta.");

  if (garaje.length)
    mete("ojo", "Hay garaje o trasteros bajo rasante", "Ojo con el foso del ascensor y con las instalaciones que pasen por ahí.");

  if (cerca.length > 0) {
    const mayor = cerca[0];
    mete(
      "favor",
      enElEntorno ? `${cerca.length} subvenciones concedidas en el entorno` : `${cerca.length} subvenciones concedidas a menos de 800 m`,
      `${eur(cerca.reduce((t, x) => t + (x.importe ?? 0), 0))} ya repartidos ${enElEntorno ? "en el municipio (una muestra)" : "en el barrio"}` +
        (mayor.importe ? `. La mayor: ${eur(mayor.importe)} en ${mayor.direccion}${mayor.viviendas ? ` (${mayor.viviendas} viviendas)` : ""}.` : "."),
    );
  }
  if (cerca.some((x) => x.aqui))
    mete("ojo", "A este edificio ya le concedieron ayuda", "Hay que mirar de qué convocatoria fue y si queda algo por pedir.");

  mete("dato", `${viviendas.length} viviendas`, "El tamaño manda en la derrama: cuantas más viviendas, menos paga cada una.");

  const soloYendo = [
    "¿Hay ya ascensor? — se ve desde fuera, en el patio, o por el casetón de la azotea en la foto aérea",
    "¿El portal es accesible? ¿Qué lo impide: escalones, ancho, puerta?",
    "Estado de la fachada y de la cubierta",
    "Ancho de la escalera y hueco disponible",
    "Contadores, foso, arquetas",
    "Confirmar los patios que se ven en el croquis",
  ];

  const bbox = (lado: number) =>
    lat && lng ? [lng - lado, lat - lado, lng + lado, lat + lado].join(",") : null;
  const bboxUtm = (lado: number) =>
    utmX && utmY ? [utmX - lado, utmY - lado, utmX + lado, utmY + lado].join(",") : null;

  return {
    referencia: ref,
    direccionOficial: fincaLdt || [dir?.tv, dir?.nv, dir?.pnp].filter(Boolean).join(" "),
    municipio,
    lat, lng, utmX, utmY,
    croquis: bbox(0.00045)
      ? `https://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx?service=WMS&request=GetMap&version=1.1.1&layers=CATASTRO&srs=EPSG:4326&bbox=${bbox(0.00045)}&width=760&height=760&format=image/png`
      : null,
    aerea: bboxUtm(45)
      ? `https://www.ign.es/wms-inspire/pnoa-ma?service=WMS&request=GetMap&version=1.1.1&layers=OI.OrthoimageCoverage&srs=EPSG:25830&bbox=${bboxUtm(45)}&width=760&height=760&format=image/jpeg&styles=`
      : null,
    visorCatastro: `https://www1.sedecatastro.gob.es/CYCBienInmueble/OVCListaBienes.aspx?RefC=${ref}`,
    secciones,
    conclusiones: conc,
    subvencionesCerca: cerca,
    ambitoSubvenciones: enElEntorno ? "entorno" : "800m",
    consultadoEn: c.consultadoEn,
    pdfs,
    soloYendo,
    fallos,
  };
}

// ============================================================================
// TRAER, GUARDAR, LEER
//
// Pasar de una pestaña a otra relanzaba OCHO consultas a Catastro y al
// geoportal. Ademas de lento, es darles la lata a dos servicios publicos y
// gratuitos (Monica lo colapso probando, con razon).
//
// Asi que se consulta UNA VEZ y se guarda. Lo que se guarda es LO CRUDO, y el
// informe se compone igual venga de donde venga.
// ============================================================================

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

/** Todo lo de fuera, en paralelo donde se puede. */
export async function traerDeFuera(ref: string): Promise<Crudo | null> {
  const fallos: string[] = [];

  const d1 = (await conCalma(() => jsonDe(`${CALL}/Consulta_DNPRC?Provincia=&Municipio=&RefCat=${ref}`))) as {
    consulta_dnprcResult?: { lrcdnp?: { rcdnp?: Inm[] }; bico?: { bi?: Inm } };
  };
  const r1 = d1.consulta_dnprcResult;
  const inmuebles = r1?.lrcdnp?.rcdnp ?? (r1?.bico?.bi ? [r1.bico.bi] : []);
  if (inmuebles.length === 0) return null;

  const primero = inmuebles[0];
  const municipio = primero.dt?.nm ?? null;

  // Los datos de la FINCA solo salen pidiendo UN inmueble concreto.
  let fincaLdt = "", tipoParcela = "";
  let suelo: number | null = null;
  const rc0 = rcDe(primero);
  if (rc0?.car) {
    await espera(250);
    try {
      const d2 = (await conCalma(() =>
        jsonDe(`${CALL}/Consulta_DNPRC?Provincia=&Municipio=&RefCat=${ref}${rc0.car}${rc0.cc1 ?? ""}${rc0.cc2 ?? ""}`),
      )) as { consulta_dnprcResult?: { bico?: { finca?: { ldt?: string; ltp?: string; dff?: { ss?: string } } } } };
      const f = d2.consulta_dnprcResult?.bico?.finca;
      fincaLdt = f?.ldt ?? "";
      tipoParcela = f?.ltp ?? "";
      suelo = num(f?.dff?.ss);
    } catch (e) {
      fallos.push(
        `No se han podido leer los datos de la finca (superficie de suelo, tipo de parcela): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  let lat: number | null = null, lng: number | null = null, utmX: number | null = null, utmY: number | null = null;
  try {
    await espera(250);
    const g = await conCalma(() => textoDe(`${COOR}/Consulta_CPMRC?Provincia=&Municipio=&SRS=EPSG:4326&RC=${ref}`));
    lng = Number(/<xcen>([^<]+)/.exec(g)?.[1]);
    lat = Number(/<ycen>([^<]+)/.exec(g)?.[1]);
    await espera(250);
    const u = await conCalma(() => textoDe(`${COOR}/Consulta_CPMRC?Provincia=&Municipio=&SRS=EPSG:25830&RC=${ref}`));
    utmX = Number(/<xcen>([^<]+)/.exec(u)?.[1]);
    utmY = Number(/<ycen>([^<]+)/.exec(u)?.[1]);
    if (!Number.isFinite(lat!) || !Number.isFinite(lng!)) throw new Error("Catastro no devolvio coordenadas para esta referencia");
  } catch (e) {
    lat = lng = utmX = utmY = null;
    fallos.push(
      `No se han podido obtener las coordenadas, y sin ellas no hay croquis ni datos de urbanismo: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  let protegido = null, condiciones = null, ascensor = null, apiru = null, arru = null;
  let cerca: SubvencionCerca[] = [];
  const geoFallidas: string[] = [];
  let censo: Record<string, unknown>[] = [];
  const esMadrid = (municipio ?? "").toUpperCase() === "MADRID";

  if (esMadrid && utmX && utmY) {
    const pide = async (fuente: string, s: string, c: number, radio = 0) => {
      try {
        const f = await enElPunto(s, c, utmX!, utmY!, radio);
        return f[0] ? atributos(f[0].attributes) : null;
      } catch {
        fallos.push(`No responde el geoportal (${s}, capa ${c}).`);
        geoFallidas.push(fuente);
        return null;
      }
    };
    [protegido, condiciones, ascensor, apiru, arru] = await Promise.all(
      FUENTES_GEO.map((x) => pide(x.fuente, x.servicio, x.capa, x.radio)),
    );

    try {
      const [f, aqui] = await Promise.all([
        enElPunto("VIVIENDA/REHABILITACION_ENERGETICA_CM", 0, utmX, utmY, 800, true),
        enElPunto("VIVIENDA/REHABILITACION_ENERGETICA_CM", 0, utmX, utmY, 35),
      ]);
      censo = f.map((x) => ({ ...atributos(x.attributes), _lat: x.geometry?.y ?? null, _lng: x.geometry?.x ?? null }));
      const suyos = new Set(aqui.map((x) => String(atributos(x.attributes).OBJECTID)));
      cerca = f
        .map((x) => {
          const a = atributos(x.attributes);
          return {
            direccion: String(a.DIRECCION ?? "").trim(),
            importe: typeof a.IMPORTE_SUBVENCION____ === "number" ? a.IMPORTE_SUBVENCION____ : null,
            convocatoria: a.CONVOCATORIA ? String(a.CONVOCATORIA) : null,
            viviendas: typeof a.VIVIENDAS_EDIFICIO === "number" ? a.VIVIENDAS_EDIFICIO : null,
            ahorroCo2: typeof a["AHORRO_CO2__kg_año_"] === "number" ? (a["AHORRO_CO2__kg_año_"] as number) : null,
            fecha: typeof a.FECHA_SUBVENCION === "number" ? new Date(a.FECHA_SUBVENCION).toISOString().slice(0, 10) : null,
            anio: anioDeConvocatoria(a.CONVOCATORIA ? String(a.CONVOCATORIA) : null),
            anioConcesion: typeof a.FECHA_SUBVENCION === "number" ? new Date(a.FECHA_SUBVENCION).getUTCFullYear() : null,
            fuente: FUENTE_DE[CENSO.servicio],
            aqui: suyos.has(String(a.OBJECTID)),
          };
        })
        .sort((x, y) => (y.importe ?? 0) - (x.importe ?? 0));
    } catch {
      fallos.push("No se han podido consultar las subvenciones ya concedidas en la zona.");
    }
  }

  return {
    inmuebles, fincaLdt, tipoParcela, suelo, lat, lng, utmX, utmY,
    protegido, condiciones, ascensor, apiru, arru, cerca, fallos,
    consultadoEn: new Date().toISOString(),
    _fuera: { geoFallidas, censo },
  };
}

/** Las cinco fuentes del geoportal de Madrid que pide la ficha, en el orden del
 *  Crudo (protegido, condiciones, ascensor, apiru, arru) y con los nombres de
 *  dato_urbanistico (scripts/barrido/geoportal_madrid.py). */
const FUENTES_GEO = [
  { fuente: "edificio_protegido", servicio: "DESARROLLO_URBANO_ACTUALIZADO/EDIFICIOS_PROTEGIDOS_VIGENTE", capa: 4, radio: 0 },
  { fuente: "condiciones_proteccion", servicio: "PGOUM97/PG_ANALISIS_EDIFICACION", capa: 8, radio: 0 },
  // Los ascensores son PUNTOS, uno por portal: hay que buscar CERCA.
  { fuente: "modelo_ascensor", servicio: "URBANISMO/MODELO_ASCENSORES_ESPACIO_PUBLICO", capa: 1, radio: 30 },
  { fuente: "apiru", servicio: "VIVIENDA/SUBVENCIONES_AMBITOS", capa: 2, radio: 0 },
  { fuente: "arru", servicio: "VIVIENDA/SUBVENCIONES_AMBITOS", capa: 1, radio: 0 },
] as const;

/** GUARDAR LO QUE SE BAJA, EN LAS TABLAS (Monica, 15-oct-2026): "todo lo que se
 *  baje y no este, deberia guardarse en las tablas. Y si se baja algo, por lo que
 *  sea, actualizar las tablas que toquen". Lo mismo que hace el barrido
 *  (scripts/barrido/catastro_opps_abiertas.py y geoportal_madrid.py):
 *    ficha_catastro          la ficha (sin tocar ascensor, patios ni portal)
 *    ficha_catastro_portal   un portal por numero y escalera
 *    ficha_catastro_inmueble uno por inmueble
 *    dato_urbanistico        las cinco fuentes del geoportal (Madrid), si
 *                            respondieron las cinco
 *    subvencion_concedida    las de alrededor, con posicion y fecha
 *  Lo que fallo no se escribe: no se pisa un dato bueno con un hueco. La foto
 *  (bruto) solo se guarda entera. Si algo falla al escribir, no se cae la
 *  pantalla: se ha consultado igual. */
async function guardar(ref: string, c: Crudo) {
  if (!URL_BASE || !SECRETO || !c.inmuebles.length) return;
  const escribir = async <T,>(ruta: string, filas: unknown): Promise<T[]> => {
    const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, {
      method: "POST",
      headers: { ...cab, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(filas),
    });
    if (!r.ok) throw new Error(`Supabase ${ruta.split("?")[0]} ${r.status}: ${await r.text()}`);
    return (await r.json()) as T[];
  };
  const ahora = new Date().toISOString();
  const entera = c.fallos.length === 0 && c.lat !== null && c.lng !== null;
  const sitio = (i: Inm) => {
    const u = urb(i);
    const pnp = u?.dir?.pnp ?? "";
    const plp = (u?.dir?.plp ?? "").trim();
    return {
      numero: plp ? `${pnp}(${plp})` : pnp,
      escalera: (u?.loint?.es ?? "").trim(),
      planta: (u?.loint?.pt ?? "").trim(),
      puerta: (u?.loint?.pu ?? "").trim(),
      tv: u?.dir?.tv ?? "",
      nv: u?.dir?.nv ?? "",
    };
  };
  const decimal = (x?: string) => {
    const n = Number(String(x ?? "").replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) && String(x ?? "").trim() !== "" ? n : null;
  };

  // 1 · la ficha
  const p0 = c.inmuebles[0];
  const u0 = urb(p0);
  const s0 = sitio(p0);
  const usos: Record<string, number> = {};
  const plantas = new Set<string>();
  let superficie = 0, viviendas = 0;
  for (const i of c.inmuebles) {
    const uso = i.debi?.luso ?? "?";
    usos[uso] = (usos[uso] ?? 0) + 1;
    if (uso === "Residencial") viviendas++;
    superficie += decimal(i.debi?.sfc) ?? 0;
    if (sitio(i).planta) plantas.add(sitio(i).planta);
  }
  const anios = c.inmuebles.map((i) => num(i.debi?.ant)).filter((n): n is number => n !== null);
  const ficha: Record<string, unknown> = {
    referencia: ref,
    municipio: p0.dt?.nm ?? null,
    provincia: p0.dt?.np ?? null,
    cp: u0?.dp ?? null,
    anio: anios.length ? Math.min(...anios) : null,
    inmuebles: c.inmuebles.length,
    viviendas,
    superficie: Math.round(superficie) || null,
    plantas: [...plantas].sort(),
    usos,
    tipo_via: s0.tv || null,
    nombre_via: s0.nv || null,
    numero: s0.numero || null,
    numero2: u0?.dir?.snp && u0.dir.snp !== "0" ? u0.dir.snp : null,
    codigo_via: u0?.dir?.cv ?? null,
    distrito_municipal: u0?.dm ?? null,
    ine_provincia: p0.dt?.loine?.cp ?? null,
    ine_municipio: p0.dt?.loine?.cm ?? null,
    consultado_en: c.consultadoEn,
    actualizado_en: ahora,
  };
  if (c.fincaLdt) ficha.direccion = c.fincaLdt;
  if (c.tipoParcela) ficha.tipo_parcela = c.tipoParcela;
  if (c.suelo !== null) ficha.superficie_suelo = c.suelo;
  if (c.lat !== null && c.lng !== null) Object.assign(ficha, { lat: c.lat, lng: c.lng });
  if (c.utmX !== null && c.utmY !== null) Object.assign(ficha, { utm_x: c.utmX, utm_y: c.utmY, utm_srs: "EPSG:25830" });
  // LA FOTO, solo entera: de aqui se vuelve a componer el informe sin pedir nada.
  if (entera) {
    const { _fuera, ...foto } = c;
    void _fuera;
    ficha.bruto = foto;
  }
  const [fila] = await escribir<{ id: string }>("ficha_catastro?on_conflict=referencia", ficha);

  // 2 · los portales y 3 · los inmuebles
  const porPortal = new Map<string, { numero: string; escalera: string; tv: string; nv: string; inmuebles: number; viviendas: number; superficie: number; plantas: Set<string>; usos: Record<string, number> }>();
  for (const i of c.inmuebles) {
    const t = sitio(i);
    const k = `${t.numero}|${t.escalera}`;
    const p = porPortal.get(k) ?? { numero: t.numero, escalera: t.escalera, tv: t.tv, nv: t.nv, inmuebles: 0, viviendas: 0, superficie: 0, plantas: new Set<string>(), usos: {} };
    const uso = i.debi?.luso ?? "?";
    p.inmuebles++;
    p.usos[uso] = (p.usos[uso] ?? 0) + 1;
    if (uso === "Residencial") p.viviendas++;
    p.superficie += decimal(i.debi?.sfc) ?? 0;
    if (t.planta) p.plantas.add(t.planta);
    porPortal.set(k, p);
  }
  const portales = await escribir<{ id: string; numero: string; escalera: string | null }>(
    "ficha_catastro_portal?on_conflict=ficha_id,numero,escalera",
    [...porPortal.values()].map((p) => ({
      ficha_id: fila.id, tipo_via: p.tv || null, nombre_via: p.nv || null, numero: p.numero, escalera: p.escalera,
      inmuebles: p.inmuebles, viviendas: p.viviendas, superficie: Math.round(p.superficie) || null, plantas: [...p.plantas].sort(), usos: p.usos,
    })),
  );
  const idPortal = new Map(portales.map((p) => [`${p.numero}|${p.escalera ?? ""}`, p.id]));
  const inmuebles = c.inmuebles
    .map((i) => {
      const rc = rcDe(i);
      const refInm = rc ? [rc.pc1, rc.pc2, rc.car, rc.cc1, rc.cc2].map((x) => x ?? "").join("") : "";
      const t = sitio(i);
      return refInm.length >= 18
        ? {
            ficha_id: fila.id, portal_id: idPortal.get(`${t.numero}|${t.escalera}`) ?? null, referencia: refInm,
            numero: t.numero || null, escalera: t.escalera || null, planta: t.planta || null, puerta: t.puerta || null,
            uso: i.debi?.luso ?? null, superficie: decimal(i.debi?.sfc) !== null ? Math.round(decimal(i.debi?.sfc)!) : null,
            coeficiente: decimal(i.debi?.cpt),
          }
        : null;
    })
    .filter(Boolean);
  for (let k = 0; k < inmuebles.length; k += 200) await escribir("ficha_catastro_inmueble?on_conflict=referencia", inmuebles.slice(k, k + 200));

  // 4 · el geoportal de Madrid: las cinco juntas o ninguna (como el barrido)
  const esMadrid = (p0.dt?.nm ?? "").toUpperCase() === "MADRID";
  if (esMadrid && c._fuera && c.utmX !== null && c._fuera.geoFallidas.length === 0) {
    const valores = [c.protegido, c.condiciones, c.ascensor, c.apiru, c.arru];
    await escribir(
      "dato_urbanistico?on_conflict=referencia,fuente",
      FUENTES_GEO.map((x, n) => {
        const a = valores[n] as Record<string, unknown> | null;
        const txt = (v: unknown) => (v == null ? null : String(v).trim());
        const pdfs: { que: string; url: unknown }[] = [];
        let codigo: unknown = null, nombre: unknown = null, resumen: unknown = null;
        if (a && x.fuente === "edificio_protegido") [codigo, nombre, resumen] = [a.CEP_TX_NUMCAT, a.CEP_TX_PROTECCION, a.CEP_TX_CJTO_HOMOGENEO];
        if (a && x.fuente === "condiciones_proteccion") {
          nombre = a.PROTECCION;
          if (a.PLANO_AE) pdfs.push({ que: "Plano de análisis de la edificación", url: a.PLANO_AE });
        }
        if (a && x.fuente === "modelo_ascensor") {
          [nombre, resumen] = [a.DESCRIPCION, a.DIRECCION];
          if (a.INFORME) pdfs.push({ que: "Informe del modelo de ascensor", url: a.INFORME });
          if (a.MODELO) pdfs.push({ que: "Modelo de ascensor obligatorio", url: a.MODELO });
        }
        if (a && x.fuente === "apiru") [codigo, nombre] = [a.ID_APIRU, a.NOMBRE_APIRU];
        if (a && x.fuente === "arru") [codigo, nombre] = [a.ID_ARRU, a.NOMBRE_ARRU];
        return {
          referencia: ref, fuente: x.fuente, hay: a !== null, codigo: txt(codigo), nombre: txt(nombre), resumen: txt(resumen),
          pdfs: pdfs.length ? pdfs : null, detalle: a, servicio: x.servicio, capa: x.capa,
          objectid: a?.OBJECTID ?? null, url: `${SIGMA}/${x.servicio}/MapServer/${x.capa}`, consultado_en: c.consultadoEn,
        };
      }),
    );
  }

  // 5 · las subvenciones de alrededor, al censo (con su posicion y su fecha)
  const censo = (c._fuera?.censo ?? []).filter((a) => a.OBJECTID != null && a._lat != null && a._lng != null);
  if (censo.length) {
    await escribir(
      "subvencion_concedida?on_conflict=servicio,capa,objectid",
      censo.map((a) => filaDelCenso(a, c.consultadoEn)),
    );
  }
}

const CENSO = { servicio: "VIVIENDA/REHABILITACION_ENERGETICA_CM", capa: 0 } as const;

/** EL VISOR DE REHABILITACION PRTR DEL COAM Y LA COMUNIDAD (encontrado el 9-oct,
 *  descargado desde el 15-oct-2026): las subvenciones Next Generation de TODA la
 *  Comunidad, cada una con su punto y su referencia catastral. Es la API interna
 *  del visor, sin documentar, y no trae fecha (solo el año del expediente) ni el
 *  Plan de Ascensores. */
const COAM = {
  servicio: "COAM/visorrehabilitaprtrmadrid",
  url: "https://visorrehabilitaprtrmadrid.coam.org/api/main.cgi?method=resum&pr=all",
} as const;

const FUENTE_DE: Record<string, string> = {
  [CENSO.servicio]: "Ayuntamiento de Madrid",
  [COAM.servicio]: "Comunidad de Madrid (COAM)",
};

/** Los programas del COAM con el nombre que usa el Ayuntamiento, para que las
 *  dos fuentes se puedan casar y leer igual. */
const PROGRAMA_COAM: Record<string, string> = {
  pr1: "NGEU_MRR_Programa 1",
  pr3: "NGEU_MRR_Programa 3",
  pr4: "NGEU_MRR_Programa 4",
  pr5_Libro: "NGEU_MRR_Programa 5 (libro del edificio)",
  pr5_Proyecto: "NGEU_MRR_Programa 5 (proyecto)",
  pr5_Todo: "NGEU_MRR_Programa 5 (libro y proyecto)",
};

/** Un numero estable por expediente (la tabla casa por servicio+capa+objectid y
 *  el COAM no tiene objectid): los 13 primeros hex de su SHA-1. */
async function idDeExpediente(expediente: string): Promise<number> {
  const h = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(expediente));
  const hex = [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return parseInt(hex.slice(0, 13), 16);
}

/** El visor del COAM, entero, a subvencion_concedida. */
async function bajarCoam(ahora: string): Promise<number> {
  const r = await fetch(COAM.url, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`El visor del COAM respondio ${r.status}`);
  const d = (await r.json()) as {
    features?: { properties: Record<string, unknown>; geometry?: { coordinates?: [number, number] } }[];
  };
  const filas = await Promise.all(
    (d.features ?? [])
      .filter((f) => typeof f.properties.expediente === "string" && f.geometry?.coordinates)
      .map(async (f) => {
        const a = f.properties;
        const [lng, lat] = f.geometry!.coordinates!;
        const n = (v: unknown) => (typeof v === "number" ? v : null);
        return {
          referencia: typeof a.catref === "string" ? a.catref.slice(0, 14) : null,
          direccion: String(a.address ?? "").replace(/\s*\(MADRID\)\s*$/, "").trim() || "(sin dirección)",
          convocatoria: PROGRAMA_COAM[String(a.pr_det ?? a.pr)] ?? String(a.pr_det ?? a.pr ?? ""),
          ayuda: null,
          fecha: null,
          importe: n(a.imp_con),
          viviendas: typeof a.viviendas === "number" ? Math.round(a.viviendas) : null,
          ahorro_energia: null,
          ahorro_co2: null,
          distrito: null,
          barrio: null,
          cp: null,
          servicio: COAM.servicio,
          capa: 0,
          objectid: await idDeExpediente(String(a.expediente)),
          detalle: a,
          lat,
          lng,
          consultado_en: ahora,
        };
      }),
  );
  if (!filas.length) throw new Error("El visor del COAM no ha devuelto ninguna subvencion.");
  for (let k = 0; k < filas.length; k += 500) {
    const w = await fetch(`${URL_BASE}/rest/v1/subvencion_concedida?on_conflict=servicio,capa,objectid`, {
      method: "POST",
      headers: { ...cab, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(filas.slice(k, k + 500)),
    });
    if (!w.ok) throw new Error(`Supabase subvencion_concedida ${w.status}: ${await w.text()}`);
  }
  return filas.length;
}

/** Una subvencion del geoportal como fila de subvencion_concedida (igual que
 *  scripts/barrido/geoportal_madrid.py). `_lat`/`_lng`: su posicion en grados. */
function filaDelCenso(a: Record<string, unknown>, consultadoEn: string) {
  const n = (v: unknown) => (typeof v === "number" ? v : null);
  const { _lat, _lng, ...detalle } = a;
  return {
    direccion: String(a.DIRECCION ?? "").trim() || "(sin dirección)",
    convocatoria: a.CONVOCATORIA ?? null,
    ayuda: a.AYUDA ?? null,
    fecha: typeof a.FECHA_SUBVENCION === "number" ? new Date(a.FECHA_SUBVENCION).toISOString().slice(0, 10) : null,
    importe: n(a.IMPORTE_SUBVENCION____),
    viviendas: typeof a.VIVIENDAS_EDIFICIO === "number" ? Math.round(a.VIVIENDAS_EDIFICIO) : null,
    ahorro_energia: n(a["AHORRO_ENERGIA__kWh_año_"]),
    ahorro_co2: n(a["AHORRO_CO2__kg_año_"]),
    distrito: a.DISTRITO ?? null,
    barrio: a.BARRIO ?? null,
    cp: a.COD_POSTAL != null ? String(a.COD_POSTAL) : null,
    servicio: CENSO.servicio,
    capa: CENSO.capa,
    objectid: a.OBJECTID,
    detalle,
    lat: _lat,
    lng: _lng,
    consultado_en: consultadoEn,
  };
}

type FilaFicha = {
  id: string;
  referencia: string;
  bruto: Crudo | null;
  consultado_en: string;
  municipio: string | null;
  provincia: string | null;
  cp: string | null;
  distrito_municipal: string | null;
  tipo_via: string | null;
  nombre_via: string | null;
  numero: string | null;
  anio: number | null;
  tipo_parcela: string | null;
  superficie_suelo: number | null;
  lat: number | null;
  lng: number | null;
  utm_x: number | null;
  utm_y: number | null;
};

type FilaInmueble = {
  referencia: string | null;
  numero: string | null;
  escalera: string | null;
  planta: string | null;
  puerta: string | null;
  uso: string | null;
  superficie: number | null;
  coeficiente: number | string | null;
};

/** EL EDIFICIO DESDE LAS TABLAS EXTRAIDAS (Monica, 9-oct-2026).
 *
 *  El barrido de las opps abiertas (scripts/barrido/catastro_opps_abiertas.py)
 *  dejo cada ficha repartida en ficha_catastro y ficha_catastro_inmueble, y en
 *  `bruto` la respuesta de Catastro tal cual, que no es el formato de esta
 *  pantalla. Sin esto, la ficha no reconocia nada y volvia a Catastro en cada
 *  apertura: 15 segundos. Aqui se monta lo crudo con lo extraido, en el mismo
 *  formato que usa Catastro, y el informe sale igual que siempre.
 *
 *  El geoportal de Madrid no se bajo: se marca, y el informe dice "sin
 *  consultar" en vez de "No". */
async function desdeLasTablas(f: FilaFicha): Promise<Crudo | null> {
  const r = await fetch(
    `${URL_BASE}/rest/v1/ficha_catastro_inmueble?select=referencia,numero,escalera,planta,puerta,uso,superficie,coeficiente` +
      `&ficha_id=eq.${f.id}&order=referencia.asc&limit=5000`,
    { headers: cab, cache: "no-store" },
  );
  if (!r.ok) return null;
  const filas = (await r.json()) as FilaInmueble[];
  if (filas.length === 0) return null;

  const inmuebles: Inm[] = filas.map((i) => {
    const rc = i.referencia ?? "";
    return {
      rc: { pc1: rc.slice(0, 7), pc2: rc.slice(7, 14), car: rc.slice(14, 18), cc1: rc.slice(18, 19), cc2: rc.slice(19, 20) },
      dt: {
        np: f.provincia ?? undefined,
        nm: f.municipio ?? undefined,
        locs: {
          lous: {
            lourb: {
              dir: { tv: f.tipo_via ?? undefined, nv: f.nombre_via ?? undefined, pnp: i.numero ?? f.numero ?? undefined },
              dp: f.cp ?? undefined,
              dm: f.distrito_municipal ?? undefined,
              loint: { es: i.escalera ?? undefined, pt: i.planta ?? undefined, pu: i.puerta ?? undefined },
            },
          },
        },
      },
      debi: {
        luso: i.uso ?? undefined,
        sfc: i.superficie != null ? String(i.superficie) : undefined,
        cpt: i.coeficiente != null ? String(i.coeficiente) : undefined,
        ant: f.anio != null ? String(f.anio) : undefined,
      },
    };
  });

  const geo = (f.municipio ?? "").toUpperCase() === "MADRID" ? await geoportalGuardado(f) : null;

  return {
    inmuebles,
    fincaLdt: "",
    tipoParcela: f.tipo_parcela ?? "",
    suelo: f.superficie_suelo,
    lat: f.lat,
    lng: f.lng,
    utmX: f.utm_x,
    utmY: f.utm_y,
    protegido: geo?.protegido ?? null,
    condiciones: geo?.condiciones ?? null,
    ascensor: geo?.ascensor ?? null,
    apiru: geo?.apiru ?? null,
    arru: geo?.arru ?? null,
    // Las de alrededor se ponen al componer, del censo (subvencionesDelCenso).
    cerca: [],
    fallos: [],
    consultadoEn: f.consultado_en,
    geoportal: geo !== null,
  };
}

/** Las cinco fuentes del geoportal que pide la ficha, en el orden de
 *  scripts/barrido/geoportal_madrid.py, que es quien las baja (9-oct-2026). */
const FUENTES_GEOPORTAL = ["edificio_protegido", "condiciones_proteccion", "modelo_ascensor", "apiru", "arru"] as const;

/** Distancia en metros entre dos puntos en grados. A 800 m, la diferencia con
 *  el calculo del geoportal (en UTM) es de centimetros. */
function metros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(a));
}

/** LO DEL GEOPORTAL, DESDE LAS TABLAS (Monica, 9-oct-2026). Null si no estan
 *  las cinco fuentes: una a medias no se da por consultada, y la ficha dice
 *  "sin consultar" en vez de "No". Las subvenciones de alrededor salen del
 *  censo entero (subvencion_concedida), con su posicion. */
async function geoportalGuardado(f: FilaFicha): Promise<Pick<Crudo, "protegido" | "condiciones" | "ascensor" | "apiru" | "arru"> | null> {
  const r = await fetch(`${URL_BASE}/rest/v1/dato_urbanistico?select=fuente,hay,detalle&referencia=eq.${f.referencia}`, {
    headers: cab,
    cache: "no-store",
  });
  if (!r.ok) return null;
  const filas = (await r.json()) as { fuente: string; hay: boolean | null; detalle: Record<string, unknown> | null }[];
  const de = (fuente: string) => filas.find((x) => x.fuente === fuente);
  if (!FUENTES_GEOPORTAL.every((x) => de(x)?.hay != null)) return null;
  const si = (fuente: string) => (de(fuente)?.hay ? (de(fuente)?.detalle ?? null) : null);

  return {
    protegido: si("edificio_protegido"),
    condiciones: si("condiciones_proteccion"),
    ascensor: si("modelo_ascensor"),
    apiru: si("apiru"),
    arru: si("arru"),
  };
}

/** LAS SUBVENCIONES DE ALREDEDOR, SIEMPRE DE NUESTRO CENSO (Monica, 15-oct-2026):
 *  subvencion_concedida se lee al abrir, con todos sus campos (tambien la
 *  fecha), venga el edificio de donde venga. Asi una subvencion nueva a 800 m
 *  sale aunque la foto guardada sea de hace meses. Null si no se puede leer:
 *  entonces vale lo que hubiera. */
async function subvencionesDelCenso(lat: number, lng: number, ref?: string): Promise<SubvencionCerca[] | null> {
  // Una caja algo mayor de 800 m, y luego la distancia de verdad.
  const dLat = 0.0075;
  const dLng = 0.0100;
  return delCenso(`&lat=gte.${lat - dLat}&lat=lte.${lat + dLat}&lng=gte.${lng - dLng}&lng=lte.${lng + dLng}`, { lat, lng }, ref);
}

/** LAS DEL MUNICIPIO, para cuando a 800 m hay pocas (Monica, 15-oct-2026). Las
 *  del COAM llevan el municipio al final de la direccion; las del Ayuntamiento
 *  son todas de Madrid capital. */
async function subvencionesDelMunicipio(municipio: string, ref?: string): Promise<SubvencionCerca[] | null> {
  const m = sinTildes(municipio).trim();
  if (!m) return null;
  const filtro =
    m === "MADRID"
      ? `&or=(servicio.eq.${encodeURIComponent(CENSO.servicio)},direccion.ilike.${encodeURIComponent("* MADRID")})`
      : `&servicio=eq.${encodeURIComponent(COAM.servicio)}&direccion=ilike.${encodeURIComponent(`* ${m}`)}`;
  return delCenso(filtro, null, ref);
}

/** Lo leido del censo: las dos fuentes sumadas, cada subvencion una vez.
 *  `desde`: el edificio, si se quiere solo lo de 800 m. */
async function delCenso(filtro: string, desde: { lat: number; lng: number } | null, ref?: string): Promise<SubvencionCerca[] | null> {
  try {
    const s = await fetch(
      `${URL_BASE}/rest/v1/subvencion_concedida?select=servicio,referencia,direccion,importe,convocatoria,viviendas,ahorro_co2,fecha,expediente:detalle->>expediente,lat,lng` +
        `${filtro}&order=servicio.asc,objectid.asc&limit=5000`,
      { headers: cab, cache: "no-store" },
    );
    if (!s.ok) return null;
    const lista = (await s.json()) as {
      servicio: string;
      referencia: string | null;
      direccion: string;
      importe: number | null;
      convocatoria: string | null;
      viviendas: number | null;
      ahorro_co2: number | null;
      fecha: string | null;
      expediente: string | null;
      lat: number;
      lng: number;
    }[];
    const cerca = lista
      .map((x) => ({ x, m: desde ? metros(desde.lat, desde.lng, x.lat, x.lng) : null }))
      .filter(({ m }) => m === null || m <= 800);

    // LAS DOS FUENTES SE SUMAN, PERO CADA SUBVENCION UNA VEZ (Monica, 15-oct-2026).
    // En Madrid capital las del Next Generation estan en las dos: el 9-oct, 490
    // de las 531 del Ayuntamiento tenian su gemela en el COAM, en el mismo
    // edificio y por el mismo importe. La del COAM se salta si hay una del
    // Ayuntamiento del MISMO programa a menos de 40 m: vale la del Ayuntamiento,
    // que trae la fecha.
    const ayto = cerca.filter(({ x }) => x.servicio === CENSO.servicio);
    const coam = cerca.filter(({ x }) => x.servicio === COAM.servicio);
    const misma = (a: (typeof lista)[number], b: (typeof lista)[number]) =>
      a.convocatoria === b.convocatoria && metros(a.lat, a.lng, b.lat, b.lng) <= 40;
    // El año de la convocatoria de cada una: el de su nombre, el de su
    // expediente o, si es del Ayuntamiento y no lo dice, el de su gemela.
    const convocada = (x: (typeof lista)[number]) =>
      anioDeConvocatoria(x.convocatoria) ??
      anioDeExpediente(x.expediente) ??
      (x.servicio === CENSO.servicio ? anioDeExpediente(coam.find(({ x: c }) => misma(x, c))?.x.expediente ?? null) : null);
    return cerca
      .filter(({ x }) => x.servicio !== COAM.servicio || !ayto.some(({ x: a }) => misma(a, x)))
      .map(({ x, m }) => ({
        // No hay direcciones sin municipio: las del Ayuntamiento son todas de
        // Madrid capital y no lo dicen; las del COAM ya lo llevan.
        direccion: x.servicio === CENSO.servicio ? `${x.direccion.trim()} MADRID` : x.direccion.trim(),
        importe: x.importe != null ? Number(x.importe) : null,
        convocatoria: x.convocatoria,
        viviendas: x.viviendas,
        ahorroCo2: x.ahorro_co2 != null ? Number(x.ahorro_co2) : null,
        fecha: x.fecha,
        anio: convocada(x),
        // El COAM no da fecha: el "/2022" de sus expedientes es el año de la
        // CONVOCATORIA, no el de la concesion, y no se hace pasar por ella.
        anioConcesion: x.fecha ? Number(x.fecha.slice(0, 4)) : null,
        fuente: FUENTE_DE[x.servicio] ?? x.servicio,
        aqui: (m !== null && m <= 35) || (!!ref && x.referencia === ref),
      }))
      .sort((x, y) => (y.importe ?? 0) - (x.importe ?? 0));
  } catch {
    return null;
  }
}

/** 8 AL AZAR, PERO SIEMPRE LAS MISMAS PARA CADA EDIFICIO: el azar se siembra con
 *  la referencia, asi la tabla no cambia cada vez que se abre la ficha. Las de
 *  este mismo edificio van siempre. */
function alAzarEstable(lista: SubvencionCerca[], ref: string, n: number): SubvencionCerca[] {
  const huella = (t: string) => {
    let h = 2166136261;
    for (const ch of t) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    return h;
  };
  const suyas = lista.filter((x) => x.aqui);
  const resto = lista
    .filter((x) => !x.aqui)
    .map((x) => ({ x, h: huella(`${ref}|${x.direccion}|${x.convocatoria}|${x.importe}`) }))
    .sort((a, b) => a.h - b.h)
    // Una por edificio: el Programa 4 va por vivienda y llenaria la muestra
    // con el mismo portal repetido.
    .filter(({ x }, k, todas) => todas.findIndex(({ x: y }) => y.direccion === x.direccion) === k)
    .slice(0, Math.max(0, n - suyas.length))
    .map(({ x }) => x);
  return [...suyas, ...resto].sort((x, y) => (y.importe ?? 0) - (x.importe ?? 0));
}

/** El año de una convocatoria por su nombre: "REHABILITA 2021" -> 2021, "Plan
 *  MAD-RE 18" -> 2018. Un plan de varios años ("Plan Estatal 2018-2021") no
 *  tiene uno: null. */
function anioDeConvocatoria(nombre: string | null): number | null {
  const t = (nombre ?? "").trim();
  const largos = t.match(/\b(?:19|20)\d{2}\b/g) ?? [];
  if (largos.length === 1) return Number(largos[0]);
  if (largos.length > 1) return null;
  const corto = /\b(\d{2})$/.exec(t);
  return corto && !/programa\s*\d+$/i.test(t) ? 2000 + Number(corto[1]) : null;
}

/** "10-PYL1-00019.3/2022" -> 2022, "ERRP-PCH 006/23" -> 2023: el año de la
 *  convocatoria en el expediente del COAM. */
function anioDeExpediente(e: string | null): number | null {
  const m = /\/(\d{4}|\d{2})\s*$/.exec(e ?? "");
  if (!m) return null;
  return m[1].length === 4 ? Number(m[1]) : 2000 + Number(m[1]);
}

/** LO GUARDADO, EN EL ORDEN DE MONICA (15-oct-2026):
 *   1. PRIMERO NUESTRAS TABLAS: la descarga de Catastro (ficha_catastro +
 *      ficha_catastro_inmueble) y el geoportal guardado (dato_urbanistico).
 *   2. SI NO HAY TABLAS, LA FOTO (ficha_catastro.bruto), como respaldo: los
 *      edificios fuera de nuestra descarga. Tenga los dias que tenga.
 *  Las subvenciones de alrededor y los catalogos de proteccion no van aqui: se
 *  leen siempre al componer. Null si no hay nada. */
async function leerDeLaBase(ref: string): Promise<Crudo | null> {
  if (!URL_BASE || !SECRETO) return null;
  try {
    const r = await fetch(
      `${URL_BASE}/rest/v1/ficha_catastro?select=id,referencia,bruto,consultado_en,municipio,provincia,cp,distrito_municipal,` +
        `tipo_via,nombre_via,numero,anio,tipo_parcela,superficie_suelo,lat,lng,utm_x,utm_y&referencia=eq.${ref}&limit=1`,
      { headers: cab, cache: "no-store" },
    );
    if (!r.ok) return null;
    const [f] = (await r.json()) as FilaFicha[];
    if (!f) return null;
    // La foto solo vale entera: una guardada a medias no se usa.
    const foto = f.bruto?.inmuebles?.length && f.bruto.lat !== null && f.bruto.lng !== null && (f.bruto.fallos?.length ?? 0) === 0 ? f.bruto : null;

    const tablas = await desdeLasTablas(f);
    if (tablas) {
      // Lo que las tablas no traen y la foto si: el geoportal de Madrid si no
      // esta bajado, y el texto de la finca.
      if (tablas.geoportal === false && foto && foto.geoportal !== false) {
        Object.assign(tablas, {
          protegido: foto.protegido, condiciones: foto.condiciones, ascensor: foto.ascensor,
          apiru: foto.apiru, arru: foto.arru, geoportal: true,
        });
      }
      if (!tablas.fincaLdt && foto?.fincaLdt) tablas.fincaLdt = foto.fincaLdt;
      return tablas;
    }
    return foto;
  } catch {
    return null;
  }
}

/** SALIR A INTERNET, PERO NO CADA VEZ (Monica, 15-oct-2026). Si ya se pregunto
 *  hace poco y no estaba, o fallo, no se vuelve a preguntar: se apunta en
 *  consulta_externa que se pregunto y cuando. "Actualizar" (refrescar) se lo
 *  salta: lo pide una persona. Los dias, a confirmar por Monica. */
const DIAS_SI_NO_ESTABA = 30;
const DIAS_SI_FALLO = 1;

async function preguntadoHacePoco(ref: string): Promise<boolean> {
  try {
    const r = await fetch(`${URL_BASE}/rest/v1/consulta_externa?select=resultado,preguntado_en&referencia=eq.${ref}&fuente=eq.catastro&limit=1`, {
      headers: cab,
      cache: "no-store",
    });
    if (!r.ok) return false;
    const [u] = (await r.json()) as { resultado: string; preguntado_en: string }[];
    if (!u || u.resultado === "ok") return false;
    const dias = (Date.now() - new Date(u.preguntado_en).getTime()) / 86400000;
    return dias < (u.resultado === "no_esta" ? DIAS_SI_NO_ESTABA : DIAS_SI_FALLO);
  } catch {
    return false;
  }
}

async function apuntarPregunta(ref: string, resultado: "ok" | "no_esta" | "fallo", detalle: string | null) {
  try {
    await fetch(`${URL_BASE}/rest/v1/consulta_externa?on_conflict=referencia,fuente`, {
      method: "POST",
      headers: { ...cab, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ referencia: ref, fuente: "catastro", preguntado_en: new Date().toISOString(), resultado, detalle }),
    });
  } catch {
    /* no apuntarlo no impide enseñar el edificio */
  }
}

/** La puerta: primero lo guardado (tablas, luego foto), y solo si no hay nada se
 *  sale fuera, y no cada vez. */
export async function informeEdificio(
  referenciaBruta: string,
  // `completo`: para lo que se entrega al cliente. Si lo guardado no lleva el
  // geoportal, se sale a por el y queda guardado para la proxima.
  opciones: { refrescar?: boolean; completo?: boolean } = {},
): Promise<InformeEdificio | null> {
  const ref = referenciaBruta.replace(/\s/g, "").toUpperCase().slice(0, 14);
  if (ref.length < 14) return null;

  const guardado = opciones.refrescar ? null : await leerDeLaBase(ref);
  // Lo guardado vale salvo que le falte lo que solo da fuera: las coordenadas
  // (sin ellas no hay croquis ni urbanismo) o, para lo que se entrega al
  // cliente, el geoportal de Madrid.
  const incompleto = guardado && (guardado.lat === null || (opciones.completo && guardado.geoportal === false));
  if (guardado && !incompleto) return componerConCatalogo(ref, guardado);
  // Si fuera falla, mejor lo guardado que nada.
  const loQueHay = () => (guardado ? componerConCatalogo(ref, guardado) : null);
  if (!opciones.refrescar && (await preguntadoHacePoco(ref))) return loQueHay();

  // Si Catastro corta la conexion (pasa: 8-oct-2026, "ECONNRESET" en la ficha
  // de Zamora 28 y en la de Albufera 250), la ficha NO se cae: sale el aviso de
  // "no se ha podido traer el edificio" y se reintenta pasado DIAS_SI_FALLO.
  let fuera: Crudo | null = null;
  try {
    fuera = await traerDeFuera(ref);
  } catch (e) {
    await apuntarPregunta(ref, "fallo", e instanceof Error ? e.message : String(e));
    return loQueHay();
  }
  if (!fuera) {
    await apuntarPregunta(ref, "no_esta", null);
    return loQueHay();
  }
  const aMedias = fuera.fallos.length > 0 || fuera.lat === null || fuera.lng === null;
  await apuntarPregunta(ref, aMedias ? "fallo" : "ok", aMedias ? fuera.fallos.join(" | ") || "sin coordenadas" : null);
  try {
    await guardar(ref, fuera);
  } catch {
    /* que no se guarde no impide enseñarlo */
  }
  return componerConCatalogo(ref, fuera);
}

/** Fuera de Madrid, antes de componer se mira el catalogo del municipio con la
 *  referencia y los portales del edificio. En Madrid no se pregunta nada nuevo. */
async function componerConCatalogo(ref: string, crudo: Crudo): Promise<InformeEdificio | null> {
  // Las subvenciones de alrededor, siempre del censo (si se puede leer).
  const a800 = crudo.lat != null && crudo.lng != null ? await subvencionesDelCenso(crudo.lat, crudo.lng, ref) : null;
  let c: Crudo = a800 && (a800.length || !crudo.cerca.length) ? { ...crudo, cerca: a800, ambitoCerca: "800m" } : crudo;
  const municipio = c.inmuebles[0]?.dt?.nm ?? null;
  // MENOS DE 5 A 800 m: 8 DEL MUNICIPIO, "EN EL ENTORNO" (Monica, 15-oct-2026:
  // "asi salvamos la pantalla" donde no tenemos tanta precision).
  if (c.cerca.length < 5 && municipio) {
    const delMunicipio = await subvencionesDelMunicipio(municipio, ref);
    if (delMunicipio && delMunicipio.length > c.cerca.length)
      c = { ...c, cerca: alAzarEstable(delMunicipio, ref, 8), ambitoCerca: "entorno" };
  }
  if (!municipio || sinTildes(municipio) === "MADRID") return componer(ref, c);
  const portales = c.inmuebles
    .map((i) => urb(i)?.dir)
    .filter((x): x is NonNullable<typeof x> => !!x?.nv && !!x?.pnp)
    .map((x) => ({ via: x.nv!, numero: x.pnp! }));
  return componer(ref, c, await enElCatalogo(ref, municipio, portales));
}

/** LOS 21 DISTRITOS DE MADRID CAPITAL.
 *
 *  Catastro guarda el distrito como un NUMERO -"11"-, que no dice nada a quien
 *  mira la pantalla. Esta es la correspondencia oficial del Ayuntamiento, que no
 *  cambia: no es una interpretacion, es la tabla. */
const DISTRITOS_MADRID: Record<string, string> = {
  "1": "Centro", "2": "Arganzuela", "3": "Retiro", "4": "Salamanca",
  "5": "Chamartín", "6": "Tetuán", "7": "Chamberí", "8": "Fuencarral-El Pardo",
  "9": "Moncloa-Aravaca", "10": "Latina", "11": "Carabanchel", "12": "Usera",
  "13": "Puente de Vallecas", "14": "Moratalaz", "15": "Ciudad Lineal",
  "16": "Hortaleza", "17": "Villaverde", "18": "Villa de Vallecas",
  "19": "Vicálvaro", "20": "San Blas-Canillejas", "21": "Barajas",
};

/** El distrito, con su nombre, para el subtitulo de la cabecera.
 *
 *  Solo en Madrid capital: fuera no hay distritos municipales. El BARRIO que
 *  ella puso en su maqueta -"Carabanchel · Puerta Bonita"- no lo tenemos en
 *  ninguna fuente, y no se inventa. */
export async function distritoDe(referenciaBruta: string): Promise<string | null> {
  const ref = referenciaBruta.replace(/\s/g, "").toUpperCase().slice(0, 14);
  if (!URL_BASE || !SECRETO || ref.length < 14) return null;
  try {
    const r = await fetch(
      `${URL_BASE}/rest/v1/ficha_catastro?select=municipio,distrito_municipal&referencia=eq.${ref}&limit=1`,
      { headers: cab, cache: "no-store" },
    );
    if (!r.ok) return null;
    const [f] = (await r.json()) as { municipio: string | null; distrito_municipal: string | null }[];
    if (!f?.distrito_municipal || !/^MADRID$/i.test((f.municipio || "").trim())) return null;
    const nombre = DISTRITOS_MADRID[f.distrito_municipal.trim()];
    return nombre ? `Distrito ${f.distrito_municipal} · ${nombre}` : null;
  } catch {
    return null;
  }
}

export type Iee = {
  fecha: string | null;
  valoracion: string | null;
  /** ¿La accesibilidad cumple? false es lo normal en los edificios de antes. */
  accesibilidadCumple: boolean | null;
  /** ¿Admite ajustes razonables? Un NO aqui es la senal de compra. */
  admiteAjustes: boolean | null;
  energetica: string | null;
};

/** EL IEE REGISTRADO, cruzado por referencia catastral.
 *
 *  El dato lleva tiempo en la base -lo trae el radar del registro publico- pero
 *  el informe del edificio no lo miraba: tenia un "—" y la nota "consulta
 *  pendiente de montar". Esto la monta.
 *
 *  Y es de lo mas valioso que hay aqui, por dos lecturas suyas:
 *
 *    "El filon son las FAVORABLES pendientes de accesibilidad: al estar su
 *     informe favorable, nadie les esta mirando."
 *
 *    "'Ajustes razonables = NO' es la senal de compra: significa que la obra
 *     pasa de tres veces la cuota, y entonces venden subvenciones."
 *
 *  Solo estan los edificios ya barridos por el radar, asi que lo normal es que
 *  no haya fila. Eso no es un fallo: es que de ese edificio no sabemos nada. */
export async function ieeDe(referenciaBruta: string): Promise<Iee | null> {
  const ref = referenciaBruta.replace(/\s/g, "").toUpperCase().slice(0, 14);
  if (!URL_BASE || !SECRETO || ref.length < 14) return null;
  try {
    // Todas las del edificio y aqui la mas reciente: las ya INSCRITAS no traen
    // fecha de emision, sino "Fecha ultimo IEE registrado" (12-oct-2026), y
    // ordenando solo por emision se quedaban detras o sin fecha.
    const r = await fetch(
      `${URL_BASE}/rest/v1/iee_registrado?select=fecha_emision,bruto,valoracion,accesibilidad_satisface,` +
        `accesibilidad_ajustes,calificacion_energetica&referencia=eq.${ref}`,
      { headers: cab, cache: "no-store" },
    );
    if (!r.ok) return null;
    const filas = (await r.json()) as {
      fecha_emision: string | null;
      bruto: Record<string, string> | null;
      valoracion: string | null;
      accesibilidad_satisface: boolean | null;
      accesibilidad_ajustes: boolean | null;
      calificacion_energetica: string | null;
    }[];
    const fechaDe = (x: (typeof filas)[number]) => {
      if (x.fecha_emision) return x.fecha_emision;
      const m = (x.bruto?.["Fecha último IEE registrado"] ?? "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
      return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
    };
    const [f] = filas.sort((a, b) => (fechaDe(b) ?? "").localeCompare(fechaDe(a) ?? ""));
    if (!f) return null;
    return {
      fecha: fechaDe(f),
      valoracion: f.valoracion,
      accesibilidadCumple: f.accesibilidad_satisface,
      admiteAjustes: f.accesibilidad_ajustes,
      energetica: f.calificacion_energetica,
    };
  } catch {
    return null;
  }
}

export type Ascensor = {
  hay: boolean | null;
  quien: string | null;
  cuando: string | null;
  /** Cuantos patios. 0 es "no tiene"; null es "nadie los ha contado". */
  patios: number | null;
  patiosQuien: string | null;
  patiosCuando: string | null;
  /** ¿Portal accesible? false = tiene escalones (dentro o fuera): se le puede
   *  vender una rampa o una plataforma. null = nadie lo ha mirado (15-oct-2026). */
  portal: boolean | null;
  portalQuien: string | null;
  portalCuando: string | null;
};

/** LO QUE HEMOS VISTO NOSOTROS: el ascensor y los patios. Va aparte del informe
 *  porque NO son datos de Catastro ni del geoportal: son observaciones humanas,
 *  y por eso llevan firma -quien y cuando-. Se leen y se escriben por su cuenta.
 *  Los patios los anadio ella el 5-oct-2026: "es un dato del edificio como lo es
 *  el numero de viviendas, solo que con otro origen: manual en vez de Catastro". */
export async function ascensorDe(referenciaBruta: string): Promise<Ascensor> {
  const ref = referenciaBruta.replace(/\s/g, "").toUpperCase().slice(0, 14);
  const vacio: Ascensor = {
    hay: null, quien: null, cuando: null, patios: null, patiosQuien: null, patiosCuando: null,
    portal: null, portalQuien: null, portalCuando: null,
  };
  if (!URL_BASE || !SECRETO) return vacio;
  try {
    const r = await fetch(
      `${URL_BASE}/rest/v1/ficha_catastro?select=tiene_ascensor,ascensor_visto_en,equipo:ascensor_visto_por(nombre),` +
        `patios,patios_vistos_en,conto:patios_vistos_por(nombre),` +
        `portal_accesible,portal_visto_en,miro:portal_visto_por(nombre)&referencia=eq.${ref}&limit=1`,
      { headers: cab, cache: "no-store" },
    );
    if (!r.ok) return vacio;
    const [f] = (await r.json()) as {
      tiene_ascensor: boolean | null;
      ascensor_visto_en: string | null;
      equipo: { nombre: string } | null;
      patios: number | null;
      patios_vistos_en: string | null;
      conto: { nombre: string } | null;
      portal_accesible: boolean | null;
      portal_visto_en: string | null;
      miro: { nombre: string } | null;
    }[];
    if (!f) return vacio;
    return {
      hay: f.tiene_ascensor,
      quien: f.equipo?.nombre ?? null,
      cuando: f.ascensor_visto_en,
      patios: f.patios,
      patiosQuien: f.conto?.nombre ?? null,
      patiosCuando: f.patios_vistos_en,
      portal: f.portal_accesible,
      portalQuien: f.miro?.nombre ?? null,
      portalCuando: f.portal_visto_en,
    };
  } catch {
    return vacio;
  }
}

// ============================================================================
// AL DIA, SOLOS (Monica, 15-oct-2026): ninguna capa del geoportal ni Catastro
// marca que ha cambiado, asi que:
//   - el censo de subvenciones se baja ENTERO una vez al mes (es una sola
//     peticion: ~1.400 filas en segundos), y
//   - cada noche se refrescan los edificios que llevan mas tiempo sin
//     consultarse (goteo), sin agobiar a Catastro.
// ============================================================================

/** EL CENSO ENTERO de subvenciones concedidas de Madrid, a subvencion_concedida.
 *  Una sola peticion; si el geoportal la corta (exceededTransferLimit), se dice
 *  y no se guarda nada a medias. */
export async function bajarCensoSubvenciones(): Promise<{ total: number; nuevas: number; coam: number; coamNuevas: number }> {
  const q = new URLSearchParams({ where: "1=1", outFields: "*", returnGeometry: "true", outSR: "4326", f: "json" });
  const d = (await jsonDe(`${SIGMA}/${CENSO.servicio}/MapServer/${CENSO.capa}/query?${q}`)) as {
    exceededTransferLimit?: boolean;
    features?: { attributes: Record<string, string | number | null>; geometry?: { x?: number; y?: number } }[];
  };
  if (d.exceededTransferLimit) throw new Error("El geoportal ha cortado la respuesta: hay que pedir el censo por trozos.");
  const ahora = new Date().toISOString();
  const filas = (d.features ?? [])
    .map((f): Record<string, unknown> => ({ ...atributos(f.attributes), _lat: f.geometry?.y ?? null, _lng: f.geometry?.x ?? null }))
    .filter((a) => a.OBJECTID != null)
    .map((a) => filaDelCenso(a, ahora));
  if (!filas.length) throw new Error("El geoportal no ha devuelto ninguna subvencion.");

  const cuantas = async (servicio: string) => {
    const r = await fetch(`${URL_BASE}/rest/v1/subvencion_concedida?select=id&servicio=eq.${encodeURIComponent(servicio)}`, {
      headers: { ...cab, Prefer: "count=exact", Range: "0-0" },
      cache: "no-store",
    });
    return Number(r.headers.get("content-range")?.split("/")[1] ?? "0") || 0;
  };
  const habia = await cuantas(CENSO.servicio);
  const habiaCoam = await cuantas(COAM.servicio);
  for (let k = 0; k < filas.length; k += 500) {
    const r = await fetch(`${URL_BASE}/rest/v1/subvencion_concedida?on_conflict=servicio,capa,objectid`, {
      method: "POST",
      headers: { ...cab, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(filas.slice(k, k + 500)),
    });
    if (!r.ok) throw new Error(`Supabase subvencion_concedida ${r.status}: ${await r.text()}`);
  }
  // Y el visor del COAM: toda la Comunidad (Monica, 15-oct-2026).
  const coam = await bajarCoam(ahora);
  return { total: filas.length, nuevas: Math.max(0, filas.length - habia), coam, coamNuevas: Math.max(0, coam - habiaCoam) };
}

/** EL GOTEO NOCTURNO: los edificios que llevan mas tiempo sin consultarse se
 *  vuelven a pedir fuera y quedan escritos en las tablas (lo mismo que "volver a
 *  consultar"). Uno detras de otro, para no agobiar a Catastro, hasta `cuantos`
 *  o hasta que se acabe el tiempo. Se saltan los que ya se preguntaron hace
 *  menos de 30 dias sin exito: si no, los que fallan siempre ocuparian la cola. */
export async function goteoEdificios(cuantos = 20, segundos = 230): Promise<{ hechos: number; bien: number; mal: string[] }> {
  const hasta = Date.now() + segundos * 1000;
  const viejos = (await (
    await fetch(`${URL_BASE}/rest/v1/ficha_catastro?select=referencia&order=consultado_en.asc.nullsfirst&limit=${cuantos * 5}`, { headers: cab, cache: "no-store" })
  ).json()) as { referencia: string }[];
  const refs = viejos.map((v) => v.referencia).filter((r) => /^[0-9A-Z]{14}$/.test(r));
  const recientes = refs.length
    ? ((await (
        await fetch(
          `${URL_BASE}/rest/v1/consulta_externa?select=referencia&fuente=eq.catastro&resultado=neq.ok` +
            `&preguntado_en=gte.${new Date(Date.now() - 30 * 86400000).toISOString()}&referencia=in.(${refs.join(",")})`,
          { headers: cab, cache: "no-store" },
        )
      ).json()) as { referencia: string }[])
    : [];
  const saltar = new Set(recientes.map((r) => r.referencia));
  const cola = refs.filter((r) => !saltar.has(r)).slice(0, cuantos);

  let hechos = 0, bien = 0;
  const mal: string[] = [];
  for (const ref of cola) {
    if (Date.now() > hasta) break;
    hechos++;
    try {
      const i = await informeEdificio(ref, { refrescar: true });
      if (i && i.fallos.length === 0) bien++;
      else mal.push(ref);
    } catch {
      mal.push(ref);
    }
    await espera(1000);
  }
  return { hechos, bien, mal };
}
