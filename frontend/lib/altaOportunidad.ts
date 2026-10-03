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

import { canalesDe, type Canal } from "./canales";
import { columnasQuien, opcionesQuien, type OpcionQuien } from "./quien";
import { CARGO_DE } from "./oportunidadVocabulario";

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

export type OpcionSimple = { id: string; nombre: string; pista?: string };

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
  comunidades: OpcionSimple[];
  contratas: OpcionSimple[];
  /** Presidente, vecino... para el contacto de la comunidad. */
  rolesComunidad: OpcionSimple[];
  /** A quien llamo ALLI. La ficha solo puede guardar dos clases: una persona de
   *  una administracion (su puesto) o una persona de la comunidad. */
  contactos: OpcionQuien[];
};

export async function opcionesOportunidad(equipoId?: string): Promise<OpcionesOportunidad> {
  const [comerciales, canales, quienes, tipos, admins, comunidades, contratas, puestos, vecinos] =
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
    leer<{ id: string; nombre: string; padre: { nombre: string } | null }[]>(
      "tipos_proyecto?select=id,nombre,padre:parent_id(nombre)" +
        "&activo=is.true&elegible=is.true&contratable=is.true&order=orden.asc",
    ),
    leer<{ id: string; nombre_accesalia: string; municipio: string | null }[]>(
      "empresa?select=id,nombre_accesalia,municipio&activa=is.true&tipo=eq.administracion_fincas" +
        "&order=nombre_accesalia.asc&limit=2000",
    ),
    leer<{ id: string; nombre: string; municipio: string | null }[]>(
      "comunidades?select=id,nombre,municipio&order=nombre.asc&limit=3000",
    ),
    leer<{ id: string; nombre: string }[]>("contratas?select=id,nombre&order=nombre.asc&limit=500").catch(() => []),
    leer<{
      id: string;
      cargo: string | null;
      persona_id: string | null;
      persona: { nombre: string } | null;
      empresa: { nombre_accesalia: string; tipo: string | null } | null;
    }[]>("puesto?select=id,cargo,persona_id,persona(nombre),empresa(nombre_accesalia,tipo)&hasta=is.null&limit=3000"),
    leer<{ id: string; nombre: string; rol: string | null; comunidad: { nombre: string } | null }[]>(
      "personas_comunidad?select=id,nombre,rol,comunidad:comunidad_id(nombre)&order=nombre.asc&limit=3000",
    ).catch(() => []),
  ]);

  // El numero que le toca a cada uno: una sola lectura de los codigos que ya
  // hay, y el correlativo se saca aqui. El de verdad se calcula al guardar.
  const anio = new Date().getFullYear();
  const yaPuestos = await leer<{ codigo: string }[]>(
    `oportunidades?select=codigo&codigo=not.is.null&order=codigo.desc&limit=3000`,
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

  return {
    comerciales: comerciales.map((c) => ({
      id: c.id,
      nombre: [c.nombre, c.apellidos].filter(Boolean).join(" "),
      pista: c.iniciales ?? undefined,
    })),
    miComercial: (equipoId && comerciales.find((c) => c.equipo_id === equipoId)?.id) || null,
    codigoDe,
    canales,
    quienes,
    tipos: tipos.map((t) => ({ id: t.id, nombre: t.nombre, pista: t.padre?.nombre ?? undefined })),
    administradores: Object.values(
      Object.fromEntries(
        puestos
          .filter((p) => p.empresa?.tipo === "administracion_fincas" && p.persona?.nombre && p.persona_id)
          .map((p) => [
            p.persona_id!,
            { id: p.persona_id!, nombre: p.persona!.nombre, pista: p.empresa!.nombre_accesalia },
          ]),
      ),
    ).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    administraciones: admins.map((a) => ({ id: a.id, nombre: a.nombre_accesalia, pista: a.municipio ?? undefined })),
    comunidades: comunidades.map((c) => ({ id: c.id, nombre: c.nombre, pista: c.municipio ?? undefined })),
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
          pista: [p.cargo, p.empresa?.nombre_accesalia].filter(Boolean).join(" · ") || "sin empresa",
        }))
        .sort((a, b) => a.texto.localeCompare(b.texto, "es")),
      ...vecinos.map((v) => ({
        valor: "vecino:" + v.id,
        texto: v.nombre,
        pista: [v.rol, v.comunidad?.nombre].filter(Boolean).join(" · ") || "de la comunidad",
      })),
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
};

export type ResultadoOportunidad = { id: string; codigo: string | null };

/** ALV-2026-032. Las tres letras son del comercial CAPTADOR y no cambian aunque
 *  luego la herede otro: es el DNI que despues viaja al proyecto y al servicio,
 *  y permite trazar de donde viene una subvencion que se cobra dos años mas
 *  tarde. El correlativo es por comercial y año. */
