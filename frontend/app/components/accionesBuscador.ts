"use server";

import { quienSoy } from "../../lib/sesion";
import { buscarEnDirectorios, type PersonaEncontrada, type SitioEncontrado } from "../../lib/directorios";

/** El buscador de arriba (16-oct-2026): sitios y personas a la vez, de los
 *  directorios ya calculados. Solo para quien ha entrado. */
export async function accionBuscarTodo(q: string): Promise<{ sitios: SitioEncontrado[]; personas: PersonaEncontrada[] }> {
  const yo = await quienSoy();
  if (!yo || q.trim().length < 2) return { sitios: [], personas: [] };
  return buscarEnDirectorios(q.slice(0, 120));
}
