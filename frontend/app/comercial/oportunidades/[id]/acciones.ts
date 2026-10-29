"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { informeEdificio } from "../../../../lib/informeEdificio";
import { barrerNuestrasDirecciones, direccionDeAcceso } from "../../../../lib/ieePorDireccion";
import {
  anularPorDuplicada,
  anularPorError,
  reabrirAnulada,
  pausar,
  cerrar,
  reabrir,
  guardarJunta,
  guardarNegociacion,
  guardarTipos,
  guardarTresD,
  reactivar,
} from "../../../../lib/gestionOportunidad";
import { apuntarFotos } from "../../../../lib/fotos";
import { puedeVerOpp } from "../../../../lib/hojaGenerador";
import { apuntarEnCajon, archivarDocumento, permisosCajon, quitarDelCajon } from "../../../../lib/cajonDocumentos";
import { crearEntrada } from "../../../../lib/entradaDiario";
import { marcarAscensor, marcarPortal } from "../../edificio/[referencia]/acciones";
import { cambiarDireccion, type PersonaNueva } from "../../../../lib/altaOportunidad";
import { agendarReunion, choquesJunta } from "../../../../lib/juntaFicha";
import { apuntar, guardarDatosJunta, ponerDondeCambio, quitarApunte, type Apartado } from "../../../../lib/negociacion";
import { anadirContactoComunidad, buscarPersonas, guardarDatoCabecera, type CampoCabecera, type OpcionPersona } from "../../../../lib/datosCabecera";
import { guardarCompletar, ponerAdminEnComunidad, type DatosCompletar } from "../../../../lib/completa";
import { comercialDe, puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { quedaPorCobrar } from "../../../../lib/cabeceraOpp";
import { buscarOpps } from "../../../../lib/consulta";

const texto = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const marcado = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";

/** Quien entra tiene que poder trabajar el area comercial. Se comprueba en CADA
 *  accion: una pantalla que se abre no es un permiso para escribir. */
async function permiso(id: string) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/oportunidades/" + id);
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/menu");
  return yo;
}

const refrescar = (id: string) => {
  revalidatePath(`/comercial/oportunidades/${id}`);
  revalidatePath("/comercial");
};

export async function accionTipos(id: string, fd: FormData) {
  await permiso(id);
  await guardarTipos(id, fd.getAll("tipo").map(String).filter(Boolean));
  refrescar(id);
}

// LO QUE DICEN QUE QUIEREN, desde la cabecera (Monica, 14-oct-2026): "que se
// puedan quitar y anadir las cosas que dicen que quieren, asi luego la hoja de
// encargo sale prerrellenada bien". Una etiqueta cada vez.
const UUID = /^[0-9a-f-]{36}$/;

export async function accionQuitarInteres(id: string, tipoId: string) {
  await permiso(id);
  if (!UUID.test(tipoId)) return;
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/oportunidad_tipos?oportunidad_id=eq.${id}&tipo_id=eq.${tipoId}`, {
    method: "DELETE",
    headers: { apikey: process.env.SUPABASE_SECRET_KEY ?? "", Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY ?? ""}` },
  });
  refrescar(id);
}

