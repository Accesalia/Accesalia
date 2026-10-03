"use client";

import { useEffect, useState, useTransition } from "react";
import type { BloqueCatalogo, Desglose } from "../../../lib/catalogoBloques";
import { accionActivar, accionGuardar, accionMover, accionRetirar } from "./acciones";

// La pantalla del catalogo, tal cual la maqueta que Monica aprobo el 3-oct-2026
// (docs/figma/catalogo-bloques.html): lista a la izquierda, bloque abierto a la
// derecha, y lo nuevo en amarillo.

const ETQ: Record<Desglose, string> = { no_aparece: "No aparece", incluido: "Incluido", se_cobra: "Se cobra" };
const PILD: Record<Desglose, string> = {
  se_cobra: "border-lima bg-lima-soft text-lima-dark",
  incluido: "border-[#9fb5cc] bg-ajeno-soft text-[#3d5a7a]",
  no_aparece: "border-[#d6d6d2] bg-[#f1f1ef] text-carbon/65",
};
const PISTA: Record<Desglose, string> = {
  no_aparece: "Su párrafo sale en la hoja, pero no tiene línea de precio.",
  incluido: "Sale en el desglose como «incluido», sin precio.",
  se_cobra: "Sale en el desglose con su importe y genera línea de facturación.",
};
const EUR = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2, useGrouping: "always" });
const euros = (n: number | null) => (n == null ? "" : EUR.format(n) + " €");

type Borrador = { id: string | null; nombreCorto: string; texto: string; desglose: Desglose; importe: string; usos: number };
const deBloque = (b: BloqueCatalogo): Borrador => ({
  id: b.id,
  nombreCorto: b.nombreCorto,
  texto: b.texto,
  desglose: b.desglose,
  importe: b.importe == null ? "" : EUR.format(b.importe),
  usos: b.usos,
});
const VACIO: Borrador = {
  id: null,
  nombreCorto: "",
  texto: "TÍTULO DEL BLOQUE EN MAYÚSCULAS\n• Primer punto\n• Segundo punto",
  desglose: "se_cobra",
  importe: "",
  usos: 0,
};

/** Asi sale el bloque en la hoja: la primera linea es el titulo, las que
 *  empiezan por • son puntos y el resto, texto suelto (las notas con *). */
function Parrafo({ texto }: { texto: string }) {
  const [titulo, ...resto] = texto.split("\n");
  const lineas = resto.filter((l) => l.trim());
  return (
    <div className="font-[Arial,Helvetica,sans-serif] text-[11.5px] leading-[1.5]">
      <b className="block">{titulo}</b>
      {lineas.map((l, i) =>
        l.trim().startsWith("•") ? (
          <div key={i} className="flex gap-2 pl-2">
            <span>•</span>
            <span>{l.trim().replace(/^•\s*/, "")}</span>
          </div>
        ) : (
          <p key={i}>{l.trim()}</p>
        ),
      )}
    </div>
  );
}

const BTN =
  "rounded-xl border border-black/15 bg-white px-3.5 py-[7px] text-[13px] font-semibold text-carbon/80 transition hover:border-carbon disabled:opacity-50";
const BTN_PRIM =
  "rounded-xl border border-lima bg-lima px-3.5 py-[7px] text-[13px] font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:opacity-50";
const ETQ_CAMPO = "mb-[3px] block text-[10px] font-bold uppercase tracking-[.06em] text-carbon/70";
const CAMPO =
  "w-full rounded-[10px] border border-black/20 bg-white px-2.5 py-[7px] text-[13px] focus:border-lima focus:outline-none disabled:bg-[#f3f3f3] disabled:text-carbon/40";
const PISTA_CL = "mt-1 text-[11.5px] text-carbon/65";

/** Enter pasa al campo siguiente, nunca guarda (guia de estilo, regla 9). */
function enterAvanza(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const campos = Array.from(document.querySelectorAll<HTMLElement>("[data-campo]"));
  const i = campos.indexOf(e.currentTarget);
  campos[i + 1]?.focus();
}

