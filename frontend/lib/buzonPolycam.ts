// lib/buzonPolycam.ts
//
// EL BUZON DEL POLYCAM (Monica, 29-sep-2026).
//
// El comercial escanea con Polycam, y manda el fichero por correo a
// buzon.polycam.accesalia@gmail.com con LA DIRECCION EN EL ASUNTO. La app abre
// ese buzon cada rato, coge el adjunto, lo cuelga de la oportunidad que toca,
// deja el cuerpo del correo como nota del diario y avisa a quien revisa
// viabilidades.
//
// TRES REGLAS QUE GOBIERNAN ESTO:
//
//  1. NUNCA ADIVINA EN SILENCIO. O encuentra la direccion con certeza, o el
//     correo se queda marcado "sin sitio" para que lo coloque una persona. Un
//     Polycam colgado de la comunidad equivocada es peor que uno sin colgar.
//  2. EL BUZON ES LA BANDEJA. No hay tabla de pendientes: el correo original se
//     queda en Gmail para siempre, y esa es la mejor copia de seguridad que hay.
//     Sin leer = por procesar. Leido = hecho. Con la etiqueta = no supe donde.
//  3. ESTA ES LA SEGUNDA PUERTA, NO LA PRIMERA. Lo mismo se puede subir a mano
//     desde la pantalla de la oportunidad. El correo falla -asuntos mal escritos,
//     ficheros de mas de 25 MB, reenvios desde el movil- y cuando falle tiene que
//     haber otra forma. No es un apaño temporal: es la salida de emergencia.

import "server-only";

import { ImapFlow } from "imapflow";
import { simpleParser, type Attachment, type ParsedMail } from "mailparser";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const ALMACEN = "documentos-comerciales";

/** La etiqueta que se le pone al correo que no se supo colocar. */
export const SIN_SITIO = "accesalia-sin-sitio";

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: cab, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

async function crear<T>(tabla: string, fila: unknown): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${tabla}`, {
    method: "POST",
    headers: { ...cab, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(fila),
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

// --------------------------------------------------------------- direcciones

/** Para cotejar: sin tildes, sin signos, sin dobles espacios y en mayusculas.
 *  "Gral. Ricardos, 238 - Madrid" y "GENERAL RICARDOS 238 MADRID" siguen siendo
 *  distintas, y tienen que serlo: esto NO inventa equivalencias. */
export function aplanar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

/** Gmail ignora los puntos: danielcrm@ y daniel.crm@ son el MISMO buzon. */
export function correoLlano(e: string): string {
  const [antes, dominio] = e.trim().toLowerCase().split("@");
  if (!dominio) return e.trim().toLowerCase();
  const sinAlias = antes.split("+")[0];
  const local = /^(gmail|googlemail)\.com$/.test(dominio) ? sinAlias.replace(/\./g, "") : sinAlias;
  return `${local}@${dominio}`;
}

/** Una direccion del asunto contra la lista de comunidades. Devuelve la comunidad
 *  SOLO si no hay duda: si encajan dos, no encaja ninguna. */
export function cotejar(
  asunto: string,
  comunidades: { id: string; nombre: string }[],
): { id: string; nombre: string } | null {
  const a = aplanar(asunto);
  if (a.length < 6) return null;

  const exactas = comunidades.filter((c) => aplanar(c.nombre) === a);
  if (exactas.length === 1) return exactas[0];
  if (exactas.length > 1) return null;

  const dentro = comunidades.filter((c) => {
    const n = aplanar(c.nombre);
    return n.length >= 6 && (a.includes(n) || n.includes(a));
  });
  return dentro.length === 1 ? dentro[0] : null;
}

// ------------------------------------------------------------------ almacen

async function subirFichero(ruta: string, datos: Buffer, tipoMime: string) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/${ALMACEN}/${ruta}`, {
    method: "POST",
    headers: { ...cab, "Content-Type": tipoMime || "application/octet-stream" },
    body: new Uint8Array(datos),
  });
  if (!r.ok) throw new Error(`Storage ${r.status}: ${await r.text()}`);
}

const limpioNombre = (s: string) =>
  aplanar(s.replace(/\.[a-z0-9]+$/i, ""))
    .replace(/ /g, "-")
    .slice(0, 60)
    .toLowerCase() || "fichero";

/** Apunta un documento en la tabla, encadenando versiones: si ya habia uno del
 *  mismo tipo en la misma oportunidad, el nuevo es la version siguiente y el
 *  anterior deja de estar vigente. */
