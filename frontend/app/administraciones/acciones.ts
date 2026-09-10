"use server";

// Server actions del CRM (eje administracion de fincas). Corren en el servidor
// con la clave secreta; escriben via REST de Supabase.
//
// Ojo al leer esto: lo que en pantalla es UN formulario, aqui son VARIAS tablas.
// El modelo viejo metia persona, empresa y correo en una sola fila; el nuevo los
// separa, y eso se paga aqui, en la escritura:
//
//     la administracion   ->  empresa
//     su email            ->  correo (una fila con empresa_id)
//     su titular          ->  el puesto cuyo cargo dice "titular"
//     una persona         ->  persona (quien es) + puesto (donde trabaja)
//     el email de esa persona -> correo (una fila con puesto_id)
//
// A cambio, cuando alguien se cambia de administracion no se pierde el rastro de
// lo hablado con ella, que era el problema que teniamos.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

function cabeceras(extra: Record<string, string> = {}) {
  return {
    apikey: SECRETO,
    Authorization: `Bearer ${SECRETO}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function api(path: string, method: string, body?: unknown, prefer?: string) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method,
    headers: cabeceras(prefer ? { Prefer: prefer } : {}),
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${method} ${path}\n${await res.text()}`);
  return res;
}

function txt(fd: FormData, k: string): string | null {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
}

// ---- El correo, que ya no es una columna ----

/** El correo que se ensena en el formulario: el principal, o el primero. */
async function correoVisible(filtro: string): Promise<{ id: string } | null> {
  const filas = (await (await api(`correo?select=id,principal&${filtro}&order=principal.desc`, "GET")).json()) as
    { id: string; principal: boolean }[];
  return filas[0] ?? null;
}

/** Guarda el correo del formulario sin tocar los demas que pueda haber.
 *
 *  El formulario ensena UNO. Si hay mas (una casa puede tener varios), se
 *  quedan como estan: borrarlos por no verse seria perder datos a ciegas.
 *  Si el campo se deja vacio a proposito, ese uno si se borra. */
async function guardarCorreo(filtro: string, dueno: Record<string, string>, email: string | null) {
  const actual = await correoVisible(filtro);
  if (!email) {
    if (actual) await api(`correo?id=eq.${actual.id}`, "DELETE");
    return;
  }
  if (actual) await api(`correo?id=eq.${actual.id}`, "PATCH", { email, principal: true });
  else await api("correo", "POST", { ...dueno, email, principal: true });
}

// ---- Administracion de fincas (tabla empresa) ----

function cuerpoAdministracion(fd: FormData) {
  const nombre = txt(fd, "nombre");
  if (!nombre) throw new Error("El nombre de la administración es obligatorio.");
  return {
    nombre_accesalia: nombre,
    // sin valor por defecto: vacio significa que aun no se ha decidido, y eso
    // es una respuesta valida. Antes entraban todas como "contacto" sin mirar.
    estado: txt(fd, "estado"),
    cif: txt(fd, "cif"),
    telefono: txt(fd, "telefono"),
    direccion: txt(fd, "direccion"),
    municipio: txt(fd, "municipio"),
    notas: txt(fd, "notas"),
    comercial_id: txt(fd, "comercial_id"),
    comercial_captador_id: txt(fd, "comercial_captador_id"),
    fecha_alta_cartera: txt(fd, "fecha_alta_cartera"),
    motivo_fin: txt(fd, "motivo_fin"),
    fecha_fin: txt(fd, "fecha_fin"),
    activa: fd.get("activo") !== null,
  };
}

/** Deja como titular al puesto elegido y se lo quita a quien lo tuviera. */
async function fijarTitular(empresaId: string, puestoId: string | null) {
  const salvo = puestoId ? `&id=neq.${puestoId}` : "";
  await api(`puesto?empresa_id=eq.${empresaId}&cargo=eq.titular${salvo}`, "PATCH", { cargo: null });
  if (puestoId) await api(`puesto?id=eq.${puestoId}`, "PATCH", { cargo: "titular" });
}

