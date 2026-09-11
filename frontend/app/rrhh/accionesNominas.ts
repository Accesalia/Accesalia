"use server";

import { redirect } from "next/navigation";
import { quienSoy, puedeEntrar } from "../../lib/sesion";
import { existe, permisoDeSubidaLote, PREFIJO_LOTES } from "../../lib/rrhhDocumentos";
import { asignar, confirmar, descartarLote, leerLote, lote, publicarLote } from "../../lib/rrhhNominas";

// Todo el reparto de nominas es de RRHH y direccion.

async function gestor() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/rrhh");
  if (!puedeEntrar(yo, "rrhh", "trabajar")) redirect("/rrhh?vista=yo");
  return yo;
}

export async function prepararSubidaLote(nombre: string): Promise<{ ok: true; ruta: string; url: string } | { ok: false; error: string }> {
  await gestor();
  if (!/\.pdf$/i.test(nombre)) return { ok: false, error: "Tiene que ser el PDF de la gestoría." };
  const { ruta, url } = await permisoDeSubidaLote(nombre);
  return { ok: true, ruta, url };
}

export async function procesarLote(ruta: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const yo = await gestor();
  if (!ruta.startsWith(PREFIJO_LOTES) || ruta.includes("..")) return { ok: false, error: "Ruta no válida." };
  if (!(await existe(ruta))) return { ok: false, error: "El PDF no ha llegado. Vuelve a intentarlo." };
  const r = await leerLote(ruta, yo.id);
  return "error" in r ? { ok: false, error: r.error } : { ok: true, id: r.id };
}

/** Guarda lo revisado y, si se pide, publica. */
export async function guardarLote(fd: FormData) {
  const yo = await gestor();
  const id = String(fd.get("lote") ?? "");
  const l = await lote(id);
  if (!l || l.lote.estado !== "revision") redirect("/rrhh?aviso=lote_cerrado#nominas");

  // Lo que se ha elegido en cada fila. Una misma persona no puede tener dos
  // nominas del mismo PDF.
  const elegidos = l.nominas.map((n) => ({ n, persona: String(fd.get(`p_${n.id}`) ?? "") || null }));
  const usados = elegidos.map((e) => e.persona).filter(Boolean);
  if (new Set(usados).size !== usados.length) redirect(`/rrhh?lote=${id}&error=repetida#lote`);

  for (const { n, persona } of elegidos) {
    if (persona !== n.personaId) await asignar(n.id, persona);
    else if (n.casadoPor === "nombre") await confirmar(n.id); // revisada y dada por buena
  }

  if (fd.get("decision") === "publicar") {
    const r = await publicarLote(id, yo.id);
    redirect(`/rrhh?aviso=publicadas&n=${r.publicadas}#nominas`);
  }
  redirect(`/rrhh?lote=${id}&aviso=guardado#lote`);
}

export async function descartar(fd: FormData) {
  await gestor();
  await descartarLote(String(fd.get("lote") ?? ""));
  redirect("/rrhh?aviso=descartado#nominas");
}
