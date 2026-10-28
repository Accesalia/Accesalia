import "server-only";
import { recalcularPorAccesosLuego } from "./estadoOportunidad";

// ============================================================================
// LA REVISION DE LOS ESCANEADOS (Monica, 2-oct-2026)
//
// El buzon ya no decide de quien es un escaneado: lo guarda y se acabo. Decidir
// es trabajo de Alex, y esta pantalla es donde lo hace. Sus palabras:
//
//   "alex es quien va a vincular el escaneado del polycam contra el acceso que le
//    toque, diciendo si es de nivel portal, nivel escalera, o lo que sea. Cuando
//    Alex revise su lista de 'polycam pendientes' le tiene que salir en pantalla
//    una lista de direcciones y el enlace a abrir para cada uno. Y al lado un
//    boton para un modal: en el modal deben salir los accesos posibles a los que
//    vincularlo, y Alex marcar o validar segun el caso."
//
// Y el ejemplo que dio, que es el que manda:
//
//   "nectar: le saldria 'nectar 31 madrid tiene dos escaleras sobre las que
//    estamos presupuestando; el escaneo es solo de una o abarca ambas?' y debajo:
//    escalera x (casilla), escalera Y (casilla), TODAS (casilla). Sin mas. El
//    cotejo propone los posibles, Alex decide cuales son."
//
// DOS COSAS QUE CAMBIAN RESPECTO AL COTEJO DEL BUZON:
//
// 1. PROPONE, NO ELIGE. El de `cotejar()` devolvia UNA comunidad o nada, y "nada"
//    significaba rechazar el correo. Aqui se devuelven TODOS los candidatos y no
//    se descarta ninguno por ser ambiguo: la ambiguedad la resuelve Alex mirando.
//
// 2. NO EXIGE EL MUNICIPIO. El de `cotejar()` lo descontaba del nombre de la
//    comunidad y Monica salto con razon -"no deberia descontar JAMAS el
//    municipio, que locura"-, porque eso hace que CAÑADA 8 MADRID y CAÑADA 8
//    ALCORCON tengan la misma clave. Pero aqui no hace daño, y lo dijo ella misma:
//    "si el cotejo propone y Alex decide, descontar el municipio solo ensancha la
//    lista de candidatos. Que salgan las dos Cañadas y Alex marque la suya es
//    mejor que que no salga ninguna". Asi que no se exige, pero el municipio SE
//    ENSEÑA en cada grupo y los que lo llevan en el asunto salen primero.
// ============================================================================

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const ALMACEN = "almacen-polycam-y-fotos";

/** PostgREST corta en 1.000 filas y no lo dice. Son 2.530 accesos, asi que se
 *  piden por tramos. El `order` no es adorno: sin un orden fijo, dos tramos
 *  pueden repetir y saltarse filas. */
