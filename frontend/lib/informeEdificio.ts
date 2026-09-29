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

const num = (s?: string) => {
  const n = Number(String(s ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const urb = (i: Inm) => i.dt?.locs?.lous?.lourb;
const rcDe = (i: Inm) => i.rc ?? i.idbi?.rc;

async function jsonDe(u: string): Promise<Record<string, unknown>> {
  const r = await fetch(u, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json() as Promise<Record<string, unknown>>;
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

// ------------------------------------------------------------------ el informe

export async function informeEdificio(referenciaBruta: string): Promise<InformeEdificio | null> {
  const ref = referenciaBruta.replace(/\s/g, "").toUpperCase().slice(0, 14);
  if (ref.length < 14) return null;

  const fallos: string[] = [];
  const pdfs: { que: string; url: string }[] = [];

  // --- 1 · Catastro: todos los inmuebles de la parcela ---------------------
  const d1 = (await jsonDe(`${CALL}/Consulta_DNPRC?Provincia=&Municipio=&RefCat=${ref}`)) as {
    consulta_dnprcResult?: { lrcdnp?: { rcdnp?: Inm[] }; bico?: { bi?: Inm } };
  };
  const r1 = d1.consulta_dnprcResult;
  const inmuebles = r1?.lrcdnp?.rcdnp ?? (r1?.bico?.bi ? [r1.bico.bi] : []);
  if (inmuebles.length === 0) return null;

  const primero = inmuebles[0];
  const dir = urb(primero)?.dir;
  const municipio = primero.dt?.nm ?? null;

  // --- 2 · los datos de la FINCA (solo salen pidiendo UN inmueble) ---------
  let fincaLdt = "";
  let tipoParcela = "";
  let suelo: number | null = null;
  const rc0 = rcDe(primero);
  if (rc0?.car) {
    try {
      const d2 = (await jsonDe(
        `${CALL}/Consulta_DNPRC?Provincia=&Municipio=&RefCat=${ref}${rc0.car}${rc0.cc1 ?? ""}${rc0.cc2 ?? ""}`,
      )) as { consulta_dnprcResult?: { bico?: { finca?: { ldt?: string; ltp?: string; dff?: { ss?: string } } } } };
      const f = d2.consulta_dnprcResult?.bico?.finca;
      fincaLdt = f?.ldt ?? "";
      tipoParcela = f?.ltp ?? "";
      suelo = num(f?.dff?.ss);
    } catch {
      fallos.push("No se han podido leer los datos de la finca (superficie de suelo, tipo de parcela).");
    }
  }

  // --- 3 · coordenadas, en grados y en UTM --------------------------------
  let lat: number | null = null, lng: number | null = null, utmX: number | null = null, utmY: number | null = null;
  try {
    const g = await (await fetch(`${COOR}/Consulta_CPMRC?Provincia=&Municipio=&SRS=EPSG:4326&RC=${ref}`, { cache: "no-store" })).text();
    lng = Number(/<xcen>([^<]+)/.exec(g)?.[1]);
    lat = Number(/<ycen>([^<]+)/.exec(g)?.[1]);
    const u = await (await fetch(`${COOR}/Consulta_CPMRC?Provincia=&Municipio=&SRS=EPSG:25830&RC=${ref}`, { cache: "no-store" })).text();
    utmX = Number(/<xcen>([^<]+)/.exec(u)?.[1]);
    utmY = Number(/<ycen>([^<]+)/.exec(u)?.[1]);
  } catch {
    fallos.push("No se han podido obtener las coordenadas: sin ellas no hay croquis ni datos de urbanismo.");
  }

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

  // --- 5 · urbanismo (solo Madrid capital, y solo con coordenadas) ---------
  const esMadrid = (municipio ?? "").toUpperCase() === "MADRID";
  let protegido: Record<string, unknown> | null = null;
  let condiciones: Record<string, unknown> | null = null;
  let ascensor: Record<string, unknown> | null = null;
  let apiru: Record<string, unknown> | null = null;
  let arru: Record<string, unknown> | null = null;

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
  }

  // ZETU y ZIRE no son capas: se calculan. El Plan Rehabilita absorbio APIRU y
  // ARRU dentro de ZETU, y creo ZIRE para el resto de Madrid capital.
  const zona = !esMadrid ? null : apiru || arru ? "ZETU" : "ZIRE";

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
            d("Subvenciones ya concedidas cerca", "—",
              "El censo del geoportal dice qué se ha concedido en la zona y por cuánto. Consulta pendiente de montar.", true),
            d("¿Tiene IEE registrada?", "—",
              "Si ya la tiene y es antigua, o no la tiene, es de las primeras cosas que se pueden vender. Consulta pendiente de montar.", true),
          ],
    },
    {
      titulo: "Restricciones",
      datos: !esMadrid
        ? [d("Modelo de ascensor", "No se puede consultar fuera de Madrid capital", undefined, true)]
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
  const c: Conclusion[] = [];
  const mete = (tono: Conclusion["tono"], texto: string, porque: string) => c.push({ tono, texto, porque });

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
    conclusiones: c,
    pdfs,
    soloYendo,
    fallos,
  };
}
