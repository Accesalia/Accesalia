// lib/preguntasEscaneo.ts
//
// PREGUNTAR AL COMERCIAL DESDE LA MESA DE VIABILIDADES (Monica, 30-oct-2026, lo
// que pidio el arquitecto). «Esta direccion no esta creada, no puedo avanzar»,
// «¿tienes un escaneado del patio o del sotano?».
//
//   · Va a QUIEN MANDO EL POLYCAM (el remitente del escaneo), no al comercial
//     de la opp: muchas veces la opp aun no existe, y a Daniel el Polycam se lo
//     manda Abraham.
//   · Copias, las que se elijan al enviar. Ninguna por sistema: «la bandeja de
//     Daniel se va a llenar de ruido».
//   · Sale de tecnicos@ con el nombre de quien pregunta. Las respuestas vuelven
//     a tecnicos@ y la app las cuelga de su pregunta: el correo enviado lleva un
//     Message-ID propio, y su hilo de Gmail se encuentra por el.
//   · Queda apuntada en el escaneo y, si hay opp, en su diario.

import "server-only";
import { simpleParser } from "mailparser";
import { enviarCorreo, direccionDe } from "./correo";
import { paseArea } from "./buzonArea";
import { crudo } from "./gmailBuzon";
import { ALMACEN_POLYCAM, REMITENTES_ROBOT, correoLlano, cuerpoDelCorreo, extension, limpioNombre, subirFichero } from "./buzonPolycam";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

async function rest<T>(ruta: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...cab, ...(init?.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const t = await r.text();
  return (t ? JSON.parse(t) : null) as T;
}

export type Respuesta = { id: string; de: string | null; fecha: string | null; texto: string | null; adjuntos: { nombre: string; url: string | null }[] };
export type Pregunta = {
  id: string;
  creadoEn: string;
  autor: string | null;
  para: string;
  copias: string[];
  asunto: string;
  texto: string;
  cerradaEn: string | null;
  respuestas: Respuesta[];
};
export type ParaPreguntar = {
  escaneoId: string;
  /** A quien: el remitente del Polycam. Null = no se sabe (lo mando el propio Polycam). */
  para: string | null;
  /** Su nombre, si es del equipo. */
  quien: string | null;
  asunto: string;
  /** Para elegir copias. */
  equipo: { nombre: string; email: string }[];
  preguntas: Pregunta[];
};

type FilaPregunta = {
  id: string;
  creado_en: string;
  autor: string | null;
  para: string;
  copias: string[];
  asunto: string;
  texto: string;
  cerrada_en: string | null;
  escaneo_respuestas: { id: string; de: string | null; fecha: string | null; texto: string | null; adjuntos: { nombre: string; ruta: string }[] }[];
};
const SEL_PREGUNTA = "id,creado_en,autor,para,copias,asunto,texto,cerrada_en,escaneo_respuestas(id,de,fecha,texto,adjuntos)";

async function firmar(ruta: string): Promise<string | null> {
  const r = await fetch(`${URL_BASE}/storage/v1/object/sign/${ALMACEN_POLYCAM}/${ruta}`, {
    method: "POST",
    headers: cab,
    body: JSON.stringify({ expiresIn: 3600 }),
    cache: "no-store",
  });
  if (!r.ok) return null;
  const { signedURL } = (await r.json()) as { signedURL?: string };
  return signedURL ? `${URL_BASE}/storage/v1${signedURL}` : null;
}

async function aPregunta(f: FilaPregunta): Promise<Pregunta> {
  const respuestas = [...f.escaneo_respuestas].sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""));
  return {
    id: f.id,
    creadoEn: f.creado_en,
    autor: f.autor,
    para: f.para,
    copias: f.copias,
    asunto: f.asunto,
    texto: f.texto,
    cerradaEn: f.cerrada_en,
    respuestas: await Promise.all(
      respuestas.map(async (r) => ({
        id: r.id,
        de: r.de,
        fecha: r.fecha,
        texto: r.texto,
        adjuntos: await Promise.all((r.adjuntos ?? []).map(async (a) => ({ nombre: a.nombre, url: await firmar(a.ruta) }))),
      })),
    ),
  };
}

