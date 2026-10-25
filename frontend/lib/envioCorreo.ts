import "server-only";
import { personasDeComunidad } from "./personasComunidad";
import { nombreDeOpp } from "./direccionOpp";
// lib/envioCorreo.ts
//
// ENVIAR DOCUMENTOS A LA COMUNIDAD DESDE SU OPORTUNIDAD (Monica, 12-oct-2026).
//
//   - Sale del buzon COMERCIAL, pero con el NOMBRE del comercial de la
//     oportunidad ("Beatriz García · Accesalia"): el cliente sabe que es de ella.
//     Aunque lo pulse otra persona (Monica, Alejandra): "si es desde el de
//     Beatriz, le responden a Beatriz".
//   - Las respuestas van al correo con el que ese comercial entra en la app.
//   - Sin copia a nadie: Gmail ya guarda el correo en Enviados del buzon.
//   - Queda en `correos_enviados` (a quien, asunto, cuerpo y ENLACES a los
//     documentos, nunca los ficheros otra vez) y, SI O SI, en el diario de la
//     oportunidad.

import type { Yo } from "./sesion";
import { enviarCorreo } from "./correo";
import { crearEntrada } from "./entradaDiario";
import { pdfGuardado as pdfViabilidad } from "./viabilidadComercial";
import { pdfGuardado as pdfPresupuesto } from "./presupuesto";
import { pdfDeHojaVersion } from "./hojaEmitir";
import { ponerEstado } from "./hojaCompromisos";
import { recalcularLuego } from "./estadoOportunidad";
import { informesDeOportunidad, leerInforme } from "./informeCostes";
import { pdfDeInformeCostes } from "./pdf/InformeCostesDoc";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };
const APP = process.env.URL_PUBLICA ?? "https://accesalia-crm.vercel.app";

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return (r.status === 204 ? null : await r.json()) as T;
}

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Madrid" });
const CORREO_VALIDO = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

export type DocEnviable = {
  /** "viabilidad:<id>", "presupuesto:<id>", "he:<versionId>" (una hoja) o "costes:<id>". */
  clave: string;
  tipo: string;
  nombre: string;
  /** Donde se abre en la app (sin el dominio). */
  enlace: string;
  fecha: string | null;
};
export type Destinatario = { email: string; quien: string };
export type ParaEnviar = {
  codigo: string | null;
  nombre: string;
  comercial: { id: string; nombre: string; email: string | null } | null;
  documentos: DocEnviable[];
  destinatarios: Destinatario[];
};

type Opp = {
  codigo: string | null;
  nombre: string | null;
  comunidad_provisional: string | null;
  comunidad_id: string | null;
  puesto_id: string | null;
  contacto_provisional: string | null;
  correo_provisional: string | null;
  comunidad: { nombre: string } | null;
  comercial: { id: string; nombre: string; apellidos: string | null; equipo: { email: string | null } | null } | null;
};