export async function accionAnadirInteres(id: string, fd: FormData) {
  await permiso(id);
  // Uno o varios: el selector de cuatro columnas deja marcar varios (15-oct-2026).
  const tipos = fd.getAll("tipo").map(String).filter((t) => UUID.test(t));
  if (!tipos.length) return;
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/oportunidad_tipos?on_conflict=oportunidad_id,tipo_id`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SECRET_KEY ?? "",
      Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY ?? ""}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify(tipos.map((tipo_id) => ({ oportunidad_id: id, tipo_id }))),
  });
  refrescar(id);
}

/** Firmada y con dinero pendiente: ni se cierra ni se pausa (Monica, 14-oct-2026:
 *  "si el comercial lo intenta, le sale aviso"). Se comprueba aqui tambien, no
 *  solo en la pantalla. */
async function noSiQuedaPorCobrar(id: string) {
  if (await quedaPorCobrar(id)) throw new Error("Esto aún tiene cosas por cobrar: no se puede cerrar ni pausar.");
}

export async function accionNegociacion(id: string, fd: FormData) {
  const yo = await permiso(id);
  const mio = await comercialDe(yo.id);
  await guardarNegociacion(id, mio?.id ?? texto(fd, "comercial"), {
    queVendemos: texto(fd, "que_vendemos"),
    precio: texto(fd, "precio"),
    alcance: texto(fd, "alcance"),
    notas: texto(fd, "notas"),
  });
  refrescar(id);
}

export async function accionTresD(id: string, fd: FormData) {
  await permiso(id);
  await guardarTresD(id, {
    tipo: String(fd.get("tipo") ?? "a_medida"),
    estado: String(fd.get("estado") ?? "pedido"),
    fechaNecesaria: texto(fd, "fecha_necesaria"),
    fechaEntrega: texto(fd, "fecha_entrega"),
  });
  refrescar(id);
}

export async function accionJunta(id: string, juntaId: string | null, fd: FormData) {
  await permiso(id);
  await guardarJunta(id, juntaId, {
    fecha: texto(fd, "fecha"),
    celebrada: marcado(fd, "celebrada"),
    resultado: String(fd.get("resultado") ?? "pendiente"),
    detalle: texto(fd, "detalle"),
    seguimiento: marcado(fd, "seguimiento"),
  });
  refrescar(id);
}

export async function accionPausar(id: string, fd: FormData) {
  await permiso(id);
  await noSiQuedaPorCobrar(id);
  await pausar(id, texto(fd, "nota"));
  refrescar(id);
}

/** Cerrarla a mano, con su porque (14-oct-2026). */
export async function accionCerrar(id: string, fd: FormData) {
  const yo = await permiso(id);
  await noSiQuedaPorCobrar(id);
  await cerrar(id, { perdida: fd.get("tipo") !== "otra", motivo: String(fd.get("motivo") ?? ""), quien: [yo.nombre, yo.apellidos].filter(Boolean).join(" ") });
  refrescar(id);
}

export async function accionReabrir(id: string) {
  await permiso(id);
  await reabrir(id);
  refrescar(id);
}

export async function accionReactivar(id: string) {
  await permiso(id);
  await reactivar(id);
  refrescar(id);
}

/** Grabar una entrada del diario ya enganchada a esta oportunidad. */
export async function accionEntrada(id: string, fd: FormData) {
  const yo = await permiso(id);
  // «Sobre el administrador: …» cuando la nota se escribe en una caja de «Datos y contactos» (29-oct-2026).
  const sobre = String(fd.get("sobre") ?? "").trim();
  await crearEntrada({
    texto: (sobre ? `Sobre ${sobre}: ` : "") + String(fd.get("texto") ?? ""),
    canal: String(fd.get("canal") ?? ""),
    fecha: texto(fd, "fecha"),
    oportunidadId: id,
    persona: texto(fd, "con"),
    dondeTexto: null,
    autorId: yo.id,
    autorNombre: yo.nombre,
  });
  refrescar(id);
}

/** La direccion buscada en Catastro desde la ficha: la que se dejo provisional,
 *  o la que resulto ser otra. */
export async function accionDireccion(
  id: string,
  r: { nombre: string; portalIds: string[]; parcela: string | null; unirA?: string | null },
) {
  await permiso(id);
  await cambiarDireccion(id, r);
  refrescar(id);
}

// ¿CUANTOS PATIOS TIENE? (Monica, 5-oct-2026).
//
// "Es un dato del edificio como lo es el numero de viviendas, solo que con otro
// origen: manual en vez de Catastro. Manual incluye con posibilidad de fallo,
// claro."
//
// Por eso va firmado, igual que el ascensor: un dato que pone una persona vale
// lo que valga quien lo puso y cuando lo miro. Y por eso el 0 es un dato -no
// tiene patios- y el vacio es otro: nadie los ha contado.
/** ¿Hay ascensor? Lo marca quien lo ve (en la foto aerea o en el portal), y va
 *  firmado. Es la misma marca que la de la pantalla del edificio; pulsar otra
 *  vez la que esta puesta la quita. */
export async function accionAscensor(referencia: string, id: string, fd: FormData) {
  const v = String(fd.get("ascensor") ?? "");
  await marcarAscensor(referencia, v === "si" ? true : v === "no" ? false : null);
  revalidatePath(`/comercial/oportunidades/${id}`);
}

/** ¿Portal accesible? "si" / "no" / "" (quitarlo). Firmado, como el ascensor
 *  (Monica, 15-oct-2026). */
export async function accionPortal(referencia: string, id: string, fd: FormData) {
  const v = String(fd.get("portal") ?? "");
  await marcarPortal(referencia, v === "si" ? true : v === "no" ? false : null);
  revalidatePath(`/comercial/oportunidades/${id}`);
}

/** FOTOS DESDE EL PC al expediente de la opp (Monica, 15-oct-2026). El navegador
 *  las reduce y las sube con los permisos de siempre (accionPermisosFotos, en
 *  app/comercial/acciones.ts); esto las apunta como documentos de la opp. */
export async function accionApuntarFotosOpp(oppId: string, rutas: string[]): Promise<{ ok: true; n: number } | { ok: false; error: string }> {
  const yo = await quienSoy();
  if (!yo || !puedeEntrar(yo, "comercial", "trabajar")) return { ok: false, error: "Sin permiso para subir fotos." };
  if (!(await puedeVerOpp(yo, oppId))) return { ok: false, error: "No puedes tocar esta oportunidad." };
  try {
    const [op] = await fetch(`${process.env.SUPABASE_URL}/rest/v1/oportunidades?select=comunidad_id&id=eq.${oppId}&limit=1`, {
      headers: { apikey: process.env.SUPABASE_SECRET_KEY ?? "", Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY ?? ""}` },
      cache: "no-store",
    }).then((r) => r.json() as Promise<{ comunidad_id: string | null }[]>);
    if (!op) return { ok: false, error: "Esa oportunidad no existe." };
    const n = await apuntarFotos(rutas, { nota: "ninguna", oportunidadId: oppId, comunidadId: op.comunidad_id });
    revalidatePath(`/comercial/oportunidades/${oppId}`);
    return { ok: true, n };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** OTRAS COSAS QUE VIMOS EN LA VISITA (Monica, 29-oct-2026): texto libre en la ficha del edificio, firmado con quien y
 *  cuando, como el ascensor, el portal y los patios. Vacio = se borra. Upsert por lo mismo que los patios. */
