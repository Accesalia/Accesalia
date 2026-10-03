"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DatosMesa, Mesa } from "../../../lib/mesaViabilidades";
import { accionAvisarDaniel, accionCaptura, accionEnviar, accionGuardar, accionJuntar, accionModelo } from "../acciones";

// La mesa de Alex. Lo que decidio Monica (3-oct-2026):
//   · la captura del 3D va SIEMPRE, y sale de aqui con un boton;
//   · el .glb se puede bajar para SketchUp: "lo mira si es facil, lo mide si
//     empieza a ver problemas";
//   · un escaneo, una viabilidad... salvo cuando dos escaneos dan una conjunta:
//     una pestaña por escaneo y "Juntar otro escaneo";
//   · con varias escaleras, una caja de texto por escalera;
//   · los tres precios de una obra, al momento: PEM -> + 19% -> + 10% de IVA;
//   · Alex llega hasta donde llegue: el comercial lo completa despues.

const VISOR = "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js";

const etq = "block text-[10.5px] font-bold uppercase tracking-[0.06em] text-carbon/70";
const de = "ml-1.5 text-[10.5px] font-semibold normal-case tracking-normal text-carbon/50";
const campo =
  "w-full rounded-[10px] border border-carbon/25 bg-white px-3 py-2 text-[14px] text-carbon outline-none transition focus:border-lima-dark focus:ring-2 focus:ring-lima/40";
const bloque = "border-t border-black/[0.06] py-3 first:border-t-0 first:pt-0";
const ajeno =
  "inline-flex h-[30px] items-center justify-center rounded-[8px] border border-[#3f5f80] bg-ajeno px-3.5 text-[12px] font-bold uppercase tracking-wide text-white transition hover:bg-[#4a6d91] disabled:opacity-50";
const ajenoClaro =
  "inline-flex h-[30px] items-center justify-center rounded-[8px] border border-ajeno/40 bg-ajeno-soft px-3.5 text-[12px] font-bold uppercase tracking-wide text-[#3f5f80] transition hover:bg-[#dde7f1]";

