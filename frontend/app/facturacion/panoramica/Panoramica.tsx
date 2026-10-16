"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { LineaPanoramica, OppPanoramica, Panoramica as Datos } from "../../../lib/panoramica";

// VISTA PANORAMICA (Monica, 16-oct-2026): "ver de un vistazo lo que va a entrar
// y, de paso, cuanto ha entrado ya". Arriba, simple: firmado, facturado, cobrado
// y lo que queda por ingresar, con una barra. Debajo, cada opp con sus lineas
// (cada linea es un que y un cuanto) y una barra que se llena en verde segun se
// cobra; en ambar, lo facturado que aun no ha entrado. Lo que mas queda, arriba.
// Filtros: entre fechas de firma, comercial y quitar las cobradas enteras.
// Cada gesto es UNA llamada a ./datos (40 opps); el cambio de fecha espera 0,4 s.

const EUR0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" } as Intl.NumberFormatOptions);
const eur = (n: number) => `${EUR0.format(n)} €`;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fecha = (iso: string | null) => (iso ? `${+iso.slice(8, 10)} ${MESES[+iso.slice(5, 7) - 1]} ${iso.slice(2, 4)}` : "—");
const pct = (a: number, b: number) => (b > 0 ? Math.round((100 * a) / b) : 0);

type Filtros = { desde: string; hasta: string; comercial: string | null; pendientes: boolean; pagina: number };

/** La barra: verde lo cobrado, ambar lo facturado sin cobrar, el resto sin facturar. */
function Barra({ total, facturado, cobrado, alto = "h-2" }: { total: number; facturado: number; cobrado: number; alto?: string }) {
  const c = total > 0 ? Math.min(100, (100 * cobrado) / total) : 0;
  const f = total > 0 ? Math.min(100 - c, (100 * Math.max(facturado - cobrado, 0)) / total) : 0;
  return (
    <div className={`flex ${alto} w-full overflow-hidden rounded-full bg-[#e9ece5]`}>
      <div className="h-full bg-lima" style={{ width: `${c}%` }} />
      <div className="h-full bg-[#f2c94c]" style={{ width: `${f}%` }} />
    </div>
  );
}

function Cifra({ l, v, s, fuerte }: { l: string; v: string; s?: string; fuerte?: boolean }) {
  return (
    <div className={`rounded-[14px] border px-5 py-4 ${fuerte ? "border-carbon bg-carbon text-white" : "border-[#e3e6df] bg-white"}`}>
      <div className={`text-[12px] font-bold uppercase tracking-[.08em] ${fuerte ? "text-white/70" : "text-[#6b7066]"}`}>{l}</div>
      <div className="mt-1 text-[28px] font-bold tabular-nums tracking-tight">{v}</div>
      {s && <div className={`mt-0.5 text-[13px] ${fuerte ? "text-white/70" : "text-carbon/65"}`}>{s}</div>}
    </div>
  );
}

