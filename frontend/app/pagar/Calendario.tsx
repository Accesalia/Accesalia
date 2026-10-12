import { EMPRESA_LABEL, EMPRESAS, LIBRO_LABEL, type Empresa, type LibroFiscal, type Pago } from "../../lib/fiscalTextos";
import { Cifra, eur, REJILLA, Seccion } from "../negocio/Piezas";

// LAS PIEZAS DEL CALENDARIO FISCAL (pantalla PAGAR, 12-oct-2026): lo que viene
// con su semaforo, las cifras de los proximos 30 dias y el ano mes a mes.

export const hoyMadrid = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const DIA = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const dia = (iso: string) => DIA.format(new Date(iso + "T00:00:00Z"));
const MES_LARGO = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
const mesLargo = (m: string) => {
  const t = MES_LARGO.format(new Date(m + "-01T00:00:00Z"));
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const dias = (de: string, a: string) => Math.round((Date.parse(a) - Date.parse(de)) / 86400000);
const sumar = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);
const euros = (n: number) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " €";

/** El semaforo de lo pendiente, por los dias que faltan hasta tenerlo hecho. */
function semaforo(p: Pago, hoy: string) {
  const d = dias(hoy, p.vigilar);
  if (d < 0) return { punto: "bg-alerta", texto: "text-alerta", cuando: dias(hoy, p.fecha) < 0 ? "se pasó" : "ya no da para domiciliar" };
  if (d <= 7) return { punto: "bg-amber-500", texto: "text-amber-800", cuando: d === 0 ? "hoy" : d === 1 ? "mañana" : `en ${d} días` };
  if (d <= 30) return { punto: "bg-amber-300", texto: "text-amber-900/80", cuando: `en ${d} días` };
  return { punto: "bg-carbon/20", texto: "text-carbon/65", cuando: `en ${d} días` };
}

