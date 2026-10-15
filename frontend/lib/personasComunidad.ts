// lib/personasComunidad.ts
//
// LA GENTE DE UNA COMUNIDAD, DE LA AGENDA (Monica, 15-oct-2026): "vamos a
// quedarnos con UNA sola tabla, la agenda. Es mil veces mejor tener una sola
// fuente de datos que pedirle a la pantalla que deduplique". La tabla vieja
// `personas_comunidad` queda como archivo; nadie la lee ni la escribe.
//
// Una persona de la comunidad = su PERSONA + su PUESTO, que cuelga de la
// comunidad por figura_legal_propietaria_id (la comunidad es una figura legal).
// El telefono y el correo son del PUESTO; si no tiene, los suyos personales.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function leer<T>(ruta: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${ruta.split("?")[0]} ${r.status}: ${await r.text()}`);
  return (await r.json()) as T;
}

export type PersonaDeComunidad = {
  /** El id del PUESTO (lo que se apunta como contacto o "con quien"). */
  id: string;
  personaId: string;
  comunidadId: string;
  nombre: string;
  /** El cargo: presidente, vecino, secretario... */
  rol: string | null;
  telefono: string | null;
  email: string | null;
  documento: string | null;
  notas: string | null;
  /** El presidente es el contacto principal. */
  es_contacto_principal: boolean;
};

/** El orden de siempre: el presidente arriba; luego los demas cargos y los vecinos. */
const PESO: Record<string, number> = { presidente: 0, vicepresidente: 1, secretario: 2, tesorero: 3, vocal: 4, comision: 5, conserje: 6 };
const peso = (rol: string | null) => PESO[(rol ?? "").toLowerCase()] ?? 9;

/** La gente VIGENTE de estas comunidades (sin fecha de fin en su cargo). */
export async function personasDeComunidades(comunidadIds: string[]): Promise<PersonaDeComunidad[]> {
  const ids = [...new Set(comunidadIds.filter((x) => /^[0-9a-f-]{36}$/.test(x)))];
  if (!ids.length) return [];
  const out: PersonaDeComunidad[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    const trozo = ids.slice(i, i + 150);
    const filas = await leer<{
      id: string; figura_legal_propietaria_id: string; cargo: string | null; cargo_clave: string | null; telefono_empresa: string | null;
      documento: string | null; notas: string | null;
      persona: { id: string; nombre: string; apellidos: string | null; telefono_personal: string | null } | null;
      correos: { email: string | null; principal: boolean | null }[];
    }[]>(
      "puesto?select=id,figura_legal_propietaria_id,cargo,cargo_clave,telefono_empresa,documento,notas," +
        "persona:persona_id(id,nombre,apellidos,telefono_personal),correos:correo(email,principal)" +
        `&figura_legal_propietaria_id=in.(${trozo.join(",")})&hasta=is.null`,
    );
    // El correo personal, para quien no tenga uno en su puesto.
    const sinCorreo = filas.filter((f) => !f.correos.some((c) => c.email) && f.persona).map((f) => f.persona!.id);
    const personales = sinCorreo.length
      ? await leer<{ persona_id: string; email: string | null }[]>(`correo?select=persona_id,email&persona_id=in.(${sinCorreo.join(",")})&order=principal.desc.nullslast`)
      : [];
    for (const f of filas) {
      if (!f.persona) continue;
      const rol = f.cargo_clave ?? (f.cargo ? f.cargo.toLowerCase() : null);
      out.push({
        id: f.id,
        personaId: f.persona.id,
        comunidadId: f.figura_legal_propietaria_id,
        nombre: [f.persona.nombre, f.persona.apellidos].filter(Boolean).join(" "),
        rol,
        telefono: f.telefono_empresa ?? f.persona.telefono_personal,
        email:
          [...f.correos].sort((a, b) => Number(!!b.principal) - Number(!!a.principal)).find((c) => c.email)?.email ??
          personales.find((p) => p.persona_id === f.persona!.id && p.email)?.email ??
          null,
        documento: f.documento,
        notas: f.notas,
        es_contacto_principal: rol === "presidente",
      });
    }
  }
  return out.sort((a, b) => peso(a.rol) - peso(b.rol) || a.nombre.localeCompare(b.nombre, "es"));
}

export async function personasDeComunidad(comunidadId: string): Promise<PersonaDeComunidad[]> {
  return personasDeComunidades([comunidadId]);
}
