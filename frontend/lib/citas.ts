// lib/citas.ts
//
// LA AGENDA DE LA APP: SUS CITAS (Monica, 14-oct-2026). Tabla `citas`, con su tipo
// (catalogo `tipos_cita`), su hora y su duracion. La agenda de la app manda; a
// Google se copiara solo la cita y un enlace (decidido el 9-oct).
//
// La primera: la VISITA DE ESCANEO con Polycam. La cierra el comercial, con
// fecha Y HORA. Una por opp: si se cambia, se sobrescribe, sin historial. Si nunca
// se apunta, no pasa nada: la fecha del escaneo sera la del Polycam que llegue al
// buzon.

import "server-only";
import { nombreDeOpp } from "./direccionOpp";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${ruta.split("?")[0]} ${r.status}: ${await r.text()}`);
  return (r.status === 204 || r.headers.get("content-length") === "0" ? null : await r.json()) as T;
}

export type Cita = {
  id: string; tipo: string; oportunidadId: string | null; inicio: string; minutos: number; asunto: string;
  /** PARA QUE voy / llamo / vienen: obligatorio, sale en la raya de la agenda. */
  paraQue: string;
  deQuien: string | null;
};

/** "2026-10-20T10:30", la hora de Madrid que se elige en pantalla -> el instante
 *  exacto (con su desfase de verano o invierno). */
export function deHoraMadrid(local: string): string {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) throw new Error("Fecha y hora no válidas.");
  const [, a, mes, d, h, min] = m.map(Number);
  const comoUtc = Date.UTC(a, mes - 1, d, h, min);
  // Cuanto adelanta Madrid a UTC en un instante.
  const desfase = (t: number) => {
    const partes = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(new Date(t));
    const p = (x: string) => Number(partes.find((y) => y.type === x)?.value);
    return Date.UTC(p("year"), p("month") - 1, p("day"), p("hour") % 24, p("minute")) - t;
  };
  // Dos pasadas: el desfase se mira en el instante bueno, no en el de partida
  // (si no, la noche del cambio de hora sale una hora movida).
  const primera = comoUtc - desfase(comoUtc);
  return new Date(comoUtc - desfase(primera)).toISOString();
}

/** El instante -> "2026-10-20T10:30" en hora de Madrid, para la casilla. */
export function aHoraMadrid(iso: string): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const p = (t: string) => partes.find((x) => x.type === t)?.value ?? "";
  return `${p("year")}-${p("month")}-${p("day")}T${p("hour") === "24" ? "00" : p("hour")}:${p("minute")}`;
}

type Fila = { id: string; tipo: string; oportunidad_id: string | null; inicio: string; minutos: number; asunto: string; para_que: string; de_quien: string | null };
const aCita = (f: Fila): Cita => ({
  id: f.id, tipo: f.tipo, oportunidadId: f.oportunidad_id, inicio: f.inicio, minutos: f.minutos, asunto: f.asunto, paraQue: f.para_que, deQuien: f.de_quien,
});
const SEL = "id,tipo,oportunidad_id,inicio,minutos,asunto,para_que,de_quien";

/** "ascensor, rampa y fotovoltaica". */
const enLista = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} y ${xs.at(-1)}` : xs[0] ?? "");

/** La visita de escaneo de una opp, si se apunto. */
export async function escaneoDe(oppId: string): Promise<Cita | null> {
  const [f] = await pedir<Fila[]>(`citas?select=${SEL}&tipo=eq.escaneo_polycam&oportunidad_id=eq.${oppId}`);
  return f ? aCita(f) : null;
}

/** Apunta (o mueve) la visita de escaneo de una opp. `local` es la fecha y hora
 *  de Madrid elegida en pantalla. Sale en la agenda de su comercial, o en la de
 *  quien la apunta si la opp no tiene. */
