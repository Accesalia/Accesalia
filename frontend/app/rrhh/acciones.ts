"use server";

import { redirect } from "next/navigation";
import { quienSoy, puedeEntrar, type Yo } from "../../lib/sesion";
import {
  anularBaja,
  ausencia,
  borrarDia,
  calendarioEntre,
  guardarAnio,
  guardarDia,
  type TipoDia,
  darDeAlta,
  darDeBaja,
  crearAusencia,
  darFuncionTemporal,
  funcionesSinSuplente,
  guardarContrato,
  guardarDatosPersonales,
  guardarHorario,
  guardarSalario,
  guardarSaldo,
  hoyMadrid,
  laborables,
  noLaborables,
  personas,
  resolverAusencia,
  saldos,
  type TipoAusencia,
} from "../../lib/rrhh";

// Cada accion mira primero QUIEN la pide. La pagina ya esconde lo que no toca,
// pero eso no basta: una accion se puede llamar sin pasar por la pagina.
//   - pedir y anular: cada uno lo suyo;
//   - resolver, registrar ausencias y tocar fichas (tambien la cuenta y el neto
//     para las transferencias, que las hace RRHH): funcion RRHH o direccion;
//   - el salario bruto: solo direccion.

async function yo(): Promise<Yo> {
  const y = await quienSoy();
  if (!y) redirect("/entrar?volver=/rrhh");
  return y;
}

async function gestor(): Promise<Yo> {
  const y = await yo();
  if (!puedeEntrar(y, "rrhh", "trabajar")) redirect("/rrhh?vista=yo");
  return y;
}

const texto = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const fecha = (fd: FormData, k: string) => {
  const v = texto(fd, k);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};
