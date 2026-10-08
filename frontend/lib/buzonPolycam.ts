// lib/buzonPolycam.ts
//
// EL BUZON DEL POLYCAM (Monica, 29-sep-2026).
//
// El comercial escanea con Polycam, y manda el fichero por correo a
// buzon.polycam.accesalia@gmail.com con LA DIRECCION EN EL ASUNTO. La app abre
// ese buzon cada rato, coge el adjunto, lo cuelga de la oportunidad que toca,
// deja el cuerpo del correo como nota del diario y avisa a quien revisa
// viabilidades.
//
// TRES REGLAS QUE GOBIERNAN ESTO:
//
//  1. NUNCA ADIVINA EN SILENCIO. O encuentra la direccion con certeza, o el
//     correo se queda marcado "sin sitio" para que lo coloque una persona. Un
//     Polycam colgado de la comunidad equivocada es peor que uno sin colgar.
//  2. EL BUZON ES LA BANDEJA. No hay tabla de pendientes: el correo original se
//     queda en Gmail para siempre, y esa es la mejor copia de seguridad que hay.
//     Sin leer = por procesar. Leido = hecho. Con la etiqueta = no supe donde.
//  3. ESTA ES LA SEGUNDA PUERTA, NO LA PRIMERA. Lo mismo se puede subir a mano
//     desde la pantalla de la oportunidad. El correo falla -asuntos mal escritos,
//     ficheros de mas de 25 MB, reenvios desde el movil- y cuando falle tiene que
//     haber otra forma. No es un apaño temporal: es la salida de emergencia.
//
// SEGUNDA VUELTA (1-oct-2026). Resulta que el buzon llevaba 72 pasadas limpias y
// CERO escaneos guardados, y no estaba roto: miraba donde no hay nada. Los
// comerciales mandan un ENLACE de poly.cam en el cuerpo, y el `polycam.png` que
// viene adjunto no es el escaneo, es la miniatura del enlace.
//
// Tres cosas cambian:
//
//  4. EL FICHERO Y EL ENLACE SON EL MISMO DOCUMENTO CON DISTINTO CUERPO. Si cabe,
//     se guarda (backend='supabase'). Si no cabe, se apunta la URL
//     (backend='enlace') y queda marcado como incompleto a proposito. NO hay
//     descarga automatica: criterio de Monica, "si llega fichero se guarda; si no,
//     Alex lo descarga y lo guarda a mano. El 80% de las veces lo tiene hecho".
//     Gmail convierte en enlace de Drive todo adjunto de mas de 25 MB, y los GLB
//     van de 3 a 36 MB, asi que esto pasa de verdad.
//
//  5. LA MINIATURA NO ES EL ESCANEO. Va al tipo "Captura del 3D", que ya existe en
//     el catalogo y sirve de portada. Guardarla como "Escaneo Polycam" seria
//     basura disfrazada de dato.
//
//  6. EL ESCANEO ES DE UN PORTAL, NO DE UNA DIRECCION. "El tecnico no quiere Genil
//     5, quiere Genil 5 A", y cada escalera se escanea por separado. Si el asunto
//     no dice la escalera, se vincula a TODAS las de esa direccion: se vinculan
//     ids, no se duplica el fichero. "Entre por donde entre, encontrare el
//     escaneo".

import "server-only";

import { ImapFlow } from "imapflow";
import { simpleParser, type Attachment, type ParsedMail } from "mailparser";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const ALMACEN = "documentos-comerciales";

// EL ALMACEN DE LOS ESCANEADOS, que NO es el de los documentos. Nombre de Monica
// (2-oct-2026). Los motivos estan en la migracion 20261002210000, y el de peso es
// que el permiso va por almacen: manaña puede hacer falta que alguien abra
// escaneos sin poder abrir las hojas de encargo firmadas.
//
// Se llama "y fotos" porque el escaneado no viene solo: el que los hace manda
// ademas unas 30 fotos por direccion, y son mas peso que el propio .glb. Eso es
// de otro sprint, pero el almacen ya se llama como lo que va a guardar.
const ALMACEN_POLYCAM = "almacen-polycam-y-fotos";

/** La etiqueta que se le pone al correo que no se supo colocar. */
export const SIN_SITIO = "accesalia-sin-sitio";

// REMITENTES DE CONFIANZA QUE NO SON PERSONAS.
//
// Cuando el escaneo se comparte DESDE EL MOVIL, el correo no lo manda el chico:
// lo manda Polycam en su nombre. El 1-oct llego uno asi y el buzon lo rechazo
// con "el remitente no es del equipo", que era verdad y era inutil: ese es
// justo el flujo normal. Monica, 2-oct: "incluyamos a Polycam en la lista del
// equipo o lo que sea".
//
// No va en la tabla `equipo`, que es el directorio de personal y no tiene por
// que llenarse de cosas que no son personas. Va aqui, y sirve para las dos
// puertas: el rescate de Spam y la entrada por INBOX.
//
// La direccion es la que mando el correo de verdad, leida del buzon, no la de
// memoria: `notifications@poly.cam` -en ingles, y .cam, que es el dominio de
// Polycam, no .com-. Un caracter de mas aqui y el escaneo vuelve a quedarse
// fuera sin un solo sintoma.
//
// Estos correos NO tienen autor: `autor_id` se queda vacio a proposito, porque
// quien lo mando es un robot. De quien es el escaneo se sabra por la direccion,
// no por el remitente.
export const REMITENTES_ROBOT = new Set(["notifications@poly.cam"]);

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: cab, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