export async function guardarEscaneo(oppId: string, local: string, quien: string): Promise<Cita> {
  if (!/^[0-9a-f-]{36}$/.test(oppId)) throw new Error("Oportunidad no válida.");
  const inicio = deHoraMadrid(local);
  const [opp] = await pedir<{ codigo: string | null; nombre: string | null; comercial: { equipo_id: string | null } | null }[]>(
    `oportunidades?select=codigo,nombre,comercial:comercial_id(equipo_id)&id=eq.${oppId}`,
  );
  if (!opp) throw new Error("No existe esa oportunidad.");
  const ya = await escaneoDe(oppId);
  if (ya) {
    const [f] = await pedir<Fila[]>(`citas?id=eq.${ya.id}&select=${SEL}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ inicio, apuntada_por: quien, actualizado_en: new Date().toISOString() }),
    });
    return aCita(f);
  }
  const [[tipo], intereses] = await Promise.all([
    pedir<{ minutos_defecto: number; plantilla_para_que: string | null }[]>("tipos_cita?select=minutos_defecto,plantilla_para_que&clave=eq.escaneo_polycam"),
    pedir<{ tipo: { nombre: string } | null }[]>(`oportunidad_tipos?select=tipo:tipo_id(nombre)&oportunidad_id=eq.${oppId}`),
  ]);
  // EL PARA QUE, propuesto por la plantilla del tipo con lo que sabemos de la
  // opp (14-oct-2026). Con quien ha quedado no se copia aqui: sale de su ficha,
  // siempre al dia.
  const queQuieren = enLista(intereses.map((x) => x.tipo?.nombre.toLowerCase()).filter((x): x is string => !!x)) || "lo que piden";
  const paraQue = (tipo?.plantilla_para_que ?? "Escanear con Polycam.").replace("{intereses}", queQuieren);
  const [f] = await pedir<Fila[]>(`citas?select=${SEL}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      tipo: "escaneo_polycam",
      oportunidad_id: oppId,
      inicio,
      minutos: tipo?.minutos_defecto ?? 90,
      asunto: `Escaneo Polycam · ${nombreDeOpp(opp)}`,
      para_que: paraQue,
      direccion: nombreDeOpp(opp),
      de_quien: opp.comercial?.equipo_id ?? quien,
      apuntada_por: quien,
    }),
  });
  return aCita(f);
}

// ------------------------------------------------------------ la pagina del dia

/** Una cita tal como la pinta la agenda: con su "para que", de que es, con quien
 *  (compuesto al leer, siempre al dia: nombre, telefono y papel) y sus adjuntos. */
export type CitaDelDia = Cita & {
  tipoNombre: string;
  fin: string;
  estado: "pendiente" | "hecha" | "anulada";
  direccion: string | null;
  notas: string | null;
  origen: "persona" | "app";
  /** De que es: la opp (con su codigo), la comunidad, la administracion o la persona. */
  deQue: { tipo: "opp" | "comunidad" | "administracion" | "persona"; id: string; texto: string; codigo?: string | null } | null;
  conQuien: { nombre: string; telefono: string | null; papel: string | null }[];
  adjuntos: { tipo: "fichero" | "hoja" | "viabilidad" | "presupuesto" | "documento"; id: string; nombre: string }[];
};