/** Lo que se puede mandar de una oportunidad y a quien. */
export async function paraEnviar(oppId: string): Promise<ParaEnviar | null> {
  if (!/^[0-9a-f-]{36}$/.test(oppId)) return null;
  const [o] = await pedir<Opp[]>(
    `oportunidades?select=codigo,nombre,comunidad_provisional,comunidad_id,puesto_id,contacto_provisional,correo_provisional,` +
      `comunidad:comunidad_id(nombre),comercial:comercial_id(id,nombre,apellidos,equipo:equipo_id(email))&id=eq.${oppId}`,
  );
  if (!o) return null;

  // ---------------- los documentos generados
  const [viabs, pptos, informes, nuevas] = await Promise.all([
    pedir<{ id: string; numero: string | null; version: number; rematada_en: string | null }[]>(
      `viabilidades?select=id,numero,version,rematada_en&oportunidad_id=eq.${oppId}&url_pdf=not.is.null&order=creado_en.desc`,
    ),
    pedir<{ id: string; codigo: string | null; generado_en: string | null }[]>(
      `presupuestos?select=id,codigo,generado_en&oportunidad_id=eq.${oppId}&url_pdf=not.is.null&order=generado_en.desc`,
    ),
    informesDeOportunidad(oppId),
    // LAS HOJAS NUEVAS (25-oct-2026): las que tienen el ok de Daniel (para enviarlas) o ya se enviaron (para reenviarlas).
    pedir<{ id: string; codigo_he: string | null; numero_version: number; fecha_emision: string | null }[]>(
      `he_versiones_hoja?select=id,codigo_he,numero_version,fecha_emision&oportunidad_id=eq.${oppId}&pdf=not.is.null&estado=in.(ok_daniel,enviada,firma_con_errores)&order=creado_en.desc`,
    ),
  ]);
  const documentos: DocEnviable[] = [
    ...viabs.map((v) => ({ clave: `viabilidad:${v.id}`, tipo: "Viabilidad", nombre: `Viabilidad ${v.numero ?? ""} v${v.version}`.trim(), enlace: `/comercial/viabilidad/${v.id}/pdf`, fecha: v.rematada_en })),
    ...pptos.map((p) => ({ clave: `presupuesto:${p.id}`, tipo: "Presupuesto", nombre: `Presupuesto ${p.codigo ?? ""}`.trim(), enlace: `/comercial/presupuesto/pdf/${p.id}`, fecha: p.generado_en })),
    ...nuevas.map((v) => ({ clave: `he:${v.id}`, tipo: "Hoja de encargo", nombre: `Hoja de encargo ${v.codigo_he ?? ""} v${v.numero_version}`.trim(), enlace: `/comercial/hoja-encargo/pdf/${v.id}`, fecha: v.fecha_emision })),
    ...informes
      .filter((x) => x.tipo === "estimacion_costes")
      .map((x) => ({ clave: `costes:${x.id}`, tipo: "Estimación de costes", nombre: `Estimación de costes · ${x.datos.obra}`, enlace: `/referencia/estimacion/informe/${x.id}/pdf`, fecha: x.creado_en })),
  ];

  // ---------------- a quien: los contactos de la oportunidad y de su comunidad
  const destinatarios: Destinatario[] = [];
  const pon = (email: string | null | undefined, quien: string) => {
    const e = (email ?? "").trim().toLowerCase();
    if (CORREO_VALIDO.test(e) && !destinatarios.some((d) => d.email === e)) destinatarios.push({ email: e, quien });
  };
  // LOS ADMINISTRADORES SON DE LA COMUNIDAD (18-oct-2026): los de todas las
  // comunidades de la opp, por sus accesos (vista administradores_de_oportunidad).
  const adminPuestos = (
    await pedir<{ puesto_id: string | null }[]>(`administradores_de_oportunidad?select=puesto_id&oportunidad_id=eq.${oppId}&puesto_id=not.is.null`).catch(() => [])
  ).map((a) => a.puesto_id as string);
  const puestos = [...new Set([o.puesto_id, ...adminPuestos].filter((x): x is string => !!x))];
  const [correosPuesto, vecinos] = await Promise.all([
    puestos.length
      ? pedir<{ email: string; puesto_id: string; puesto: { persona: { nombre: string; apellidos: string | null } | null; empresa: { nombre_accesalia: string | null } | null } | null }[]>(
          `correo?select=email,puesto_id,puesto:puesto_id(persona:persona_id(nombre,apellidos),empresa:empresa_id(nombre_accesalia))&puesto_id=in.(${puestos.join(",")})&order=principal.desc.nullslast`,
        )
      : Promise.resolve([]),
    // UNA SOLA AGENDA (15-oct-2026): la gente de la comunidad, de persona + puesto.
    o.comunidad_id ? personasDeComunidad(o.comunidad_id).then((ps) => ps.filter((p) => p.email)) : Promise.resolve([]),
  ]);
  for (const c of correosPuesto) {
    const p = c.puesto?.persona;
    const quien = [p ? [p.nombre, p.apellidos].filter(Boolean).join(" ") : null, c.puesto?.empresa?.nombre_accesalia].filter(Boolean).join(" · ");
    pon(c.email, (adminPuestos.includes(c.puesto_id) ? "Administrador · " : "Contacto · ") + (quien || "sin nombre"));
  }
  for (const v of vecinos) pon(v.email, [v.rol ? v.rol.charAt(0).toUpperCase() + v.rol.slice(1) : "Vecino", v.nombre].filter(Boolean).join(" · "));
  pon(o.correo_provisional, `Contacto provisional${o.contacto_provisional ? ` · ${o.contacto_provisional}` : ""}`);

  return {
    codigo: o.codigo,
    nombre: nombreDeOpp(o),
    comercial: o.comercial
      ? { id: o.comercial.id, nombre: [o.comercial.nombre, o.comercial.apellidos].filter(Boolean).join(" "), email: o.comercial.equipo?.email ?? null }
      : null,
    documentos,
    destinatarios,
  };
}

