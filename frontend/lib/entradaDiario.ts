// lib/entradaDiario.ts
//
// GRABAR UNA ENTRADA DEL DIARIO (Monica, 28-sep-2026; rehecha el 8-oct-2026).
//
// Una nota del comercial es TEXTO + SITIO donde engancharla, siempre: "si no,
// acabamos con notas huerfanas que nadie recupera jamas". El texto es
// obligatorio; la direccion (la oportunidad) y la persona, al menos una. Y segun
// lo que se rellene, va a un sitio u otro:
//   · con oportunidad          → el diario de la oportunidad (notas_oportunidad).
//                                Si ademas hay persona, va como DATO de la nota:
//                                "hablamos de donde colgarla, no de que adjunta".
//   · solo persona de una      → las notas del administrador
//     administracion              (notas_administracion_fincas).
//   · direccion que no esta    → la bandeja de pendientes, que coloca luego su
//     y se marca "revisar"       propio comercial (notas_pendientes).
// Un presidente o un vecino sin direccion no tiene sitio: con un presidente no
// hay relacion propia, la nota es de SU oportunidad.
//
// Quien la escribe sale de la sesion, nunca del formulario. El micro no se
// programa: se dicta con el del teclado.

import "server-only";
import { CANALES } from "./tipoDeNota";
import { apuntarFotos } from "./fotos";

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

