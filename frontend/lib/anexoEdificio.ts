// lib/anexoEdificio.ts
//
// EL ANEXO DE LA VIABILIDAD: la ficha del edificio en limpio, SIN IA (Monica,
// 6-oct-2026; maqueta aprobada con la vuelta de Daniel en
// docs/figma/anexo-viabilidad-edificio.html).
//
// Reglas que vienen de ellos:
//   - SOLO SALE LO QUE SE SABE. Nada de "pendiente de ver" ni "lo
//     comprobaremos": "parece que le damos un trabajo a medio hacer" (Daniel).
//     Lo que no se sabe, no aparece.
//   - "Lo que hemos comprobado en la visita" solo si se ha ido de verdad.
//   - Las ayudas, como lista de lo que PODRIA OBTENER segun LO QUE NOS HAN PEDIDO
//     ("para la rampa solicitada podria acceder a... y si ademas incluyera
//     eficiencia..."), con lo que dan y, si hay coste de obra, una estimacion.
//   - Lo que han conseguido otros: en Madrid capital, a menos de 800 m (geoportal,
//     con direccion); fuera, en su municipio (BDNS). Cinco nombres como mucho,
//     y el total.
//
// Los datos salen de lo que ya hay: Catastro y el geoportal (lib/informeEdificio),
// el registro de IEE, el catalogo de convocatorias validado, las concesiones de
// la BDNS, lo que se ha pedido en la oportunidad y, si existe, el PEM estimado de
// la viabilidad.

import "server-only";
import { ascensorDe, ieeDe, informeEdificio, distritoDe, type Iee } from "./informeEdificio";
import { bonito, NOMBRE_TIPO } from "./direccionNombre";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const leer = async <T>(path: string): Promise<T> => {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
};
const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();
const eur = (n: number) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" }).format(n) + " €";

export type LineaAyuda = { convocatoria: string; cubre: string; cuantoDa: string; estimacion: string | null; estado: string };
export type Conseguida = { quien: string; detalle: string; importe: number | null };
export type Anexo = {
  fecha: string;
  referencia: string;
  direccion: string;
  lugar: string;
  croquis: string | null;
  aerea: string | null;
  cifras: { valor: string; que: string }[];
  resumen: string;
  epoca: { titulo: string; texto: string }[];
  iee: Iee | null;
  condiciona: { bien: boolean; titulo: string; texto: string }[] | null;
  pedido: string | null;
  ayudas: LineaAyuda[];
  ademasEficiencia: LineaAyuda[];
  estimacionNota: string | null;
  entorno: { donde: string; filas: Conseguida[]; mas: number; total: number } | null;
  visto: { titulo: string; texto: string }[];
  fuentes: string;
};

type Catalogo = {
  id: string; ambito: string; entidad: string; programa: string; linea: string | null; municipio: string | null; zona: string | null;
  solo_barrios: boolean; para_que: string; cubre: string | null; porcentaje: number | null; tope_vivienda: number | null;
  tope_edificio: number | null; tope_actuacion: number | null; cuanto_da: string; estado: string; orden: number;
  tipos: { tipo_proyecto_id: string }[];
};

/** Lo que nos han pedido: las actuaciones de la ultima hoja de la oportunidad
 *  y, si no hay hoja, lo que se apunto al dar de alta la oportunidad. */