export async function crearAdministracion(fd: FormData) {
  const res = await api("empresa", "POST", cuerpoAdministracion(fd), "return=representation");
  const [creada] = (await res.json()) as { id: string }[];

  await guardarCorreo(`empresa_id=eq.${creada.id}`, { empresa_id: creada.id }, txt(fd, "email"));

  revalidatePath("/administraciones");
  redirect(`/administraciones/${creada.id}`);
}

export async function actualizarAdministracion(id: string, fd: FormData) {
  await api(`empresa?id=eq.${id}`, "PATCH", cuerpoAdministracion(fd));
  await guardarCorreo(`empresa_id=eq.${id}`, { empresa_id: id }, txt(fd, "email"));
  // el desplegable de titular manda el id de un PUESTO, no de una persona
  await fijarTitular(id, txt(fd, "titular_id"));

  revalidatePath("/administraciones");
  revalidatePath(`/administraciones/${id}`);
  redirect(`/administraciones/${id}`);
}

// ---- Personas: persona (quien es) + puesto (su trabajo en esa casa) ----

/** Quien es la persona que manda el buscador: una que ya existe, o una nueva.
 *
 *  Devuelve el id de la PERSONA. El buscador manda el id de un puesto (que es
 *  lo que se ve en pantalla), asi que hay que subir del puesto a la persona:
 *  si Maria trabajaba en Del Brio y ahora tambien en Monge, es la misma Maria
 *  con dos puestos, no dos Marias. Eso es lo que evita duplicarla una vez por
 *  cada comunidad que lleva. */
async function identidadElegida(fd: FormData): Promise<string> {
  const puestoElegido = txt(fd, "puesto_id");
  if (puestoElegido) {
    const filas = (await (await api(
      `puesto?select=persona_id&id=eq.${puestoElegido}&limit=1`, "GET")).json()) as
      { persona_id: string }[];
    if (!filas[0]) throw new Error("No encuentro a esa persona.");
    return filas[0].persona_id;
  }

  const nombre = txt(fd, "persona_nueva") ?? txt(fd, "nombre");
  if (!nombre) throw new Error("Elige a una persona de la lista o escribe un nombre nuevo.");
  const rp = await api("persona", "POST",
    { nombre, activa: fd.get("activo") !== null }, "return=representation");
  const [persona] = (await rp.json()) as { id: string }[];
  return persona.id;
}

export async function crearPersona(administracionId: string, fd: FormData) {
  const yaExistia = txt(fd, "puesto_id") !== null;
  const personaId = await identidadElegida(fd);
  const persona = { id: personaId };

  // Que no se enganche dos veces a la misma casa: eso si seria un duplicado.
  if (yaExistia) {
    const repes = (await (await api(
      `puesto?select=id&persona_id=eq.${personaId}&empresa_id=eq.${administracionId}&limit=1`,
      "GET")).json()) as { id: string }[];
    if (repes[0]) throw new Error("Esa persona ya está en esta administración.");
  }

  let puestoId: string;
  try {
    const rpu = await api("puesto", "POST", {
      persona_id: persona.id,
      empresa_id: administracionId,
      cargo: txt(fd, "cargo"),
      telefono_empresa: txt(fd, "telefono"),
      notas: txt(fd, "notas"),
    }, "return=representation");
    [{ id: puestoId }] = (await rpu.json()) as { id: string }[];
  } catch (e) {
    // Si la persona se acaba de crear y el puesto falla, queda flotando: mejor
    // deshacer que dejar basura. No hay transacciones por REST, se limpia aqui.
    // A una que ya existia no se la toca, faltaria mas.
    if (!yaExistia) await api(`persona?id=eq.${persona.id}`, "DELETE").catch(() => {});
    throw e;
  }

  const email = txt(fd, "email");
  if (email) await api("correo", "POST", { puesto_id: puestoId, email, principal: true });

  revalidatePath(`/administraciones/${administracionId}`);
  redirect(`/administraciones/${administracionId}`);
}

