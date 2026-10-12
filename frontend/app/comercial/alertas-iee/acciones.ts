"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";
import { alertaIEE, comercialesActivos, fechaDelInforme, grado, porQue } from "../../../lib/alertasIEE";
import { enviarCorreo } from "../../../lib/correo";

// ASIGNAR UNA ALERTA A UN COMERCIAL.
//
// Quien puede: quien supervisa el area comercial. Hoy eso es Alejandra, que lo
// lleva, mas Monica y Daniel por direccion. Va por NIVEL, no por nombre, asi que
// Alvaro -que es comercial pero no supervisa- no reparte.

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = {
  apikey: SECRETO,
  Authorization: `Bearer ${SECRETO}`,
  "Content-Type": "application/json",
};

const enCastellano = (iso: string | null): string =>
  iso ? iso.split("-").reverse().join("/") : "—";

/** El correo que pidio Monica, con sus palabras. Lleva la ficha entera dentro
 *  para que el comercial no tenga que entrar a ningun sitio para saber si le
 *  interesa: lo que necesita para coger el telefono esta en el propio correo. */
function plantilla(nombre: string, a: NonNullable<Awaited<ReturnType<typeof alertaIEE>>>, quienLaPasa: string) {
  // "CL JUAN DE VERGARA, 7 · ALCALA DE HENARES": la provincia que pone el
  // registro detras del municipio sobra.
  const municipio = (a.municipio ?? "").replace(/\s*\(MADRID\)\s*$/i, "").trim();
  const donde = [a.direccion, municipio].filter(Boolean).join(" · ") || "sin dirección";
  // EL MOTIVO DE VERDAD (Monica, 10-oct-2026). Decia siempre "IEE desfavorable"
  // y desde el 1-oct el radar recoge tambien las favorables que no cumplen
  // accesibilidad, que son las mejores. Es el mismo texto que la pantalla.
  const g = grado(a);
  const motivo = g ? porQue[g] : (a.valoracion ?? "IEE registrada");

  const datos: [string, string][] = [
    ["Dirección", donde],
    ["Referencia catastral", a.referencia ?? "—"],
    ["Año de construcción", a.anioConstruccion ? String(a.anioConstruccion) : "—"],
    ["Valoración del IEE", a.valoracion ?? "—"],
    [fechaDelInforme(a).que, fechaDelInforme(a).valor],
    ["Deficiencias subsanadas", a.deficienciasSubsanadas ?? "—"],
    ["¿Cumple accesibilidad?", a.accesibilidadSatisface === null ? "—" : a.accesibilidadSatisface ? "Sí" : "No"],
    ["¿Admite ajustes razonables?", a.accesibilidadAjustes === null ? "—" : a.accesibilidadAjustes ? "Sí" : "No"],
    ["Calificación energética", a.calificacionEnergetica ?? "—"],
    ["Nº de registro del IEE", a.codigo],
  ];

  const saludo = `Hola ${nombre},`;
  const cuerpo =
    `nuestro radar ha encontrado una IEE en esta dirección: ${motivo.toLowerCase()}. ` +
    `Aquí tienes los datos:`;
  const cierre =
    `Te lo paso para que puedas hacerles una visita o llamar si quieres. ` +
    `Van a necesitar un arquitecto.`;
  // QUIEN SE LA PASA (Monica, 10-oct-2026): "para que sepan a quien preguntar".
  // Al responder, la respuesta ya le llega a esa persona (responderA).
  const firma = `Te la pasa ${quienLaPasa}.`;

  const texto =
    `${saludo}\n\n${cuerpo}\n\n` +
    datos.map(([q, v]) => `  ${q}: ${v}`).join("\n") +
    `\n\n${cierre}\n\n${firma}\n`;

  const html =
    `<p>${saludo}</p><p>${cuerpo}</p>` +
    `<table cellpadding="4" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">` +
    datos
      .map(
        ([q, v]) =>
          `<tr><td style="color:#666;border-bottom:1px solid #eee">${q}</td>` +
          `<td style="font-weight:600;border-bottom:1px solid #eee">${v}</td></tr>`,
      )
      .join("") +
    `</table><p>${cierre}</p><p>${firma}</p>`;

  // Primero la direccion y luego el motivo (Monica): "buscamos siempre cosas
  // de una direccion".
  return { asunto: `${donde} · ${motivo}`, texto, html };
}

