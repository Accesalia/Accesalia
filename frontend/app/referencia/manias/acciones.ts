"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";

// AÑADIR UNA MANIA A MANO (Monica, 10-oct-2026): "para que la proxima vez se
// pueda incluir aposta, sin pescarla entre cientos de notas". Quien y cuando
// se guardan solos: autor de la sesion, fecha del dia (la pone la base).

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

export async function anadirMania(fd: FormData): Promise<string | null> {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/referencia/manias");

  const texto = (k: string) => String(fd.get(k) ?? "").trim();
  const entidad = texto("entidad");
  const mania = texto("mania");
  if (!entidad) return "Falta de quién es la manía.";
  if (!mania) return "Falta la manía.";

  // El municipio llega por su nombre de Catastro; aqui se busca su id.
  let municipioId: string | null = null;
  const municipio = texto("municipio");
  if (municipio) {
    const r = await fetch(
      `${URL_BASE}/rest/v1/municipios_catastro?select=id&nombre=eq.${encodeURIComponent(municipio)}&limit=1`,
      { headers: cab, cache: "no-store" },
    );
    const [m] = r.ok ? ((await r.json()) as { id: string }[]) : [];
    if (!m) return `No encuentro el municipio «${municipio}».`;
    municipioId = m.id;
  }

  const r = await fetch(`${URL_BASE}/rest/v1/manias_organismos`, {
    method: "POST",
    headers: { ...cab, Prefer: "return=minimal" },
    body: JSON.stringify({
      entidad,
      departamento: texto("departamento") || null,
      tecnico: texto("tecnico") || null,
      municipio_id: municipioId,
      mania,
      origen: "app",
      autor: [yo.nombre, yo.apellidos].filter(Boolean).join(" "),
      autor_id: yo.id,
    }),
  });
  if (!r.ok) return `No se ha podido guardar: ${(await r.text()).slice(0, 200)}`;

  revalidatePath("/referencia/manias");
  return null;
}
