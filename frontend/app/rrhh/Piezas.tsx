import type { ReactNode } from "react";
import { diasEntre, esFinde, TIPO_AUSENCIA, type Ausencia, type DiaCalendario, type Persona } from "../../lib/rrhh";
import { nombreCompleto } from "../../lib/rrhh";

// Piezas comunes del area de RRHH.

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const partes = (s: string) => ({ d: Number(s.slice(8, 10)), m: Number(s.slice(5, 7)) - 1, a: Number(s.slice(0, 4)) });

/** "5 – 9 oct", "28 sep – 2 oct", "24 sep". */
export function tramo(desde: string, hasta: string): string {
  const a = partes(desde);
  const b = partes(hasta);
  if (desde === hasta) return `${a.d} ${MES[a.m]}`;
  if (a.m === b.m && a.a === b.a) return `${a.d} – ${b.d} ${MES[a.m]}`;
  return `${a.d} ${MES[a.m]} – ${b.d} ${MES[b.m]}`;
}

export const fechaLarga = (s: string) => {
  const p = partes(s);
  return `${p.d} de ${MES_LARGO[p.m]} de ${p.a}`;
};

// useGrouping "always": sin el, en español 9800 sale sin punto de miles.
export const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", useGrouping: "always" });

export const diasTxt = (n: number | null) => (n == null ? "—" : `${n} ${n === 1 ? "día" : "días"}`);

export function Titulo({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
      <h2 className="text-xl font-bold text-carbon">{children}</h2>
      {extra && <div className="text-sm text-carbon/50">{extra}</div>}
    </div>
  );
}

export function Cuenta({ n }: { n: number }) {
  return <span className="ml-1.5 rounded-full bg-lima-soft px-2.5 py-0.5 align-middle text-sm font-semibold text-lima-dark">{n}</span>;
}

const CHIP: Record<string, string> = {
  vacaciones: "bg-lima-soft text-lima-dark",
  permiso_retribuido: "bg-ajeno-soft text-ajeno",
  ausencia_justificada: "bg-ajeno-soft text-ajeno",
  baja_medica: "bg-[#f6e9e8] text-alerta",
  otra: "bg-black/5 text-carbon/60",
};

export function ChipTipo({ tipo }: { tipo: Ausencia["tipo"] }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${CHIP[tipo]}`}>{TIPO_AUSENCIA[tipo]}</span>;
}

const ESTADO: Record<Ausencia["estado"], { txt: string; clase: string }> = {
  solicitada: { txt: "Pendiente", clase: "bg-amber-50 text-amber-800" },
  aprobada: { txt: "Aprobada", clase: "bg-lima-soft text-lima-dark" },
  rechazada: { txt: "Rechazada", clase: "bg-black/5 text-carbon/50" },
  anulada: { txt: "Anulada", clase: "bg-black/5 text-carbon/40" },
};

export function ChipEstado({ a, hoy }: { a: Ausencia; hoy: string }) {
  const e = ESTADO[a.estado];
  const txt = a.estado === "aprobada" && a.hasta < hoy ? "Disfrutada" : e.txt;
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${e.clase}`}>{txt}</span>;
}

export function NotaAcceso({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-dashed border-black/15 bg-white px-4 py-2.5 text-sm text-carbon/65">
      <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-carbon text-[11px] font-bold text-white">i</span>
      <span>{children}</span>
    </div>
  );
}

