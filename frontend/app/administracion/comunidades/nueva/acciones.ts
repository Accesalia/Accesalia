"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { crearAlta, type DatosAlta } from "../../../../lib/alta";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";

const texto = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const entero = (fd: FormData, k: string) => {
  const v = texto(fd, k);
  if (!v) return null;
  const n = Number.parseInt(v.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

export async function guardarAlta(fd: FormData) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/administracion/comunidades/nueva");
  if (!puedeEntrar(yo, "administracion", "trabajar")) redirect("/administracion/comunidades");

  const direccion = texto(fd, "direccion");
  const administracionId = texto(fd, "administracion");
  const nota = texto(fd, "nota");

  // La regla: con una de las tres basta, pero alguna tiene que haber.
  if (!direccion && !administracionId && !nota) redirect("/administracion/comunidades/nueva?falta=1");

  const presidenteNombre = texto(fd, "presidente");
  const datos: DatosAlta = {
    direccion,
    cp: texto(fd, "cp"),
    municipio: texto(fd, "municipio"),
    provincia: texto(fd, "provincia"),
    administracionId,
    puestoId: texto(fd, "puesto"),
    comercialId: texto(fd, "comercial"),
    tipoOrigen: texto(fd, "origen") ?? "otro",
    nota,
    anio: entero(fd, "anio"),
    viviendas: entero(fd, "viviendas"),
    catastro: texto(fd, "catastro"),
    cif: texto(fd, "cif"),
    presidente: presidenteNombre
      ? {
          nombre: presidenteNombre,
          telefono: texto(fd, "presidente_telefono"),
          email: texto(fd, "presidente_email"),
          documento: texto(fd, "presidente_dni"),
        }
      : null,
  };

  const hecho = await crearAlta(datos, yo.id);

  revalidatePath("/administracion/comunidades");
  // Si hay comunidad, se abre su ficha. Si es un lead sin direccion todavia,
  // se vuelve a la lista: no hay ficha que abrir.
  redirect(hecho.comunidadId ? `/administracion/comunidades/${hecho.comunidadId}` : "/administracion/comunidades");
}
