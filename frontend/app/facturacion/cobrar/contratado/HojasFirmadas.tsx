"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { EstadoHoja, FacturaDeLinea, HojaFirmada, LineaHoja, PaginaHojas } from "../../../../lib/hojasFirmadas";

// COBRAR › TODO LO CONTRATADO (Monica, 16-oct-2026). Arriba, como en la maqueta
// (area-dinero-v1, marco 3): cifras y filtros en pastillas. La tabla, la suya:
// Hoja (al pinchar, el PDF firmado en el visor) · Que cubre (cada linea, y
// debajo sus facturas con su cobro y su justificante) · Estado · Quien factura.
//
// La tabla mide lo que sus columnas (regla 8 de la guia, 18-oct): solo «que cubre»
// crece, con tope.
//
// Cada filtro, busqueda o pagina es UNA llamada a ./datos (50 hojas); el
// buscador espera 0,3 s y cancela la anterior. El visor se abre encima, sin
// salir de la lista.

const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" } as Intl.NumberFormatOptions);
const EUR0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" } as Intl.NumberFormatOptions);
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fecha = (iso: string | null) => (iso ? `${+iso.slice(8, 10)} ${MESES[+iso.slice(5, 7) - 1]} ${iso.slice(2, 4)}` : "—");
const eur = (n: number | null) => (n == null ? "—" : `${EUR.format(n)} €`);

const ESTADO: Record<EstadoHoja, { t: string; c: string }> = {
  pendiente: { t: "pendiente", c: "bg-[#fbefd0] text-[#875f07]" },
  parcial: { t: "cobrada parcial", c: "bg-[#f0f1ee] text-[#55594f]" },
  total: { t: "cobrada total", c: "bg-[#e3f2d4] text-[#2f5d14]" },
  alerta: { t: "alerta: devuelta", c: "bg-[#f6dfdd] text-[#8e2f2d]" },
  anterior: { t: "antes de 2025", c: "bg-[#f0f1ee] text-[#55594f]" },
};
const ORDEN_ESTADOS: EstadoHoja[] = ["pendiente", "parcial", "total", "alerta", "anterior"];
const QUIEN: Record<string, string> = { accesalia: "Accesalia", daniel: "Daniel", ecobalance: "Ecobalance" };
const TIPO_COBRO: Record<string, string> = {
  cargo_en_cuenta: "cargo", transferencia: "transferencia", confirming: "confirming", aviso_de_pago: "aviso de pago",
  devolucion: "devuelto", otro: "cobro",
};

type Filtros = { texto: string; anio: number | null; estado: EstadoHoja | null; emisor: string | null; pagina: number };
type Visor = { titulo: string; url: string } | null;

