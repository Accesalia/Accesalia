import Link from "next/link";
import { EMPRESA_LABEL, type Empresa, type Pago } from "../../lib/fiscalTextos";

// PAGAR › IMPUESTOS (Monica, 16-oct-2026), la pantalla de la maqueta validada
// (docs/figma/area-dinero-v1.html, marco 5): "¿que me toca pagar y cuando?".
// Arriba, en negro, esta semana; debajo tres columnas (esta semana, el resto del
// mes y el mes que viene) y el ano en una tabla de meses por empresa.
// Todo sale del calendario fiscal (lib/fiscal.ts). Donde no hay importe, «por
// saber»: no se estima nada que no este en la base.

export const hoyMadrid = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

const DIA_SEM = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const DIA_LARGO = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const SEMANA = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", timeZone: "UTC" });
const MES = new Intl.DateTimeFormat("es-ES", { month: "long", timeZone: "UTC" });
const MES_ANIO = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
const fecha = (iso: string) => new Date(iso + "T00:00:00Z");
const mayus = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const diaSem = (iso: string) => DIA_SEM.format(fecha(iso)).replace(",", "");
const sumar = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);
const dias = (de: string, a: string) => Math.round((Date.parse(a) - Date.parse(de)) / 86400000);
const mesMas = (iso: string, n: number) => {
  const d = new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};
const EUR0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" });
const EUR2 = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });

// Los nombres cortos, como en la maqueta: «303 IVA · 3T», «IVA 2T 2/6 · 5.847».
const CORTO: Record<string, string> = {
  "303": "IVA", "111": "Retenciones", "115": "Alquiler", "202": "Sociedades", "200": "Sociedades", "130": "IRPF", "100": "Renta",
  "390": "Resumen del IVA", "190": "Resumen de retenciones", "180": "Resumen del alquiler", "347": "Operaciones con terceros", "349": "Intracomunitarias",
  SS: "Seguros sociales", RETA: "Cuota de autónomo", IVTM: "Circulación de los coches", CUENTAS: "Depósito de cuentas",
};
const corto = (p: Pago) => CORTO[p.modelo] ?? p.nombre;
const esNumero = (p: Pago) => /^\d+$/.test(p.modelo);
/** «3T-2026» → «3T»; «2P-2026» → «2.º pago»; «sept 2026» → «sept»; «Año 2025» se queda. */
function periodoCorto(p: Pago) {
  const t = p.periodo.match(/^(\d)T-\d{4}$/);
  if (t) return `${t[1]}T`;
  const pg = p.periodo.match(/^(\d)P-\d{4}$/);
  if (pg) return `${pg[1]}.º pago`;
  const m = p.periodo.match(/^([a-zé]+)\.? \d{4}$/i);
  if (m) return m[1];
  return p.periodo;
}
const plazoCorto = (p: Pago) => p.plazo?.replace(/^plazo (\d+) de (\d+)$/, "$1/$2") ?? "";
/** La fila de una lista: «303 IVA · 3T», «303 IVA 2T · plazo 2 de 6», «Seguros sociales sept». */
function texto(p: Pago) {
  if (p.plazo) return `${esNumero(p) ? p.modelo + " " : ""}${corto(p)} ${periodoCorto(p)} · ${p.plazo}`;
  if (esNumero(p)) return `${p.modelo} ${corto(p)} · ${periodoCorto(p)}`;
  return `${corto(p)} ${periodoCorto(p)}`;
}
/** La pastilla de la tabla del ano: «303 · ?», «IVA 2T 2/6 · 5.847», «SS sept · ?». */
function pastilla(p: Pago) {
  const imp = p.importe != null ? EUR0.format(p.importe) : "?";
  if (p.plazo) return `${corto(p)} ${periodoCorto(p)} ${plazoCorto(p)} · ${imp}`;
  if (p.modelo === "SS") return `SS ${periodoCorto(p)} · ${imp}`;
  if (p.modelo === "RETA") return `RETA · ${imp}`;
  if (esNumero(p)) return `${p.modelo} · ${imp}`;
  return `${corto(p)} · ${imp}`;
}

const cuenta = (l: Pago[]) => l.filter((p) => !p.sinCargo && p.estado !== "fraccionado");
const sabido = (l: Pago[]) => l.reduce((s, p) => s + (p.importe ?? 0), 0);
const porSaber = (l: Pago[]) => l.filter((p) => p.importe == null).length;
const totalTexto = (l: Pago[]) => {
  const n = porSaber(l);
  const s = sabido(l);
  if (!l.length) return "";
  if (!s) return n ? "? €" : "0 €";
  return `${EUR0.format(s)} €${n ? " + ?" : ""}`;
};

