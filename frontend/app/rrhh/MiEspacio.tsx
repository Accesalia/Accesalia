import type { Yo } from "../../lib/sesion";
import {
  ausenciasDe,
  calendarioEntre,
  horarioVigente,
  noLaborables,
  saldos,
  sumarDias,
} from "../../lib/rrhh";
import { anularSolicitud } from "./acciones";
import { PedirDias } from "./PedirDias";
import { ChipEstado, ChipTipo, diasTxt, NotaAcceso, Proximamente, tramo } from "./Piezas";

// Lo que ve CADA empleado: solo lo suyo. Tambien RRHH y direccion tienen su
// espacio (Alexandra pide vacaciones como cualquiera).

export async function MiEspacio({ yo, hoy }: { yo: Yo; hoy: string }) {
  const anio = Number(hoy.slice(0, 4));
  const [saldoMapa, mias, horario, cal] = await Promise.all([
    saldos(anio, [yo.id]),
    ausenciasDe(yo.id),
    horarioVigente(yo.id, hoy),
    calendarioEntre(hoy, sumarDias(hoy, 550)),
  ]);
  const saldo = saldoMapa.get(yo.id)!;
  const fuera = Object.fromEntries(noLaborables(cal));
  const pct = (n: number) => (saldo.total > 0 ? `${Math.max(0, (n / saldo.total) * 100)}%` : "0%");
  const usados = saldo.disfrutados + saldo.cierres;

  return (
    <>
      <NotaAcceso>
        <b>Quién ve esto:</b> tú. Tus días, tus solicitudes y tu horario no los ve ningún compañero; solo RRHH y dirección.
      </NotaAcceso>

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-carbon/45">Tus vacaciones de {anio}</div>
          {saldo.cargado ? (
            <>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-6xl font-extrabold leading-none tracking-tight tabular-nums text-carbon">{saldo.quedan}</span>
                <span className="text-xl font-semibold text-carbon/60">{saldo.quedan === 1 ? "día te queda" : "días te quedan"}</span>
              </div>
              <div className="mt-5 flex h-3.5 overflow-hidden rounded-full bg-black/5" aria-hidden>
                <i className="block h-full bg-carbon-soft" style={{ width: pct(usados) }} />
                <i className="block h-full bg-lima-soft outline-dashed outline-[1.5px] -outline-offset-[1.5px] outline-lima-dark" style={{ width: pct(saldo.pedidos) }} />
                <i className="block h-full bg-lima" style={{ width: pct(saldo.quedan) }} />
              </div>
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-carbon/60 tabular-nums">
                <span>{saldo.disfrutados} aprobados</span>
                {saldo.cierres > 0 && <span>{saldo.cierres} de cierre de oficina</span>}
                <span>{saldo.pedidos} pedidos, sin aprobar</span>
                <span className="text-carbon/45">
                  de {saldo.total}: {saldo.derecho} del año{saldo.arrastrados > 0 ? ` + ${saldo.arrastrados} que traes de ${anio - 1}` : ""}
                </span>
              </div>
            </>
          ) : (
            <p className="mt-2 text-base text-carbon/60">Tus días de {anio} aún no están cargados. En cuanto RRHH los ponga, verás aquí cuántos te quedan.</p>
          )}

          <div className="mt-6 border-t border-black/5 pt-5">
            <h3 className="text-base font-bold text-carbon">Pedir días</h3>
            <PedirDias hoy={hoy} fuera={fuera} quedan={saldo.cargado ? saldo.quedan : null} />
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-carbon">Tus solicitudes</h3>
            {mias.length === 0 ? (
              <p className="mt-2 text-sm text-carbon/50">Todavía no has pedido nada desde la app.</p>
            ) : (
              <ul className="mt-2 divide-y divide-black/5">
                {mias.slice(0, 12).map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <span className="flex flex-wrap items-center gap-2">
                      <b className="font-semibold text-carbon">{tramo(a.desde, a.hasta)}</b>
                      <span className="text-carbon/50">· {diasTxt(a.dias)}</span>
                      {a.tipo !== "vacaciones" && <ChipTipo tipo={a.tipo} />}
                    </span>
                    <span className="flex items-center gap-2">
                      <ChipEstado a={a} hoy={hoy} />
                      {a.estado === "solicitada" && (
                        <form action={anularSolicitud}>
                          <input type="hidden" name="id" value={a.id} />
                          <button type="submit" className="text-xs font-semibold text-carbon/50 underline-offset-2 hover:text-carbon hover:underline">
                            Retirarla
                          </button>
                        </form>
                      )}
                    </span>
                    {a.estado === "rechazada" && a.motivoRechazo && (
                      <span className="w-full text-xs text-carbon/55">Motivo: {a.motivoRechazo}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-carbon">Tu horario</h3>
            {horario ? (
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm tabular-nums">
                {(
                  [
                    ["Lunes", horario.lunes],
                    ["Martes", horario.martes],
                    ["Miércoles", horario.miercoles],
                    ["Jueves", horario.jueves],
                    ["Viernes", horario.viernes],
                  ] as const
                ).map(([d, h]) => (
                  <div key={d} className="contents">
                    <dt className="text-carbon/45">{d}</dt>
                    <dd>{h ?? "—"}</dd>
                  </div>
                ))}
                {horario.tiempoComida && (
                  <>
                    <dt className="text-carbon/45">Comida</dt>
                    <dd>{horario.tiempoComida}</dd>
                  </>
                )}
                {horario.horasSemana != null && (
                  <>
                    <dt className="text-carbon/45">Semana</dt>
                    <dd className="font-bold">{horario.horasSemana} h</dd>
                  </>
                )}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-carbon/50">RRHH aún no ha puesto tu horario en la app.</p>
            )}
          </div>

          <Proximamente titulo="Tus nóminas" texto="Te aparecerán aquí cada mes, sin correos." />
          <Proximamente titulo="Tus documentos" texto="Contrato, DNI, titulación, IRPF, y el convenio y el calendario de todos." />
        </div>
      </div>
    </>
  );
}