async function siguienteCodigo(comercialId: string): Promise<string | null> {
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

export async function crearOportunidad(
  d: DatosOportunidad,
  autorId: string | null,
): Promise<ResultadoOportunidad> {
  // DONDE ACABA CADA PERSONA QUE SE CREA. Esto es lo unico que decide la
  // casilla de "que es", y por eso esta a la vista en la ventana:
  //   administrador → persona + puesto, SIN empresa: puede existir un admin del
  //     que todavia no sepamos de que administracion es (ella, 28-sep-2026);
  //   contrata      → la ficha de contactos de esa contrata;
  //   vecino        → la persona de la comunidad, si la comunidad ya existe; y
  //     si la direccion es todavia la que se acaba de escribir, se queda como
  //     persona colgando de ESTA oportunidad, que lleva su numero, y se
  //     recoloca cuando la direccion sea de verdad;
  //   otro          → persona + puesto con el cargo que ella escriba.
  const colocar = async (n: PersonaNueva | null): Promise<string | null> => {
    if (!n?.nombre) return null;

    if (n.que === "contrata" && n.contrataId) {
      const c = await crear<{ id: string }>("contrata_contactos", {
        contrata_id: n.contrataId,
        nombre: n.nombre,
        telefono: n.telefono,
        email: n.correo,
      });
      return "contrata:" + c.id;
    }

    if (n.que === "vecino" && d.comunidadId) {
      const v = await crear<{ id: string }>("personas_comunidad", {
        comunidad_id: d.comunidadId,
        nombre: n.nombre,
        rol: "vecino",
        telefono: n.telefono,
        email: n.correo,
      });
      return "vecino:" + v.id;
    }

    const per = await crear<{ id: string }>("persona", {
      nombre: n.nombre,
      activa: true,
      telefono_personal: n.telefono,
    });
    // El puesto es lo que dice QUE es y de quien es: nace con comercial, para
    // que no quede huerfano. La empresa se pone despues, cuando se sepa.
    await crear("puesto", {
      persona_id: per.id,
      empresa_id: null,
      cargo: n.otro || CARGO_DE[n.que ?? ""] || null,
      comercial_id: d.comercialId,
      comercial_captador_id: d.comercialId,
      desde: hoy(),
    });
    if (n.correo) await crear("correo", { persona_id: per.id, email: n.correo, etiqueta: "personal", principal: false });
    return "persona:" + per.id;
  };

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
  let contactoVecino = contacto?.startsWith("vecino:") ? contacto.slice(7) : null;
  if (!contactoPuesto && !contactoVecino && contacto?.startsWith("persona:")) {
    const pid = contacto.slice(8);
    const [pu] = await leer<{ id: string }[]>(`puesto?select=id&persona_id=eq.${pid}&hasta=is.null&limit=1`);
    contactoPuesto = pu?.id ?? null;
  }
  // Y si con quien hablo es el administrador, se busca SU puesto vigente.
  if (!contactoPuesto && !contactoVecino && d.contactoEsAdmin && administradorId) {
    const [pu] = await leer<{ id: string }[]>(
      `puesto?select=id&persona_id=eq.${administradorId}&hasta=is.null&limit=1`,
    );
    contactoPuesto = pu?.id ?? null;
  }

  // La BD exige: o contacto de verdad, o provisional. Nunca los dos.
  const hayReal = Boolean(contactoPuesto || contactoVecino);
  const prov = !hayReal && d.otroNuevo?.nombre
    ? { nombre: d.otroNuevo.nombre, telefono: d.otroNuevo.telefono, correo: d.otroNuevo.correo }
    : null;

  // 4 · el codigo y la oportunidad
  const codigo = await siguienteCodigo(d.comercialId);
  const op = await crear<{ id: string }>("oportunidades", {
    codigo,
    nombre: d.nombre,
    comunidad_id: d.comunidadId,
    comunidad_provisional: d.comunidadId ? null : d.direccionProvisional,
    comercial_id: d.comercialId,
    canal_id: d.canalId,
    estado: "activa",
    puesto_id: contactoPuesto,
    persona_comunidad_id: contactoVecino,
    contacto_provisional: prov?.nombre ?? null,
    telefono_provisional: prov?.telefono ?? null,
    correo_provisional: prov?.correo ?? null,
    ...columnasQuien(quien),
  });

  // 5 · de lo que vendemos, que quieren. Una fila por cada cosa.
  for (const tipoId of d.tipoIds) {
    await crear("oportunidad_tipos", { oportunidad_id: op.id, tipo_id: tipoId });
  }

  // 6 · la entrada del diario, con la fecha de la LLAMADA y quien la escribio.
  await crear("interacciones", {
    oportunidad_id: op.id,
    comercial_id: d.comercialId,
    transcripcion: d.nota,
    origen: "manual",
    fecha_evento: d.fechaLlamada ?? hoy(),
    autor_id: autorId,
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
  if (d.portalIds.length > 0) {
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
        `&id=in.(${d.portalIds.map(encodeURIComponent).join(",")})`,
    );
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
      await crear("relacion_oportunidad_accesos", {
        opp_id: op.id,
        acceso_id: acceso.id,
        de_donde: "Elegido por el comercial en el alta, en la ventana de buscar la dirección en Catastro",
      });
    }
  }

  return { id: op.id, codigo };
}
