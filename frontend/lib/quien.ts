// lib/quien.ts
//
// QUIEN NOS LO TRAJO (Monica, 26-sep-2026).
//
// Su regla, que resuelve cualquier caso en dos segundos: **el quien es siempre
// una persona a la que puedo llamar por telefono**. Todo lo demas es el COMO.
//
// Sus ejemplos de verdad, que son los que dieron forma a esto:
//   - Ricardo de Diddepro, contrata de SATE, presenta a un administrador nuevo.
//   - Jose Luis, de UCI, pasa el contacto de un admin que busca arquitecto.
//   - Antonio Cuartero, tecnico municipal de Leganes, pasa el del admin de su
//     urbanizacion porque tienen humedades.
//   - Vanesa, la hija del presi de Carretas 15, pasa el telefono de su cuñada.
//
// Los tres primeros son "boca a boca": el COMO no los distingue. Todo el valor
// esta en el QUIEN. Y ninguno estaba en la base, asi que exigir que fuera alguien
// ya dado de alta habria dejado el campo vacio justo cuando importa.
//
// La agenda ya existe: `persona` + `puesto`. Antonio es una persona con un puesto
// en el Ayuntamiento de Leganes; Jose Luis, una persona con un puesto en UCI;
// Vanesa, una persona sin puesto, que se permite. Por eso el quien apunta a la
// PERSONA y no a su cargo: si cambia de trabajo, sigue siendo quien fue.
//
// Hay tres apuntadores mas, y cada uno existe por una norma suya: las contratas
// son un mundo aparte de las administraciones, los vecinos cuelgan de una
// comunidad con su rol, y los comerciales son de casa.

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

export type OpcionQuien = { valor: string; texto: string; pista?: string };

/** Toda la gente a la que puede apuntar un "nos lo trajo", en una sola lista.
 *  El valor lleva delante de que clase es, porque cada clase vive en su tabla. */
export async function opcionesQuien(): Promise<OpcionQuien[]> {
  const [personas, comerciales, contratas, vecinos] = await Promise.all([
    leer<{ id: string; nombre: string; puesto: { cargo: string | null; empresa: { nombre_accesalia: string } | null }[] }[]>(
      "persona?select=id,nombre,puesto(cargo,empresa(nombre_accesalia))&activa=is.true&order=nombre.asc&limit=3000",
    ),
    leer<{ id: string; nombre: string; apellidos: string | null }[]>(
      "comerciales?select=id,nombre,apellidos&activo=eq.true&order=nombre.asc",
    ),
    leer<{ id: string; nombre: string; contrata: { nombre: string } | null }[]>(
      "contrata_contactos?select=id,nombre,contrata:contrata_id(nombre)&order=nombre.asc&limit=1000",
    ).catch(() => []),
    leer<{ id: string; nombre: string; rol: string | null; comunidad: { nombre: string } | null }[]>(
      "personas_comunidad?select=id,nombre,rol,comunidad:comunidad_id(nombre)&order=nombre.asc&limit=2000",
    ).catch(() => []),
  ]);

  return [
    ...comerciales.map((c) => ({
      valor: "comercial:" + c.id,
      texto: [c.nombre, c.apellidos].filter(Boolean).join(" "),
      pista: "comercial nuestro",
    })),
    ...personas.map((p) => ({
      valor: "persona:" + p.id,
      texto: p.nombre,
      pista: [p.puesto?.[0]?.cargo, p.puesto?.[0]?.empresa?.nombre_accesalia].filter(Boolean).join(" · ") || "sin empresa",
    })),
    ...contratas.map((c) => ({
      valor: "contrata:" + c.id,
      texto: c.nombre,
      pista: c.contrata?.nombre ? "contrata · " + c.contrata.nombre : "contrata",
    })),
    ...vecinos.map((v) => ({
      valor: "vecino:" + v.id,
      texto: v.nombre,
      pista: [v.rol, v.comunidad?.nombre].filter(Boolean).join(" · ") || "vecino",
    })),
  ];
}

/** Del valor de la casilla a la columna que toca. Solo una, nunca dos: la base
 *  lo exige con `un_solo_quien`. */
export function columnasQuien(valor: string | null): {
  quien_persona_id: string | null;
  quien_comercial_id: string | null;
  quien_contrata_contacto_id: string | null;
  quien_persona_comunidad_id: string | null;
} {
  const vacio = {
    quien_persona_id: null,
    quien_comercial_id: null,
    quien_contrata_contacto_id: null,
    quien_persona_comunidad_id: null,
  };
  if (!valor) return vacio;
  const corte = valor.indexOf(":");
  if (corte < 0) return vacio;
  const clase = valor.slice(0, corte);
  const id = valor.slice(corte + 1);
  if (!id) return vacio;
  if (clase === "persona") return { ...vacio, quien_persona_id: id };
  if (clase === "comercial") return { ...vacio, quien_comercial_id: id };
  if (clase === "contrata") return { ...vacio, quien_contrata_contacto_id: id };
  if (clase === "vecino") return { ...vacio, quien_persona_comunidad_id: id };
  return vacio;
}