export function Catalogo({ bloques, inicial }: { bloques: BloqueCatalogo[]; inicial: string | null }) {
  const activos = bloques.filter((b) => b.activo);
  const retirados = bloques.filter((b) => !b.activo);

  const primero = bloques.find((b) => b.id === inicial) ?? activos[0] ?? null;
  const [selId, setSelId] = useState<string | null>(primero?.id ?? null);
  const [modo, setModo] = useState<"editar" | "nuevo">("editar");
  const [borrador, setBorrador] = useState<Borrador>(primero ? deBloque(primero) : VACIO);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, empezar] = useTransition();

  const sel = bloques.find((b) => b.id === selId) ?? null;
  const original = modo === "editar" && sel ? deBloque(sel) : null;
  const cambiado =
    modo === "nuevo" ||
    (original != null &&
      (["nombreCorto", "texto", "desglose", "importe"] as const).some((k) => original[k] !== borrador[k]));

  // Cuando la lista vuelve del servidor (despues de guardar o mover), el
  // bloque abierto se refresca si no hay nada a medio escribir.
  useEffect(() => {
    if (modo === "editar" && sel && !cambiado) setBorrador(deBloque(sel));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloques]);

  const seguro = () => !cambiado || confirm("Hay cambios sin guardar en este bloque. ¿Los descarto?");
  const elegir = (b: BloqueCatalogo) => {
    if (b.id === selId && modo === "editar") return;
    if (!seguro()) return;
    setSelId(b.id);
    setModo("editar");
    setBorrador(deBloque(b));
    setAviso(null);
  };
  const nuevo = () => {
    if (!seguro()) return;
    setModo("nuevo");
    setBorrador(VACIO);
    setAviso(null);
  };
  const duplicar = () => {
    setModo("nuevo");
    setBorrador({ ...borrador, id: null, nombreCorto: borrador.nombreCorto + " (copia)", usos: 0 });
    setAviso(null);
  };
  const cancelar = () => {
    setAviso(null);
    if (sel) {
      setModo("editar");
      setBorrador(deBloque(sel));
    }
  };
  const guardar = () =>
    empezar(async () => {
      const r = await accionGuardar(modo === "nuevo" ? null : borrador.id, borrador);
      if (!r.ok) return setAviso({ ok: false, texto: r.error });
      setAviso({ ok: true, texto: "Guardado. Sale así en la próxima hoja; las ya generadas no cambian." });
      if (modo === "nuevo" && r.id) {
        setSelId(r.id);
        setModo("editar");
        setBorrador((b) => ({ ...b, id: r.id! }));
      }
    });
  const mover = (id: string, s: -1 | 1) => empezar(() => accionMover(id, s));
  const retirar = () =>
    sel &&
    empezar(async () => {
      await accionRetirar(sel.id);
      setAviso({ ok: true, texto: "Retirado. Ya no se ofrece en las hojas nuevas; las antiguas lo conservan." });
    });
  const activar = () =>
    sel &&
    empezar(async () => {
      await accionActivar(sel.id);
      setAviso({ ok: true, texto: "Activado de nuevo: está al final de la lista." });
    });

  const poner = (k: keyof Borrador, v: string) => setBorrador((b) => ({ ...b, [k]: v }));
  const retiradoAbierto = modo === "editar" && sel && !sel.activo;

  return (
    <>
      {/* ---------------- cabecera ---------------- */}
      <div className="mt-2.5 flex items-end justify-between gap-4 border-b border-black/10 pb-3">
        <div>
          <h1 className="text-[25px] font-bold leading-tight text-carbon">Catálogo de bloques</h1>
          <p className="mt-1 text-[13px] text-carbon/65">
            Lo que los comerciales pueden marcar al generar una hoja de encargo, en el orden en que sale en la hoja.
          </p>
        </div>
        <button type="button" onClick={nuevo} className={BTN_PRIM}>
          + Nuevo bloque
        </button>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(420px,38%)_1fr]">
        {/* ---------------- la lista ---------------- */}
        <div className="rounded-2xl border border-[#cfcfcf] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
          <div className="mb-2.5 text-xs font-bold uppercase tracking-[.08em] text-carbon/70">
            Bloques activos · {activos.length}
          </div>
          {activos.map((b, i) => (
            <div
              key={b.id}
              onClick={() => elegir(b)}
              className={
                "grid cursor-pointer grid-cols-[28px_1fr_auto_auto] items-center gap-2.5 rounded-[10px] border px-2.5 py-2 " +
                (b.id === selId && modo === "editar" ? "border-lima bg-lima-soft" : "border-transparent hover:bg-[#fafaf7]")
              }
            >
              <span className="flex flex-col leading-none">
                <button
                  type="button"
                  title="subir"
                  disabled={ocupado || i === 0}
                  onClick={(e) => (e.stopPropagation(), mover(b.id, -1))}
                  className="px-1 py-px text-[11px] text-carbon/50 hover:text-carbon disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  title="bajar"
                  disabled={ocupado || i === activos.length - 1}
                  onClick={(e) => (e.stopPropagation(), mover(b.id, 1))}
                  className="px-1 py-px text-[11px] text-carbon/50 hover:text-carbon disabled:opacity-30"
                >
                  ▼
                </button>
              </span>
              <span className="min-w-0">
                <span className="font-semibold">{b.nombreCorto}</span>
                <br />
                <span className="block truncate text-[11px] text-carbon/65">{b.texto.split("\n")[0]}</span>
              </span>
              <span className={"whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.05em] " + PILD[b.desglose]}>
                {ETQ[b.desglose]}
              </span>
              <span className="min-w-[56px] text-right text-xs text-carbon/75">{euros(b.importe)}</span>
            </div>
          ))}

          <details className="mt-2.5 border-t border-dashed border-[#ddd] pt-2" open={!!retiradoAbierto || undefined}>
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-[.06em] text-carbon/65">
              Retirados · {retirados.length}
            </summary>
            <div className="mt-1.5">
              {retirados.map((b) => (
                <div
                  key={b.id}
                  onClick={() => elegir(b)}
                  className={
                    "grid cursor-pointer grid-cols-[28px_1fr] items-center gap-2.5 rounded-[10px] border px-2.5 py-2 " +
                    (b.id === selId ? "border-[#d6d6d2] bg-[#f6f6f3]" : "border-transparent hover:bg-[#fafaf7]")
                  }
                >
                  <span />
                  <span>
                    <span className="font-semibold text-carbon/45 line-through">{b.nombreCorto}</span>
                    <br />
                    <span className="text-[11px] text-carbon/65">usado en {b.usos} hojas antiguas</span>
                  </span>
                </div>
              ))}
            </div>
          </details>
        </div>

        {/* ---------------- el bloque abierto ---------------- */}
        {retiradoAbierto ? (
          <div className="rounded-2xl border border-[#cfcfcf] bg-form-card p-4 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
            <div className="mb-3 flex items-center justify-between gap-2.5">
              <h2 className="text-[17px] font-bold">
                {sel.nombreCorto}{" "}
                <span className={"rounded-full border px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-[.05em] " + PILD.no_aparece}>
                  Retirado
                </span>
              </h2>
              <button type="button" onClick={activar} disabled={ocupado} className={BTN_PRIM}>
                Volver a activar
              </button>
            </div>
            <p className="text-xs text-carbon/65">
              Retirado del catálogo: los comerciales ya no lo ven al generar una hoja. Sigue en las{" "}
              <b>{sel.usos} hojas antiguas</b> que lo usaron, que no cambian.
            </p>
            <div className="mt-3.5">
              <span className={ETQ_CAMPO}>Así salía en la hoja</span>
              <div className="rounded bg-white px-[26px] py-[18px] shadow-[0_2px_8px_rgba(0,0,0,.1)]">
                <Parrafo texto={sel.texto} />
              </div>
            </div>
            {aviso && <p className={"mt-3 text-[13px] " + (aviso.ok ? "text-lima-dark" : "text-alerta")}>{aviso.texto}</p>}
          </div>
        ) : (
          <div
            className={
              "rounded-2xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,.04)] " +
              (modo === "nuevo" ? "border-[#e7cf6a] bg-form-nuevo" : "border-[#cfcfcf] bg-form-card")
            }
          >
            <div className="mb-3 flex items-center justify-between gap-2.5">
              <h2 className="text-[17px] font-bold">{modo === "nuevo" ? "Nuevo bloque" : sel?.nombreCorto}</h2>
              <div className="flex items-center gap-2">
                {aviso && (
                  <span className={"max-w-[340px] text-right text-xs " + (aviso.ok ? "text-lima-dark" : "font-semibold text-alerta")}>
                    {aviso.texto}
                  </span>
                )}
                <button type="button" onClick={cancelar} disabled={ocupado || !cambiado} className={BTN}>
                  Cancelar
                </button>
                <button type="button" onClick={guardar} disabled={ocupado || !cambiado} className={BTN_PRIM}>
                  {ocupado ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>

            <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_2fr]">
              <div>
                <label className={ETQ_CAMPO}>Nombre corto</label>
                <input
                  data-campo
                  type="text"
                  value={borrador.nombreCorto}
                  placeholder="Visado ascensor"
                  onChange={(e) => poner("nombreCorto", e.target.value)}
                  onKeyDown={enterAvanza}
                  className={CAMPO}
                />
                <div className={PISTA_CL}>
                  Así lo ve el comercial:{" "}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-lima bg-lima-soft px-2.5 py-1 text-xs font-semibold text-lima-dark">
                    ✓ {borrador.nombreCorto || "…"}
                  </span>
                </div>
              </div>
              <div>
                <label className={ETQ_CAMPO}>Cómo sale en el desglose de importes</label>
                <span className="inline-flex overflow-hidden rounded-[10px] border border-black/20 bg-white">
                  {(["no_aparece", "incluido", "se_cobra"] as Desglose[]).map((v, i) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => poner("desglose", v)}
                      className={
                        "px-3 py-[7px] text-xs font-semibold " +
                        (i > 0 ? "border-l border-black/10 " : "") +
                        (borrador.desglose === v ? "bg-carbon text-white" : "bg-white text-carbon/65")
                      }
                    >
                      {ETQ[v]}
                    </button>
                  ))}
                </span>
                <div className={PISTA_CL}>{PISTA[borrador.desglose]} En cada hoja se puede cambiar.</div>
              </div>
            </div>

            <label className={ETQ_CAMPO}>Texto que va a la hoja</label>
            <textarea
              data-campo
              value={borrador.texto}
              onChange={(e) => poner("texto", e.target.value)}
              className={CAMPO + " min-h-[170px] resize-y font-mono text-[12.5px] leading-[1.5]"}
            />
            <div className={PISTA_CL}>La primera línea es el título. Cada línea que empieza por • es un punto.</div>

            <div className="my-3 grid gap-3 sm:grid-cols-[2fr_1fr]">
              <div>
                <span className={ETQ_CAMPO}>Así sale en la hoja</span>
                <div className="rounded bg-white px-[26px] py-[18px] shadow-[0_2px_8px_rgba(0,0,0,.1)]">
                  <Parrafo texto={borrador.texto} />
                </div>
              </div>
              <div>
                <label className={ETQ_CAMPO}>Importe por defecto</label>
                <input
                  data-campo
                  type="text"
                  inputMode="decimal"
                  value={borrador.desglose === "se_cobra" ? borrador.importe : ""}
                  placeholder="vacío = se pone en cada hoja"
                  disabled={borrador.desglose !== "se_cobra"}
                  onChange={(e) => poner("importe", e.target.value)}
                  onKeyDown={enterAvanza}
                  className={CAMPO}
                />
                <div className={PISTA_CL}>
                  {borrador.desglose === "se_cobra"
                    ? "Sale puesto al marcarlo; el comercial lo cambia si hace falta."
                    : "Solo los que se cobran llevan importe."}
                </div>
              </div>
            </div>

            {modo === "editar" && sel && (
              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-carbon/65">
                  Usado en <b>{sel.usos}</b> hojas. Cambiarlo no toca las ya generadas.
                </span>
                <span className="flex gap-2">
                  <button type="button" onClick={duplicar} disabled={ocupado} className={BTN}>
                    Duplicar para hacer una variante
                  </button>
                  <button
                    type="button"
                    onClick={retirar}
                    disabled={ocupado}
                    className={BTN + " !border-alerta/35 !text-alerta"}
                  >
                    Retirar
                  </button>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