/** Lo que hace falta para preguntar sobre un escaneo, y lo ya preguntado. */
export async function paraPreguntar(escaneoId: string): Promise<ParaPreguntar | null> {
  const [e] = await rest<{ id: string; remitente: string | null; asunto: string | null; nombre_original_fichero: string | null; visito: { nombre: string; apellidos: string | null } | null }[]>(
    `escaneados_polycam?select=id,remitente,asunto,nombre_original_fichero,visito:visito_id(nombre,apellidos)&id=eq.${encodeURIComponent(escaneoId)}&limit=1`,
  );
  if (!e) return null;
  const mail = (e.remitente ?? "").trim().toLowerCase();
  const valido = mail.includes("@") && !REMITENTES_ROBOT.has(correoLlano(mail));
  const [equipo, filas] = await Promise.all([
    rest<{ nombre: string; apellidos: string | null; email: string | null }[]>("equipo?select=nombre,apellidos,email&activo=is.true&email=not.is.null&order=nombre"),
    rest<FilaPregunta[]>(`escaneo_preguntas?select=${SEL_PREGUNTA}&escaneo_id=eq.${encodeURIComponent(escaneoId)}&order=creado_en.desc`).catch(() => [] as FilaPregunta[]),
  ]);
  const base = (e.asunto ?? "").replace(/^\s*((re|rv|fw|fwd)\s*:\s*)+/i, "").trim() || e.nombre_original_fichero || "tu escaneo";
  return {
    escaneoId: e.id,
    para: valido ? mail : null,
    quien: e.visito ? [e.visito.nombre, e.visito.apellidos].filter(Boolean).join(" ") : null,
    asunto: `Dudas sobre el escaneo: ${base}`,
    equipo: equipo.filter((p) => p.email).map((p) => ({ nombre: [p.nombre, p.apellidos].filter(Boolean).join(" "), email: p.email!.trim().toLowerCase() })),
    preguntas: await Promise.all(filas.map(aPregunta)),
  };
}

/** La opp del escaneo, para su diario: la de su viabilidad o, si aun no la hay,
 *  la UNICA opp abierta de su portal. Con varias no se adivina. */
async function oppDelEscaneo(escaneoId: string): Promise<string | null> {
  const [e] = await rest<{ viabilidades: { oportunidad_id: string | null } | null; relacion_polycam_acceso: { acceso_id: string }[] }[]>(
    `escaneados_polycam?select=viabilidades(oportunidad_id),relacion_polycam_acceso(acceso_id)&id=eq.${encodeURIComponent(escaneoId)}&limit=1`,
  );
  if (e?.viabilidades?.oportunidad_id) return e.viabilidades.oportunidad_id;
  const accesos = (e?.relacion_polycam_acceso ?? []).map((r) => r.acceso_id);
  if (!accesos.length) return null;
  const rel = await rest<{ opp_id: string }[]>(`relacion_oportunidad_accesos?select=opp_id&hasta=is.null&acceso_id=in.(${accesos.join(",")})`);
  const ids = Array.from(new Set(rel.map((r) => r.opp_id)));
  if (!ids.length) return null;
  const abiertas = await rest<{ id: string }[]>(`oportunidades?select=id&estado=eq.abierta&id=in.(${ids.join(",")})`);
  return abiertas.length === 1 ? abiertas[0].id : null;
}

const correoValido = (s: string) => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(s);