export async function accionOtrasVistas(referencia: string, id: string, fd: FormData) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/oportunidades/" + id);
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/menu");
  const texto = String(fd.get("otras") ?? "").trim().slice(0, 4000) || null;
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/ficha_catastro?on_conflict=referencia`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SECRET_KEY ?? "",
      Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY ?? ""}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      referencia: referencia.replace(/\s/g, "").toUpperCase().slice(0, 14),
      otras_vistas: texto,
      otras_vistas_por: texto === null ? null : yo.id,
      otras_vistas_en: texto === null ? null : new Date().toISOString(),
    }),
  });
  revalidatePath(`/comercial/oportunidades/${id}`);
}

export async function accionPatios(referencia: string, id: string, fd: FormData) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/oportunidades/" + id);
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/menu");

  const crudo = String(fd.get("patios") ?? "").trim();
  const n = crudo === "" ? null : Number(crudo);
  if (n !== null && (!Number.isInteger(n) || n < 0 || n > 99)) return;

  // Upsert, no update: si la ficha de Catastro todavia no se guardo -porque el
  // servicio fallo ese dia-, lo que vio una persona no se puede perder.
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/ficha_catastro?on_conflict=referencia`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SECRET_KEY ?? "",
      Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY ?? ""}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      referencia: referencia.replace(/\s/g, "").toUpperCase().slice(0, 14),
      patios: n,
      patios_vistos_por: n === null ? null : yo.id,
      patios_vistos_en: n === null ? null : new Date().toISOString(),
    }),
  });

  revalidatePath(`/comercial/oportunidades/${id}`);
}

