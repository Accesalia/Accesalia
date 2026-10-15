"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Marcar } from "../../components/Marcar";
import { accionApuntarMaterial, accionPedirViabilidad, accionPermisoMaterial } from "./acciones";
import type { DatosPedirViabilidad } from "./datos";

// PEDIR VIABILIDAD Y COSTES AL ARQUITECTO, SIN POLYCAM (Monica, 15-oct-2026).
// El boton y su ventana. Se pone en el bloque 1 de la ficha de la opp con los
// datos de datosPedirViabilidad(oppId).
//   - DONDE: los accesos de la opp, todos marcados; se desmarcan los que no entran.
//   - QUE QUIEREN: lo de la opp, ya marcado y editable. Solo para esta solicitud:
//     no toca los intereses de la opp.
//   - DESCRIPCION, obligatoria. MATERIAL: fotos, planos, croquis, lo que sea
//     ("no sabemos que nos va a llegar"). PARA CUANDO, si hay prisa.
// Guardar y Cancelar arriba (guia, regla 1); Enter pasa de campo (regla 9).

const CAMPO =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm text-carbon placeholder:text-carbon/55 focus:border-lima focus:outline-none";
const ETIQUETA = "mb-1 block text-[10px] font-bold uppercase tracking-wide text-carbon/70";

function enterPasaDeCampo(e: KeyboardEvent<HTMLFormElement>) {
  const t = e.target as HTMLElement;
  if (e.key !== "Enter" || t.tagName !== "INPUT" || ["file", "checkbox"].includes((t as HTMLInputElement).type)) return;
  e.preventDefault();
  const campos = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("input:not([type=file]):not([type=hidden]), textarea"));
  campos[campos.indexOf(t) + 1]?.focus();
}

