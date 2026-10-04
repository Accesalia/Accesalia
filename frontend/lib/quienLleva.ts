// lib/quienLleva.ts
//
// A QUIEN SE ESCRIBE. Dos preguntas que se hacen desde muchas pantallas y se
// contestan aqui, en un solo sitio:
//
//   · ¿quien lleva esta oportunidad? Su comercial y quien comparte su cartera:
//     una opp de Daniel es de Daniel y de Alejandra, una de Alvaro solo de Alvaro
//     (Monica, 3-oct-2026: "si una opp es de Daniel, en mano Daniel y Alejandra";
//     y el acceso compartido se eligio "sobre todo por los correos").
//   · ¿quien tiene hoy esta funcion? "No a la persona, sino a la funcion"
//     (docs/correos.md): si manana el responsable tecnico es otro, le llega a el
//     sin tocar nada.

import "server-only";

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

export type Persona = { nombre: string; correo: string | null };

/** El comercial de la opp y quien comparte su cartera. Vacio si la opp no
 *  tiene comercial asignado (hoy, las 1.228 migradas: se asigna en su ficha). */
export async function quienLlevaLaOpp(oppId: string): Promise<{ comercial: string | null; personas: Persona[] }> {
  type Fila = {
    comercial: {
      nombre: string;
      email: string | null;
      equipo: { nombre: string; email: string | null } | null;
      relacion_cartera_compartida: { equipo: { nombre: string; email: string | null; activo: boolean } | null }[];
    } | null;
  };
  const [o] = await leer<Fila[]>(
    `oportunidades?select=comercial:comercial_id(nombre,email,equipo:equipo_id(nombre,email),` +
      `relacion_cartera_compartida(equipo:equipo_id(nombre,email,activo)))&id=eq.${oppId}&limit=1`,
  );
  const c = o?.comercial;
  if (!c) return { comercial: null, personas: [] };
  const personas: Persona[] = [
    { nombre: c.equipo?.nombre ?? c.nombre, correo: c.equipo?.email ?? c.email },
    ...c.relacion_cartera_compartida
      .map((r) => r.equipo)
      .filter((e): e is NonNullable<typeof e> => !!e && e.activo)
      .map((e) => ({ nombre: e.nombre, correo: e.email })),
  ];
  return { comercial: c.nombre, personas };
}

/** Quien tiene HOY esa funcion, con su correo. */
export async function quienTieneLaFuncion(clave: string): Promise<Persona[]> {
  const hoy = new Date().toISOString().slice(0, 10);
  const filas = await leer<{ desde: string | null; hasta: string | null; equipo: { nombre: string; email: string | null; activo: boolean } | null }[]>(
    `equipo_funciones?select=desde,hasta,equipo:equipo_id(nombre,email,activo),funciones!inner(clave)&funciones.clave=eq.${clave}`,
  );
  return filas
    .filter((f) => (!f.desde || f.desde <= hoy) && (!f.hasta || f.hasta >= hoy) && f.equipo?.activo)
    .map((f) => ({ nombre: f.equipo!.nombre, correo: f.equipo!.email }));
}