function Chip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12.5px] font-bold transition ${on ? "bg-carbon text-white" : "border border-[#d6dad2] bg-white text-[#55594f] hover:border-carbon/40"}`}
    >
      {children}
    </button>
  );
}

function Kpi({ l, v, s, alerta }: { l: string; v: string; s: string; alerta?: boolean }) {
  return (
    <div className="rounded-[14px] border border-[#e3e6df] bg-white px-5 py-4">
      <div className="text-[12px] font-bold uppercase tracking-[.08em] text-[#6b7066]">{l}</div>
      <div className={`mt-1 text-[28px] font-bold tabular-nums tracking-tight ${alerta ? "text-alerta" : "text-carbon"}`}>{v}</div>
      <div className="mt-0.5 text-[13px] text-carbon/65">{s}</div>
    </div>
  );
}

export function HojasFirmadas({ inicial }: { inicial: PaginaHojas }) {
  const [datos, setDatos] = useState<PaginaHojas>(inicial);
  const [f, setF] = useState<Filtros>({ texto: "", anio: null, estado: null, emisor: null, pagina: 1 });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visor, setVisor] = useState<Visor>(null);
  const primera = useRef(true);
  const peticion = useRef<AbortController | null>(null);

  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    const espera = setTimeout(async () => {
      peticion.current?.abort();
      const ac = new AbortController();
      peticion.current = ac;
      const q = new URLSearchParams({ pagina: String(f.pagina) });
      if (f.texto.trim()) q.set("texto", f.texto.trim());
      if (f.anio) q.set("anio", String(f.anio));
      if (f.estado) q.set("estado", f.estado);
      if (f.emisor) q.set("emisor", f.emisor);
      setCargando(true);
      try {
        const r = await fetch(`/facturacion/cobrar/contratado/datos?${q}`, { signal: ac.signal, cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "No se ha podido cargar.");
        setDatos(j as PaginaHojas);
        setError(null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        if (peticion.current === ac) setCargando(false);
      }
    }, 300);
    return () => clearTimeout(espera);
  }, [f]);

  const poner = (cambio: Partial<Filtros>) => setF((x) => ({ ...x, pagina: 1, ...cambio }));
  const s = datos.sumas;
  const desde = datos.total ? (f.pagina - 1) * 50 + 1 : 0;
  const hasta = Math.min(f.pagina * 50, datos.total);
  const todasEstados = ORDEN_ESTADOS.reduce((n, e) => n + (datos.por_estado[e] ?? 0), 0);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-carbon">Todo lo contratado</h1>
          <div className="mt-1 text-[14.5px] text-carbon/65">Las hojas firmadas, con lo que cubre cada una, sus facturas y lo cobrado</div>
        </div>
        <input
          value={f.texto}
          onChange={(e) => poner({ texto: e.target.value })}
          placeholder="Buscar opp, hoja o factura (131-2026)…"
          className="w-[340px] rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[14.5px] placeholder:text-carbon/55 focus:border-lima focus:outline-none"
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi l="Contratado" v={`${EUR0.format(s.contratado)} €`} s={`${datos.total} hojas · sin IVA`} />
        <Kpi l="Facturado" v={`${EUR0.format(s.facturado)} €`} s={s.contratado ? `${Math.round((100 * s.facturado) / s.contratado)} % de lo contratado` : "—"} />
        <Kpi l="Cobrado" v={`${EUR0.format(s.cobrado)} €`} s={s.facturado ? `${Math.round((100 * s.cobrado) / s.facturado)} % de lo facturado` : "—"} />
        <Kpi l="Facturado sin cobrar" v={`${EUR0.format(Math.max(s.facturado - s.cobrado, 0))} €`} s={`${datos.por_estado.alerta ?? 0} con devolución`} alerta />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Chip on={!f.estado} onClick={() => poner({ estado: null })}>Todas <span className="opacity-70">{todasEstados}</span></Chip>
        {ORDEN_ESTADOS.map((e) => (
          <Chip key={e} on={f.estado === e} onClick={() => poner({ estado: f.estado === e ? null : e })}>
            {ESTADO[e].t} <span className="opacity-70">{datos.por_estado[e] ?? 0}</span>
          </Chip>
        ))}
        <span className="w-4" />
        <Chip on={!f.emisor} onClick={() => poner({ emisor: null })}>Accesalia + Daniel</Chip>
        <Chip on={f.emisor === "accesalia"} onClick={() => poner({ emisor: "accesalia" })}>Accesalia</Chip>
        <Chip on={f.emisor === "daniel"} onClick={() => poner({ emisor: "daniel" })}>Daniel</Chip>
        <span className="w-4" />
        <select
          value={f.anio ?? ""}
          onChange={(e) => poner({ anio: e.target.value ? Number(e.target.value) : null })}
          className="h-7 rounded-full border border-[#d6dad2] bg-white px-3 text-[12.5px] font-bold text-[#55594f]"
        >
          <option value="">Firmadas: todos los años</option>
          {datos.anios.map((a) => (
            <option key={a} value={a}>
              Firmadas en {a}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="mt-4 rounded-xl bg-[#f6dfdd] px-4 py-2.5 text-[13.5px] font-semibold text-alerta">{error}</div>}

      <div className={`mt-4 w-fit max-w-full overflow-hidden rounded-2xl border border-[#e3e6df] bg-white transition-opacity ${cargando ? "opacity-60" : ""}`}>
        <div className="grid grid-cols-[150px_minmax(0,620px)_190px_110px] gap-4 border-b border-[#e3e6df] bg-[#fafbf9] px-5 py-2.5 text-[11.5px] font-bold uppercase tracking-[.08em] text-[#6b7066]">
          <div>Hoja</div>
          <div>Qué cubre · sus facturas</div>
          <div>Estado</div>
          <div>Quién factura</div>
        </div>
        {datos.filas.map((h) => (
          <Fila key={h.id} h={h} abrir={setVisor} />
        ))}
        {!datos.filas.length && <div className="px-5 py-10 text-center text-[14px] text-carbon/65">No hay hojas con estos filtros.</div>}
      </div>

      <div className="mt-3 flex items-center justify-between text-[13.5px] text-carbon/65">
        <span>
          {desde}–{hasta} de {datos.total}
        </span>
        <div className="flex gap-2">
          <button type="button" disabled={f.pagina <= 1} onClick={() => setF((x) => ({ ...x, pagina: x.pagina - 1 }))} className="rounded-xl border border-black/10 bg-white px-4 py-1.5 font-semibold text-carbon/75 disabled:opacity-40">
            ← Anteriores
          </button>
          <button type="button" disabled={hasta >= datos.total} onClick={() => setF((x) => ({ ...x, pagina: x.pagina + 1 }))} className="rounded-xl border border-black/10 bg-white px-4 py-1.5 font-semibold text-carbon/75 disabled:opacity-40">
            Siguientes →
          </button>
        </div>
      </div>

      {visor && <VisorPdf visor={visor} cerrar={() => setVisor(null)} />}
    </>
  );
}

