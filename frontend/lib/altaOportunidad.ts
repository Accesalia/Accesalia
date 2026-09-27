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
import { RELACIONES } from "./oportunidadVocabulario";

// El vocabulario vive en un fichero aparte porque lo necesitan las dos
// orillas: la pantalla y el servidor.
export { PASOS_DE_ARRANQUE, RELACIONES } from "./oportunidadVocabulario";

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

const hoy = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------- lo que se elige

export type OpcionSimple = { id: string; nombre: string; pista?: string };

export type OpcionesOportunidad = {
  comerciales: OpcionSimple[];
  /** Si quien rellena es comercial, el suyo sale ya puesto. */
  miComercial: string | null;
  canales: Canal[];
  /** Toda la agenda, para "quien me llama" y para el contacto de alli. */
  quienes: OpcionQuien[];
  /** De lo que vendemos, que quieren: la lista curada, sin los agrupadores. */
  tipos: OpcionSimple[];
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
    // Los agrupadores no se ofrecen: si se pudieran elegir, en seis meses habria
    // oportunidades marcadas "Accesibilidad" a secas sin saber que eran.
    leer<{ id: string; nombre: string; padre: { nombre: string } | null }[]>(
      "tipos_proyecto?select=id,nombre,padre:parent_id(nombre)&activo=is.true&elegible=is.true&order=orden.asc",
    ),
    leer<{ id: string; nombre_accesalia: string; municipio: string | null }[]>(
      "empresa?select=id,nombre_accesalia,municipio&activa=is.true&tipo=eq.administracion_fincas" +
        "&order=nombre_accesalia.asc&limit=2000",
    ),
    leer<{ id: string; nombre: string; municipio: string | null }[]>(
      "comunidades?select=id,nombre,municipio&order=nombre.asc&limit=3000",
    ),
    leer<{ id: string; nombre: string }[]>("contratas?select=id,nombre&order=nombre.asc&limit=500").catch(() => []),
    leer<{ id: string; cargo: string | null; persona: { nombre: string } | null; empresa: { nombre_accesalia: string } | null }[]>(
      "puesto?select=id,cargo,persona(nombre),empresa(nombre_accesalia)&hasta=is.null&limit=3000",
    ),
    leer<{ id: string; nombre: string; rol: string | null; comunidad: { nombre: string } | null }[]>(
      "personas_comunidad?select=id,nombre,rol,comunidad:comunidad_id(nombre)&order=nombre.asc&limit=3000",
    ).catch(() => []),
  ]);

  return {
    comerciales: comerciales.map((c) => ({
      id: c.id,
      nombre: [c.nombre, c.apellidos].filter(Boolean).join(" "),
      pista: c.iniciales ?? undefined,
    })),
    miComercial: (equipoId && comerciales.find((c) => c.equipo_id === equipoId)?.id) || null,
    canales,
    quienes,
    tipos: tipos.map((t) => ({ id: t.id, nombre: t.nombre, pista: t.padre?.nombre ?? undefined })),
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

export type ContactoNuevo = {
  nombre: string;
  telefono: string | null;
  correo: string | null;
  /** Una de RELACIONES: decide en que tabla acaba. */
  relacion: string;
  /** Solo cuando es comercial de contrata: de cual. */
  contrataId: string | null;
};

export type DatosOportunidad = {
  /** Obligatorio: sin entrada del diario no hay oportunidad. */
  nota: string;
  /** La fecha de la LLAMADA, no la de hoy. */
  fechaLlamada: string | null;
  /** Obligatorio: una oportunidad sin comercial es una nota que se pierde. */
  comercialId: string;

  // el hilo
  comunidadId: string | null;
  direccionProvisional: string | null;
  administracionId: string | null;

  // quien me llama: o de la agenda, o se crea
  quien: string | null;
  contactoNuevo: ContactoNuevo | null;

  // mi contacto alli
  mismoQueLlama: boolean;
  contactoQuien: string | null;
  /** Cuando no esta en la agenda y la comunidad aun no existe: sala de espera. */
  contactoProvisional: { nombre: string | null; telefono: string | null; correo: string | null } | null;

  // lo demas
  tipoIds: string[];
  canalId: string | null;
  /** Por que paso del flujo entramos. */
  pasoArranque: string | null;
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
  // 1 · el contacto nuevo, si hay. Lo que ES decide DONDE acaba: eso es lo
  //     importante, no la etiqueta. Un administrador nuevo nace ya en la cartera
  //     de un comercial aunque todavia no sepamos de que administracion es.
  let quien = d.quien;
  let personaComunidadId: string | null = null;
  if (d.contactoNuevo?.nombre) {
    const n = d.contactoNuevo;
    if (n.relacion === "comunidad" && d.comunidadId) {
      const p = await crear<{ id: string }>("personas_comunidad", {
        comunidad_id: d.comunidadId,
        nombre: n.nombre,
        rol: "otro",
        telefono: n.telefono,
        email: n.correo,
      });
      personaComunidadId = p.id;
      quien = "vecino:" + p.id;
    } else if (n.relacion === "contrata" && n.contrataId) {
      const p = await crear<{ id: string }>("contrata_contactos", {
        contrata_id: n.contrataId,
        nombre: n.nombre,
        telefono: n.telefono,
        email: n.correo,
      });
      quien = "contrata:" + p.id;
    } else {
      // Agenda general: persona con su puesto. El puesto puede no tener empresa
      // —ella lo dejo claro anteayer— y lleva el comercial, para que un
      // administrador nuevo no nazca huerfano.
      const cargo = RELACIONES.find((r) => r.valor === n.relacion)?.texto ?? null;
      const per = await crear<{ id: string }>("persona", {
        nombre: n.nombre,
        activa: true,
        telefono_personal: n.telefono,
      });
      await crear("puesto", {
        persona_id: per.id,
        empresa_id: n.relacion === "administrador" ? d.administracionId : null,
        cargo,
        telefono_empresa: null,
        comercial_id: d.comercialId,
        comercial_captador_id: d.comercialId,
        desde: hoy(),
      });
      if (n.correo) await crear("correo", { persona_id: per.id, email: n.correo, etiqueta: "personal", principal: false });
      quien = "persona:" + per.id;
    }
  }

  // 2 · el contacto de alli. Si es el mismo que llamo, no se pregunta dos veces.
  //     La ficha solo sabe guardar dos clases de contacto: el puesto de una
  //     persona (que es quien dice en que administracion trabaja) o un vecino.
  //     Si el que llamo es una persona de la agenda, se busca su puesto vigente.
  const contacto = d.mismoQueLlama ? quien : d.contactoQuien;
  let contactoPuesto = contacto?.startsWith("puesto:") ? contacto.slice(7) : null;
  let contactoVecino = contacto?.startsWith("vecino:") ? contacto.slice(7) : null;
  if (!contactoPuesto && !contactoVecino && contacto?.startsWith("persona:")) {
    const pid = contacto.slice(8);
    const [pu] = await leer<{ id: string }[]>(`puesto?select=id&persona_id=eq.${pid}&hasta=is.null&limit=1`);
    contactoPuesto = pu?.id ?? null;
  }
  if (!contactoPuesto && !contactoVecino) contactoVecino = personaComunidadId;

  // La BD exige: o contacto de verdad, o provisional. Nunca los dos.
  const hayReal = Boolean(contactoPuesto || contactoVecino);
  const prov = !hayReal ? d.contactoProvisional : null;

  // 3 · el codigo y la oportunidad
  const codigo = await siguienteCodigo(d.comercialId);
  const op = await crear<{ id: string }>("oportunidades", {
    codigo,
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

  // 4 · de lo que vendemos, que quieren. Una fila por cada cosa.
  for (const tipoId of d.tipoIds) {
    await crear("oportunidad_tipos", { oportunidad_id: op.id, tipo_id: tipoId });
  }

  // 5 · la entrada del diario, con la fecha de la LLAMADA y quien la escribio.
  await crear("interacciones", {
    oportunidad_id: op.id,
    comercial_id: d.comercialId,
    transcripcion: d.nota,
    origen: "manual",
    fecha_evento: d.fechaLlamada ?? hoy(),
    autor_id: autorId,
  });

  // 6 · por donde entramos en el flujo. Los pasos de ANTES no quedan como
  //     hechos, quedan como que NO APLICAN: nos hemos saltado esa parte, y el
  //     diario explica por que. El flujo ya existe, no se inventa aqui.
  if (d.pasoArranque) {
    const hitos = await leer<{ clave: string; orden: number; aplicable_por_defecto: boolean }[]>(
      "hitos_comerciales?select=clave,orden,aplicable_por_defecto&order=orden.asc",
    );
    const arranque = hitos.find((h) => h.clave === d.pasoArranque);
    if (arranque) {
      for (const h of hitos) {
        const antes = h.orden < arranque.orden;
        await crear("hitos_oportunidad", {
          oportunidad_id: op.id,
          hito: h.clave,
          aplicable: antes ? false : h.aplicable_por_defecto,
          estado: antes ? "no_aplica" : "pendiente",
        });
      }
    }
  }

  return { id: op.id, codigo };
}
