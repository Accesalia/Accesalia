"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  cambiarComercial,
  pausar,
  guardarJunta,
  guardarNegociacion,
  guardarTipos,
  guardarTresD,
  reactivar,
  tocarHito,
} from "../../../../lib/gestionOportunidad";
import { crearEntrada } from "../../../../lib/entradaDiario";
import { cambiarDireccion } from "../../../../lib/altaOportunidad";
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
  const mio = await comercialDe(yo.id);
  await crearEntrada({
    texto: String(fd.get("texto") ?? ""),
    comoFue: String(fd.get("como_fue") ?? "manual"),
    fecha: texto(fd, "fecha"),
    comercialId: mio?.id ?? texto(fd, "comercial"),
    oportunidadId: id,
    puestoId: texto(fd, "con"),
    autorId: yo.id,
  });
  refrescar(id);
}

/** Elegir o cambiar el comercial que lleva la opp. Lo hace quien SUPERVISA el
 *  area comercial (Monica, Daniel, Alejandra), igual que repartir las alertas:
 *  un comercial no se reasigna opps. */
export async function accionComercial(id: string, fd: FormData) {
  const yo = await permiso(id);
  if (!puedeEntrar(yo, "comercial", "supervisar")) return;
  await cambiarComercial(id, texto(fd, "comercial"));
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
