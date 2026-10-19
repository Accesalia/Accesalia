import Link from "next/link";
import type { EstadoFactura, FichaFacturacion, PagoFicha } from "../../../lib/fichaFacturacion";

// LA FICHA DE FACTURACION, sobre la maqueta aprobada por Monica (19-oct-2026). Los
// colores cuentan la historia: lo contratado lo contiene todo; lo que queda por
// facturar (NARANJA) y lo ya facturado (AZUL) son sus dos partes, lado a lado. En lo
// contratado, cada hoja enmarcada y cada pago con el texto de su color. Tablas del
// ancho de su contenido (regla 8).

const eur = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" } as Intl.NumberFormatOptions) + " €";
const dia = (s: string | null) => (s ? s.slice(0, 10).split("-").reverse().join("/") : "");

const NAR = { texto: "text-[#b4621b]", fondo: "bg-[#fdf1e4]", borde: "border-[#f0c99e]" };
const AZU = { texto: "text-[#2d5f8f]", fondo: "bg-[#eaf1f8]", borde: "border-[#b9cfe4]" };
const CHIP: Record<string, string> = { verde: "bg-[#e3f1d6] text-[#2f5d14]", ambar: "bg-[#fbefd0] text-[#875f07]", gris: "bg-black/[.06] text-carbon/55", rojo: "bg-[#f6dfdd] text-[#8e2f2d]" };
const ESTADO: Record<EstadoFactura, { texto: (f: string | null) => string; chip: string }> = {
  cobrada: { texto: (f) => (f ? `cobrada el ${dia(f)}` : "cobrada"), chip: CHIP.verde },
  pendiente_ingreso: { texto: () => "pendiente de ingreso", chip: CHIP.ambar },
  devuelta: { texto: () => "devuelta", chip: CHIP.rojo },
  anulada: { texto: () => "anulada", chip: CHIP.gris },
};

