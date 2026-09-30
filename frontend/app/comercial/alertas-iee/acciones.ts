"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";
import { alertaIEE, comercialesActivos } from "../../../lib/alertasIEE";
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
function plantilla(nombre: string, a: NonNullable<Awaited<ReturnType<typeof alertaIEE>>>) {
  const donde = [a.direccion, a.municipio].filter(Boolean).join(", ") || "sin dirección";

  const datos: [string, string][] = [
    ["Dirección", donde],
    ["Referencia catastral", a.referencia ?? "—"],
    ["Año de construcción", a.anioConstruccion ? String(a.anioConstruccion) : "—"],
    ["Valoración del IEE", a.valoracion ?? "—"],
    ["Emitido el", enCastellano(a.fechaEmision)],
    ["Deficiencias subsanadas", a.deficienciasSubsanadas ?? "—"],
    ["¿Cumple accesibilidad?", a.accesibilidadSatisface === null ? "—" : a.accesibilidadSatisface ? "Sí" : "No"],
    ["¿Admite ajustes razonables?", a.accesibilidadAjustes === null ? "—" : a.accesibilidadAjustes ? "Sí" : "No"],
    ["Calificación energética", a.calificacionEnergetica ?? "—"],
    ["Nº de registro del IEE", a.codigo],
  ];

  const saludo = `Hola ${nombre},`;
  const cuerpo =
    `nuestro radar dice que esta dirección ha registrado una IEE desfavorable. ` +
    `Aquí tienes los datos:`;
  const cierre =
    `Te lo paso para que puedas hacerles una visita o llamar si quieres. ` +
    `Van a necesitar un arquitecto.`;

  const texto =
    `${saludo}\n\n${cuerpo}\n\n` +
    datos.map(([q, v]) => `  ${q}: ${v}`).join("\n") +
    `\n\n${cierre}\n`;

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
    `</table><p>${cierre}</p>`;

  return { asunto: `IEE desfavorable: ${donde}`, texto, html };
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

  const { asunto, texto, html } = plantilla(comercial.nombre, alerta);
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