export async function apuntarDocumento(d: {
  oportunidadId: string;
  comunidadId: string | null;
  tipoDocumentoId: string;
  ruta: string;
  naturaleza: "subido" | "generado_app";
}): Promise<string> {
  const previos = await leer<{ id: string; grupo_id: string; n_version: number }[]>(
    `documentos?select=id,grupo_id,n_version&oportunidad_id=eq.${d.oportunidadId}` +
      `&tipo_documento_id=eq.${d.tipoDocumentoId}&order=n_version.desc&limit=1`,
  );
  const previo = previos[0];

  if (previo) {
    await fetch(`${URL_BASE}/rest/v1/documentos?grupo_id=eq.${previo.grupo_id}`, {
      method: "PATCH",
      headers: { ...cab, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ vigente: false }),
    });
  }

  const [doc] = await crear<{ id: string }[]>("documentos", {
    oportunidad_id: d.oportunidadId,
    comunidad_id: d.comunidadId,
    tipo_documento_id: d.tipoDocumentoId,
    naturaleza: d.naturaleza,
    estado_firma: "no_aplica",
    backend: "supabase",
    storage_ref: d.ruta,
    vigente: true,
    grupo_id: previo?.grupo_id ?? crypto.randomUUID(),
    n_version: (previo?.n_version ?? 0) + 1,
  });
  return doc.id;
}

// -------------------------------------------------------------------- avisos

/** Avisa a quien tiene una funcion, sea quien sea. Los nombres no se escriben en
 *  el codigo: hoy "viabilidades" son Alex y Daniel, y manaña puede ser otro. */
export async function avisarAQuienHace(
  funcionClave: string,
  a: { texto: string; motivo: string; enlace: string; oportunidadId: string | null },
) {
  const hoy = new Date().toISOString().slice(0, 10);
  const filas = await leer<{ equipo_id: string; desde: string | null; hasta: string | null }[]>(
    `equipo_funciones?select=equipo_id,desde,hasta,funciones!inner(clave)&funciones.clave=eq.${funcionClave}`,
  );
  const gente = Array.from(
    new Set(filas.filter((f) => (!f.desde || f.desde <= hoy) && (!f.hasta || f.hasta >= hoy)).map((f) => f.equipo_id)),
  );
  if (gente.length === 0) return 0;

  await crear("avisos", gente.map((id) => ({
    para_id: id,
    texto: a.texto,
    motivo: a.motivo,
    enlace: a.enlace,
    oportunidad_id: a.oportunidadId,
  })));
  return gente.length;
}

// ------------------------------------------------------------------- el paso

export type Repaso = {
  mirados: number;
  colocados: number;
  sinSitio: { de: string; asunto: string; porque: string }[];
  avisos: number;
  errores: string[];
};