function ChipEmpresa({ e, corta }: { e: Empresa; corta?: boolean }) {
  const t = corta ? { accesalia: "Acc.", daniel_autonomo: "Dan.", ecobalance: "Eco." }[e] : e === "daniel_autonomo" ? "Daniel" : EMPRESA_LABEL[e];
  const color = e === "daniel_autonomo" ? "bg-[#e2eaf3] text-[#3b5f86]" : "bg-[#e3f2d4] text-[#2f5d14]";
  return <span className={`inline-flex h-[22px] items-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-bold ${color}`}>{t}</span>;
}

function Importe({ p, hoy }: { p: Pago; hoy: string }) {
  if (p.importe == null) return <span className="text-carbon/65">por saber</span>;
  return (
    <span className={`font-bold tabular-nums ${p.fecha < hoy ? "text-alerta" : "text-carbon"}`}>
      {EUR2.format(p.importe)}
      {p.estimado ? <span className="font-normal text-carbon/65"> estimado</span> : null}
    </span>
  );
}

const PANEL = "overflow-hidden rounded-[14px] border border-[#e3e6df] bg-white";
const PTIT = "flex items-center justify-between gap-3 border-b border-[#eef0eb] px-5 py-4";
const PUNTO = { rojo: "bg-[#c0443f]", ambar: "bg-[#e8a317]", crema: "bg-[#f2d27a]", gris: "bg-[#cfd3cb]" };

