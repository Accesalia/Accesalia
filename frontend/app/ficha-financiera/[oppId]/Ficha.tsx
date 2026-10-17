import type { Ficha, HitoFicha, LineaFicha, Vista } from "../../../lib/fichaFinanciera";

// LA FICHA FINANCIERA, con la estetica de la de Monica (2025): fondo crema
// verdoso, secciones numeradas en verde, cuadros con borde verde, etiquetas con
// letra de libro y los datos en letra de palo. «Asi se ve que estamos en otra
// cosa». Cada seccion sale solo si quien mira puede verla (lib/fichaFinanciera.ts).

const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const eur = (n: number | null) => (n == null ? "" : `${EUR.format(n)} €`);
const fecha = (f: string | null) => (f ? f.slice(0, 10).split("-").reverse().join("/") : "");
const VERDE = "#4f8a2b";

function Titulo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-1.5 mt-9 text-[15px] font-bold uppercase tracking-wide break-after-avoid" style={{ color: "#6aa84f" }}>
      {n}. {children}
    </h2>
  );
}
function Caja({ children }: { children: React.ReactNode }) {
  return (
    <div className="break-inside-avoid border bg-white/70" style={{ borderColor: VERDE }}>
      {children}
    </div>
  );
}
function Fila({ et, children, ancho = "38%" }: { et: string; children: React.ReactNode; ancho?: string }) {
  return (
    <div className="flex border-b border-[#dfe6d3] last:border-0">
      <div className="shrink-0 border-r border-[#dfe6d3] px-2.5 py-1.5 font-serif text-[14px] text-carbon" style={{ width: ancho }}>
        {et}
      </div>
      <div className="min-w-0 flex-1 px-2.5 py-1.5 text-[14.5px] text-carbon">{children}</div>
    </div>
  );
}
function Hueco({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[12.5px] text-amber-900/80 ring-1 ring-amber-200">{children}</span>;
}
function Casilla({ si }: { si: boolean }) {
  return (
    <span className="mr-1 inline-flex h-[15px] w-[15px] items-center justify-center border border-carbon/70 align-[-2px] text-[11px] font-bold leading-none">
      {si ? "✓" : ""}
    </span>
  );
}

const ESTADO: Record<HitoFicha["estado"], string> = {
  cobrado: "bg-[#e3f2d4] text-[#2f5d14]",
  facturado: "bg-[#e2eaf3] text-[#3b5f86]",
  completado: "bg-[#eef3e6] text-[#3f5a2a]",
  pendiente: "bg-[#f0f1ee] text-[#55594f]",
  "a éxito": "bg-[#fbefd0] text-[#875f07]",
  anulado: "bg-white text-carbon/45 line-through",
};
function Hitos({ hitos }: { hitos: HitoFicha[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {hitos.flatMap((h) => (h.subhitos.length ? h.subhitos : [h])).map((h, i) => (
        <span key={i} title={h.facturas.length ? `Facturas ${h.facturas.join(", ")}` : undefined} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold ${ESTADO[h.estado]}`}>
          {h.estado === "cobrado" ? "✓ " : ""}
          {h.que}
          {h.porcentaje != null ? ` ${h.porcentaje} %` : ""}
          {h.importe != null ? ` · ${EUR.format(h.importe)}` : ""}
          {h.fecha && h.estado === "pendiente" ? ` · ${fecha(h.fecha)}` : ""}
          <span className="font-normal opacity-75">· {h.estado}</span>
        </span>
      ))}
    </div>
  );
}

function importeLinea(l: LineaFicha) {
  if (l.exito) return `${l.exito.porcentaje ?? "?"} % a éxito${l.exito.sobre ? ` sobre ${l.exito.sobre}` : ""}`;
  return eur(l.base);
}

export function FichaFinanciera({ f, vista }: { f: Ficha; vista: Vista }) {
  const iva = 1 + f.ivaPct / 100;
  const de = (filtro: (l: LineaFicha) => boolean) => f.lineas.filter(filtro);
  const acc = de((l) => !l.ecobalance);
  const eco = de((l) => l.ecobalance);
  const subv = de((l) => l.area === "SUBV");
  const tresPptos = de((l) => l.area === "3PPTOS");
  const caes = de((l) => l.area === "CAES" || /caes/i.test(l.bloque));
  const previsto = (ls: LineaFicha[]) => ls.reduce((s, l) => s + (l.exito ? 0 : (l.base ?? 0)), 0);
  const aExito = f.lineas.filter((l) => l.exito).length;
  const verLineas = [...(vista.accesalia ? acc : []), ...(vista.ecobalance ? eco : [])];
  let n = 1;

  return (
    <div className="mx-auto max-w-[860px] px-10 pb-16 pt-10 print:max-w-none print:px-0 print:pt-0" style={{ background: "#f1f4dc" }}>
      {/* 1. DIRECCION */}
      <div className="border-[3px] px-3 py-3" style={{ borderColor: VERDE }}>
        <span className="mr-2 align-top text-[13px] font-bold" style={{ color: "#6aa84f" }}>DIRECCIÓN:</span>
        <span className="text-[24px] text-carbon">{f.opp.nombre}</span>
      </div>

      <div className="mt-7">
        <Caja>
          <Fila et="Categoría de proyecto:">{f.categorias.join(" · ") || <Hueco>sin obras en la hoja</Hueco>}</Fila>
          <Fila et="Tipo de proyecto:">{f.obras.join(" + ") || <Hueco>sin obras en la hoja</Hueco>}</Fila>
          <Fila et="Quién lo paga:">{f.pagadores.join(" · ") || "—"}</Fila>
          <Fila et="Fecha firma hoja encargo:">
            {fecha(f.firma) || "—"}
            {f.hojas.length > 0 && <span className="ml-2 text-[12.5px] text-carbon/65">{f.hojas.join(", ")}</span>}
          </Fila>
          <Fila et="Administrador:">{f.administrador ?? <Hueco>sin administrador en la opp</Hueco>}</Fila>
          <Fila et="Contrata elegida:">
            {f.contrata ? `${f.contrata.nombre}${f.contrata.pem ? ` · PEM ${eur(f.contrata.pem)}` : ""}` : <Hueco>no consta (se apunta al votar en junta)</Hueco>}
          </Fila>
        </Caja>
      </div>

      {/* 2. HOJA DE ENCARGO RESUMEN */}
      <Titulo n={++n}>Hoja de encargo resumen</Titulo>
      <Caja>
        <div className="flex border-b border-[#dfe6d3] font-serif text-[14px]">
          <div className="w-[44%] border-r border-[#dfe6d3] px-2.5 py-1.5">Qué se ha contratado</div>
          <div className="w-[16%] border-r border-[#dfe6d3] px-2.5 py-1.5">Hoja</div>
          <div className="w-[20%] border-r border-[#dfe6d3] px-2.5 py-1.5">Importe sin IVA</div>
          <div className="flex-1 px-2.5 py-1.5">Importe con IVA</div>
        </div>
        {verLineas.map((l) => (
          <div key={l.id} className="flex border-b border-[#dfe6d3] text-[14px] last:border-0">
            <div className="w-[44%] border-r border-[#dfe6d3] px-2.5 py-1.5">
              <Casilla si /> {l.bloque}
              {l.ecobalance && <span className="ml-1.5 text-[11.5px] font-semibold text-[#3b5f86]">Ecobalance</span>}
            </div>
            <div className="w-[16%] border-r border-[#dfe6d3] px-2.5 py-1.5 text-[12.5px] text-carbon/70">{l.hoja}</div>
            <div className="w-[20%] border-r border-[#dfe6d3] px-2.5 py-1.5 tabular-nums">{importeLinea(l)}</div>
            <div className="flex-1 px-2.5 py-1.5 tabular-nums">{l.exito ? "" : eur(l.base != null ? l.base * iva : null)}</div>
          </div>
        ))}
        {!verLineas.length && <div className="px-2.5 py-2"><Hueco>sin líneas en las hojas firmadas</Hueco></div>}
        <div className="flex border-t border-[#dfe6d3] text-[14px] font-bold">
          <div className="w-[60%] border-r border-[#dfe6d3] px-2.5 py-1.5 font-serif">Total{aExito ? " (sin lo de a éxito)" : ""}</div>
          <div className="w-[20%] border-r border-[#dfe6d3] px-2.5 py-1.5 tabular-nums">{eur(previsto(verLineas))}</div>
          <div className="flex-1 px-2.5 py-1.5 tabular-nums">{eur(previsto(verLineas) * iva)}</div>
        </div>
      </Caja>

      {/* 3. ADMINISTRADOR (comisiones: Ecobalance) */}
      {vista.ecobalance && (
        <>
          <Titulo n={++n}>Administrador</Titulo>
          <Caja>
            <Fila et="Administrador:" ancho="46%">{f.administrador ?? "—"}</Fila>
            <Fila et="Comisión sobre proyecto (% o €):" ancho="46%"><Hueco>aún no se guarda</Hueco></Fila>
            <Fila et="Comisión sobre subvenciones (% o €):" ancho="46%"><Hueco>aún no se guarda</Hueco></Fila>
            <Fila et="Comisión pactada sobre contrata (% o €):" ancho="46%"><Hueco>aún no se guarda</Hueco></Fila>
            <Fila et="Pagadas:" ancho="46%"><Hueco>aún no se guarda</Hueco></Fila>
          </Caja>
        </>
      )}

      {/* 4. CONTRATA (comision: Ecobalance) */}
      {vista.ecobalance && (
        <>
          <Titulo n={++n}>Contrata</Titulo>
          <Caja>
            <Fila et="Contrata elegida:">{f.contrata?.nombre ?? <Hueco>no consta</Hueco>}</Fila>
            <Fila et="Comisión pactada:">
              {tresPptos.length ? tresPptos.map((l) => importeLinea(l)).join(" · ") : <Hueco>sin línea de 3 presupuestos</Hueco>}
            </Fila>
            <Fila et="Hitos de pago pactados:">{tresPptos.length ? <Hitos hitos={tresPptos.flatMap((l) => l.hitos)} /> : "—"}</Fila>
          </Caja>
        </>
      )}

      {/* 5. SUBVENCIONES */}
      {vista.accesalia && (
        <>
          <Titulo n={++n}>Subvenciones</Titulo>
          <Caja>
            <Fila et="Contratada:" ancho="46%"><Casilla si={subv.length > 0} /> {subv.length ? "Sí" : "No"}</Fila>
            {subv.length > 0 && (
              <>
                <Fila et="Precio pactado:" ancho="46%">
                  <Casilla si={subv.some((l) => !l.exito)} /> Fijo (€){" "}
                  <span className="ml-4"><Casilla si={subv.some((l) => !!l.exito)} /> Porcentaje a éxito (%)</span>
                </Fila>
                <Fila et="Honorarios:" ancho="46%">{subv.map(importeLinea).join(" · ")}</Fila>
                <Fila et="Fecha de contratación de tramitación:" ancho="46%">{fecha(f.firma)}</Fila>
                <Fila et="Cobro del honorario:" ancho="46%"><Hitos hitos={subv.flatMap((l) => l.hitos)} /></Fila>
              </>
            )}
          </Caja>
        </>
      )}

      {/* 6. FINANCIACION */}
      {vista.accesalia && (
        <>
          <Titulo n={++n}>Financiación</Titulo>
          <Caja>
            {f.financiacion.length ? (
              f.financiacion.map((x, i) => (
                <Fila key={i} et={x.entidad}>
                  {x.estado}
                  {x.importe ? ` · ${eur(x.importe)}` : ""}
                  {x.firma ? ` · firmada el ${fecha(x.firma)}` : ""}
                  {x.notas ? <span className="text-carbon/70"> · {x.notas}</span> : null}
                </Fila>
              ))
            ) : (
              <Fila et="Cdad quiere financiación:"><Hueco>no consta</Hueco></Fila>
            )}
          </Caja>
        </>
      )}

      {/* 7. CAES */}
      {(vista.ecobalance || caes.some((l) => !l.ecobalance)) && (
        <>
          <Titulo n={++n}>CAES</Titulo>
          <Caja>
            <Fila et="Cesión CAES contratada con la comunidad:" ancho="50%"><Casilla si={caes.length > 0} /> {caes.length ? "Sí" : "No"}</Fila>
            {caes.length > 0 && <Fila et="Qué:" ancho="50%">{caes.map((l) => `${l.bloque}${l.exito || l.base ? ` · ${importeLinea(l)}` : ""}`).join(" · ")}</Fila>}
            {caes.length > 0 && <Fila et="Contrato cesión de ahorros firmado:" ancho="50%"><Hueco>aún no se guarda</Hueco></Fila>}
          </Caja>
        </>
      )}

      {/* 8. POR DONDE VA (los hitos de facturacion) */}
      <Titulo n={++n}>Hitos de facturación</Titulo>
      <Caja>
        {verLineas.map((l) => (
          <Fila key={l.id} et={l.bloque} ancho="30%">
            {l.hitos.length ? <Hitos hitos={l.hitos} /> : <Hueco>sin hitos</Hueco>}
          </Fila>
        ))}
        {!verLineas.length && <div className="px-2.5 py-2">—</div>}
      </Caja>

      {/* 9. RESUMEN FINANCIERO */}
      <Titulo n={++n}>Resumen financiero</Titulo>
      <div className="border-y" style={{ borderColor: VERDE }}>
        {[
          ["Ingresos totales previstos (sin IVA):", eur(previsto(verLineas)) + (aExito ? " + lo de a éxito" : "")],
          ["Ingresos totales facturados:", eur((vista.accesalia ? f.facturado.accesalia : 0) + (vista.ecobalance ? f.facturado.ecobalance : 0))],
          ["Ingresos cobrados (con justificante):", eur((vista.accesalia ? f.cobrado.accesalia : 0) + (vista.ecobalance ? f.cobrado.ecobalance : 0))],
        ].map(([a, b]) => (
          <div key={a} className="flex py-1 text-[14.5px]">
            <div className="w-[48%] font-serif font-bold" style={{ color: VERDE }}>{a}</div>
            <div className="tabular-nums">{b}</div>
          </div>
        ))}
        {vista.ecobalance && (
          <>
            <div className="flex py-1 text-[14.5px]"><div className="w-[48%] font-serif font-bold" style={{ color: VERDE }}>Comisiones totales previstas:</div><Hueco>falta la del administrador</Hueco></div>
            <div className="flex py-1 text-[14.5px]"><div className="w-[48%] font-serif font-bold" style={{ color: VERDE }}>Comisiones pagadas:</div><Hueco>aún no se guarda</Hueco></div>
          </>
        )}
        {vista.todo && (
          <div className="flex border-t py-1.5 text-[14.5px]" style={{ borderColor: VERDE }}>
            <div className="w-[48%] font-serif font-bold" style={{ color: VERDE }}>Beneficio neto esperado:</div>
            <Hueco>faltan las comisiones y el coste (horas de técnico)</Hueco>
          </div>
        )}
      </div>

      {/* 10. NOTAS / INCIDENCIAS */}
      <Titulo n={++n}>Notas / incidencias</Titulo>
      <div className="min-h-[90px] border-[3px] bg-white px-3 py-2" style={{ borderColor: VERDE }}>
        {f.notas.length ? (
          <ul className="space-y-1 text-[13.5px]">
            {f.notas.slice(0, 12).map((x, i) => (
              <li key={i}>
                <span className="text-carbon/60">{fecha(x.fecha)}{x.autor ? ` · ${x.autor}` : ""}{x.tipo === "duda" ? " · duda" : ""} — </span>
                {x.texto}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-[13px] text-carbon/55">Sin notas de facturación.</span>
        )}
      </div>
    </div>
  );
}
