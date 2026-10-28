// lib/adminsDormidos.ts
//
// ADMINISTRADORES SIN MOVIMIENTO DESDE HACE 4 MESES (Monica, 28-oct-2026: «gente
// que ya nos dio algo hace mas de 4 meses y con quien no hemos vuelto a tener
// contacto, con ellos o con sus opps»). Sale de la vista admins_dormidos:
// consolidados (nos firmaron algo) sin notas con ellos, sin opps nuevas y sin
// notas en sus opps en 120 dias. A cada comercial, los que lleva; a direccion, todos.
// Sustituye para el comercial a «Administradores sin consolidar», que no es algo
// que el pueda mover (se queda para direccion).

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

export type AdminDormido = {
  puestoId: string;
  nombre: string;
  administracion: string | null;
  telefono: string | null;
  ultimo: string;
  dias: number;
  lleva: string | null;
};

export async function adminsDormidos(comercialId: string | null, todos: boolean): Promise<AdminDormido[]> {
  if (!todos && !comercialId) return [];
  const r = await fetch(
    `${URL_BASE}/rest/v1/admins_dormidos?select=puesto_id,ultimo,dias,` +
      `puesto:puesto_id(telefono_empresa,persona:persona_id(nombre,apellidos,telefono_personal),empresa:empresa_id(nombre_accesalia,telefono)),` +
      `comercial:comercial_id(nombre)` +
      (todos ? "" : `&comercial_id=eq.${comercialId}`) +
      `&order=dias.desc&limit=1000`,
    { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" },
  );
  if (!r.ok) throw new Error(`admins_dormidos ${r.status}: ${await r.text()}`);
  type F = {
    puesto_id: string;
    ultimo: string;
    dias: number;
    puesto: {
      telefono_empresa: string | null;
      persona: { nombre: string; apellidos: string | null; telefono_personal: string | null } | null;
      empresa: { nombre_accesalia: string; telefono: string | null } | null;
    } | null;
    comercial: { nombre: string } | null;
  };
  return ((await r.json()) as F[]).map((f) => ({
    puestoId: f.puesto_id,
    nombre: [f.puesto?.persona?.nombre, f.puesto?.persona?.apellidos].filter(Boolean).join(" ") || "(sin nombre)",
    administracion: f.puesto?.empresa?.nombre_accesalia ?? null,
    telefono: f.puesto?.telefono_empresa ?? f.puesto?.persona?.telefono_personal ?? f.puesto?.empresa?.telefono ?? null,
    ultimo: f.ultimo,
    dias: f.dias,
    lleva: f.comercial?.nombre ?? null,
  }));
}