/** Envia la pregunta y la deja apuntada. Devuelve el fallo, o null si salio. */
export async function enviarPregunta(d: {
  escaneoId: string;
  asunto: string;
  texto: string;
  /** A quien. Sale con el remitente del Polycam, pero se puede cambiar (30-oct-2026). */
  para: string[];
  copias: string[];
  yo: { id: string; nombre: string; apellidos: string | null };
}): Promise<string | null> {
  const p = await paraPreguntar(d.escaneoId);
  if (!p) return "Ese escaneo no existe.";
  const limpia = (l: string[]) => Array.from(new Set(l.map((c) => c.trim().toLowerCase()).filter(Boolean)));
  const para = limpia(d.para);
  if (!para.length) return "Falta a quién se le pregunta.";
  const texto = d.texto.trim();
  if (!texto) return "Escribe la pregunta.";
  const copias = limpia(d.copias).filter((c) => !para.includes(c));
  const malos = [...para, ...copias].filter((c) => !correoValido(c));
  if (malos.length) return `Este correo no es válido: ${malos.join(", ")}`;
  const asunto = d.asunto.trim() || p.asunto;
  const nombreDe = (c: string) => p.equipo.find((x) => x.email === c)?.nombre ?? c;
  const autor = [d.yo.nombre, d.yo.apellidos].filter(Boolean).join(" ");

  // El Message-ID propio: por el se encuentra despues el hilo en tecnicos@.
  const idCorreo = `<pregunta-${crypto.randomUUID()}@accesalia-crm.vercel.app>`;
  const r = await enviarCorreo({
    desde: "tecnicos",
    nombreRemitente: `${d.yo.nombre} · Accesalia`,
    para: para.join(", "),
    copias: copias.join(", ") || null,
    asunto,
    texto: `${texto}\n\n— ${autor}\n\nContesta a este correo (a todos, si hay más gente en copia): la respuesta le llega a la mesa de viabilidades.\n`,
    idCorreo,
  });
  if (!r.ok) return `No se ha enviado: ${r.dice}`;

  await rest("escaneo_preguntas", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ escaneo_id: d.escaneoId, autor_id: d.yo.id, autor, para: para.join(", "), copias, asunto, texto, id_correo: idCorreo }),
  });

  // Al diario de la opp, si la hay. Si esto fallara, la pregunta ya salio y esta apuntada.
  try {
    const opp = await oppDelEscaneo(d.escaneoId);
    if (opp) {
      await rest("notas_oportunidad", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          oportunidad_id: opp,
          fecha: new Date().toISOString().slice(0, 10),
          texto: `Pregunta sobre el escaneo a ${para.map(nombreDe).join(", ")}${copias.length ? ` (copia a ${copias.map(nombreDe).join(", ")})` : ""}: ${texto}`,
          autor,
          autor_id: d.yo.id,
          origen: "persona",
          canal: "mail",
        }),
      });
    }
  } catch (e) {
    console.error("[preguntas] diario", e);
  }
  return null;
}

