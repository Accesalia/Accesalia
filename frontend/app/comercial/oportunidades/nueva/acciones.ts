"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { crearOportunidad, type DatosOportunidad } from "../../../../lib/altaOportunidad";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";

const VOLVER = "/comercial/oportunidades/nueva";

const texto = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
};

/** Una persona creada en la ventana de "crear un contacto nuevo". Lo que se
 *  marca en QUE ES decide donde acaba guardada. */
function persona(fd: FormData, pre: string) {
  const nombre = texto(fd, pre + "_nombre");
  if (!nombre) return null;
  return {
    nombre,
    telefono: texto(fd, pre + "_telefono"),
    correo: texto(fd, pre + "_correo"),
    que: texto(fd, pre + "_que"),
    otro: texto(fd, pre + "_otro"),
    contrataId: texto(fd, pre + "_contrata"),
  };
}

export async function guardarOportunidad(fd: FormData) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=" + VOLVER);
  if (!puedeEntrar(yo, "comercial", "trabajar") && !puedeEntrar(yo, "administracion", "trabajar")) redirect("/menu");

  const nota = texto(fd, "nota");
  const comercialId = texto(fd, "comercial");
  const comunidadId = texto(fd, "comunidad");
  const direccionProvisional = texto(fd, "direccion_provisional");
  const administradorPersonaId = texto(fd, "administrador");
  const administradorNuevo = persona(fd, "admin_nuevo");
  const quienNuevo = persona(fd, "quien_nuevo");
  const otroNuevo = persona(fd, "otro_nuevo");
  const pasoArranque = texto(fd, "paso");

  // Las tres condiciones de ella. Sin comercial no es una oportunidad, es una
  // nota que se pierde: nadie recibe el aviso y nadie hace el seguimiento.
  // Y el siguiente paso, que es lo que hace que la oportunidad no se escape:
  // sin el no hay nada que perseguir manana.
  const hayHilo = Boolean(
    comunidadId ||
    direccionProvisional ||
    administradorPersonaId ||
    administradorNuevo ||
    quienNuevo?.telefono ||
    quienNuevo?.correo,
  );
  if (!nota || !comercialId || !hayHilo || !pasoArranque) redirect(VOLVER + "?falta=1");

  const marcado = fd.get("nuevo_marcado") === "1";
  const nuevoNombre = texto(fd, "nuevo_nombre");

  const datos: DatosOportunidad = {
    nota,
    fechaLlamada: texto(fd, "fecha_llamada"),
    comercialId,
    comunidadId,
    direccionProvisional,
    administradorPersonaId,
    administradorNuevo,
    // Sus tres casillas. "Fue el mismo administrador" existe porque el 90% de
    // las veces lo es, y elegirlo dos veces fastidia al comercial.
    quienEsAdmin: fd.get("quien_es_admin") === "on",
    quien: texto(fd, "quien"),
    quienNuevo,
    mismoQueLlama: fd.get("habla_llamo") === "on",
    contactoEsAdmin: fd.get("habla_admin") === "on",
    otroNuevo,
    // Una fila por cada cosa que quieren: normalmente entre dos y cinco.
    tipoIds: fd.getAll("tipos").map(String).filter(Boolean),
    canalId: texto(fd, "canal"),
    pasoArranque,
  };

  const hecho = await crearOportunidad(datos, yo.id);

  revalidatePath("/comercial");
  redirect("/comercial?nueva=" + encodeURIComponent(hecho.codigo ?? hecho.id));
}