const eur = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const numero = (s: string) => {
  const n = Number(s.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  return s.trim() && Number.isFinite(n) ? n : null;
};
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VisorEl = HTMLElement & { toDataURL: (tipo?: string) => string } & Record<string, any>;

export function MesaDeTrabajo({ m }: { m: Mesa }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();

  const [fecha, setFecha] = useState(m.fechaVisita ?? "");
  const [objeto, setObjeto] = useState(m.objeto);
  const [descripcion, setDescripcion] = useState(m.descripcion);
  const [conclusion, setConclusion] = useState(m.conclusion);
  const [pem, setPem] = useState(m.pem !== null ? m.pem.toLocaleString("es-ES") : "");
  const [bi, setBi] = useState(String(m.biPct));
  const [iva, setIva] = useState(String(m.ivaPct));
  const [especifico, setEspecifico] = useState(m.especifico);
  const [modelo, setModelo] = useState(m.modeloId ?? "");
  const [escaleras, setEscaleras] = useState(m.escaleras);
  const [guardadoEn, setGuardadoEn] = useState(m.actualizada);
  const [sucio, setSucio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- el visor
  const [activo, setActivo] = useState(m.escaneos[0]?.id ?? null);
  const [modelos, setModelos] = useState<Record<string, string | null | "cargando">>({});
  const [captura, setCaptura] = useState(m.capturaUrl);
  const [capturando, setCapturando] = useState(false);
  const visor = useRef<VisorEl | null>(null);

  useEffect(() => {
    if (document.querySelector(`script[src="${VISOR}"]`)) return;
    const s = document.createElement("script");
    s.type = "module";
    s.src = VISOR;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!activo || modelos[activo] !== undefined) return;
    setModelos((x) => ({ ...x, [activo]: "cargando" }));
    accionModelo(activo)
      .then((url) => setModelos((x) => ({ ...x, [activo]: url })))
      .catch(() => setModelos((x) => ({ ...x, [activo]: null })));
  }, [activo, modelos]);

  const urlActiva = activo ? modelos[activo] : null;
  const escaneoActivo = m.escaneos.find((e) => e.id === activo) ?? null;

  /** La captura: lo que se ve en el visor ahora mismo. El lienzo del visor es
   *  transparente y en JPEG saldria NEGRO (visto el 3-oct), asi que se pinta
   *  encima de un fondo crema antes de exportar. */
  const guardarCaptura = async () => {
    const v = visor.current;
    if (!v) return;
    setCapturando(true);
    setError(null);
    try {
      const png = v.toDataURL("image/png");
      const img = new Image();
      await new Promise((ok, mal) => {
        img.onload = ok;
        img.onerror = mal;
        img.src = png;
      });
      const lienzo = document.createElement("canvas");
      lienzo.width = img.width;
      lienzo.height = img.height;
      const ctx = lienzo.getContext("2d")!;
      ctx.fillStyle = "#fffaf0";
      ctx.fillRect(0, 0, lienzo.width, lienzo.height);
      ctx.drawImage(img, 0, 0);
      const url = await accionCaptura(m.id, lienzo.toDataURL("image/jpeg", 0.85));
      setCaptura(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se ha podido guardar la captura");
    } finally {
      setCapturando(false);
    }
  };

  // ---- los precios
  const pemN = numero(pem);
  const biN = numero(bi) ?? 0;
  const ivaN = numero(iva) ?? 0;
  const sinIva = pemN !== null ? pemN * (1 + biN / 100) : null;
  const conIva = sinIva !== null ? sinIva * (1 + ivaN / 100) : null;

  const datos = (): DatosMesa => ({
    fechaVisita: fecha || null,
    objeto,
    descripcion,
    conclusion,
    pem: pemN,
    biPct: biN,
    ivaPct: ivaN,
    modeloId: modelo || null,
    especifico,
    escaleras: escaleras.map((e) => ({ accesoId: e.accesoId, texto: e.texto })),
  });

  const tocar = <T,>(f: (v: T) => void) => (v: T) => {
    f(v);
    setSucio(true);
  };

  const guardar = () =>
    empezar(async () => {
      setError(null);
      try {
        setGuardadoEn(await accionGuardar(m.id, datos()));
        setSucio(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se ha podido guardar");
      }
    });

  return (
    <>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4 border-b border-black/10 pb-3.5">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-carbon/45">Viabilidad</div>
          <h1 className="text-[25px] font-bold leading-tight text-carbon">{m.direccion}</h1>
          <div className="mt-1 text-[13px] text-carbon/60">
            {[m.opp?.codigo ? `Opp ${m.opp.codigo}` : null, m.opp?.comercial ? `comercial ${m.opp.comercial}` : null, m.escalerasTexto || null, m.escaneos.length > 1 ? `${m.escaneos.length} escaneos` : null]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-amber-800">
          {m.enviada ? "enviada al comercial" : sucio ? "sin guardar" : `borrador · guardado a las ${hora(guardadoEn)}`}
        </span>
      </div>

      {m.danielAvisado && (
        <div className="mt-3 rounded-[10px] border border-amber-300 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
          <b>Daniel está avisado</b> de que esta viabilidad se ha atascado.
        </div>
      )}
      {error && <div className="mt-3 rounded-[10px] border border-alerta/40 bg-[#fbeeee] px-4 py-2.5 text-[13px] text-alerta">{error}</div>}

      <div className="mt-[18px] grid items-start gap-5 lg:grid-cols-2">
        {/* ===================== izquierda: el edificio ===================== */}
        <div className="rounded-2xl border border-black/5 bg-white p-3.5 shadow-sm">
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {m.escaneos.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setActivo(e.id)}
                className={
                  "rounded-lg border px-3 py-1.5 text-[12px] font-bold " +
                  (e.id === activo ? "border-[#3f5f80] bg-ajeno text-white" : "border-ajeno/40 bg-white text-[#3f5f80]")
                }
              >
                Escaneo {e.fecha ? e.fecha.split("-").reverse().slice(0, 2).join("/") : ""}
                {e.escaleras ? ` · ${e.escaleras}` : ""}
              </button>
            ))}
            {m.paraJuntar.length > 0 && (
              <select
                value=""
                onChange={(x) => {
                  const esc = x.target.value;
                  if (!esc) return;
                  empezar(async () => {
                    await accionJuntar(m.id, esc);
                    router.refresh();
                  });
                }}
                className="rounded-lg border border-dashed border-ajeno/60 bg-transparent px-2.5 py-1.5 text-[12px] font-bold text-[#3f5f80]"
              >
                <option value="">+ Juntar otro escaneo</option>
                {m.paraJuntar.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.texto}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="relative flex h-[380px] items-center justify-center overflow-hidden rounded-xl border border-ajeno/30 bg-[#fffaf0]">
            {urlActiva === "cargando" || urlActiva === undefined ? (
              <p className="text-[13px] text-carbon/55">Abriendo el escaneo… la primera vez tarda un poco.</p>
            ) : urlActiva === null ? (
              <p className="max-w-[34ch] text-center text-[13px] text-carbon/60">
                Este escaneo no se puede ver aquí: el fichero no trae un .glb completo. Descárgalo o ábrelo en Polycam.
              </p>
            ) : (
              <>
                {/* @ts-expect-error: model-viewer es un elemento web, no de React */}
                <model-viewer
                  ref={visor}
                  key={urlActiva}
                  src={urlActiva}
                  camera-controls=""
                  shadow-intensity="1"
                  style={{ width: "100%", height: "100%", background: "transparent" }}
                />
                <span className="pointer-events-none absolute bottom-2 left-3 text-[11px] text-carbon/50">
                  Arrastra para girar · rueda para acercar
                </span>
              </>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap gap-2">
            <button type="button" onClick={guardarCaptura} disabled={capturando || typeof urlActiva !== "string" || urlActiva === "cargando"} className={ajeno}>
              {capturando ? "Guardando…" : "Guardar captura"}
            </button>
            {typeof urlActiva === "string" && urlActiva !== "cargando" && (
              <a href={`${urlActiva}&download=${encodeURIComponent((escaneoActivo?.nombre ?? "escaneo").replace(/\.\w+$/, "") + ".glb")}`} className={ajenoClaro}>
                Descargar .glb (SketchUp)
              </a>
            )}
            {escaneoActivo?.descargar && !(typeof urlActiva === "string" && urlActiva !== "cargando") && (
              <a href={escaneoActivo.descargar} className={ajenoClaro}>
                Descargar el original
              </a>
            )}
            {escaneoActivo?.rutaPolycam && (
              <a href={escaneoActivo.rutaPolycam} target="_blank" rel="noreferrer" className={ajenoClaro}>
                Abrir en Polycam
              </a>
            )}
          </div>

          {captura ? (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-lima/40 bg-lima-soft p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={captura} alt="La captura" className="h-20 w-[120px] rounded-md border-2 border-[#c6dc9f] bg-[#fffaf0] object-cover" />
              <div className="text-[12.5px] leading-snug text-lima-dark">
                <b className="block text-[13px]">Esta es la que irá en la viabilidad</b>
                Si guardas otra, sustituye a esta.
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-900">
              Falta la captura: gira el modelo hasta el ángulo bueno y pulsa <b>Guardar captura</b>. Va siempre en la viabilidad.
            </div>
          )}
        </div>

        {/* ===================== derecha: lo que escribe Alex ===================== */}
        <div className="rounded-2xl border border-black/5 bg-white px-[18px] py-4 shadow-sm">
          <div className={bloque + " grid grid-cols-2 gap-3"}>
            <label>
              <span className={etq}>
                Fecha de visita<span className={de}>del escaneo</span>
              </span>
              <input type="date" value={fecha} onChange={(x) => tocar(setFecha)(x.target.value)} className={campo + " mt-1"} />
            </label>
            <div>
              <span className={etq}>
                Proyecto<span className={de}>de la opp</span>
              </span>
              <div className="mt-1.5 text-[14px] text-carbon/85">{m.opp?.proyecto ?? <span className="text-amber-700/70">la opp no dice el tipo</span>}</div>
            </div>
          </div>

          <div className={bloque}>
            <span className={etq}>El 3D para la junta</span>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {[
                { v: false, t: "Lo cubre uno del catálogo" },
                { v: true, t: "Hace falta uno específico" },
              ].map((o) => (
                <label
                  key={String(o.v)}
                  className={
                    "flex cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2 text-[13.5px] " +
                    (especifico === o.v ? "border-[#3f5f80] bg-ajeno-soft font-semibold" : "border-carbon/20 bg-white")
                  }
                >
                  <input type="radio" checked={especifico === o.v} onChange={() => tocar(setEspecifico)(o.v)} className="accent-[#3f5f80]" />
                  {o.t}
                </label>
              ))}
            </div>
            {!especifico && (
              <select value={modelo} onChange={(x) => tocar(setModelo)(x.target.value)} className={campo + " mt-2"}>
                <option value="">— elige cuál —</option>
                {m.catalogo.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} · {c.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className={bloque}>
            <span className={etq}>Objeto del proyecto</span>
            <textarea rows={2} value={objeto} onChange={(x) => tocar(setObjeto)(x.target.value)} className={campo + " mt-1 resize-y"} />
          </div>

          <div className={bloque}>
            <span className={etq}>
              Descripción de las intervenciones{escaleras.length > 0 && <span className={de}>lo común, y una por escalera</span>}
            </span>
            <textarea rows={escaleras.length ? 2 : 4} value={descripcion} onChange={(x) => tocar(setDescripcion)(x.target.value)} className={campo + " mt-1 resize-y"} />
            {escaleras.map((e, i) => (
              <div key={e.accesoId} className="mt-2">
                <div className="mb-1 text-[12px] font-extrabold text-[#3f5f80]">{e.nombre}</div>
                <textarea
                  rows={3}
                  value={e.texto}
                  onChange={(x) => {
                    const t = x.target.value;
                    setEscaleras((l) => l.map((y, k) => (k === i ? { ...y, texto: t } : y)));
                    setSucio(true);
                  }}
                  className={campo + " resize-y"}
                />
              </div>
            ))}
          </div>

          <div className={bloque}>
            <span className={etq}>Presupuesto de ejecución material estimado</span>
            <div className="mt-1 grid grid-cols-[150px_1fr] items-start gap-3">
              <input value={pem} onChange={(x) => tocar(setPem)(x.target.value)} placeholder="350.000" inputMode="decimal" className={campo} />
              <div className="rounded-xl border border-black/[0.08] bg-[#fafaf8] px-3 py-2 text-[13px] leading-[1.75]">
                <div className="flex justify-between gap-2.5">
                  <span>PEM</span>
                  <b className="tabular-nums">{pemN !== null ? eur(pemN) : "—"}</b>
                </div>
                <div className="flex items-center justify-between gap-2.5">
                  <span>
                    +{" "}
                    <input value={bi} onChange={(x) => tocar(setBi)(x.target.value)} className="w-9 rounded border border-carbon/20 px-1 text-center text-[12px]" />
                    % beneficio industrial · obra sin IVA
                  </span>
                  <b className="tabular-nums">{sinIva !== null ? eur(sinIva) : "—"}</b>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2.5 border-t border-black/10 pt-0.5 font-extrabold">
                  <span>
                    +{" "}
                    <input value={iva} onChange={(x) => tocar(setIva)(x.target.value)} className="w-9 rounded border border-carbon/20 px-1 text-center text-[12px] font-normal" />
                    % IVA · lo que pagan
                  </span>
                  <b className="tabular-nums">{conIva !== null ? eur(conIva) : "—"}</b>
                </div>
              </div>
            </div>
          </div>

          <div className={bloque}>
            <span className={etq}>Conclusión</span>
            <textarea rows={2} value={conclusion} onChange={(x) => tocar(setConclusion)(x.target.value)} className={campo + " mt-1 resize-y"} />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-3.5">
            <button
              type="button"
              disabled={pendiente || m.danielAvisado}
              onClick={() =>
                empezar(async () => {
                  await accionAvisarDaniel(m.id, datos());
                  setSucio(false);
                  router.refresh();
                })
              }
              className="whitespace-nowrap rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-[13px] font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
            >
              {m.danielAvisado ? "Daniel ya está avisado" : "Me he atascado: avisar a Daniel"}
            </button>
            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={pendiente}
                onClick={guardar}
                className="whitespace-nowrap rounded-xl border border-black/10 bg-white px-[18px] py-2.5 text-[14px] font-semibold text-carbon/75 transition hover:text-carbon disabled:opacity-50"
              >
                {pendiente ? "Guardando…" : "Guardar borrador"}
              </button>
              <button
                type="button"
                disabled={pendiente || m.enviada}
                onClick={() => empezar(async () => accionEnviar(m.id, datos()))}
                className="whitespace-nowrap rounded-xl bg-lima px-5 py-2.5 text-[14px] font-extrabold text-carbon transition hover:bg-lima-dark hover:text-white disabled:opacity-50"
              >
                Enviar al comercial
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