function Fila({ h, abrir }: { h: HojaFirmada; abrir: (v: Visor) => void }) {
  const est = ESTADO[h.estado];
  return (
    <div className="grid grid-cols-[150px_minmax(0,620px)_190px_110px] gap-4 border-b border-black/5 px-5 py-3.5 last:border-b-0">
      <div>
        {h.pdf ? (
          <button
            type="button"
            onClick={() => abrir({ titulo: `Hoja firmada ${h.numero}`, url: `/facturacion/documento/${h.id}/${h.pdf!.version}/${h.pdf!.indice}` })}
            className="text-left text-[14.5px] font-bold text-lima-dark hover:underline"
          >
            📄 {h.numero}
          </button>
        ) : (
          <span className="text-[14.5px] font-bold text-carbon">{h.numero}</span>
        )}
        <Link href={`/comercial/oportunidades/${h.opp.id}`} className="mt-0.5 block text-[13px] font-semibold text-carbon/75 hover:text-carbon hover:underline">
          {h.opp.nombre}
        </Link>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        {h.lineas.map((l) => (
          <Linea key={l.id} l={l} abrir={abrir} />
        ))}
        {!h.lineas.length && <span className="text-[13px] text-amber-700/70">Sin líneas de facturación</span>}
      </div>
      <div className="text-[13.5px]">
        <div className="text-carbon/80">Firmada {fecha(h.fecha_firma)}</div>
        <span className={`mt-1 inline-flex h-[22px] items-center rounded-full px-2.5 text-[12px] font-bold ${est.c}`}>{est.t}</span>
        {h.facturado > 0 && (
          <div className="mt-1 text-[12.5px] text-carbon/65 tabular-nums">
            cobrado {EUR0.format(h.cobrado)} de {EUR0.format(h.facturado)} € facturados
          </div>
        )}
        {h.falta_facturar && h.estado !== "anterior" && <div className="text-[12.5px] font-semibold text-amber-800/80">falta facturar</div>}
      </div>
      <div className="text-[13.5px] text-carbon/80">{h.quien.map((q) => QUIEN[q] ?? q).join(" + ") || "—"}</div>
    </div>
  );
}