async function leerTodo<T>(path: string, orden = "id"): Promise<T[]> {
  const todo: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const unir = path.includes("?") ? "&" : "?";
    const r = await fetch(`${URL_BASE}/rest/v1/${path}${unir}order=${orden}`, {
      headers: { ...cab, Range: `${desde}-${desde + 999}` },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
    const trozo = (await r.json()) as T[];
    todo.push(...trozo);
    if (trozo.length < 1000) return todo;
  }
}

// ------------------------------------------------------------------ palabras

/** Sin tildes, sin signos, en mayusculas. El mismo criterio que en el resto de la
 *  casa: no inventa equivalencias, solo quita adorno. */
function aplanar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

/** Las siglas de tipo de via y las particulas no cuentan: el comercial escribe
 *  "Nectar 31" y la base dice "CL NECTAR 31". */
const RUIDO = new Set([
  "DE", "DEL", "LA", "EL", "LOS", "LAS", "Y", "NUM", "NO",
  "CL", "CALLE", "AV", "AVDA", "AVENIDA", "PZ", "PLAZA", "PS", "PASEO",
  "CM", "CAMINO", "CR", "CTRA", "CARRETERA", "TR", "TRAVESIA", "RD", "RONDA",
  "GTA", "GLORIETA", "URB", "URBANIZACION", "PG", "POLIGONO", "BL", "BULEVAR",
  "ESC", "ESCALERA", "PORTAL", "BIS",
  // Las que pone el que escribe el asunto y no dicen nada de la direccion.
  "FWD", "FW", "RE", "RV", "RES", "ESCANEO", "ESCANEADO", "ESCANER", "POLYCAM", "3D",
]);

const palabras = (s: string) => aplanar(s).split(" ").filter((p) => p && !RUIDO.has(p));

/** El numero a pelo, sin su letra de duplicado: "31(C)" -> "31", "8(B)" -> "8".
 *  Hace falta porque el asunto dice "Nectar 31" y el acceso se llama "31(C)". */
const numeroBase = (s: string) => (aplanar(s).match(/^\d+/) ?? [""])[0];

// ------------------------------------------------------------------- tipos

export type AccesoCandidato = {
  id: string;
  /** Lo que lo distingue de sus hermanos: "31(C)", "1 esc D". */
  comoSeLlama: string;
  escalera: string;
};

export type GrupoCandidato = {
  clave: string;
  municipio: string;
  /** "CL NECTAR 31", para el titulo del grupo. */
  direccion: string;
  accesos: AccesoCandidato[];
  /** El asunto nombra su municipio. Esos salen primero. */
  municipioEnElAsunto: boolean;
  /** LA AGENDA COMO ANCLA (Monica, 14-oct-2026): habia una visita de escaneo
   *  agendada en este edificio por esas fechas. Va el primero, con su frase:
   *  "Visita agendada el 15/10 a las 10:00 · Brasilia 39, Madrid". */
  agenda?: string | null;
  /** Con agenda: si ademas el asunto encajaba con el. Sin agenda, siempre. */
  delAsunto?: boolean;
};

export type EscaneadoPendiente = {
  id: string;
  creadoEn: string;
  remitente: string | null;
  asunto: string | null;
  /** Lo que escribio el comercial en el correo (28-oct-2026). */
  mensaje: string | null;
  nombreOriginal: string | null;
  /** El enlace de Polycam, si llego por ahi. */
  rutaPolycam: string | null;
  /** El enlace firmado al fichero de nuestro almacen, si hay fichero. */
  enlaceFichero: string | null;
  candidatos: GrupoCandidato[];
  /** POR QUE NECESITA UN HUMANO: "hay dos opps abiertas en Andarrios 9", "no
   *  existe ninguna opp en Polvoranca 8"... */
  motivo: string;
};

type AccesoFila = {
  id: string;
  municipio: string;
  tipo_via: string;
  nombre_via: string;
  numero: string;
  escalera: string;
};

// --------------------------------------------------------------- el cotejo

/** Los accesos que PODRIAN ser, agrupados por edificio.
 *
 *  Un grupo es un edificio -municipio, calle y numero- y dentro van sus accesos,
 *  que es lo que Alex marca. En Nectar 31 sale UN grupo con tres casillas; en
 *  Marcenado 1, uno con seis. */
/** Un grupo es un EDIFICIO -municipio, calle y numero- y dentro van sus accesos,
 *  que es lo que Alex marca. En Nectar 31 sale un grupo con tres casillas; en
 *  Marcenado 1, uno con seis.
 *
 *  Agrupa una lista ya filtrada, la filtre el asunto del correo o la filtre lo
 *  que Alex escriba a mano. `hay` solo sirve para saber si el municipio estaba
 *  entre las palabras. */
function agrupa(accesos: AccesoFila[], hay: Set<string>): GrupoCandidato[] {
  const grupos = new Map<string, GrupoCandidato>();

  for (const a of accesos) {
    const num = numeroBase(a.numero);
    const clave = `${aplanar(a.municipio)}|${aplanar(a.nombre_via)}|${num}`;
    let g = grupos.get(clave);
    if (!g) {
      g = {
        clave,
        municipio: a.municipio,
        direccion: `${a.tipo_via} ${a.nombre_via} ${num}`.trim(),
        accesos: [],
        municipioEnElAsunto: palabras(a.municipio).every((p) => hay.has(p)),
      };
      grupos.set(clave, g);
    }
    g.accesos.push({
      id: a.id,
      comoSeLlama: `${a.numero}${a.escalera ? ` esc ${a.escalera}` : ""}`,
      escalera: a.escalera,
    });
  }

  for (const g of grupos.values()) {
    g.accesos.sort((x, y) => x.comoSeLlama.localeCompare(y.comoSeLlama, "es"));
  }

  // Los que llevan su municipio entre las palabras, primero: son los que Alex va
  // a marcar nueve de cada diez veces.
  return [...grupos.values()].sort((x, y) => {
    if (x.municipioEnElAsunto !== y.municipioEnElAsunto) return x.municipioEnElAsunto ? -1 : 1;
    return x.direccion.localeCompare(y.direccion, "es");
  });
}

/** Los municipios (de los que hay en la base) que nombra el asunto, enteros. */
function municipiosNombrados(hay: Set<string>, accesos: AccesoFila[]): Set<string> {
  const todos = new Set(accesos.map((a) => aplanar(a.municipio)));
  return new Set([...todos].filter((m) => {
    const p = palabras(m);
    return p.length > 0 && p.every((x) => hay.has(x));
  }));
}

/** Los accesos que PODRIAN ser, segun el asunto del correo. */
export function candidatos(asunto: string | null, accesos: AccesoFila[]): GrupoCandidato[] {
  const hay = new Set(palabras(asunto ?? ""));
  if (!hay.size) return [];
  // CALLE NO ES MUNICIPIO (Monica, 14-oct-2026): "Polvoranca 8 Leganes" no es la
  // calle Leganes 8 de Parla. Si el asunto nombra un municipio, solo valen los
  // edificios de ese municipio. Si no nombra ninguno, salen todos (Cañada 8
  // Madrid y Cañada 8 Alcorcon) y decide una persona.
  const nombrados = municipiosNombrados(hay, accesos);

  return agrupa(
    accesos.filter((a) => {
      if (nombrados.size && !nombrados.has(aplanar(a.municipio))) return false;
      const dela = palabras(a.nombre_via);
      const num = numeroBase(a.numero);
      // Hace falta calle Y numero. Sin numero no se propone nada: "Nectar" a
      // secas sacaria los tres portales de cada Nectar de la cartera.
      if (!dela.length || !num) return false;
      return dela.every((p) => hay.has(p)) && hay.has(num);
    }),
    hay,
  );
}

// ------------------------------------------------------- buscar a mano

/** EL TOPE. Si la busqueda saca mas edificios que esto, se devuelven los
 *  primeros y se le dice que afine. Una lista de 300 tarjetas con casillas no se
 *  revisa: se cierra. */
export const TOPE_BUSQUEDA = 25;

export type Busqueda = {
  grupos: GrupoCandidato[];
  /** Cuantos edificios encajaban de verdad, para poder decir "hay 112, afina". */
  total: number;
};

/** Buscarlo a mano. Monica, 2-oct-2026: "vincular a mano es necesario: por si
 *  acaso".
 *
 *  EL COTEJO VA AL REVES QUE EL DEL CORREO, y es a proposito. El del asunto exige
 *  que la calle y el numero del acceso esten en el asunto, porque el asunto trae
 *  una direccion entera y sobra texto. Aqui es Alex el que escribe, y lo que
 *  escribe es un trozo: cada palabra que teclea tiene que estar en el acceso, y
 *  nada mas. Asi "nectar" saca los Nectar, "nectar 31" los afina, y "nectar 31 d"
 *  llega a la escalera. No exige numero: si no lo exigiera el buscador no
 *  serviria para lo que ella quiere, que es llegar a una finca que el cotejo no
 *  propuso.
 *
 *  Y busca en el municipio tambien, que para eso lo escribe el. */
export function buscar(texto: string, accesos: AccesoFila[]): Busqueda {
  const dichas = palabras(texto);
  if (!dichas.length) return { grupos: [], total: 0 };

  const encajan = accesos.filter((a) => {
    // Sin quitar ruido: si teclea "D" para la escalera D, tiene que encontrarla.
    const suyas = aplanar(
      `${a.tipo_via} ${a.nombre_via} ${a.numero} ${a.escalera} ${a.municipio}`,
    ).split(" ");
    // POR COMIENZO DE PALABRA, no por palabra entera. Es la unica diferencia con
    // el cotejo del asunto y hay un motivo: el asunto viene escrito del todo, y
    // aqui Alex teclea a medias. Probado contra produccion: con palabra entera,
    // "marcen" devolvia CERO y "ñada" tambien, y un buscador que no encuentra
    // Marcenado escribiendo "marcen" no se usa dos veces.
    return dichas.every((p) => suyas.some((s) => s.startsWith(p)));
  });

  const grupos = agrupa(encajan, new Set(dichas));
  return { grupos: grupos.slice(0, TOPE_BUSQUEDA), total: grupos.length };
}

/** La busqueda, leyendo los accesos de produccion.
 *
 *  Se leen los 2.530 enteros en cada busqueda. Son seis columnas y pesa poco, y
 *  el filtro -conjunto de palabras- no se puede delegar en un `ilike` sin que
 *  deje de ser el mismo criterio que el resto de la casa. */
export async function buscarAMano(texto: string): Promise<Busqueda> {
  if (aplanar(texto).replace(/ /g, "").length < 2) return { grupos: [], total: 0 };
  const accesos = await leerTodo<AccesoFila>(
    "accesos?select=id,municipio,tipo_via,nombre_via,numero,escalera",
  );
  return buscar(texto, accesos);
}

// ------------------------------------------------------------- el fichero

/** Un enlace que caduca para abrir el fichero. El almacen es privado a proposito,
 *  asi que no hay URL publica: se firma una que vale una hora. Si falla no se
 *  tumba la pantalla, se devuelve null y la fila sale sin enlace. */
async function enlaceFirmado(ruta: string): Promise<string | null> {
  try {
    const r = await fetch(`${URL_BASE}/storage/v1/object/sign/${ALMACEN}/${ruta}`, {
      method: "POST",
      headers: { ...cab, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 3600 }),
      cache: "no-store",
    });
    if (!r.ok) return null;
    const { signedURL } = (await r.json()) as { signedURL?: string };
    return signedURL ? `${URL_BASE}/storage/v1${signedURL}` : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- la lista

/** Lo que Alex tiene que revisar: los escaneados que no estan vinculados a ningun
 *  acceso todavia.
 *
 *  PENDIENTE = SIN NINGUNA FILA EN LA RELACION. No hay campo de estado y es a
 *  proposito: un estado aparte se desincroniza del hecho. Si tiene accesos, esta
 *  revisado; si no, espera. */
export async function pendientesDeRevisar(): Promise<EscaneadoPendiente[]> {
  type Escaneado = {
    id: string;
    creado_en: string;
    remitente: string | null;
    asunto: string | null;
    nombre_original_fichero: string | null;
    ruta_polycam: string | null;
    polycam: string | null;
    fecha: string | null;
    fecha_escaneo: string | null;
    mensaje: string | null;
  };

  const [escaneados, vinculos, accesos, citas, oppsDe] = await Promise.all([
    leerTodo<Escaneado>(
      "escaneados_polycam?select=id,creado_en,remitente,asunto,nombre_original_fichero,ruta_polycam,polycam,fecha,fecha_escaneo,mensaje&descartado_en=is.null",
      "creado_en",
    ),
    leerTodo<{ polycam_id: string }>("relacion_polycam_acceso?select=polycam_id", "polycam_id"),
    leerTodo<AccesoFila>("accesos?select=id,municipio,tipo_via,nombre_via,numero,escalera"),
    citasDeEscaneo().catch(() => []),
    oppsAbiertasPorAcceso(),
  ]);

  const yaVinculados = new Set(vinculos.map((v) => v.polycam_id));
  // Los avisos de las cuentas de Google no son escaneos (Monica, 14-oct-2026).
  const pendientes = escaneados.filter((e) => !yaVinculados.has(e.id) && !esDeGoogle(e.remitente));

  return Promise.all(
    pendientes.map(async (e) => ({
      id: e.id,
      creadoEn: e.creado_en,
      remitente: e.remitente,
      asunto: e.asunto,
      mensaje: e.mensaje,
      nombreOriginal: e.nombre_original_fichero,
      rutaPolycam: e.ruta_polycam,
      enlaceFichero: e.polycam ? await enlaceFirmado(e.polycam) : null,
      ...(() => {
        const cands = conAgenda(candidatos(e.asunto, accesos), e, citas, new Set(palabras(e.asunto ?? "")));
        const d = decidirSolo(e.asunto, cands, oppsDe);
        // Sin motivo = se puede vincular sola (lo hara el buzon en su proxima pasada).
        return { candidatos: cands, motivo: "vincula" in d ? "" : d.motivo };
      })(),
    })),
  );
}

/** Los avisos de las cuentas de Google (seguridad, verificacion, privacidad)
 *  llegan al buzon y no son escaneos: no se guardan y no se enseñan. */
export const esDeGoogle = (remitente: string | null) => /@([a-z0-9-]+\.)*google\.com$/i.test((remitente ?? "").trim());

// ------------------------------------------------- vincular sola

type OppDeAcceso = { id: string; nombre: string };

/** Las opps ABIERTAS de cada acceso. */
async function oppsAbiertasPorAcceso(): Promise<Map<string, OppDeAcceso[]>> {
  const filas = await leerTodo<{ acceso_id: string; opp: { id: string; codigo: string | null; nombre: string | null; estado: string } | null }>(
    "relacion_oportunidad_accesos?select=acceso_id,opp:opp_id(id,codigo,nombre,estado)&hasta=is.null",
    "acceso_id,opp_id",
  );
  const m = new Map<string, OppDeAcceso[]>();
  for (const f of filas) {
    if (!f.opp || f.opp.estado !== "abierta") continue;
    m.set(f.acceso_id, [...(m.get(f.acceso_id) ?? []), { id: f.opp.id, nombre: f.opp.nombre ?? f.opp.codigo ?? "" }]);
  }
  return m;
}

/** ¿LA APP PUEDE VINCULARLO SOLA? (Monica, 14-oct-2026). Solo sin duda:
 *    - el asunto dice calle + numero + MUNICIPIO y encaja con UN edificio, o
 *      calle + numero que solo existe en uno;
 *  LA AGENDA NO VINCULA (Monica, 16-oct-2026, "elimina la regla de la
 *  agenda"): con una sola visita de escaneo ese dia, pego a Boltaña 59 tres
 *  escaneos cuyo asunto decia Badajoz 4, Mercurio 36 y Valladolid 13. La
 *  visita sigue saliendo como pista en la pantalla de revision, nada mas;
 *  y ese edificio tiene UNA opp abierta. Se vincula a los accesos de esa opp en
 *  ese edificio: las escaleras las dice la opp, no la app. Si no, a un humano,
 *  diciendo por que. */
function decidirSolo(
  asunto: string | null,
  grupos: GrupoCandidato[],
  oppsDe: Map<string, OppDeAcceso[]>,
): { accesos: string[]; motivo: string; vincula: true } | { motivo: string } {
  // Solo los que salen del ASUNTO. Un grupo que esta aqui solo por la agenda
  // (sin `delAsunto`) no cuenta para decidir.
  grupos = grupos.filter((g) => !g.agenda || g.delAsunto);
  const conMunicipio = grupos.filter((g) => g.municipioEnElAsunto);
  let g: GrupoCandidato | undefined;
  let por = "";
  if (!(asunto ?? "").trim()) {
    return { motivo: "El correo venía sin asunto." };
  } else if (!grupos.length) {
    return { motivo: "El asunto no encaja con ninguna dirección que tengamos: puede que no esté dada de alta." };
  } else if (!conMunicipio.length && grupos.length === 1) {
    // EL UNICO EN LA BASE (Monica, 14-oct-2026): el asunto no dice el municipio,
    // pero esa calle y ese numero solo existen en uno. "Cristo de la Victoria 129".
    g = grupos[0];
    por = `El asunto dice ${g.direccion} (solo existe en ${g.municipio})`;
  } else if (!conMunicipio.length) {
    return { motivo: `El asunto no dice el municipio y encaja con ${grupos.length} edificios.` };
  } else if (conMunicipio.length > 1) {
    return { motivo: `El asunto encaja con ${conMunicipio.length} edificios.` };
  } else {
    g = conMunicipio[0];
    por = `El asunto dice ${g.direccion} ${g.municipio}`;
  }
  const opps = new Map<string, OppDeAcceso>();
  for (const a of g.accesos) for (const o of oppsDe.get(a.id) ?? []) opps.set(o.id, o);
  if (!opps.size) return { motivo: `No hay ninguna opp abierta en ${g.direccion} ${g.municipio}: puede que no esté dada de alta.` };
  if (opps.size > 1) return { motivo: `Hay ${opps.size} opps abiertas en ${g.direccion}: ${[...opps.values()].map((o) => o.nombre).join(" · ")}.` };
  const [o] = [...opps.values()];
  const suyos = g.accesos.filter((a) => (oppsDe.get(a.id) ?? []).some((x) => x.id === o.id)).map((a) => a.id);
  return { vincula: true, accesos: suyos, motivo: `${por}, con una sola opp abierta: ${o.nombre}.` };
}

/** Repasa los escaneados sin vincular y vincula solos los que no tienen duda.
 *  Lo llama el buzon al acabar cada pasada. Devuelve cuantos vinculo. */
export async function vincularSolos(): Promise<number> {
  const lista = await pendientesDeRevisar();
  const oppsDe = await oppsAbiertasPorAcceso();
  let n = 0;
  for (const e of lista) {
    const d = decidirSolo(e.asunto, e.candidatos, oppsDe);
    if (!("vincula" in d)) continue;
    const r = await fetch(`${URL_BASE}/rest/v1/relacion_polycam_acceso?on_conflict=polycam_id,acceso_id`, {
      method: "POST",
      headers: { ...cab, "Content-Type": "application/json", Prefer: "return=minimal,resolution=ignore-duplicates" },
      body: JSON.stringify(d.accesos.map((acceso_id) => ({ polycam_id: e.id, acceso_id, automatico: true, motivo: d.motivo }))),
    });
    if (r.ok) {
      n++;
      recalcularPorAccesosLuego(d.accesos);
    }
  }
  return n;
}

/** "DESCARTAR" (Monica, 16-oct-2026): ese correo no es un escaneo de ningun
 *  edificio. No se borra: se apunta cuando y quien, y deja de salir. Solo si
 *  no esta vinculado, que lo vinculado ya tiene dueño. */
export async function descartar(polycamId: string, quien: string): Promise<void> {
  // VINCULADO TAMBIEN SE DESCARTA (Monica, 28-oct-2026: «cuando ya esta enlazada a
  // una oportunidad no hay boton para descartarla»). Se desvincula y se descarta
  // de una vez; desvincular ya se niega si su viabilidad esta empezada.
  const v = await fetch(`${URL_BASE}/rest/v1/relacion_polycam_acceso?select=polycam_id&polycam_id=eq.${polycamId}&limit=1`, { headers: cab, cache: "no-store" });
  if (v.ok && ((await v.json()) as unknown[]).length) await desvincular(polycamId);
  const r = await fetch(`${URL_BASE}/rest/v1/escaneados_polycam?id=eq.${polycamId}&viabilidad_id=is.null`, {
    method: "PATCH",
    headers: { ...cab, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ descartado_en: new Date().toISOString(), descartado_por: quien }),
  });
  if (!r.ok) throw new Error(`escaneados_polycam ${r.status}: ${await r.text()}`);
}

/** "CORREGIR DIRECCION": deshace lo que vinculo la app y lo devuelve a "necesito
 *  un humano". Solo si aun no se ha empezado su viabilidad. */
export async function desvincular(polycamId: string): Promise<void> {
  const r = await fetch(`${URL_BASE}/rest/v1/escaneados_polycam?select=viabilidad_id&id=eq.${polycamId}`, { headers: cab, cache: "no-store" });
  const [e] = (await r.json()) as { viabilidad_id: string | null }[];
  if (!e) throw new Error("No existe ese escaneado.");
  if (e.viabilidad_id) throw new Error("Su viabilidad ya está empezada: corrígelo desde la viabilidad.");
  const antes = await fetch(`${URL_BASE}/rest/v1/relacion_polycam_acceso?select=acceso_id&polycam_id=eq.${polycamId}`, { headers: cab, cache: "no-store" });
  const accesos = antes.ok ? ((await antes.json()) as { acceso_id: string }[]).map((a) => a.acceso_id) : [];
  const b = await fetch(`${URL_BASE}/rest/v1/relacion_polycam_acceso?polycam_id=eq.${polycamId}`, { method: "DELETE", headers: cab });
  if (!b.ok) throw new Error(`relacion_polycam_acceso ${b.status}: ${await b.text()}`);
  recalcularPorAccesosLuego(accesos);
}

// ------------------------------------------------- la agenda como ancla

type CitaEscaneo = { dia: string; hora: string; opp: string; correo: string | null; accesos: AccesoFila[] };
const DIA = 86_400_000;
const enMadrid = (iso: string, opciones: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", ...opciones }).format(new Date(iso));

/** Las visitas de escaneo agendadas (no anuladas), con los accesos de su opp y
 *  el correo de quien iba: el que suele mandar el Polycam. */
async function citasDeEscaneo(): Promise<CitaEscaneo[]> {
  type Fila = {
    inicio: string;
    de_quien: { email: string | null } | null;
    opp: { codigo: string | null; nombre: string | null; accesos: { hasta: string | null; acceso: AccesoFila | null }[] } | null;
  };
  const filas = await leerTodo<Fila>(
    "citas?select=inicio,de_quien:de_quien(email),opp:oportunidad_id(codigo,nombre," +
      "accesos:relacion_oportunidad_accesos(hasta,acceso:acceso_id(id,municipio,tipo_via,nombre_via,numero,escalera)))" +
      "&tipo=eq.escaneo_polycam&estado=neq.anulada",
    "inicio",
  );
  return filas
    .filter((f) => f.opp)
    .map((f) => ({
      dia: enMadrid(f.inicio, { year: "numeric", month: "2-digit", day: "2-digit" }),
      hora: enMadrid(f.inicio, { hour: "2-digit", minute: "2-digit", hour12: false }),
      opp: f.opp!.nombre ?? f.opp!.codigo ?? "",
      correo: f.de_quien?.email?.toLowerCase() ?? null,
      accesos: f.opp!.accesos.filter((a) => !a.hasta && a.acceso).map((a) => a.acceso!),
    }));
}

/** Los edificios con una visita de escaneo agendada cerca de cuando se hizo el
 *  escaneo (la fecha del fichero, si la trae; si no, la semana antes de que
 *  llegara el correo) van PRIMERO, con su frase. Primero los de quien mando el
 *  correo, y entre ellos la visita mas cercana. Alex sigue decidiendo. */
function conAgenda(
  grupos: GrupoCandidato[],
  e: { fecha: string | null; fecha_escaneo: string | null; creado_en: string; remitente: string | null },
  citas: CitaEscaneo[],
  hay: Set<string>,
): GrupoCandidato[] {
  if (!citas.length) return grupos;
  const llegada = Date.parse(enMadrid(e.fecha ?? e.creado_en, { year: "numeric", month: "2-digit", day: "2-digit" }) + "T12:00:00Z");
  const escaneo = e.fecha_escaneo ? Date.parse(e.fecha_escaneo + "T12:00:00Z") : null;
  const remitente = (e.remitente ?? "").toLowerCase();
  const cerca = citas
    .map((c) => ({ c, t: Date.parse(c.dia + "T12:00:00Z") }))
    .filter(({ t }) => (escaneo != null ? Math.abs(t - escaneo) <= DIA : t <= llegada + DIA && t >= llegada - 7 * DIA))
    .map(({ c, t }) => ({ c, distancia: Math.abs(t - (escaneo ?? llegada)), suyo: !!c.correo && remitente.includes(c.correo) }))
    .sort((a, b) => Number(b.suyo) - Number(a.suyo) || a.distancia - b.distancia);
  if (!cerca.length) return grupos;

  const fuera = new Map(grupos.map((g) => [g.clave, g]));
  const primero: GrupoCandidato[] = [];
  for (const { c } of cerca) {
    const [d, m] = [c.dia.slice(8, 10), c.dia.slice(5, 7)];
    const frase = `Visita agendada el ${d}/${m} a las ${c.hora} · ${c.opp}`;
    for (const g of agrupa(c.accesos, hay)) {
      if (primero.some((x) => x.clave === g.clave)) continue;
      const ya = fuera.get(g.clave);
      fuera.delete(g.clave);
      primero.push({ ...(ya ?? g), agenda: frase, delAsunto: !!ya });
    }
  }
  return [...primero, ...grupos.filter((g) => fuera.has(g.clave))];
}

/** Solo CUANTOS hay esperando, para el boton del cuadro de entrada.
 *
 *  Aparte de `pendientesDeRevisar()` a proposito: esa lee los 2.530 accesos y
 *  firma una URL por fichero, y eso no se puede pagar en el menu, que lo abre
 *  todo el mundo cada vez que entra. Aqui solo se cuentan dos columnas.
 *
 *  Si falla, devuelve 0 y el boton sale sin numero: el menu no se cae porque el
 *  buzon tenga un mal dia. */
export async function cuantosPendientes(): Promise<number> {
  try {
    const [escaneados, vinculos] = await Promise.all([
      leerTodo<{ id: string; remitente: string | null }>("escaneados_polycam?select=id,remitente&descartado_en=is.null"),
      leerTodo<{ polycam_id: string }>("relacion_polycam_acceso?select=polycam_id", "polycam_id"),
    ]);
    const yaVinculados = new Set(vinculos.map((v) => v.polycam_id));
    return escaneados.filter((e) => !yaVinculados.has(e.id) && !esDeGoogle(e.remitente)).length;
  } catch {
    return 0;
  }
}

// --------------------------------------------------------------- vincular

/** Lo que decide Alex: este escaneado es de estos accesos. Una fila por acceso
 *  marcado, con quien lo dijo.
 *
 *  "TODAS" no se guarda como valor: es lo que el pulsa, y lo que llega aqui son
 *  los tres ids. */
export async function vincular(
  polycamId: string,
  accesoIds: string[],
  quienId: string,
): Promise<number> {
  if (!accesoIds.length) return 0;
  const filas = accesoIds.map((acceso_id) => ({
    polycam_id: polycamId,
    acceso_id,
    vinculado_por: quienId,
  }));
  const r = await fetch(
    `${URL_BASE}/rest/v1/relacion_polycam_acceso?on_conflict=polycam_id,acceso_id`,
    {
      method: "POST",
      headers: {
        ...cab,
        "Content-Type": "application/json",
        Prefer: "return=representation,resolution=ignore-duplicates",
      },
      body: JSON.stringify(filas),
    },
  );
  if (!r.ok) throw new Error(`relacion_polycam_acceso ${r.status}: ${await r.text()}`);
  recalcularPorAccesosLuego(accesoIds);
  return ((await r.json()) as unknown[]).length;
}
