// lib/altaOportunidad.ts
//
// DAR DE ALTA UNA OPORTUNIDAD (Monica, 27-sep-2026).
//
// La tercera puerta. Las otras dos giran alrededor de la DIRECCION (comunidad) y
// de la PERSONA de contacto (administrador). Esta gira alrededor de LA ENTRADA
// DEL DIARIO: sin entrada no hay oportunidad, porque sin ella no hay nada que
// seguir.
//
// Para guardar hacen falta tres cosas, y son suyas:
//   1. la entrada del diario;
//   2. un comercial —"si no hay comercial no es una oportunidad, es una nota que
//      se pierde: nadie recibe el aviso y nadie hace el seguimiento";
//   3. un hilo del que tirar: direccion, o administracion, o telefono, o correo.
//
// Y la regla que gobierna la pantalla: que el comercial escriba lo MINIMO. El
// comercial y la fecha salen puestos, lo demas son buscadores que enganchan, y
// lo que se teclea en un buscador que no encuentra nada NO se vuelve a escribir.

import "server-only";
import { comunidadesDeOpp, ponerAdministrador } from "./adminComunidad";
import { fichasCortas } from "./fichaCorta";
import { recalcularLuego } from "./estadoOportunidad";

import { canalesDe, type Canal } from "./canales";
import { columnasQuien, opcionesQuien, type OpcionQuien } from "./quien";
import { CARGO_DE } from "./oportunidadVocabulario";
import { claveDesdeAccesos, listaDeClaves } from "./claves";

// El vocabulario vive en un fichero aparte porque lo necesitan las dos
// orillas: la pantalla y el servidor.
export { PASOS_DE_ARRANQUE, QUE_ES } from "./oportunidadVocabulario";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

/** La lista ENTERA, por tramos de 1.000: la base corta ahi aunque se le pida
 *  mas, y sin avisar (28-oct-2026: de 1.652 puestos llegaban 1.000, y faltaban
 *  administradores en el buscador del alta). La ruta debe llevar su `order`. */
async function leerTodo<T>(path: string): Promise<T[]> {
  const todo: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
      headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, Range: `${desde}-${desde + 999}` },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
    const trozo = (await r.json()) as T[];
    todo.push(...trozo);
    if (trozo.length < 1000) return todo;
  }
}