async function pedidoDe(oppId: string): Promise<{ ids: Set<string>; nombres: string[] }> {
  const tipos = await leer<{ id: string; nombre: string; parent_id: string | null }[]>("tipos_proyecto?select=id,nombre,parent_id");
  const hojas = await leer<{ actuaciones: { tipo: { id: string; nombre: string } | null }[] }[]>(
    `hojas_encargo?select=actuaciones:actuaciones_hoja(tipo:tipo_proyecto_id(id,nombre))&oportunidad_id=eq.${oppId}&estado=neq.anulada&order=creado_en.desc&limit=5`,
  );
  let elegidos = hojas.flatMap((h) => h.actuaciones.map((a) => a.tipo).filter((t): t is { id: string; nombre: string } => !!t));
  if (!elegidos.length) {
    const ot = await leer<{ tipo: { id: string; nombre: string } | null }[]>(`oportunidad_tipos?select=tipo:tipo_id(id,nombre)&oportunidad_id=eq.${oppId}`);
    elegidos = ot.map((x) => x.tipo).filter((t): t is { id: string; nombre: string } => !!t);
  }
  // Un tipo agrupador ("Eficiencia energetica") cuenta como todos sus hijos.
  const ids = new Set(elegidos.map((t) => t.id));
  for (const t of tipos) if (t.parent_id && ids.has(t.parent_id)) ids.add(t.id);
  return { ids, nombres: [...new Set(elegidos.map((t) => t.nombre.toLowerCase()))] };
}

function estimar(c: Catalogo, pem: number | null, viviendas: number | null): number | null {
  if (!pem) return null;
  const topes = [
    c.porcentaje != null ? (c.porcentaje / 100) * pem : null,
    c.tope_vivienda != null && viviendas ? c.tope_vivienda * viviendas : null,
    c.tope_edificio,
    c.tope_actuacion,
  ].filter((x): x is number => x != null);
  return topes.length && c.porcentaje != null ? Math.min(...topes) : null;
}

/** "CL ALBALATE DEL ARZOBISPO 5  MADRID (MADRID)" -> "Calle Albalate del
 *  Arzobispo 5". El municipio ya va debajo, en el lugar. */
function titular(oficial: string): string {
  const calle = oficial.split(/\s{2,}/)[0].trim();
  const [tipo, ...resto] = calle.split(/\s+/);
  return NOMBRE_TIPO[tipo] ? `${NOMBRE_TIPO[tipo]} ${bonito(resto.join(" "))}` : bonito(calle);
}

const nombreConvocatoria = (c: Catalogo) => [c.programa, c.linea].filter(Boolean).join(" · ") + (c.ambito === "ayto_madrid" ? "" : ` · ${c.entidad}`);
const ESTADO: Record<string, string> = { abierta: "abierta ahora", cerrada: "se convoca de nuevo", pendiente: "pendiente de convocar" };

