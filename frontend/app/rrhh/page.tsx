import Link from "next/link";
import { redirect } from "next/navigation";
import { Aviso } from "../components/Aviso";
import { BarraSuperior } from "../components/BarraSuperior";
import { quienSoy, puedeEntrar } from "../../lib/sesion";
import { hoyMadrid } from "../../lib/rrhh";
import { Gestion } from "./Gestion";
import { MiEspacio } from "./MiEspacio";

export const dynamic = "force-dynamic";

// Area de RRHH. Maqueta aprobada por Monica el 11-sep-2026 ("espectacular, es
// perfecto"); primera entrega: vacaciones, ficha y el espacio de cada uno. Las
// nominas, los documentos y el calendario de la empresa llegan despues.
//
// QUIEN VE QUE, por funcion:
//   - todos: su espacio (sus dias, sus solicitudes, su horario);
//   - funcion RRHH y direccion: ademas, la gestion (solicitudes, quien esta
//     fuera, empleados y fichas, y las transferencias, que las hace RRHH);
//   - direccion: ademas, el salario bruto anual.

const AVISOS: Record<string, string> = {
  pedida: "Solicitud enviada. Le llega a RRHH y a dirección.",
  anulada: "Solicitud retirada.",
  aprobada: "Solicitud aprobada.",
  rechazada: "Solicitud rechazada. Quien la pidió verá el motivo.",
  ya_resuelta: "Esa solicitud ya estaba resuelta.",
  guardado: "Guardado.",
  registrada: "Ausencia apuntada.",
  alta: "Alta hecha. Esta es su ficha.",
  alta_sin_docs: "Alta hecha, pero algún documento no se ha subido. Súbelo aquí, en su ficha.",
  baja: "Baja registrada.",
  baja_anulada: "Baja deshecha: vuelve a estar en activo. Revisa sus funciones y su contrato en la ficha.",
  descartado: "PDF descartado.",
  dia: "Día guardado en el calendario.",
  dia_quitado: "Día quitado del calendario.",
  lote_cerrado: "Esas nóminas ya estaban publicadas o descartadas.",
};
const ERRORES: Record<string, string> = {
  tipo: "Elige qué es: vacaciones, permiso o ausencia.",
  fechas: "Revisa las fechas: la de fin no puede ser anterior a la de inicio.",
  sin_dias: "En esas fechas no hay ningún día laborable.",
  sin_saldo: "Pides más días de los que te quedan.",
  propia: "Una solicitud tuya la resuelve otra persona de RRHH o dirección.",
  iban: "Esa cuenta no parece un IBAN. Revísala: empieza por ES y lleva 22 números más.",
  saldo: "Falta el número de días del año.",
  salario: "Revisa el salario: el bruto y la fecha son obligatorios.",
  neto: "El neto no puede ser negativo.",
  baja: "Para dar de baja hacen falta el último día y el motivo.",
  dia: "Para el calendario hacen falta la fecha y qué es.",
  anio: "Revisa los datos del año: los días de vacaciones son obligatorios y la jornada tiene que ser mayor que cero.",
};
const FECHA_LARGA = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" });

export default async function Rrhh({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; ex?: string; p?: string; s?: string; aviso?: string; error?: string; alta?: string; lote?: string; n?: string; anio?: string }>;
}) {
  const sp = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/rrhh");

  const gestor = puedeEntrar(yo, "rrhh", "trabajar");
  const enGestion = gestor && sp.vista !== "yo";
  const hoy = hoyMadrid();
  const fecha = FECHA_LARGA.format(new Date());

  const aviso =
    sp.aviso === "publicadas"
      ? `Nóminas publicadas: ${sp.n ?? "todas"}. Cada uno tiene ya la suya en su espacio.`
      : sp.aviso
        ? AVISOS[sp.aviso]
        : null;
  const enAlta = sp.alta === "1";
  const error = sp.error && !["cubre", "motivo", "repetida"].includes(sp.error) ? ERRORES[sp.error] : null;
  const pill = (activo: boolean) =>
    "rounded-full px-4 py-2 text-sm transition " + (activo ? "bg-lima font-bold text-carbon" : "text-carbon/60 hover:text-carbon");

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1240px] px-4 pb-20 pt-5 sm:px-6">
        <Link href="/menu" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Menú
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-carbon sm:text-4xl">RRHH</h1>
            <p className="mt-1.5 text-lg text-carbon/60">
              Hola, <b className="text-carbon">{yo.nombre}</b>. {fecha.charAt(0).toUpperCase() + fecha.slice(1)}.
            </p>
          </div>
          {gestor && (
            <div className="inline-flex flex-wrap gap-1 rounded-full border border-black/10 bg-white p-1">
              <Link href="/rrhh" className={pill(enGestion)}>Gestión</Link>
              <Link href="/rrhh?vista=yo" className={pill(!enGestion)}>Mi espacio</Link>
            </div>
          )}
        </div>

        {aviso && <Aviso key={sp.aviso + (sp.n ?? "")} texto={aviso} />}
        {error && <Aviso key={sp.error} texto={error} tono="mal" />}

        {enGestion ? (
          <Gestion
            yo={yo}
            hoy={hoy}
            verEx={sp.ex === "1"}
            fichaId={sp.p ?? null}
            sId={sp.s ?? null}
            error={sp.error ?? null}
            alta={enAlta}
            loteId={sp.lote ?? null}
            anioCal={/^\d{4}$/.test(sp.anio ?? "") ? Number(sp.anio) : Number(hoy.slice(0, 4))}
          />
        ) : (
          <MiEspacio yo={yo} hoy={hoy} gestor={gestor} />
        )}
      </main>
    </div>
  );
}