// Numeros como se escriben aqui: "1.850,50", "1850,5", "6,5"... y tambien "6.5"
// o "1850.50". El punto es de miles solo si va seguido de grupos de tres cifras.
const numero = (fd: FormData, k: string) => {
  const v = texto(fd, k)?.replace(/\s|€/g, "");
  if (!v) return null;
  let s = v;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

async function diasLaborables(desde: string, hasta: string) {
  const cal = await calendarioEntre(desde, hasta);
  return laborables(desde, hasta, noLaborables(cal));
}

// ---------------------------------------------------------------------------
// El empleado: pedir y anular
// ---------------------------------------------------------------------------

const PUEDE_PEDIR: TipoAusencia[] = ["vacaciones", "permiso_retribuido", "ausencia_justificada"];

export async function pedirDias(fd: FormData) {
  const y = await yo();
  const tipo = texto(fd, "tipo") as TipoAusencia | null;
  const desde = fecha(fd, "desde");
  const hasta = fecha(fd, "hasta");
  const volver = "/rrhh?vista=yo";
  if (!tipo || !PUEDE_PEDIR.includes(tipo)) redirect(`${volver}&error=tipo`);
  if (!desde || !hasta || hasta < desde) redirect(`${volver}&error=fechas`);

  const dias = await diasLaborables(desde, hasta);
  if (dias === 0) redirect(`${volver}&error=sin_dias`);

  if (tipo === "vacaciones") {
    const saldo = (await saldos(Number(desde.slice(0, 4)), [y.id])).get(y.id);
    if (saldo?.cargado && dias > saldo.quedan) redirect(`${volver}&error=sin_saldo`);
  }

  await crearAusencia({ personaId: y.id, tipo, desde, hasta, dias, estado: "solicitada", notas: texto(fd, "notas") });
  redirect(`${volver}&aviso=pedida`);
}

export async function anularSolicitud(fd: FormData) {
  const y = await yo();
  const a = await ausencia(String(fd.get("id") ?? ""));
  // Solo la propia, y solo mientras nadie la ha resuelto.
  if (a && a.personaId === y.id && a.estado === "solicitada") await resolverAusencia(a.id, "anulada", y.id);
  redirect("/rrhh?vista=yo&aviso=anulada");
}

// ---------------------------------------------------------------------------
// RRHH y direccion: resolver solicitudes
// ---------------------------------------------------------------------------

export async function resolverSolicitud(fd: FormData) {
  const y = await gestor();
  const a = await ausencia(String(fd.get("id") ?? ""));
  if (!a || a.estado !== "solicitada") redirect("/rrhh?aviso=ya_resuelta");
  // Nadie se aprueba lo suyo: lo resuelve otra persona de RRHH o direccion.
  if (a.personaId === y.id) redirect("/rrhh?error=propia");

  if (fd.get("decision") === "rechazar") {
    const motivo = texto(fd, "motivo");
    if (!motivo) redirect(`/rrhh?error=motivo&s=${a.id}#s-${a.id}`);
    await resolverAusencia(a.id, "rechazada", y.id, motivo);
    redirect("/rrhh?aviso=rechazada");
  }

  // Aprobar: si es la unica con alguna funcion, hay que decir quien la cubre.
  const equipo = await personas(true);
  const huecos = funcionesSinSuplente(a.personaId, a.desde, a.hasta, equipo);
  const coberturas: { personaId: string; funcionId: string }[] = [];
  for (const h of huecos) {
    const eleccion = texto(fd, `cubre_${h.funcionId}`);
    if (!eleccion) redirect(`/rrhh?error=cubre&s=${a.id}#s-${a.id}`);
    if (eleccion === "nadie") continue;
    if (!h.candidatos.some((c) => c.id === eleccion)) redirect(`/rrhh?error=cubre&s=${a.id}#s-${a.id}`);
    coberturas.push({ personaId: eleccion, funcionId: h.funcionId });
  }

  await resolverAusencia(a.id, "aprobada", y.id);
  for (const c of coberturas) await darFuncionTemporal(c.personaId, c.funcionId, a.desde, a.hasta);
  redirect("/rrhh?aviso=aprobada");
}

/** Una baja o un permiso que apunta RRHH entra ya aprobado. */
export async function registrarAusencia(fd: FormData) {
  const y = await gestor();
  const personaId = String(fd.get("persona") ?? "");
  const tipo = texto(fd, "tipo") as TipoAusencia | null;
  const desde = fecha(fd, "desde");
  const hasta = fecha(fd, "hasta");
  const volver = `/rrhh?p=${personaId}`;
  if (!tipo || !["vacaciones", "permiso_retribuido", "baja_medica", "ausencia_justificada", "otra"].includes(tipo))
    redirect(`${volver}&error=tipo#ficha`);
  if (!desde || !hasta || hasta < desde) redirect(`${volver}&error=fechas#ficha`);
  const dias = await diasLaborables(desde, hasta);
  await crearAusencia({ personaId, tipo, desde, hasta, dias, estado: "aprobada", resueltaPor: y.id, notas: texto(fd, "notas") });
  redirect(`${volver}&aviso=registrada#ficha`);
}

// ---------------------------------------------------------------------------
// Alta y baja
// ---------------------------------------------------------------------------

/**
 * Alta completa, todo en un sitio (Monica, 11-sep-2026: "si se hace todo en un
 * solo sitio, marea menos"): la persona, sus funciones, datos personales,
 * contrato, horario, dias del año y, si lo da de alta direccion, el bruto.
 * Los documentos los sube despues el navegador, ya con la persona creada.
 * Devuelve el id (lo llama el formulario desde el navegador).
 */
export async function altaEmpleado(fd: FormData): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const y = await gestor();
  const hoy = hoyMadrid();
  const nombre = texto(fd, "nombre");
  const desde = fecha(fd, "desde");
  const email = texto(fd, "email")?.toLowerCase() ?? null;
  if (!nombre) return { ok: false, error: "Falta el nombre." };
  if (!desde) return { ok: false, error: "Falta el primer día." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Ese correo no parece bien escrito." };
  const iban = texto(fd, "iban")?.replace(/\s+/g, "").toUpperCase() ?? null;
  if (iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return { ok: false, error: "La cuenta no parece un IBAN: empieza por ES y lleva 22 números más." };

  const tipo = texto(fd, "tipo");
  const categoria = texto(fd, "categoria");
  const horas = numero(fd, "horas");
  let id: string;
  try {
    id = await darDeAlta({
      nombre,
      apellidos: texto(fd, "apellidos"),
      email,
      desde,
      funciones: fd.getAll("funciones").map(String).filter(Boolean),
      contrato: tipo || categoria || horas != null ? { tipo, categoria, horasSemana: horas } : null,
      diasAnio: numero(fd, "dias"),
    });
  } catch (e) {
    // El unico choque posible es el correo: cada uno es de una sola persona.
    if (String(e).includes("uq_equipo_email")) return { ok: false, error: "Ese correo ya es de otra persona del equipo." };
    throw e;
  }

  const datos = {
    dni: texto(fd, "dni")?.replace(/[\s-]/g, "").toUpperCase() ?? null,
    direccion: texto(fd, "direccion"),
    iban,
    netoMensual: numero(fd, "neto"),
    notas: null,
  };
  if (datos.dni || datos.direccion || datos.iban || datos.netoMensual != null) await guardarDatosPersonales(id, datos);

  const dias = ["lunes", "martes", "miercoles", "jueves", "viernes"] as const;
  const h = Object.fromEntries(dias.map((d) => [d, texto(fd, d)])) as Record<(typeof dias)[number], string | null>;
  if (dias.some((d) => h[d]) || texto(fd, "tipo_jornada")) {
    await guardarHorario(id, null, {
      tipoJornada: texto(fd, "tipo_jornada"),
      ...h,
      tiempoComida: texto(fd, "comida"),
      horasSemana: numero(fd, "horas_horario"),
      desde,
    });
  }

  const bruto = numero(fd, "bruto");
  if (y.veTodo && bruto != null && bruto >= 0) await guardarSalario(id, bruto, desde, hoy);
  return { ok: true, id };
}

export async function bajaEmpleado(fd: FormData) {
  await gestor();
  const personaId = String(fd.get("persona") ?? "");
  const ultimo = fecha(fd, "ultimo");
  const motivo = texto(fd, "motivo");
  const detalle = texto(fd, "detalle");
  if (!ultimo || !motivo) redirect(`/rrhh?p=${personaId}&error=baja#ficha`);
  await darDeBaja(personaId, ultimo, detalle ? `${motivo}: ${detalle}` : motivo, hoyMadrid());
  redirect(`/rrhh?p=${personaId}&aviso=baja#ficha`);
}

export async function deshacerBaja(fd: FormData) {
  await gestor();
  const personaId = String(fd.get("persona") ?? "");
  await anularBaja(personaId);
  redirect(`/rrhh?p=${personaId}&aviso=baja_anulada#ficha`);
}

// ---------------------------------------------------------------------------
// El calendario de la empresa y el año laboral (RRHH y direccion)
// ---------------------------------------------------------------------------

export async function guardarDiaCalendario(fd: FormData) {
  await gestor();
  const f = fecha(fd, "fecha");
  const tipo = texto(fd, "tipo");
  const anio = f?.slice(0, 4) ?? String(fd.get("anio") ?? "");
  if (!f || !tipo || !["festivo", "cierre_obligatorio", "turno"].includes(tipo)) redirect(`/rrhh?anio=${anio}&error=dia#calendario`);
  await guardarDia(f, tipo as TipoDia, texto(fd, "descripcion"));
  redirect(`/rrhh?anio=${anio}&aviso=dia#calendario`);
}

export async function borrarDiaCalendario(fd: FormData) {
  await gestor();
  await borrarDia(String(fd.get("id") ?? ""));
  redirect(`/rrhh?anio=${String(fd.get("anio") ?? "")}&aviso=dia_quitado#calendario`);
}

export async function guardarParametrosAnio(fd: FormData) {
  await gestor();
  const anio = Number(fd.get("anio"));
  const dias = numero(fd, "dias");
  const jornada = numero(fd, "jornada");
  if (!anio || dias == null || dias < 0 || (jornada != null && jornada <= 0)) redirect(`/rrhh?anio=${anio}&error=anio#calendario`);
  await guardarAnio(anio, jornada, dias, texto(fd, "notas"));
  redirect(`/rrhh?anio=${anio}&aviso=guardado#calendario`);
}

// ---------------------------------------------------------------------------
// La ficha
// ---------------------------------------------------------------------------

export async function guardarFicha(fd: FormData) {
  const y = await gestor();
  const personaId = String(fd.get("persona") ?? "");
  const parte = String(fd.get("parte") ?? "");
  const volver = `/rrhh?p=${personaId}`;
  const hoy = hoyMadrid();

  if (parte === "datos") {
    const iban = texto(fd, "iban")?.replace(/\s+/g, "").toUpperCase() ?? null;
    if (iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) redirect(`${volver}&error=iban#ficha`);
    const neto = numero(fd, "neto");
    if (neto != null && neto < 0) redirect(`${volver}&error=neto#ficha`);
    await guardarDatosPersonales(personaId, {
      dni: texto(fd, "dni")?.replace(/[\s-]/g, "").toUpperCase() ?? null,
      direccion: texto(fd, "direccion"),
      iban,
      netoMensual: neto,
      notas: texto(fd, "notas"),
    });
  } else if (parte === "contrato") {
    const desde = fecha(fd, "desde");
    if (!desde) redirect(`${volver}&error=fechas#ficha`);
    await guardarContrato(personaId, texto(fd, "id"), {
      tipo: texto(fd, "tipo"),
      categoria: texto(fd, "categoria"),
      horasSemana: numero(fd, "horas"),
      desde,
    });
  } else if (parte === "horario") {
    const desde = fecha(fd, "desde");
    if (!desde) redirect(`${volver}&error=fechas#ficha`);
    await guardarHorario(personaId, texto(fd, "id"), {
      tipoJornada: texto(fd, "tipo_jornada"),
      lunes: texto(fd, "lunes"),
      martes: texto(fd, "martes"),
      miercoles: texto(fd, "miercoles"),
      jueves: texto(fd, "jueves"),
      viernes: texto(fd, "viernes"),
      tiempoComida: texto(fd, "comida"),
      horasSemana: numero(fd, "horas"),
      desde,
    });
  } else if (parte === "saldo") {
    const anio = Number(fd.get("anio"));
    const derecho = numero(fd, "derecho");
    if (!anio || derecho == null) redirect(`${volver}&error=saldo#ficha`);
    await guardarSaldo(personaId, anio, derecho, numero(fd, "arrastrados") ?? 0);
  } else if (parte === "salario") {
    if (!y.veTodo) redirect(volver);
    const bruto = numero(fd, "bruto");
    const desde = fecha(fd, "desde");
    if (bruto == null || bruto < 0 || !desde) redirect(`${volver}&error=salario#ficha`);
    await guardarSalario(personaId, bruto, desde, hoy);
  }
  redirect(`${volver}&aviso=guardado#ficha`);
}
