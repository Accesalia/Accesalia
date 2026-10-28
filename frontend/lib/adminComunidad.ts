// lib/adminComunidad.ts
//
// EL ADMINISTRADOR ES DE LA COMUNIDAD, NUNCA DE LA OPP (Monica, 18-oct-2026;
// docs/modelo-admin-comunidad.md). Una opp es un conjunto de accesos; cada acceso
// es de una comunidad (accesos.figura_legal_propietaria_id) y cada comunidad
// tiene su administrador vigente (comunidad_admin_responsable). Una opp con
// accesos de varias comunidades tiene varios administradores: «es la vida».
//
// Aqui: de que comunidades son unos accesos (o unos portales de Catastro, antes
// de que exista el acceso), quien administra cada una, y PONER el administrador
// de una comunidad. Si ya tenia otro, no se pisa: lo decide quien da de alta
// («¿ha cambiado de administrador?»); si cambia, el anterior se cierra con
// fecha y queda en el historial.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}
async function escribir(path: string, method: "POST" | "PATCH", body: unknown) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method,
    headers: { ...CAB, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
}
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const uuid = (v: string) => /^[0-9a-f-]{36}$/.test(v);

export type AdminVigente = { id: string; puestoId: string | null; personaId: string | null; empresaId: string | null; nombre: string };
export type ComunidadConAdmin = { id: string; nombre: string; admin: AdminVigente | null };

type FilaResp = {
  id: string;
  comunidad_id: string;
  puesto_id: string | null;
  empresa_id: string | null;
  puesto: { persona_id: string | null; persona: { nombre: string | null; apellidos: string | null } | null } | null;
  empresa: { nombre_accesalia: string | null } | null;
};

/** El administrador vigente de cada comunidad (el mas reciente, si hubiera varios). */
export async function adminsDeComunidades(ids: string[]): Promise<Map<string, AdminVigente>> {
  const unicos = [...new Set(ids.filter(uuid))];
  const out = new Map<string, AdminVigente>();
  if (!unicos.length) return out;
  const filas = await leer<FilaResp[]>(
    "comunidad_admin_responsable?select=id,comunidad_id,puesto_id,empresa_id,puesto:puesto_id(persona_id,persona:persona_id(nombre,apellidos)),empresa:empresa_id(nombre_accesalia)" +
      `&comunidad_id=in.(${unicos.join(",")})&vigente=is.true&order=desde.desc.nullslast,creado_en.desc`,
  );
  for (const f of filas) {
    if (out.has(f.comunidad_id)) continue;
    const persona = [f.puesto?.persona?.nombre, f.puesto?.persona?.apellidos].filter(Boolean).join(" ");
    out.set(f.comunidad_id, {
      id: f.id,
      puestoId: f.puesto_id,
      personaId: f.puesto?.persona_id ?? null,
      empresaId: f.empresa_id,
      nombre: [persona, f.empresa?.nombre_accesalia].filter(Boolean).join(" · ") || "una administración sin persona",
    });
  }
  return out;
}

/** De que comunidades son unos PORTALES de Catastro (los que se eligen en el
 *  alta, antes de que exista el acceso), y cuantos no son aun de ninguna. */
export async function comunidadesDePortales(portalIds: string[]): Promise<{ comunidades: ComunidadConAdmin[]; sinComunidad: number }> {
  const ids = portalIds.filter((p) => /^[\w-]+$/.test(p));
  if (!ids.length) return { comunidades: [], sinComunidad: 0 };
  const portales = await leer<{ id: string; tipo_via: string | null; nombre_via: string | null; numero: string; escalera: string | null; ficha_catastro: { municipio: string | null } }[]>(
    `ficha_catastro_portal?select=id,tipo_via,nombre_via,numero,escalera,ficha_catastro!inner(municipio)&id=in.(${ids.map(encodeURIComponent).join(",")})`,
  );
  // El acceso de cada portal: por su enlace al portal o, si es antiguo, por su direccion.
  const titularDe = new Map<string, string | null>();
  for (const p of portales) {
    const q = (v: string | null) => encodeURIComponent(v ?? "");
    const [a] = await leer<{ figura_legal_propietaria_id: string | null }[]>(
      `accesos?select=figura_legal_propietaria_id&or=(ficha_catastro_portal_id.eq.${encodeURIComponent(p.id)},` +
        `and(municipio.eq.${q(p.ficha_catastro.municipio)},tipo_via.eq.${q(p.tipo_via)},nombre_via.eq.${q(p.nombre_via)},numero.eq.${q(p.numero)},escalera.eq.${q(p.escalera)}))&limit=1`,
    ).catch(() => []);
    titularDe.set(p.id, a?.figura_legal_propietaria_id ?? null);
  }
  const titulares = [...new Set([...titularDe.values()].filter((x): x is string => !!x))];
  // Solo las que son comunidades (un titular puede ser un particular o una empresa).
  const comunidades = titulares.length ? await leer<{ id: string; nombre: string }[]>(`comunidades?select=id,nombre&id=in.(${titulares.join(",")})`) : [];
  const admins = await adminsDeComunidades(comunidades.map((c) => c.id));
  return {
    comunidades: comunidades.map((c) => ({ id: c.id, nombre: c.nombre, admin: admins.get(c.id) ?? null })),
    sinComunidad: [...titularDe.values()].filter((t) => !t).length,
  };
}

