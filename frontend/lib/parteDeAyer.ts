// lib/parteDeAyer.ts
//
// EL PARTE DE AYER (Monica, 28-oct-2026). Sali lee el correo de un dia de un
// comercial y le prepara su parte. EN PRUEBA: lo lanza direccion a mano desde
// Gestiones y lo ve solo direccion.
//
// LOS CORREOS VAN TAL CUAL. Monica: «los hilos son precisamente lo mas util;
// todo lo que quitas o añades TU despista, porque NO es lo que se espera de una
// bandeja de correo». Asi que se baja cada hilo que tuvo movimiento ese dia,
// ENTERO (tambien los mensajes de dias anteriores, con sus citas, firmas y avisos
// legales), y solo se deja fuera lo que pasó DESPUES de ese dia (en el parte de
// cada noche no lo habra) y los borradores. De los adjuntos va el nombre.
//
// EL PERMISO: cada comercial da permiso una vez, SOLO LECTURA, con el mismo
// proyecto de Google que el buzon del Polycam (y la misma vuelta). La llave va
// cifrada al Vault (migracion 20261028160000).

import "server-only";
import { cliente, VUELTA } from "./gmailBuzon";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

/** Solo leer: ni marcar, ni mover, ni enviar, ni borrar. */
const PERMISO = "https://www.googleapis.com/auth/gmail.readonly";

export const MODELOS = {
  large: "mistral-large-2512",
  medium: "mistral-medium-latest",
} as const;
export type Modelo = keyof typeof MODELOS;

// Las instrucciones de Monica, tal cual las dejo el 28-oct (8.ª version de la prueba).
export const INSTRUCCIONES = `Eres Sali, experta comercial de Accesalia (estudio de arquitectura de Madrid especializado en ascensores y sate en comunidades de vecinos. Accesalia también oferta servicios paralelos como tramitación de subvenciones, IEE, estudio de presupuestos y búsqueda de contratas especialistas para la obra).  ç

Accesalia NO hace obras: las hacen contratas (Schindler, Otis, TK, Onelift...).  pero si hace la dirección facultativa de las obras de las que hizo el proyecto.

CONCEPTOS CLAVE:
- Hoja de encargo: es nuestro contrato de servicios. Firmar la hoja es lo que nos hace cobrar y saber qué nos comprometemos a hacer a cambio.
- Junta de vecinos: donde se vota y decide si se firma nuestra hoja de encargo (oferta) o no. Su fecha, lugar y otros detalles son críticos.
- Viabilidad: visita que genera el informe de viabilidad donde se explica las posibilidad es y costes de lo que la comunidad necesita hacer. Suele ir con un "Polycam", que es un escaneado en 3d que se hace con el móvil para que el arquitecto en oficina vea como es el sitio donde intervenir.
- Ayudas o Subvenciones: a las que la comunidad puede optar para poder pagar la obra. Son comunidades de pocos recursos: para ellos es clave.
- Administrador de fincas: es nuestro cliente objetivo, la pieza clave, con su cartera de comunidades de la que salen nuestros proyectos.
- Presupuesto: suele referirse al de la obra= cuanto cuesta poner el ascensor/poner el sate/hacer la rampa, etc. Estos vienen de la contrata. Pero a veces, el mismo término se refiere a NUESTRO precio: se infiere por el contexto.
- Diario: notas de seguimiento de las interacciones con la comunidad.


TU TRABAJO:
Cada noche lees el correo del día de un comercial (entrada y enviados) y preparas su «parte de ayer»: eres su ángel de la guarda: te aseguras de que no se le traspapele nada. Es muy importante que sepas discriminar importante de urgente.

Tú no tocas nada: propones y el comercial es quien decide si sigue tu recomendación o no.


Como guía no exhaustiva: Para cada asunto con sustancia, agrupado por comunidad (dirección), propón lo que aplique:
- nota para el diario (qué ha pasado, en una o dos frases con datos concretos);
- documentos que cargar en la app (sobre todo HOJAS DE ENCARGO FIRMADAS, actas, presupuestos enviados);
- fechas: juntas de vecinos, visitas, citas → agenda;
- decisiones de los vecinos o de la junta;
- seguimientos que merezcan la pena (qué y cuándo);
- señales de riesgo: competidores, quejas, plazos que vencen, gente enfadada, dudas sin contestar → responder, arriba del todo;.
- datos de contacto: administradores, presidentes, comerciales, vecinos... → completar la base de datos de contactos con sus datos

REGLA: si algo ya está contestado o gestionado dentro del propio hilo, NO lo pongas como pendiente: inclúyelo marcado «YA RESUELTO» (sirve para el diario). Lo que sigue sin respuesta sí es pendiente.
Ignora publicidad y lo personal. No inventes datos que no estén en los correos.

REGLA DE ORO:
Por definición, habrá lagunas en la información: la gente no cuenta todo el contexto, faltarán datos.. no importa, es como debe ser. No intentes rellenar esas lagunas, señálalas, porque gran parte de la labor comercial es completarlas. Será de gran ayuda si las señalas pero NO las rellenas, porque tu inferencia puede ser incorrecta y tapar falsamente un hueco que el comercial necesita completar adecuadamente.

PUEDES INCLUIR: de forma opcional una sección al final con alguna recomendación (maximo 3) si crees que vale la pena, basada en los datos y que sea de especial relevancia para el día a dia comercial (una jugada estratégica).

Formato: español, en secciones URGENTE / NUEVO CLIENTE / DOCUMENTOS QUE CARGAR / OFERTAS Y SEGUIMIENTO / YA RESUELTO / VISITAS / DESCARTADO / JUGADAS ESTRATÉGICAS. Una entrada por comunidad, con la dirección en negrita y la acción con →. Breve y concreto.`;