// TRAERLO TODO, DE VERDAD.
//
// PostgREST corta en 1.000 filas y `limit` NO lo cambia: se le pueden pedir
// 5.000 y devuelve 1.000 sin decir que ha recortado. Aqui eso significaba que
// las 228 comunidades que pasan de la milesima eran invisibles para el cotejo:
// llegaba su Polycam, no se encontraba la direccion y se quedaba en el monton
// de "no se de quien es", para siempre y sin sintoma.
//
// La unica forma de pasar del tope es pedir por tramos con la cabecera Range.
async function leerTodo<T>(path: string): Promise<T[]> {
  const todo: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
      headers: { ...cab, Range: `${desde}-${desde + 999}` },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
    const trozo = (await r.json()) as T[];
    todo.push(...trozo);
    if (trozo.length < 1000) return todo;
  }
}

async function crear<T>(tabla: string, fila: unknown): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${tabla}`, {
    method: "POST",
    headers: { ...cab, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(fila),
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

// --------------------------------------------------------------- direcciones

/** Para cotejar: sin tildes, sin signos, sin dobles espacios y en mayusculas.
 *  "Gral. Ricardos, 238 - Madrid" y "GENERAL RICARDOS 238 MADRID" siguen siendo
 *  distintas, y tienen que serlo: esto NO inventa equivalencias. */
export function aplanar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

/** Gmail ignora los puntos: danielcrm@ y daniel.crm@ son el MISMO buzon. */
export function correoLlano(e: string): string {
  const [antes, dominio] = e.trim().toLowerCase().split("@");
  if (!dominio) return e.trim().toLowerCase();
  const sinAlias = antes.split("+")[0];
  const local = /^(gmail|googlemail)\.com$/.test(dominio) ? sinAlias.replace(/\./g, "") : sinAlias;
  return `${local}@${dominio}`;
}

/** Lo que el correo añade por su cuenta al reenviar. Solo cuenta al principio. */
const REENVIO = new Set(["FWD", "FW", "RE", "RV", "RES", "ESCANEO", "ESCANER", "POLYCAM", "3D"]);

/** Tipos de via. Se quitan SOLO si van delante, que es donde hacen de tipo. En
 *  "VIRGEN DEL CAMINO 4" o en "PLAZA DE LA ALBUFERA 11" la palabra es parte del
 *  nombre de la calle, y quitarla de ahi confunde direcciones distintas: sin esta
 *  regla, "VIRGEN DEL CAMINO 4 LEGANES" encajaba con "VIRGEN DE ICIAR 15
 *  ESCALERA 4 ALCORCON". Y "C" no se puede quitar en medio porque es la escalera
 *  C de Santa Cruz de Marcenado 1, que no es la D ni la E. */
const TIPOS_VIA = new Set([
  "CALLE", "C", "CL", "AVENIDA", "AV", "AVDA", "AVD", "PLAZA", "PZ", "PL",
  "PASEO", "PS", "PO", "CAMINO", "CM", "CNO", "CARRETERA", "CR", "CTRA",
  "TRAVESIA", "TR", "RONDA", "RD", "GLORIETA", "GTA", "VEREDA", "SENDA",
  "BULEVAR", "BL", "COLONIA", "URBANIZACION", "URB", "POLIGONO", "PG",
]);

/** Particulas y muletillas del numero: no distinguen nada en ningun sitio. */
const PARTICULAS = new Set(["DE", "DEL", "LA", "EL", "LOS", "LAS", "Y", "NUM", "NO"]);

/** Las palabras que de verdad nombran la direccion, en orden. */
function significativas(s: string): string[] {
  const t = aplanar(s).split(" ").filter(Boolean);
  while (t.length && REENVIO.has(t[0])) t.shift();
  if (t.length && TIPOS_VIA.has(t[0])) t.shift();
  return t.filter((p) => !PARTICULAS.has(p));
}

export type ComunidadCotejable = { id: string; nombre: string; municipio?: string | null };

/** Una direccion del asunto contra la lista de comunidades. Devuelve la comunidad
 *  SOLO si no hay duda: si encajan dos, no encaja ninguna.
 *
 *  El cotejo es por CONJUNTO DE PALABRAS, que es la regla que ya vale para el
 *  callejero, y no por cadena. Comparar cadenas falla con la direccion correcta
 *  escrita por la persona correcta: "Fwd: Calle Cristo de la victoria 129" contra
 *  "CRISTO DE LA VICTORIA 129 MADRID" no cabe en ningun sentido, porque al asunto
 *  le sobran FWD y CALLE y al nombre le sobra MADRID (1-oct-2026, primer correo
 *  real que entro al buzon: se perdio por esto).
 *
 *  Encaja si TODAS las palabras del nombre estan en el asunto, descontando el
 *  municipio: el comercial no lo escribe, y Monica lo lleva pegado al final de
 *  cada nombre. El numero entra en esa cuenta, y es lo que separa el 129 del 131. */
export function cotejar(
  asunto: string,
  comunidades: ComunidadCotejable[],
): ComunidadCotejable | null {
  const a = aplanar(asunto);
  if (a.length < 6) return null;

  const exactas = comunidades.filter((c) => aplanar(c.nombre) === a);
  if (exactas.length === 1) return exactas[0];
  if (exactas.length > 1) return null;

  const enAsunto = significativas(asunto);
  if (!enAsunto.length) return null;
  const hay = new Set(enAsunto);
  const esNumero = (p: string) => /^\d/.test(p);
  const asuntoTieneNumero = enAsunto.some(esNumero);

  /** Las palabras con las que esta comunidad se distingue: las de su nombre,
   *  descontando su municipio (que el comercial no suele escribir). */
  const clave = (c: ComunidadCotejable) => {
    const todas = significativas(c.nombre);
    const delMunicipio = new Set(significativas(c.municipio ?? ""));
    const sin = todas.filter((p) => !delMunicipio.has(p));
    // Si al quitar el municipio no queda calle, el municipio ERA la calle:
    // "TORREJON 12 TORREJON DE ARDOZ", "MADRID 38-40 HUMANES DE MADRID".
    return sin.some((p) => !esNumero(p)) ? sin : todas;
  };

  const cabe = (suyas: string[]): boolean => {
    // Una sola palabra no basta para jugarse un documento, y solo numeros no
    // nombran ninguna calle: "MADRID 38-40 HUMANES DE MADRID" se queda en
    // [38, 40] al descontarle su municipio, y eso encaja con cualquier cosa.
    if (suyas.length < 2) return false;
    if (!suyas.some((p) => !esNumero(p))) return false;
    if (!suyas.every((p) => hay.has(p))) return false;

    const numeros = suyas.filter(esNumero);

    // Sin numero no se come a los que lo tienen: "ALFONSO XII MADRID" encajaba
    // dentro de los cuatro Alfonso XII de Mostoles.
    if (!numeros.length) return !asuntoTieneNumero;

    // La calle va DELANTE de su numero, y basta con su primera palabra: detras
    // del numero va el portal, la letra, el BIS, el barrio o la provincia, y eso
    // cambia de una direccion a otra ("ABREVADERO 2 PORTAL 16",
    // "ARTURO SORIA 162 A", "ANGEL DE ALCAZAR 10 TALAVERA DE LA REINA TOLEDO").
    // Sin esta guarda, "TOLEDO 2 ALCORCON" encajaba dentro de
    // "CAPITAN DAOIZ 2 TALAVERA DE LA REINA.TOLEDO": sus dos palabras estaban,
    // pero separadas y en desorden.
    const cabeza = suyas.find((p) => !esNumero(p))!;
    return enAsunto.indexOf(cabeza) < enAsunto.indexOf(numeros[0]);
  };

  let candidatas = comunidades
    .map((c) => ({ c, suyas: clave(c) }))
    .filter((x) => cabe(x.suyas));
  if (!candidatas.length) return null;

  // Primer desempate: el MUNICIPIO, si el asunto lo nombra. "CAÑADA 8" existe en
  // Alcorcon y en Madrid, y son dos fincas que no tienen nada que ver.
  const conMunicipio = candidatas.filter((x) => {
    const mun = significativas(x.c.municipio ?? "");
    return mun.length > 0 && mun.every((p) => hay.has(p));
  });
  if (conMunicipio.length) candidatas = conMunicipio;
  if (candidatas.length === 1) return candidatas[0].c;

  // Segundo desempate: gana la MAS ESPECIFICA, la que gasta mas palabras del
  // asunto. Si el comercial escribe "ESPARTA 5-7", la finca agrupada es la
  // respuesta, no un empate con "ESPARTA 5" y "ESPARTA 7".
  const largo = Math.max(...candidatas.map((x) => x.suyas.length));
  const masLargas = candidatas.filter((x) => x.suyas.length === largo);
  return masLargas.length === 1 ? masLargas[0].c : null;
}

// ------------------------------------------------------------------ almacen

async function subirFichero(ruta: string, datos: Buffer, tipoMime: string, almacen = ALMACEN) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/${almacen}/${ruta}`, {
    method: "POST",
    headers: { ...cab, "Content-Type": tipoMime || "application/octet-stream" },
    body: new Uint8Array(datos),
  });
  if (!r.ok) throw new Error(`Storage ${r.status}: ${await r.text()}`);
}