/** Las comunidades de una opp, por sus accesos vigentes. */
export async function comunidadesDeOpp(oppId: string): Promise<ComunidadConAdmin[]> {
  if (!uuid(oppId)) return [];
  const rels = await leer<{ acceso: { figura_legal_propietaria_id: string | null } | null }[]>(
    `relacion_oportunidad_accesos?select=acceso:acceso_id(figura_legal_propietaria_id)&opp_id=eq.${oppId}&hasta=is.null`,
  );
  const titulares = [...new Set(rels.map((r) => r.acceso?.figura_legal_propietaria_id).filter((x): x is string => !!x))];
  const comunidades = titulares.length ? await leer<{ id: string; nombre: string }[]>(`comunidades?select=id,nombre&id=in.(${titulares.join(",")})`) : [];
  const admins = await adminsDeComunidades(comunidades.map((c) => c.id));
  return comunidades.map((c) => ({ id: c.id, nombre: c.nombre, admin: admins.get(c.id) ?? null }));
}

/** PONER el administrador de una comunidad (una persona, por su puesto vigente).
 *  - Sin administrador vigente: se pone.
 *  - Con el mismo: no se toca.
 *  - Con SOLO SU ADMINISTRACION, sin persona (Monica, 28-oct-2026, Calderon de la
 *    Barca 12: «no lo coge»): si la persona es de esa misma administracion, completa
 *    esa fila; no es un cambio de administrador.
 *  - Con otro: solo si `cambia` (lo decide el comercial en el aviso). El anterior
 *    se cierra con fecha de hoy (hasta) y deja de estar vigente; queda en el historial.
 *  `puestoId`, si se sabe cual se eligio: una persona puede estar en dos
 *  administraciones (Paz Terradillo, Ciudadela y Gesmadrid).
 *  Devuelve lo que ha pasado, para el diario. */
export async function ponerAdministrador(
  comunidadId: string,
  personaId: string,
  opciones: { cambia: boolean; nota: string; puestoId?: string },
): Promise<"puesto" | "igual" | "cambiado" | "se_queda" | "sin_puesto"> {
  if (!uuid(comunidadId) || !uuid(personaId)) throw new Error("Comunidad o persona no válida");
  const elegido = opciones.puestoId && uuid(opciones.puestoId) ? `&id=eq.${opciones.puestoId}` : "";
  const [puesto] = await leer<{ id: string; empresa_id: string | null }[]>(`puesto?select=id,empresa_id&persona_id=eq.${personaId}&hasta=is.null${elegido}&limit=1`);
  if (!puesto) return "sin_puesto";
  const actual = (await adminsDeComunidades([comunidadId])).get(comunidadId);
  if (actual?.personaId === personaId && (!elegido || actual.puestoId === puesto.id)) return "igual";
  if (actual && !actual.puestoId && (!actual.empresaId || actual.empresaId === puesto.empresa_id)) {
    await escribir(`comunidad_admin_responsable?id=eq.${actual.id}`, "PATCH", {
      puesto_id: puesto.id,
      empresa_id: puesto.empresa_id,
      notas: opciones.nota,
    });
    return "puesto";
  }
  if (actual && !opciones.cambia) return "se_queda";
  if (actual) await escribir(`comunidad_admin_responsable?comunidad_id=eq.${comunidadId}&vigente=is.true`, "PATCH", { vigente: false, hasta: hoy() });
  await escribir("comunidad_admin_responsable", "POST", {
    comunidad_id: comunidadId,
    puesto_id: puesto.id,
    empresa_id: puesto.empresa_id,
    vigente: true,
    desde: hoy(),
    notas: opciones.nota,
  });
  return actual ? "cambiado" : "puesto";
}

/** OPPS SIN ADMINISTRADOR, para Pendientes (Monica, 18-oct-2026: «sí, buena
 *  idea»): las abiertas de 2025-26 cuya comunidad no tiene administrador, de cada
 *  comercial (direccion, todas). Lee la vista opps_abiertas_sin_gestor, que ya va
 *  por la vista base (administradores_de_oportunidad). */
export type OppSinAdmin = { id: string; codigo: string | null; nombre: string | null; apertura: string | null; comercialId: string | null };
export async function oppsSinAdministrador(comercialId: string | null, todas: boolean): Promise<OppSinAdmin[]> {
  if (!todas && !comercialId) return [];
  const filas = await leer<{ oportunidad_id: string; codigo: string | null; nombre: string | null; fecha_apertura: string | null; comercial_id: string | null }[]>(
    "opps_abiertas_sin_gestor?select=oportunidad_id,codigo,nombre,fecha_apertura,comercial_id&fecha_apertura=gte.2025-01-01" +
      (todas ? "" : `&comercial_id=eq.${comercialId}`) +
      "&order=fecha_apertura.desc.nullslast&limit=2000",
  );
  return filas.map((f) => ({ id: f.oportunidad_id, codigo: f.codigo, nombre: f.nombre, apertura: f.fecha_apertura, comercialId: f.comercial_id }));
}