// ------------------------------------------------------------------ permiso

export function urlPermisoComercial(estado: string, correo: string): string {
  const q = new URLSearchParams({
    client_id: cliente().id,
    redirect_uri: VUELTA,
    response_type: "code",
    scope: PERMISO,
    access_type: "offline",
    prompt: "consent",
    login_hint: correo,
    state: estado,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

async function rest<T>(ruta: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...cab, ...(init?.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const t = await r.text();
  return (t ? JSON.parse(t) : null) as T;
}

export type ComercialCorreo = { id: string; nombre: string; correo: string | null; conectado: boolean };

/** Los comerciales activos, su correo de trabajo y si han dado permiso. */
export async function comercialesConCorreo(): Promise<ComercialCorreo[]> {
  const filas = await rest<{ id: string; nombre: string; equipo: { email: string | null } | null }[]>(
    "comerciales?select=id,nombre,equipo:equipo_id(email)&activo=is.true&order=nombre",
  );
  let conectados: string[] = [];
  try {
    conectados = await rest<string[]>("rpc/correo_comercial_conectados", { method: "POST", body: "{}" });
  } catch {
    // sin la migracion todavia: nadie conectado
  }
  return filas.map((f) => ({ id: f.id, nombre: f.nombre, correo: f.equipo?.email ?? null, conectado: conectados.includes(f.id) }));
}

/** Vuelta de Google: cambia el codigo por la llave, comprueba que el permiso lo
 *  ha dado LA CUENTA DEL COMERCIAL (y no otra) y la guarda. */
export async function guardarPermisoComercial(codigo: string, comercialId: string): Promise<string> {
  const { id, secreto } = cliente();
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code: codigo, client_id: id, client_secret: secreto, redirect_uri: VUELTA, grant_type: "authorization_code" }),
  });
  const t = (await r.json()) as { access_token?: string; refresh_token?: string; error_description?: string; error?: string };
  if (!r.ok || !t.access_token) throw new Error(`Google no dio el permiso: ${t.error_description ?? t.error ?? r.status}`);
  if (!t.refresh_token) throw new Error("Google no devolvió la llave permanente. Vuelve a conectar.");

  const p = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", { headers: { Authorization: `Bearer ${t.access_token}` } });
  const { emailAddress } = (await p.json()) as { emailAddress?: string };
  const yo = (await comercialesConCorreo()).find((c) => c.id === comercialId);
  if (!yo) throw new Error("Ese comercial no está activo.");
  const esperado = (yo.correo ?? "").trim().toLowerCase();
  if (!emailAddress || !esperado || emailAddress.toLowerCase() !== esperado) {
    throw new Error(`Has entrado con ${emailAddress ?? "otra cuenta"}: hay que entrar con ${esperado || "el correo de " + yo.nombre}.`);
  }
  await rest("rpc/correo_comercial_guardar", { method: "POST", body: JSON.stringify({ p_comercial: comercialId, p_llave: t.refresh_token }) });
  return emailAddress;
}