function ChipEmpresa({ e }: { e: Empresa }) {
  const color = e === "daniel_autonomo" ? "bg-ajeno-soft text-carbon" : "bg-lima-soft text-lima-dark";
  return <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${color}`}>{EMPRESA_LABEL[e]}</span>;
}

function Importe({ p }: { p: Pago }) {
  if (p.sinCargo) return <span className="text-carbon/65">sin cargo</span>;
  if (p.importe == null) return <span className="text-amber-700/80">importe por saber</span>;
  return <span className="font-semibold tabular-nums text-carbon">{euros(p.importe)}{p.estimado ? " (estimado)" : ""}</span>;
}

function Proximos({ pagos, hoy }: { pagos: Pago[]; hoy: string }) {
  if (!pagos.length) return <p className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-carbon/70">Nada pendiente en los próximos 45 días.</p>;
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
      {pagos.map((p) => {
        const s = semaforo(p, hoy);
        return (
          <div key={p.clave} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-black/5 px-4 py-2.5 last:border-0">
            <span className={`h-3 w-3 shrink-0 rounded-full ${s.punto}`} />
            <div className="w-64 shrink-0">
              <div className="font-semibold text-carbon">{dia(p.fecha)}</div>
              <div className={`text-[12.5px] ${s.texto}`}>
                {p.vigilar !== p.fecha ? `domiciliar hasta el ${dia(p.vigilar)} · ` : ""}
                {s.cuando}
              </div>
            </div>
            <ChipEmpresa e={p.empresa} />
            <div className="min-w-[16rem] flex-1">
              <span className="font-semibold text-carbon">{p.modelo !== p.nombre && /^\d+$/.test(p.modelo) ? `${p.modelo} · ` : ""}{p.nombre}</span>
              <span className="text-carbon/70"> · {p.periodo}{p.plazo ? ` · ${p.plazo}` : ""}</span>
            </div>
            <div className="w-44 shrink-0 text-right">
              <Importe p={p} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Anio({ pagos, hoy }: { pagos: Pago[]; hoy: string }) {
  const meses = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)) - 1 + i, 1));
    return d.toISOString().slice(0, 7);
  });
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {meses.map((m) => {
        const del = pagos.filter((p) => p.fecha.startsWith(m) && p.estado !== "fraccionado");
        const conocido = del.filter((p) => !p.sinCargo && p.importe != null).reduce((s, p) => s + (p.importe ?? 0), 0);
        return (
          <div key={m} className="rounded-2xl border border-black/10 bg-white p-3 shadow-sm">
            <div className="flex items-baseline justify-between gap-2 border-b border-black/5 pb-1.5">
              <div className="font-bold text-carbon">{mesLargo(m)}</div>
              {conocido > 0 && <div className="text-[12.5px] tabular-nums text-carbon/70">{eur(conocido)} conocido</div>}
            </div>
            {!del.length && <p className="pt-2 text-[12.5px] text-carbon/65">Nada.</p>}
            <ul className="pt-1">
              {del.map((p) => (
                <li key={p.clave} className="flex items-baseline gap-2 py-0.5 text-[12.5px]">
                  <span className="w-7 shrink-0 tabular-nums text-carbon/65">{p.fecha.slice(8, 10)}</span>
                  <span className={`flex-1 ${p.estado === "hecho" ? "text-carbon/55 line-through decoration-carbon/30" : "text-carbon"}`}>
                    {p.modelo === "SS" || p.modelo === "RETA" || p.modelo === "IVTM" || p.modelo === "CUENTAS" ? p.nombre : p.modelo}{" "}
                    <span className="text-carbon/65">
                      {p.empresa === "daniel_autonomo" ? "Daniel" : EMPRESA_LABEL[p.empresa]} · {p.periodo}
                      {p.plazo ? ` · ${p.plazo}` : ""}
                    </span>
                  </span>
                  {p.estado === "hecho" ? (
                    <span className="shrink-0 font-semibold text-lima-dark">✓</span>
                  ) : p.importe != null && !p.sinCargo ? (
                    <span className="shrink-0 tabular-nums text-carbon/80">{eur(p.importe)}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/** Los impuestos de un libro: lo que viene, sus cifras y el ano mes a mes. */
export function ImpuestosLibro({ libro, pagos, hoy }: { libro: LibroFiscal; pagos: Pago[]; hoy: string }) {
  const pendientes = pagos.filter((p) => p.estado === "pendiente");
  const proximos = pendientes.filter((p) => p.fecha <= sumar(hoy, 45));
  const treinta = pendientes.filter((p) => p.fecha <= sumar(hoy, 30) && !p.sinCargo);
  const suma = (lista: Pago[]) => lista.reduce((s, p) => s + (p.importe ?? 0), 0);
  const sinImporte = treinta.filter((p) => p.importe == null).length;
  const empresas = EMPRESAS[libro];
  return (
    <>
      <Seccion titulo={`Impuestos · ${LIBRO_LABEL[libro]}`} sub="Lo pendiente de los próximos 45 días y lo que se ha pasado sin hacer. El punto: rojo, se pasó; naranja, esta semana; crema, este mes.">
        <Proximos pagos={proximos} hoy={hoy} />
        <div className={REJILLA + " mt-3"}>
          {empresas.length > 1 && (
            <Cifra titulo="Próximos 30 días · juntas" valor={eur(suma(treinta))} nota={sinImporte ? `y ${sinImporte} con el importe por saber` : "todo con importe"} />
          )}
          {empresas.map((e) => {
            const de = treinta.filter((p) => p.empresa === e);
            const n = de.filter((p) => p.importe == null).length;
            return <Cifra key={e} titulo={`Próximos 30 días · ${EMPRESA_LABEL[e]}`} valor={eur(suma(de))} nota={n ? `y ${n} con el importe por saber` : "todo con importe"} />;
          })}
        </div>
      </Seccion>
      <Seccion titulo="El año, mes a mes" sub="Los próximos doce meses. Tachado, ya hecho. Lo fraccionado, plazo a plazo en su mes.">
        <Anio pagos={pagos} hoy={hoy} />
      </Seccion>
    </>
  );
}