function Cuando({ p }: { p: PagoFicha }) {
  if (!p.cuando.texto) return null;
  return p.cuando.tono ? <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${CHIP[p.cuando.tono]}`}>{p.cuando.texto}</span> : <span className="text-carbon/60">{p.cuando.texto}</span>;
}

export function FichaFacturacionVista({ f }: { f: FichaFacturacion }) {
  const todoCobrado = f.facturado > 0 && f.pendienteIngreso < 1 && f.devuelto < 1;
  return (
    <div className="text-carbon">
      {/* CABECERA: lo minimo. */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-[28px] font-bold leading-tight">{f.nombre}</h1>
        <Link href={`/comercial/oportunidades/${f.oppId}`} className="text-[14px] font-semibold text-[#104269] hover:underline">
          {f.codigo ?? "la opp"} · ver opp →
        </Link>
      </div>
      <p className="mt-1 text-[14px] text-carbon/60">
        Comercial <b className="text-carbon">{f.comercial ?? "—"}</b> · Administrador <b className="text-carbon">{f.administradores.join(" · ") || "—"}</b>
      </p>

      {/* EL RESUMEN. */}
      <div className="mt-3.5 flex w-fit max-w-full flex-wrap items-baseline gap-x-7 gap-y-1 rounded-xl border border-black/15 bg-white px-5 py-2.5 text-[14px] tabular-nums">
        <span>
          Firmado <b className="text-[16px]">{eur(f.firmado)}</b> sin IVA
        </span>
        <span className={AZU.texto}>
          Ya facturado <b className="text-[16px]">{eur(f.facturado)}</b> sin IVA ({todoCobrado ? "cobrado todo" : `cobrado ${eur(f.cobrado)}`}
          {f.devuelto > 0 ? ` · devuelto ${eur(f.devuelto)}` : ""})
        </span>
        <span className={NAR.texto}>
          Queda por facturar <b className="text-[16px]">{eur(f.porFacturar)}</b> sin IVA{f.aExito ? ` + ${f.aExito} a éxito` : ""}
        </span>
      </div>

      {/* LOS DOS DESGLOSES, LADO A LADO. */}
      <div className="mt-2 flex flex-wrap items-start gap-x-5">
        <section>
          <h2 className={`mb-2 mt-5 flex flex-wrap items-baseline gap-x-3 text-[17px] font-bold ${NAR.texto}`}>
            Queda por facturar
            {f.pendientes.length > 0 && <span className="text-[22px]">{eur(f.porFacturar)}</span>}
            {f.aExito > 0 && <span className="text-[13px] font-normal text-carbon/60">+ {f.aExito} a éxito</span>}
          </h2>
          {f.pendientes.length ? (
            <table className={`border-collapse border bg-white text-[13.5px] tabular-nums ${NAR.borde}`}>
              {f.pendientes.map((g) => (
                <tbody key={g.quien}>
                  <tr>
                    <td colSpan={4} className={`border-t px-2.5 py-1.5 text-[13px] text-carbon/60 ${NAR.fondo} ${NAR.borde}`}>
                      Paga: <b className="text-carbon">{g.quien}</b> ({g.tipo})
                    </td>
                  </tr>
                  {g.pagos.map((p) => (
                    <tr key={p.id} className={`border-t align-baseline ${NAR.borde}`}>
                      <td className="whitespace-nowrap px-2.5 py-1.5 font-semibold">{p.concepto}</td>
                      <td className="max-w-[230px] px-2.5 py-1.5">{p.que}</td>
                      <td className="whitespace-nowrap px-2.5 py-1.5 text-right">{p.aExito ? "a éxito" : eur(p.porFacturar)}</td>
                      <td className="whitespace-nowrap px-2.5 py-1.5">
                        <Cuando p={p} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          ) : (
            <div className={`rounded-xl border bg-white px-5 py-3.5 font-bold text-[#2f5d14] ${NAR.borde}`}>Todo facturado ✓</div>
          )}
        </section>

        <section>
          <h2 className={`mb-2 mt-5 flex flex-wrap items-baseline gap-x-3 text-[17px] font-bold ${AZU.texto}`}>
            Ya facturado
            <span className="text-[13px] font-normal text-carbon/60">
              {eur(f.facturado)} sin IVA · cobrado {eur(f.cobrado)} · pendiente de ingreso {eur(f.pendienteIngreso)}
              {f.devuelto > 0 ? ` · devuelto ${eur(f.devuelto)}` : ""}
            </span>
          </h2>
          {f.facturas.length ? (
            <table className={`border-collapse border bg-white text-[13.5px] tabular-nums ${AZU.borde}`}>
              <thead>
                <tr className={`border-b text-[11px] font-bold uppercase tracking-wide text-carbon/55 ${AZU.fondo} ${AZU.borde}`}>
                  <th className="px-2.5 py-1.5 text-left">Factura</th>
                  <th className="px-2.5 py-1.5 text-left">Fecha</th>
                  <th className="px-2.5 py-1.5 text-right">Con IVA</th>
                  <th className="px-2.5 py-1.5 text-right">Sin IVA</th>
                  <th className="px-2.5 py-1.5 text-left">Estado</th>
                  <th className="px-2.5 py-1.5 text-left">A nombre de</th>
                  <th />
                </tr>
              </thead>
              {f.facturas.map((x) => (
                <tbody key={x.id} className={`border-t ${AZU.borde} ${x.estado === "anulada" ? "opacity-50" : ""}`}>
                  <tr className="align-baseline">
                    <td className="whitespace-nowrap px-2.5 pt-2 font-bold">{x.numero}</td>
                    <td className="whitespace-nowrap px-2.5 pt-2">{dia(x.fecha)}</td>
                    <td className="whitespace-nowrap px-2.5 pt-2 text-right font-bold">{eur(x.total)}</td>
                    <td className="whitespace-nowrap px-2.5 pt-2 text-right">{eur(x.base)}</td>
                    <td className="whitespace-nowrap px-2.5 pt-2">
                      <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${ESTADO[x.estado].chip}`}>{ESTADO[x.estado].texto(x.fechaCobro)}</span>
                    </td>
                    <td className="max-w-[150px] px-2.5 pt-2 text-[12px] text-carbon/60">{x.aNombreDe ?? "—"}</td>
                    <td className="whitespace-nowrap px-2.5 pt-2">
                      {x.pdf && (
                        <a href={`/facturacion/factura/${x.id}`} target="_blank" rel="noreferrer" className="text-[12.5px] text-[#104269] underline">
                          ver factura
                        </a>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td />
                    <td colSpan={6} className="px-2.5 pb-2 pt-0.5 text-[12.5px] text-carbon/60">
                      {x.conceptos.length ? (
                        x.conceptos.map((c, i) => (
                          <span key={i}>
                            {i > 0 && <span className="mx-1.5">—</span>}
                            {c.texto} · <b className="font-semibold text-carbon">{eur(c.importe)}</b>
                          </span>
                        ))
                      ) : (
                        <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${CHIP.rojo}`}>sin casar con su hito</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              ))}
            </table>
          ) : (
            <div className={`rounded-xl border bg-white px-5 py-3.5 text-carbon/60 ${AZU.borde}`}>Todavía no hay ninguna factura emitida.</div>
          )}
        </section>
      </div>

      {/* LO CONTRATADO, ENTERO: cada hoja enmarcada; la hoja sombreada, cada linea igual pero mas suave. */}
      <h2 className="mb-2 mt-7 flex flex-wrap items-baseline gap-x-3 text-[17px] font-bold">
        Lo contratado
        <span className="text-[13px] font-normal text-carbon/60">
          {eur(f.firmado)} sin IVA · <span className={AZU.texto}>en azul, lo facturado</span> · <span className={NAR.texto}>en naranja, lo que queda</span>
        </span>
      </h2>
      <div className="flex flex-col items-start gap-3.5">
        {f.hojas.map((h) => (
          <table key={h.id} className="border-collapse border-2 border-carbon bg-white text-[13.5px] tabular-nums">
            <tbody>
              <tr>
                <td colSpan={4} className="border-b border-black/15 bg-[#e4e8e0] px-3.5 py-1.5 text-[13px]">
                  <b>{h.codigo ?? "—"}</b> · firmada {dia(h.fecha)}
                  {h.visor && (
                    <>
                      {" · "}
                      <a href={h.visor} target="_blank" rel="noreferrer" className="text-[#104269] underline">
                        ver hoja firmada
                      </a>
                    </>
                  )}
                </td>
              </tr>
              {h.lineas.map((l) => (
                <LineaContratada key={l.id} l={l} />
              ))}
            </tbody>
          </table>
        ))}
      </div>
    </div>
  );
}

