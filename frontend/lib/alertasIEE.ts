import "server-only";

// ============================================================================
// EL RADAR: LO QUE SE VE Y LO QUE SE MIDE (Monica, 29-sep-2026)
//
// Lo pidio asi, y la sencillez es el encargo, no un atajo:
//
//   "Sin mas complejidad: una lista diaria de direcciones desfavorables o de NO
//    hay nada. Con link al dato de la IEE que nos hemos descargado para verlo.
//    En esa ficha de IEE vienen los datos, pero no hace falta HOY hacer nada
//    con ellos salvo verlos. Es algo que primero debemos tener y luego evaluar."
//
// Y DEBAJO, LO QUE DE VERDAD LE IMPORTA:
//
//   "Regalarle un cliente y que lo ignore es algo que quiero saber."
//
// De ahi la segunda mitad: una lista de asignadas con comercial, fecha y si
// salio oportunidad, y los agregados POR MES -"asi tienen tiempo de ir a verlos
// y no hay excusa"-. El mes no es un capricho de presentacion: es el plazo justo
// para que el numero sea justo.
// ============================================================================

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function leer<T>(consulta: string): Promise<T[]> {
  const r = await fetch(`${URL_BASE}/rest/v1/${consulta}`, { headers: cab, cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  return (await r.json()) as T[];
}

export type AlertaIEE = {
  codigo: string;
  referencia: string | null;
  referenciaParcela: string | null;
  direccion: string | null;
  municipio: string | null;
  cp: string | null;
  anioConstruccion: number | null;
  fechaEmision: string | null;
  valoracion: string | null;
  deficienciasSubsanadas: string | null;
  calificacionEnergetica: string | null;
  accesibilidadSatisface: boolean | null;
  accesibilidadAjustes: boolean | null;
  estadoExpediente: string | null;
  validez: string | null;
  bruto: Record<string, string> | null;
  vistoEn: string;
  estado: string;
  asignadaA: string | null;
  asignadaEn: string | null;
  asignadaEmailEn: string | null;
  asignadaEmailFallo: string | null;
  oportunidadId: string | null;
  comercial: string | null;
  nuestra: Nuestra;
};

/** Si esto ya lo tocamos nosotros, y de que manera. Son dos cosas distintas y
 *  NO hay que confundirlas:
 *
 *   - `misma_finca`: la referencia catastral coincide. Es nuestra. No es un
 *     cliente nuevo: o ya es cliente o el IEE lo escribimos nosotros.
 *   - `misma_calle`: es otro portal de una calle donde ya trabajamos. Eso NO se
 *     descarta, es lo contrario: el comercial puede llamar y decir "hemos hecho
 *     el 19 de su misma calle". Es el mejor argumento que hay.
 */
export type Nuestra =
  | { tipo: "misma_finca"; comunidad: string }
  | { tipo: "misma_calle"; comunidad: string }
  | null;

type Fila = {
  codigo: string;
  referencia: string | null;
  referencia_parcela: string | null;
  direccion: string | null;
  municipio: string | null;
  cp: string | null;
  anio_construccion: number | null;
  fecha_emision: string | null;
  valoracion: string | null;
  deficiencias_subsanadas: string | null;
  calificacion_energetica: string | null;
  accesibilidad_satisface: boolean | null;
  accesibilidad_ajustes: boolean | null;
  estado_expediente: string | null;
  validez: string | null;
  bruto: Record<string, string> | null;
  visto_en: string;
  estado: string;
  asignada_a: string | null;
  asignada_en: string | null;
  asignada_email_en: string | null;
  asignada_email_fallo: string | null;
  oportunidad_id: string | null;
  comerciales: { nombre: string } | null;
};

const CAMPOS =
  "codigo,referencia,referencia_parcela,direccion,municipio,cp,anio_construccion,fecha_emision," +
  "valoracion,deficiencias_subsanadas,calificacion_energetica,accesibilidad_satisface," +
  "accesibilidad_ajustes,estado_expediente,validez,bruto,visto_en,estado,asignada_a,asignada_en," +
  "asignada_email_en,asignada_email_fallo,oportunidad_id,comerciales(nombre)";

const vestir = (f: Fila): AlertaIEE => ({
  codigo: f.codigo,
  referencia: f.referencia,
  referenciaParcela: f.referencia_parcela,
  direccion: f.direccion,
  municipio: f.municipio,
  cp: f.cp,
  anioConstruccion: f.anio_construccion,
  fechaEmision: f.fecha_emision,
  valoracion: f.valoracion,
  deficienciasSubsanadas: f.deficiencias_subsanadas,
  calificacionEnergetica: f.calificacion_energetica,
  accesibilidadSatisface: f.accesibilidad_satisface,
  accesibilidadAjustes: f.accesibilidad_ajustes,
  estadoExpediente: f.estado_expediente,
  validez: f.validez,
  bruto: f.bruto,
  vistoEn: f.visto_en,
  estado: f.estado,
  asignadaA: f.asignada_a,
  asignadaEn: f.asignada_en,
  asignadaEmailEn: f.asignada_email_en,
  asignadaEmailFallo: f.asignada_email_fallo,
  oportunidadId: f.oportunidad_id,
  comercial: f.comerciales?.nombre ?? null,
  nuestra: null,
});

// ---------------------------------------------------------- ¿YA ES NUESTRA?
//
//   "Necesitamos descartar las que YA tengamos nosotros en nuestra bd.
//    Accesalia es grande, movemos mucho, gran parte de esas IEE van a ser
//    nuestras" (Monica).
//
// Tiene razon en el fondo y el cotejo hace falta, pero al probarlo con las
// nueve primeras salio algo que cambia el diseño: NINGUNA era nuestra, y lo que
// coincidia era la CALLE, no el edificio. Y eso no es un duplicado, es lo
// contrario: "CL RIOJA 81" tiene IEE desfavorable y nosotros hicimos "RIOJA 19"
// de esa misma calle. El comercial llama y dice que ya ha trabajado en el 19.
//
// Por eso hay dos respuestas y no una, y por eso aqui NO SE ESCONDE NADA: se
// marca. Un lead que desaparece de la lista no se puede repescar; uno marcado, si.
// La pantalla (9-oct-2026) aparta las de la misma finca por defecto, pero detras
// de un "mostrar las nuestras": se ven a un clic, no se pierden.
//
// EL COTEJO BUENO ES LA REFERENCIA CATASTRAL, que la nota informativa nos da.
// Hoy la tienen 518 de las 1.228 comunidades, asi que para el resto hay que
// caer en calle + numero, que es mas flojo: "SAN PABLO" caso con "San Pablo II
// Avila", que no tiene nada que ver. De ahi que la calle exija ademas que
// coincida el municipio, y aun asi se marque como pista y no como certeza.

type ComunidadNuestra = { nombre: string; referencia_catastral: string | null };

const sinTildes = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

/** De "CL RIO JARAMA, 1" saca ["RIO JARAMA", "1"]. Los tipos de via sobran para
 *  cotejar: la lista de Monica no los lleva. */
function calleYNumero(direccion: string | null): { calle: string; numero: string } {
  const limpia = sinTildes(direccion ?? "")
    .replace(/^(CL|CALLE|AV|AVENIDA|PZ|PLAZA|PO|PASEO|CR|CTRA|CM|CAMINO|TR|RD|UR)\s+/, "")
    .trim();
  const [calle, resto] = limpia.split(",");
  return { calle: (calle ?? "").trim(), numero: (resto ?? "").trim().split(/\s/)[0] ?? "" };
}

/** PostgREST corta en 1.000 filas y no lo dice: hay que pedir por tramos, con
 *  un orden fijo. Hasta el 9-oct-2026 esto leia de una vez, y con 2.002
 *  comunidades la mitad no se cotejaba nunca. */
async function porTramos<T>(consulta: string): Promise<T[]> {
  const todo: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${consulta}`, {
      headers: { ...cab, Range: `${desde}-${desde + 999}` },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
    const trozo = (await r.json()) as T[];
    todo.push(...trozo);
    if (trozo.length < 1000) return todo;
  }
}

type LoNuestro = {
  comunidades: ComunidadNuestra[];
  /** Referencia de parcela (14) -> como se llama. De la comunidad y de cada
   *  uno de sus portales: una comunidad de varias parcelas solo guarda una en
   *  su ficha, y la IEE puede ser de otra (9-oct-2026). */
  fincas: Map<string, string>;
};

/** LA FINCA ES DEL EDIFICIO, NO DE LA COMUNIDAD (Monica, 9-oct-2026): la
 *  referencia catastral se coteja contra los PORTALES (accesos), que es donde
 *  vive. La de `comunidades` es un duplicado que se va a retirar, y las 1.965
 *  que tiene estan tambien en sus portales. Del portal se saca el nombre que se
 *  ensena: su comunidad si la tiene puesta; si no, la de su opp; y si tampoco,
 *  la direccion del portal. */
async function loNuestro(): Promise<LoNuestro> {
  const fincas = new Map<string, string>();
  try {
    const [comunidades, accesos] = await Promise.all([
      porTramos<ComunidadNuestra & { id: string }>("comunidades?select=id,nombre&order=id"),
      porTramos<{
        ref_catastral: string | null;
        tipo_via: string | null;
        nombre_via: string | null;
        numero: string | null;
        municipio: string | null;
        figura_legal_propietaria_id: string | null;
        opps: { hasta: string | null; opp: { comunidad_id: string | null } | null }[];
      }>(
        "accesos?select=ref_catastral,tipo_via,nombre_via,numero,municipio,figura_legal_propietaria_id," +
          "opps:relacion_oportunidad_accesos(hasta,opp:opp_id(comunidad_id))&ref_catastral=not.is.null&order=id",
      ),
    ]);
    const nombre = new Map(comunidades.map((c) => [c.id, c.nombre]));
    for (const a of accesos) {
      const ref = (a.ref_catastral ?? "").replace(/\s/g, "").slice(0, 14).toUpperCase();
      if (!ref) continue;
      const deSuOpp = a.opps.find((o) => o.hasta === null && o.opp?.comunidad_id)?.opp?.comunidad_id ?? null;
      const comunidad =
        (a.figura_legal_propietaria_id && nombre.get(a.figura_legal_propietaria_id)) || (deSuOpp && nombre.get(deSuOpp));
      // Si ya hay nombre de comunidad para esa finca, no se pisa con una direccion.
      if (comunidad) fincas.set(ref, comunidad);
      else if (!fincas.has(ref)) fincas.set(ref, [a.tipo_via, a.nombre_via, a.numero, a.municipio].filter(Boolean).join(" "));
    }
    return { comunidades, fincas };
  } catch {
    return { comunidades: [], fincas };
  }
}

function cotejar(a: AlertaIEE, { comunidades: nuestras, fincas }: LoNuestro): Nuestra {
  // 1. La referencia catastral. Si coincide, no hay duda posible.
  if (a.referenciaParcela) {
    const igual = fincas.get(a.referenciaParcela.toUpperCase());
    if (igual) return { tipo: "misma_finca", comunidad: igual };
  }

  const { calle, numero } = calleYNumero(a.direccion);
  if (!calle || calle.length < 5) return null;
  const muni = sinTildes(a.municipio ?? "").replace(/\(.*\)/, "").trim();

  for (const c of nuestras) {
    const suyo = sinTildes(c.nombre);
    if (!suyo.includes(calle)) continue;
    // El municipio tiene que aparecer tambien: sin esto, "SAN PABLO" de Leganes
    // casaba con "SAN PABLO II AVILA".
    if (muni && !suyo.includes(muni)) continue;
    // Mismo numero y misma calle sin referencia catastral: es la misma finca,
    // solo que no teniamos la referencia guardada.
    // Sin construir expresiones: se parte en palabras y se mira si el
    // numero esta. Asi "RIOJA 19" no casa con "RIOJA 190".
    if (numero && suyo.split(/[^A-Z0-9]+/).includes(numero))
      return { tipo: "misma_finca", comunidad: c.nombre };
    return { tipo: "misma_calle", comunidad: c.nombre };
  }
  return null;
}

/** LAS DE FUERA SIN ASIGNAR, para el aviso diario del radar (Monica,
 *  9-oct-2026). Contaba TODAS las "nuevas", tambien las nuestras -que nunca hay
 *  que repartir-, y el correo decia "336 sin asignar". Cuenta lo mismo que
 *  aparta la pantalla: fuera las de la misma finca; las de la misma calle, dentro. */
export async function deFueraSinAsignar(): Promise<number> {
  const [filas, nuestras] = await Promise.all([
    porTramos<Fila>(`iee_registrado?select=${CAMPOS}&estado=eq.nueva&order=codigo`),
    loNuestro(),
  ]);
  return filas.map(vestir).filter((a) => cotejar(a, nuestras)?.tipo !== "misma_finca").length;
}

/** El dia en Madrid, en formato ISO. La fecha del barrido tiene que ser la del
 *  reloj de la oficina, no la del servidor, que esta en otro sitio. */
export const diaEnMadrid = (d: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(d);

export type DiaDeRadar = { dia: string; alertas: AlertaIEE[] };

// ---------------------------------------------------------------- el orden

/** EL ORDEN DE CALIDAD DE UN LEAD (Monica, 1-oct-2026). No es el que parecia, y
 *  son DOS preguntas en este orden:
 *
 *  1. Manda la VALORACION, y la FAVORABLE va PRIMERO. "Casi ninguna comunidad
 *     presenta una IEE desfavorable si no tiene ya resuelto como hacerla, porque
 *     saben que les obligaran": la desfavorable llega con arquitecto puesto. La
 *     favorable que no cumple accesibilidad es territorio virgen, y nadie la
 *     esta mirando porque no sale en ninguna lista de desfavorables.
 *
 *  2. Dentro de eso, los AJUSTES RAZONABLES. "Ajustes razonables" en una IEE
 *     significa que la obra NO sube la cuota mas de 3 veces la ordinaria; por
 *     encima se considera esfuerzo economico excesivo y la comunidad no esta
 *     obligada. Asi que un "NO" quiere decir QUE NO PUEDEN PAGARLA SOLOS, y eso
 *     es exactamente lo que vende Accesalia: la subvencion. El NO va DELANTE.
 *
 *  Y "Exento" no es un lead ni un dato incompleto: no hay obligacion de
 *  accesibilidad, y por eso la nota trae esos campos en blanco y la validez con
 *  asterisco.
 *
 *  La regla vive AQUI y en un solo sitio, no partida entre una consulta y una
 *  funcion: antes el filtro estaba metido en la URL (`valoracion=ilike.
 *  Desfavorable*`) y por eso la pantalla no podia ver una favorable ni queriendo. */
export type Grado = 1 | 2 | 3 | 4 | 5;

const esDesfavorable = (a: AlertaIEE) =>
  (a.valoracion ?? "").toLowerCase().startsWith("desfavorable");

/** null = no es un lead. */
export function grado(a: AlertaIEE): Grado | null {
  if ((a.estadoExpediente ?? "").toLowerCase() === "exento") return null;
  const malo = esDesfavorable(a);
  if (a.accesibilidadSatisface === false) {
    const necesitaSubvencion = a.accesibilidadAjustes === false;
    if (!malo) return necesitaSubvencion ? 1 : 2;
    return necesitaSubvencion ? 3 : 4;
  }
  // Cumple accesibilidad: solo interesa si esta desfavorable, y es lo ultimo,
  // porque entonces el problema es de conservacion o estructura.
  return malo ? 5 : null;
}

export const porQue: Record<Grado, string> = {
  1: "No cumple accesibilidad · no pueden pagarla solos",
  2: "No cumple accesibilidad · pueden pagarla",
  3: "Desfavorable · no pueden pagarla solos",
  4: "Desfavorable · pueden pagarla",
  5: "Desfavorable por conservación",
};

/** Las desfavorables de los ultimos `dias` dias, AGRUPADAS POR DIA Y SIN SALTAR
 *  NINGUNO: los dias vacios tambien salen, porque "si no ha habido, que lo diga
 *  tambien". Un dia que falta no se distingue de un dia que nadie miro. */
export async function radarPorDias(dias = 14): Promise<DiaDeRadar[]> {
  const desde = new Date(Date.now() - dias * 864e5);
  // Se piden TODAS las del periodo y se criba aqui con `grado`. Son unas seis a
  // la semana en toda la Comunidad, asi que el volumen no es problema, y la regla
  // queda en un solo sitio en vez de repartida entre la URL y el codigo.
  const filas = await leer<Fila>(
    `iee_registrado?select=${CAMPOS}&visto_en=gte.${desde.toISOString()}&order=visto_en.desc`,
  );

  // Las comunidades se traen UNA vez y se cotejan en memoria: son mil y pico
  // filas de dos campos, y hacerlo por alerta serian mil consultas.
  const nuestras = await loNuestro();

  const porDia = new Map<string, AlertaIEE[]>();
  for (const f of filas) {
    const a = vestir(f);
    if (grado(a) === null) continue;
    const d = diaEnMadrid(new Date(f.visto_en));
    if (!porDia.has(d)) porDia.set(d, []);
    porDia.get(d)!.push({ ...a, nuestra: cotejar(a, nuestras) });
  }

  const lista: DiaDeRadar[] = [];
  for (let i = 0; i < dias; i++) {
    const d = diaEnMadrid(new Date(Date.now() - i * 864e5));
    // Lo mejor arriba: dentro de cada dia manda el grado, no la hora.
    const alertas = (porDia.get(d) ?? []).sort((x, y) => grado(x)! - grado(y)!);
    lista.push({ dia: d, alertas });
  }
  return lista;
}

/** Una sola, para su ficha. */
export async function alertaIEE(codigo: string): Promise<AlertaIEE | null> {
  const filas = await leer<Fila>(
    `iee_registrado?select=${CAMPOS}&codigo=eq.${encodeURIComponent(codigo)}&limit=1`,
  );
  if (!filas[0]) return null;
  const a = vestir(filas[0]);
  return { ...a, nuestra: cotejar(a, await loNuestro()) };
}

export type ComercialAlQueAsignar = { id: string; nombre: string; correo: string | null };

/** A quien se puede asignar. Se trae el correo porque SI NO LO HAY NO SE LE
 *  PUEDE ESCRIBIR, y eso hay que decirlo antes de asignar, no despues. */
export async function comercialesActivos(): Promise<ComercialAlQueAsignar[]> {
  const filas = await leer<{ id: string; nombre: string; equipo: { email: string | null } | null }>(
    "comerciales?select=id,nombre,equipo:equipo!comerciales_equipo_id_fkey(email)&activo=is.true&order=nombre",
  );
  return filas.map((f) => ({ id: f.id, nombre: f.nombre, correo: f.equipo?.email ?? null }));
}

export type Repartida = AlertaIEE & { diasDesdeAsignacion: number };

/** Lo repartido. `comercial` filtra por uno; sin el, todos. */
export async function repartidas(comercialId?: string): Promise<Repartida[]> {
  const filtro = comercialId ? `&asignada_a=eq.${comercialId}` : "";
  const filas = await leer<Fila>(
    `iee_registrado?select=${CAMPOS}&asignada_a=not.is.null${filtro}&order=asignada_en.desc`,
  );
  return filas.map((f) => {
    const a = vestir(f);
    const dias = a.asignadaEn
      ? Math.floor((Date.now() - new Date(a.asignadaEn).getTime()) / 864e5)
      : 0;
    return { ...a, diasDesdeAsignacion: dias };
  });
}

export type MesDeComercial = {
  mes: string;
  comercialId: string;
  comercial: string;
  pasadas: number;
  creadas: number;
};

/** "Pasadas 16, creadas 11", por comercial y POR MES. Se cuenta por el mes en
 *  que se le PASO, no por el mes en que abrio la oportunidad: lo que se mide es
 *  que hizo con lo que se le dio. */
export async function agregadoPorMes(): Promise<MesDeComercial[]> {
  const filas = await leer<Fila>(
    `iee_registrado?select=asignada_en,asignada_a,oportunidad_id,comerciales(nombre)` +
      `&asignada_a=not.is.null&order=asignada_en.desc`,
  );

  const cuenta = new Map<string, MesDeComercial>();
  for (const f of filas) {
    if (!f.asignada_en || !f.asignada_a) continue;
    const mes = diaEnMadrid(new Date(f.asignada_en)).slice(0, 7);
    const clave = `${mes}|${f.asignada_a}`;
    if (!cuenta.has(clave))
      cuenta.set(clave, {
        mes,
        comercialId: f.asignada_a,
        comercial: f.comerciales?.nombre ?? "—",
        pasadas: 0,
        creadas: 0,
      });
    const c = cuenta.get(clave)!;
    c.pasadas += 1;
    if (f.oportunidad_id) c.creadas += 1;
  }

  return Array.from(cuenta.values()).sort(
    (a, b) => b.mes.localeCompare(a.mes) || a.comercial.localeCompare(b.comercial),
  );
}

/** El plazo vive en `parametros_alerta`, no en el codigo: es una decision de
 *  negocio y se cambia sin desplegar. 10 dias es lo que dijo ella. */
export async function diasParaAbrirOportunidad(): Promise<number> {
  try {
    const filas = await leer<{ valor: number }>(
      "parametros_alerta?select=valor&clave=eq.iee_dias_para_opp&limit=1",
    );
    return Number(filas[0]?.valor) || 10;
  } catch {
    return 10;
  }
}

// ============================================================================
// LA VIGILANCIA
//
//   "Debe crearse una alerta de vigilancia: ¿se ha creado en menos de 10 días
//    una opp con esa dirección? Si es que no, preguntar al comercial qué ha
//    pasado. Regalarle un cliente y que lo ignore es algo que quiero saber."
//
// Dos pasos, y el primero es el que hace que el segundo sea justo:
//
//   1. ENGANCHAR SOLO. Si ya existe una oportunidad con esa referencia
//      catastral, se ata a la alerta sin que nadie tenga que marcar nada. El
//      comercial no deberia tener que decirnos que hizo su trabajo: se ve.
//   2. PREGUNTAR UNA VEZ. Pasado el plazo y sin oportunidad, se pregunta. UNA
//      vez -por eso `vigilancia_avisada_en`-: repetirlo cada dia seria acoso,
//      no seguimiento.
// ============================================================================

const cabJson = { ...cab, "Content-Type": "application/json" };

export type ResultadoVigilancia = { enganchadas: number; preguntadas: number; plazo: number };

export async function vigilarAlertasIEE(): Promise<ResultadoVigilancia> {
  const plazo = await diasParaAbrirOportunidad();
  let enganchadas = 0;
  let preguntadas = 0;

  const abiertas = await leer<{
    codigo: string;
    referencia_parcela: string | null;
    asignada_en: string | null;
    asignada_a: string | null;
    vigilancia_avisada_en: string | null;
    comerciales: { nombre: string; equipo_id: string | null } | null;
    direccion: string | null;
  }>(
    "iee_registrado?select=codigo,referencia_parcela,asignada_en,asignada_a,vigilancia_avisada_en," +
      "direccion,comerciales(nombre,equipo_id)&asignada_a=not.is.null&oportunidad_id=is.null",
  );

  for (const a of abiertas) {
    // ---- 1. ¿hay ya oportunidad para esa finca? ----
    if (a.referencia_parcela) {
      const opps = await leer<{ id: string }>(
        `oportunidades?select=id&referencia_catastral=eq.${encodeURIComponent(a.referencia_parcela)}&limit=1`,
      );
      if (opps[0]) {
        await fetch(`${URL_BASE}/rest/v1/iee_registrado?codigo=eq.${encodeURIComponent(a.codigo)}`, {
          method: "PATCH",
          headers: { ...cabJson, Prefer: "return=minimal" },
          body: JSON.stringify({ oportunidad_id: opps[0].id, estado: "oportunidad" }),
        });
        enganchadas += 1;
        continue;
      }
    }

    // ---- 2. ¿se ha pasado el plazo y nadie ha hecho nada? ----
    if (!a.asignada_en || a.vigilancia_avisada_en) continue;
    const dias = Math.floor((Date.now() - new Date(a.asignada_en).getTime()) / 864e5);
    if (dias < plazo) continue;

    // Se pregunta al comercial y se le dice a quien reparte, que es quien queria
    // saberlo. Si el comercial no tiene persona de equipo detras, al menos se
    // entera quien reparte.
    const para: string[] = [];
    if (a.comerciales?.equipo_id) para.push(a.comerciales.equipo_id);
    for (const id of await aQuienReparte()) if (!para.includes(id)) para.push(id);
    if (!para.length) continue;

    const donde = a.direccion ?? "una dirección";
    await fetch(`${URL_BASE}/rest/v1/avisos`, {
      method: "POST",
      headers: { ...cabJson, Prefer: "return=minimal" },
      body: JSON.stringify(
        para.map((id) => ({
          para_id: id,
          motivo: "alerta_iee_sin_opp",
          texto:
            `Hace ${dias} días se le pasó a ${a.comerciales?.nombre ?? "un comercial"} la IEE desfavorable de ` +
            `${donde} y todavía no hay oportunidad abierta. ¿Qué ha pasado?`,
          enlace: "/comercial/alertas-iee",
        })),
      ),
    });

    await fetch(`${URL_BASE}/rest/v1/iee_registrado?codigo=eq.${encodeURIComponent(a.codigo)}`, {
      method: "PATCH",
      headers: { ...cabJson, Prefer: "return=minimal" },
      body: JSON.stringify({ vigilancia_avisada_en: new Date().toISOString() }),
    });
    preguntadas += 1;
  }

  return { enganchadas, preguntadas, plazo };
}

/** Quien reparte las alertas: por CLAVE de funcion, no por nombre de persona. */
async function aQuienReparte(): Promise<string[]> {
  try {
    const filas = await leer<{ equipo_id: string }>(
      "equipo_funciones?select=equipo_id,funciones!inner(clave),equipo!inner(activo)" +
        "&funciones.clave=eq.supervision_comercial&equipo.activo=is.true&hasta=is.null",
    );
    return Array.from(new Set(filas.map((f) => f.equipo_id)));
  } catch {
    return [];
  }
}
