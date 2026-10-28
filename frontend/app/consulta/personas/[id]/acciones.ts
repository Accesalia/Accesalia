"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { puedeEntrar, quienSoy, type Yo } from "../../../../lib/sesion";
import { fichaPersona, guardarPersona } from "../../../../lib/fichas";

const texto = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
};

/** Quien puede escribir en la ficha de persona: quien trabaja en Administracion
 *  o en Comercial, como en la ficha de administracion. La de alguien de la casa,
 *  solo RRHH, direccion y el mismo (es la seccion con llave del empleado). */
export async function puedeEditarPersona(yo: Yo, empleadoEmail: string | null, esEmpleado: boolean): Promise<boolean> {
  if (esEmpleado) return yo.veTodo || puedeEntrar(yo, "rrhh", "trabajar") || (!!empleadoEmail && empleadoEmail.toLowerCase() === yo.email.toLowerCase());
  return yo.veTodo || puedeEntrar(yo, "administracion", "trabajar") || puedeEntrar(yo, "comercial", "trabajar");
}

export async function guardar(id: string, fd: FormData) {
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/consulta/personas/${id}`);
  const p = await fichaPersona(id);
  if (!p) redirect("/consulta?que=persona");
  if (!(await puedeEditarPersona(yo, p.empleado?.email ?? null, !!p.empleado))) redirect(`/consulta/personas/${id}`);

  await guardarPersona(id, {
    nombre: texto(fd, "nombre"),
    apellidos: texto(fd, "apellidos"),
    telefono: texto(fd, "telefono"),
    correo: texto(fd, "correo"),
    notas: texto(fd, "notas"),
    cargos: p.actuales.map((c) => ({
      puestoId: c.id,
      cargo: texto(fd, `c_${c.id}_cargo`),
      telefono: texto(fd, `c_${c.id}_tel`),
      correo: texto(fd, `c_${c.id}_mail`),
    })),
  });
  revalidatePath(`/consulta/personas/${id}`);
  redirect(`/consulta/personas/${id}?guardado=1`);
}