function Chip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-bold transition ${on ? "bg-carbon text-white" : "border border-[#d6dad2] bg-white text-[#55594f] hover:border-carbon/40"}`}
    >
      {children}
    </button>
  );
}

export function Panoramica({ inicial, desdeInicial }: { inicial: Datos; desdeInicial: string }) {
  const [datos, setDatos] = useState<Datos>(inicial);
  const [f, setF] = useState<Filtros>({ desde: desdeInicial, hasta: "", comercial: null, pendientes: false, pagina: 1 });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      const q = new URLSearchParams({ pagina: String(f.pagina), desde: f.desde });
      if (f.hasta) q.set("hasta", f.hasta);
      if (f.comercial) q.set("comercial", f.comercial);
      if (f.pendientes) q.set("pendientes", "1");
      setCargando(true);
      try {
        const r = await fetch(`/facturacion/panoramica/datos?${q}`, { signal: ac.signal, cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "No se ha podido cargar.");
        setDatos(j as Datos);
        setError(null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        if (peticion.current === ac) setCargando(false);
      }
    }, 400);
    return () => clearTimeout(espera);
  }, [f]);

  const poner = (cambio: Partial<Filtros>) => setF((x) => ({ ...x, pagina: 1, ...cambio }));
  const r = datos.resumen;
  const paginas = Math.max(1, Math.ceil(datos.total_opps / 40));

  return (
    <div className="mx-auto max-w-[1300px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-carbon">Vista Panorámica</h1>
          <div className="mt-1 text-[14.5px] text-carbon/65">Lo firmado, lo que ya ha entrado y lo que queda por ingresar · Accesalia y Daniel juntos · sin IVA</div>
        </div>
        <div className="flex items-center gap-2 text-[13.5px] text-carbon/70">
          <span className="font-semibold">Firmadas del</span>
          <input type="date" value={f.desde} min="2025-01-01" onChange={(e) => poner({ desde: e.target.value || desdeInicial })} className="rounded-xl border border-black/10 bg-white px-3 py-2 text-[14px] text-carbon focus:border-lima focus:outline-none" />
          <span className="font-semibold">al</span>
          <input type="date" value={f.hasta} onChange={(e) => poner({ hasta: e.target.value })} className="rounded-xl border border-black/10 bg-white px-3 py-2 text-[14px] text-carbon focus:border-lima focus:outline-none" />
          {f.hasta && (
            <button type="button" onClick={() => poner({ hasta: "" })} className="text-[13px] font-semibold text-carbon/60 hover:text-carbon">
              hasta hoy
            </button>
          )}
        </div>
      </div>

      <div className={`transition-opacity ${cargando ? "opacity-60" : ""}`}>
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Cifra l="Firmado" v={eur(r.firmado)} s={`${r.opps} opps · ${r.lineas} líneas${r.a_exito ? ` · ${r.a_exito} a éxito sin importe` : ""}`} />
          <Cifra l="Facturado" v={eur(r.facturado)} s={`${pct(r.facturado, r.firmado)} % de lo firmado`} />
          <Cifra l="Cobrado" v={eur(r.cobrado)} s={`${pct(r.cobrado, r.firmado)} % de lo firmado`} />
          <Cifra l="Queda por ingresar" v={eur(r.queda)} s={`${eur(Math.max(r.facturado - r.cobrado, 0))} ya facturado · ${eur(Math.max(r.firmado - r.facturado, 0))} por facturar`} fuerte />
        </div>

        <div className="mt-4 rounded-[14px] border border-[#e3e6df] bg-white px-5 py-4">
          <Barra total={r.firmado} facturado={r.facturado} cobrado={r.cobrado} alto="h-4" />
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-carbon/70">
            <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-lima align-middle" />cobrado</span>
            <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#f2c94c] align-middle" />facturado, sin cobrar</span>
            <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#e9ece5] align-middle" />sin facturar</span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Chip on={!f.comercial} onClick={() => poner({ comercial: null })}>Todos los comerciales</Chip>
          {datos.por_comercial.map((c) => (
            <Chip key={c.id ?? "sin"} on={f.comercial === c.id} onClick={() => c.id && poner({ comercial: f.comercial === c.id ? null : c.id })}>
              {c.nombre ?? "Sin comercial"} <span className="font-semibold opacity-70">queda {eur(c.queda)} de {eur(c.firmado)}</span>
            </Chip>
          ))}
          <span className="w-4" />
          <Chip on={f.pendientes} onClick={() => poner({ pendientes: !f.pendientes })}>
            {f.pendientes ? "✓ " : ""}Quitar las cobradas enteras
          </Chip>
        </div>

        {error && <div className="mt-4 rounded-xl bg-[#f6dfdd] px-4 py-2.5 text-[13.5px] font-semibold text-alerta">{error}</div>}

        <div className="mt-4 flex flex-col gap-3">
          {datos.filas.map((o) => (
            <Opp key={o.opp.id} o={o} />
          ))}
          {!datos.filas.length && <div className="rounded-2xl border border-[#e3e6df] bg-white px-5 py-10 text-center text-[14px] text-carbon/65">No hay nada con estos filtros.</div>}
        </div>

        <div className="mt-3 flex items-center justify-between text-[13.5px] text-carbon/65">
          <span>
            {datos.total_opps} opps · página {f.pagina} de {paginas} · primero las que más tienen por entrar
          </span>
          <div className="flex gap-2">
            <button type="button" disabled={f.pagina <= 1} onClick={() => setF((x) => ({ ...x, pagina: x.pagina - 1 }))} className="rounded-xl border border-black/10 bg-white px-4 py-1.5 font-semibold text-carbon/75 disabled:opacity-40">
              ← Anteriores
            </button>
            <button type="button" disabled={f.pagina >= paginas} onClick={() => setF((x) => ({ ...x, pagina: x.pagina + 1 }))} className="rounded-xl border border-black/10 bg-white px-4 py-1.5 font-semibold text-carbon/75 disabled:opacity-40">
              Siguientes →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Opp({ o }: { o: OppPanoramica }) {
  return (
    <div className="rounded-2xl border border-[#e3e6df] bg-white px-5 py-4">
      <div className="grid grid-cols-[1fr_260px_170px] items-center gap-5">
        <div className="min-w-0">
          <Link href={`/comercial/oportunidades/${o.opp.id}`} className="text-[15.5px] font-bold text-carbon hover:underline">
            {o.opp.nombre}
          </Link>
          {o.comercial && <span className="ml-2 text-[13px] text-carbon/60">{o.comercial}</span>}
        </div>
        <Barra total={o.firmado} facturado={o.facturado} cobrado={o.cobrado} alto="h-3" />
        <div className="text-right tabular-nums">
          <div className="text-[15px] font-bold text-carbon">{o.queda > 0 ? `queda ${eur(o.queda)}` : "cobrada entera"}</div>
          <div className="text-[12.5px] text-carbon/60">
            cobrado {eur(o.cobrado)} de {eur(o.firmado)}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1.5 border-t border-black/5 pt-3">
        {o.lineas.map((l) => (
          <Linea key={l.id} l={l} />
        ))}
      </div>
    </div>
  );
}

function Linea({ l }: { l: LineaPanoramica }) {
  const total = l.importe ?? 0;
  return (
    <div className="grid grid-cols-[110px_1fr_90px_260px_170px] items-center gap-5 text-[13.5px]">
      <span className="text-[12.5px] text-carbon/60" title={`Firmada el ${fecha(l.fecha_firma)}`}>
        {l.hoja}
      </span>
      <span className="min-w-0 truncate text-carbon/90" title={l.descripcion ?? ""}>
        {l.descripcion || "Línea sin concepto"}
      </span>
      <span className="text-right font-semibold tabular-nums text-carbon/80">
        {l.a_exito ? `${String(l.porcentaje ?? "").replace(".", ",")} %` : eur(total)}
      </span>
      {l.a_exito ? (
        <span className="text-[12.5px] font-semibold text-amber-800/80">a éxito: sin importe todavía</span>
      ) : (
        <Barra total={total} facturado={l.facturado} cobrado={l.cobrado} />
      )}
      <span className="text-right text-[12.5px] tabular-nums text-carbon/65">
        {l.cobrada ? <b className="text-lima-dark">✓ cobrada</b> : l.cobrado > 0 || l.facturado > 0 ? `cobrado ${eur(l.cobrado)}` : l.a_exito ? "" : "sin facturar"}
      </span>
    </div>
  );
}