export async function anexoDeOportunidad(oppId: string, opciones: { pem?: number | null } = {}): Promise<Anexo | null> {
  const [opp] = await leer<{ referencia_catastral: string | null; accesos: { acceso: { ref_catastral: string | null; municipio: string | null } | null }[] }[]>(
    `oportunidades?select=referencia_catastral,accesos:relacion_oportunidad_accesos(acceso:acceso_id(ref_catastral,municipio))&id=eq.${oppId}`,
  );
  const ref = opp?.referencia_catastral ?? opp?.accesos.find((a) => a.acceso?.ref_catastral)?.acceso?.ref_catastral ?? null;
  if (!ref) return null;

  const [i, asc, iee, distrito, pedido, catalogo] = await Promise.all([
    // Lo ve el cliente: aqui no vale un "sin consultar" (9-oct-2026).
    informeEdificio(ref, { completo: true }),
    ascensorDe(ref),
    ieeDe(ref),
    distritoDe(ref),
    pedidoDe(oppId),
    leer<Catalogo[]>(
      "catalogo_convocatorias?select=id,ambito,entidad,programa,linea,municipio,zona,solo_barrios,para_que,cubre,porcentaje,tope_vivienda,tope_edificio,tope_actuacion,cuanto_da,estado,orden,tipos:catalogo_convocatoria_tipos(tipo_proyecto_id)&activo=is.true&estado=neq.historica&order=orden.asc",
    ),
  ]);
  if (!i) return null;

  const dato = (titulo: string, que: string) => i.secciones.find((s) => s.titulo === titulo)?.datos.find((d) => d.que === que)?.valor ?? null;
  const municipio = sinTildes(i.municipio ?? opp?.accesos[0]?.acceso?.municipio ?? "");
  const esMadrid = municipio === "MADRID";

  // ---------------- las cifras y el resumen
  const anio = Number(dato("El edificio", "Año de construcción")) || null;
  const sobre = Number((dato("El edificio", "Plantas") ?? "").match(/^(\d+)/)?.[1]) || null;
  const vivTxt = dato("Los usos", "Viviendas") ?? "";
  const viviendas = Number(vivTxt.match(/^(\d+)/)?.[1]) || null;
  const inmuebles = Number(vivTxt.match(/de (\d+)/)?.[1]) || null;
  const portales = (dato("El edificio", "Portales") ?? "").split(",").filter((p) => p.trim() && p.trim() !== "—").length;
  const pctRes = (dato("Los usos", "% residencial") ?? "").match(/(\d+)% por superficie/)?.[1] ?? null;
  const plantasTxt = sobre ? (sobre > 1 ? `PB + ${sobre - 1}` : "PB") : null;
  const otros = viviendas && inmuebles ? inmuebles - viviendas : null;

  const cifras = [
    anio && { valor: String(anio), que: "construido" },
    plantasTxt && { valor: plantasTxt, que: "plantas" },
    viviendas && { valor: String(viviendas), que: "viviendas" },
    portales > 1 ? { valor: String(portales), que: "portales" } : otros ? { valor: String(otros), que: otros === 1 ? "local u otro uso" : "locales y otros" } : null,
    pctRes && { valor: `${pctRes}%`, que: "residencial" },
  ].filter(Boolean) as { valor: string; que: string }[];

  const resumen =
    `${portales > 1 ? `Conjunto residencial${anio ? ` de ${anio}` : ""} con ${portales} portales en una misma finca` : `Edificio residencial${anio ? ` de ${anio}` : ""}`}` +
    (sobre ? `, con planta baja${sobre > 1 ? ` y ${sobre - 1} alturas` : ""}` : "") +
    (viviendas ? `: ${viviendas} viviendas${otros ? (otros === 1 ? " y un local u otro uso" : ` y ${otros} locales u otros usos`) : ""}` : "") +
    ".";

  // ---------------- lo que implica su epoca
  const epoca: { titulo: string; texto: string }[] = [];
  if (anio && anio < 1979)
    epoca.push({ titulo: "Sin aislamiento térmico", texto: "Anterior a la norma de 1979: se construyó sin ninguna exigencia de aislamiento. Cualquier mejora de fachada o cubierta se nota en consumo y en la calificación energética." });
  else if (anio && anio < 2006)
    epoca.push({ titulo: "Aislamiento mínimo", texto: "Entre 1979 y el Código Técnico: un aislamiento muy por debajo de lo que se exige hoy." });
  if (anio && anio < 2002)
    epoca.push({ titulo: "Materiales de la época", texto: "Anterior a 2002: conviene revisar bajantes y cubiertas de fibrocemento antes de cualquier obra." });
  if (portales > 1)
    epoca.push({ titulo: `${portales} portales`, texto: "Pueden actuar todos a la vez o empezar por uno y sumar los demás después." });
  else if (sobre && sobre >= 4)
    epoca.push({ titulo: `${sobre} alturas`, texto: "Un acceso sin barreras desde la calle hasta cada planta es lo que más valor añade a las viviendas altas." });

  // ---------------- lo que condiciona (solo donde hay dato: Madrid capital)
  let condiciona: Anexo["condiciona"] = null;
  if (esMadrid) {
    const prot = dato("Protección", "¿Está protegido?");
    const homog = dato("Protección", "Conjunto homogéneo");
    const modelo = dato("Restricciones", "¿Modelo de ascensor obligatorio?");
    condiciona = [
      prot && { bien: prot === "No", titulo: prot === "No" ? "Sin protección" : "Edificio protegido", texto: prot === "No" ? "No está catalogado: no hay trámite de Patrimonio." : `${prot}. La obra pasa por Patrimonio.` },
      homog && { bien: homog === "—", titulo: homog === "—" ? "Sin conjunto homogéneo" : "Conjunto homogéneo", texto: homog === "—" ? "La fachada puede tratarse como el edificio necesite." : homog },
      modelo && { bien: modelo === "No", titulo: modelo === "No" ? "Sin modelo de ascensor impuesto" : "Modelo de ascensor fijado", texto: modelo === "No" ? "Se puede proyectar el ascensor que convenga." : "El distrito exige un modelo concreto: el proyecto parte de él." },
    ].filter(Boolean) as NonNullable<Anexo["condiciona"]>;
  }

  // ---------------- las ayudas, por lo que nos han pedido
  const zona = (dato("Dinero: a qué ayudas entra", "Zona") ?? "").toUpperCase();
  const cabe = (c: Catalogo) =>
    !c.solo_barrios &&
    (c.municipio == null || c.municipio === municipio) &&
    (c.zona == null || c.zona === zona) &&
    (c.ambito !== "ayto_madrid" || esMadrid);
  const pem = opciones.pem ?? null;
  const linea = (c: Catalogo): LineaAyuda => {
    const e = estimar(c, pem, viviendas);
    return { convocatoria: nombreConvocatoria(c), cubre: c.cubre ?? "", cuantoDa: c.cuanto_da, estimacion: e ? `unos ${eur(e)}` : null, estado: ESTADO[c.estado] ?? c.estado };
  };
  const candidatas = catalogo.filter(cabe);
  const pedidas = candidatas.filter((c) => c.tipos.some((t) => pedido.ids.has(t.tipo_proyecto_id)));
  const pideEficiencia = pedidas.some((c) => c.para_que === "eficiencia");
  const ademas = !pideEficiencia && anio && anio < 2006 ? candidatas.filter((c) => c.para_que === "eficiencia" && !pedidas.includes(c)) : [];
  // Primero lo abierto, luego lo que se repite y al final lo que esta por venir.
  const peso = (c: Catalogo) => ({ abierta: 0, cerrada: 1, pendiente: 2 })[c.estado as "abierta"] ?? 3;
  const orden = (a: Catalogo, b: Catalogo) => peso(a) - peso(b) || a.orden - b.orden;

  // ---------------- lo que han conseguido otros
  let entorno: Anexo["entorno"] = null;
  const paraQuePedido = new Set(pedidas.map((c) => c.para_que));
  if (esMadrid) {
    const cerca = i.subvencionesCerca.filter((x) => !x.aqui).sort((a, b) => (b.importe ?? 0) - (a.importe ?? 0));
    if (cerca.length)
      entorno = {
        donde: "a menos de 800 m",
        filas: cerca.slice(0, 5).map((x) => ({
          quien: bonito(x.direccion),
          detalle: [x.viviendas ? `${x.viviendas} viviendas` : null, x.convocatoria].filter(Boolean).join(" · "),
          importe: x.importe,
        })),
        mas: Math.max(0, cerca.length - 5),
        total: cerca.reduce((t, x) => t + (x.importe ?? 0), 0),
      };
  } else if (municipio) {
    const compacto = (s: string) => sinTildes(s).replace(/^[,\s]+/, "").replace(/\bDE\b|\bLA\b|\bLOS\b|\bLAS\b|[^A-Z]/g, "");
    const objetivo = compacto(municipio);
    const conc = await leer<{ beneficiario: string; nombre_via: string | null; numero: string | null; municipio_leido: string | null; organo: string | null; importe: number | null; fecha_concesion: string | null; convocatoria: string | null; catalogo: { para_que: string; programa: string } | null }[]>(
      "concesiones_bdns?select=beneficiario,nombre_via,numero,municipio_leido,organo,importe,fecha_concesion,convocatoria,catalogo:catalogo_convocatoria_id(para_que,programa)&limit=10000",
    );
    const suyas = conc.filter((k) => {
      const m = k.municipio_leido ? compacto(k.municipio_leido) : "";
      return (m.length >= 4 && objetivo.startsWith(m)) || sinTildes(k.organo ?? "").startsWith(sinTildes(municipio));
    });
    if (suyas.length) {
      suyas.sort(
        (a, b) =>
          Number(!!b.catalogo && paraQuePedido.has(b.catalogo.para_que)) - Number(!!a.catalogo && paraQuePedido.has(a.catalogo.para_que)) ||
          (b.fecha_concesion ?? "").localeCompare(a.fecha_concesion ?? "") ||
          (b.importe ?? 0) - (a.importe ?? 0),
      );
      const nombre = (k: (typeof suyas)[number]) =>
        k.nombre_via ? `${bonito(k.nombre_via)} ${k.numero ?? ""}`.trim() : k.beneficiario.replace(/^\w\d{7}\w?\s+/, "");
      entorno = {
        donde: `en ${i.municipio ? i.municipio.charAt(0) + i.municipio.slice(1).toLowerCase() : "su municipio"}`,
        filas: suyas.slice(0, 5).map((k) => ({
          quien: nombre(k),
          detalle: [k.catalogo?.programa ?? k.convocatoria, k.fecha_concesion?.slice(0, 4)].filter(Boolean).join(" · "),
          importe: k.importe,
        })),
        mas: Math.max(0, suyas.length - 5),
        total: suyas.reduce((t, k) => t + (k.importe ?? 0), 0),
      };
    }
  }

  // ---------------- lo que hemos comprobado (solo si alguien lo ha visto)
  const visto: { titulo: string; texto: string }[] = [];
  const firma = (quien: string | null, cuando: string | null) =>
    [quien && `visto por ${quien}`, cuando && `el ${cuando.slice(8, 10)}/${cuando.slice(5, 7)}/${cuando.slice(0, 4)}`].filter(Boolean).join(" ");
  if (asc.hay !== null) visto.push({ titulo: asc.hay ? "Tiene ascensor" : "Sin ascensor", texto: firma(asc.quien, asc.cuando) });
  if (asc.patios !== null) visto.push({ titulo: asc.patios ? `${asc.patios} patio${asc.patios > 1 ? "s" : ""}` : "Sin patios", texto: firma(asc.patiosQuien, asc.patiosCuando) });

  const fuentes = [
    "Dirección General del Catastro",
    iee ? "Registro de IEE de la Comunidad de Madrid" : null,
    esMadrid ? "Geoportal del Ayuntamiento de Madrid" : null,
    !esMadrid && entorno ? "Base de Datos Nacional de Subvenciones" : null,
  ].filter(Boolean).join(" · ");

  return {
    fecha: new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" }).format(new Date()),
    referencia: i.referencia,
    direccion: titular(i.direccionOficial),
    lugar: [i.municipio ? i.municipio.charAt(0) + i.municipio.slice(1).toLowerCase() : null, distrito].filter(Boolean).join(" · "),
    croquis: i.croquis,
    aerea: i.aerea,
    cifras,
    resumen,
    epoca: epoca.slice(0, 3),
    iee,
    condiciona: condiciona && condiciona.length ? condiciona : null,
    pedido: pedido.nombres.length ? pedido.nombres.join(" y ") : null,
    ayudas: pedidas.sort(orden).slice(0, 5).map(linea),
    ademasEficiencia: ademas.sort(orden).slice(0, 3).map(linea),
    estimacionNota: pem
      ? `Estimaciones con el coste de obra del informe de viabilidad (${eur(pem)})${viviendas ? ` y las ${viviendas} viviendas del edificio` : ""}. La cuantía final depende de la convocatoria abierta en cada momento.`
      : null,
    entorno,
    visto,
    fuentes,
  };
}