export async function actualizarPersona(id: string, administracionId: string, fd: FormData) {
  const nombre = txt(fd, "nombre");
  if (!nombre) throw new Error("El nombre de la persona es obligatorio.");

  // id es el del PUESTO (es lo que la app ensena como "administrador"), asi que
  // primero hay que saber de que persona es.
  const filas = (await (await api(`puesto?select=persona_id&id=eq.${id}&limit=1`, "GET")).json()) as
    { persona_id: string }[];
  if (!filas[0]) throw new Error("No encuentro esa persona.");

  await api(`persona?id=eq.${filas[0].persona_id}`, "PATCH",
    { nombre, activa: fd.get("activo") !== null });

  await api(`puesto?id=eq.${id}`, "PATCH", {
    cargo: txt(fd, "cargo"),
    telefono_empresa: txt(fd, "telefono"),
    notas: txt(fd, "notas"),
  });

  await guardarCorreo(`puesto_id=eq.${id}`, { puesto_id: id }, txt(fd, "email"));

  revalidatePath(`/administraciones/${administracionId}`);
  revalidatePath(`/administradores/${id}`);
  redirect(`/administraciones/${administracionId}`);
}

/** Marca una persona como titular (dueño que percibe comisión) de su administración. */
export async function marcarTitular(administracionId: string, personaId: string) {
  // personaId es el id del puesto: es lo que la ficha tiene a mano
  await fijarTitular(administracionId, personaId);
  revalidatePath(`/administraciones/${administracionId}`);
}

// ---------------------------------------------------------------------------
// El diario: una nota nueva sobre la administracion o sobre alguien de su gente.
//
// Monica, viendo la ficha: "aqui echo de menos la parte del diario comercial —o
// en este caso diario administrativo—, donde alguien pueda meter una entrada de
// texto con lo que sea".
//
// Es la primera escritura que abrimos en esta pantalla a proposito: una nota no
// pisa ningun dato, solo se apila. Si sale mal, se borra una fila.
//
// El autor va a mano mientras no haya inicio de sesion. Cuando lo haya, saldra
// de la sesion y este campo dejara de escribirse.
// ---------------------------------------------------------------------------
export async function crearNotaAdministracion(formData: FormData) {
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return;

  const empresaId = String(formData.get("empresa_id") ?? "");
  const puestoId = String(formData.get("puesto_id") ?? "");
  const autor = String(formData.get("autor") ?? "").trim() || null;

  // Cuelga de la persona si se eligio una, y si no, de la administracion.
  // Nunca de las dos: la tabla lo impide con un CHECK.
  const fila = puestoId
    ? { puesto_id: puestoId, texto, autor, origen: "app" }
    : { empresa_id: empresaId, texto, autor, origen: "app" };

  const r = await fetch(`${URL_BASE}/rest/v1/notas_administracion_fincas`, {
    method: "POST",
    headers: cabeceras({ Prefer: "return=minimal" }),
    body: JSON.stringify(fila),
  });
  if (!r.ok) throw new Error(`No se pudo guardar la nota: ${await r.text()}`);

  revalidatePath(`/administraciones/${empresaId}`);
}

/**
 * Corregir una entrada del diario. Monica: "el diario debe poder editarse, por
 * las erratas".
 *
 * Se corrige el texto en su sitio, no se guarda version anterior: para una
 * errata no hace falta, y guardar el historial de cada arreglo de dedo
 * ensuciaria el diario mas de lo que ayuda. `actualizado_en` deja constancia
 * de que se toco, que es lo unico que importa saber despues.
 */
export async function editarNotaAdministracion(formData: FormData) {
  const id = String(formData.get("nota_id") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();
  const empresaId = String(formData.get("empresa_id") ?? "");
  if (!id || !texto) return;

  const r = await fetch(`${URL_BASE}/rest/v1/notas_administracion_fincas?id=eq.${id}`, {
    method: "PATCH",
    headers: cabeceras({ Prefer: "return=minimal" }),
    body: JSON.stringify({ texto }),
  });
  if (!r.ok) throw new Error(`No se pudo corregir la nota: ${await r.text()}`);

  revalidatePath(`/administraciones/${empresaId}`);
}