/** La extension, con su punto, o nada. `limpioNombre` la quita para hacer el
 *  nombre legible, y luego hay que devolverla: un fichero sin extension no lo
 *  abre nada. */
const extension = (s: string) => {
  const m = s.match(/\.[a-z0-9]{1,8}$/i);
  return m ? m[0].toLowerCase() : "";
};

const limpioNombre = (s: string) =>
  aplanar(s.replace(/\.[a-z0-9]+$/i, ""))
    .replace(/ /g, "-")
    .slice(0, 60)
    .toLowerCase() || "fichero";

/** Apunta un documento en la tabla, encadenando versiones: si ya habia uno del
 *  mismo tipo en la misma oportunidad, el nuevo es la version siguiente y el
 *  anterior deja de estar vigente. */
export async function apuntarDocumento(d: {
  oportunidadId: string;
  comunidadId: string | null;
  tipoDocumentoId: string;
  ruta: string;
  naturaleza: "subido" | "generado_app";
}): Promise<string> {
  const previos = await leer<{ id: string; grupo_id: string; n_version: number }[]>(
    `documentos?select=id,grupo_id,n_version&oportunidad_id=eq.${d.oportunidadId}` +
      `&tipo_documento_id=eq.${d.tipoDocumentoId}&order=n_version.desc&limit=1`,
  );
  const previo = previos[0];

  if (previo) {
    await fetch(`${URL_BASE}/rest/v1/documentos?grupo_id=eq.${previo.grupo_id}`, {
      method: "PATCH",
      headers: { ...cab, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ vigente: false }),
    });
  }

  const [doc] = await crear<{ id: string }[]>("documentos", {
    oportunidad_id: d.oportunidadId,
    comunidad_id: d.comunidadId,
    tipo_documento_id: d.tipoDocumentoId,
    naturaleza: d.naturaleza,
    estado_firma: "no_aplica",
    backend: "supabase",
    storage_ref: d.ruta,
    vigente: true,
    grupo_id: previo?.grupo_id ?? crypto.randomUUID(),
    n_version: (previo?.n_version ?? 0) + 1,
  });
  return doc.id;
}

