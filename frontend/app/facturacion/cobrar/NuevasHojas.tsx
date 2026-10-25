"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DestinoHoja, EnvioDuda, FilaNueva, HojaAbierta, LineaAbierta } from "../../../lib/nuevasHojas";
import {
  abrir, accionAnadirHito, accionAnadirLinea, accionCorregirHito, accionCorregirLinea, accionDuda, accionPasar, accionQuitarHito, accionQuitarLinea,
  accionResolverDuda, accionValidar,
} from "./acciones";

// NUEVAS HOJAS ENCARGO FIRMADAS (Monica, 12-oct-2026), tal como la maqueta
// validada (docs/figma/area-dinero-v1.html, pantalla 1). La lista, con lo minimo
// para saber por donde empezar; al pinchar una fila se despliegan debajo la hoja
// firmada y, al otro lado, cada linea con su importe y debajo sus hitos. Se
// corrige pinchando en el dato; siempre queda dicho quien lo toco.

// 25-oct-2026 (maqueta docs/figma/recorrido-hoja-firmada.html): validarlo todo ya no la saca de la lista. Con todas
// las lineas validadas se abren los dos destinos («Pasa a cobro del primer hito» / «Pasa a produccion ya», con
// motivo) y sale al pulsar uno; queda en el diario por si hay que devolverla. Las dudas se guardan y, si se quiere,
// se envian al comercial o a «Revisar por direccion».

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });
const HORA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const fecha = (iso: string) => FECHA.format(new Date(iso.slice(0, 10) + "T00:00:00Z"));
const cuando = (iso: string) => HORA.format(new Date(iso));
const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const eur = (n: number | null) => (n == null ? "" : EUR.format(n));
const pct = (n: number | null) => (n == null ? "" : String(n).replace(".", ","));

