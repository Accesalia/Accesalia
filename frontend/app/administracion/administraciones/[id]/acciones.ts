"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import {
  editaComision,
  guardarFicha,
  type DepartamentoGuardar,
  type FichaGuardar,
  type PersonaGuardar,
} from "../../../../lib/fichaAdministracion";

const texto = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
};

/** Las claves de un grupo ("p" personas, "d" departamentos): las existentes
 *  llevan su id; las nuevas, "n" + un numero. Se recorren las claves, no las
 *  posiciones: quitar una de en medio no descoloca a las demas. */
function claves(fd: FormData, grupo: string): string[] {
  const out: string[] = [];
  for (const k of fd.keys()) if (k.startsWith(grupo + "_") && k.endsWith("_nombre")) out.push(k.slice(grupo.length + 1, -"_nombre".length));
  return out;
}

const COMISION = ["cobra", "no_cobra", "sin_hablar"] as const;
const RESERVADO = ["ascensor", "sate", "ascensor_y_sate"];

export async function guardar(id: string, fd: FormData) {
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/administracion/administraciones/${id}`);
  if (!puedeEntrar(yo, "administracion", "trabajar") && !puedeEntrar(yo, "comercial", "trabajar")) redirect(`/administracion/administraciones/${id}`);

  const personas: PersonaGuardar[] = claves(fd, "p").map((k) => {
    const c = (campo: string) => texto(fd, `p_${k}_${campo}`);
    return {
      puestoId: k.startsWith("n") ? null : k,
      jefe: c("jefe") === "1",
      nombre: c("nombre") ?? "",
      cargo: c("cargo"),
      telefono: c("tel"),
      correo: c("mail"),
      colegiado: c("col"),
      comercialId: fd.has(`p_${k}_comercial`) ? c("comercial") : undefined,
      quitar: c("quitar") === "1",
      notaNueva: c("nota"),
    };
  });

  const departamentos: DepartamentoGuardar[] = claves(fd, "d").map((k) => {
    const c = (campo: string) => texto(fd, `d_${k}_${campo}`);
    return {
      id: k.startsWith("n") ? null : k,
      nombre: c("nombre") ?? "",
      telefono: c("tel"),
      correo: c("mail"),
      queHace: c("quehace"),
      contactoId: c("contacto"),
    };
  });

  const comision = texto(fd, "comision_estado");
  const reservado = texto(fd, "servicio_reservado");

  const datos: FichaGuardar = {
    nombre: texto(fd, "nombre"),
    telefono: texto(fd, "telefono"),
    correo: texto(fd, "correo"),
    nombreLegal: texto(fd, "nombre_legal"),
    cif: texto(fd, "cif"),
    direccion: texto(fd, "direccion"),
    municipio: texto(fd, "municipio"),
    notaNueva: texto(fd, "empresa_nota"),
    // La comision solo la toca quien puede: si llega de otro, se ignora.
    comisionEstado: editaComision(yo) && COMISION.includes(comision as (typeof COMISION)[number]) ? (comision as FichaGuardar["comisionEstado"]) : null,
    origen: {
      canalId: texto(fd, "llego_por"),
      quien: texto(fd, "llego_quien"),
      notas: texto(fd, "origen_notas"),
      respetar: fd.get("respetar") === "on",
      duenoContrataId: texto(fd, "de_quien_es"),
      servicioReservado: reservado && RESERVADO.includes(reservado) ? reservado : null,
    },
    personas,
    departamentos,
  };

  await guardarFicha(id, datos, yo);
  revalidatePath(`/administracion/administraciones/${id}`);
  revalidatePath("/administracion/administraciones");
  redirect(`/administracion/administraciones/${id}?guardado=1`);
}