// -------------------------------------------------------------------- avisos

/** Avisa a quien tiene una funcion, sea quien sea. Los nombres no se escriben en
 *  el codigo: hoy "viabilidades" son Alex y Daniel, y manaña puede ser otro. */
export async function avisarAQuienHace(
  funcionClave: string,
  a: { texto: string; motivo: string; enlace: string; oportunidadId: string | null },
) {
  const hoy = new Date().toISOString().slice(0, 10);
  const filas = await leer<{ equipo_id: string; desde: string | null; hasta: string | null }[]>(
    `equipo_funciones?select=equipo_id,desde,hasta,funciones!inner(clave)&funciones.clave=eq.${funcionClave}`,
  );
  const gente = Array.from(
    new Set(filas.filter((f) => (!f.desde || f.desde <= hoy) && (!f.hasta || f.hasta >= hoy)).map((f) => f.equipo_id)),
  );
  if (gente.length === 0) return 0;

  await crear("avisos", gente.map((id) => ({
    para_id: id,
    texto: a.texto,
    motivo: a.motivo,
    enlace: a.enlace,
    oportunidad_id: a.oportunidadId,
  })));
  return gente.length;
}

// ------------------------------------------------------------------- el paso

/** Gmail aparta a Spam lo que no conoce, y un zip de un desconocido es
 *  exactamente su perfil. El buzon solo miraba INBOX, asi que un escaneo caido
 *  en Spam no existia y no iba a existir nunca: el 1-oct-2026 el primer escaneo
 *  enviado desde un movil no aparecio por ningun lado, con el reloj corriendo
 *  cada diez minutos y dando mirados: 0.
 *
 *  La regla es la de Monica: de los remitentes dados de alta en la app no se va
 *  nada a Spam, porque nadie mas escribe a ese buzon. Aqui se aplica donde la
 *  controlamos nosotros, y eso es mejor que un filtro de Gmail: no hay nada que
 *  configurar, nadie lo puede desconfigurar y no depende de una API que las
 *  contrasenas de aplicacion no abren.
 *
 *  YA NO MIRA QUIEN LO MANDA: rescata todo lo que haya sin leer en Spam. Monica,
 *  2-oct-2026: "que se guarde todo, no filtra ni por remitente, ni asunto, ni
 *  nada". Antes solo rescataba a los del equipo, y eso dejaba en Spam para
 *  siempre justo lo que mas importa: el correo que manda Polycam en nombre del
 *  comercial, o el escaneo que el chico envia desde su icloud personal. A ese
 *  buzon solo le escribe quien le escribe, asi que no hay nada que cribar. */
async function rescatarDeSpam(cliente: ImapFlow): Promise<number> {
  const buzones = await cliente.list();
  // El nombre del buzon de Spam cambia con el idioma de la cuenta. Lo que no
  // cambia es su marca IMAP, \Junk, y por eso se busca por ahi y no por nombre.
  const spam = buzones.find((b) => b.specialUse === "\\Junk");
  if (!spam) return 0;

  let rescatados = 0;
  const cerrojo = await cliente.getMailboxLock(spam.path);
  try {
    const uids = await cliente.search({ seen: false });
    if (!Array.isArray(uids)) return 0;
    for (const uid of uids) {
      await cliente.messageMove(String(uid), "INBOX", { uid: true });
      rescatados++;
    }
  } finally {
    cerrojo.release();
  }
  return rescatados;
}