async function crear<T>(tabla: string, fila: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${tabla}`, {
    method: "POST",
    headers: {
      apikey: SECRETO,
      Authorization: `Bearer ${SECRETO}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(fila),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase ${tabla} ${r.status}: ${await r.text()}`);
  const filas = (await r.json()) as T[];
  return filas[0];
}

/** Crea la fila, o si ya esta (segun `conflicto`) la actualiza. Devuelve la fila. */
/** Si el puesto no se puede crear, la persona recien creada se quita: sin
 *  puesto no esta en ningun sitio y solo estorba (28-oct-2026: tres «Antonio
 *  Cerdan» sueltos de tres intentos fallidos). */
async function crearPuestoOQuitarPersona<T>(personaId: string, fila: Record<string, unknown>): Promise<T> {
  try {
    return await crear<T>("puesto", fila);
  } catch (e) {
    await fetch(`${URL_BASE}/rest/v1/persona?id=eq.${personaId}`, {
      method: "DELETE",
      headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
      cache: "no-store",
    }).catch(() => null);
    throw e;
  }
}

async function crearOActualizar<T>(tabla: string, conflicto: string, fila: Record<string, unknown>): Promise<T[]> {
  const r = await fetch(`${URL_BASE}/rest/v1/${tabla}?on_conflict=${conflicto}`, {
    method: "POST",
    headers: {
      apikey: SECRETO,
      Authorization: `Bearer ${SECRETO}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(fila),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase ${tabla} ${r.status}: ${await r.text()}`);
  return (await r.json()) as T[];
}

async function actualizar(consulta: string, cambios: Record<string, unknown>): Promise<void> {
  const r = await fetch(`${URL_BASE}/rest/v1/${consulta}`, {
    method: "PATCH",
    headers: {
      apikey: SECRETO,
      Authorization: `Bearer ${SECRETO}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(cambios),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase PATCH ${consulta} ${r.status}: ${await r.text()}`);
}

const hoy = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------- lo que se elige

export type OpcionSimple = { id: string; nombre: string; pista?: string; usos?: number };

export type OpcionesOportunidad = {
  comerciales: OpcionSimple[];
  /** Si quien rellena es comercial, el suyo sale ya puesto. */
  miComercial: string | null;
  /** El numero que le tocaria a cada comercial. Se enseña EN CUANTO se elige
   *  comercial, porque el comercial quiere VER su numero antes de guardar para
   *  apuntarlo y hacer su seguimiento: si no, es un campo invisible para el
   *  (Monica, 28-sep-2026). El definitivo se asigna al guardar. */
  codigoDe: Record<string, string>;
  canales: Canal[];
  /** Toda la agenda, para "quien me llama" y para el contacto de alli. */
  quienes: OpcionQuien[];
  /** De lo que vendemos, que quieren: la lista curada, sin los agrupadores. */
  tipos: OpcionSimple[];
  /** El administrador es una PERSONA, no una empresa: la empresa es un atributo
   *  suyo, no de la comunidad (Monica, 28-sep-2026). Aqui van las personas con
   *  puesto vivo en una administracion de fincas, con su empresa de pista. */
  administradores: OpcionSimple[];
  /** Las administraciones de fincas: solo para decir en cual entra un
   *  administrador que se crea al vuelo. */
  administraciones: OpcionSimple[];
  /** "¿Ya existe algo ahi?": las CLAVES (direcciones nuestras, con DIR o sin el),
   *  no las comunidades (Monica, 13-oct-2026). */
  claves: OpcionSimple[];
  contratas: OpcionSimple[];
  /** Presidente, vecino... para el contacto de la comunidad. */
  rolesComunidad: OpcionSimple[];
  /** A quien llamo ALLI. La ficha solo puede guardar dos clases: una persona de
   *  una administracion (su puesto) o una persona de la comunidad. */
  contactos: OpcionQuien[];
};

export async function opcionesOportunidad(equipoId?: string, mio?: string | null): Promise<OpcionesOportunidad> {
  const [comerciales, canales, quienes, tipos, admins, claves, contratas, puestos, comunidades, fichas] =
    await Promise.all([
    leer<{ id: string; nombre: string; apellidos: string | null; iniciales: string | null; equipo_id: string | null }[]>(
      "comerciales?select=id,nombre,apellidos,iniciales,equipo_id&activo=eq.true&order=nombre.asc",
    ),
    canalesDe("oportunidad"),
    opcionesQuien(),
    // Solo lo que se contrata DIRECTAMENTE: lo que un cliente pide. El visado,
    // el fin de obra o los tres presupuestos acompañan a un proyecto y aqui solo
    // serian ruido. Y los agrupadores tampoco: si se pudieran elegir, en seis
    // meses habria oportunidades marcadas "Accesibilidad" a secas.
    // Con cuantas oportunidades lo tienen: el desplegable ordena por lo mas
    // pedido (Monica, 7-oct-2026).
    leer<{ id: string; nombre: string; padre: { nombre: string } | null; usos: { count: number }[] }[]>(
      "tipos_proyecto?select=id,nombre,padre:parent_id(nombre),usos:oportunidad_tipos(count)" +
        "&activo=is.true&elegible=is.true&contratable=is.true&order=orden.asc",
    ),
    leerTodo<{ id: string; nombre_accesalia: string; municipio: string | null }>(
      "empresa?select=id,nombre_accesalia,municipio&activa=is.true&tipo=eq.administracion_fincas" +
        "&order=nombre_accesalia.asc,id.asc",
    ),
    listaDeClaves(),
    leer<{ id: string; nombre: string }[]>("contratas?select=id,nombre&order=nombre.asc&limit=500").catch(() => []),
    leerTodo<{
      id: string;
      cargo: string | null;
      persona_id: string | null;
      figura_legal_propietaria_id: string | null;
      persona: { nombre: string } | null;
      empresa: { nombre_accesalia: string; tipo: string | null } | null;
    }>("puesto?select=id,cargo,persona_id,figura_legal_propietaria_id,persona(nombre),empresa(nombre_accesalia,tipo)&hasta=is.null&order=id.asc"),
    // UNA SOLA AGENDA (15-oct-2026): la gente de las comunidades es un puesto que
    // cuelga de la comunidad; su nombre, para la pista.
    leerTodo<{ id: string; nombre: string }>("comunidades?select=id,nombre&order=id.asc").catch(() => []),
    // Lo que sabemos de cada persona, en una linea (Monica, 15-oct-2026).
    fichasCortas().catch(() => null),
  ]);

  // El numero que le toca a cada uno: una sola lectura de los codigos que ya
  // hay, y el correlativo se saca aqui. El de verdad se calcula al guardar.
  const anio = new Date().getFullYear();
  // Solo los de este año: son los unicos que cuentan para el correlativo.
  const yaPuestos = await leerTodo<{ codigo: string }>(
    `oportunidades?select=codigo&codigo=like.*-${anio}-*&order=codigo.desc`,
  ).catch(() => []);
  const codigoDe: Record<string, string> = {};
  for (const c of comerciales) {
    if (!c.iniciales) continue;
    const prefijo = `${c.iniciales}-${anio}-`;
    const suyos = yaPuestos.filter((o) => o.codigo?.startsWith(prefijo));
    const ultimo = suyos.map((o) => Number.parseInt(o.codigo.slice(prefijo.length), 10)).filter(Number.isFinite);
    const n = ultimo.length ? Math.max(...ultimo) : 0;
    codigoDe[c.id] = prefijo + String(n + 1).padStart(3, "0");
  }

  const nombreComunidad = new Map(comunidades.map((c) => [c.id, c.nombre]));
  return {
    comerciales: comerciales.map((c) => ({
      id: c.id,
      nombre: [c.nombre, c.apellidos].filter(Boolean).join(" "),
      pista: c.iniciales ?? undefined,
    })),
    // El que sale puesto: el suyo o el de la cartera que comparte (Alejandra
    // entra con el de Daniel). Lo calcula la sesion; si no lo pasa, el de su
    // ficha de equipo.
    miComercial: mio !== undefined ? mio : (equipoId && comerciales.find((c) => c.equipo_id === equipoId)?.id) || null,
    codigoDe,
    canales,
    quienes,
    tipos: tipos.map((t) => ({ id: t.id, nombre: t.nombre, pista: t.padre?.nombre ?? undefined, usos: t.usos?.[0]?.count ?? 0 })),
    administradores: Object.values(
      Object.fromEntries(
        puestos
          // Tambien los SUELTOS (28-oct-2026): el administrador dado de alta sin su
          // administracion todavia. Si no salen aqui, se vuelven a crear repetidos.
          .filter(
            (p) =>
              (p.empresa?.tipo === "administracion_fincas" || (!p.empresa && !p.figura_legal_propietaria_id && /^administrador/i.test(p.cargo ?? ""))) &&
              p.persona?.nombre &&
              p.persona_id,
          )
          .map((p) => [
            p.persona_id!,
            {
              id: p.persona_id!,
              nombre: p.persona!.nombre,
              pista: fichas?.porPuesto.get(p.id) ?? p.empresa?.nombre_accesalia ?? "sin administración todavía",
            },
          ]),
      ),
    ).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    administraciones: admins.map((a) => ({ id: a.id, nombre: a.nombre_accesalia, pista: a.municipio ?? undefined })),
    claves: claves.map((c) => ({ id: c.id, nombre: c.nombre, pista: c.codigo ?? "sin DIR todavía" })),
    contratas: contratas.map((c) => ({ id: c.id, nombre: c.nombre })),
    rolesComunidad: [
      { id: "presidente", nombre: "Presidente" },
      { id: "vicepresidente", nombre: "Vicepresidente" },
      { id: "secretario", nombre: "Secretario" },
      { id: "vecino", nombre: "Vecino" },
      { id: "otro", nombre: "Otro" },
    ],
    contactos: [
      ...puestos
        .filter((p) => p.persona?.nombre)
        .map((p) => ({
          valor: "puesto:" + p.id,
          texto: p.persona!.nombre,
          pista:
            fichas?.porPuesto.get(p.id) ??
            ([p.cargo, p.empresa?.nombre_accesalia ?? (p.figura_legal_propietaria_id ? nombreComunidad.get(p.figura_legal_propietaria_id) : null)]
              .filter(Boolean)
              .join(" · ") || "sin empresa"),
        }))
        .sort((a, b) => a.texto.localeCompare(b.texto, "es")),
    ],
  };
}

// ------------------------------------------------------------------ el alta

/** Una persona creada en la ventana de "crear un contacto nuevo". Lo que ES
 *  decide DONDE se guarda, que es lo importante, no la etiqueta. */
export type PersonaNueva = {
  nombre: string;
  telefono: string | null;
  correo: string | null;
  /** administrador · contrata · vecino, o vacio si es el "otro" de texto libre. */
  que: string | null;
  /** Lo que escriba cuando no es ninguno de los tres: "comision de obras". */
  otro: string | null;
  contrataId: string | null;
};

export type DatosOportunidad = {
  /** Obligatorio: sin entrada del diario no hay oportunidad. */
  nota: string;
  /** Como se entero: visita, llamada, mail, escrito. Obligatorio (8-oct-2026). */
  canalNota: string;
  /** Quien la escribe, para el texto historico de la nota; manda autor_id. */
  autorNombre: string;
  /** La fecha del CONTACTO, no la de hoy. */
  fechaLlamada: string | null;
  /** Obligatorio: una oportunidad sin comercial es una nota que se pierde. */
  comercialId: string;

  // el hilo
  comunidadId: string | null;
  direccionProvisional: string | null;

  // quien administra la finca: una PERSONA, elegida o creada aqui
  administradorPersonaId: string | null;
  administradorNuevo: PersonaNueva | null;

  // quien ha contactado para pedirlo
  /** El 90% de las veces es el propio administrador. */
  quienEsAdmin: boolean;
  quien: string | null;
  quienNuevo: PersonaNueva | null;

  // con quien hablo de esto a partir de ahora
  mismoQueLlama: boolean;
  contactoEsAdmin: boolean;
  otroNuevo: PersonaNueva | null;

  // lo demas
  tipoIds: string[];
  canalId: string | null;
  /** Por que paso del flujo entramos. */
  pasoArranque: string | null;

  // la ventana "Buscar la direccion" (3-oct-2026)
  /** El que propone la app o lo que escribio el comercial. Se cambia cuando quiera. */
  nombre: string | null;
  /** ficha_catastro_portal.id de lo que el comercial dijo que incluye. */
  portalIds: string[];
  /** Solo con "pendiente hasta la visita": se sabe el edificio, no el alcance. */
  referenciaCatastral: string | null;
  /** La clave a la que se une: la elegida de la lista, o la que comparte
   *  parcela si el comercial dijo "unir" (13-oct-2026). */
  claveUnir: string | null;
  /** EL ADMINISTRADOR DE CADA COMUNIDAD (Monica, 18-oct-2026): lo que decidio el
   *  comercial en el alta para las comunidades que ya existian. «arriba» = el
   *  administrador elegido (o creado) arriba; `cambia` = contesto «si, ha
   *  cambiado» al aviso. Las que no vienen aqui toman el de arriba si no tienen. */
  adminsComunidad?: { comunidadId: string; personaId: string; cambia: boolean }[];
};

export type ResultadoOportunidad = { id: string; codigo: string | null; notaId: string };

/** ALV-2026-032. Las tres letras son del comercial CAPTADOR y no cambian aunque
 *  luego la herede otro: es el DNI que despues viaja al proyecto y al servicio,
 *  y permite trazar de donde viene una subvencion que se cobra dos años mas
 *  tarde. El correlativo es por comercial y año. */
export async function siguienteCodigo(comercialId: string): Promise<string | null> {
  const [c] = await leer<{ iniciales: string | null }[]>(
    `comerciales?select=iniciales&id=eq.${comercialId}&limit=1`,
  );
  const siglas = c?.iniciales;
  if (!siglas) return null; // sin siglas no se inventa un codigo
  const anio = new Date().getFullYear();
  const prefijo = `${siglas}-${anio}-`;
  const ultimas = await leer<{ codigo: string }[]>(
    `oportunidades?select=codigo&codigo=like.${prefijo}*&order=codigo.desc&limit=1`,
  );
  const ultimo = ultimas[0]?.codigo ?? "";
  const n = Number.parseInt(ultimo.slice(prefijo.length), 10);
  return prefijo + String((Number.isFinite(n) ? n : 0) + 1).padStart(3, "0");
}

/** Dar de alta una persona nueva donde le toca segun lo que es (ver el comentario de crearOportunidad). La usan el
 *  alta y la cabecera de la ficha (27-oct-2026): una sola manera de crear a alguien. Devuelve "persona:<id>". */
export async function colocarPersonaNueva(
  n: PersonaNueva | null,
  d: { comunidadId: string | null; comercialId: string | null },
): Promise<string | null> {
  if (!n?.nombre) return null;

  // EL VECINO, A LA AGENDA (Monica, 15-oct-2026: "una sola tabla, la agenda"):
  // persona + puesto que cuelga de la comunidad, con el telefono y el correo en
  // el puesto. Antes iba a personas_comunidad, retirada.
  if (n.que === "vecino" && d.comunidadId) {
    const yaFigura = await leer<{ id_comodin: string }[]>(`figura_legal_propietaria?select=id_comodin&id_comodin=eq.${d.comunidadId}`);
    if (!yaFigura.length) await crear("figura_legal_propietaria", { id_comodin: d.comunidadId, figura: "Comunidad de Propietarios" });
    const per = await crear<{ id: string }>("persona", { nombre: n.nombre, activa: true });
    const pu = await crearPuestoOQuitarPersona<{ id: string }>(per.id, {
      persona_id: per.id,
      figura_legal_propietaria_id: d.comunidadId,
      // Su papel, si se sabe («presidente», «secretaria»); si no, vecino (27-oct-2026).
      cargo: n.otro?.trim() || "Vecino",
      // Sin cargo_clave: la base solo admite «el que manda» (el jefe de una
      // administracion) y «vecino» hacia fallar el alta con 23514 (Oscar, 28-oct-2026).
      telefono_empresa: n.telefono,
      desde: hoy(),
    });
    if (n.correo) await crear("correo", { puesto_id: pu.id, email: n.correo, etiqueta: "general", principal: true });
    return "persona:" + per.id;
  }

  const per = await crear<{ id: string }>("persona", {
    nombre: n.nombre,
    activa: true,
  });
  // El puesto es lo que dice QUE es y de quien es: nace con comercial, para
  // que no quede huerfano. La empresa se pone despues, cuando se sepa; la
  // contrata, en cambio, ya se sabe al elegirla.
  const enContrata = n.que === "contrata" && n.contrataId ? n.contrataId : null;
  const pu = await crearPuestoOQuitarPersona<{ id: string }>(per.id, {
    persona_id: per.id,
    empresa_id: null,
    contrata_id: enContrata,
    cargo: n.otro || CARGO_DE[n.que ?? ""] || null,
    telefono_empresa: n.telefono,
    // El administrador nuevo lo lleva quien lo trae desde el primer dia, sin
    // consolidar hasta su primera hoja firmada; solo direccion lo cambia de
    // manos (Monica, 28-oct-2026).
    comercial_id: enContrata || n.que === "administrador" ? d.comercialId : null,
    comercial_captador_id: d.comercialId,
    desde: hoy(),
  });
  if (n.correo) await crear("correo", { puesto_id: pu.id, email: n.correo, etiqueta: "general", principal: true });
  return "persona:" + per.id;
}


export async function crearOportunidad(
  d: DatosOportunidad,
  autorId: string | null,
): Promise<ResultadoOportunidad> {
  // DONDE ACABA CADA PERSONA QUE SE CREA. Esto es lo unico que decide la
  // casilla de "que es", y por eso esta a la vista en la ventana:
  //   administrador → persona + puesto, SIN empresa: puede existir un admin del
  //     que todavia no sepamos de que administracion es (ella, 28-sep-2026);
  //   contrata      → persona + puesto EN esa contrata. Desde el 5-oct-2026 las
  //     personas de las contratas viven en la agenda unica, como las demas;
  //   vecino        → la persona de la comunidad, si la comunidad ya existe; y
  //     si la direccion es todavia la que se acaba de escribir, se queda como
  //     persona colgando de ESTA oportunidad, que lleva su numero, y se
  //     recoloca cuando la direccion sea de verdad;
  //   otro          → persona + puesto con el cargo que ella escriba.
  //
  // El telefono y el correo van al PUESTO, no a la persona. Ella, 5-oct-2026:
  // "son del puesto salvo que expresamente se diga lo contrario. Son relaciones
  // laborales, no amigos".
  const colocar = (n: PersonaNueva | null) => colocarPersonaNueva(n, { comunidadId: d.comunidadId ?? null, comercialId: d.comercialId ?? null });

  // 1 · las personas que se crean aqui mismo
  const administradorRef = await colocar(d.administradorNuevo);
  const administradorId = administradorRef?.startsWith("persona:")
    ? administradorRef.slice(8)
    : d.administradorPersonaId;

  // 2 · quien ha contactado. Si es el mismo administrador, no se pregunta dos
  //     veces: apunta a esa misma persona.
  let quien = d.quien;
  const quienRef = await colocar(d.quienNuevo);
  if (quienRef) quien = quienRef;
  if (d.quienEsAdmin && administradorId) quien = "persona:" + administradorId;

  // 3 · con quien hablo a partir de ahora
  const otroRef = await colocar(d.otroNuevo);
  const contacto = otroRef ?? (d.mismoQueLlama ? quien : null);
  let contactoPuesto = contacto?.startsWith("puesto:") ? contacto.slice(7) : null;
  if (!contactoPuesto && contacto?.startsWith("persona:")) {
    const pid = contacto.slice(8);
    const [pu] = await leer<{ id: string }[]>(`puesto?select=id&persona_id=eq.${pid}&hasta=is.null&limit=1`);
    contactoPuesto = pu?.id ?? null;
  }
  // Y si con quien hablo es el administrador, se busca SU puesto vigente.
  if (!contactoPuesto && d.contactoEsAdmin && administradorId) {
    const [pu] = await leer<{ id: string }[]>(
      `puesto?select=id&persona_id=eq.${administradorId}&hasta=is.null&limit=1`,
    );
    contactoPuesto = pu?.id ?? null;
  }

  // La BD exige: o contacto de verdad, o provisional. Nunca los dos.
  const hayReal = Boolean(contactoPuesto);
  const prov = !hayReal && d.otroNuevo?.nombre
    ? { nombre: d.otroNuevo.nombre, telefono: d.otroNuevo.telefono, correo: d.otroNuevo.correo }
    : null;

  // El administrador ya no es de la oportunidad (8-oct-2026) sino de su
  // COMUNIDAD (18-oct-2026): se pone al final, cuando la opp ya tiene sus accesos.

  // 4 · el codigo y la oportunidad
  const codigo = await siguienteCodigo(d.comercialId);
  // Sin codigo no nace (Monica, 12-oct-2026): pasa si el comercial no tiene siglas.
  if (!codigo) throw new Error("Ese comercial no tiene siglas: sin ellas no hay código y la oportunidad no puede nacer.");
  const op = await crear<{ id: string }>("oportunidades", {
    codigo,
    // Nace el dia del contacto, no el dia que se apunta: una oportunidad que se
    // registra tarde conserva su fecha (Monica, 5-oct-2026).
    fecha_apertura: d.fechaLlamada ?? hoy(),
    nombre: d.nombre,
    referencia_catastral: d.referenciaCatastral,
    comunidad_id: d.comunidadId,
    comunidad_provisional: d.comunidadId ? null : d.direccionProvisional,
    comercial_id: d.comercialId,
    canal_id: d.canalId,
    estado: "abierta",
    puesto_id: contactoPuesto,
    contacto_provisional: prov?.nombre ?? null,
    telefono_provisional: prov?.telefono ?? null,
    correo_provisional: prov?.correo ?? null,
    ...columnasQuien(quien),
    // El administrador ya NO se guarda en la opp (18-oct-2026): va a su comunidad (paso 11).
    // Lo siguiente que hay que hacer: antes se usaba y se perdia; cuenta para
    // que la oportunidad este completa (8-oct-2026).
    siguiente_paso: ["primer_contacto", "visita", "envio_documentos"].includes(d.pasoArranque ?? "") ? d.pasoArranque : null,
  });

  // 5 · de lo que vendemos, que quieren. Una fila por cada cosa.
  for (const tipoId of d.tipoIds) {
    await crear("oportunidad_tipos", { oportunidad_id: op.id, tipo_id: tipoId });
  }

  // 6 · la primera nota del diario, con la fecha del CONTACTO, quien la escribio
  //     y como se entero. Va al diario de la oportunidad (8-oct-2026: el de la
  //     app es notas_oportunidad; interacciones se congelo). La persona con la
  //     que se habla a partir de ahora va como dato de la nota.
  const nota = await crear<{ id: string }>("notas_oportunidad", {
    oportunidad_id: op.id,
    texto: d.nota,
    fecha: d.fechaLlamada ?? hoy(),
    origen: "persona",
    canal: d.canalNota,
    autor_id: autorId,
    autor: d.autorNombre,
    quien_puesto_id: contactoPuesto,
  });

  // 7 · por donde entramos en el flujo. Los pasos de ANTES no quedan como
  //     hechos, quedan como que NO APLICAN: nos hemos saltado esa parte, y el
  //     diario explica por que. El flujo ya existe, no se inventa aqui.
  if (d.pasoArranque) {
    // Los hitos NO se crean aqui: los crea la base sola, con un disparador, en
    // cuanto nace la oportunidad. Lo que hay que hacer es MARCAR LOS DE ANTES
    // como que no aplican —nos hemos saltado esa parte, y el diario dice por
    // que—. Intentar crearlos otra vez reventaba el alta entera, porque hay una
    // regla que impide repetir el mismo hito (visto en la prueba del 28-sep).
    const hitos = await leer<{ clave: string; orden: number }[]>(
      "hitos_comerciales?select=clave,orden&order=orden.asc",
    );
    const arranque = hitos.find((h) => h.clave === d.pasoArranque);
    const antes = arranque ? hitos.filter((h) => h.orden < arranque.orden).map((h) => h.clave) : [];
    if (antes.length > 0) {
      await actualizar(`hitos_oportunidad?oportunidad_id=eq.${op.id}&hito=in.(${antes.join(",")})`, {
        aplicable: false,
        estado: "no_aplica",
      });
    }
  }

  // 8 · lo que incluye: los portales elegidos en la ventana de Catastro, cada
  //     uno como ACCESO (el atomo: calle + numero + escalera) enlazado a la
  //     oportunidad. Si el acceso ya existia -otra opp, otro año- se reutiliza:
  //     la clave de `accesos` es la direccion, nunca se duplica.
  await enlazarAccesos(
    op.id,
    d.portalIds,
    "Elegido por el comercial en el alta, en la ventana de buscar la dirección en Catastro",
  );
  // 9 · y, con los accesos ya vinculados, su comunidad.
  await comunidadDesdeAccesos(op.id);
  // 10 · y su clave (el sitio, 13-oct-2026): la de su direccion, la que eligio
  //      el comercial (de la lista, o "unir" por compartir parcela), o una nueva.
  await claveDesdeAccesos(op.id, autorId, d.claveUnir);
  // 11 · EL ADMINISTRADOR, A CADA COMUNIDAD (Monica, 18-oct-2026: «el admin no
  //      pertenece a una opp, sino a una comunidad»). Con los accesos ya en su
  //      comunidad, cada una recibe el suyo: el que decidio el comercial en el
  //      alta o, si no dijo nada, el de arriba. Una comunidad que ya tenia otro
  //      solo cambia si el comercial dijo «si, ha cambiado».
  await adminsAComunidades(op.id, administradorId, d.adminsComunidad ?? []).catch((e) => console.error("adminsAComunidades", e));

  // Nace con su estado: si no, no saldria en ninguna lista hasta la noche.
  recalcularLuego(op.id);
  return { id: op.id, codigo, notaId: nota.id };
}

/** LA COMUNIDAD NACE DESDE LA OPP, NUNCA AL REVES (Monica, 13-oct-2026). Se
 *  llama TRAS VINCULAR LOS ACCESOS de Catastro:
 *    - si alguno de sus accesos ya es de una comunidad, la opp es de esa: no se
 *      crea otra;
 *    - si ninguno lo es, nace "CP " + el nombre de la opp, como nombre
 *      provisional (el real y el CIF llegan con la tarjeta CIF).
 *  Un acceso es de UNA sola comunidad (accesos.figura_legal_propietaria_id): los
 *  que aun no tienen titular pasan a ser de la de la opp; el de uno que ya lo
 *  tiene no se toca nunca.
 *  Si los accesos son de VARIAS comunidades, no se elige ninguna: lo decide una
 *  persona. Devuelve la comunidad de la opp, o null. */
export async function comunidadDesdeAccesos(oppId: string): Promise<string | null> {
  const [op] = await leer<{ id: string; nombre: string | null; codigo: string | null; comunidad_id: string | null }[]>(
    `oportunidades?select=id,nombre,codigo,comunidad_id&id=eq.${oppId}&limit=1`,
  );
  if (!op) return null;
  const rels = await leer<{ acceso: { id: string; municipio: string | null; figura_legal_propietaria_id: string | null } | null }[]>(
    `relacion_oportunidad_accesos?select=acceso:acceso_id(id,municipio,figura_legal_propietaria_id)&opp_id=eq.${oppId}&hasta=is.null`,
  );
  const accesos = rels.map((r) => r.acceso).filter((a): a is NonNullable<typeof a> => !!a);
  if (!accesos.length) return op.comunidad_id;

  // Los titulares que ya tienen sus accesos, y de ellos los que son comunidades.
  const titulares = [...new Set(accesos.map((a) => a.figura_legal_propietaria_id).filter((x): x is string => !!x))];
  const comunidades = titulares.length
    ? await leer<{ id: string }[]>(`comunidades?select=id&id=in.(${titulares.join(",")})`)
    : [];

  let comunidadId = op.comunidad_id;
  if (!comunidadId) {
    if (comunidades.length > 1) return null; // de varias comunidades: lo decide una persona
    if (comunidades.length === 1) comunidadId = comunidades[0].id;
    else if (titulares.length) return null; // de un particular o una empresa: no es una CP
    else {
      const nombre = op.nombre?.trim() || op.codigo || "";
      const municipio = accesos.find((a) => a.municipio)?.municipio ?? null;
      const c = await crear<{ id: string }>("comunidades", { nombre: /^CP\s/i.test(nombre) ? nombre : `CP ${nombre}`, municipio });
      await crear("figura_legal_propietaria", { id_comodin: c.id, figura: "Comunidad de Propietarios" });
      comunidadId = c.id;
    }
    await actualizar(`oportunidades?id=eq.${oppId}`, { comunidad_id: comunidadId, comunidad_provisional: null });
  }

  // Sus accesos sin titular pasan a ser de su comunidad. Los que ya tienen uno, no se tocan.
  const sinTitular = accesos.filter((a) => !a.figura_legal_propietaria_id).map((a) => a.id);
  if (sinTitular.length) {
    // Hay comunidades antiguas sin su fila de titular (13-oct-2026: 2.786
    // comunidades, 1.993 titulares): sin ella el acceso no puede apuntarle. Se
    // crea si falta; si ya esta, no se toca (podria ser una mancomunidad).
    const r = await fetch(`${URL_BASE}/rest/v1/figura_legal_propietaria?on_conflict=id_comodin`, {
      method: "POST",
      headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({ id_comodin: comunidadId, figura: "Comunidad de Propietarios" }),
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Supabase figura_legal_propietaria ${r.status}: ${await r.text()}`);
    await actualizar(`accesos?id=in.(${sinTitular.join(",")})&figura_legal_propietaria_id=is.null`, { figura_legal_propietaria_id: comunidadId });
  }
  return comunidadId;
}