function LineaContratada({ l }: { l: FichaFacturacion["hojas"][number]["lineas"][number] }) {
  return (
    <>
      <tr className="border-t border-black/15 bg-[#f2f4ef] align-baseline">
        <td colSpan={2} className="max-w-[580px] px-3.5 pb-1.5 pt-2 font-semibold">
          {l.descripcion}
        </td>
        <td className="whitespace-nowrap px-3.5 pb-1.5 pt-2 text-right font-bold">{l.esPorcentaje ? `${l.porcentaje ?? ""} % a éxito` : eur(l.importe)}</td>
        <td />
      </tr>
      {l.pagos.map((p) => {
        const color = p.facturas.length ? AZU.texto : NAR.texto;
        return (
          <tr key={p.id} className={`align-baseline ${color}`}>
            <td className="w-3" />
            <td className="py-1.5 pl-8 pr-3.5">{p.que}</td>
            <td className="whitespace-nowrap px-3.5 py-1.5 text-right">{p.importe == null ? "a éxito" : eur(p.importe)}</td>
            <td className="whitespace-nowrap px-3.5 py-1.5 text-[12.5px]">{p.facturas.length ? `factura ${p.facturas.join(", ")}` : "por facturar"}</td>
          </tr>
        );
      })}
    </>
  );
}
