// lib/apuntesSatelite.ts
//
// LO QUE SE APUNTA EN EL SATELITE Y AUN NO ESTA CREADO (Monica, 13-oct-2026):
// "el satelite debe permitir coger el dato rapido, no necesariamente completo:
// es para que no se les olvide, no para que trabajen desde el movil". Una opp o
// un administrador nuevos lanzados desde el movil NO se crean: se apuntan aqui
// (tabla apuntes_satelite) y salen en Pendientes para completarlos y darlos de
// alta en la oficina. Al darlos de alta, el apunte queda cerrado con lo creado.

import "server-only";
import type { Yo } from "./sesion";
import { apuntarFotos } from "./fotos";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase apuntes_satelite ${r.status}: ${await r.text()}`);
  return (r.status === 204 || r.headers.get("content-length") === "0" ? null : await r.json()) as T;
}
const uuid = (x: string | null | undefined): x is string => !!x && /^[0-9a-f-]{36}$/.test(x);

// "contacto" (19-oct-2026): vecino, contratista u otro lanzado desde el
// satelite; su tipo va en datos.tipoContacto. Se coloca a mano en la oficina.
export type TipoApunte = "oportunidad" | "administrador" | "contacto";

export type Apunte = {
  id: string;
  creadoEn: string;
  tipo: TipoApunte;
  autor: string | null;
  fecha: string | null;
  nota: string;
  canal: string | null;
  direccion: string | null;
  nombre: string | null;
  datos: Record<string, unknown>;
};

type Fila = {
  id: string; creado_en: string; tipo: TipoApunte; fecha: string | null; nota: string | null; canal: string | null;
  direccion_texto: string | null; nombre: string | null; datos: Record<string, unknown> | null; autor: { nombre: string } | null;
};
const SEL = "id,creado_en,tipo,fecha,nota,canal,direccion_texto,nombre,datos,autor:autor_id(nombre)";
const deFila = (f: Fila): Apunte => ({
  id: f.id, creadoEn: f.creado_en, tipo: f.tipo, autor: f.autor?.nombre ?? null, fecha: f.fecha, nota: f.nota ?? "",
  canal: f.canal, direccion: f.direccion_texto, nombre: f.nombre, datos: f.datos ?? {},
});

/** Apunta lo que llega del movil. Si la nota ya se apunto (reenvio por falta de
 *  cobertura), no hace nada. */
export async function apuntar(
  yo: Yo,
  a: { tipo: TipoApunte; notaId: string | null; fecha: string | null; nota: string; canal: string | null; direccion: string | null; nombre: string | null; datos: Record<string, unknown> },
): Promise<void> {
  if (uuid(a.notaId)) {
    const ya = await pedir<{ id: string }[]>(`apuntes_satelite?select=id&nota_id=eq.${a.notaId}&limit=1`);
    if (ya.length) return;
  }
  await pedir("apuntes_satelite", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      tipo: a.tipo,
      autor_id: yo.id,
      nota_id: uuid(a.notaId) ? a.notaId : null,
      fecha: a.fecha,
      nota: a.nota.trim() || null,
      canal: a.canal || null,
      direccion_texto: a.direccion?.trim() || null,
      nombre: a.nombre?.trim() || null,
      datos: a.datos,
    }),
  });
}

/** ¿Ya esta apuntada esta nota del movil? (para no duplicar al reenviar) */
export async function notaYaApuntada(notaId: string): Promise<boolean> {
  if (!uuid(notaId)) return false;
  return (await pedir<{ id: string }[]>(`apuntes_satelite?select=id&nota_id=eq.${notaId}&limit=1`)).length > 0;
}

/** Los apuntes pendientes de quien los lanzo; direccion los ve todos. */
export async function misApuntes(yo: Yo, tipo: TipoApunte): Promise<Apunte[]> {
  const filtro = yo.veTodo ? "" : `&autor_id=eq.${yo.id}`;
  const filas = await pedir<Fila[]>(`apuntes_satelite?select=${SEL}&estado=eq.pendiente&tipo=eq.${tipo}${filtro}&order=creado_en.asc&limit=500`);
  return filas.map(deFila);
}

/** Un apunte pendiente que esta persona puede completar (el suyo, o direccion). */
export async function apuntePendiente(yo: Yo, id: string): Promise<Apunte | null> {
  if (!uuid(id)) return null;
  const [f] = await pedir<(Fila & { autor_id: string | null })[]>(`apuntes_satelite?select=${SEL},autor_id&id=eq.${id}&estado=eq.pendiente`);
  if (!f || (!yo.veTodo && f.autor_id !== yo.id)) return null;
  return deFila(f);
}

/** Dado de alta: queda cerrado con lo que se creo. */
export async function cerrarApunte(yo: Yo, id: string, creado: { oportunidadId?: string; personaId?: string }): Promise<void> {
  if (!(await apuntePendiente(yo, id))) return;
  await pedir(`apuntes_satelite?id=eq.${id}&estado=eq.pendiente`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      estado: "dado_de_alta",
      resuelto_en: new Date().toISOString(),
      resuelto_por: yo.id,
      oportunidad_id: uuid(creado.oportunidadId) ? creado.oportunidadId : null,
      persona_id: uuid(creado.personaId) ? creado.personaId : null,
    }),
  });
}

/** No sigue: se descarta, con el porque. No se borra. */
export async function descartarApunte(yo: Yo, id: string, motivo: string): Promise<void> {
  if (!(await apuntePendiente(yo, id))) throw new Error("Ese apunte no es tuyo o ya no está pendiente.");
  await pedir(`apuntes_satelite?id=eq.${id}&estado=eq.pendiente`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ estado: "descartado", resuelto_en: new Date().toISOString(), resuelto_por: yo.id, motivo: motivo.trim() || null }),
  });
}

/** Cuantos tiene pendientes cada tipo, para las tarjetas de Pendientes. */
export async function cuantosApuntes(yo: Yo): Promise<Record<TipoApunte, number>> {
  const filtro = yo.veTodo ? "" : `&autor_id=eq.${yo.id}`;
  const filas = await pedir<{ tipo: TipoApunte }[]>(`apuntes_satelite?select=tipo&estado=eq.pendiente${filtro}&limit=2000`);
  return {
    oportunidad: filas.filter((f) => f.tipo === "oportunidad").length,
    administrador: filas.filter((f) => f.tipo === "administrador").length,
    contacto: filas.filter((f) => f.tipo === "contacto").length,
  };
}

/** Al dar de alta la opp desde un apunte: queda cerrado con ella, y las fotos
 *  que se hicieron con el movil pasan a su primera nota. */
export async function cerrarApunteEnAlta(yo: Yo, id: string, notaId: string, oportunidadId: string): Promise<void> {
  const a = await apuntePendiente(yo, id);
  if (!a) return;
  const fotos = Array.isArray(a.datos.fotos) ? (a.datos.fotos as unknown[]).map(String) : [];
  if (fotos.length) {
    const [op] = await pedir<{ comunidad_id: string | null }[]>(`oportunidades?select=comunidad_id&id=eq.${oportunidadId}`);
    await apuntarFotos(fotos, { nota: "oportunidad", notaId, oportunidadId, comunidadId: op?.comunidad_id ?? null });
  }
  await cerrarApunte(yo, id, { oportunidadId });
}
