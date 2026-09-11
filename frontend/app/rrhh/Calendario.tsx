import Link from "next/link";
import {
  calcularAnio,
  calendarioEntre,
  contratosVigentes,
  esFinde,
  horariosVigentes,
  nombreCompleto,
  parametrosAnio,
  TIPO_DIA,
  type DiaCalendario,
  type Persona,
} from "../../lib/rrhh";
import { BotonEnviar } from "../components/Aviso";
import { borrarDiaCalendario, guardarDiaCalendario, guardarParametrosAnio } from "./acciones";
import { Titulo } from "./Piezas";

// Calendario de la empresa y año laboral (Monica, 11-sep-2026): festivos,
// cierres de oficina y turnos; la jornada anual del convenio; y, persona a
// persona, cuantas horas salen de verdad con su horario y si le tocan dias
// libres por exceso de jornada. Lo ven RRHH y direccion; el calendario, todos.

const SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const larga = (f: string) => {
  const d = new Date(f + "T12:00:00Z");
  return `${SEMANA[d.getUTCDay()]} ${d.getUTCDate()} de ${MES[d.getUTCMonth()]}`;
};
// useGrouping "always": sin el, en español 1800 sale sin punto de miles.
const NUM = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1, useGrouping: "always" });
const h = (n: number | null) => (n == null ? "—" : `${NUM.format(n)} h`);

const CHIP: Record<DiaCalendario["tipo"], string> = {
  festivo: "bg-black/5 text-carbon/70",
  cierre_obligatorio: "bg-ajeno-soft text-ajeno",
  turno: "bg-amber-50 text-amber-800",
};

const campo = "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-lima focus:ring-2 focus:ring-lima/30";