export async function asignarAlerta(formulario: FormData) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/alertas-iee");
  if (!puedeEntrar(yo, "comercial", "supervisar")) redirect("/menu");

  const codigo = String(formulario.get("codigo") ?? "");
  const comercialId = String(formulario.get("comercial") ?? "");
  if (!codigo || !comercialId) return;

  const alerta = await alertaIEE(codigo);
  if (!alerta) return;

  const comercial = (await comercialesActivos()).find((c) => c.id === comercialId);
  if (!comercial) return;

  // EL ORDEN IMPORTA: primero se deja constancia de que esta asignada y luego se
  // intenta el correo. Si se hiciera al reves y el correo fallara, la alerta se
  // quedaria sin dueño y nadie sabria que se intento repartir.
  await fetch(`${URL_BASE}/rest/v1/iee_registrado?codigo=eq.${encodeURIComponent(codigo)}`, {
    method: "PATCH",
    headers: { ...cab, Prefer: "return=minimal" },
    body: JSON.stringify({
      asignada_a: comercialId,
      asignada_en: new Date().toISOString(),
      asignada_por: yo.id,
      estado: "asignada",
      asignada_email_en: null,
      asignada_email_fallo: null,
    }),
  });

  const { asunto, texto, html } = plantilla(comercial.nombre, alerta, yo.nombre);
  // Sale del buzon del AREA COMERCIAL, no del correo de nadie. Y las respuestas
  // vuelven a QUIEN HA REPARTIDO: el comercial lee "Accesalia - Comercial" y, si
  // contesta "esa ya es mia", le llega a ella. Ver docs/correos.md.
  const salio = comercial.correo
    ? await enviarCorreo({
        desde: "comercial",
        para: comercial.correo,
        responderA: yo.email,
        asunto,
        texto,
        html,
      })
    : { ok: false, dice: `${comercial.nombre} no tiene correo en su ficha de equipo` };

  await fetch(`${URL_BASE}/rest/v1/iee_registrado?codigo=eq.${encodeURIComponent(codigo)}`, {
    method: "PATCH",
    headers: { ...cab, Prefer: "return=minimal" },
    body: JSON.stringify({
      asignada_email_en: salio.ok ? new Date().toISOString() : null,
      asignada_email_fallo: salio.ok ? null : (salio.dice ?? "no se pudo enviar"),
    }),
  });

  revalidatePath("/comercial/alertas-iee");
}

/** Deshacer, porque toda pantalla necesita salida: si se asigna a quien no era,
 *  se devuelve al monton sin tener que tocar la base a mano. */
export async function devolverAlMonton(formulario: FormData) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/alertas-iee");
  if (!puedeEntrar(yo, "comercial", "supervisar")) redirect("/menu");

  const codigo = String(formulario.get("codigo") ?? "");
  if (!codigo) return;

  // A QUIEN LA TENIA SE LE AVISA (Monica, 10-oct-2026): ya le llego el correo
  // de "te la paso", y sin esto la seguiria trabajando. Se mira antes de
  // quitarla, porque despues ya no se sabe de quien era. Si el aviso falla, se
  // devuelve igual: lo importante es que vuelva a pendientes.
  const alerta = await alertaIEE(codigo);
  const tenia = alerta?.asignadaA ? (await comercialesActivos()).find((c) => c.id === alerta.asignadaA) : null;
  if (alerta && tenia?.correo) {
    const municipio = (alerta.municipio ?? "").replace(/\s*\(MADRID\)\s*$/i, "").trim();
    const donde = [alerta.direccion, municipio].filter(Boolean).join(" · ") || "sin dirección";
    const cuerpo =
      `la IEE de ${donde} que te pasaron ya no es tuya: ${yo.nombre} la ha devuelto para repartirla de nuevo. ` +
      `No hace falta que hagas nada con ella.`;
    await enviarCorreo({
      desde: "comercial",
      para: tenia.correo,
      responderA: yo.email,
      asunto: `${donde} · ya no es tuya`,
      texto: `Hola ${tenia.nombre},\n\n${cuerpo}\n\nTe lo dice ${yo.nombre}.\n`,
      html: `<p>Hola ${tenia.nombre},</p><p>${cuerpo}</p><p>Te lo dice ${yo.nombre}.</p>`,
    }).catch(() => null);
  }

  await fetch(`${URL_BASE}/rest/v1/iee_registrado?codigo=eq.${encodeURIComponent(codigo)}`, {
    method: "PATCH",
    headers: { ...cab, Prefer: "return=minimal" },
    body: JSON.stringify({
      asignada_a: null,
      asignada_en: null,
      asignada_por: null,
      estado: "nueva",
      asignada_email_en: null,
      asignada_email_fallo: null,
      vigilancia_avisada_en: null,
    }),
  });

  revalidatePath("/comercial/alertas-iee");
}