/** COMPLETAR la oportunidad desde su ficha: contacto, siguiente paso y, si se
 *  sabe, el administrador (8-oct-2026). La direccion se confirma con su boton
 *  de Catastro, como siempre. */
export async function accionCompletar(id: string, d: DatosCompletar): Promise<{ ok: true } | { ok: false; error: string }> {
  await permiso(id);
  try {
    await guardarCompletar(id, d);
    refrescar(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Poner el administrador de la oportunidad como administracion de su
 *  comunidad, cuando la comunidad no tiene ninguna (8-oct-2026). */
export async function accionAdminAComunidad(id: string) {
  await permiso(id);
  await ponerAdminEnComunidad(id);
  refrescar(id);
}

/** IR A OTRA OPP desde la ficha, sin volver a la lista (Monica, 14-oct-2026). */
export async function accionBuscarOpps(q: string): Promise<{ id: string; nombre: string; detalle: string }[]> {
  const yo = await quienSoy();
  if (!yo || !puedeEntrar(yo, "comercial")) return [];
  return (await buscarOpps(q)).map(({ id, nombre, detalle }) => ({ id, nombre, detalle }));
}

/** CONSULTAR LA IEE DE ESTA OPP (Monica, 15-oct-2026): cuando no consta, se le
 *  pregunta al registro aposta por sus portales, con la misma maquina que el
 *  barrido de nuestras direcciones (lib/ieePorDireccion.ts). Lo que encuentre se
 *  guarda en iee_registrado y la ficha lo lee de ahi. */
export async function accionConsultarIee(oppId: string): Promise<{ ok: true; guardadas: number; fuera: boolean } | { ok: false; error: string }> {
  const yo = await quienSoy();
  if (!yo || !puedeEntrar(yo, "comercial", "trabajar")) return { ok: false, error: "Sin permiso para consultar." };
  if (!(await puedeVerOpp(yo, oppId))) return { ok: false, error: "No puedes tocar esta oportunidad." };
  try {
    const rel = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/relacion_oportunidad_accesos?select=acceso:acceso_id(municipio,tipo_via,nombre_via,numero)&opp_id=eq.${oppId}&hasta=is.null`,
      { headers: { apikey: process.env.SUPABASE_SECRET_KEY ?? "", Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY ?? ""}` }, cache: "no-store" },
    ).then((r) => r.json() as Promise<{ acceso: { municipio: string; tipo_via: string; nombre_via: string; numero: string } | null }[]>);
    const dirs = rel.map((r) => r.acceso).filter((a): a is NonNullable<typeof a> => !!a?.nombre_via && !!a.numero).map(direccionDeAcceso);
    if (!dirs.length) return { ok: false, error: "La opp no tiene portales con calle y número." };
    const r = await barrerNuestrasDirecciones({ soloEstas: dirs, segundosMaximos: 50 });
    revalidatePath(`/comercial/oportunidades/${oppId}`);
    return { ok: true, guardadas: r.guardadas, fuera: r.municipiosMirados === 0 && r.municipiosFuera.length > 0 };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** VOLVER A CONSULTAR EL EDIFICIO (Monica, 15-oct-2026): solo se ofrece cuando
 *  faltan datos de Catastro. Se salta la espera entre consultas, porque lo pide
 *  una persona. */
export async function accionVolverAConsultar(oppId: string, referencia: string): Promise<{ ok: true; completo: boolean } | { ok: false; error: string }> {
  const yo = await quienSoy();
  if (!yo || !puedeEntrar(yo, "comercial", "trabajar")) return { ok: false, error: "Sin permiso para consultar." };
  if (!(await puedeVerOpp(yo, oppId))) return { ok: false, error: "No puedes tocar esta oportunidad." };
  try {
    const i = await informeEdificio(referencia, { refrescar: true });
    revalidatePath(`/comercial/oportunidades/${oppId}`);
    return { ok: true, completo: !!i && i.fallos.length === 0 };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** ANULAR, Y LUEGO LA RAZON (Monica, 16-oct-2026): "no duplicada, sino anular,
 *  y luego ya eliges la razon". Por error: con su porque, se queda en esta.
 *  Duplicada: la buena se elige de las otras opps de la direccion o se escribe
 *  su codigo, y se va a la buena. */
export async function accionAnular(id: string, fd: FormData) {
  const yo = await permiso(id);
  if (fd.get("razon") === "error") {
    await anularPorError(id, String(fd.get("motivo") ?? ""), yo.id);
    refrescar(id);
    return;
  }
  let buena = String(fd.get("buena") ?? "").trim();
  const codigo = String(fd.get("codigo") ?? "").trim().toUpperCase();
  if (!buena && codigo) {
    const URL_BASE = process.env.SUPABASE_URL ?? "";
    const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
    const r = await fetch(`${URL_BASE}/rest/v1/oportunidades?select=id&codigo=eq.${encodeURIComponent(codigo)}&estado=neq.anulada&limit=1`, {
      headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
      cache: "no-store",
    });
    const [o] = r.ok ? ((await r.json()) as { id: string }[]) : [];
    if (!o) throw new Error(`No hay ninguna opp con el código ${codigo}.`);
    buena = o.id;
  }
  if (!buena) throw new Error("Elige cuál es la buena.");
  await anularPorDuplicada(id, buena, yo.id);
  refrescar(id);
  refrescar(buena);
  redirect(`/comercial/oportunidades/${buena}`);
}

export async function accionReabrirAnulada(id: string) {
  const yo = await permiso(id);
  await reabrirAnulada(id, yo.id);
  refrescar(id);
}

// EL CAJON DE DOCUMENTOS DE LA OPP (Monica, 25-oct-2026): cualquiera que entre en la opp suelta y archiva.
export async function accionPermisosCajon(oppId: string, nombres: string[]): Promise<{ ok: true; permisos: { ruta: string; url: string }[] } | { ok: false; error: string }> {
  const yo = await quienSoy();
  if (!yo || !(await puedeVerOpp(yo, oppId))) return { ok: false, error: "No puedes tocar esta oportunidad." };
  try {
    return { ok: true, permisos: await permisosCajon(oppId, nombres) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
export async function accionApuntarCajon(oppId: string, subidos: { ruta: string; nombre: string }[], tipoId?: string): Promise<{ ok: true; n: number } | { ok: false; error: string }> {
  const yo = await quienSoy();
  if (!yo || !(await puedeVerOpp(yo, oppId))) return { ok: false, error: "No puedes tocar esta oportunidad." };
  try {
    const n = await apuntarEnCajon(yo, oppId, subidos, tipoId);
    revalidatePath(`/comercial/oportunidades/${oppId}`);
    revalidatePath("/bandeja-comercial");
    return { ok: true, n };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
export async function accionQuitarDelCajon(oppId: string, docId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const yo = await quienSoy();
  if (!yo || !(await puedeVerOpp(yo, oppId))) return { ok: false, error: "No puedes tocar esta oportunidad." };
  try {
    await quitarDelCajon(docId, oppId);
    revalidatePath(`/comercial/oportunidades/${oppId}`);
    revalidatePath("/bandeja-comercial");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
export async function accionArchivarEnCajon(oppId: string, docId: string, tipoId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const yo = await quienSoy();
  if (!yo || !(await puedeVerOpp(yo, oppId))) return { ok: false, error: "No puedes tocar esta oportunidad." };
  try {
    await archivarDocumento(yo, docId, tipoId, oppId);
    revalidatePath(`/comercial/oportunidades/${oppId}`);
    revalidatePath("/bandeja-comercial");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** EDITAR EN LA CABECERA lo que cuentan las notas (Monica, 27-oct-2026): administracion, quien la trae y el
 *  contacto, cada uno a su casa (lib/datosCabecera.ts). */
export async function accionBuscarPersonas(id: string, q: string, campo: CampoCabecera): Promise<OpcionPersona[]> {
  await permiso(id);
  return buscarPersonas(q, campo).catch(() => []);
}
export async function accionDatoCabecera(
  id: string,
  campo: CampoCabecera,
  d: { valor: string | null; nueva: PersonaNueva | null },
): Promise<{ ok: true; que: string } | { ok: false; error: string }> {
  const yo = await permiso(id);
  try {
    const que = await guardarDatoCabecera(id, campo, d, yo.comercial?.id ?? null);
    refrescar(id);
    return { ok: true, que };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
export async function accionAnadirContacto(id: string, n: PersonaNueva): Promise<{ ok: true } | { ok: false; error: string }> {
  const yo = await permiso(id);
  try {
    await anadirContactoComunidad(id, n, yo.comercial?.id ?? null);
    refrescar(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** AGENDAR DESDE EL BLOQUE 3 (Monica, 28-oct-2026): en la agenda del comercial de la opp (si no tiene, en la de quien
 *  lo apunta), avisando antes si choca con otra cita. */
async function agendaDeOpp(id: string, yoId: string): Promise<string> {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/oportunidades?select=comercial:comercial_id(equipo_id)&id=eq.${id}`, {
    headers: { apikey: process.env.SUPABASE_SECRET_KEY ?? "", Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY ?? ""}` },
    cache: "no-store",
  });
  const [o] = r.ok ? ((await r.json()) as { comercial: { equipo_id: string | null } | null }[]) : [];
  return o?.comercial?.equipo_id ?? yoId;
}
export async function accionChoquesReunion(id: string, dia: string, hora: string) {
  const yo = await permiso(id);
  return choquesJunta(await agendaDeOpp(id, yo.id), dia, hora).catch(() => []);
}
export async function accionAgendarReunion(
  id: string,
  d: { tipo: string; dia: string; hora: string; lugar: string; tema: string; nombreOpp: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const yo = await permiso(id);
  try {
    await agendarReunion(id, { ...d, agenda: await agendaDeOpp(id, yo.id) }, yo.id);
    refrescar(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** LOS APUNTES DEL BLOQUE 3 (Monica, 28-oct-2026): presidente, comision de obras, vecinos, contrata, competencia. */
type Res = { ok: true } | { ok: false; error: string };
async function hacer3(id: string, f: (yo: Awaited<ReturnType<typeof permiso>>) => Promise<unknown>): Promise<Res> {
  const yo = await permiso(id);
  try {
    await f(yo);
    refrescar(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
export async function accionApuntar(id: string, a: { apartado: Apartado; texto: string; postura: "a_favor" | "en_contra" | null }) {
  return hacer3(id, (yo) => apuntar(id, a, { id: yo.id, nombre: [yo.nombre, yo.apellidos].filter(Boolean).join(" ") }));
}
export async function accionQuitarApunte(id: string, apunteId: string) {
  return hacer3(id, () => quitarApunte(id, apunteId));
}
export async function accionDatosJunta(id: string, juntaId: string, d: { documentacion: string; quorum: string; votosFavor: number | null; votosContra: number | null }) {
  return hacer3(id, () => guardarDatosJunta(id, juntaId, d));
}
export async function accionDondeCambio(id: string, estadoId: string, donde: string | null) {
  return hacer3(id, () => ponerDondeCambio(id, estadoId, donde));
}