export async function repasarBuzon(): Promise<Repaso> {
  const usuario = process.env.BUZON_POLYCAM_USUARIO;
  const clave = process.env.BUZON_POLYCAM_CLAVE;
  if (!usuario || !clave) throw new Error("Faltan BUZON_POLYCAM_USUARIO / BUZON_POLYCAM_CLAVE en el entorno.");

  const [comunidades, equipo, tipos] = await Promise.all([
    leer<{ id: string; nombre: string }[]>("comunidades?select=id,nombre&limit=5000"),
    leer<{ id: string; email: string | null }[]>("equipo?select=id,email&activo=is.true"),
    leer<{ id: string; nombre: string }[]>("tipos_documento?select=id,nombre&nombre=eq.Escaneo%20Polycam&limit=1"),
  ]);
  const tipoPolycam = tipos[0];
  if (!tipoPolycam) throw new Error('Falta el tipo de documento "Escaneo Polycam" en el catálogo.');

  const porCorreo = new Map(equipo.filter((e) => e.email).map((e) => [correoLlano(e.email!), e.id]));

  const cliente = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: usuario, pass: clave.replace(/\s+/g, "") },
    logger: false,
  });

  const r: Repaso = { mirados: 0, colocados: 0, sinSitio: [], avisos: 0, errores: [] };

  await cliente.connect();
  const cerrojo = await cliente.getMailboxLock("INBOX");
  try {
    // Sin leer y sin la etiqueta de "ya miré esto y no supe colocarlo".
    const pendientes = await cliente.search({ seen: false });
    const lista = Array.isArray(pendientes) ? pendientes : [];

    for (const uid of lista) {
      r.mirados++;
      let asunto = "(sin asunto)";
      let de = "—";
      try {
        const bajado = await cliente.download(String(uid), undefined, { uid: true });
        if (!bajado?.content) throw new Error("el correo no trae contenido");
        const correo: ParsedMail = await simpleParser(bajado.content);
        asunto = correo.subject?.trim() || "(sin asunto)";
        de = correo.from?.value?.[0]?.address ?? "—";

        // 1 · ¿lo manda alguien de casa? Ese buzon tiene una direccion que
        //     cualquiera puede escribir.
        const autorId = porCorreo.get(correoLlano(de));
        if (!autorId) {
          await cliente.messageFlagsAdd(String(uid), [SIN_SITIO], { uid: true });
          await cliente.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
          r.sinSitio.push({ de, asunto, porque: "el remitente no es del equipo" });
          continue;
        }

        // 2 · la direccion del asunto, sin adivinar
        const comunidad = cotejar(asunto, comunidades);
        if (!comunidad) {
          await cliente.messageFlagsAdd(String(uid), [SIN_SITIO], { uid: true });
          await cliente.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
          r.sinSitio.push({ de, asunto, porque: "el asunto no encaja con ninguna dirección, o encaja con varias" });
          continue;
        }

        // 3 · su oportunidad. Si hay varias abiertas, tampoco se adivina.
        const ops = await leer<{ id: string }[]>(
          `oportunidades?select=id&comunidad_id=eq.${comunidad.id}&estado=eq.activa&order=creado_en.desc`,
        );
        if (ops.length !== 1) {
          await cliente.messageFlagsAdd(String(uid), [SIN_SITIO], { uid: true });
          await cliente.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
          r.sinSitio.push({
            de,
            asunto,
            porque: ops.length === 0 ? `${comunidad.nombre} no tiene ninguna oportunidad abierta` : `${comunidad.nombre} tiene ${ops.length} oportunidades abiertas`,
          });
          continue;
        }
        const oportunidadId = ops[0].id;

        // 4 · los adjuntos, al almacen
        const adjuntos = (correo.attachments ?? []).filter((a: Attachment) => a.content && a.size > 0);
        for (const a of adjuntos) {
          const ruta = `oportunidades/${oportunidadId}/polycam/${crypto.randomUUID().slice(0, 8)}-${limpioNombre(a.filename ?? "escaneo")}`;
          await subirFichero(ruta, a.content as Buffer, a.contentType ?? "application/octet-stream");
          await apuntarDocumento({
            oportunidadId,
            comunidadId: comunidad.id,
            tipoDocumentoId: tipoPolycam.id,
            ruta,
            naturaleza: "subido",
          });
        }

        // 5 · el cuerpo, al diario. `origen` solo admite cinco valores y polycam
        //     no es uno: llego por correo, asi que 'mail' es lo honesto, y el
        //     texto dice de donde sale.
        const cuerpo = (correo.text ?? "").trim();
        await crear("interacciones", {
          oportunidad_id: oportunidadId,
          transcripcion:
            `[Escaneo Polycam recibido por correo · ${adjuntos.length} ${adjuntos.length === 1 ? "fichero" : "ficheros"}]` +
            (cuerpo ? `\n\n${cuerpo}` : ""),
          origen: "mail",
          fecha_evento: (correo.date ?? new Date()).toISOString().slice(0, 10),
          autor_id: autorId,
          extraccion_estado: "sin_procesar",
          requiere_humano: false,
          pendiente_vincular: false,
        });

        // 6 · y que Alex se entere. Con la direccion POR VALIDAR: el cotejo
        //     automatico es lo mas fragil de todo esto, y quien abre el fichero
        //     puede comprobarlo sin coste.
        r.avisos += await avisarAQuienHace("viabilidades", {
          texto: `Polycam recibido de ${comunidad.nombre}. Valida que la dirección es correcta antes de empezar.`,
          motivo: "polycam_recibido",
          enlace: `/comercial/oportunidades/${oportunidadId}`,
          oportunidadId,
        });

        await cliente.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
        r.colocados++;
      } catch (e) {
        // Un correo que falla NO se marca leido: se vuelve a intentar al rato.
        r.errores.push(`${asunto} · ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } finally {
    cerrojo.release();
    await cliente.logout();
  }

  return r;
}