/** Los portales elegidos en la ventana de Catastro, como ACCESOS (el atomo:
 *  calle + numero + escalera) enlazados a la oportunidad. Si el acceso ya
 *  existia -otra opp, otro año- se reutiliza: la clave de `accesos` es la
 *  direccion, nunca se duplica. Lo usan el alta y el cambio de direccion. */
export async function enlazarAccesos(oppId: string, portalIds: string[], deDonde: string): Promise<number> {
  return (await enlazarAccesosIds(oppId, portalIds, deDonde)).length;
}

/** Lo mismo, devolviendo los ids de los accesos enlazados.
 *
 *  UN ACCESO QUE YA FUE DE LA OPP SE REABRE, no se crea otra vez (16-oct-2026:
 *  "Direccion mal apuntada, la corrijo" con la misma direccion de Higueras 59
 *  rompia la ficha: la pareja opp-acceso es unica y el enlace cerrado seguia
 *  ahi). Se reabre quitandole el `hasta`; su `de_donde` original se conserva. */
async function enlazarAccesosIds(oppId: string, portalIds: string[], deDonde: string): Promise<string[]> {
  if (portalIds.length === 0) return [];
  type PortalFicha = {
    id: string;
    tipo_via: string | null;
    nombre_via: string | null;
    numero: string;
    escalera: string | null;
    ficha_catastro: { referencia: string; municipio: string | null };
  };
  const portales = await leer<PortalFicha[]>(
    `ficha_catastro_portal?select=id,tipo_via,nombre_via,numero,escalera,ficha_catastro!inner(referencia,municipio)` +
      `&id=in.(${portalIds.map(encodeURIComponent).join(",")})`,
  );
  const ids: string[] = [];
  for (const p of portales) {
    const [acceso] = await crearOActualizar<{ id: string }>(
      "accesos",
      "municipio,tipo_via,nombre_via,numero,escalera",
      {
        municipio: p.ficha_catastro.municipio ?? "",
        tipo_via: p.tipo_via ?? "",
        nombre_via: p.nombre_via ?? "",
        numero: p.numero,
        escalera: p.escalera ?? "",
        ref_catastral: p.ficha_catastro.referencia,
        ficha_catastro_portal_id: p.id,
      },
    );
    const [ya] = await leer<{ hasta: string | null }[]>(
      `relacion_oportunidad_accesos?select=hasta&opp_id=eq.${oppId}&acceso_id=eq.${acceso.id}&limit=1`,
    );
    if (!ya) await crear("relacion_oportunidad_accesos", { opp_id: oppId, acceso_id: acceso.id, de_donde: deDonde });
    else if (ya.hasta) await actualizar(`relacion_oportunidad_accesos?opp_id=eq.${oppId}&acceso_id=eq.${acceso.id}`, { hasta: null });
    ids.push(acceso.id);
  }
  return ids;
}

