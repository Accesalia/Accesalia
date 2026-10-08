"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  pausar,
  guardarJunta,
  guardarNegociacion,
  guardarTipos,
  guardarTresD,
  reactivar,
  tocarHito,
} from "../../../../lib/gestionOportunidad";
import { crearEntrada } from "../../../../lib/entradaDiario";
import { marcarAscensor } from "../../edificio/[referencia]/acciones";
import { cambiarDireccion } from "../../../../lib/altaOportunidad";
import { guardarCompletar, type DatosCompletar } from "../../../../lib/completa";
import { comercialDe, puedeEntrar, quienSoy } from "../../../../lib/sesion";

const texto = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const marcado = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";

/** Quien entra tiene que poder trabajar el area comercial. Se comprueba en CADA
 *  accion: una pantalla que se abre no es un permiso para escribir. */
async function permiso(id: string) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/oportunidades/" + id);
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/menu");
  return yo;
}

const refrescar = (id: string) => {
  revalidatePath(`/comercial/oportunidades/${id}`);
  revalidatePath("/comercial");
};

export async function accionHito(id: string, hito: string, fd: FormData) {
  await permiso(id);
  await tocarHito(id, hito, {
    estado: String(fd.get("estado") ?? "pendiente"),
    fecha: texto(fd, "fecha"),
    responsableId: texto(fd, "responsable"),
    enlace: texto(fd, "enlace"),
    notas: texto(fd, "notas"),
  });
  refrescar(id);
}

export async function accionTipos(id: string, fd: FormData) {
  await permiso(id);
  await guardarTipos(id, fd.getAll("tipo").map(String).filter(Boolean));
  refrescar(id);
}

export async function accionNegociacion(id: string, fd: FormData) {
  const yo = await permiso(id);
  const mio = await comercialDe(yo.id);
  await guardarNegociacion(id, mio?.id ?? texto(fd, "comercial"), {
    queVendemos: texto(fd, "que_vendemos"),
    precio: texto(fd, "precio"),
    alcance: texto(fd, "alcance"),
    notas: texto(fd, "notas"),
  });
  refrescar(id);
}

export async function accionTresD(id: string, fd: FormData) {
  await permiso(id);
  await guardarTresD(id, {
    tipo: String(fd.get("tipo") ?? "a_medida"),
    estado: String(fd.get("estado") ?? "pedido"),
    fechaNecesaria: texto(fd, "fecha_necesaria"),
    fechaEntrega: texto(fd, "fecha_entrega"),
  });
  refrescar(id);
}

export async function accionJunta(id: string, juntaId: string | null, fd: FormData) {
  await permiso(id);
  await guardarJunta(id, juntaId, {
    fecha: texto(fd, "fecha"),
    celebrada: marcado(fd, "celebrada"),
    resultado: String(fd.get("resultado") ?? "pendiente"),
    detalle: texto(fd, "detalle"),
    seguimiento: marcado(fd, "seguimiento"),
  });
  refrescar(id);
}

export async function accionPausar(id: string, fd: FormData) {
  await permiso(id);
  await pausar(id, texto(fd, "nota"));
  refrescar(id);
}

export async function accionReactivar(id: string) {
  await permiso(id);
  await reactivar(id);
  refrescar(id);
}

/** Grabar una entrada del diario ya enganchada a esta oportunidad. */
export async function accionEntrada(id: string, fd: FormData) {
  const yo = await permiso(id);
  await crearEntrada({
    texto: String(fd.get("texto") ?? ""),
    canal: String(fd.get("canal") ?? ""),
    fecha: texto(fd, "fecha"),
    oportunidadId: id,
    persona: texto(fd, "con"),
    dondeTexto: null,
    autorId: yo.id,
    autorNombre: yo.nombre,
  });
  refrescar(id);
}

/** La direccion buscada en Catastro desde la ficha: la que se dejo provisional,
 *  o la que resulto ser otra. */
export async function accionDireccion(
  id: string,
  r: { nombre: string; portalIds: string[]; parcela: string | null },
) {
  await permiso(id);
  await cambiarDireccion(id, r);
  refrescar(id);
}

// ¿CUANTOS PATIOS TIENE? (Monica, 5-oct-2026).
//
// "Es un dato del edificio como lo es el numero de viviendas, solo que con otro
// origen: manual en vez de Catastro. Manual incluye con posibilidad de fallo,
// claro."
//
// Por eso va firmado, igual que el ascensor: un dato que pone una persona vale
// lo que valga quien lo puso y cuando lo miro. Y por eso el 0 es un dato -no
// tiene patios- y el vacio es otro: nadie los ha contado.
/** ¿Hay ascensor? Lo marca quien lo ve (en la foto aerea o en el portal), y va
 *  firmado. Es la misma marca que la de la pantalla del edificio; pulsar otra
 *  vez la que esta puesta la quita. */
export async function accionAscensor(referencia: string, id: string, fd: FormData) {
  const v = String(fd.get("ascensor") ?? "");
  await marcarAscensor(referencia, v === "si" ? true : v === "no" ? false : null);
  revalidatePath(`/comercial/oportunidades/${id}`);
}

export async function accionPatios(referencia: string, id: string, fd: FormData) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/oportunidades/" + id);
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/menu");

  const crudo = String(fd.get("patios") ?? "").trim();
  const n = crudo === "" ? null : Number(crudo);
  if (n !== null && (!Number.isInteger(n) || n < 0 || n > 99)) return;

  // Upsert, no update: si la ficha de Catastro todavia no se guardo -porque el
  // servicio fallo ese dia-, lo que vio una persona no se puede perder.
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/ficha_catastro?on_conflict=referencia`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SECRET_KEY ?? "",
      Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY ?? ""}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      referencia: referencia.replace(/\s/g, "").toUpperCase().slice(0, 14),
      patios: n,
      patios_vistos_por: n === null ? null : yo.id,
      patios_vistos_en: n === null ? null : new Date().toISOString(),
    }),
  });

  revalidatePath(`/comercial/oportunidades/${id}`);
}

/** COMPLETAR la oportunidad desde su ficha: contacto, siguiente paso y, si se
 *  sabe, el administrador (8-oct-2026). La direccion se confirma con su boton
 *  de Catastro, como siempre. */
export async function accionCompletar(id: string, d: DatosCompletar): Promise<{ ok: true } | { ok: false; error: string }> {
  await permiso(id);
  try {
    await guardarCompletar(id, d);
    refrescar(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