export function PedirViabilidad({
  oppId,
  accesos,
  inicial,
  opciones,
  grupos,
  rotulo = "Pedir viabilidad y costes al arquitecto",
  claseBoton = "rounded-xl bg-lima px-4 py-2 text-sm font-bold text-carbon transition hover:bg-lima-dark hover:text-white",
}: DatosPedirViabilidad & { rotulo?: string; claseBoton?: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set(accesos.map((a) => a.id)));
  const [ficheros, setFicheros] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string[] | null>(null);
  const [guardando, setGuardando] = useState(false);
  const elegir = useRef<HTMLInputElement>(null);

  const cerrar = () => {
    setAbierto(false);
    setError(null);
    setHecho(null);
    setFicheros([]);
    setMarcados(new Set(accesos.map((a) => a.id)));
  };

  async function guardar(form: HTMLFormElement) {
    const fd = new FormData(form);
    const tipos = fd.getAll("tipos").map(String);
    const descripcion = String(fd.get("descripcion") ?? "").trim();
    const paraCuando = String(fd.get("para_cuando") ?? "") || null;
    const falta = [!marcados.size && "dónde (al menos un portal)", !tipos.length && "qué quieren", !descripcion && "la descripción"].filter(Boolean);
    if (falta.length) return setError(`Falta ${falta.join(", ")}.`);
    setGuardando(true);
    setError(null);
    const r = await accionPedirViabilidad(oppId, { accesos: [...marcados], tipos, descripcion, paraCuando }).catch((e: Error) => ({
      ok: false as const,
      error: e.message,
    }));
    if (!r.ok) {
      setGuardando(false);
      return setError(r.error);
    }
    // El material, despues (hace falta el id): permiso, subida directa y apunte.
    const fallan: string[] = [];
    for (const f of ficheros) {
      const p = await accionPermisoMaterial(r.id, f.name).catch(() => null);
      const subido =
        p?.ok &&
        (await fetch(p.url, { method: "PUT", headers: { "Content-Type": f.type || "application/octet-stream", "x-upsert": "false" }, body: f })
          .then((x) => x.ok)
          .catch(() => false));
      const apuntado = subido && p?.ok && (await accionApuntarMaterial(r.id, p.ruta, f.name).catch(() => null))?.ok;
      if (!apuntado) fallan.push(f.name);
    }
    setGuardando(false);
    router.refresh();
    setHecho([...r.avisos, ...(fallan.length ? [`No se ha podido subir: ${fallan.join(", ")}. Mándaselo al arquitecto por otra vía.`] : [])]);
  }

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={claseBoton}>
        {rotulo}
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-carbon/40 px-4 py-10"
          onMouseDown={(e) => e.target === e.currentTarget && !guardando && cerrar()}
        >
          {hecho ? (
            <div className="w-full max-w-[560px] rounded-2xl border border-[#5c5c5c] bg-form-card p-5 shadow-xl">
              <h2 className="text-xl font-bold text-carbon">Pedida al arquitecto</h2>
              <p className="mt-2 text-[15px] text-carbon/85">La viabilidad sin Polycam ya está en la mesa de viabilidades.</p>
              {hecho.map((a, i) => (
                <p key={i} className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{a}</p>
              ))}
              <div className="mt-4 text-right">
                <button type="button" onClick={cerrar} className="rounded-xl bg-lima px-5 py-2 text-sm font-bold text-carbon hover:bg-lima-dark hover:text-white">
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <form
              onKeyDown={enterPasaDeCampo}
              onSubmit={(e) => {
                e.preventDefault();
                guardar(e.currentTarget);
              }}
              className="w-full max-w-[820px] rounded-2xl border border-[#5c5c5c] bg-form-card p-5 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-carbon">Pedir viabilidad y costes al arquitecto</h2>
                <div className="ml-auto flex gap-2">
                  <button type="button" onClick={cerrar} disabled={guardando} className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-carbon/70 hover:text-carbon">
                    Cancelar
                  </button>
                  <button type="submit" disabled={guardando} className="rounded-xl bg-lima px-5 py-2 text-sm font-bold text-carbon hover:bg-lima-dark hover:text-white disabled:opacity-60">
                    {guardando ? "Pidiendo…" : "Pedir"}
                  </button>
                </div>
              </div>
              <p className="mt-1 text-[13px] text-carbon/70">Sin Polycam: el arquitecto la hace con lo que le mandes.</p>
              {error && <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{error}</p>}

              <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr]">
                {/* ---- dónde ---- */}
                <div className="rounded-xl border border-[#bfbfbf] bg-form-dentro p-3">
                  <span className={ETIQUETA}>Dónde</span>
                  {accesos.length === 0 ? (
                    <p className="text-[13px] text-amber-700/80">La opp no tiene portales: hay que ponérselos antes.</p>
                  ) : (
                    <ul className="space-y-1">
                      {accesos.map((a) => (
                        <li key={a.id}>
                          <label className="flex cursor-pointer items-start gap-2 text-[14px] text-carbon">
                            <input
                              type="checkbox"
                              checked={marcados.has(a.id)}
                              onChange={(e) =>
                                setMarcados((m) => {
                                  const n = new Set(m);
                                  if (e.target.checked) n.add(a.id);
                                  else n.delete(a.id);
                                  return n;
                                })
                              }
                              className="mt-0.5 size-4 accent-[#3f7a1c]"
                            />
                            {a.texto}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* ---- para cuándo ---- */}
                <div>
                  <label>
                    <span className={ETIQUETA}>Para cuándo</span>
                    <input type="date" name="para_cuando" className={CAMPO + " max-w-[200px]"} />
                  </label>
                </div>
              </div>

              {/* ---- qué quieren ---- */}
              <div className="mt-4">
                <span className={ETIQUETA}>Qué quieren</span>
                <Marcar id="tipos" opciones={opciones} vacio="Qué quieren (selecciona)" ancho="w-[300px]" debajo grupos={grupos} inicial={inicial} />
              </div>

              {/* ---- descripción ---- */}
              <label className="mt-4 block">
                <span className={ETIQUETA}>Descripción</span>
                <textarea
                  name="descripcion"
                  rows={3}
                  placeholder="Qué hay que mirar: «SATE en fachada principal y patio, 5 plantas…»"
                  className={CAMPO + " resize-y"}
                />
              </label>

              {/* ---- material ---- */}
              <div className="mt-4">
                <span className={ETIQUETA}>Material</span>
                <input
                  ref={elegir}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const nuevos = Array.from(e.target.files ?? []);
                    setFicheros((fs) => [...fs, ...nuevos]);
                    e.target.value = "";
                  }}
                />
                <div className="flex flex-wrap gap-1.5">
                  {ficheros.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-lima/60 bg-lima-soft px-2.5 py-1 text-[12px] font-semibold text-lima-dark">
                      📄 {f.name}
                      <button type="button" aria-label={`Quitar ${f.name}`} onClick={() => setFicheros((fs) => fs.filter((_, j) => j !== i))} className="text-carbon/55 hover:text-alerta">
                        ×
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => elegir.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-lima/60 bg-white px-2.5 py-1 text-[12px] font-semibold text-lima-dark hover:border-lima-dark"
                  >
                    📄 Adjuntar fotos, planos, croquis…
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  );
}