/** DESCARTAR (Monica, 10-oct-2026): "las opciones deberian ser vincular /
 *  descartar, para que en epocas de mucho trabajo no se acumulen". Sale de los
 *  pendientes y del aviso diario, pero no se borra: se puede revisar y recuperar.
 *  Queda quien y cuando, como al asignar. El motivo es opcional. */
export async function descartarAlerta(formulario: FormData) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/alertas-iee");
  if (!puedeEntrar(yo, "comercial", "supervisar")) redirect("/menu");

  const codigo = String(formulario.get("codigo") ?? "");
  if (!codigo) return;
  const motivo = String(formulario.get("motivo") ?? "").trim();

  await fetch(`${URL_BASE}/rest/v1/iee_registrado?codigo=eq.${encodeURIComponent(codigo)}&estado=eq.nueva`, {
    method: "PATCH",
    headers: { ...cab, Prefer: "return=minimal" },
    body: JSON.stringify({
      estado: "descartada",
      descartada_por: yo.id,
      descartada_en: new Date().toISOString(),
      motivo_descarte: motivo || null,
    }),
  });

  revalidatePath("/comercial/alertas-iee");
  revalidatePath("/pendientes");
}

/** La salida del descarte: vuelve a estar sin asignar. */
export async function recuperarAlerta(formulario: FormData) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/alertas-iee");
  if (!puedeEntrar(yo, "comercial", "supervisar")) redirect("/menu");

  const codigo = String(formulario.get("codigo") ?? "");
  if (!codigo) return;

  await fetch(`${URL_BASE}/rest/v1/iee_registrado?codigo=eq.${encodeURIComponent(codigo)}&estado=eq.descartada`, {
    method: "PATCH",
    headers: { ...cab, Prefer: "return=minimal" },
    body: JSON.stringify({ estado: "nueva", descartada_por: null, descartada_en: null, motivo_descarte: null }),
  });

  revalidatePath("/comercial/alertas-iee");
  revalidatePath("/pendientes");
}

// ---------------------------------------------------------------------------
// EN BLOQUE (Monica, 12-oct-2026): "al seleccionar un municipio, un boton de
// seleccionar todas para hacer acciones sobre todas a la vez: asignar a un
// mismo comercial, o descartar todas a la vez".
//
// Asignar varias manda UN correo con todas las fichas dentro, no uno por
// alerta: al comercial le llega "te paso estas 7 en Leganes", no siete correos.
// ---------------------------------------------------------------------------

type EnBloque = { ok: true; hechas: number } | { ok: false; error: string };