/** El PDF de un documento, para adjuntarlo. */
async function pdfDe(clave: string): Promise<{ nombre: string; contenido: Uint8Array } | null> {
  const [tipo, id] = clave.split(":");
  if (tipo === "viabilidad") {
    const v = await pdfViabilidad(id);
    return v ? { nombre: v.nombre, contenido: new Uint8Array(v.pdf) } : null;
  }
  if (tipo === "presupuesto") {
    const p = await pdfPresupuesto(id);
    return p ? { nombre: p.nombre, contenido: p.pdf } : null;
  }
  if (tipo === "he") {
    const h = await pdfDeHojaVersion(id);
    // Una hoja vieja con su PDF en Google Docs no se puede adjuntar.
    return h && "pdf" in h ? { nombre: h.nombre, contenido: h.pdf } : null;
  }
  if (tipo === "costes") {
    const i = await leerInforme(id);
    return i ? { nombre: `Estimacion de costes - ${i.direccion}.pdf`.replace(/[\\/:*?"<>|]/g, ""), contenido: new Uint8Array(await pdfDeInformeCostes(i.datos)) } : null;
  }
  return null;
}

export type Envio = { docs: string[]; para: string[]; asunto: string; cuerpo: string; plantillaId: string | null };

/** Envia, lo registra y lo apunta en el diario. Devuelve el id del registro. */
export async function enviarDesdeOportunidad(yo: Yo, oppId: string, e: Envio): Promise<string> {
  const d = await paraEnviar(oppId);
  if (!d) throw new Error("Esta oportunidad no existe.");
  if (!d.comercial) throw new Error("La oportunidad no tiene comercial: el correo sale a su nombre.");
  const para = [...new Set(e.para.map((x) => x.trim().toLowerCase()).filter(Boolean))];
  const malos = para.filter((x) => !CORREO_VALIDO.test(x));
  if (!para.length) throw new Error("Falta a quién enviarlo.");
  if (malos.length) throw new Error(`Estas direcciones no son de correo: ${malos.join(", ")}.`);
  if (!e.asunto.trim() || !e.cuerpo.trim()) throw new Error("Faltan el asunto o el texto.");

  const elegidos = d.documentos.filter((x) => e.docs.includes(x.clave));
  // LA OFERTA NO SALE SIN SU OK (Monica, 14-oct-2026), y el ok es POR HOJA (25-oct-2026): las hojas solo se ofrecen
  // con el ok de Daniel (paraEnviar); un presupuesto, solo si TODAS las hojas que lleva lo tienen.
  const pptosElegidos = elegidos.filter((x) => x.clave.startsWith("presupuesto:")).map((x) => x.clave.slice(13));
  if (pptosElegidos.length) {
    const pp = await pedir<{ id: string; codigo: string | null; v: { estado: string } | null; hojas: { v: { estado: string } | null }[] }[]>(
      `presupuestos?select=id,codigo,v:he_version_id(estado),hojas:presupuesto_hojas(v:he_version_id(estado))&id=in.(${pptosElegidos.join(",")})`,
    );
    const SIN_OK = ["borrador", "pendiente_ok_daniel", "cambios_daniel", "anulada", "no_firmada"];
    for (const p of pp) {
      const fases = [p.v, ...p.hojas.map((h) => h.v)].filter((x): x is { estado: string } => !!x).map((x) => x.estado);
      if (!fases.length || fases.some((f) => SIN_OK.includes(f)))
        throw new Error(`El presupuesto ${p.codigo ?? ""} lleva alguna hoja sin el ok de Daniel: no se envía.`.replace("  ", " "));
    }
  }
  const adjuntos = (await Promise.all(elegidos.map((x) => pdfDe(x.clave)))).filter((x): x is { nombre: string; contenido: Uint8Array } => !!x);
  if (adjuntos.length < elegidos.length) throw new Error("Algún documento no se ha podido leer del almacén: no se envía nada.");

  const remitente = `${d.comercial.nombre} · Accesalia`;
  // LA PAGINA DE DOCUMENTACION DE LA COMUNIDAD (12-oct-2026): al pie de cada
  // correo, para que nos devuelvan la hoja firmada y lo demas por ahi.
  const pie = `

—
Para enviarnos documentación (la hoja de encargo firmada, actas, DNI…): ${APP}/portal
Entra con tu correo; te llegará un enlace para acceder.`;
  const r = await enviarCorreo({
    desde: "comercial",
    para: para.join(", "),
    asunto: e.asunto.trim(),
    texto: e.cuerpo.trim() + pie,
    responderA: d.comercial.email,
    nombreRemitente: remitente,
    adjuntos,
  });

  const documentos = elegidos.map((x) => ({ tipo: x.tipo, id: x.clave.split(":")[1], nombre: x.nombre, enlace: x.enlace }));
  // EL DIARIO, SI O SI: fecha, a quien, asunto, cuerpo y los enlaces.
  let notaId: string | null = null;
  if (r.ok) {
    const texto =
      `Correo enviado a ${para.join(", ")}${yo.nombre && d.comercial.nombre.split(" ")[0] !== yo.nombre ? ` (lo envía ${yo.nombre} en nombre de ${d.comercial.nombre})` : ""}.\n` +
      `Asunto: ${e.asunto.trim()}\n\n${e.cuerpo.trim()}` +
      (documentos.length ? `\n\nDocumentos adjuntos:\n${documentos.map((x) => `· ${x.nombre}: ${APP}${x.enlace}`).join("\n")}` : "");
    const nota = await crearEntrada({
      texto,
      canal: "mail",
      fecha: null,
      oportunidadId: oppId,
      persona: null,
      dondeTexto: null,
      autorId: yo.id,
      autorNombre: [yo.nombre, yo.apellidos].filter(Boolean).join(" "),
    }).catch(() => null);
    notaId = nota?.id ?? null;
  }

  const [fila] = await pedir<{ id: string }[]>("correos_enviados", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      oportunidad_id: oppId,
      enviado_por: yo.id,
      en_nombre_de: d.comercial.id,
      remitente_nombre: remitente,
      responder_a: d.comercial.email,
      para,
      asunto: e.asunto.trim(),
      cuerpo: e.cuerpo.trim(),
      documentos,
      plantilla_id: e.plantillaId,
      ok: r.ok,
      error: r.ok ? null : (r.dice ?? "no se pudo enviar"),
      nota_id: notaId,
    }),
  });
  if (!r.ok) throw new Error(`No se ha enviado: ${r.dice}`);

  // ENVIAR LA HOJA POR CORREO ES ENVIARLA (Monica, 15-oct-2026): "enviar mail desde la app siempre deberia dejar
  // huella y poder usarse como rastro".
  // LAS HOJAS NUEVAS (25-oct-2026): enviarla por correo es enviarla. La que tenia el ok de Daniel pasa a «enviada», con
  // la fecha y la hora del envio (su fila del historial) y a quien se mando.
  const nuevasEnviadas = elegidos.filter((x) => x.clave.startsWith("he:")).map((x) => x.clave.slice(3));
  if (nuevasEnviadas.length) {
    const conOk = await pedir<{ id: string }[]>(`he_versiones_hoja?select=id&id=in.(${nuevasEnviadas.join(",")})&estado=eq.ok_daniel`);
    for (const v of conOk) await ponerEstado(v.id, "enviada", yo, `Enviada por correo desde la app a ${para.join(", ")}.`);
  }
  recalcularLuego(oppId);
  return fila.id;
}

export type CorreoEnviado = {
  id: string;
  oportunidad_id: string | null;
  remitente_nombre: string;
  para: string[];
  asunto: string;
  cuerpo: string;
  documentos: { tipo: string; id: string; nombre: string; enlace: string }[];
  ok: boolean;
  error: string | null;
  creado_en: string;
  en_nombre_de: string | null;
  enviador: { nombre: string } | null;
  oportunidad: { codigo: string | null; nombre: string | null } | null;
};

/** El registro de enviados: de un comercial, o de todos. */
export async function correosEnviados(comercialId: string | null, oppId: string | null = null): Promise<CorreoEnviado[]> {
  const f = (comercialId ? `&en_nombre_de=eq.${comercialId}` : "") + (oppId ? `&oportunidad_id=eq.${oppId}` : "");
  return pedir<CorreoEnviado[]>(
    `correos_enviados?select=id,oportunidad_id,remitente_nombre,para,asunto,cuerpo,documentos,ok,error,creado_en,en_nombre_de,enviador:enviado_por(nombre),oportunidad:oportunidad_id(codigo,nombre)` +
      `${f}&order=creado_en.desc&limit=500`,
  );
}

export { FECHA as FECHA_CORREO };