export function NuevasHojas({ filas, inicial }: { filas: FilaNueva[]; inicial?: { id: string; hoja: HojaAbierta } }) {
  const [abierta, setAbierta] = useState<string | null>(inicial?.id ?? null);
  const [hoja, setHoja] = useState<HojaAbierta | null>(inicial?.hoja ?? null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, empezar] = useTransition();
  const [hecho, setHecho] = useState<string | null>(null);
  const router = useRouter();

  function pinchar(id: string) {
    if (abierta === id) return setAbierta(null);
    setAbierta(id);
    setHoja(null);
    setError(null);
    empezar(async () => {
      const r = await abrir(id);
      if (r.error) setError(r.error);
      else setHoja(r.hoja ?? null);
    });
  }

  /** Cada cambio devuelve la hoja ya cambiada; la lista se recalcula detras. */
  function cambiar(p: Promise<{ hoja?: HojaAbierta | null; error?: string }>) {
    empezar(async () => {
      const r = await p;
      if (r.error) {
        setError(r.error);
        if (r.hoja) setHoja(r.hoja);
      } else {
        setError(null);
        setHoja(r.hoja ?? null);
        router.refresh();
      }
    });
  }

  /** Elegido el destino: la hoja sale de la lista. */
  function pasar(destino: "a_cobro" | "a_produccion", motivo: string) {
    if (!hoja) return;
    const f = filas.find((x) => x.id === hoja.id);
    empezar(async () => {
      const r = await accionPasar(hoja.id, destino, motivo);
      if (r.error) return setError(r.error);
      setError(null);
      setAbierta(null);
      setHoja(null);
      setHecho(`${f?.direccion ?? "La hoja"} ha pasado a ${destino === "a_cobro" ? "Primer cobro" : "la bandeja comercial"}.`);
      router.refresh();
    });
  }

  const pendientes = filas.reduce((s, f) => s + (f.lineas - f.validadas), 0);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <h1 className="text-[28px] font-bold leading-tight text-carbon">Nuevas Hojas Encargo Firmadas</h1>
        <Link href="/facturacion/cobrar/diario" className="text-[14px] font-bold text-lima-dark hover:underline">
          Diario de trabajo →
        </Link>
      </div>
      <p className="mt-1 text-[14.5px] text-carbon/65">
        {filas.length} hojas firmadas · {pendientes} líneas por validar · cuando se vacía, todo está listo para trabajar
      </p>
      {hecho && (
        <div className="mt-3 w-fit max-w-full rounded-xl border border-lima/40 bg-lima-soft px-4 py-2 text-[13.5px] text-carbon">
          {hecho}{" "}
          <Link href="/facturacion/cobrar/diario" className="font-bold text-lima-dark hover:underline">
            Está en el diario
          </Link>{" "}
          por si hay que devolverla.
        </div>
      )}

      {/* REGLA 8 (Monica, 18-oct): la lista mide lo que su texto; con una hoja
          abierta (el PDF al lado de lo extraido) se abre a todo el ancho. */}
      <div className={`mt-5 overflow-hidden rounded-2xl border border-black/10 bg-white ${abierta ? "w-full" : "w-fit max-w-full"}`}>
        {filas.map((f) => {
          const on = abierta === f.id;
          return (
            <div key={f.id}>
              <button
                type="button"
                onClick={() => pinchar(f.id)}
                className={`block w-full border-b border-black/5 py-3.5 pl-[18px] pr-8 text-left transition ${on ? "bg-[#f3f9ec] shadow-[inset_4px_0_0_#7ac943]" : "hover:bg-[#fafbf9]"}`}
              >
                <div className="text-[15px] font-bold text-carbon">{f.direccion}</div>
                <div className="mt-0.5 text-[13px] text-carbon/60">
                  {f.numero} · recibida firmada el {fecha(f.fechaFirma)} · hace {f.dias} días{f.comercial ? ` · ${f.comercial}` : ""}
                </div>
                <div className="mt-2.5 flex w-[360px] max-w-full items-center gap-2.5 text-[12.5px] text-carbon/70">
                  <span className="whitespace-nowrap">
                    {f.validadas} de {f.lineas} {f.lineas === 1 ? "línea" : "líneas"}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded bg-[#e9ece5]">
                    <span className="block h-full bg-lima" style={{ width: `${f.lineas ? (100 * f.validadas) / f.lineas : 0}%` }} />
                  </span>
                  {f.dudas > 0 && (
                    <span className="whitespace-nowrap rounded-full bg-[#fbefd0] px-2 py-0.5 text-[12px] font-bold text-[#875f07]">
                      {f.dudas} {f.dudas === 1 ? "duda" : "dudas"}
                    </span>
                  )}
                  {f.lineas > 0 && f.validadas === f.lineas && (
                    <span className="whitespace-nowrap rounded-full border border-[#f2d48a] bg-[#fff8e1] px-2 py-0.5 text-[12px] font-bold text-[#7a5a10]">
                      falta elegir a dónde va
                    </span>
                  )}
                </div>
                {f.devuelta !== null && (
                  <div className="mt-1.5 text-[12.5px] text-alerta">Devuelta desde el diario{f.devuelta ? `: «${f.devuelta}»` : ""}</div>
                )}
              </button>
              {on && (
                <div className="border-b border-black/10">
                  {error && <div className="bg-[#f6dfdd] px-5 py-2 text-[13px] font-semibold text-alerta">{error}</div>}
                  {!hoja ? (
                    <div className="px-5 py-8 text-center text-[13.5px] text-carbon/60">{cargando ? "Abriendo la hoja…" : "No se ha podido abrir."}</div>
                  ) : (
                    <Desplegada hoja={hoja} cambiar={cambiar} ocupado={cargando} pasar={pasar} />
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div className="px-5 py-5 text-center text-[13px] text-carbon/65">Salen de aquí cuando se elige a dónde va cada una.</div>
      </div>
    </>
  );
}

type Cambiar = (p: Promise<{ hoja?: HojaAbierta | null; error?: string }>) => void;

type Pasar = (destino: "a_cobro" | "a_produccion", motivo: string) => void;

function Desplegada({ hoja, cambiar, ocupado, pasar }: { hoja: HojaAbierta; cambiar: Cambiar; ocupado: boolean; pasar: Pasar }) {
  const faltan = hoja.lineas.filter((l) => !l.validada).length;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col gap-3 bg-[#e9ebe6] p-5">
        <div className="flex items-center justify-between text-[13px] text-carbon/70">
          <b>Hoja de encargo firmada · {hoja.numero}</b>
          {hoja.pdf && (
            <a href={hoja.pdf} target="_blank" rel="noreferrer" className="font-semibold text-lima-dark hover:underline">
              Abrir aparte ↗
            </a>
          )}
        </div>
        {hoja.pdf ? (
          <iframe src={hoja.pdf} title={`Hoja firmada ${hoja.numero}`} className="h-[780px] w-full rounded bg-white shadow" />
        ) : (
          <div className="rounded bg-white p-8 text-center text-[13.5px] text-carbon/60">Esta hoja no tiene el PDF firmado subido.</div>
        )}
      </div>
      <div className={`flex flex-col gap-3.5 bg-[#f0f1ee] p-5 ${ocupado ? "opacity-70" : ""}`}>
        <div className="text-[15px]">
          <b>Lo extraído</b> <span className="text-[12.5px] text-carbon/55">· pincha en cualquier dato para corregirlo</span>
        </div>
        {hoja.devuelta !== null && (
          <div className="rounded-[10px] border border-[#e8c3c1] bg-[#f6dfdd] px-3.5 py-2.5 text-[13px] text-alerta">
            Devuelta desde el diario{hoja.devuelta ? `: «${hoja.devuelta}»` : ""}. Corrige lo que haga falta y vuelve a elegir a dónde va.
          </div>
        )}
        {hoja.lineas.map((l, i) => (
          <Linea key={l.id} n={i + 1} l={l} cambiar={cambiar} hojaId={hoja.id} />
        ))}
        <button
          type="button"
          onClick={() => cambiar(accionAnadirLinea(hoja.id))}
          className="rounded-[10px] border-[1.5px] border-dashed border-[#c9cdc4] bg-[#fafbf9] px-3.5 py-3 text-left text-[13.5px] font-bold text-lima-dark hover:border-lima"
        >
          + Añadir línea <span className="font-normal text-carbon/55">· si la app se ha saltado una de la hoja</span>
        </button>
        <Destino faltan={faltan} destino={hoja.destino} pasar={pasar} ocupado={ocupado} />
      </div>
    </div>
  );
}

/** Un dato que se corrige pinchando: parece texto; al salir del campo, se guarda.
 *  Los textos largos (concepto, cuando se cobra) crecen hacia abajo, sin cortarse. */
function Dato({ valor, onGuardar, pista, ancho, derecha, apagado, largo }: { valor: string; onGuardar: (v: string) => void; pista: string; ancho?: string; derecha?: boolean; apagado?: boolean; largo?: boolean }) {
  const [v, setV] = useState(valor);
  useEffect(() => setV(valor), [valor]);
  const clase = `rounded bg-transparent px-1 py-0.5 outline-none placeholder:font-normal placeholder:text-carbon/40 hover:bg-[#fff3c4] focus:bg-white focus:ring-2 focus:ring-lima ${ancho ?? "w-full"} ${derecha ? "text-right" : ""}`;
  if (apagado) return <span className={derecha ? "inline-block text-right" : ""}>{valor}</span>;
  if (largo)
    return (
      <textarea
        value={v}
        rows={1}
        placeholder={pista}
        ref={(el) => {
          if (el) {
            el.style.height = "auto";
            el.style.height = `${el.scrollHeight}px`;
          }
        }}
        onChange={(e) => {
          setV(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        onBlur={() => v !== valor && onGuardar(v)}
        className={`${clase} block resize-none overflow-hidden leading-snug`}
      />
    );
  return (
    <input
      value={v}
      placeholder={pista}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== valor && onGuardar(v)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={clase}
    />
  );
}

/** A DONDE VA LA HOJA (25-oct-2026): con todo validado, uno de los dos destinos. Al pulsar, sale de la lista. */
function Destino({ faltan, destino, pasar, ocupado }: { faltan: number; destino: DestinoHoja | null; pasar: Pasar; ocupado: boolean }) {
  const [elegido, setElegido] = useState<"a_cobro" | "a_produccion" | null>(null);
  const [motivo, setMotivo] = useState("");
  const abierto = faltan === 0 && !!destino;
  const opcion = "flex flex-col gap-1 rounded-xl border-[1.5px] bg-white p-3 text-left disabled:cursor-not-allowed disabled:opacity-45";
  const marcada = "border-lima-dark shadow-[inset_0_0_0_1px_#3f7a1c]";
  return (
    <div className={`flex flex-col gap-3 rounded-xl border border-black/10 p-3.5 ${abierto ? "bg-white" : "bg-[#fafbf9]"}`}>
      <div className="text-[15px] font-bold text-carbon">¿A dónde va esta hoja?</div>
      <div className="text-[13px] text-carbon/65">
        {abierto
          ? "Todo validado. Al elegir, sale de esta lista y queda en el diario por si hay que devolverla."
          : `Se elige cuando estén todas las líneas validadas: ${faltan === 1 ? "falta 1" : `faltan ${faltan}`}.`}
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <button type="button" disabled={!abierto || ocupado} onClick={() => setElegido("a_cobro")}
          className={`${opcion} ${elegido === "a_cobro" ? marcada : "border-black/15 hover:border-lima-dark"}`}>
          <b className="text-[14.5px] text-lima-dark">Pasa a cobro del primer hito</b>
          <span className="text-[12.5px] text-carbon/65">Va a Primer cobro. La producción empieza cuando se sube el justificante.</span>
        </button>
        <button type="button" disabled={!abierto || ocupado} onClick={() => setElegido("a_produccion")}
          className={`${opcion} ${elegido === "a_produccion" ? marcada : "border-black/15 hover:border-lima-dark"}`}>
          <b className="text-[14.5px] text-ajeno">Pasa a producción ya</b>
          <span className="text-[12.5px] text-carbon/65">Va a la bandeja comercial sin esperar al cobro. Con motivo.</span>
        </button>
      </div>
      {abierto && elegido === "a_cobro" && destino && (
        <div className="flex flex-col gap-2 rounded-[10px] border border-[#e9c44a] bg-[#fff5cc] px-3 py-2.5 text-[13px]">
          <div>Va a <b>Primer cobro</b>. Paga {destino.paga}.</div>
          {destino.lineasAlContratar ? (
            <div className="rounded-lg bg-lima-soft px-3 py-2 text-carbon/80">
              Al contratar se cobran <b>{EUR.format(destino.alContratar)} €</b> + IVA ({destino.lineasAlContratar === 1 ? "1 línea" : `${destino.lineasAlContratar} líneas`}).
              {destino.esperan.length ? ` Las demás esperan a su hito: ${destino.esperan.join(" · ")}.` : ""}
            </div>
          ) : (
            <div className="rounded-lg border border-[#f2d48a] bg-[#fff8e1] px-3 py-2 text-[#7a5a10]">
              Ninguna línea se cobra al contratar: si pasa a cobro, esperará a su primer hito. Si tiene que empezar ya, es «Pasa a producción ya».
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setElegido(null)} className="h-8 rounded-lg border border-black/15 bg-white px-3 text-[12.5px] font-bold text-carbon">Cancelar</button>
            <button type="button" disabled={ocupado} onClick={() => pasar("a_cobro", "")} className="h-8 rounded-lg bg-lima px-3 text-[12.5px] font-bold text-[#1f3a0c] disabled:opacity-40">Pasar a cobro</button>
          </div>
        </div>
      )}
      {abierto && elegido === "a_produccion" && (
        <div className="flex flex-col gap-2 rounded-[10px] border border-[#e9c44a] bg-[#fff5cc] px-3 py-2.5 text-[13px]">
          <label htmlFor="motivo-produccion" className="text-[10px] font-extrabold uppercase tracking-[.06em] text-carbon/70">¿Por qué empieza sin cobrar?</label>
          <textarea id="motivo-produccion" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2}
            placeholder="Contrata que paga al final, prisa del comercial por la subvención…"
            className="resize-y rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-[13px] outline-none placeholder:text-carbon/55 focus:border-lima" />
          <div className="text-[12.5px] text-carbon/65">El primer hito sigue saliendo en facturación como pendiente de cobrar.</div>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setElegido(null)} className="h-8 rounded-lg border border-black/15 bg-white px-3 text-[12.5px] font-bold text-carbon">Cancelar</button>
            <button type="button" disabled={ocupado || !motivo.trim()} onClick={() => pasar("a_produccion", motivo)} className="h-8 rounded-lg bg-lima px-3 text-[12.5px] font-bold text-[#1f3a0c] disabled:opacity-40">Pasar a producción</button>
          </div>
        </div>
      )}
    </div>
  );
}

const ENVIADA: Record<"comercial" | "direccion", string> = { comercial: "al comercial", direccion: "a revisar por dirección" };

function Linea({ n, l, cambiar, hojaId }: { n: number; l: LineaAbierta; cambiar: Cambiar; hojaId: string }) {
  const [duda, setDuda] = useState<string | null>(null);
  const ok = !!l.validada;
  // Lo firmado (concepto, importe, %) no se corrige aqui; los hitos si.
  const fijo = ok || l.fija;
  const sumaHitos = l.hitos.reduce((s, h) => s + (h.importe ?? 0), 0);
  const cuadra = l.importe == null || l.esPorcentaje || Math.abs(sumaHitos - l.importe) < 0.005;
  const sePuedeValidar = !!l.concepto.trim() && l.hitos.length > 0 && cuadra;
  const quien = ok
    ? l.validada!.por ? `Validada por ${l.validada!.por} · ${cuando(l.validada!.en)}` : "Validada en la carga"
    : l.manual && l.creadaPor
      ? `Añadida a mano por ${l.creadaPor}`
      : l.editada ? `Corregida por ${l.editada.por ?? "alguien"} · ${cuando(l.editada.en)}` : "";

  return (
    <div className={`overflow-hidden rounded-[10px] border bg-white ${ok ? "border-[#bfe0a1]" : "border-[#ecdcae]"}`}>
      <div className={`grid grid-cols-[22px_1fr_auto_auto] items-baseline gap-2.5 border-b px-3.5 py-2.5 ${ok ? "border-[#d6ecc2] bg-[#f1f9e9]" : "border-[#f1e6c6] bg-[#fdf8ec]"}`}>
        <span className="text-[13px] font-extrabold text-lima-dark">{n}</span>
        <div className="text-[14px] font-bold text-carbon">
          <Dato largo valor={l.concepto} pista="Concepto, como dice la hoja" apagado={fijo} onGuardar={(v) => cambiar(accionCorregirLinea(l.id, "concepto", v))} />
        </div>
        <div className="whitespace-nowrap text-[14px] font-bold tabular-nums text-carbon">
          {l.esPorcentaje ? (
            <>
              <Dato valor={pct(l.porcentaje)} pista="%" ancho="w-14" derecha apagado={fijo} onGuardar={(v) => cambiar(accionCorregirLinea(l.id, "porcentaje", v))} /> %{" "}
              <span className="text-[12.5px] font-normal text-carbon/55">{l.base ? `del ${l.base}` : "a éxito"}</span>
            </>
          ) : (
            <>
              <Dato valor={eur(l.importe)} pista="Importe" ancho="w-24" derecha apagado={fijo} onGuardar={(v) => cambiar(accionCorregirLinea(l.id, "importe", v))} /> €{" "}
              <span className="text-[12.5px] font-normal text-carbon/55">+ IVA{l.porcentaje ? ` y ${pct(l.porcentaje)} %` : ""}</span>
            </>
          )}
        </div>
        {ok ? (
          <span className="rounded-full bg-[#cfe9b6] px-2.5 py-0.5 text-[12.5px] font-extrabold text-[#24500c]">✓ Validada</span>
        ) : l.fija ? (
          <span title="Es de la hoja firmada: no se quita. Si sobra, pon una duda." className="text-[11px] text-carbon/45">de la hoja</span>
        ) : (
          <button type="button" title="Quitar la línea (no está en la hoja)" onClick={() => confirm("¿Quitar esta línea? No está en la hoja firmada.") && cambiar(accionQuitarLinea(l.id))} className="text-[12px] text-carbon/35 hover:text-alerta">
            ✕
          </button>
        )}
      </div>

      <div className="py-1.5 pl-[46px] pr-3.5">
        <div className="grid grid-cols-[1fr_60px_100px_18px] gap-2.5 border-b border-[#e9ece5] py-1.5 text-[10.5px] font-bold uppercase tracking-[.08em] text-carbon/55">
          <span>Hito</span>
          <span className="text-right">%</span>
          <span className="text-right">Importe</span>
          <span />
        </div>
        {l.hitos.map((h) => (
          <div key={h.id} className="grid grid-cols-[1fr_60px_100px_18px] items-baseline gap-2.5 border-b border-[#f0f2ee] py-1 text-[13px] last:border-0">
            <Dato largo valor={h.texto} pista="Cuándo se cobra" apagado={ok} onGuardar={(v) => cambiar(accionCorregirHito(h.id, "texto", v))} />
            <Dato valor={pct(h.porcentaje)} pista="%" derecha apagado={ok} onGuardar={(v) => cambiar(accionCorregirHito(h.id, "porcentaje", v))} />
            {h.importe == null && (l.esPorcentaje || l.porcentaje) && ok ? (
              <span className="text-right text-carbon/55">a éxito</span>
            ) : (
              <Dato valor={eur(h.importe)} pista={l.esPorcentaje ? "a éxito" : "Importe"} derecha apagado={ok} onGuardar={(v) => cambiar(accionCorregirHito(h.id, "importe", v))} />
            )}
            {ok ? <span /> : (
              <button type="button" title="Quitar el hito" onClick={() => cambiar(accionQuitarHito(h.id))} className="text-right text-[12px] text-carbon/35 hover:text-alerta">
                ✕
              </button>
            )}
          </div>
        ))}
        {!ok && (
          <button type="button" onClick={() => cambiar(accionAnadirHito(l.id))} className="py-2 text-[12.5px] font-bold text-lima-dark">
            + añadir hito
          </button>
        )}
      </div>

      {!ok && !cuadra && (
        <div className="mb-1 ml-[46px] mr-3.5 rounded-lg border border-[#ecd39a] bg-[#fdf3d8] px-2.5 py-1.5 text-[12.5px] text-[#7a5a10]">
          Los hitos suman {eur(sumaHitos)} € de {eur(l.importe)} €: cuadra los importes para poder validar.
        </div>
      )}
      {l.dudas.map((d) => (
        <div key={d.id} className="mx-3.5 mb-1.5 ml-[46px] flex items-start justify-between gap-3 rounded-lg border border-[#f0dfa8] bg-[#fffaeb] px-3 py-2 text-[13px] text-[#6b5210]">
          <span>
            «{d.texto}» <span className="text-[12px] opacity-75">— {d.autor ?? "alguien"}, {fecha(d.fecha)}</span>
            {d.enviada && (
              <span className="mt-0.5 block text-[12px] font-bold">
                ✉ Enviada {ENVIADA[d.enviada.a]} ({d.enviada.para.join(", ")}) · {cuando(d.enviada.en)}
              </span>
            )}
          </span>
          <button type="button" onClick={() => cambiar(accionResolverDuda(d.id))} className="shrink-0 rounded-md border border-[#e0c97f] bg-white px-2 py-0.5 text-[12px] font-bold">
            Resuelta
          </button>
        </div>
      ))}
      {duda !== null && (
        <div className="mx-3.5 mb-2 ml-[46px] flex flex-col gap-2 rounded-[10px] border border-[#e9c44a] bg-[#fff5cc] p-2.5">
          <textarea
            autoFocus
            value={duda}
            rows={2}
            onChange={(e) => setDuda(e.target.value)}
            placeholder="¿Qué duda tienes? («¿la CSS va incluida?»)"
            className="resize-y rounded-lg border border-[#e0c97f] bg-white px-2.5 py-1.5 text-[13px] outline-none placeholder:text-carbon/55 focus:border-lima"
          />
          <div className="text-[12px] text-carbon/65">
            Se guarda en la línea. Si la envías, sale un correo desde facturación con la duda y el enlace a esta hoja; la respuesta te llega a ti.
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            <button type="button" onClick={() => setDuda(null)} className="h-7 rounded-lg border border-black/10 bg-white px-2.5 text-[12.5px] font-bold">
              Cancelar
            </button>
            {(["guardar", "comercial", "direccion"] as EnvioDuda[]).map((e) => (
              <button
                key={e}
                type="button"
                disabled={!duda.trim()}
                onClick={() => {
                  cambiar(accionDuda(l.id, duda, e, hojaId));
                  setDuda(null);
                }}
                className="h-7 rounded-lg bg-[#f2c14e] px-2.5 text-[12.5px] font-bold text-carbon disabled:opacity-40"
              >
                {e === "guardar" ? "Solo guardar" : e === "comercial" ? "Enviar al comercial" : "Revisar por dirección"}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-[#f0f2ee] px-3.5 py-2">
        <span className="mr-auto text-[12px] text-carbon/55">{quien}</span>
        {!ok && (
          <>
            <button type="button" onClick={() => setDuda("")} className="h-7 rounded-lg border border-black/15 bg-white px-3 text-[12.5px] font-bold text-carbon">
              Tengo una duda
            </button>
            <button
              type="button"
              disabled={!sePuedeValidar}
              onClick={() => cambiar(accionValidar(l.id))}
              className="h-7 rounded-lg bg-lima px-3 text-[12.5px] font-bold text-[#1f3a0c] disabled:opacity-40"
            >
              Validar línea
            </button>
          </>
        )}
      </div>
    </div>
  );
}
