// lib/solicitudViabilidad.ts
//
// PEDIR VIABILIDAD Y COSTES AL ARQUITECTO, SIN POLYCAM (Monica, 15-oct-2026).
// "Si hay prisas o el comercial nos ha enviado fotos (no Polycam), podemos aun
// asi pedir a Alex la viabilidad". Un boton en el bloque 1 de la opp, con lo
// minimo: DONDE (sus accesos), QUE QUIEREN (prerrelleno con sus intereses, pero
// solo para esta viabilidad: no toca los de la opp) y una DESCRIPCION. Y sitio
// para fotos, planos, croquis a mano alzada... "no sabemos que nos va a llegar".
//
// En la escalera hace de Polycam: al enviarla, la opp entra en la fase 4 ("que
// el arquitecto defina la viabilidad") con la fecha de la solicitud. A Alex le
// llega a su mesa y por correo, y la empieza desde alli.

import "server-only";
import { nombreDeOpp } from "./direccionOpp";
import { enviarCorreo } from "./correo";
import { quienTieneLaFuncion } from "./quienLleva";
import { recalcularLuego } from "./estadoOportunidad";
import type { Yo } from "./sesion";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };
const CAB_ALMACEN = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const ALMACEN = "documentos-comerciales";
const APP = process.env.URL_PUBLICA ?? "https://accesalia-crm.vercel.app";
const PUBLICA = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_BASE;

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${ruta.split("?")[0]} ${r.status}: ${await r.text()}`);
  return (r.status === 204 || r.headers.get("content-length") === "0" ? null : await r.json()) as T;
}
const uuid = (x: string) => /^[0-9a-f-]{36}$/.test(x);

export type NuevaSolicitud = {
  accesos: string[];
  tipos: string[];
  descripcion: string;
  /** "AAAA-MM-DD", si hay prisa. */
  paraCuando?: string | null;
};

/** Lo que el formulario trae ya puesto: los accesos de la opp (todos marcados) y
 *  lo que dicen que quieren. */
export async function formularioSolicitud(oppId: string): Promise<{ accesos: { id: string; texto: string }[]; tipos: string[] } | null> {
  if (!uuid(oppId)) return null;
  const [rel, tipos] = await Promise.all([
    pedir<{ acceso: { id: string; tipo_via: string | null; nombre_via: string | null; numero: string | null; escalera: string | null; municipio: string | null } | null }[]>(
      `relacion_oportunidad_accesos?select=acceso:acceso_id(id,tipo_via,nombre_via,numero,escalera,municipio)&opp_id=eq.${oppId}&hasta=is.null`,
    ),
    pedir<{ tipo_id: string }[]>(`oportunidad_tipos?select=tipo_id&oportunidad_id=eq.${oppId}`),
  ]);
  return {
    accesos: rel
      .map((r) => r.acceso)
      .filter((a): a is NonNullable<typeof a> => !!a)
      .map((a) => ({ id: a.id, texto: [a.tipo_via, a.nombre_via, a.numero].filter(Boolean).join(" ") + (a.escalera ? `, esc. ${a.escalera}` : "") + (a.municipio ? ` · ${a.municipio}` : "") }))
      .sort((a, b) => a.texto.localeCompare(b.texto, "es", { numeric: true })),
    tipos: tipos.map((t) => t.tipo_id),
  };
}

/** Pedirla: se guarda, la opp entra en la fase 4 y se avisa a quien hace
 *  viabilidades. Devuelve su id (para subir despues el material) y los avisos
 *  que no salieron. */
export async function pedirViabilidad(oppId: string, s: NuevaSolicitud, yo: Yo): Promise<{ id: string; avisos: string[] }> {
  if (!uuid(oppId)) throw new Error("Oportunidad no válida.");
  const descripcion = s.descripcion.trim();
  if (!descripcion) throw new Error("Describe qué hay que estudiar.");
  if (!s.tipos.length) throw new Error("Di qué quieren.");
  if (!s.accesos.length) throw new Error("Marca al menos un acceso.");
  const suyos = new Set(
    (await pedir<{ acceso_id: string }[]>(`relacion_oportunidad_accesos?select=acceso_id&opp_id=eq.${oppId}&hasta=is.null`)).map((r) => r.acceso_id),
  );
  if (s.accesos.some((a) => !suyos.has(a))) throw new Error("Algún acceso no es de esta oportunidad.");
  const [f] = await pedir<{ id: string }[]>("solicitudes_viabilidad?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      oportunidad_id: oppId,
      accesos: [...new Set(s.accesos)],
      tipos: [...new Set(s.tipos)],
      descripcion,
      para_cuando: s.paraCuando || null,
      pedida_por: yo.id,
    }),
  });
  recalcularLuego(oppId);

  const [o] = await pedir<{ codigo: string | null; nombre: string | null }[]>(`oportunidades?select=codigo,nombre&id=eq.${oppId}`);
  const donde = o ? nombreDeOpp(o) : "una oportunidad";
  const avisos: string[] = [];
  const hacen = await quienTieneLaFuncion("viabilidades");
  for (const p of hacen) {
    if (!p.correo) { avisos.push(`${p.nombre} no tiene correo`); continue; }
    const e = await enviarCorreo({
      desde: "comercial",
      para: p.correo,
      asunto: `Viabilidad pedida sin Polycam: ${donde}`,
      texto:
        `${yo.nombre} pide la viabilidad y los costes de ${donde}` +
        (s.paraCuando ? `, para el ${s.paraCuando.split("-").reverse().join("/")}` : "") +
        `.\n\n${descripcion}\n\nEn tu mesa: ${APP}/viabilidades\n`,
      responderA: yo.email,
    });
    if (!e.ok) avisos.push(`${p.nombre}: ${e.dice ?? "no salió"}`);
  }
  if (!hacen.length) avisos.push("nadie tiene hoy la función de viabilidades");
  return { id: f.id, avisos };
}

// ------------------------------------------------------------ el material

const limpioFichero = (n: string) =>
  n.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").slice(-80) || "fichero";

/** Permiso de subida de un fichero de la solicitud (PUT del navegador a `url`). */
export async function permisoMaterial(solicitudId: string, nombre: string): Promise<{ ruta: string; url: string }> {
  if (!uuid(solicitudId)) throw new Error("Solicitud no válida.");
  const ruta = `solicitudes-viabilidad/${solicitudId}/${crypto.randomUUID().slice(0, 8)}-${limpioFichero(nombre)}`;
  const r = await fetch(`${URL_BASE}/storage/v1/object/upload/sign/${ALMACEN}/${ruta}`, { method: "POST", headers: CAB_ALMACEN, cache: "no-store" });
  if (!r.ok) throw new Error(`Almacén ${r.status}: ${await r.text()}`);
  const { url } = (await r.json()) as { url: string };
  return { ruta, url: `${PUBLICA()}/storage/v1${url}` };
}

/** Ya subido: queda en la solicitud. */
export async function apuntarMaterial(solicitudId: string, ruta: string, nombre: string): Promise<string> {
  if (!ruta.startsWith(`solicitudes-viabilidad/${solicitudId}/`)) throw new Error("Ese fichero no es de esta solicitud.");
  const info = await fetch(`${URL_BASE}/storage/v1/object/info/${ALMACEN}/${ruta}`, { headers: CAB_ALMACEN, cache: "no-store" });
  if (!info.ok) throw new Error("El fichero no ha llegado al almacén.");
  const [f] = await pedir<{ id: string }[]>("solicitudes_viabilidad_adjuntos?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ solicitud_id: solicitudId, ruta_almacen: `${ALMACEN}/${ruta}`, nombre: nombre.trim() || null }),
  });
  return f.id;
}

/** Enlace de diez minutos para abrir un fichero de una solicitud. */
export async function enlaceMaterial(adjuntoId: string): Promise<string | null> {
  if (!uuid(adjuntoId)) return null;
  const [a] = await pedir<{ ruta_almacen: string }[]>(`solicitudes_viabilidad_adjuntos?select=ruta_almacen&id=eq.${adjuntoId}`);
  if (!a) return null;
  const r = await fetch(`${URL_BASE}/storage/v1/object/sign/${a.ruta_almacen}`, {
    method: "POST",
    headers: { ...CAB_ALMACEN, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 600 }),
    cache: "no-store",
  });
  if (!r.ok) return null;
  const { signedURL } = (await r.json()) as { signedURL: string };
  return `${PUBLICA()}/storage/v1${signedURL}`;
}

/** De que opp es una solicitud (para el permiso de las acciones). */
export async function oppDeSolicitud(solicitudId: string): Promise<string | null> {
  if (!uuid(solicitudId)) return null;
  const [s] = await pedir<{ oportunidad_id: string }[]>(`solicitudes_viabilidad?select=oportunidad_id&id=eq.${solicitudId}`);
  return s?.oportunidad_id ?? null;
}

// ------------------------------------------------------------ la mesa de Alex

export type SolicitudPendiente = {
  id: string;
  oportunidadId: string;
  opp: string;
  codigo: string | null;
  accesos: string;
  quieren: string;
  descripcion: string;
  paraCuando: string | null;
  pedidaPor: string | null;
  pedidaEn: string;
  material: { id: string; nombre: string }[];
};

/** Las solicitudes que esperan a que el arquitecto las empiece, la mas antigua
 *  arriba: la lista "Viabilidades pedidas sin Polycam" de la mesa. */
export async function solicitudesPendientes(): Promise<SolicitudPendiente[]> {
  const filas = await pedir<{
    id: string; oportunidad_id: string; accesos: string[]; tipos: string[]; descripcion: string; para_cuando: string | null; pedida_en: string;
    por: { nombre: string } | null; opp: { codigo: string | null; nombre: string | null } | null;
    material: { id: string; nombre: string | null; ruta_almacen: string }[];
  }[]>(
    "solicitudes_viabilidad?select=id,oportunidad_id,accesos,tipos,descripcion,para_cuando,pedida_en,por:pedida_por(nombre),opp:oportunidad_id(codigo,nombre)," +
      "material:solicitudes_viabilidad_adjuntos(id,nombre,ruta_almacen)&estado=eq.pendiente&order=pedida_en.asc",
  );
  if (!filas.length) return [];
  const accesos = [...new Set(filas.flatMap((f) => f.accesos))];
  const tipos = [...new Set(filas.flatMap((f) => f.tipos))];
  const [acc, tip] = await Promise.all([
    pedir<{ id: string; nombre_via: string | null; numero: string | null; escalera: string | null }[]>(`accesos?select=id,nombre_via,numero,escalera&id=in.(${accesos.join(",")})`),
    pedir<{ id: string; nombre: string }[]>(`tipos_proyecto?select=id,nombre&id=in.(${tipos.join(",")})`),
  ]);
  const accTexto = new Map(acc.map((a) => [a.id, [a.nombre_via, a.numero].filter(Boolean).join(" ") + (a.escalera ? ` esc. ${a.escalera}` : "")]));
  const tipNombre = new Map(tip.map((t) => [t.id, t.nombre]));
  return filas.map((f) => ({
    id: f.id,
    oportunidadId: f.oportunidad_id,
    opp: f.opp ? nombreDeOpp(f.opp) : "",
    codigo: f.opp?.codigo ?? null,
    accesos: f.accesos.map((a) => accTexto.get(a) ?? "").filter(Boolean).join(" · "),
    quieren: f.tipos.map((t) => tipNombre.get(t) ?? "").filter(Boolean).join(", "),
    descripcion: f.descripcion,
    paraCuando: f.para_cuando,
    pedidaPor: f.por?.nombre ?? null,
    pedidaEn: f.pedida_en,
    material: f.material.map((m) => ({ id: m.id, nombre: m.nombre ?? m.ruta_almacen.split("/").pop() ?? "fichero" })),
  }));
}

/** El arquitecto la EMPIEZA: nace su viabilidad (de la opp, sin escaneo) y la
 *  solicitud queda empezada. Devuelve el id de la viabilidad, para abrirla. */
export async function empezarSolicitud(solicitudId: string, yo: Yo): Promise<string> {
  const [s] = await pedir<{ oportunidad_id: string; estado: string; viabilidad_id: string | null }[]>(
    `solicitudes_viabilidad?select=oportunidad_id,estado,viabilidad_id&id=eq.${solicitudId}`,
  );
  if (!s) throw new Error("No existe esa solicitud.");
  if (s.viabilidad_id) return s.viabilidad_id;
  if (s.estado !== "pendiente") throw new Error("Esa solicitud ya no está pendiente.");
  const [v] = await pedir<{ id: string }[]>("viabilidades?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ oportunidad_id: s.oportunidad_id, redacta_id: yo.id }),
  });
  await pedir(`solicitudes_viabilidad?id=eq.${solicitudId}`, {
    method: "PATCH",
    body: JSON.stringify({ estado: "empezada", viabilidad_id: v.id, empezada_en: new Date().toISOString() }),
  });
  recalcularLuego(s.oportunidad_id);
  return v.id;
}
