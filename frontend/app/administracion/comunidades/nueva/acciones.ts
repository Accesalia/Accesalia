"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { crearComunidad, type DatosComunidad } from "../../../../lib/alta";
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

/** Las personas de la administracion que haya dado de alta aqui mismo. */
function personasDeLaAdministracion(fd: FormData) {
  const gente: { nombre: string; cargo: string | null; telefono: string | null; correo: string | null }[] = [];
  for (let i = 0; i < 20; i++) {
    const nombre = texto(fd, `persona_${i}_nombre`);
    if (!nombre) continue;
    gente.push({
      nombre,
      cargo: texto(fd, `persona_${i}_cargo`),
      telefono: texto(fd, `persona_${i}_telefono`),
      correo: texto(fd, `persona_${i}_correo`),
    });
  }
  return gente;
}

/** Las personas de la comunidad que haya anadido a mano, las que sean. */
function otrasPersonas(fd: FormData) {
  const gente: { nombre: string; rol: string; telefono: string | null; email: string | null }[] = [];
  for (let i = 0; i < 20; i++) {
    const nombre = texto(fd, `contacto_${i}_nombre`);
    if (!nombre) continue;
    gente.push({
      nombre,
      rol: texto(fd, `contacto_${i}_rol`) ?? "vecino",
      telefono: texto(fd, `contacto_${i}_telefono`),
      email: texto(fd, `contacto_${i}_email`),
    });
  }
  return gente;
}

export async function guardarAlta(fd: FormData) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/administracion/comunidades/nueva");
  if (!puedeEntrar(yo, "administracion", "trabajar")) redirect("/administracion/comunidades");

  const direccion = texto(fd, "direccion");
  // La direccion ES la comunidad: sin ella no hay nada que dar de alta.
  if (!direccion) redirect("/administracion/comunidades/nueva?falta=1");

  // "__nueva__" en el desplegable = la administracion se crea aqui mismo.
  const elegida = texto(fd, "administracion");
  const administracionId = elegida === "__nueva__" ? null : elegida;
  const adminNombre = elegida === "__nueva__" ? texto(fd, "admin_nombre") : null;

  const presidenteNombre = texto(fd, "presidente");
  const datos: DatosComunidad = {
    direccion,
    cp: texto(fd, "cp"),
    municipio: texto(fd, "municipio"),
    provincia: texto(fd, "provincia"),
    administracionId,
    puestoId: texto(fd, "puesto"),
    administracionNueva: adminNombre
      ? { nombre: adminNombre, telefono: texto(fd, "admin_telefono"), correo: texto(fd, "admin_correo") }
      : null,
    personasNuevas: personasDeLaAdministracion(fd),
    comercialId: texto(fd, "comercial"),
    tipoOrigen: texto(fd, "origen") ?? "otro",
    nota: texto(fd, "nota"),
    anio: entero(fd, "anio"),
    viviendas: entero(fd, "viviendas"),
    catastro: texto(fd, "catastro"),
    cif: texto(fd, "cif"),
    iban: texto(fd, "iban"),
    mayores70: entero(fd, "mayores70"),
    discapacidad: entero(fd, "discapacidad"),
    presidente: presidenteNombre
      ? {
          nombre: presidenteNombre,
          telefono: texto(fd, "presidente_telefono"),
          email: texto(fd, "presidente_email"),
          documento: texto(fd, "presidente_dni"),
        }
      : null,
    contactos: otrasPersonas(fd),
  };

  const hecho = await crearComunidad(datos, yo.id);

  revalidatePath("/administracion/comunidades");
  redirect(`/administracion/comunidades/${hecho.comunidadId}`);
}