/** Darla por contestada a mano (le contestaron por telefono), o reabrirla. */
export async function cerrarPregunta(id: string, cerrar: boolean): Promise<void> {
  await rest(`escaneo_preguntas?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ cerrada_en: cerrar ? new Date().toISOString() : null }),
  });
}

export type EstadoPregunta = { para: string; quien: string | null; cuando: string; contestada: boolean };

/** Para la lista de la mesa: la ultima pregunta de cada escaneo. */
export async function estadoPreguntas(): Promise<Record<string, EstadoPregunta>> {
  const filas = await rest<{ escaneo_id: string; para: string; creado_en: string; cerrada_en: string | null; escaneo_respuestas: { id: string }[]; escaneados_polycam: { visito: { nombre: string } | null } | null }[]>(
    "escaneo_preguntas?select=escaneo_id,para,creado_en,cerrada_en,escaneo_respuestas(id),escaneados_polycam(visito:visito_id(nombre))&order=creado_en.asc",
  ).catch(() => []);
  const salida: Record<string, EstadoPregunta> = {};
  for (const f of filas) {
    salida[f.escaneo_id] = {
      para: f.para,
      quien: f.escaneados_polycam?.visito?.nombre ?? null,
      cuando: f.creado_en,
      contestada: !!f.cerrada_en || f.escaneo_respuestas.length > 0,
    };
  }
  return salida;
}

// ------------------------------------------------------------ las respuestas

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

async function gmail<T>(token: string, ruta: string): Promise<T> {
  const r = await fetch(`${GMAIL}${ruta}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(60_000) });
  if (!r.ok) throw new Error(`Gmail ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json() as Promise<T>;
}

/** El hilo del correo enviado. Gmail guarda el enviado por SMTP en Enviados con
 *  su Message-ID; si no lo encontrara, se busca por el asunto una respuesta que
 *  cite ese Message-ID. */
async function hiloDe(token: string, idCorreo: string, asunto: string): Promise<string | null> {
  const porId = await gmail<{ messages?: { id: string; threadId: string }[] }>(token, `/messages?${new URLSearchParams({ q: `rfc822msgid:${idCorreo.replace(/[<>]/g, "")}`, includeSpamTrash: "true" })}`);
  if (porId.messages?.[0]) return porId.messages[0].threadId;
  const porAsunto = await gmail<{ messages?: { id: string; threadId: string }[] }>(
    token,
    `/messages?${new URLSearchParams({ q: `subject:(${asunto.replace(/[()"]/g, " ")}) newer_than:90d`, includeSpamTrash: "true", maxResults: "20" })}`,
  );
  for (const m of porAsunto.messages ?? []) {
    const c = await gmail<{ payload?: { headers?: { name: string; value: string }[] } }>(token, `/messages/${m.id}?format=metadata&metadataHeaders=In-Reply-To&metadataHeaders=References`);
    if ((c.payload?.headers ?? []).some((h) => h.value.includes(idCorreo))) return m.threadId;
  }
  return null;
}

export type RepasoPreguntas = { sinPermiso?: boolean; miradas: number; respuestas: number; errores: string[] };

/** Lee tecnicos@ y cuelga de cada pregunta abierta sus respuestas nuevas, con
 *  sus adjuntos. Solo lee: no marca ni mueve nada del buzon. */
export async function repasarRespuestas(): Promise<RepasoPreguntas> {
  const r: RepasoPreguntas = { miradas: 0, respuestas: 0, errores: [] };
  const token = await paseArea("tecnicos");
  if (!token) return { ...r, sinPermiso: true };
  const propio = correoLlano(direccionDe("tecnicos"));
  const hace = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const abiertas = await rest<{ id: string; id_correo: string; asunto: string; hilo_gmail: string | null; escaneo_respuestas: { id_gmail: string }[] }[]>(
    `escaneo_preguntas?select=id,id_correo,asunto,hilo_gmail,escaneo_respuestas(id_gmail)&cerrada_en=is.null&creado_en=gte.${hace}`,
  ).catch(() => []);

  for (const p of abiertas) {
    r.miradas++;
    try {
      let hilo = p.hilo_gmail;
      if (!hilo) {
        hilo = await hiloDe(token, p.id_correo, p.asunto);
        if (!hilo) continue;
        await rest(`escaneo_preguntas?id=eq.${p.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ hilo_gmail: hilo }) });
      }
      const ya = new Set(p.escaneo_respuestas.map((x) => x.id_gmail));
      const h = await gmail<{ messages?: { id: string; payload?: { headers?: { name: string; value: string }[] } }[] }>(
        token,
        `/threads/${hilo}?format=metadata&metadataHeaders=From&metadataHeaders=Message-ID`,
      );
      for (const m of h.messages ?? []) {
        if (ya.has(m.id)) continue;
        const cabs = m.payload?.headers ?? [];
        const de = cabs.find((x) => x.name.toLowerCase() === "from")?.value ?? "";
        const mid = cabs.find((x) => x.name.toLowerCase() === "message-id")?.value ?? "";
        const mail = correoLlano((de.match(/<([^>]+)>/)?.[1] ?? de).trim());
        // Lo nuestro (la propia pregunta) no es respuesta.
        if (mail === propio || mid.trim() === p.id_correo) continue;

        const correo = await simpleParser(await crudo(token, m.id));
        const adjuntos: { nombre: string; ruta: string }[] = [];
        for (const a of correo.attachments ?? []) {
          if (!a.content || !a.size || a.contentDisposition === "inline") continue;
          const nombre = a.filename ?? "adjunto";
          const ruta = `preguntas/${p.id}/${m.id}-${limpioNombre(nombre)}${extension(nombre)}`;
          await subirFichero(ruta, a.content as Buffer, a.contentType ?? "application/octet-stream", ALMACEN_POLYCAM);
          adjuntos.push({ nombre, ruta });
        }
        await rest("escaneo_respuestas?on_conflict=id_gmail", {
          method: "POST",
          headers: { Prefer: "return=minimal,resolution=ignore-duplicates" },
          body: JSON.stringify({
            pregunta_id: p.id,
            id_gmail: m.id,
            de: correo.from?.value?.[0]?.address ?? mail,
            fecha: correo.date ? correo.date.toISOString() : null,
            texto: cuerpoDelCorreo(correo),
            adjuntos,
          }),
        });
        r.respuestas++;
      }
    } catch (e) {
      r.errores.push(`pregunta ${p.id} · ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return r;
}
