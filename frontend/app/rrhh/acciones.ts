"use server";

import { redirect } from "next/navigation";
import { quienSoy, puedeEntrar, type Yo } from "../../lib/sesion";
import {
  ausencia,
  calendarioEntre,
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
const numero = (fd: FormData, k: string) => {
  const v = texto(fd, k);
  if (v == null) return null;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
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
