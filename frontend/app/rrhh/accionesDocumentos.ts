"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { quienSoy, puedeEntrar } from "../../lib/sesion";
import { apuntar, borrar, documento, esTipo, existe, permisoDeSubida, prefijo, puedeSubir } from "../../lib/rrhhDocumentos";

// Subir un fichero son dos pasos, para que el fichero vaya directo del
// navegador al almacen (sin limite de tamaño por el camino):
//   1. prepararSubida: la app comprueba que puedes subir ESO y te da un
//      permiso de un solo uso para una ruta concreta;
//   2. confirmarSubida: cuando el fichero ya esta, la app lo comprueba y lo
//      apunta. Vuelve a mirar los permisos: no se fia del paso 1.

type Pedido = { personaId: string | null; tipo: string; nombre: string };
type Respuesta = { ok: true; ruta: string; url: string } | { ok: false; error: string };

async function quien() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/rrhh");
  return { yo, gestor: puedeEntrar(yo, "rrhh", "trabajar") };
}

export async function prepararSubida(p: Pedido): Promise<Respuesta> {
  const { yo, gestor } = await quien();
  if (!esTipo(p.tipo)) return { ok: false, error: "Ese tipo de documento no existe." };
  if (!puedeSubir(yo.id, gestor, p.personaId, p.tipo)) return { ok: false, error: "No puedes subir ese documento." };
  const { ruta, url } = await permisoDeSubida(p.personaId, p.tipo, p.nombre);
  return { ok: true, ruta, url };
}

export async function confirmarSubida(p: {
  personaId: string | null;
  tipo: string;
  ruta: string;
  nombre: string;
  periodo: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { yo, gestor } = await quien();
  if (!esTipo(p.tipo)) return { ok: false, error: "Ese tipo de documento no existe." };
  if (!puedeSubir(yo.id, gestor, p.personaId, p.tipo)) return { ok: false, error: "No puedes subir ese documento." };
  // La ruta tiene que ser de esa persona y ese tipo: no vale apuntar un fichero ajeno.
  if (!p.ruta.startsWith(prefijo(p.personaId, p.tipo)) || p.ruta.includes("..")) return { ok: false, error: "Ruta no válida." };
  if (p.tipo === "nomina" && !/^\d{4}-\d{2}$/.test(p.periodo ?? "")) return { ok: false, error: "Falta el mes de la nómina." };
  if (!(await existe(p.ruta))) return { ok: false, error: "El fichero no ha llegado. Vuelve a intentarlo." };

  await apuntar({
    personaId: p.personaId,
    tipo: p.tipo,
    periodo: p.periodo ? `${p.periodo}-01` : null,
    titulo: p.nombre.slice(0, 200),
    ruta: p.ruta,
    subidoPor: yo.id,
  });
  revalidatePath("/rrhh");
  return { ok: true };
}

export async function borrarDocumento(fd: FormData) {
  const { gestor } = await quien();
  const doc = await documento(String(fd.get("id") ?? ""));
  const volver = String(fd.get("volver") ?? "/rrhh");
  // Borrar solo RRHH y direccion: lo que sube un empleado queda como constancia.
  if (!gestor || !doc) redirect(volver);
  await borrar(doc);
  redirect(volver.startsWith("/") ? volver : "/rrhh");
}