async function crear(tabla: string, fila: Record<string, unknown>): Promise<string> {
  const r = await fetch(`${URL_BASE}/rest/v1/${tabla}`, {
    method: "POST",
    headers: {
      apikey: SECRETO,
      Authorization: `Bearer ${SECRETO}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(fila),
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  const [creada] = (await r.json()) as { id: string }[];
  return creada.id;
}

export { CANALES };

export type OpcionEntrada = { valor: string; texto: string; pista?: string };
/** Una oportunidad del buscador, con su comercial: si es de otro, se avisa. */
export type OppEntrada = OpcionEntrada & { comercialId: string | null; comercial: string | null };

/** TODAS las oportunidades abiertas (no solo las suyas: puede ir a ver una de
 *  otro comercial, y entonces se le avisa) y las personas de las tres listas.
 *  Las personas llevan delante de que lista son: puesto:, persona:, pc:. */
export async function opcionesEntrada(): Promise<{ oportunidades: OppEntrada[]; personas: OpcionEntrada[] }> {
  const [ops, puestos, sueltas, comunidad] = await Promise.all([
    leer<{ id: string; codigo: string | null; nombre: string | null; comunidad_provisional: string | null; comercial_id: string | null;
           comunidad: { nombre: string } | null; comercial: { nombre: string } | null }[]>(
      `oportunidades?select=id,codigo,nombre,comunidad_provisional,comercial_id,comunidad:comunidad_id(nombre),comercial:comercial_id(nombre)` +
        `&estado=eq.abierta&order=fecha_apertura.desc.nullslast&limit=5000`,
    ),
    leer<{ id: string; cargo: string | null; persona: { nombre: string; apellidos: string | null } | null; empresa: { nombre_accesalia: string } | null }[]>(
      `puesto?select=id,cargo,persona:persona_id(nombre,apellidos),empresa:empresa_id(nombre_accesalia)&hasta=is.null&contrata_id=is.null&limit=5000`,
    ),
    leer<{ id: string; nombre: string; apellidos: string | null; puesto: { id: string }[] }[]>(
      `persona?select=id,nombre,apellidos,puesto(id)&limit=5000`,
    ),
    leer<{ id: string; nombre: string; rol: string | null; comunidad: { nombre: string } | null }[]>(
      `personas_comunidad?select=id,nombre,rol,comunidad:comunidad_id(nombre)&limit=5000`,
    ),
  ]);

  const completo = (p: { nombre: string; apellidos: string | null }) => [p.nombre, p.apellidos].filter(Boolean).join(" ");
  return {
    oportunidades: ops.map((o) => ({
      valor: o.id,
      texto: o.comunidad?.nombre ?? o.nombre ?? o.comunidad_provisional ?? o.codigo ?? "(sin dirección)",
      pista: [o.codigo, o.comercial?.nombre].filter(Boolean).join(" · ") || undefined,
      comercialId: o.comercial_id,
      comercial: o.comercial?.nombre ?? null,
    })),
    // Una persona suelta puede ser una docena de Jose Luises: la pista dice de
    // donde es (Monica, 28-sep-2026).
    personas: [
      ...puestos
        .filter((p) => p.persona?.nombre)
        .map((p) => ({ valor: "puesto:" + p.id, texto: completo(p.persona!), pista: p.empresa?.nombre_accesalia ?? p.cargo ?? "administrador" })),
      ...sueltas
        .filter((p) => !p.puesto.length)
        .map((p) => ({ valor: "persona:" + p.id, texto: completo(p), pista: "agenda" })),
      ...comunidad.map((p) => ({
        valor: "pc:" + p.id,
        texto: p.nombre,
        pista: [p.rol, p.comunidad?.nombre].filter(Boolean).join(" · ") || "comunidad",
      })),
    ],
  };
}

export type DatosEntrada = {
  texto: string;
  canal: string;
  fecha: string | null;
  oportunidadId: string | null;
  /** "puesto:<id>", "persona:<id>" o "pc:<id>": de que lista es la persona. */
  persona: string | null;
  /** La direccion escrita que NO estaba en la lista y se marco "revisar". */
  dondeTexto: string | null;
  /** Quien la escribe: sale de la sesion, no del formulario. */
  autorId: string;
  autorNombre: string;
  /** Las fotos ya subidas al almacen (fotos/<uuid>.jpg), si las hay. */
  fotos?: string[];
  /** El id que le da el movil a la nota: si la reenvia (se corto la
   *  cobertura al enviar), no se duplica. */
  id?: string;
};

export type Destino = { donde: "oportunidad" | "administrador" | "pendientes"; id: string };

/** Graba la nota en su sitio, le engancha sus fotos y dice donde fue. */
export async function crearEntrada(d: DatosEntrada): Promise<Destino> {
  const destino = await grabarNota(d);
  if (d.fotos?.length) {
    const [lista, id] = (d.persona ?? "").split(":");
    if (destino.donde === "oportunidad") {
      const [op] = await leer<{ comunidad_id: string | null }[]>(`oportunidades?select=comunidad_id&id=eq.${d.oportunidadId}&limit=1`);
      await apuntarFotos(d.fotos, { nota: "oportunidad", notaId: destino.id, oportunidadId: d.oportunidadId!, comunidadId: op?.comunidad_id ?? null });
    } else if (destino.donde === "administrador") {
      await apuntarFotos(d.fotos, {
        nota: "administracion",
        notaId: destino.id,
        puestoId: lista === "puesto" ? id : null,
        personaId: lista === "persona" ? id : null,
      });
    } else {
      await apuntarFotos(d.fotos, { nota: "pendiente", notaId: destino.id });
    }
  }
  return destino;
}

async function grabarNota(d: DatosEntrada): Promise<Destino> {
  const texto = d.texto.trim();
  if (texto === "") throw new Error("Una nota sin texto no cuenta nada.");
  if (!CANALES.some((c) => c.valor === d.canal)) throw new Error("Falta cómo te has enterado: visita, llamada, correo o escrito.");

  const [lista, id] = (d.persona ?? "").split(":");
  const quien = {
    quien_puesto_id: lista === "puesto" ? id : null,
    quien_persona_id: lista === "persona" ? id : null,
    quien_persona_comunidad_id: lista === "pc" ? id : null,
  };
  // Cuando paso: si no se dice, hoy.
  const fecha = d.fecha ?? new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  const comun = { ...(d.id ? { id: d.id } : {}), texto, fecha, canal: d.canal, origen: "persona", autor_id: d.autorId, autor: d.autorNombre };

  // 1 · con oportunidad: gana la oportunidad, que es lo mas concreto.
  if (d.oportunidadId) {
    return { donde: "oportunidad", id: await crear("notas_oportunidad", { ...comun, oportunidad_id: d.oportunidadId, ...quien }) };
  }

  // 2 · direccion escrita que no esta: a la bandeja, tal cual.
  if (d.dondeTexto?.trim()) {
    return {
      donde: "pendientes",
      id: await crear("notas_pendientes", {
        ...(d.id ? { id: d.id } : {}),
        autor_id: d.autorId,
        texto,
        fecha,
        canal: d.canal,
        donde_texto: d.dondeTexto.trim(),
        ...quien,
      }),
    };
  }

  // 3 · solo persona: si es de una administracion, a sus notas.
  if (lista === "puesto" || lista === "persona") {
    return {
      donde: "administrador",
      id: await crear("notas_administracion_fincas", {
        ...comun,
        puesto_id: lista === "puesto" ? id : null,
        persona_id: lista === "persona" ? id : null,
      }),
    };
  }

  throw new Error(
    lista === "pc"
      ? "Con un presidente o un vecino, pon también la dirección: la nota va a su oportunidad."
      : "Pon la dirección o la persona: una nota sin sitio no la vuelve a encontrar nadie.",
  );
}

/** Como se veia el diario viejo (interacciones). Solo para leer lo que hay:
 *  ya no se escribe ahi. */
const COMO_FUE = [
  { valor: "visita", texto: "Visita" },
  { valor: "llamada", texto: "Llamada" },
  { valor: "mail", texto: "Correo" },
  { valor: "manual", texto: "Escrito" },
] as const;

export type EntradaFicha = {
  id: string;
  fecha: string;
  creadoEn: string;
  comoFue: string;
  texto: string;
  revisar: boolean;
  motivo: string | null;
  autor: string | null;
  comercial: string | null;
  con: string | null;
  conDonde: string | null;
  oportunidadId: string | null;
  oportunidad: string | null;
};

/** Una entrada, para su ficha. Null si no existe. */
export async function entradaPorId(id: string): Promise<EntradaFicha | null> {
  const [i] = await leer<
    {
      id: string;
      creado_en: string;
      fecha_evento: string | null;
      origen: string;
      transcripcion: string | null;
      requiere_humano: boolean;
      motivo_requiere_humano: string | null;
      oportunidad_id: string | null;
      autor: { nombre: string } | null;
      comercial: { nombre: string } | null;
      puesto: { cargo: string | null; persona: { nombre: string } | null; empresa: { nombre_accesalia: string } | null } | null;
      oportunidad: { codigo: string | null; comunidad: { nombre: string } | null } | null;
    }[]
  >(
    `interacciones?select=id,creado_en,fecha_evento,origen,transcripcion,requiere_humano,motivo_requiere_humano,` +
      `oportunidad_id,autor:autor_id(nombre),comercial:comercial_id(nombre),` +
      `puesto:puesto_id(cargo,persona:persona_id(nombre),empresa:empresa_id(nombre_accesalia)),` +
      `oportunidad:oportunidad_id(codigo,comunidad:comunidad_id(nombre))&id=eq.${id}&limit=1`,
  );
  if (!i) return null;

  return {
    id: i.id,
    fecha: i.fecha_evento ?? i.creado_en.slice(0, 10),
    creadoEn: i.creado_en,
    comoFue: COMO_FUE.find((c) => c.valor === i.origen)?.texto ?? (i.origen === "nota_voz" ? "Nota de voz" : i.origen),
    texto: i.transcripcion ?? "",
    revisar: i.requiere_humano,
    motivo: i.motivo_requiere_humano,
    autor: i.autor?.nombre ?? null,
    comercial: i.comercial?.nombre ?? null,
    con: i.puesto?.persona?.nombre ?? null,
    conDonde: i.puesto?.empresa?.nombre_accesalia ?? i.puesto?.cargo ?? null,
    oportunidadId: i.oportunidad_id,
    oportunidad: i.oportunidad?.comunidad?.nombre ?? i.oportunidad?.codigo ?? null,
  };
}
