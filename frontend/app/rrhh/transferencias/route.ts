// El fichero de transferencias de las nominas para CaixaBankNow (SEPA XML).
// Solo RRHH y direccion. Sale de las ultimas nominas publicadas: el liquido de
// cada una y la cuenta de su ficha. Las cuentas que no pasan el digito de
// control se quedan fuera (la pantalla ya lo avisa).

import { NextResponse, type NextRequest } from "next/server";
import { quienSoy, puedeEntrar } from "../../../lib/sesion";
import { datosPersonales, empresa, nombreCompleto, personas } from "../../../lib/rrhh";
import { ultimasPublicadas } from "../../../lib/rrhhNominas";
import { ficheroSepa, ibanValido } from "../../../lib/sepa";

const MES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

export async function GET(req: NextRequest) {
  const yo = await quienSoy();
  if (!yo) return NextResponse.redirect(new URL("/entrar?volver=/rrhh", req.url));
  if (!puedeEntrar(yo, "rrhh", "trabajar")) return new NextResponse("No puedes descargar este fichero.", { status: 403 });

  const fecha = req.nextUrl.searchParams.get("fecha") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return new NextResponse("Falta la fecha de pago.", { status: 400 });

  const [mes, emp, equipo] = await Promise.all([ultimasPublicadas(), empresa(), personas(null)]);
  if (!mes) return new NextResponse("No hay nóminas publicadas.", { status: 404 });
  if (!emp.razonSocial || !emp.nif || !ibanValido(emp.iban)) {
    return new NextResponse("Faltan los datos de Accesalia para el banco (razón social, NIF o cuenta).", { status: 400 });
  }

  const cuentas = await datosPersonales(mes.nominas.map((n) => n.personaId!));
  const periodo = mes.periodo.slice(0, 7);
  const pagos = mes.nominas
    .map((n, i) => {
      const p = equipo.find((x) => x.id === n.personaId);
      const iban = cuentas.get(n.personaId!)?.iban ?? null;
      return p && n.liquido != null && n.liquido > 0 && ibanValido(iban)
        ? { nombre: nombreCompleto(p), iban: iban!, importe: n.liquido, referencia: `NOM${periodo.replace("-", "")}-${String(i + 1).padStart(3, "0")}` }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
  if (pagos.length === 0) return new NextResponse("Ninguna nómina tiene una cuenta válida en su ficha.", { status: 400 });

  const xml = ficheroSepa({
    ordenante: { razonSocial: emp.razonSocial, nif: emp.nif, sufijo: emp.sufijo, iban: emp.iban!, bic: emp.bic },
    pagos,
    fechaEjecucion: fecha,
    concepto: `NOMINA ${MES[Number(periodo.slice(5, 7)) - 1]} ${periodo.slice(0, 4)}`,
    idMensaje: `NOMINAS-${periodo}-${Date.now().toString(36).toUpperCase()}`,
  });
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="transferencias-nominas-${periodo}.xml"`,
      "Cache-Control": "no-store",
    },
  });
}
