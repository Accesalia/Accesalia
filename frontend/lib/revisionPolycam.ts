import "server-only";

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
};

export type EscaneadoPendiente = {
  id: string;
  creadoEn: string;
  remitente: string | null;
  asunto: string | null;
  nombreOriginal: string | null;
  /** El enlace de Polycam, si llego por ahi. */
  rutaPolycam: string | null;
  /** El enlace firmado al fichero de nuestro almacen, si hay fichero. */
  enlaceFichero: string | null;
  candidatos: GrupoCandidato[];
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

/** Los accesos que PODRIAN ser, segun el asunto del correo. */
export function candidatos(asunto: string | null, accesos: AccesoFila[]): GrupoCandidato[] {
  const hay = new Set(palabras(asunto ?? ""));
  if (!hay.size) return [];

  return agrupa(
    accesos.filter((a) => {
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
  };

  const [escaneados, vinculos, accesos] = await Promise.all([
    leerTodo<Escaneado>(
      "escaneados_polycam?select=id,creado_en,remitente,asunto,nombre_original_fichero,ruta_polycam,polycam",
      "creado_en",
    ),
    leerTodo<{ polycam_id: string }>("relacion_polycam_acceso?select=polycam_id", "polycam_id"),
    leerTodo<AccesoFila>("accesos?select=id,municipio,tipo_via,nombre_via,numero,escalera"),
  ]);

  const yaVinculados = new Set(vinculos.map((v) => v.polycam_id));
  const pendientes = escaneados.filter((e) => !yaVinculados.has(e.id));

  return Promise.all(
    pendientes.map(async (e) => ({
      id: e.id,
      creadoEn: e.creado_en,
      remitente: e.remitente,
      asunto: e.asunto,
      nombreOriginal: e.nombre_original_fichero,
      rutaPolycam: e.ruta_polycam,
      enlaceFichero: e.polycam ? await enlaceFirmado(e.polycam) : null,
      candidatos: candidatos(e.asunto, accesos),
    })),
  );
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
      leerTodo<{ id: string }>("escaneados_polycam?select=id"),
      leerTodo<{ polycam_id: string }>("relacion_polycam_acceso?select=polycam_id", "polycam_id"),
    ]);
    const yaVinculados = new Set(vinculos.map((v) => v.polycam_id));
    return escaneados.filter((e) => !yaVinculados.has(e.id)).length;
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
  return ((await r.json()) as unknown[]).length;
}