/** UNA DIRECCION QUE YA TENEMOS (una clave), elegida en el satelite (28-oct-2026):
 *  la opp nace con sus accesos, su comunidad y su clave, sin pasar por Catastro,
 *  porque esa direccion ya se confirmo. Devuelve cuantos accesos enlazo. */
export async function enlazarClaveExistente(oppId: string, claveId: string, autorId: string | null): Promise<number> {
  if (!/^[0-9a-f-]{36}$/.test(claveId)) return 0;
  const [c] = await leer<{ id: string; absorbida_por: string | null }[]>(`claves?select=id,absorbida_por&id=eq.${claveId}&limit=1`);
  if (!c) return 0;
  const clave = c.absorbida_por ?? c.id;
  const accesos = await leer<{ id: string }[]>(`accesos?select=id&clave_id=eq.${clave}`);
  for (const a of accesos) {
    const [ya] = await leer<{ hasta: string | null }[]>(`relacion_oportunidad_accesos?select=hasta&opp_id=eq.${oppId}&acceso_id=eq.${a.id}&limit=1`);
    if (!ya) await crear("relacion_oportunidad_accesos", { opp_id: oppId, acceso_id: a.id, de_donde: "Dirección que ya teníamos, elegida en el satélite" });
  }
  if (accesos.length) {
    await comunidadDesdeAccesos(oppId);
    await claveDesdeAccesos(oppId, autorId, clave);
  }
  return accesos.length;
}