export function Proximamente({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-hueso/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-carbon/55">{titulo}</h3>
        <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-carbon/40">
          Próximamente
        </span>
      </div>
      <p className="mt-1 text-sm text-carbon/45">{texto}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quien esta fuera: una fila por persona y una columna por dia laborable
// ---------------------------------------------------------------------------

const BLOQUE: Record<string, string> = {
  vacaciones: "bg-lima",
  permiso_retribuido: "bg-ajeno",
  ausencia_justificada: "bg-ajeno",
  baja_medica: "bg-[#c9a2a0]",
  otra: "bg-carbon/40",
};
const PEDIDO: Record<string, string> = {
  vacaciones: "bg-lima-soft outline outline-[1.5px] -outline-offset-[1.5px] outline-dashed outline-lima-dark",
  permiso_retribuido: "bg-ajeno-soft outline outline-[1.5px] -outline-offset-[1.5px] outline-dashed outline-ajeno",
  ausencia_justificada: "bg-ajeno-soft outline outline-[1.5px] -outline-offset-[1.5px] outline-dashed outline-ajeno",
  baja_medica: "bg-[#f6e9e8]",
  otra: "bg-black/5",
};
const RAYADO = "bg-[repeating-linear-gradient(135deg,#ececea_0_4px,#f7f7f5_4px_8px)]";

export function QuienEstaFuera({
  desde,
  hasta,
  hoy,
  equipo,
  ausencias,
  calendario,
}: {
  desde: string;
  hasta: string;
  hoy: string;
  equipo: Persona[];
  ausencias: Ausencia[];
  calendario: DiaCalendario[];
}) {
  const dias = diasEntre(desde, hasta).filter((d) => !esFinde(d));
  const fuera = new Map(calendario.filter((c) => c.tipo !== "turno").map((c) => [c.fecha, c.descripcion ?? "Festivo"]));
  const semanas: { i: number; txt: string }[] = [];
  dias.forEach((d, i) => {
    if (i === 0 || new Date(d + "T12:00:00Z").getUTCDay() === 1) semanas.push({ i, txt: tramo(d, d) });
  });
  const ausentes = new Set(ausencias.map((a) => a.personaId));
  const filas = [...equipo].sort((a, b) => Number(ausentes.has(b.id)) - Number(ausentes.has(a.id)) || a.nombre.localeCompare(b.nombre, "es"));

  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white" />
              {semanas.map((s, k) => (
                <th
                  key={s.i}
                  colSpan={(semanas[k + 1]?.i ?? dias.length) - s.i}
                  className="border-l border-black/10 pl-1.5 pt-2 text-left font-bold text-carbon/60"
                >
                  Semana del {s.txt}
                </th>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 z-10 bg-white" />
              {dias.map((d) => {
                const lun = new Date(d + "T12:00:00Z").getUTCDay() === 1;
                return (
                  <th
                    key={d}
                    title={fuera.get(d)}
                    className={`h-6 min-w-6 font-semibold tabular-nums ${lun ? "border-l border-black/10" : ""} ${fuera.has(d) ? "text-carbon/60" : "text-carbon/35"} ${d === hoy ? "shadow-[inset_2px_0_0_#2b2b2b]" : ""}`}
                  >
                    {Number(d.slice(8))}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filas.map((p) => (
              <tr key={p.id}>
                <th className="sticky left-0 z-10 min-w-44 whitespace-nowrap bg-white py-0 pl-4 pr-3 text-left text-[13px] font-normal text-carbon">
                  {nombreCompleto(p)}
                </th>
                {dias.map((d) => {
                  const lun = new Date(d + "T12:00:00Z").getUTCDay() === 1;
                  const a = fuera.has(d) ? null : ausencias.find((x) => x.personaId === p.id && d >= x.desde && d <= x.hasta);
                  return (
                    <td
                      key={d}
                      className={`h-[26px] min-w-6 border-t border-black/[0.04] p-0 ${lun ? "border-l border-l-black/10" : ""} ${fuera.has(d) ? RAYADO : ""} ${d === hoy ? "shadow-[inset_2px_0_0_#2b2b2b]" : ""}`}
                    >
                      {a && (
                        <span
                          title={`${nombreCompleto(p)} · ${TIPO_AUSENCIA[a.tipo]}${a.estado === "solicitada" ? " (pedida)" : ""}`}
                          className={`mx-px block h-4 rounded ${a.estado === "solicitada" ? PEDIDO[a.tipo] : BLOQUE[a.tipo]}`}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-black/5 px-4 py-3 text-xs text-carbon/60">
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-4 rounded-sm bg-lima" />Vacaciones</span>
        <span className="inline-flex items-center gap-1.5"><i className={`inline-block h-3 w-4 rounded-sm ${PEDIDO.vacaciones}`} />Pedidas, sin aprobar</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-4 rounded-sm bg-ajeno" />Permiso o ausencia justificada</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-4 rounded-sm bg-[#c9a2a0]" />Baja</span>
        <span className="inline-flex items-center gap-1.5"><i className={`inline-block h-3 w-4 rounded-sm ${RAYADO}`} />Festivo o cierre</span>
      </div>
    </div>
  );
}
