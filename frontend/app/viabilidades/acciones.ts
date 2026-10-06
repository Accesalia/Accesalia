"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { intentarAnexo } from "../../lib/anexoGuardado";
import { enlaceAlModelo, empezar, guardar, guardarCaptura, juntar, marcar, type DatosMesa } from "../../lib/mesaViabilidades";
import { haceViabilidades } from "./revision-polycam/acciones";
import { enviarCorreo } from "../../lib/correo";
import { quienLlevaLaOpp, quienTieneLaFuncion, type Persona } from "../../lib/quienLleva";

const APP = process.env.URL_PUBLICA ?? "https://accesalia-crm.vercel.app";

/** La viabilidad, lo justo para escribir el correo. */
async function deQueVa(id: string) {
  const [v] = await leer<{ oportunidad_id: string | null; oportunidades: { codigo: string | null; nombre: string | null } | null }[]>(
    `viabilidades?select=oportunidad_id,oportunidades(codigo,nombre)&id=eq.${encodeURIComponent(id)}&limit=1`,
  );
  return v;
}

/** Manda el mismo correo a cada persona, una a una (que nadie vea a quien mas
 *  se le ha mandado). Devuelve lo que no salio, para decirlo en pantalla: un
 *  correo que no sale en silencio es peor que uno que no sale. */
async function escribirA(personas: Persona[], asunto: string, texto: string, responderA: string): Promise<string[]> {
  const fallos: string[] = [];
  for (const p of personas) {
    if (!p.correo) {
      fallos.push(`${p.nombre} no tiene correo en su ficha de equipo`);
      continue;
    }
    const r = await enviarCorreo({ desde: "comercial", para: p.correo, asunto, texto, responderA });
    if (!r.ok) fallos.push(`${p.nombre}: ${r.dice}`);
  }
  return fallos;
}

// Lo que la Mesa de viabilidades le pide al servidor. Cada accion comprueba
// quien pregunta: una accion de servidor es una puerta a produccion.

const leer = async <T,>(path: string) => {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: process.env.SUPABASE_SECRET_KEY ?? "", Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY ?? ""}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}`);
  return (await r.json()) as T;
};

/** Empezar la viabilidad de un escaneo vinculado, para la opp elegida. */
export async function accionEmpezar(fd: FormData) {
  const yo = await haceViabilidades();
  const escaneo = String(fd.get("escaneo") ?? "");
  const opp = String(fd.get("opp") ?? "");
  if (!escaneo || !opp) return;
  const id = await empezar(escaneo, opp, yo.id);
  // El anexo (la ficha del edificio) se adjunta solo, despues de responder:
  // Alex no espera a Catastro para empezar a escribir.
  after(() => intentarAnexo(id));
  redirect(`/viabilidades/${id}`);
}

/** El .glb para el visor. Se pide al elegir la pestaña del escaneo: la primera
 *  vez hay que sacarlo del zip, y no se paga eso por cada escaneo al abrir. */
export async function accionModelo(escaneoId: string): Promise<string | null> {
  await haceViabilidades();
  const [e] = await leer<{ id: string; polycam: string | null }[]>(
    `escaneados_polycam?select=id,polycam&id=eq.${encodeURIComponent(escaneoId)}&limit=1`,
  );
  return e ? enlaceAlModelo(e) : null;
}

export async function accionGuardar(id: string, d: DatosMesa): Promise<string> {
  await haceViabilidades();
  await guardar(id, d);
  return new Date().toISOString();
}

/** La captura llega como JPEG en base64 (ya con fondo: la del visor es
 *  transparente y en JPEG saldria negra). */
export async function accionCaptura(id: string, base64: string): Promise<string | null> {
  await haceViabilidades();
  const datos = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), "base64");
  if (datos.length < 100 || datos.length > 3_000_000) throw new Error("La captura no ha salido bien");
  return guardarCaptura(id, datos);
}

export async function accionJuntar(id: string, escaneoId: string) {
  await haceViabilidades();
  await juntar(id, escaneoId);
  revalidatePath(`/viabilidades/${id}`);
}

/** "Me he atascado": queda apuntado cuando y le escribe a quien tenga HOY la
 *  funcion de responsable tecnico (Daniel). La viabilidad sale en la lista con
 *  "Daniel avisado", que el tambien la ve. */
export async function accionAvisarDaniel(id: string, d: DatosMesa): Promise<string[]> {
  const yo = await haceViabilidades();
  await guardar(id, d);
  await marcar(id, "daniel_avisado_en");
  const v = await deQueVa(id);
  const quien = await quienTieneLaFuncion("responsable_tecnico");
  const donde = v?.oportunidades?.nombre ?? v?.oportunidades?.codigo ?? "una viabilidad";
  const fallos = quien.length
    ? await escribirA(
        quien,
        `Viabilidad atascada: ${donde}`,
        `${yo.nombre} se ha atascado con la viabilidad de ${donde} y te pide que la mires.\n\n` +
          `Ábrela aquí: ${APP}/viabilidades/${id}\n`,
        yo.email,
      )
    : ["nadie tiene hoy la función de responsable técnico"];
  revalidatePath("/viabilidades");
  revalidatePath(`/viabilidades/${id}`);
  return fallos;
}

/** Se guarda lo ultimo y pasa al comercial: le llega un correo a el y a quien
 *  comparta su cartera. Sin comercial asignado no se puede: no habria a quien. */
export async function accionEnviar(id: string, d: DatosMesa): Promise<string[]> {
  const yo = await haceViabilidades();
  const v = await deQueVa(id);
  const lleva = v?.oportunidad_id ? await quienLlevaLaOpp(v.oportunidad_id) : { comercial: null, personas: [] };
  if (!lleva.personas.length) return ["Esta oportunidad no tiene comercial asignado: asígnaselo en su ficha y vuelve a enviarla."];

  // Primero se deja constancia y luego se escribe: si el correo fallara, la
  // viabilidad ya esta en manos del comercial igualmente, y se dice el fallo.
  await guardar(id, d);
  await marcar(id, "enviada_en");
  // Se rehace con el coste de obra ya puesto: las ayudas llevan su estimacion.
  after(() => intentarAnexo(id));
  const donde = v?.oportunidades?.nombre ?? v?.oportunidades?.codigo ?? "tu oportunidad";
  const fallos = await escribirA(
    lleva.personas,
    `Viabilidad lista para completar: ${donde}`,
    `${yo.nombre} ha terminado su parte de la viabilidad de ${donde}.\n\n` +
      `Ahora te toca completarla (tus precios, las tasas e ICIO, y retocar el texto a gusto del cliente) ` +
      `y mandarla con la hoja de encargo.\n\n` +
      `Tu viabilidad: ${APP}/comercial/viabilidad/${id}\n`,
    yo.email,
  );
  revalidatePath("/viabilidades");
  if (!fallos.length) redirect("/viabilidades?enviada=1");
  return fallos;
}