// LA CUENTA DE UNA PASADA, y cambia de forma el 2-oct-2026 porque el trabajo
// cambio. Antes decia cuantos habia COLOCADO y cuales se habian quedado SIN
// SITIO, porque el buzon decidia y rechazaba. Ahora no rechaza nada: guarda todo
// y decidir es cosa de Alex en su pantalla. Asi que los campos que contaban
// rechazos ya no cuentan nada, y lo que hay que ver en /relojes es cuanto entro.
//
// DESVIACION: esto cambia lo que se ve en el historial de /relojes. Las pasadas
// viejas seguiran teniendo los campos antiguos en su `detalle`, que es correcto:
// cuentan lo que pasaba entonces.
export type Repaso = {
  /** Correos abiertos en esta pasada. */
  mirados: number;
  /** Sacados de la carpeta de Spam, ahora sin mirar quien los manda. */
  rescatados: number;
  /** Filas nuevas en `escaneados_polycam`. */
  guardados: number;
  /** Ficheros subidos al almacen. Un correo puede traer varios. */
  ficheros: number;
  /** Los que ya estaban guardados de una pasada anterior y no se repiten. */
  repetidos: number;
  errores: string[];
};

// ---------------------------------------------------------------------------
// GUARDAR UN ESCANEADO
// ---------------------------------------------------------------------------

/** El enlace de Polycam, si el correo trae uno en vez de un adjunto. Es el
 *  camino de "enviar enlace" del movil, el que llega desde notifications@poly.cam
 *  con el asunto "capture has been shared with you". Se guarda el enlace Y, si
 *  viene, el fichero: "aunque la ruta caduque, a veces necesitamos reintentar si
 *  falla, mejor tenerlo" (Monica). */
function enlacePolycam(correo: ParsedMail): string | null {
  const donde = `${correo.text ?? ""}\n${typeof correo.html === "string" ? correo.html : ""}`;
  const m = donde.match(/https?:\/\/[^\s"'<>)]*poly\.cam[^\s"'<>)]*/i);
  return m ? m[0] : null;
}

/** EL DIA DEL ESCANEO, del nombre que Polycam pone al fichero: dia_mes_año
 *  ("15_9_2026.zip" -> 2026-09-15). El .glb por dentro no trae fecha, y la del
 *  correo no vale: los reenvios llegan meses despues (Monica, 3-oct-2026: es la
 *  "fecha de visita" de la viabilidad, "es importante"). */
export function fechaDelEscaneo(nombre: string): string | null {
  const m = /^(\d{1,2})[_-](\d{1,2})[_-](\d{4})/.exec(nombre);
  if (!m) return null;
  const [d, mes, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mes < 1 || mes > 12 || d < 1 || d > 31) return null;
  return `${a}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

type FilaEscaneado = {
  remitente: string | null;
  asunto: string | null;
  /** Cuando llego el correo. */
  fecha: string | null;
  /** Cuando se HIZO el escaneo: la fecha de visita de la viabilidad. */
  fecha_escaneo: string | null;
  identificador_correo: string | null;
  nombre_original_fichero: string | null;
  ruta_polycam: string | null;
  /** QUIEN FUE A VISITAR Y ESCANEAR. Sale del correo del remitente, cuadrado
   *  con el del equipo. Si el remitente no es de nadie -el propio Polycam avisa
   *  desde notifications@poly.cam- se queda vacio: adivinar quien fue por el
   *  parecido del correo seria inventarlo. */
  visito_id: string | null;
};

/** El del equipo cuyo correo es ese, o null. Primero de los cuatro papeles que
 *  deja una viabilidad: quien hizo la visita y el escaneo (Monica, 6-oct-2026). */
async function quienEscaneo(remitente: string | null): Promise<string | null> {
  const mail = (remitente ?? "").trim().toLowerCase();
  if (!mail || !mail.includes("@")) return null;
  try {
    const r = await fetch(
      `${URL_BASE}/rest/v1/equipo?select=id&email=ilike.${encodeURIComponent(mail)}&limit=1`,
      { headers: cab, cache: "no-store" },
    );
    if (!r.ok) return null;
    const [q] = (await r.json()) as { id: string }[];
    return q?.id ?? null;
  } catch {
    return null;
  }
}

/** Mete la fila y devuelve su id. Si ese fichero de ese correo ya estaba, no la
 *  duplica y devuelve null: la pareja (identificador_correo, nombre_original_
 *  fichero) es unica a proposito, para que una segunda pasada no guarde dos veces
 *  lo mismo. */
async function meterEscaneado(fila: FilaEscaneado): Promise<string | null> {
  const r = await fetch(
    `${URL_BASE}/rest/v1/escaneados_polycam` +
      `?on_conflict=identificador_correo,nombre_original_fichero`,
    {
      method: "POST",
      headers: {
        ...cab,
        "Content-Type": "application/json",
        Prefer: "return=representation,resolution=ignore-duplicates",
      },
      body: JSON.stringify(fila),
    },
  );
  if (!r.ok) throw new Error(`escaneados_polycam ${r.status}: ${await r.text()}`);
  const [creada] = (await r.json()) as { id: string }[];
  return creada?.id ?? null;
}

/** Apunta en la fila donde ha quedado el fichero. Va en dos pasos -primero la
 *  fila, luego el fichero- porque la ruta lleva dentro el id de la fila, y asi
 *  cada escaneado tiene su carpeta y no hay nombres que choquen. */
async function apuntarRuta(id: string, ruta: string): Promise<void> {
  const r = await fetch(`${URL_BASE}/rest/v1/escaneados_polycam?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...cab, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ polycam: ruta }),
  });
  if (!r.ok) throw new Error(`escaneados_polycam PATCH ${r.status}: ${await r.text()}`);
}

