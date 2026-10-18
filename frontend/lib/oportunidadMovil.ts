// lib/oportunidadMovil.ts
//
// UNA OPORTUNIDAD QUE NACE EN EL MOVIL (Monica, 8-oct-2026).
//
// "Una opp nueva se crea en dos tiempos: en el movil para dejar el texto
// fresco; en la app de PC se completa para poder pasar al siguiente hito." En
// el movil, si la direccion no esta y el comercial dice "Es nueva", la
// oportunidad NACE: con su codigo y su id, para que ya se le puedan enganchar
// notas. Nace "coja": con lo que se pudo poner (administrador, contacto, que
// quieren, siguiente paso) y lo demas se completa en el PC. Mientras falte
// direccion, contacto o siguiente paso, sale en PENDIENTES y no deja generar
// documentos.
//
// La direccion queda PROVISIONAL, tal cual se escribio: se confirma en la
// ficha con su boton de Catastro. No se busca sola: un emparejamiento
// automatico puede equivocarse de edificio, y seria fabricar el dato.
//
// El movil le da su propio id: si reenvia porque se corto la cobertura, no se
// crea dos veces.

import "server-only";
import type { Yo } from "./sesion";
import { comercialDe } from "./sesion";
import { siguienteCodigo } from "./altaOportunidad";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function pedir(metodo: "GET" | "POST" | "PATCH", path: string, cuerpo?: unknown) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method: metodo,
    headers: { ...CAB, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return metodo === "GET" ? r.json() : null;
}

export type NuevaDesdeMovil = {
  /** El id que le da el movil a la oportunidad. */
  id: string;
  direccion: string;
  fecha: string;
  /** "puesto:<id>" del administrador, o vacio. */
  administrador: string | null;
  /** "puesto:<id>" de la lista, o vacio si se escribio. */
  contacto: string | null;
  contactoNombre: string | null;
  contactoTelefono: string | null;
  tipos: string[];
  /** primer_contacto | visita | envio_documentos, o vacio ("Ahora no"). */
  paso: string | null;
};

const PASOS = ["primer_contacto", "visita", "envio_documentos"];

/** Crea la oportunidad (si no existe ya con ese id) y devuelve su id. El
 *  comercial es quien la crea; si quien la crea no es comercial (direccion,
 *  desde la estimacion de costes), el que se elija en `comercialId`.
 *
 *  SIN COMERCIAL NO NACE (Monica, 12-oct-2026): "sin comercial NO HAY CODIGO
 *  que asignar, no puede nacer". La base lo admitiria (codigo y comercial_id
 *  son opcionales), por eso lo para el codigo. */
export async function crearOportunidadDesdeMovil(yo: Yo, d: NuevaDesdeMovil, comercialId: string | null = null): Promise<string> {
  if (!/^[0-9a-f-]{36}$/.test(d.id)) throw new Error("La oportunidad nueva llega sin un id válido.");
  if (!d.direccion.trim()) throw new Error("Una oportunidad nueva necesita al menos la dirección que se escribió.");

  // ¿Ya se creo en un envio anterior que se corto? Entonces es esa.
  const ya = (await pedir("GET", `oportunidades?select=id&id=eq.${d.id}&limit=1`)) as { id: string }[];
  if (ya.length) return d.id;

  const mio = (await comercialDe(yo.id)) ?? (comercialId ? { id: comercialId } : null);
  if (!mio) throw new Error("Una oportunidad nace con su comercial: elige de quién es.");
  const codigo = await siguienteCodigo(mio.id);
  if (!codigo) throw new Error("Ese comercial no tiene siglas: sin ellas no hay código y la oportunidad no puede nacer.");
  const [lc, idc] = (d.contacto ?? "").split(":");
  const [la, ida] = (d.administrador ?? "").split(":");
  const conContacto = lc === "puesto";

  await pedir("POST", "oportunidades", {
    id: d.id,
    codigo,
    fecha_apertura: d.fecha,
    nombre: d.direccion.trim(),
    comunidad_provisional: d.direccion.trim(),
    comercial_id: mio.id,
    estado: "abierta",
    puesto_id: lc === "puesto" ? idc : null,
    contacto_provisional: !conContacto && d.contactoNombre?.trim() ? d.contactoNombre.trim() : null,
    telefono_provisional: !conContacto && d.contactoNombre?.trim() ? d.contactoTelefono?.trim() || null : null,
    siguiente_paso: d.paso && PASOS.includes(d.paso) ? d.paso : null,
  });

  // Lo que quieren: una fila por cada cosa.
  for (const tipoId of d.tipos.filter((t) => /^[0-9a-f-]{36}$/.test(t))) {
    await pedir("POST", "oportunidad_tipos", { oportunidad_id: d.id, tipo_id: tipoId });
  }

  // Por donde entramos en el flujo, como en el alta: los hitos de antes del
  // siguiente paso no aplican (los crea la base sola al nacer la oportunidad).
  if (d.paso && PASOS.includes(d.paso)) {
    const hitos = (await pedir("GET", "hitos_comerciales?select=clave,orden&order=orden.asc")) as { clave: string; orden: number }[];
    const arranque = hitos.find((h) => h.clave === d.paso);
    const antes = arranque ? hitos.filter((h) => h.orden < arranque.orden).map((h) => h.clave) : [];
    if (antes.length) {
      await pedir("PATCH", `hitos_oportunidad?oportunidad_id=eq.${d.id}&hito=in.(${antes.join(",")})`, {
        aplicable: false,
        estado: "no_aplica",
      });
    }
  }
  return d.id;
}

/** Lo que quieren, para elegir en el movil. */
export async function tiposParaMovil(): Promise<{ valor: string; texto: string }[]> {
  const t = (await pedir(
    "GET",
    "tipos_proyecto?select=id,nombre&activo=is.true&elegible=is.true&contratable=is.true&order=orden.asc",
  )) as { id: string; nombre: string }[];
  return t.map((x) => ({ valor: x.id, texto: x.nombre }));
}