async function pase(comercialId: string): Promise<string> {
  const ref = await rest<string | null>("rpc/correo_comercial_llave", { method: "POST", body: JSON.stringify({ p_comercial: comercialId }) });
  if (!ref) throw new Error("Este comercial aún no ha conectado su correo.");
  const { id, secreto } = cliente();
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ refresh_token: ref, client_id: id, client_secret: secreto, grant_type: "refresh_token" }),
  });
  const t = (await r.json()) as { access_token?: string; error?: string };
  if (!r.ok || !t.access_token) throw new Error(`Google no renueva el permiso (${t.error ?? r.status}): hay que volver a conectar el correo.`);
  return t.access_token;
}

// ------------------------------------------------------------------ correos

type Parte = { mimeType?: string; filename?: string; body?: { data?: string; attachmentId?: string }; parts?: Parte[]; headers?: { name: string; value: string }[] };
type Mensaje = { id: string; internalDate: string; labelIds?: string[]; payload: Parte };

async function gmail<T>(token: string, ruta: string): Promise<T> {
  const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${ruta}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(60_000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Gmail ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json() as Promise<T>;
}

/** Medianoche de Madrid de ese dia, en milisegundos. */
function medianocheMadrid(dia: string): number {
  const [a, m, d] = dia.split("-").map(Number);
  const utc = Date.UTC(a, m - 1, d);
  const enMadrid = new Date(new Date(utc).toLocaleString("en-US", { timeZone: "Europe/Madrid" })).getTime();
  const enUtc = new Date(new Date(utc).toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  return utc - (enMadrid - enUtc);
}

const decodificar = (b64: string) => Buffer.from(b64, "base64url").toString("utf8");

function textoDe(p: Parte): { plano: string[]; html: string[]; adjuntos: string[] } {
  const out = { plano: [] as string[], html: [] as string[], adjuntos: [] as string[] };
  const andar = (x: Parte) => {
    if (x.filename) out.adjuntos.push(x.filename);
    else if (x.mimeType === "text/plain" && x.body?.data) out.plano.push(decodificar(x.body.data));
    else if (x.mimeType === "text/html" && x.body?.data) out.html.push(decodificar(x.body.data));
    for (const h of x.parts ?? []) andar(h);
  };
  andar(p);
  return out;
}

// Solo si el correo no trae version de texto: se le quitan las etiquetas HTML.
function htmlATexto(h: string): string {
  return h
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n");
}

/** Los hilos con movimiento ese dia, enteros y tal cual, hasta el final del dia. */
export async function correosDelDia(comercialId: string, dia: string): Promise<{ texto: string; hilos: number }> {
  const token = await pase(comercialId);
  const desde = medianocheMadrid(dia);
  const siguiente = new Date(desde + 36 * 3600_000).toISOString().slice(0, 10);
  const hasta = medianocheMadrid(siguiente);

  const ids: string[] = [];
  let pagina: string | undefined;
  do {
    const q = new URLSearchParams({ q: `after:${Math.floor(desde / 1000)} before:${Math.floor(hasta / 1000)}`, maxResults: "100" });
    if (pagina) q.set("pageToken", pagina);
    const r = await gmail<{ threads?: { id: string }[]; nextPageToken?: string }>(token, `/threads?${q}`);
    ids.push(...(r.threads ?? []).map((t) => t.id));
    pagina = r.nextPageToken;
  } while (pagina && ids.length < 300);

  const bloques: string[] = [];
  for (const id of ids) {
    const h = await gmail<{ messages: Mensaje[] }>(token, `/threads/${id}?format=full`);
    const mensajes = h.messages.filter((m) => Number(m.internalDate) < hasta && !(m.labelIds ?? []).includes("DRAFT"));
    if (!mensajes.length) continue;
    const partes = mensajes.map((m, i) => {
      const cabecera = (n: string) => m.payload.headers?.find((x) => x.name.toLowerCase() === n)?.value ?? "";
      const t = textoDe(m.payload);
      const cuerpo = t.plano.length ? t.plano.join("\n") : htmlATexto(t.html.join("\n"));
      return [
        `--- Mensaje ${i + 1} de ${mensajes.length} ---`,
        `De: ${cabecera("from")}`,
        `Para: ${cabecera("to")}`,
        ...(cabecera("cc") ? [`Cc: ${cabecera("cc")}`] : []),
        `Fecha: ${cabecera("date")}`,
        `Asunto: ${cabecera("subject")}`,
        ...(t.adjuntos.length ? [`Adjuntos: ${t.adjuntos.join(", ")}`] : []),
        "",
        cuerpo.trim(),
      ].join("\n");
    });
    bloques.push(partes.join("\n\n"));
  }
  const texto = bloques.map((b, i) => `=== Hilo ${i + 1} de ${bloques.length} ===\n${b}`).join("\n\n");
  return { texto, hilos: bloques.length };
}

// ------------------------------------------------------------------ sali

export async function generarParte(opts: { comercialId: string; correo: string; dia: string; modelo: Modelo; pedidoPor: string | null }): Promise<string> {
  const { texto, hilos } = await correosDelDia(opts.comercialId, opts.dia);
  const usuario = `Correo de ${opts.correo}, día ${opts.dia}. Entrada y enviados, hilos completos.\n\n${texto}`;
  const fila: Record<string, unknown> = {
    comercial_id: opts.comercialId,
    dia: opts.dia,
    modelo: MODELOS[opts.modelo],
    instrucciones: INSTRUCCIONES,
    correos: usuario,
    hilos,
    pedido_por: opts.pedidoPor,
  };

  const clave = process.env.MISTRAL_API_KEY;
  const t0 = Date.now();
  try {
    if (!clave) throw new Error("Falta MISTRAL_API_KEY en Vercel.");
    if (!hilos) throw new Error("Ese día no hay correos.");
    const r = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODELOS[opts.modelo],
        temperature: 0.2,
        messages: [
          { role: "system", content: INSTRUCCIONES },
          { role: "user", content: usuario },
        ],
      }),
      signal: AbortSignal.timeout(240_000),
    });
    const d = (await r.json()) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens: number; completion_tokens: number }; message?: string };
    if (!r.ok) throw new Error(`Mistral ${r.status}: ${d.message ?? JSON.stringify(d).slice(0, 300)}`);
    fila.texto = d.choices?.[0]?.message?.content ?? "";
    fila.input_tokens = d.usage?.prompt_tokens ?? null;
    fila.output_tokens = d.usage?.completion_tokens ?? null;
    // Contabilidad comun de la IA (best-effort, como en las edges).
    rest("uso_llm", {
      method: "POST",
      body: JSON.stringify({
        origen: "parte-de-ayer",
        proveedor: "mistral",
        modelo: MODELOS[opts.modelo],
        nivel: opts.modelo,
        actor_id: opts.pedidoPor,
        input_tokens: fila.input_tokens,
        output_tokens: fila.output_tokens,
        cache_creacion_tokens: 0,
        cache_lectura_tokens: 0,
      }),
    }).catch(() => {});
  } catch (e) {
    fila.error = e instanceof Error ? e.message : String(e);
  }
  fila.segundos = Math.round((Date.now() - t0) / 100) / 10;

  const [g] = await rest<{ id: string }[]>("partes_de_ayer?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(fila),
  });
  return g.id;
}

export type ParteGuardado = {
  id: string;
  comercial_id: string;
  dia: string;
  modelo: string;
  hilos: number;
  texto: string | null;
  error: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  segundos: number | null;
  creado_en: string;
};

export async function partesGuardados(): Promise<ParteGuardado[]> {
  try {
    return await rest<ParteGuardado[]>(
      "partes_de_ayer?select=id,comercial_id,dia,modelo,hilos,texto,error,input_tokens,output_tokens,segundos,creado_en&order=creado_en.desc&limit=40",
    );
  } catch {
    return []; // sin la migracion todavia
  }
}

// $ por millon de tokens (entrada, salida). Large: pagina oficial de Mistral
// (28-oct-2026). Medium 3.5: recopiladores de precios (Mistral no lo publica).
const PRECIO: Record<string, [number, number]> = {
  "mistral-large-2512": [0.5, 1.5],
  "mistral-medium-latest": [1.5, 7.5],
};
export function costeUsd(modelo: string, entrada: number | null, salida: number | null): number | null {
  const p = PRECIO[modelo];
  if (!p || entrada == null || salida == null) return null;
  return (entrada * p[0] + salida * p[1]) / 1e6;
}