/** "2026-10-20" -> el dia siguiente, sin liarse con horas ni zonas. */
const diaSiguiente = (dia: string) => new Date(Date.parse(`${dia}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);

/** Las citas de un DIA (en hora de Madrid), por orden de hora. Con `deQuien`, solo
 *  las de esa persona del equipo (su agenda); sin el, las de todos. Las anuladas
 *  vienen tambien: la pantalla decide si las enseña tachadas o no. */
export async function citasDelDia(dia: string, deQuien?: string): Promise<CitaDelDia[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw new Error("Día no válido.");
  const desde = deHoraMadrid(`${dia}T00:00`);
  const hasta = deHoraMadrid(`${diaSiguiente(dia)}T00:00`);
  const filas = await pedir<(Fila & {
    estado: CitaDelDia["estado"]; direccion: string | null; notas: string | null; origen: CitaDelDia["origen"];
    tipo_cita: { nombre: string } | null;
    opp: { id: string; codigo: string | null; nombre: string | null } | null;
    comunidad: { id: string; nombre: string } | null;
    empresa: { id: string; nombre_accesalia: string | null; nombre_legal: string | null } | null;
    persona: { id: string; nombre: string; apellidos: string | null } | null;
    con: { nombre: string | null; telefono: string | null; papel: string | null;
           persona: { nombre: string; apellidos: string | null; telefono_personal: string | null } | null;
           puesto: { cargo: string | null; telefono_empresa: string | null } | null;
           pc: { nombre: string | null; telefono: string | null; rol: string | null } | null }[];
    adj: { id: string; ruta_almacen: string | null; nombre: string | null; hoja_encargo_id: string | null; viabilidad_id: string | null;
           presupuesto_id: string | null; documento_id: string | null;
           hoja: { numero_hoja: string | null } | null; viabilidad: { numero: string | null } | null; presupuesto: { codigo: string | null } | null }[];
  })[]>(
    `citas?select=${SEL},estado,direccion,notas,origen,tipo_cita:tipo(nombre),` +
      `opp:oportunidad_id(id,codigo,nombre),comunidad:comunidad_id(id,nombre),empresa:empresa_id(id,nombre_accesalia,nombre_legal),` +
      `persona:persona_id(id,nombre,apellidos),` +
      `con:citas_con_quien(nombre,telefono,papel,persona:persona_id(nombre,apellidos,telefono_personal),puesto:puesto_id(cargo,telefono_empresa),pc:persona_comunidad_id(nombre,telefono,rol)),` +
      `adj:citas_adjuntos(id,ruta_almacen,nombre,hoja_encargo_id,viabilidad_id,presupuesto_id,documento_id,` +
      `hoja:hoja_encargo_id(numero_hoja),viabilidad:viabilidad_id(numero),presupuesto:presupuesto_id(codigo))` +
      `&inicio=gte.${desde}&inicio=lt.${hasta}${deQuien ? `&de_quien=eq.${deQuien}` : ""}&order=inicio.asc`,
  );
  return filas.map((f) => ({
    ...aCita(f),
    tipoNombre: f.tipo_cita?.nombre ?? f.tipo,
    fin: new Date(Date.parse(f.inicio) + f.minutos * 60000).toISOString(),
    estado: f.estado,
    direccion: f.direccion,
    notas: f.notas,
    origen: f.origen,
    deQue: f.opp
      ? { tipo: "opp", id: f.opp.id, texto: nombreDeOpp(f.opp), codigo: f.opp.codigo }
      : f.comunidad
        ? { tipo: "comunidad", id: f.comunidad.id, texto: f.comunidad.nombre }
        : f.empresa
          ? { tipo: "administracion", id: f.empresa.id, texto: f.empresa.nombre_accesalia ?? f.empresa.nombre_legal ?? "Administración" }
          : f.persona
            ? { tipo: "persona", id: f.persona.id, texto: [f.persona.nombre, f.persona.apellidos].filter(Boolean).join(" ") }
            : null,
    // Con quien: de su ficha si esta en la agenda (el telefono es el del puesto,
    // y si no el personal); si no, lo escrito a mano.
    conQuien: f.con.map((c) => ({
      nombre: c.persona ? [c.persona.nombre, c.persona.apellidos].filter(Boolean).join(" ") : c.pc?.nombre ?? c.nombre ?? "",
      telefono: c.puesto?.telefono_empresa ?? c.persona?.telefono_personal ?? c.pc?.telefono ?? c.telefono,
      papel: c.papel ?? c.puesto?.cargo ?? c.pc?.rol ?? null,
    })),
    adjuntos: f.adj.map((a) =>
      a.hoja_encargo_id
        ? { tipo: "hoja" as const, id: a.hoja_encargo_id, nombre: a.nombre ?? `Hoja de encargo ${a.hoja?.numero_hoja ?? ""}`.trim() }
        : a.viabilidad_id
          ? { tipo: "viabilidad" as const, id: a.viabilidad_id, nombre: a.nombre ?? `Viabilidad ${a.viabilidad?.numero ?? ""}`.trim() }
          : a.presupuesto_id
            ? { tipo: "presupuesto" as const, id: a.presupuesto_id, nombre: a.nombre ?? `Presupuesto ${a.presupuesto?.codigo ?? ""}`.trim() }
            : a.documento_id
              ? { tipo: "documento" as const, id: a.documento_id, nombre: a.nombre ?? "Documento" }
              : { tipo: "fichero" as const, id: a.id, nombre: a.nombre ?? a.ruta_almacen ?? "Fichero" },
    ),
  }));
}

// ------------------------------------------------- el Polycam que ha llegado

/** EL POLYCAM DE UNA OPP (Monica, 14-oct-2026): lo que la ficha enseña como
 *  "Recibido", solo lectura; lo escribe la app al llegar el correo al buzon.
 *  Un escaneo es de la opp si cuelga de sus accesos (lo coloca el buzon) o de una
 *  viabilidad suya (lo coloca la mesa al empezarla).
 *    recibido = el dia que llego al buzon (el del correo; si no, el de su alta).
 *    fechaEscaneo = el dia del escaneo: la visita agendada si la hay; si no, la
 *      que trae el nombre del fichero; si no, el dia que llego ("se coge esa
 *      fecha como la del escaneo, para que quede reflejado cuando se escaneo"). */
export async function polycamDe(oppId: string): Promise<{ recibido: string; fechaEscaneo: string; cuantos: number } | null> {
  if (!/^[0-9a-f-]{36}$/.test(oppId)) return null;
  type Esc = { id: string; fecha: string | null; fecha_escaneo: string | null; creado_en: string };
  const SEL_ESC = "id,fecha,fecha_escaneo,creado_en";
  const [accesos, viabs, cita] = await Promise.all([
    pedir<{ acceso_id: string }[]>(`relacion_oportunidad_accesos?select=acceso_id&opp_id=eq.${oppId}&hasta=is.null`),
    pedir<{ id: string }[]>(`viabilidades?select=id&oportunidad_id=eq.${oppId}`),
    escaneoDe(oppId),
  ]);
  const [porAcceso, porViab] = await Promise.all([
    accesos.length
      ? pedir<{ esc: Esc | null }[]>(`relacion_polycam_acceso?select=esc:polycam_id(${SEL_ESC})&acceso_id=in.(${accesos.map((a) => a.acceso_id).join(",")})`)
      : Promise.resolve([]),
    viabs.length ? pedir<Esc[]>(`escaneados_polycam?select=${SEL_ESC}&viabilidad_id=in.(${viabs.map((v) => v.id).join(",")})`) : Promise.resolve([]),
  ]);
  const todos = new Map<string, Esc>();
  for (const e of [...porAcceso.map((x) => x.esc), ...porViab]) if (e) todos.set(e.id, e);
  if (!todos.size) return null;
  const llegada = (e: Esc) => (e.fecha ?? e.creado_en).slice(0, 10);
  const primero = [...todos.values()].sort((a, b) => llegada(a).localeCompare(llegada(b)))[0];
  return {
    recibido: llegada(primero),
    fechaEscaneo: cita ? aHoraMadrid(cita.inicio).slice(0, 10) : primero.fecha_escaneo ?? llegada(primero),
    cuantos: todos.size,
  };
}

// ------------------------------------------------------------ crear una cita

/** Con quien, tal como llega del formulario: alguien de la agenda (lo que
 *  devuelve proponerPersonas de lib/llamadas.ts: un puesto, una persona suelta o
 *  un contacto de comunidad) o escrito a mano. */
export type ConQuienNuevo =
  | { tipo: "puesto" | "persona" | "persona_comunidad"; id: string; papel?: string | null }
  | { tipo: "a_mano"; nombre: string; telefono?: string | null; papel?: string | null };

export type CitaNueva = {
  /** "AAAA-MM-DDTHH:MM" en hora de Madrid. */
  local: string;
  minutos?: number | null;
  /** Por defecto "cita" (60 min). */
  tipo?: string | null;
  asunto: string;
  paraQue: string;
  direccion: string;
  notas?: string | null;
  conQuien: ConQuienNuevo[];
  /** En la agenda de quien sale (equipo.id). */
  deQuien: string;
  /** De que es, opcional. */
  oportunidadId?: string | null;
};

/** Crea una cita apuntada por una persona. Lo obligatorio, aqui y no solo en la
 *  pantalla: fecha y hora, titulo, PARA QUE, donde y al menos un con quien. */
export async function crearCita(c: CitaNueva, quien: string): Promise<string> {
  const limpio = (x: string | null | undefined) => (x ?? "").trim();
  if (!limpio(c.asunto)) throw new Error("Falta el título.");
  if (!limpio(c.paraQue)) throw new Error("Falta el para qué.");
  if (!limpio(c.direccion)) throw new Error("Falta el dónde.");
  if (!c.conQuien.length || c.conQuien.some((x) => x.tipo === "a_mano" && !limpio(x.nombre))) throw new Error("Falta con quién.");
  if (!/^[0-9a-f-]{36}$/.test(c.deQuien)) throw new Error("Falta de quién es la agenda.");
  const tipo = limpio(c.tipo) || "cita";
  const [t] = await pedir<{ minutos_defecto: number }[]>(`tipos_cita?select=minutos_defecto&clave=eq.${encodeURIComponent(tipo)}&activo=is.true`);
  if (!t) throw new Error("Tipo de cita no válido.");
  const minutos = c.minutos && c.minutos > 0 ? Math.round(c.minutos) : t.minutos_defecto;
  const [f] = await pedir<{ id: string }[]>("citas?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      tipo,
      inicio: deHoraMadrid(c.local),
      minutos,
      asunto: limpio(c.asunto),
      para_que: limpio(c.paraQue),
      direccion: limpio(c.direccion),
      notas: limpio(c.notas) || null,
      oportunidad_id: c.oportunidadId || null,
      de_quien: c.deQuien,
      apuntada_por: quien,
      origen: "persona",
    }),
  });
  // Un puesto lleva su persona: asi la cita encuentra a la persona aunque cambie de puesto.
  const puestos = c.conQuien.filter((x) => x.tipo === "puesto").map((x) => (x as { id: string }).id);
  const personaDe = new Map(
    puestos.length
      ? (await pedir<{ id: string; persona_id: string | null }[]>(`puesto?select=id,persona_id&id=in.(${puestos.join(",")})`)).map((p) => [p.id, p.persona_id])
      : [],
  );
  await pedir("citas_con_quien", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(
      c.conQuien.map((x) =>
        x.tipo === "a_mano"
          ? { cita_id: f.id, nombre: limpio(x.nombre), telefono: limpio(x.telefono) || null, papel: limpio(x.papel) || null }
          : {
              cita_id: f.id,
              persona_id: x.tipo === "persona" ? x.id : x.tipo === "puesto" ? personaDe.get(x.id) ?? null : null,
              puesto_id: x.tipo === "puesto" ? x.id : null,
              persona_comunidad_id: x.tipo === "persona_comunidad" ? x.id : null,
              papel: limpio(x.papel) || null,
            },
      ),
    ),
  });
  return f.id;
}

/** Quien puede tocar una cita o apuntar en una agenda: la persona de esa agenda,
 *  quien la apunto, direccion y la secretaria comercial. */
export async function puedeTocarCita(yo: { id: string; veTodo: boolean; funciones: { clave: string }[] }, citaId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(citaId)) return false;
  if (yo.veTodo || yo.funciones.some((f) => f.clave === "secretaria")) return true;
  const [c] = await pedir<{ de_quien: string | null; apuntada_por: string | null }[]>(`citas?select=de_quien,apuntada_por&id=eq.${citaId}`);
  return !!c && (c.de_quien === yo.id || c.apuntada_por === yo.id);
}

// ------------------------------------------------------------ los adjuntos

const ALMACEN = "documentos-comerciales";
const limpioFichero = (n: string) =>
  n.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").slice(-80) || "fichero";
const CAB_ALMACEN = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const PUBLICA = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_BASE;

/** Permiso de un solo uso para que el navegador suba un fichero de la cita al
 *  almacen (como la hoja firmada): PUT del fichero a `url`. Despues, apuntarAdjunto. */
export async function permisoAdjunto(citaId: string, nombre: string): Promise<{ ruta: string; url: string }> {
  const ruta = `citas/${citaId}/${crypto.randomUUID().slice(0, 8)}-${limpioFichero(nombre)}`;
  const r = await fetch(`${URL_BASE}/storage/v1/object/upload/sign/${ALMACEN}/${ruta}`, { method: "POST", headers: CAB_ALMACEN, cache: "no-store" });
  if (!r.ok) throw new Error(`Almacén ${r.status}: ${await r.text()}`);
  const { url } = (await r.json()) as { url: string };
  return { ruta, url: `${PUBLICA()}/storage/v1${url}` };
}

/** Ya subido: queda en la cita. */
export async function apuntarAdjunto(citaId: string, ruta: string, nombre: string): Promise<string> {
  if (!ruta.startsWith(`citas/${citaId}/`)) throw new Error("Ese fichero no es de esta cita.");
  const info = await fetch(`${URL_BASE}/storage/v1/object/info/${ALMACEN}/${ruta}`, { headers: CAB_ALMACEN, cache: "no-store" });
  if (!info.ok) throw new Error("El fichero no ha llegado al almacén.");
  const [f] = await pedir<{ id: string }[]>("citas_adjuntos?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ cita_id: citaId, ruta_almacen: `${ALMACEN}/${ruta}`, nombre: nombre.trim() || null }),
  });
  return f.id;
}

/** Enlace para abrir un adjunto de tipo fichero. Caduca en diez minutos. */
export async function enlaceAdjunto(adjuntoId: string): Promise<{ citaId: string; url: string } | null> {
  if (!/^[0-9a-f-]{36}$/.test(adjuntoId)) return null;
  const [a] = await pedir<{ cita_id: string; ruta_almacen: string | null }[]>(`citas_adjuntos?select=cita_id,ruta_almacen&id=eq.${adjuntoId}`);
  if (!a?.ruta_almacen) return null;
  const r = await fetch(`${URL_BASE}/storage/v1/object/sign/${a.ruta_almacen}`, {
    method: "POST",
    headers: { ...CAB_ALMACEN, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 600 }),
    cache: "no-store",
  });
  if (!r.ok) return null;
  const { signedURL } = (await r.json()) as { signedURL: string };
  return { citaId: a.cita_id, url: `${PUBLICA()}/storage/v1${signedURL}` };
}
