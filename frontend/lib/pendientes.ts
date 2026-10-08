// lib/pendientes.ts
//
// LA BANDEJA DE NOTAS PENDIENTES (Monica, 8-oct-2026).
//
// Las notas cuya direccion no estaba en la lista y se marcaron "revisar
// despues". Las coloca SU PROPIO COMERCIAL al llegar a la oficina: "ellos se lo
// guisan, ellos se lo comen". La secretaria no coloca las de los comerciales,
// salvo las de Daniel, porque comparte su cartera. Direccion las ve todas.
//
// Colocar es: buscar la oportunidad correcta (o la persona del administrador),
// o crear la nueva desde el alta. La nota pasa a su diario con su autor, su
// fecha y su canal de siempre; sus fotos dejan de esperar y pasan a ser
// documentos de su sitio. La pendiente no se borra: queda como "colocada",
// apuntando a donde fue. Nunca se crea nada por sistema.

import "server-only";
import type { Yo } from "./sesion";
import { puedeEntrar } from "./sesion";
import { fotosDeNotas, moverFotosDePendiente, type Foto } from "./fotos";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

async function escribir<T>(metodo: "POST" | "PATCH", path: string, cuerpo: unknown): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method: metodo,
    headers: { ...CAB, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(cuerpo),
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

/** De quien son las pendientes que esta persona coloca: las suyas, y las del
 *  comercial cuya cartera comparte. Direccion, todas. */
export async function autoresQueVeo(yo: Yo): Promise<string[] | "todas"> {
  if (yo.veTodo || puedeEntrar(yo, "comercial", "supervisar")) return "todas";
  const compartidas = await leer<{ comercial: { equipo_id: string | null } | null }[]>(
    `relacion_cartera_compartida?select=comercial:comercial_id(equipo_id)&equipo_id=eq.${yo.id}`,
  );
  return [yo.id, ...compartidas.map((c) => c.comercial?.equipo_id).filter((x): x is string => !!x)];
}

const filtroAutores = (a: string[] | "todas") => (a === "todas" ? "" : `&autor_id=in.(${a.join(",")})`);

export async function cuantasPendientes(yo: Yo): Promise<number> {
  const a = await autoresQueVeo(yo);
  const filas = await leer<{ id: string }[]>(`notas_pendientes?select=id&estado=eq.pendiente${filtroAutores(a)}&limit=500`);
  return filas.length;
}

export type Pendiente = {
  id: string;
  creadoEn: string;
  fecha: string | null;
  canal: string | null;
  texto: string;
  autor: string | null;
  autorId: string;
  donde: string | null;
  quien: string | null;
  /** La persona elegida de la lista, si se eligio: "puesto:<id>", "persona:<id>", "pc:<id>". */
  persona: string | null;
  fotos: Foto[];
};

export async function pendientesDe(yo: Yo): Promise<Pendiente[]> {
  const a = await autoresQueVeo(yo);
  const filas = await leer<{
    id: string; creado_en: string; fecha: string | null; canal: string | null; texto: string; autor_id: string;
    donde_texto: string | null; quien_texto: string | null;
    quien_puesto_id: string | null; quien_persona_id: string | null; quien_persona_comunidad_id: string | null;
    autor: { nombre: string } | null;
    qp: { persona: { nombre: string } | null } | null; qs: { nombre: string } | null; qc: { nombre: string } | null;
  }[]>(
    `notas_pendientes?select=id,creado_en,fecha,canal,texto,autor_id,donde_texto,quien_texto,` +
      `quien_puesto_id,quien_persona_id,quien_persona_comunidad_id,autor:autor_id(nombre),` +
      `qp:quien_puesto_id(persona:persona_id(nombre)),qs:quien_persona_id(nombre),qc:quien_persona_comunidad_id(nombre)` +
      `&estado=eq.pendiente${filtroAutores(a)}&order=creado_en.asc&limit=200`,
  );
  const fotos = await fotosDeNotas("nota_pendiente_id", filas.map((f) => f.id)).catch(() => new Map<string, Foto[]>());
  return filas.map((f) => ({
    id: f.id,
    creadoEn: f.creado_en,
    fecha: f.fecha,
    canal: f.canal,
    texto: f.texto,
    autor: f.autor?.nombre ?? null,
    autorId: f.autor_id,
    donde: f.donde_texto,
    quien: f.qp?.persona?.nombre ?? f.qs?.nombre ?? f.qc?.nombre ?? f.quien_texto,
    persona: f.quien_puesto_id
      ? "puesto:" + f.quien_puesto_id
      : f.quien_persona_id
        ? "persona:" + f.quien_persona_id
        : f.quien_persona_comunidad_id
          ? "pc:" + f.quien_persona_comunidad_id
          : null,
    fotos: fotos.get(f.id) ?? [],
  }));
}

type FilaPendiente = {
  id: string; autor_id: string; texto: string; fecha: string | null; canal: string | null; estado: string;
  quien_puesto_id: string | null; quien_persona_id: string | null; quien_persona_comunidad_id: string | null;
  autor: { nombre: string } | null;
};

/** La pendiente, si esta persona puede colocarla y aun no se ha colocado. */
async function pendienteMia(yo: Yo, id: string): Promise<FilaPendiente> {
  const [p] = await leer<FilaPendiente[]>(
    `notas_pendientes?select=id,autor_id,texto,fecha,canal,estado,quien_puesto_id,quien_persona_id,quien_persona_comunidad_id,autor:autor_id(nombre)` +
      `&id=eq.${encodeURIComponent(id)}&limit=1`,
  );
  if (!p) throw new Error("Esa nota no existe.");
  if (p.estado !== "pendiente") throw new Error("Esa nota ya está colocada.");
  const a = await autoresQueVeo(yo);
  if (a !== "todas" && !a.includes(p.autor_id)) throw new Error("Esa nota no es tuya: la coloca quien la escribió.");
  return p;
}

const marcarColocada = (id: string, enlace: { nota_oportunidad_id?: string; nota_administracion_id?: string }) =>
  escribir("PATCH", `notas_pendientes?id=eq.${id}`, { estado: "colocada", colocada_en: new Date().toISOString(), ...enlace });

/** COLOCAR: la nota pasa al diario de la oportunidad elegida, o a las notas de
 *  la persona del administrador si no hay oportunidad. Con su autor, su fecha y
 *  su canal de siempre. */
export async function colocarPendiente(
  yo: Yo,
  id: string,
  destino: { oportunidadId: string } | { persona: string },
): Promise<void> {
  const p = await pendienteMia(yo, id);
  const comun = {
    texto: p.texto,
    fecha: p.fecha,
    canal: p.canal ?? "escrito",
    origen: "persona",
    autor_id: p.autor_id,
    autor: p.autor?.nombre ?? null,
  };

  if ("oportunidadId" in destino) {
    const [op] = await leer<{ comunidad_id: string | null }[]>(`oportunidades?select=comunidad_id&id=eq.${destino.oportunidadId}&limit=1`);
    if (!op) throw new Error("Esa oportunidad no existe.");
    const [n] = await escribir<{ id: string }[]>("POST", "notas_oportunidad", {
      ...comun,
      oportunidad_id: destino.oportunidadId,
      quien_puesto_id: p.quien_puesto_id,
      quien_persona_id: p.quien_persona_id,
      quien_persona_comunidad_id: p.quien_persona_comunidad_id,
    });
    await moverFotosDePendiente(id, { nota: "oportunidad", notaId: n.id, oportunidadId: destino.oportunidadId, comunidadId: op.comunidad_id });
    await marcarColocada(id, { nota_oportunidad_id: n.id });
    return;
  }

  const [lista, pid] = destino.persona.split(":");
  if (lista !== "puesto" && lista !== "persona") {
    throw new Error("Con un presidente o un vecino, la nota va a su oportunidad: busca la dirección.");
  }
  const [n] = await escribir<{ id: string }[]>("POST", "notas_administracion_fincas", {
    ...comun,
    puesto_id: lista === "puesto" ? pid : null,
    persona_id: lista === "persona" ? pid : null,
  });
  await moverFotosDePendiente(id, {
    nota: "administracion",
    notaId: n.id,
    puestoId: lista === "puesto" ? pid : null,
    personaId: lista === "persona" ? pid : null,
  });
  await marcarColocada(id, { nota_administracion_id: n.id });
}

/** "ES NUEVA": la oportunidad se crea en el alta, y su primera nota es esta.
 *  Al guardarse el alta, la pendiente queda colocada en esa nota y sus fotos
 *  pasan a la oportunidad nueva. */
export async function cerrarPendienteEnAlta(yo: Yo, id: string, notaId: string, oportunidadId: string): Promise<void> {
  await pendienteMia(yo, id);
  const [op] = await leer<{ comunidad_id: string | null }[]>(`oportunidades?select=comunidad_id&id=eq.${oportunidadId}&limit=1`);
  await moverFotosDePendiente(id, { nota: "oportunidad", notaId, oportunidadId, comunidadId: op?.comunidad_id ?? null });
  await marcarColocada(id, { nota_oportunidad_id: notaId });
}