function Columna({ titulo, punto, total, pagos, hoy, conDia, vacio }: {
  titulo: string; punto: keyof typeof PUNTO; total: string; pagos: Pago[]; hoy: string; conDia?: boolean; vacio: string;
}) {
  return (
    <div className={PANEL}>
      <div className={PTIT}>
        <b className="flex items-center text-[16px] text-carbon"><span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${PUNTO[punto]}`} />{titulo}</b>
        <span className="font-bold tabular-nums">{total}</span>
      </div>
      {!pagos.length && <p className="px-5 py-4 text-carbon/65">{vacio}</p>}
      <table className="w-full border-collapse text-[14px]">
        <tbody>
          {pagos.map((p) => (
            <tr key={p.clave} className="border-b border-[#f0f2ee] last:border-0">
              <td className="px-3.5 py-3 align-top">
                {(conDia || p.fecha < hoy) && <span className={p.fecha < hoy ? "font-bold text-alerta" : ""}>{diaSem(p.fecha)} · </span>}
                {texto(p)}
                {p.fecha < hoy && <span className="text-[12.5px] text-alerta"> · se pasó</span>}
              </td>
              <td className="px-2 py-3 align-top"><ChipEmpresa e={p.empresa} corta={conDia} /></td>
              <td className="whitespace-nowrap px-3.5 py-3 text-right align-top"><Importe p={p} hoy={hoy} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** «cierre del 3.er trimestre + plazos de aplazamientos»: de que va el dia. */
function deQueVa(l: Pago[]) {
  const partes: string[] = [];
  const t = l.find((p) => !p.plazo && /^\dT-/.test(p.periodo));
  if (t) partes.push(`cierre del ${t.periodo[0]}.${["", "er", "º", "er", "º"][Number(t.periodo[0])] ?? "º"} trimestre`);
  if (l.some((p) => p.plazo)) partes.push("plazos de aplazamientos");
  if (!partes.length) partes.push([...new Set(l.map(corto))].slice(0, 3).join(", ").toLowerCase());
  return partes.join(" + ");
}

function FranjaSemana({ semana, hoy }: { semana: Pago[]; hoy: string }) {
  const proximos = semana.filter((p) => p.fecha >= hoy);
  const dia = (proximos[0] ?? semana[0])?.fecha;
  const delDia = semana.filter((p) => p.fecha === dia);
  const domiciliar = semana.filter((p) => p.vigilar !== p.fecha).map((p) => p.vigilar).sort()[0];
  const quedan = domiciliar ? dias(hoy, domiciliar) : null;
  const n = porSaber(semana);
  return (
    <div className="mb-6 grid items-center gap-[30px] rounded-2xl bg-carbon px-7 py-[22px] text-white" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr" }}>
      <div>
        <div className="text-[12px] font-bold uppercase tracking-[.1em] text-[#f2c14e]">Esta semana</div>
        <div className="mt-1 text-[26px] font-[750]">{dia ? mayus(DIA_LARGO.format(fecha(dia)).replace(",", "")) : "Nada que pagar"}</div>
        <div className="mt-0.5 text-white/70">{dia ? deQueVa(delDia) : "en los próximos siete días"}</div>
      </div>
      <div>
        <div className="text-[12px] text-white/60">Pagos</div>
        <div className="text-[30px] font-[750] tabular-nums">{semana.length}</div>
      </div>
      <div>
        <div className="text-[12px] text-white/60">Ya sabido</div>
        <div className="text-[30px] font-[750] tabular-nums">{EUR0.format(sabido(semana))} €</div>
        {n > 0 && <div className="text-[12.5px] text-[#f2c14e]">+ {n} con el importe por saber</div>}
      </div>
      {domiciliar && quedan != null && quedan < 0 ? (
        <div className="rounded-xl border border-[#e9b9b6]/60 bg-[#c0443f]/25 px-4 py-3">
          <div className="text-[12px] font-bold text-[#f3b7b3]">PARA DOMICILIAR</div>
          <div className="text-[20px] font-[750]">se pasó el {SEMANA.format(fecha(domiciliar))}</div>
          <div className="text-[12.5px] text-white/75">ya no da para domiciliar · hablar con GMA</div>
        </div>
      ) : domiciliar && quedan != null ? (
        <div className="rounded-xl border border-[#f2c14e]/50 bg-[#f2c14e]/[.14] px-4 py-3">
          <div className="text-[12px] font-bold text-[#f2c14e]">PARA DOMICILIAR</div>
          <div className="text-[20px] font-[750]">antes del {SEMANA.format(fecha(domiciliar))}</div>
          <div className="text-[12.5px] text-white/70">{quedan === 0 ? "es hoy" : quedan === 1 ? "queda 1 día" : `quedan ${quedan} días`} · pedir a GMA</div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/15 px-4 py-3 text-white/70">Nada que domiciliar esta semana.</div>
      )}
    </div>
  );
}

function Celda({ pagos }: { pagos: Pago[] }) {
  const sinPago = pagos.filter((p) => p.sinCargo && p.estado !== "hecho");
  const resto = pagos.filter((p) => !(p.sinCargo && p.estado !== "hecho"));
  return (
    <div className="flex flex-wrap gap-1.5">
      {resto.map((p) => {
        const hecho = p.estado === "hecho";
        const color = hecho ? "bg-[#e3f2d4] text-[#2f5d14]" : p.importe == null ? "bg-[#fbefd0] text-[#875f07]" : "bg-[#f0f1ee] text-[#55594f]";
        return (
          <span key={p.clave} title={`${diaSem(p.fecha)} · ${p.nombre} · ${p.periodo}${p.plazo ? ` · ${p.plazo}` : ""} · ${p.estadoTexto}`} className={`inline-flex h-[22px] items-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-bold ${color}`}>
            {hecho ? "✓ " : ""}
            {hecho && p.sinCargo ? `${esNumero(p) ? p.modelo : corto(p)} presentado` : pastilla(p)}
          </span>
        );
      })}
      {sinPago.length > 0 && (
        <span title={sinPago.map((p) => p.nombre).join(" · ")} className="inline-flex h-[22px] items-center whitespace-nowrap rounded-full border border-[#d6dad2] bg-white px-2.5 text-[12px] font-bold text-[#55594f]">
          {sinPago.map((p) => (esNumero(p) ? p.modelo : corto(p))).join(" · ")} sin pago
        </span>
      )}
    </div>
  );
}

function Anio({ pagos, empresas, hoy, todo, hrefTodo }: { pagos: Pago[]; empresas: Empresa[]; hoy: string; todo: boolean; hrefTodo: string }) {
  const ultimo = pagos.reduce((m, p) => (p.fecha.slice(0, 7) > m ? p.fecha.slice(0, 7) : m), hoy.slice(0, 7));
  const meses: string[] = [];
  for (let m = mesMas(hoy, -1); m <= ultimo && (todo || meses.length < 6); m = mesMas(m + "-01", 1)) meses.push(m);
  const mesActual = hoy.slice(0, 7);
  return (
    <div className={PANEL}>
      <div className={PTIT}>
        <b className="text-[16px]">El año, mes a mes</b>
        <span className="text-[12.5px] text-carbon/65">✓ hecho · en ámbar, el importe por saber · pasa el ratón por una pastilla para ver el detalle</span>
      </div>
      <table className="w-full border-collapse text-[14px] tabular-nums">
        <thead>
          <tr>
            <th className="w-[150px] border-b border-[#e9ece5] bg-[#fafbf9] px-3.5 py-[11px] text-left text-[11.5px] font-bold uppercase tracking-[.08em] text-[#7b8077]">Mes</th>
            {empresas.map((e) => (
              <th key={e} className="border-b border-[#e9ece5] bg-[#fafbf9] px-3.5 py-[11px] text-left text-[11.5px] font-bold uppercase tracking-[.08em] text-[#7b8077]">{e === "daniel_autonomo" ? "Daniel de Soto" : EMPRESA_LABEL[e]}</th>
            ))}
            <th className="w-[160px] border-b border-[#e9ece5] bg-[#fafbf9] px-3.5 py-[11px] text-right text-[11.5px] font-bold uppercase tracking-[.08em] text-[#7b8077]">Total del mes</th>
          </tr>
        </thead>
        <tbody>
          {meses.map((m) => {
            const del = pagos.filter((p) => p.fecha.startsWith(m) && p.estado !== "fraccionado");
            const cuentan = cuenta(del);
            const pasado = cuentan.length > 0 && cuentan.every((p) => p.estado === "hecho");
            const actual = m === mesActual;
            const nombre = mayus(m.slice(0, 4) === hoy.slice(0, 4) ? MES.format(fecha(m + "-01")) : MES_ANIO.format(fecha(m + "-01")));
            return (
              <tr key={m} className={actual ? "bg-[#f3f9ec]" : ""}>
                <td className={`border-b border-[#f0f2ee] px-3.5 py-3 align-top ${m < mesActual ? "text-[#7b8077]" : ""}`}>{actual ? <b>{nombre}</b> : nombre}</td>
                {empresas.map((e) => (
                  <td key={e} className="border-b border-[#f0f2ee] px-3.5 py-3 align-top">
                    <Celda pagos={del.filter((p) => p.empresa === e)} />
                  </td>
                ))}
                <td className={`border-b border-[#f0f2ee] px-3.5 py-3 text-right align-top ${pasado ? "text-[#7b8077]" : "font-bold"}`}>
                  {pasado ? `✓ ${EUR0.format(sabido(cuentan))}` : totalTexto(cuentan)}
                </td>
              </tr>
            );
          })}
          {!todo && meses[meses.length - 1] < ultimo && (
            <tr>
              <td colSpan={empresas.length + 2} className="px-3.5 py-3 text-[#7b8077]">
                … hasta {MES_ANIO.format(fecha(ultimo + "-01"))} ·{" "}
                <Link href={hrefTodo} className="font-semibold text-lima-dark hover:underline">ver el calendario completo</Link>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Impuestos({ pagos, empresas, hoy, todo, hrefTodo }: { pagos: Pago[]; empresas: Empresa[]; hoy: string; todo: boolean; hrefTodo: string }) {
  const pendientes = cuenta(pagos).filter((p) => p.estado === "pendiente");
  const finSemana = sumar(hoy, 7);
  const mes = hoy.slice(0, 7);
  const siguiente = mesMas(hoy, 1);
  // Lo que se paso sin hacer va con esta semana, en rojo: es lo primero que hay que mirar.
  const semana = pendientes.filter((p) => p.fecha <= finSemana);
  const restoMes = pendientes.filter((p) => p.fecha > finSemana && p.fecha.startsWith(mes));
  const proximoMes = pendientes.filter((p) => p.fecha > finSemana && p.fecha.startsWith(siguiente));
  const diaSemana = semana.find((p) => p.fecha >= hoy)?.fecha;
  return (
    <>
      <FranjaSemana semana={semana} hoy={hoy} />
      <div className="mb-6 grid gap-5" style={{ gridTemplateColumns: "1.3fr 1fr 1fr" }}>
        <Columna titulo={`Esta semana${diaSemana ? ` · ${diaSem(diaSemana)}` : ""}`} punto="ambar" total={totalTexto(semana)} pagos={semana} hoy={hoy} vacio="Nada en los próximos siete días." />
        <Columna titulo="Este mes" punto="crema" total={restoMes.length ? (sabido(restoMes) ? totalTexto(restoMes) : `+ ${restoMes.length} pagos`) : ""} pagos={restoMes} hoy={hoy} conDia vacio="Nada más este mes." />
        <Columna titulo="Próximo mes" punto="gris" total={totalTexto(proximoMes)} pagos={proximoMes} hoy={hoy} conDia vacio="Nada el mes que viene." />
      </div>
      <Anio pagos={pagos} empresas={empresas} hoy={hoy} todo={todo} hrefTodo={hrefTodo} />
    </>
  );
}
