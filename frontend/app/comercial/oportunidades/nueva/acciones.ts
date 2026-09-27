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

export async function guardarOportunidad(fd: FormData) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=" + VOLVER);
  if (!puedeEntrar(yo, "comercial", "trabajar") && !puedeEntrar(yo, "administracion", "trabajar")) redirect("/menu");

  const nota = texto(fd, "nota");
  const comercialId = texto(fd, "comercial");
  const comunidadId = texto(fd, "comunidad");
  const direccionProvisional = texto(fd, "direccion_provisional");
  const administracionId = texto(fd, "administracion");
  const nuevoTelefono = texto(fd, "nuevo_telefono");
  const nuevoCorreo = texto(fd, "nuevo_correo");

  // Las tres condiciones de ella. Sin comercial no es una oportunidad, es una
  // nota que se pierde: nadie recibe el aviso y nadie hace el seguimiento.
  const hayHilo = Boolean(comunidadId || direccionProvisional || administracionId || nuevoTelefono || nuevoCorreo);
  if (!nota || !comercialId || !hayHilo) redirect(VOLVER + "?falta=1");

  const marcado = fd.get("nuevo_marcado") === "1";
  const nuevoNombre = texto(fd, "nuevo_nombre");

  const datos: DatosOportunidad = {
    nota,
    fechaLlamada: texto(fd, "fecha_llamada"),
    comercialId,
    comunidadId,
    direccionProvisional,
    administracionId,
    quien: texto(fd, "quien"),
    contactoNuevo:
      marcado && nuevoNombre
        ? {
            nombre: nuevoNombre,
            telefono: nuevoTelefono,
            correo: nuevoCorreo,
            relacion: texto(fd, "nuevo_relacion") ?? "personal",
            contrataId: texto(fd, "nuevo_contrata"),
          }
        : null,
    mismoQueLlama: fd.get("mismo_que_llama") === "on",
    contactoQuien: texto(fd, "contacto"),
    contactoProvisional: {
      nombre: texto(fd, "contacto_nombre"),
      telefono: texto(fd, "contacto_telefono"),
      correo: texto(fd, "contacto_correo"),
    },
    // Una fila por cada cosa que quieren: normalmente entre dos y cinco.
    tipoIds: fd.getAll("tipos").map(String).filter(Boolean),
    canalId: texto(fd, "canal"),
    pasoArranque: texto(fd, "paso"),
  };

  const hecho = await crearOportunidad(datos, yo.id);

  revalidatePath("/comercial");
  redirect("/comercial?nueva=" + encodeURIComponent(hecho.codigo ?? hecho.id));
}
