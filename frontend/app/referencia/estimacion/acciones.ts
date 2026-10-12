"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";
import { emitirInformeCostes, type EntradaCostes } from "../../../lib/informeCostes";
import { crearOportunidadDesdeMovil } from "../../../lib/oportunidadMovil";
import { cambiarDireccion } from "../../../lib/altaOportunidad";

// EMITIR EL INFORME DE COSTES (Monica, 12-oct-2026). Tres caminos:
//   - para una oportunidad nuestra: queda en ella;
//   - para una direccion nueva, "sin guardar": no se crea nada mas que el
//     rastro (Direcciones vistas que no llegaron a mayores), con la hora;
//   - para una direccion nueva, creando la oportunidad en una ventana rapida,
//     como el satelite del movil: nace "coja" y se completa luego en el PC.
// Cada camino devuelve el id del informe, y la pantalla salta a verlo.

type Resultado = { ok: true; id: string } | { ok: false; error: string };
type Resuelta = { nombre: string; portalIds: string[]; parcela: string | null };

async function yoOFuera() {
  const yo = await quienSoy();
  if (!yo) throw new Error("Tu sesión ha caducado: vuelve a entrar.");
  return yo;
}

const mal = (e: unknown): Resultado => ({ ok: false, error: e instanceof Error ? e.message : String(e) });

export async function emitirParaOportunidad(oppId: string, entrada: EntradaCostes): Promise<Resultado> {
  try {
    const yo = await yoOFuera();
    const id = await emitirInformeCostes({ oppId, ref: null, direccion: "", municipio: null }, entrada, yo);
    revalidatePath(`/comercial/oportunidades/${oppId}`);
    return { ok: true, id };
  } catch (e) {
    return mal(e);
  }
}

export async function emitirSinGuardar(r: Resuelta, entrada: EntradaCostes): Promise<Resultado> {
  try {
    const yo = await yoOFuera();
    if (!r.parcela) throw new Error("Esa dirección no tiene referencia catastral: sin ella no se sabe el edificio.");
    const id = await emitirInformeCostes({ oppId: null, ref: r.parcela, direccion: r.nombre, municipio: null }, entrada, yo);
    return { ok: true, id };
  } catch (e) {
    return mal(e);
  }
}

export type DatosRapidos = {
  administrador: string;
  contacto: string;
  contactoNombre: string;
  contactoTelefono: string;
  tipos: string[];
  paso: string;
  /** De quien es, si quien la crea no es comercial. */
  comercial: string;
};

export async function crearOportunidadYEmitir(r: Resuelta, datos: DatosRapidos, entrada: EntradaCostes): Promise<Resultado> {
  try {
    const yo = await yoOFuera();
    if (!puedeEntrar(yo, "comercial", "trabajar")) throw new Error("Crear oportunidades es del área comercial.");
    const oppId = await crearOportunidadDesdeMovil(yo, {
      id: randomUUID(),
      direccion: r.nombre,
      fecha: new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }),
      administrador: datos.administrador || null,
      contacto: datos.contacto || null,
      contactoNombre: datos.contactoNombre || null,
      contactoTelefono: datos.contactoTelefono || null,
      tipos: datos.tipos,
      paso: datos.paso || null,
    }, datos.comercial || null);
    // La direccion ya viene buscada en Catastro: se cuelga entera, con sus portales.
    await cambiarDireccion(oppId, r);
    const id = await emitirInformeCostes({ oppId, ref: null, direccion: r.nombre, municipio: null }, entrada, yo);
    return { ok: true, id };
  } catch (e) {
    return mal(e);
  }
}