/** Lista corta para el espacio de cada empleado. */
export async function CalendarioParaTodos({ anio }: { anio: number }) {
  const dias = (await calendarioEntre(`${anio}-01-01`, `${anio}-12-31`)).filter((d) => !esFinde(d.fecha));
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold text-carbon">Calendario de {anio}</h3>
      {dias.length === 0 ? (
        <p className="mt-2 text-sm text-carbon/50">RRHH aún no ha puesto los festivos y cierres de este año.</p>
      ) : (
        <ul className="mt-2 divide-y divide-black/5 text-sm">
          {dias.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
              <span>
                <b className="font-semibold capitalize">{larga(d.fecha)}</b>
                {d.descripcion && <span className="text-carbon/50"> · {d.descripcion}</span>}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${CHIP[d.tipo]}`}>{TIPO_DIA[d.tipo]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export async function CalendarioEmpresa({ anio, hoy, activos }: { anio: number; hoy: string; activos: Persona[] }) {
  const ids = activos.map((p) => p.id);
  const [dias, params, horarios, contratos] = await Promise.all([
    calendarioEntre(`${anio}-01-01`, `${anio}-12-31`),
    parametrosAnio(anio),
    horariosVigentes(ids, hoy),
    contratosVigentes(ids, hoy),
  ]);
  const festivos = new Set(dias.filter((d) => d.tipo === "festivo").map((d) => d.fecha));
  const cierres = dias.filter((d) => d.tipo === "cierre_obligatorio" && !esFinde(d.fecha)).length;
  const p = { jornadaAnual: params?.jornadaAnual ?? null, diasVacaciones: params?.diasVacaciones ?? 22 };

  const filas = activos
    .map((per) => {
      const hor = horarios.get(per.id);
      const inicio = contratos.get(per.id)?.desde ?? hor?.desde ?? null;
      return { per, hor, calc: hor ? calcularAnio(anio, hor, festivos, p, inicio) : null };
    })
    .sort((a, b) => Number(!!b.calc) - Number(!!a.calc) || a.per.nombre.localeCompare(b.per.nombre, "es"));

  return (
    <section id="calendario" className="mt-10 scroll-mt-24">
      <Titulo
        extra={
          <span className="inline-flex items-center gap-2">
            <Link href={`/rrhh?anio=${anio - 1}#calendario`} className="rounded-full border border-black/10 bg-white px-2.5 py-0.5 hover:border-lima">← {anio - 1}</Link>
            <Link href={`/rrhh?anio=${anio + 1}#calendario`} className="rounded-full border border-black/10 bg-white px-2.5 py-0.5 hover:border-lima">{anio + 1} →</Link>
          </span>
        }
      >
        Calendario de la empresa {anio}
      </Titulo>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        {/* ---------- los dias ---------- */}
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-carbon">Festivos, cierres y turnos</h3>
          {dias.length === 0 ? (
            <p className="mt-2 text-sm text-carbon/50">Todavía no hay ningún día puesto para {anio}.</p>
          ) : (
            <ul className="mt-2 divide-y divide-black/5 text-sm">
              {dias.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                  <span>
                    <b className="font-semibold capitalize">{larga(d.fecha)}</b>
                    {d.descripcion && <span className="text-carbon/55"> · {d.descripcion}</span>}
                    {esFinde(d.fecha) && <span className="text-xs text-carbon/40"> · cae en fin de semana: no cuenta</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${CHIP[d.tipo]}`}>{TIPO_DIA[d.tipo]}</span>
                    <form action={borrarDiaCalendario}>
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="anio" value={anio} />
                      <button type="submit" className="text-xs text-carbon/40 hover:text-alerta hover:underline">Quitar</button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form action={guardarDiaCalendario} className="mt-3 grid gap-2 rounded-xl bg-hueso p-3 sm:grid-cols-[auto_auto_1fr_auto] sm:items-end">
            <input type="hidden" name="anio" value={anio} />
            <label className="grid gap-1 text-xs font-semibold text-carbon/55">
              Fecha
              <input type="date" name="fecha" required min={`${anio}-01-01`} max={`${anio}-12-31`} className={campo} />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-carbon/55">
              Qué es
              <select name="tipo" defaultValue="festivo" className={campo}>
                <option value="festivo">Festivo</option>
                <option value="cierre_obligatorio">Cierre de oficina</option>
                <option value="turno">Turno a elegir</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold text-carbon/55">
              Nombre (opcional)
              <input name="descripcion" placeholder="Fiesta Nacional, San Isidro, puente…" className={campo} />
            </label>
            <BotonEnviar pendiente="Guardando…" className="rounded-full bg-lima px-4 py-2 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white">
              Añadir
            </BotonEnviar>
          </form>
          <p className="mt-2 text-xs text-carbon/50">
            Festivo: no se trabaja y no cuenta. Cierre de oficina: tampoco se trabaja, pero se descuenta de las vacaciones de todos.
            Turno: una opción (Semana Santa o mayo, por ejemplo); quien lo elige, lo pide como vacaciones.
          </p>
        </div>

        {/* ---------- el año ---------- */}
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-carbon">El año laboral</h3>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm tabular-nums">
            <dt className="text-carbon/45">Jornada del convenio</dt>
            <dd>{p.jornadaAnual != null ? <b>{h(p.jornadaAnual)} al año</b> : <span className="rounded-md bg-[#f6e9e8] px-1.5 py-0.5 text-xs font-semibold text-alerta">falta</span>}</dd>
            <dt className="text-carbon/45">Vacaciones</dt>
            <dd>{p.diasVacaciones} días laborables</dd>
            <dt className="text-carbon/45">Festivos entre semana</dt>
            <dd>{dias.filter((d) => d.tipo === "festivo" && !esFinde(d.fecha)).length}</dd>
            <dt className="text-carbon/45">Cierres de oficina</dt>
            <dd>{cierres} (salen de las vacaciones)</dd>
          </dl>
          {params?.notas && <p className="mt-2 text-sm text-carbon/60">{params.notas}</p>}
          <details className="group mt-3">
            <summary className="cursor-pointer list-none text-sm font-semibold text-lima-dark hover:underline [&::-webkit-details-marker]:hidden">Editar</summary>
            <form action={guardarParametrosAnio} className="mt-2 grid gap-2 rounded-xl bg-hueso p-3">
              <input type="hidden" name="anio" value={anio} />
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-xs font-semibold text-carbon/55">
                  Jornada anual del convenio (h)
                  <input name="jornada" inputMode="decimal" defaultValue={p.jornadaAnual ?? ""} className={campo} />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-carbon/55">
                  Días de vacaciones
                  <input name="dias" inputMode="decimal" required defaultValue={p.diasVacaciones} className={campo} />
                </label>
              </div>
              <label className="grid gap-1 text-xs font-semibold text-carbon/55">
                Notas
                <input name="notas" defaultValue={params?.notas ?? ""} placeholder="Convenio de ingenierías, tablas de 2026…" className={campo} />
              </label>
              <div>
                <BotonEnviar pendiente="Guardando…" className="rounded-full bg-lima px-4 py-2 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white">
                  Guardar
                </BotonEnviar>
              </div>
            </form>
          </details>
        </div>
      </div>

      {/* ---------- las horas de cada uno ---------- */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
        <div className="px-5 pt-4">
          <h3 className="text-base font-bold text-carbon">Horas del año, persona a persona</h3>
          <p className="mt-1 text-sm text-carbon/55">
            Con su horario de la ficha, los días laborables del año (sin festivos) menos sus vacaciones.
            {p.jornadaAnual == null && " Pon la jornada anual del convenio para ver si le sobran o le faltan horas."}
          </p>
        </div>
        <table className="mt-2 w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-black/5 text-left text-[11px] font-bold uppercase tracking-wider text-carbon/40">
              <th className="px-4 py-2">Persona</th>
              <th className="px-4 py-2 text-right">Días laborables</th>
              <th className="px-4 py-2 text-right">Horas trabajadas</th>
              <th className="px-4 py-2 text-right">Convenio</th>
              <th className="px-4 py-2 text-right">Diferencia</th>
              <th className="px-4 py-2 text-right">Días libres</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(({ per, calc }) => (
              <tr key={per.id} className="border-b border-black/[0.04]">
                <td className="px-4 py-2">
                  <b className="font-semibold text-carbon">{nombreCompleto(per)}</b>
                  {calc && calc.desde > `${anio}-01-01` && <span className="block text-xs text-carbon/45">desde el {larga(calc.desde)}</span>}
                </td>
                {calc ? (
                  <>
                    <td className="px-4 py-2 text-right tabular-nums">{calc.diasLaborables}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{h(calc.horasEfectivas)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-carbon/60">{h(calc.jornada)}</td>
                    <td className={`px-4 py-2 text-right font-semibold tabular-nums ${calc.diferencia == null ? "" : calc.diferencia > 0 ? "text-lima-dark" : calc.diferencia < 0 ? "text-alerta" : ""}`}>
                      {calc.diferencia == null ? "—" : `${calc.diferencia > 0 ? "+" : ""}${h(calc.diferencia)}`}
                    </td>
                    <td className="px-4 py-2 text-right font-bold tabular-nums">{calc.diasLibres != null ? `${calc.diasLibres.toLocaleString("es-ES")}` : "—"}</td>
                  </>
                ) : (
                  <td className="px-4 py-2 text-sm text-carbon/40" colSpan={5}>
                    Sin horario en su ficha: no se puede calcular.
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-5 py-3 text-xs text-carbon/50">
          En verde, trabaja más horas de las del convenio y le corresponden esos días libres; en rojo, le faltan horas. La
          comida se descuenta solo en los días de jornada partida (los que acaban después de las 16:00). El horario de verano
          (jornada intensiva) aún no entra en este cálculo.
        </p>
      </div>
    </section>
  );
}
