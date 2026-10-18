import { EMPRESA_LABEL, type Empresa, type Obligacion, type Pago } from "../../lib/fiscalTextos";

// PAGAR › IMPUESTOS, rehecha (Monica, 17-oct-2026): «se ve que esta todo, pero
// cuesta la misma vida saber que pone, es mucho ruido, todo es igual... todo es
// exageradamente grande y griton». Cada empresa por separado (juntas solo para
// la caja de un dia). Dos columnas:
//   - IZQUIERDA, una tarjeta por impuesto: que es en cristiano, cuando se paga,
//     y fecha a fecha lo previsto, lo real cuando se paga y la desviacion
//     («para saber que rango debemos considerar la proxima vez»);
//   - DERECHA, el calendario de pagos mes a mes: pasado en gris, este mes en
//     burdeos, lo que viene en azul.
// Solo impuestos: la Seguridad Social y la cuota de autonomo van a «La caja del mes».
// TABLAS A SU CONTENIDO (regla 8 de la guia, 18-oct-2026): nada estirado al ancho.

export const hoyMadrid = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const fecha = (iso: string) => new Date(iso + "T00:00:00Z");
const DIA_MES = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });
const DIA_SEM = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", timeZone: "UTC" });
const MES = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
const diaMes = (iso: string) => DIA_MES.format(fecha(iso)).replace(".", "");
const mayus = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const EUR0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" });
const sumar = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);
const mesMas = (iso: string, n: number) => new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1 + n, 1)).toISOString().slice(0, 7);

const NO_ES_IMPUESTO = ["SS", "RETA"];
const CORTA: Record<Empresa, string> = { accesalia: "Acc.", daniel_autonomo: "Dan.", ecobalance: "Eco." };
const periodoCorto = (p: Pago) => p.periodo.replace(/^(\d)T-\d{4}$/, "$1T").replace(/^(\d)P-\d{4}$/, "$1.º pago").replace(/^Año /, "");
const nombreCorto = (p: Pago) =>
  ({ "303": "IVA", "111": "Retenciones", "115": "Alquiler", "202": "Sociedades (a cuenta)", "200": "Sociedades", "130": "IRPF", "100": "Renta", IVTM: "Circulación" })[p.modelo] ?? p.nombre;

/** Lo que va a salir: lo real si ya se sabe; si no, lo previsto. */
const cifra = (p: Pago) => p.real ?? p.previsto;

// --------------------------------------------------------------- las tarjetas