/** BUSCAR O CAMBIAR LA DIRECCION de una oportunidad ya creada (Monica,
 *  5-oct-2026). Dos casos, y los dos pasan mucho: se dejo provisional en el
 *  alta, o la direccion era otra -"nos dicen una calle de Parla y resulta que
 *  es Fuenlabrada; la persona que nos llama, sobre todo si es comercial de
 *  ascensores, suele dar los datos mal"-.
 *
 *  Los accesos de antes NO se borran: se cierran con fecha (`hasta`), para que
 *  quede rastro de que hubo otra direccion. */
export async function cambiarDireccion(
  oppId: string,
  r: { nombre: string; portalIds: string[]; parcela: string | null; unirA?: string | null },
): Promise<void> {
  const [op] = await leer<{ comunidad_id: string | null }[]>(`oportunidades?select=comunidad_id&id=eq.${oppId}&limit=1`);
  if (!op) throw new Error("No existe esa oportunidad");

  // Primero se enlazan los elegidos y despues se cierran SOLO los que ya no
  // estan (16-oct-2026): si algo falla a medias, la opp nunca se queda sin
  // accesos, y un portal que se vuelve a elegir sigue abierto.
  const nuevos = await enlazarAccesosIds(oppId, r.portalIds, "Buscada o cambiada en la ficha de la oportunidad, en la ventana de Catastro");
  await actualizar(
    `relacion_oportunidad_accesos?opp_id=eq.${oppId}&hasta=is.null` + (nuevos.length ? `&acceso_id=not.in.(${nuevos.join(",")})` : ""),
    { hasta: hoy() },
  );
  await actualizar(`oportunidades?id=eq.${oppId}`, {
    nombre: r.nombre,
    referencia_catastral: r.parcela,
    // Sin comunidad, el nombre provisional es lo unico que la nombra.
    ...(op.comunidad_id ? {} : { comunidad_provisional: r.nombre }),
  });
  // Con los accesos ya vinculados, su comunidad (13-oct-2026): la que ya tengan
  // sus accesos, o "CP " + su nombre si no tiene. Si ya tenia, no cambia.
  await comunidadDesdeAccesos(oppId);
  // Y su clave (13-oct-2026): la de su direccion, la que se eligio unir, o una nueva.
  await claveDesdeAccesos(oppId, null, r.unirA ?? null);
}