/** Guardar los adjuntos, dejar la nota en el diario y avisar. Lo usan los dos
 *  caminos: el reloj cuando acierta con la direccion, y una persona desde la
 *  bandeja cuando no acerto. Devuelve a cuanta gente se aviso. */
async function colocar(
  cliente: ImapFlow,
  uid: number | string,
  correo: ParsedMail,
  d: { oportunidadId: string; comunidadId: string; comunidadNombre: string; autorId: string | null; tipoPolycamId: string },
): Promise<number> {
  // 1 · los adjuntos, al almacen
  const adjuntos = (correo.attachments ?? []).filter((a: Attachment) => a.content && a.size > 0);
  for (const a of adjuntos) {
    const ruta = `oportunidades/${d.oportunidadId}/polycam/${crypto.randomUUID().slice(0, 8)}-${limpioNombre(a.filename ?? "escaneo")}`;
    await subirFichero(ruta, a.content as Buffer, a.contentType ?? "application/octet-stream");
    await apuntarDocumento({
      oportunidadId: d.oportunidadId,
      comunidadId: d.comunidadId,
      tipoDocumentoId: d.tipoPolycamId,
      ruta,
      naturaleza: "subido",
    });
  }

  // 2 · la nota de Sali en el diario de la oportunidad, canal mail: llego por
  //     correo (Monica, 8-oct-2026). La frase sale de su plantilla
  //     (plantillas_sali, 'polycam_recibido'); lo que escribio quien lo mando
  //     va dentro, que a veces trae avisos ("el portal B no se pudo").
  const cuerpo = (correo.text ?? "").trim();
  const [quien] = d.autorId
    ? await leer<{ nombre: string }[]>(`equipo?select=nombre&id=eq.${d.autorId}&limit=1`)
    : [];
  const r = await fetch(`${URL_BASE}/rest/v1/rpc/nota_sali`, {
    method: "POST",
    headers: { ...cab, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_opp: d.oportunidadId,
      p_fecha: (correo.date ?? new Date()).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }),
      p_clave: "polycam_recibido",
      p_datos: {
        // "esa dirección" es el relleno de los avisos cuando la opp no tiene
        // comunidad: en la nota, mejor que ese trozo no salga.
        donde: d.comunidadNombre === "esa dirección" ? null : d.comunidadNombre,
        ficheros: `${adjuntos.length} ${adjuntos.length === 1 ? "fichero" : "ficheros"}`,
        quien: quien?.nombre ?? null,
        mensaje: cuerpo ? cuerpo.slice(0, 1000) : null,
      },
      p_canal: "mail",
    }),
  });
  if (!r.ok) throw new Error(`Supabase RPC nota_sali ${r.status}: ${await r.text()}`);

  // 3 · y que se entere quien lo revisa. Con la direccion POR VALIDAR: el cotejo
  //     automatico es lo mas fragil de todo esto, y quien abre el fichero puede
  //     comprobarlo sin coste ninguno.
  const avisados = await avisarAQuienHace("viabilidades", {
    texto: `Polycam recibido de ${d.comunidadNombre}. Valida que la dirección es correcta antes de empezar.`,
    motivo: "polycam_recibido",
    enlace: `/comercial/oportunidades/${d.oportunidadId}`,
    oportunidadId: d.oportunidadId,
  });

  // 4 · hecho: leido y sin la etiqueta de sin sitio, por si venia de la bandeja
  await cliente.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
  try {
    await cliente.messageFlagsRemove(String(uid), [SIN_SITIO], { uid: true });
  } catch {
    /* no la tenia */
  }
  return avisados;
}

// ============================================================================
// REPASAR EL BUZON: ENTRA TODO Y SE GUARDA TODO
// ============================================================================
//
// Reescrito el 2-oct-2026 con la regla de Monica, literal:
//
//   "que se guarde todo, no filtra ni por remitente, ni asunto, ni nada. Se
//    guardan los datos: remitente, asunto, fecha y un id, y el archivo que tenga."
//
// LO QUE HACIA ANTES Y POR QUE ESTABA MAL. Rechazaba dos veces: si el remitente
// no estaba de alta en `equipo`, fuera; y si el asunto no encajaba con una
// direccion, fuera tambien. El 2-oct llegaron tres escaneados de prueba y los
// tres rebotaron:
//
//   07:40  fiigoop@gmail.com            "12_3_2026"            remitente
//   08:10  ahernandez.accesalia@...     "Escaneo Oficina..."   el asunto no es una direccion
//   14:10  abrahamhernandezq07@icloud   "Alhambra 24 Madrid"   remitente
//
// Dos de los tres eran gente de casa mandando desde el movil con su cuenta
// personal, que es lo que pasa siempre: el telefono envia por la cuenta que
// tiene. Disciplinar eso no funciona, y por eso el filtro sobra.
//
// AHORA el cotejo no decide, PROPONE: el escaneado se guarda y en la pantalla
// "revision polycam" se le ofrecen a Alex los accesos candidatos, y el marca
// cuales son -una escalera, otra, o todas-. Eso vive en relacion_polycam_acceso.
//
// Y NO VA A `documentos`: "polycam no es un documento, es un escaneado. Los demas
// documentos se guardan cuando ya hay firmas, o al menos algo solido. El polycam
// es fase temprana, y no siempre se hace."

