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
    locs?: { lous?: { lourb?: { dir?: { tv?: string; nv?: string; pnp?: string }; dp?: string; dm?: string; loint?: { es?: string; pt?: string; pu?: string } } } };
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
async function enElPunto(servicio: string, capa: number, x: number, y: number, radio = 0) {
  const q = new URLSearchParams({
    geometry: `${x},${y}`,
    geometryType: "esriGeometryPoint",
    inSR: "25830",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: "false",
    f: "json",
  });
  if (radio > 0) {
    q.set("distance", String(radio));
    q.set("units", "esriSRUnit_Meter");
  }
  const d = (await jsonDe(`${SIGMA}/${servicio}/MapServer/${capa}/query?${q}`)) as {
    features?: { attributes: Record<string, string | number | null> }[];
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
  fallos: string[];
  consultadoEn: string;
  /** False cuando el informe sale de las tablas extraidas y el geoportal de
   *  Madrid no se ha consultado: entonces no se sabe, y no se dice "No". Sin el
   *  campo (lo guardado por la propia pantalla) es que si se consulto. */
  geoportal?: boolean;
};

// ------------------------------------------------------------------ el informe

function componer(ref: string, c: Crudo): InformeEdificio | null {
  const { inmuebles, fincaLdt, tipoParcela, suelo, lat, lng, utmX, utmY } = c;
  const { protegido, condiciones, ascensor, apiru, arru, cerca } = c;
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
        ? [d("Protección", "No se puede consultar fuera de Madrid capital", undefined, true)]
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
            d("Subvenciones concedidas a 800 m", cerca.length === 0 ? "Ninguna" : `${cerca.length} · ${eur(cerca.reduce((t, x) => t + (x.importe ?? 0), 0))}`,
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
      `${cerca.length} subvenciones concedidas a menos de 800 m`,
      `${eur(cerca.reduce((t, x) => t + (x.importe ?? 0), 0))} ya repartidos en el barrio` +
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
  const esMadrid = (municipio ?? "").toUpperCase() === "MADRID";

  if (esMadrid && utmX && utmY) {
    const pide = async (s: string, c: number, radio = 0) => {
      try {
        const f = await enElPunto(s, c, utmX!, utmY!, radio);
        return f[0] ? atributos(f[0].attributes) : null;
      } catch {
        fallos.push(`No responde el geoportal (${s}, capa ${c}).`);
        return null;
      }
    };
    [protegido, condiciones, ascensor, apiru, arru] = await Promise.all([
      pide("DESARROLLO_URBANO_ACTUALIZADO/EDIFICIOS_PROTEGIDOS_VIGENTE", 4),
      pide("PGOUM97/PG_ANALISIS_EDIFICACION", 8),
      // Los ascensores son PUNTOS, uno por portal: hay que buscar CERCA.
      pide("URBANISMO/MODELO_ASCENSORES_ESPACIO_PUBLICO", 1, 30),
      pide("VIVIENDA/SUBVENCIONES_AMBITOS", 2),
      pide("VIVIENDA/SUBVENCIONES_AMBITOS", 1),
    ]);

    try {
      const [f, aqui] = await Promise.all([
        enElPunto("VIVIENDA/REHABILITACION_ENERGETICA_CM", 0, utmX, utmY, 800),
        enElPunto("VIVIENDA/REHABILITACION_ENERGETICA_CM", 0, utmX, utmY, 35),
      ]);
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
  };
}

/** Guardar. Si falla no se cae la pantalla: se ha consultado igual.
 *
 *  UNA FICHA A MEDIAS NO SE GUARDA. Si Catastro nos ha cortado y no hay
 *  coordenadas, guardarla dejaria el fallo congelado 120 dias y nadie sabria por
 *  que esa direccion "no tiene croquis". Mejor no guardar y reintentar. */
async function guardar(ref: string, c: Crudo) {
  if (!URL_BASE || !SECRETO) return;
  if (c.fallos.length > 0 || c.lat === null || c.lng === null) return;
  const i = componer(ref, c);
  if (!i) return;
  const dato = (q: string) => i.secciones.flatMap((s) => s.datos).find((d) => d.que === q)?.valor ?? null;

  await fetch(`${URL_BASE}/rest/v1/ficha_catastro?on_conflict=referencia`, {
    method: "POST",
    headers: { ...cab, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      referencia: ref,
      direccion: i.direccionOficial || null,
      municipio: i.municipio,
      cp: dato("Municipio y código postal")?.split("·").pop()?.trim() ?? null,
      tipo_parcela: c.tipoParcela || null,
      superficie_suelo: c.suelo,
      inmuebles: c.inmuebles.length,
      lat: c.lat, lng: c.lng, utm_x: c.utmX, utm_y: c.utmY,
      // LO CRUDO ENTERO: de aqui se vuelve a componer el informe sin pedir nada.
      bruto: c,
      consultado_en: c.consultadoEn,
    }),
  });
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
    cerca: geo?.cerca ?? [],
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
async function geoportalGuardado(f: FilaFicha): Promise<Pick<Crudo, "protegido" | "condiciones" | "ascensor" | "apiru" | "arru" | "cerca"> | null> {
  const r = await fetch(`${URL_BASE}/rest/v1/dato_urbanistico?select=fuente,hay,detalle&referencia=eq.${f.referencia}`, {
    headers: cab,
    cache: "no-store",
  });
  if (!r.ok) return null;
  const filas = (await r.json()) as { fuente: string; hay: boolean | null; detalle: Record<string, unknown> | null }[];
  const de = (fuente: string) => filas.find((x) => x.fuente === fuente);
  if (!FUENTES_GEOPORTAL.every((x) => de(x)?.hay != null)) return null;
  const si = (fuente: string) => (de(fuente)?.hay ? (de(fuente)?.detalle ?? null) : null);

  let cerca: SubvencionCerca[] = [];
  if (f.lat != null && f.lng != null) {
    // Una caja algo mayor de 800 m, y luego la distancia de verdad.
    const dLat = 0.0075;
    const dLng = 0.0100;
    const s = await fetch(
      `${URL_BASE}/rest/v1/subvencion_concedida?select=direccion,importe,convocatoria,viviendas,ahorro_co2,lat,lng` +
        `&lat=gte.${f.lat - dLat}&lat=lte.${f.lat + dLat}&lng=gte.${f.lng - dLng}&lng=lte.${f.lng + dLng}`,
      { headers: cab, cache: "no-store" },
    );
    if (!s.ok) return null;
    const lista = (await s.json()) as {
      direccion: string;
      importe: number | null;
      convocatoria: string | null;
      viviendas: number | null;
      ahorro_co2: number | null;
      lat: number;
      lng: number;
    }[];
    cerca = lista
      .map((x) => ({ x, m: metros(f.lat!, f.lng!, x.lat, x.lng) }))
      .filter(({ m }) => m <= 800)
      .map(({ x, m }) => ({
        direccion: x.direccion.trim(),
        importe: x.importe != null ? Number(x.importe) : null,
        convocatoria: x.convocatoria,
        viviendas: x.viviendas,
        ahorroCo2: x.ahorro_co2 != null ? Number(x.ahorro_co2) : null,
        aqui: m <= 35,
      }))
      .sort((x, y) => (y.importe ?? 0) - (x.importe ?? 0));
  }

  return {
    protegido: si("edificio_protegido"),
    condiciones: si("condiciones_proteccion"),
    ascensor: si("modelo_ascensor"),
    apiru: si("apiru"),
    arru: si("arru"),
    cerca,
  };
}

/** Lo guardado. Null si no hay nada o si esta pasado de fecha. */
async function leerDeLaBase(ref: string, diasBueno: number): Promise<Crudo | null> {
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
    // Lo guardado por esta misma pantalla, con el geoportal dentro.
    if (f.bruto?.inmuebles?.length) {
      // Una guardada a medias se trata como si no existiera: asi se cura sola.
      const bueno = f.bruto.lat !== null && f.bruto.lng !== null && (f.bruto.fallos?.length ?? 0) === 0;
      const dias = (Date.now() - new Date(f.consultado_en).getTime()) / 86400000;
      if (bueno && dias <= diasBueno) return f.bruto;
    }
    // Si no, lo extraido por el barrido.
    return await desdeLasTablas(f);
  } catch {
    return null;
  }
}

/** La puerta: primero lo guardado, y solo si no hay se sale fuera. */
export async function informeEdificio(
  referenciaBruta: string,
  // `completo`: para lo que se entrega al cliente. Si lo guardado no lleva el
  // geoportal, se sale a por el y queda guardado para la proxima.
  opciones: { refrescar?: boolean; diasBueno?: number; completo?: boolean } = {},
): Promise<InformeEdificio | null> {
  const ref = referenciaBruta.replace(/\s/g, "").toUpperCase().slice(0, 14);
  if (ref.length < 14) return null;

  const guardado = opciones.refrescar ? null : await leerDeLaBase(ref, opciones.diasBueno ?? 120);
  if (guardado && !(opciones.completo && guardado.geoportal === false)) return componer(ref, guardado);
  // Si fuera falla, mejor lo guardado que nada.
  const loQueHay = () => (guardado ? componer(ref, guardado) : null);

  // Si Catastro corta la conexion (pasa: 8-oct-2026, "ECONNRESET" en la ficha
  // de Zamora 28 y en la de Albufera 250), la ficha NO se cae: sale el aviso de
  // "no se ha podido traer el edificio" y la proxima vez se reintenta.
  let fuera: Crudo | null = null;
  try {
    fuera = await traerDeFuera(ref);
  } catch {
    return loQueHay();
  }
  if (!fuera) return loQueHay();
  try {
    await guardar(ref, fuera);
  } catch {
    /* que no se guarde no impide enseñarlo */
  }
  return componer(ref, fuera);
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
    const r = await fetch(
      `${URL_BASE}/rest/v1/iee_registrado?select=fecha_emision,valoracion,accesibilidad_satisface,` +
        `accesibilidad_ajustes,calificacion_energetica&referencia=eq.${ref}` +
        `&order=fecha_emision.desc.nullslast&limit=1`,
      { headers: cab, cache: "no-store" },
    );
    if (!r.ok) return null;
    const [f] = (await r.json()) as {
      fecha_emision: string | null;
      valoracion: string | null;
      accesibilidad_satisface: boolean | null;
      accesibilidad_ajustes: boolean | null;
      calificacion_energetica: string | null;
    }[];
    if (!f) return null;
    return {
      fecha: f.fecha_emision,
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
};

/** LO QUE HEMOS VISTO NOSOTROS: el ascensor y los patios. Va aparte del informe
 *  porque NO son datos de Catastro ni del geoportal: son observaciones humanas,
 *  y por eso llevan firma -quien y cuando-. Se leen y se escriben por su cuenta.
 *  Los patios los anadio ella el 5-oct-2026: "es un dato del edificio como lo es
 *  el numero de viviendas, solo que con otro origen: manual en vez de Catastro". */
export async function ascensorDe(referenciaBruta: string): Promise<Ascensor> {
  const ref = referenciaBruta.replace(/\s/g, "").toUpperCase().slice(0, 14);
  const vacio: Ascensor = { hay: null, quien: null, cuando: null, patios: null, patiosQuien: null, patiosCuando: null };
  if (!URL_BASE || !SECRETO) return vacio;
  try {
    const r = await fetch(
      `${URL_BASE}/rest/v1/ficha_catastro?select=tiene_ascensor,ascensor_visto_en,equipo:ascensor_visto_por(nombre),` +
        `patios,patios_vistos_en,conto:patios_vistos_por(nombre)&referencia=eq.${ref}&limit=1`,
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
    }[];
    if (!f) return vacio;
    return {
      hay: f.tiene_ascensor,
      quien: f.equipo?.nombre ?? null,
      cuando: f.ascensor_visto_en,
      patios: f.patios,
      patiosQuien: f.conto?.nombre ?? null,
      patiosCuando: f.patios_vistos_en,
    };
  } catch {
    return vacio;
  }
}
