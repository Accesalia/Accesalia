"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { crearAdministracion, type DatosAdministracion, type PersonaAlta } from "../../../../lib/altaAdministracion";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";

const texto = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const fecha = (fd: FormData, k: string) => {
  const v = texto(fd, k);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};

/** Las personas de un grupo (`jefe_` o `gente_`), con el id que el formulario
 *  les puso. Se recorren las claves, no posiciones: quitar una de en medio no
 *  descoloca a las demas. */
function personas(fd: FormData, grupo: string): PersonaAlta[] {
  const gente: PersonaAlta[] = [];
  for (const clave of fd.keys()) {
    if (!clave.startsWith(grupo + "_") || !clave.endsWith("_nombre")) continue;
    const id = clave.slice(grupo.length + 1, -"_nombre".length);
    const nombre = texto(fd, clave);
    if (!nombre) continue;
    const campo = (c: string) => texto(fd, `${grupo}_${id}_${c}`);
    gente.push({
      nombre,
      cargo: campo("cargo"),
      departamento: campo("departamento"),
      telefonoTrabajo: campo("telefonoTrabajo"),
      telefonoPersonal: campo("telefonoPersonal"),
      correoTrabajo: campo("correoTrabajo"),
      correoPersonal: campo("correoPersonal"),
      colegiado: campo("colegiado"),
      desde: campo("desde"),
      notas: campo("notas"),
    });
  }
  return gente;
}

function departamentos(fd: FormData) {
  const lista: { nombre: string; queHace: string | null; correo: string | null; telefono: string | null }[] = [];
  for (const clave of fd.keys()) {
    if (!clave.startsWith("depto_") || !clave.endsWith("_nombre")) continue;
    const id = clave.slice("depto_".length, -"_nombre".length);
    const nombre = texto(fd, clave);
    if (!nombre) continue;
    lista.push({
      nombre,
      queHace: texto(fd, `depto_${id}_queHace`),
      correo: texto(fd, `depto_${id}_correo`),
      telefono: texto(fd, `depto_${id}_telefono`),
    });
  }
  return lista;
}

export async function guardarAdministracion(fd: FormData) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/administracion/administraciones/nueva");
  if (!puedeEntrar(yo, "administracion", "trabajar")) redirect("/administracion");

  const jefes = personas(fd, "jefe");
  const gente = personas(fd, "gente");
  const todas = [...jefes, ...gente];

  // Lo unico obligatorio: alguien, y una forma de hablar con alguien.
  const hayContacto = todas.some((p) => p.telefonoTrabajo || p.telefonoPersonal || p.correoTrabajo || p.correoPersonal);
  if (todas.length === 0 || !hayContacto) redirect("/administracion/administraciones/nueva?falta=1");

  const datos: DatosAdministracion = {
    nombre: texto(fd, "nombre"),
    telefono: texto(fd, "telefono") ?? texto(fd, "telefono_general"),
    municipio: texto(fd, "municipio"),
    nombreLegal: texto(fd, "nombre_legal"),
    cif: texto(fd, "cif"),
    direccion: texto(fd, "direccion"),
    correoGeneral: texto(fd, "correo_general"),
    comercialId: texto(fd, "comercial"),
    // Al crearla son el mismo: se separan el dia que la cartera cambie de mano.
    comercialCaptadorId: texto(fd, "comercial_captador") ?? texto(fd, "comercial"),
    altaCartera: fecha(fd, "alta_cartera"),
    comisionEstado: texto(fd, "comision_estado") ?? "sin_hablar",
    llegoPor: texto(fd, "llego_por"),
    llegoQuien: texto(fd, "llego_quien"),
    origenNotas: texto(fd, "origen_notas"),
    respetarCartera: fd.get("respetar") === "on",
    deQuienEs: texto(fd, "de_quien_es"),
    servicioReservado: texto(fd, "servicio_reservado"),
    jefes,
    gente,
    departamentos: departamentos(fd),
  };

  const hecho = await crearAdministracion(datos);

  revalidatePath("/administracion");
  redirect("/administracion?alta=administracion&personas=" + hecho.personas);
}