export async function repasarBuzon(): Promise<Repaso> {
  const usuario = process.env.BUZON_POLYCAM_USUARIO;
  const clave = process.env.BUZON_POLYCAM_CLAVE;
  if (!usuario || !clave) throw new Error("Faltan BUZON_POLYCAM_USUARIO / BUZON_POLYCAM_CLAVE en el entorno.");

  const cliente = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: usuario, pass: clave.replace(/\s+/g, "") },
    logger: false,
  });

  const r: Repaso = {
    mirados: 0, rescatados: 0, guardados: 0, ficheros: 0, repetidos: 0, errores: [],
  };

  await cliente.connect();
  // Primero se rescata lo que Gmail aparto, para que entre en ESTA pasada.
  r.rescatados = await rescatarDeSpam(cliente);
  const cerrojo = await cliente.getMailboxLock("INBOX");
  try {
    // LOS QUE NO SE HAN GUARDADO TODAVIA. Son dos grupos:
    //
    //   · los que estan sin leer, que es lo normal;
    //   · y los que el codigo viejo marco con la etiqueta porque no supo
    //     colocarlos. Esos estan leidos pero NO guardados, asi que si solo se
    //     buscara por "sin leer" se quedarian en el buzon para siempre. Los tres
    //     escaneados de prueba del 2-oct estan ahi, y con esto entran solos.
    const sinLeer = await cliente.search({ seen: false });
    const rebotados = await cliente.search({ keyword: SIN_SITIO });
    const lista = [
      ...new Set([
        ...(Array.isArray(sinLeer) ? sinLeer : []),
        ...(Array.isArray(rebotados) ? rebotados : []),
      ]),
    ];

    for (const uid of lista) {
      r.mirados++;
      let asunto = "(sin asunto)";
      try {
        const bajado = await cliente.download(String(uid), undefined, { uid: true });
        if (!bajado?.content) throw new Error("el correo no trae contenido");
        const correo: ParsedMail = await simpleParser(bajado.content);
        asunto = correo.subject?.trim() || "(sin asunto)";

        const quienVino = correo.from?.value?.[0]?.address ?? null;
        const comun = {
          remitente: quienVino,
          // QUIEN FUE A VISITAR Y ESCANEAR, el primero de los cuatro papeles de
          // una viabilidad. Se pone solo, que es su criterio: "que se cree solo,
          // igual que quien hizo la visita o el polycam, que salen de los datos
          // que cuelgan de esas acciones".
          visito_id: await quienEscaneo(quienVino),
          asunto: correo.subject?.trim() || null,
          // Cuando llego. Estaba sin guardar hasta el 3-oct-2026.
          fecha: correo.date ? correo.date.toISOString() : null,
          // El Message-ID: con esto se vuelve siempre al correo original, a su
          // fecha y a su cuerpo, sin copiarlos aqui.
          identificador_correo: correo.messageId ?? null,
          ruta_polycam: enlacePolycam(correo),
        };

        const adjuntos = (correo.attachments ?? []).filter((a: Attachment) => a.content && a.size > 0);

        // SIN ADJUNTO TAMBIEN SE GUARDA. Es el caso del "enviar enlace" de
        // Polycam, que no manda fichero. Y si no trae ni enlace ni fichero,
        // tambien: queda constancia de que ese correo entro, que es lo que ella
        // pidio -"se guardan los datos... y el archivo que tenga"-.
        if (!adjuntos.length) {
          const id = await meterEscaneado({ ...comun, nombre_original_fichero: null, fecha_escaneo: null });
          if (id) r.guardados++;
          else r.repetidos++;
        }

        // UNA FILA POR ADJUNTO. Un correo puede traer varios y cada uno es un
        // escaneado distinto; por eso lo unico es la pareja del correo con el
        // nombre del fichero, y no el correo a secas.
        for (const a of adjuntos) {
          const nombre = a.filename ?? "escaneo";
          const id = await meterEscaneado({ ...comun, nombre_original_fichero: nombre, fecha_escaneo: fechaDelEscaneo(nombre) });
          if (!id) {
            r.repetidos++;
            continue;
          }
          r.guardados++;
          // La ruta lleva el id de la fila delante, asi cada escaneado tiene su
          // carpeta y dos ficheros con el mismo nombre no se pisan.
          const ruta = `${id}/${limpioNombre(nombre)}${extension(nombre)}`;
          await subirFichero(
            ruta,
            a.content as Buffer,
            a.contentType ?? "application/octet-stream",
            ALMACEN_POLYCAM,
          );
          await apuntarRuta(id, ruta);
          r.ficheros++;
        }

        // Hecho: leido, y fuera la etiqueta de "no supe colocarlo", que ya no
        // significa nada porque ahora todo se guarda.
        await cliente.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
        try {
          await cliente.messageFlagsRemove(String(uid), [SIN_SITIO], { uid: true });
        } catch {
          // Si la etiqueta no estaba, da igual.
        }
      } catch (e) {
        // Un correo que falla NO se marca leido: se vuelve a intentar al rato.
        r.errores.push(`${asunto} · ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } finally {
    cerrojo.release();
    await cliente.logout();
  }

  return r;
}


// --------------------------------------------------------------- la bandeja

export type CorreoSinSitio = {
  uid: number;
  de: string;
  asunto: string;
  cuando: string;
  adjuntos: string[];
  cuerpo: string;
  /** Lo que la app cree que es, para no hacer buscar a mano lo que ya sabe. */
  sugerencia: { id: string; nombre: string } | null;
};

/** Lo que el reloj no supo colocar. Sale del propio buzon: no hay tabla de
 *  pendientes, y el correo original es la mejor copia de seguridad que hay. */
export async function sinSitio(): Promise<CorreoSinSitio[]> {
  const usuario = process.env.BUZON_POLYCAM_USUARIO;
  const clave = process.env.BUZON_POLYCAM_CLAVE;
  if (!usuario || !clave) return [];

  const comunidades = await leerTodo<ComunidadCotejable>("comunidades?select=id,nombre,municipio");

  const cliente = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: usuario, pass: clave.replace(/\s+/g, "") },
    logger: false,
  });

  const fuera: CorreoSinSitio[] = [];
  await cliente.connect();
  const cerrojo = await cliente.getMailboxLock("INBOX", { readOnly: false });
  try {
    const uids = await cliente.search({ keyword: SIN_SITIO });
    for (const uid of (Array.isArray(uids) ? uids : []).slice(-40).reverse()) {
      const bajado = await cliente.download(String(uid), undefined, { uid: true });
      if (!bajado?.content) continue;
      const correo: ParsedMail = await simpleParser(bajado.content);
      const asunto = correo.subject?.trim() || "(sin asunto)";
      fuera.push({
        uid: Number(uid),
        de: correo.from?.value?.[0]?.address ?? "—",
        asunto,
        cuando: (correo.date ?? new Date()).toISOString().slice(0, 16).replace("T", " "),
        adjuntos: (correo.attachments ?? []).filter((a: Attachment) => a.size > 0).map((a: Attachment) => a.filename ?? "(sin nombre)"),
        cuerpo: (correo.text ?? "").trim().slice(0, 400),
        sugerencia: cotejar(asunto, comunidades),
      });
    }
  } finally {
    cerrojo.release();
    await cliente.logout();
  }
  return fuera;
}

/** Colocar a mano uno de los de la bandeja, en la oportunidad que diga la persona. */
export async function colocarAMano(uid: number, oportunidadId: string): Promise<string> {
  const usuario = process.env.BUZON_POLYCAM_USUARIO;
  const clave = process.env.BUZON_POLYCAM_CLAVE;
  if (!usuario || !clave) throw new Error("Faltan las variables del buzón.");

  const [ops, tipos, equipo] = await Promise.all([
    leer<{ id: string; comunidad_id: string | null; comunidad: { nombre: string } | null }[]>(
      `oportunidades?select=id,comunidad_id,comunidad:comunidad_id(nombre)&id=eq.${oportunidadId}&limit=1`,
    ),
    leer<{ id: string }[]>("tipos_documento?select=id&nombre=eq.Escaneo%20Polycam&limit=1"),
    leer<{ id: string; email: string | null }[]>("equipo?select=id,email&activo=is.true"),
  ]);
  const op = ops[0];
  if (!op) throw new Error("Esa oportunidad no existe.");
  if (!tipos[0]) throw new Error('Falta el tipo de documento "Escaneo Polycam".');
  const porCorreo = new Map(equipo.filter((e) => e.email).map((e) => [correoLlano(e.email!), e.id]));

  const cliente = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: usuario, pass: clave.replace(/\s+/g, "") },
    logger: false,
  });

  await cliente.connect();
  const cerrojo = await cliente.getMailboxLock("INBOX");
  try {
    const bajado = await cliente.download(String(uid), undefined, { uid: true });
    if (!bajado?.content) throw new Error("Ese correo ya no está en el buzón.");
    const correo: ParsedMail = await simpleParser(bajado.content);
    const de = correo.from?.value?.[0]?.address ?? "";
    await colocar(cliente, uid, correo, {
      oportunidadId,
      comunidadId: op.comunidad_id ?? "",
      comunidadNombre: op.comunidad?.nombre ?? "esa dirección",
      autorId: porCorreo.get(correoLlano(de)) ?? null,
      tipoPolycamId: tipos[0].id,
    });
    return correo.subject?.trim() || "(sin asunto)";
  } finally {
    cerrojo.release();
    await cliente.logout();
  }
}

/** Las oportunidades abiertas, para el desplegable de la bandeja. */
export async function oportunidadesAbiertas(): Promise<{ valor: string; texto: string }[]> {
  const filas = await leer<{ id: string; codigo: string | null; comunidad: { nombre: string } | null; comunidad_provisional: string | null }[]>(
    "oportunidades?select=id,codigo,comunidad:comunidad_id(nombre),comunidad_provisional&estado=eq.abierta&order=fecha_apertura.desc.nullslast,creado_en.desc&limit=500",
  );
  return filas.map((o) => ({
    valor: o.id,
    texto: (o.comunidad?.nombre ?? o.comunidad_provisional ?? "(sin dirección)") + (o.codigo ? ` · ${o.codigo}` : ""),
  }));
}