export async function asignarVarias(codigos: string[], comercialId: string): Promise<EnBloque> {
  const yo = await quienSoy();
  if (!yo) return { ok: false, error: "Tu sesión ha caducado: vuelve a entrar." };
  if (!puedeEntrar(yo, "comercial", "supervisar")) return { ok: false, error: "Repartir es de supervisión comercial." };
  const comercial = (await comercialesActivos()).find((c) => c.id === comercialId);
  if (!comercial) return { ok: false, error: "Ese comercial no está activo." };

  const alertas = (await Promise.all(codigos.map((c) => alertaIEE(c)))).filter((a): a is NonNullable<typeof a> => !!a);
  if (!alertas.length) return { ok: false, error: "No queda ninguna de esas por asignar." };
  const lista = `(${alertas.map((a) => `"${a.codigo.replace(/"/g, "")}"`).join(",")})`;

  // Primero se deja constancia, luego el correo (como al asignar una).
  const ahora = new Date().toISOString();
  await fetch(`${URL_BASE}/rest/v1/iee_registrado?codigo=in.${encodeURIComponent(lista)}&estado=eq.nueva`, {
    method: "PATCH",
    headers: { ...cab, Prefer: "return=minimal" },
    body: JSON.stringify({ asignada_a: comercialId, asignada_en: ahora, asignada_por: yo.id, estado: "asignada", asignada_email_en: null, asignada_email_fallo: null }),
  });

  // Un solo correo: cada ficha, una detras de otra.
  const fichas = alertas.map((a) => plantilla(comercial.nombre, a, yo.nombre));
  const n = alertas.length;
  const asunto = n === 1 ? fichas[0].asunto : `${n} direcciones del radar de IEE`;
  // De cada ficha, sus datos: las lineas que empiezan con dos espacios.
  const datosDe = (t: string) => t.split("\n").filter((l) => l.startsWith("  ")).join("\n");
  const texto =
    n === 1
      ? fichas[0].texto
      : `Hola ${comercial.nombre},\n\nnuestro radar ha encontrado ${n} IEE que te paso a la vez:\n\n` +
        fichas.map((f, i) => `${i + 1}. ${f.asunto}\n${datosDe(f.texto)}`).join("\n\n") +
        `\n\nTe las paso para que puedas hacerles una visita o llamar si quieres. Van a necesitar un arquitecto.\n\nTe las pasa ${yo.nombre}.\n`;
  const html =
    n === 1
      ? fichas[0].html
      : `<p>Hola ${comercial.nombre},</p><p>nuestro radar ha encontrado ${n} IEE que te paso a la vez:</p>` +
        fichas.map((f, i) => `<h3 style="font-family:sans-serif;font-size:15px;margin:18px 0 4px">${i + 1}. ${f.asunto}</h3>` + (f.html.match(/<table[\s\S]*<\/table>/)?.[0] ?? "")).join("") +
        `<p>Te las paso para que puedas hacerles una visita o llamar si quieres. Van a necesitar un arquitecto.</p><p>Te las pasa ${yo.nombre}.</p>`;
  const salio = comercial.correo
    ? await enviarCorreo({ desde: "comercial", para: comercial.correo, responderA: yo.email, asunto, texto, html })
    : { ok: false, dice: `${comercial.nombre} no tiene correo en su ficha de equipo` };

  await fetch(`${URL_BASE}/rest/v1/iee_registrado?codigo=in.${encodeURIComponent(lista)}&asignada_en=eq.${encodeURIComponent(ahora)}`, {
    method: "PATCH",
    headers: { ...cab, Prefer: "return=minimal" },
    body: JSON.stringify({ asignada_email_en: salio.ok ? new Date().toISOString() : null, asignada_email_fallo: salio.ok ? null : (salio.dice ?? "no se pudo enviar") }),
  });

  revalidatePath("/comercial/alertas-iee");
  revalidatePath("/pendientes");
  return { ok: true, hechas: n };
}

export async function descartarVarias(codigos: string[], motivo: string): Promise<EnBloque> {
  const yo = await quienSoy();
  if (!yo) return { ok: false, error: "Tu sesión ha caducado: vuelve a entrar." };
  if (!puedeEntrar(yo, "comercial", "supervisar")) return { ok: false, error: "Descartar es de supervisión comercial." };
  if (!codigos.length) return { ok: false, error: "No hay ninguna marcada." };
  const lista = `(${codigos.map((c) => `"${c.replace(/"/g, "")}"`).join(",")})`;
  await fetch(`${URL_BASE}/rest/v1/iee_registrado?codigo=in.${encodeURIComponent(lista)}&estado=eq.nueva`, {
    method: "PATCH",
    headers: { ...cab, Prefer: "return=minimal" },
    body: JSON.stringify({ estado: "descartada", descartada_por: yo.id, descartada_en: new Date().toISOString(), motivo_descarte: motivo.trim() || null }),
  });
  revalidatePath("/comercial/alertas-iee");
  revalidatePath("/pendientes");
  return { ok: true, hechas: codigos.length };
}