function Linea({ l, abrir }: { l: LineaHoja; abrir: (v: Visor) => void }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline gap-2 text-[13.5px]">
        <span className="min-w-0 truncate text-carbon/90" title={l.descripcion ?? ""}>
          {l.descripcion || "Línea sin concepto"}
        </span>
        <span className="shrink-0 font-semibold tabular-nums text-carbon/80">
          {l.es_porcentaje ? `${String(l.porcentaje ?? "").replace(".", ",")} %` : l.importe != null ? `${EUR0.format(l.importe)} €` : ""}
        </span>
      </div>
      {l.facturas.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5 pl-3">
          {l.facturas.map((fa) => (
            <Factura key={fa.id} fa={fa} abrir={abrir} />
          ))}
        </div>
      )}
    </div>
  );
}

function Factura({ fa, abrir }: { fa: FacturaDeLinea; abrir: (v: Visor) => void }) {
  const num = `${fa.numero}-${fa.anio}`;
  const tono =
    fa.estado_cobro === "cobrada" ? "border-[#cfe5bb] bg-[#f3f9ec]" : fa.estado_cobro === "devuelta" ? "border-[#e8c3c0] bg-[#fbf0ef]" : "border-amber-200 bg-amber-50/60";
  const positivos = fa.cobros.filter((c) => c.tipo !== "devolucion");
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-2 py-1 text-[12.5px] ${tono}`}>
      {fa.tiene_pdf ? (
        <button type="button" onClick={() => abrir({ titulo: `Factura ${num}`, url: `/facturacion/factura/${fa.id}` })} className="font-bold text-carbon hover:underline">
          Fac {num}
        </button>
      ) : (
        <b className="text-carbon">Fac {num}</b>
      )}
      <span className="tabular-nums text-carbon/75">{eur(fa.total)}</span>
      {fa.cobros.length === 0 ? (
        fa.estado_cobro === "cobrada" ? (
          // hasta 2023 la factura garantiza el cobro: entonces no se descargaban justificantes (Monica, 17-oct)
          <span className="font-semibold text-lima-dark">✓ cobrada (por la factura)</span>
        ) : (
          <span className="font-semibold text-amber-800/80">sin justificante</span>
        )
      ) : (
        fa.cobros.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => abrir({ titulo: `Justificante · Fac ${num} · ${fecha(c.fecha)}`, url: `/facturacion/justificante/${c.id}` })}
            className={`font-semibold hover:underline ${c.tipo === "devolucion" ? "text-alerta" : "text-lima-dark"}`}
            title={c.importe != null ? eur(c.importe) : "importe sin leer"}
          >
            {c.tipo === "devolucion" ? "↩ devuelto" : `✓ ${TIPO_COBRO[c.tipo] ?? "cobro"}`} {fecha(c.fecha)}
            {positivos.length > 1 && c.importe != null && c.tipo !== "devolucion" ? ` · ${EUR0.format(c.importe)} €` : ""}
            {c.importe == null ? <span className="font-normal text-amber-800/80"> · importe sin leer</span> : null}
          </button>
        ))
      )}
    </div>
  );
}

function VisorPdf({ visor, cerrar }: { visor: NonNullable<Visor>; cerrar: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [cerrar]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6" onClick={cerrar}>
      <div className="flex h-full w-full max-w-[1000px] flex-col overflow-hidden rounded-2xl bg-[#e9ebe6] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-4 bg-white px-5 py-3 text-[14px]">
          <b className="text-carbon">{visor.titulo}</b>
          <div className="flex items-center gap-4">
            <a href={visor.url} target="_blank" rel="noreferrer" className="font-semibold text-lima-dark hover:underline">
              Abrir aparte ↗
            </a>
            <button type="button" onClick={cerrar} className="rounded-xl border border-black/10 px-3 py-1 font-semibold text-carbon/70 hover:border-carbon/40">
              ✕ Cerrar
            </button>
          </div>
        </div>
        <iframe src={visor.url} title={visor.titulo} className="flex-1 bg-white" />
      </div>
    </div>
  );
}