function Tarjeta({ o, pagos, hoy, conEmpresa }: { o: Obligacion; pagos: Pago[]; hoy: string; conEmpresa: boolean }) {
  // LA TABLA GIRADA (Monica, 18-oct-2026: «mucho ruido visual»): los periodos en
  // columnas y debajo Fecha, Previsto, Real y Desviacion, cada fila con su nombre
  // una sola vez. Sin la linea «Se paga:», que repetia la fila Fecha.
  const filas = pagos.filter((p) => !p.plazo);
  const desv = (p: Pago) => (p.real != null && p.previsto != null ? p.real - p.previsto : null);
  const gris = (p: Pago) => (p.fecha < hoy ? "text-carbon/45" : "");
  const etiqueta = "py-1 pr-2 text-left text-[10.5px] font-semibold uppercase tracking-wide text-carbon/45";
  return (
    <section className="w-fit min-w-[480px] max-w-[600px] break-inside-avoid rounded-xl border border-black/10 bg-white px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[14.5px] font-bold text-carbon">
          {o.nombre} <span className="font-normal text-carbon/55">· modelo {o.modelo}</span>
        </h3>
        {conEmpresa && <span className="text-[12px] text-carbon/60">{o.empresa === "daniel_autonomo" ? "Daniel" : EMPRESA_LABEL[o.empresa]}</span>}
      </div>
      {/* La explicacion se ajusta al ancho de la tabla (Monica, 18-oct: «si tiene que ir en 3 lineas en vez de dos, cual es el problema»). */}
      {o.explicacion && <p className="mt-0.5 w-0 min-w-full text-[12px] leading-snug text-carbon/60">{o.explicacion}</p>}
      {filas.length > 0 && (
        <table className="mt-2 w-auto border-collapse whitespace-nowrap text-[12.5px] tabular-nums [&_td]:pl-5 [&_td]:text-right">
          <thead>
            <tr className="border-b border-black/[.07]">
              <th />
              {filas.map((p) => (
                <th key={p.clave} className={`pb-1 pl-5 text-right text-[12.5px] font-bold ${p.fecha < hoy ? "text-carbon/45" : "text-carbon"}`}>
                  {periodoCorto(p)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr+tr]:border-t [&_tr+tr]:border-black/15">
            <tr>
              <th className={etiqueta}>Fecha</th>
              {filas.map((p) => (
                <td key={p.clave} className={`py-1 ${gris(p)}`}>{diaMes(p.fecha)}</td>
              ))}
            </tr>
            <tr>
              <th className={etiqueta}>Previsto</th>
              {filas.map((p) => (
                <td key={p.clave} className={`py-1 ${p.fecha < hoy ? "text-carbon/45" : "font-semibold text-carbon"}`}>
                  {p.previsto != null ? EUR.format(p.previsto) : <span className="font-normal text-carbon/45">por saber</span>}
                </td>
              ))}
            </tr>
            <tr>
              <th className={etiqueta}>Real</th>
              {filas.map((p) => (
                <td key={p.clave} className={`py-1 ${gris(p)}`}>
                  {p.estado === "fraccionado" ? <span className="text-carbon/60">aplazado</span> : p.real != null ? EUR.format(p.real) : p.estado === "hecho" ? <span className="text-carbon/50">pagado</span> : ""}
                </td>
              ))}
            </tr>
            <tr>
              <th className={etiqueta}>Desviación</th>
              {filas.map((p) => {
                const d = desv(p);
                return (
                  <td key={p.clave} className={`py-1 ${d == null ? "" : d > 0 ? "text-[#8e2f2d]" : "text-[#3f7a1c]"}`}>
                    {d == null ? "" : `${d > 0 ? "+" : ""}${EUR.format(d)}`}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      )}
    </section>
  );
}

// --------------------------------------------------------------- el calendario

function Calendario({ pagos, hoy, empresas }: { pagos: Pago[]; hoy: string; empresas: Empresa[] }) {
  const mesHoy = hoy.slice(0, 7);
  const meses = Array.from({ length: 13 }, (_, i) => mesMas(hoy, i - 1));
  const varias = empresas.length > 1;
  return (
    <div className="w-[460px] shrink-0 rounded-xl border border-black/10 bg-white px-6 py-5">
      <h3 className="text-[15.25px] font-bold text-carbon">Calendario de pagos</h3>
      <p className="mb-2.5 text-[12.6px] text-carbon/60">
        <span className="text-carbon/45">gris</span>, ya pasado · <span className="text-[#8e2f2d]">burdeos</span>, este mes · <span className="text-[#3b5f86]">azul</span>, lo que viene. ≈ previsto; sin ≈, ya validado.
      </p>
      {meses.map((m) => {
        const del = pagos.filter((p) => p.fecha.startsWith(m));
        if (!del.length) return null;
        const color = m < mesHoy ? "text-carbon/45" : m === mesHoy ? "text-[#8e2f2d]" : "text-[#3b5f86]";
        const total = (lista: Pago[]) => lista.reduce((s, p) => s + (cifra(p) ?? 0), 0);
        const faltan = del.filter((p) => cifra(p) == null).length;
        return (
          <div key={m} className={`border-t border-black/10 py-3 ${color}`}>
            <div className="flex items-baseline justify-between gap-3">
              <b className="text-[13.65px]">{mayus(MES.format(fecha(m + "-01")))}</b>
              <span className="text-[13.1px] font-semibold tabular-nums">
                {varias &&
                  empresas.map((e) => {
                    const de = del.filter((p) => p.empresa === e);
                    return de.length ? <span key={e} className="mr-3 font-normal">{CORTA[e]} {EUR0.format(total(de))} €</span> : null;
                  })}
                {EUR0.format(total(del))} €{faltan ? " + ?" : ""}
              </span>
            </div>
            <ul className="mt-1">
              {del.map((p) => (
                <li key={p.clave} className="flex items-baseline gap-2 text-[13.1px] leading-[1.45] tabular-nums">
                  <span className="w-[52px] shrink-0">{diaMes(p.fecha)}</span>
                  <span className="min-w-0 flex-1">
                    {p.estado === "hecho" ? "✓ " : ""}
                    {nombreCorto(p)} {periodoCorto(p)}
                    {p.plazo ? ` · ${p.plazo}` : ""}
                    {varias ? <span className="opacity-70"> · {CORTA[p.empresa]}</span> : null}
                  </span>
                  <span className="shrink-0">{cifra(p) == null ? "?" : `${p.real == null && !p.plazo ? "≈ " : ""}${EUR.format(cifra(p)!)}`}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// --------------------------------------------------------------- la pantalla

export function Impuestos({ pagos, obligaciones, empresas, hoy }: { pagos: Pago[]; obligaciones: Obligacion[]; empresas: Empresa[]; hoy: string }) {
  const deEmpresas = pagos.filter((p) => empresas.includes(p.empresa) && !NO_ES_IMPUESTO.includes(p.modelo));
  // Lo que sale de la cuenta: lo que se paga (no lo que solo se presenta) y lo
  // fraccionado plazo a plazo (el vencimiento aplazado no, que ya va en sus plazos).
  const salen = deEmpresas.filter((p) => !p.sinCargo && p.estado !== "fraccionado");
  // Las tarjetas: los impuestos que se pagan, con lo del ultimo trimestre y el año que viene.
  const ventana = deEmpresas.filter((p) => p.fecha >= sumar(hoy, -100) && p.fecha <= sumar(hoy, 365));
  const conPago = obligaciones
    .filter((o) => empresas.includes(o.empresa) && o.domiciliado && !NO_ES_IMPUESTO.includes(o.modelo))
    .map((o) => ({ o, pagos: ventana.filter((p) => p.obligacion === o.id) }))
    .filter((x) => x.pagos.length)
    .sort((a, b) => a.o.empresa.localeCompare(b.o.empresa) || a.pagos[0].fecha.localeCompare(b.pagos[0].fecha));
  const soloSePresentan = obligaciones.filter((o) => empresas.includes(o.empresa) && !o.domiciliado);
  const presentar = ventana.filter((p) => p.sinCargo && p.fecha >= hoy);

  // El unico aviso de arriba: si hay algo que domiciliar en los proximos 10 dias (o se paso).
  const domiciliar = salen.filter((p) => p.estado === "pendiente" && p.vigilar !== p.fecha && p.vigilar <= sumar(hoy, 10) && p.fecha >= hoy);
  const limite = domiciliar.map((p) => p.vigilar).sort()[0];

  return (
    <>
      {limite && (
        <p className={`mb-4 text-[13.5px] ${limite < hoy ? "text-[#8e2f2d]" : "text-carbon/80"}`}>
          <b>Para domiciliar:</b> {domiciliar.length} pago{domiciliar.length === 1 ? "" : "s"} del {diaMes(domiciliar[0].fecha)} tenían que estar domiciliados {limite < hoy ? `el ${DIA_SEM.format(fecha(limite))}, y ya pasó: hablar con GMA` : `antes del ${DIA_SEM.format(fecha(limite))}`}.
        </p>
      )}
      <div className="flex flex-wrap items-start gap-5">
        <div className="flex flex-col gap-3">
          {conPago.map(({ o, pagos: ps }) => (
            <Tarjeta key={o.id} o={o} pagos={ps} hoy={hoy} conEmpresa={empresas.length > 1} />
          ))}
          {/* SOLO SE PRESENTAN (Monica, 18-oct: «cada cosa su linea, desglosadas y
              explicadas»): una fila por modelo, que es y cuando toca presentarlo. */}
          {soloSePresentan.length > 0 && (
            <section className="w-[480px] max-w-full rounded-xl border border-black/10 bg-white px-4 py-3">
              <h3 className="text-[14.5px] font-bold text-carbon">Solo se presentan, no se pagan</h3>
              <table className="mt-1.5 w-full border-collapse text-[12.5px] tabular-nums">
                <tbody className="[&_tr+tr]:border-t [&_tr+tr]:border-black/15">
                  {soloSePresentan.map((o) => {
                    const prox = presentar.filter((p) => p.obligacion === o.id).map((p) => p.fecha).sort()[0];
                    const texto = (o.explicacion ?? "").replace(/\s*Solo se presenta: no se paga\.?$/, "");
                    return (
                      <tr key={o.id} className="align-baseline">
                        <td className="whitespace-nowrap py-1.5 pr-3 font-bold text-carbon">{o.modelo}</td>
                        <td className="py-1.5 pr-4">
                          <span className="font-semibold text-carbon">{o.nombre}</span>
                          {empresas.length > 1 && <span className="text-carbon/50"> · {o.empresa === "daniel_autonomo" ? "Daniel" : EMPRESA_LABEL[o.empresa]}</span>}
                          {texto && texto !== o.nombre && texto !== `${o.nombre}.` && <span className="block text-[12px] leading-snug text-carbon/60">{texto}</span>}
                        </td>
                        <td className="whitespace-nowrap py-1.5 text-right text-carbon/80">{prox ? diaMes(prox) : <span className="text-carbon/40">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}
          {!conPago.length && <p className="text-carbon/65">No hay impuestos con pago en este libro.</p>}
        </div>
        <Calendario pagos={salen} hoy={hoy} empresas={empresas} />
      </div>
    </>
  );
}
