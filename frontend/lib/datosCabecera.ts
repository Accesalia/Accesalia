// lib/datosCabecera.ts
//
// EDITAR EN LA CABECERA DE LA OPP LO QUE CUENTAN LAS NOTAS (Monica, 27-oct-2026): «en muchos casos las notas tienen
// info muy util, como nos llega a traves de..., mi contacto es..., o el admin es... ¿se podria editar en la propia
// pagina y que quede guardado donde debe?». Cada dato a su casa, sin campos nuevos:
//   - ADMINISTRACION        → la comunidad (comunidad_admin_responsable, con historial): «el admin es de la
//                             comunidad, nunca de la opp». Cambiarlo cambia el de todas sus opps; la pantalla avisa.
//   - NOS LLEGA A TRAVES DE → oportunidades.quien_lo_trae (persona) o quien_comercial_id (lib/quien.ts).
//   - MI CONTACTO           → oportunidades.puesto_id (el puesto vigente de esa persona).
// Las personas nuevas se crean como en el alta (colocarPersonaNueva): una sola manera de dar de alta a alguien.
import "server-only";
import { adminEnEspera, colocarPersonaNueva, type PersonaNueva } from "./altaOportunidad";
import { columnasQuien } from "./quien";
import { comunidadesDeOpp, ponerAdministrador } from "./adminComunidad";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}
async function cambiarOpp(oppId: string, cambio: Record<string, unknown>) {
  const r = await fetch(`${URL_BASE}/rest/v1/oportunidades?id=eq.${oppId}`, {
    method: "PATCH",
    headers: { ...CAB, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(cambio),
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
}
const uuid = (x: string) => /^[0-9a-f-]{36}$/.test(x);

export type CampoCabecera = "admin" | "trajo" | "contacto";
export type OpcionPersona = { valor: string; texto: string; pista: string };

/** Buscar a quien poner: personas de la agenda (con su cargo y su empresa) y, para «nos llega a traves de», tambien
 *  los comerciales de casa. Por nombre o apellidos, sin tildes de por medio. */
export async function buscarPersonas(q: string, campo: CampoCabecera): Promise<OpcionPersona[]> {
  const t = q.trim().replace(/[%*(),.]/g, " ").trim();
  if (t.length < 2) return [];
  const pat = encodeURIComponent(`*${t.split(/\s+/).join("*")}*`);
  const [personas, comerciales] = await Promise.all([
    leer<{ id: string; nombre: string; apellidos: string | null; puesto: { cargo: string | null; empresa: { nombre_accesalia: string } | null; contrata: { nombre: string } | null }[] }[]>(
      `persona?select=id,nombre,apellidos,puesto(cargo,empresa(nombre_accesalia),contrata:contratas(nombre))&puesto.hasta=is.null&activa=is.true` +
        `&or=(nombre.ilike.${pat},apellidos.ilike.${pat})&order=nombre.asc&limit=25`,
    ),
    campo === "trajo"
      ? leer<{ id: string; nombre: string; apellidos: string | null }[]>(`comerciales?select=id,nombre,apellidos&activo=eq.true&or=(nombre.ilike.${pat},apellidos.ilike.${pat})&limit=10`)
      : Promise.resolve([]),
  ]);
  return [
    ...comerciales.map((c) => ({ valor: "comercial:" + c.id, texto: [c.nombre, c.apellidos].filter(Boolean).join(" "), pista: "comercial nuestro" })),
    ...personas.map((p) => {
      const pu = p.puesto?.[0];
      const donde = pu?.empresa?.nombre_accesalia ?? (pu?.contrata?.nombre ? "contrata · " + pu.contrata.nombre : null);
      return { valor: "persona:" + p.id, texto: [p.nombre, p.apellidos].filter(Boolean).join(" "), pista: [pu?.cargo, donde].filter(Boolean).join(" · ") || "sin cargo" };
    }),
  ];
}

/** Guardar un dato de la cabecera: alguien de la agenda (`valor`, «persona:…» o «comercial:…») o una persona nueva. */
export async function guardarDatoCabecera(
  oppId: string,
  campo: CampoCabecera,
  d: { valor: string | null; nueva: PersonaNueva | null },
  comercialId: string | null,
): Promise<string> {
  if (!uuid(oppId)) throw new Error("Oportunidad no válida");
  const comunidades = await comunidadesDeOpp(oppId);
  let valor = d.valor;
  if (!valor && d.nueva?.nombre?.trim()) {
    // La persona nueva nace donde le toca: el contacto, como gente de la comunidad; el admin, como administrador.
    const que = campo === "admin" ? "administrador" : campo === "contacto" ? (d.nueva.que ?? "vecino") : d.nueva.que;
    valor = await colocarPersonaNueva({ ...d.nueva, nombre: d.nueva.nombre.trim(), que }, { comunidadId: comunidades[0]?.id ?? null, comercialId });
  }
  if (!valor) throw new Error("Elige a alguien de la lista o escribe el nombre de la persona nueva.");

  if (campo === "trajo") {
    await cambiarOpp(oppId, columnasQuien(valor));
    return "guardado";
  }

  const [clase, id] = valor.split(":");
  if (clase !== "persona" || !uuid(id ?? "")) throw new Error("Para esto hace falta una persona de la agenda.");

  if (campo === "contacto") {
    const [pu] = await leer<{ id: string }[]>(`puesto?select=id&persona_id=eq.${id}&hasta=is.null&order=desde.desc.nullslast&limit=1`);
    if (!pu) throw new Error("Esa persona no tiene ningún puesto vigente: dale uno en su ficha.");
    await cambiarOpp(oppId, { puesto_id: pu.id, contacto_provisional: null, telefono_provisional: null, correo_provisional: null });
    return "guardado";
  }

  // campo === "admin" SIN COMUNIDAD TODAVIA (Monica, 28-oct-2026: «que se cree y
  // quede colgando de la opp; cuando se genere la comunidad, se vincula»).
  if (!comunidades.length) {
    if (!(await adminEnEspera(oppId, id))) throw new Error("Esa persona no tiene ningún puesto vigente: dale uno en su ficha.");
    return "guardado";
  }
  // campo === "admin": a todas las comunidades de la opp, con historial (el anterior se cierra con fecha de hoy).
  const res = await Promise.all(
    comunidades.map((c) => ponerAdministrador(c.id, id, { cambia: true, nota: "Puesto desde la cabecera de la oportunidad (27-oct-2026)." })),
  );
  if (res.every((r) => r === "sin_puesto")) throw new Error("Esa persona no tiene ningún puesto vigente: dale uno en su ficha.");
  return res.includes("cambiado") ? "cambiado" : "guardado";
}

/** Añadir un contacto a la comunidad (la caja «Contactos de la comunidad»): persona + puesto en la comunidad. */
export async function anadirContactoComunidad(oppId: string, n: PersonaNueva, comercialId: string | null): Promise<void> {
  const comunidades = await comunidadesDeOpp(oppId);
  if (!comunidades.length) throw new Error("Esta oportunidad no tiene comunidad todavía.");
  if (!n.nombre?.trim()) throw new Error("Falta el nombre.");
  await colocarPersonaNueva({ ...n, nombre: n.nombre.trim(), que: "vecino" }, { comunidadId: comunidades[0].id, comercialId });
}