// ------------------------------------------- ¿ya hay una opp aqui?

export type OppViva = { id: string; codigo: string | null; nombre: string; comercial: string | null; estado: string };

/** LAS OPPS VIVAS (abiertas o pausadas) DE ESE EDIFICIO, para avisar al dar de
 *  alta (Monica, 16-oct-2026): Valladolid 13 se dio de alta dos veces, una de
 *  Alvaro y otra de Daniel. Avisa, NO bloquea: una comunidad puede tener varias
 *  opps a la vez (un proyecto y su subvencion). El edificio se busca por los
 *  portales elegidos, por la parcela y por la clave a la que se une. */
export async function oppsVivasEnElEdificio(d: { portalIds: string[]; parcela: string | null; clave: string | null }): Promise<OppViva[]> {
  const ors: string[] = [];
  if (d.portalIds.length) ors.push(`ficha_catastro_portal_id.in.(${d.portalIds.join(",")})`);
  if (d.parcela) ors.push(`ref_catastral.eq.${encodeURIComponent(d.parcela)}`);
  if (d.clave) ors.push(`clave_id.eq.${d.clave}`);
  if (!ors.length) return [];
  type Fila = { opps: { opp: { id: string; codigo: string | null; nombre: string | null; estado: string; comercial: { nombre: string } | null } | null; hasta: string | null }[] };
  const filas = await leer<Fila[]>(
    `accesos?select=opps:relacion_oportunidad_accesos(hasta,opp:opp_id(id,codigo,nombre,estado,comercial:comercial_id(nombre)))&or=(${ors.join(",")})`,
  );
  const vivas = new Map<string, OppViva>();
  for (const f of filas)
    for (const r of f.opps)
      if (!r.hasta && r.opp && (r.opp.estado === "abierta" || r.opp.estado === "pausada"))
        vivas.set(r.opp.id, { id: r.opp.id, codigo: r.opp.codigo, nombre: r.opp.nombre ?? r.opp.codigo ?? "", comercial: r.opp.comercial?.nombre ?? null, estado: r.opp.estado });
  return [...vivas.values()];
}


/** El administrador de cada comunidad de una opp recien creada (18-oct-2026).
 *  `arriba` es la persona elegida o creada en el campo «El administrador». */
async function adminsAComunidades(
  oppId: string,
  arriba: string | null,
  decididos: { comunidadId: string; personaId: string; cambia: boolean }[],
): Promise<void> {
  for (const c of await comunidadesDeOpp(oppId)) {
    const d = decididos.find((x) => x.comunidadId === c.id);
    const persona = d ? (d.personaId === "arriba" ? arriba : d.personaId) : arriba;
    if (!persona) continue;
    // Sin decision del comercial, una comunidad que ya tiene administrador no se toca.
    await ponerAdministrador(c.id, persona, { cambia: d?.cambia ?? false, nota: "Puesto en el alta de una oportunidad (18-oct-2026: el administrador es de la comunidad)." });
  }
}
