"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Elegir, type Opcion } from "../components/Elegir";
import { accionApuntarAdjunto, accionCrearCita, accionEditarCita, accionPermisoAdjunto, accionQuitarAdjunto } from "./acciones";
import type { CitaDelDia, ConQuienNuevo } from "../../lib/citas";
import type { TipoCita } from "./Dia";

// NUEVA CITA (Monica, 14-oct-2026): se pincha en una raya del papel y sale con
// su fecha y su hora, que se pueden mover. Pide titulo, con quien, para que y
// donde; notas, y adjuntar archivos. Guardar y Cancelar arriba (guia, regla 1);
// Enter pasa al campo siguiente, nunca guarda (regla 9).
//
// EDITAR (Monica, 14-oct-2026) es el mismo formulario con la cita ya puesta: asi
// se mueve tambien de dia y de hora donde no se puede arrastrar (el movil).

/** Una persona de la cita: elegida de la agenda ("puesto:<id>" o "persona:<id>",
 *  las opciones del diario) o escrita a mano. */
type Linea = { clave: number; aMano: boolean; persona: string | null; nombre: string; telefono: string; papel: string };

const TIPO_ELEGIDA = { puesto: "puesto", persona: "persona" } as const;
const PREFIJO = { puesto: "puesto", persona: "persona" } as const;

/** Las personas de una cita guardada, como lineas del formulario. */
function lineasDe(c: CitaDelDia): Linea[] {
  return c.conQuien.map((p, i) =>
    p.tipo === "a_mano"
      ? { clave: i + 1, aMano: true, persona: null, nombre: p.nombre, telefono: p.telefono ?? "", papel: p.papel ?? "" }
      : { clave: i + 1, aMano: false, persona: `${PREFIJO[p.tipo]}:${p.id}`, nombre: "", telefono: "", papel: p.papel ?? "" },
  );
}

function aConQuien(l: Linea): ConQuienNuevo {
  const papel = l.papel.trim() || null;
  if (!l.aMano && l.persona) {
    const [tipo, id] = l.persona.split(":") as [keyof typeof TIPO_ELEGIDA, string];
    return { tipo: TIPO_ELEGIDA[tipo], id, papel };
  }
  return { tipo: "a_mano", nombre: l.nombre.trim(), telefono: l.telefono.trim() || null, papel };
}

const DURACIONES = [30, 60, 90, 120, 180];
const duracion = (m: number) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${m / 60} h`);

const CAMPO =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm text-carbon placeholder:text-carbon/55 focus:border-lima focus:outline-none";
const ETIQUETA = "mb-1 block text-[10px] font-bold uppercase tracking-wide text-carbon/70";

function enterPasaDeCampo(e: KeyboardEvent<HTMLFormElement>) {
  const t = e.target as HTMLElement;
  if (e.key !== "Enter" || t.tagName !== "INPUT" || (t as HTMLInputElement).type === "file") return;
  e.preventDefault();
  const campos = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("input:not([type=file]), textarea, select, button[aria-haspopup]"));
  campos[campos.indexOf(t) + 1]?.focus();
}

export function FormCita({
  dia,
  hora,
  deQuien,
  personas,
  tipos,
  cita,
  alCerrar,
}: {
  dia: string;
  /** "10:30": la raya pinchada. */
  hora: string;
  /** La persona del equipo duena de la agenda. */
  deQuien: string;
  personas: Opcion[];
  /** Los tipos de cita, con su color y su duracion por defecto. */
  tipos: TipoCita[];
  /** La cita a editar; sin ella, es una nueva. */
  cita?: CitaDelDia;
  alCerrar: () => void;
}) {
  const router = useRouter();
  const [lineas, setLineas] = useState<Linea[]>(() =>
    cita?.conQuien.length ? lineasDe(cita) : [{ clave: 1, persona: null, nombre: "", telefono: "", papel: "", aMano: false }],
  );
  const [yaAdjuntos, setYaAdjuntos] = useState(cita?.adjuntos ?? []);
  const [ficheros, setFicheros] = useState<File[]>([]);
  // EL TIPO, lo primero (Monica, 14-oct-2026): da el color en la agenda y
  // propone su duracion, que se puede cambiar.
  const [tipo, setTipo] = useState<string | null>(cita && tipos.some((t) => t.clave === cita.tipo) ? cita.tipo : null);
  const [minutos, setMinutos] = useState(cita?.minutos ?? 60);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const otra = useRef((cita?.conQuien.length ?? 1) + 1);
  const elegirFichero = useRef<HTMLInputElement>(null);

  const cambiar = (clave: number, cambio: Partial<Linea>) => setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, ...cambio } : l)));
  const vacia = (l: Linea) => !l.persona && !l.nombre.trim();

  async function guardar(form: HTMLFormElement) {
    const fd = new FormData(form);
    const falta = [
      !tipo && "el tipo",
      !fd.get("fecha") && "la fecha",
      !fd.get("hora") && "la hora",
      !String(fd.get("asunto") ?? "").trim() && "el título",
      lineas.every(vacia) && "con quién",
      !String(fd.get("para_que") ?? "").trim() && "para qué",
      !String(fd.get("direccion") ?? "").trim() && "dónde",
    ].filter(Boolean);
    if (falta.length) return setError(`Falta ${falta.join(", ")}.`);
    const texto = (k: string) => String(fd.get(k) ?? "").trim();
    setGuardando(true);
    setError(null);
    const datos = {
      local: `${texto("fecha")}T${texto("hora")}`,
      tipo,
      minutos,
      asunto: texto("asunto"),
      paraQue: texto("para_que"),
      direccion: texto("direccion"),
      notas: texto("notas") || null,
      conQuien: lineas.filter((l) => !vacia(l)).map(aConQuien),
    };
    const fallo = (e: Error) => ({ ok: false as const, error: e.message });
    const r = cita
      ? await accionEditarCita(cita.id, { ...datos, estado: cita.estado }).then((x) => (x.ok ? { ok: true as const, id: cita.id } : x)).catch(fallo)
      : await accionCrearCita({ ...datos, deQuien }).catch(fallo);
    if (!r.ok) {
      setGuardando(false);
      return setError(r.error);
    }
    // Los adjuntos, despues de crearla (hace falta su id): permiso, subida
    // directa al almacen y apunte. Si alguno falla, la cita ya esta guardada.
    const fallan: string[] = [];
    for (const f of ficheros) {
      const p = await accionPermisoAdjunto(r.id, f.name).catch(() => null);
      const subido =
        p?.ok &&
        (await fetch(p.url, { method: "PUT", headers: { "Content-Type": f.type || "application/octet-stream", "x-upsert": "false" }, body: f })
          .then((x) => x.ok)
          .catch(() => false));
      const apuntado = subido && p?.ok && (await accionApuntarAdjunto(r.id, p.ruta, f.name).catch(() => null))?.ok;
      if (!apuntado) fallan.push(f.name);
    }
    setGuardando(false);
    router.refresh();
    if (fallan.length) {
      setFicheros(ficheros.filter((f) => fallan.includes(f.name)));
      return setError(`La cita está guardada, pero no se ha podido subir: ${fallan.join(", ")}. Cierra y vuelve a intentarlo editando la cita.`);
    }
    alCerrar();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-carbon/40 px-4 py-10" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <form
        onKeyDown={enterPasaDeCampo}
        onSubmit={(e) => {
          e.preventDefault();
          guardar(e.currentTarget);
        }}
        className="w-full max-w-[760px] rounded-2xl border border-[#5c5c5c] bg-form-card p-5 shadow-xl"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-carbon">{cita ? "Editar cita" : "Nueva cita"}</h2>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={alCerrar} className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-carbon/70 hover:text-carbon">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="rounded-xl bg-lima px-5 py-2 text-sm font-bold text-carbon hover:bg-lima-dark hover:text-white disabled:opacity-60">
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
        {error && <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{error}</p>}

        <div className="mt-4">
          <span className={ETIQUETA}>Tipo</span>
          <div role="radiogroup" aria-label="Tipo de cita" className="flex flex-wrap gap-1.5">
            {tipos.map((t) => {
              const elegido = tipo === t.clave;
              const color = t.color ?? "#9aa0a6";
              return (
                <button
                  key={t.clave}
                  type="button"
                  role="radio"
                  aria-checked={elegido}
                  onClick={() => {
                    setTipo(t.clave);
                    setMinutos(t.minutos);
                  }}
                  style={{ borderColor: color, backgroundColor: elegido ? color : `color-mix(in srgb, ${color} 15%, white)` }}
                  className={"inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-[13px] font-semibold text-carbon transition " + (elegido ? "shadow-sm" : "hover:brightness-95")}
                >
                  {!elegido && <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />}
                  {elegido && <span aria-hidden>✓</span>}
                  {t.nombre}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1fr]">
          <label>
            <span className={ETIQUETA}>Fecha</span>
            <input type="date" name="fecha" defaultValue={dia} className={CAMPO} />
          </label>
          <label>
            <span className={ETIQUETA}>Hora</span>
            <input type="time" name="hora" defaultValue={hora} step={300} className={CAMPO} />
          </label>
          <label>
            <span className={ETIQUETA}>Duración</span>
            <select value={minutos} onChange={(e) => setMinutos(Number(e.target.value))} className={CAMPO}>
              {[...new Set([...DURACIONES, minutos])].sort((a, b) => a - b).map((m) => (
                <option key={m} value={m}>{duracion(m)}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3">
          <label>
            <span className={ETIQUETA}>Título</span>
            <input name="asunto" autoFocus defaultValue={cita?.asunto} placeholder="Lo que se lee en la raya: «Junta en Alcalá 120», «Café con Adolfo»…" className={CAMPO} />
          </label>
          <label>
            <span className={ETIQUETA}>Para qué</span>
            <input name="para_que" defaultValue={cita?.paraQue} placeholder="A qué vas: «presentar la hoja de encargo», «ver el portal para la rampa»…" className={CAMPO} />
          </label>
          <label>
            <span className={ETIQUETA}>Dónde</span>
            <input name="direccion" defaultValue={cita?.direccion ?? ""} placeholder="Calle, número y municipio" className={CAMPO} />
          </label>
        </div>

        <div className="mt-4 rounded-xl border border-[#bfbfbf] bg-form-dentro p-3">
          <span className={ETIQUETA}>Con quién</span>
          <div className="space-y-2">
            {lineas.map((l) => (
              <div key={l.clave} className="grid items-center gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                {l.aMano ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input value={l.nombre} onChange={(e) => cambiar(l.clave, { nombre: e.target.value })} placeholder="Nombre" className={CAMPO} />
                    <input value={l.telefono} onChange={(e) => cambiar(l.clave, { telefono: e.target.value })} placeholder="Teléfono" inputMode="tel" className={CAMPO} />
                  </div>
                ) : (
                  <Elegir
                    id={`con-${l.clave}`}
                    nombre=""
                    opciones={personas}
                    valor={l.persona ?? ""}
                    alElegir={(v) => cambiar(l.clave, { persona: v || null })}
                    vacio="Busca en la agenda…"
                    conPista
                    noEsta={(q) => cambiar(l.clave, { aMano: true, persona: null, nombre: q })}
                  />
                )}
                <input value={l.papel} onChange={(e) => cambiar(l.clave, { papel: e.target.value })} placeholder="Papel: presidente…" className={CAMPO} />
                <button
                  type="button"
                  onClick={() => cambiar(l.clave, l.aMano ? { aMano: false, nombre: "", telefono: "" } : { aMano: true, persona: null })}
                  className="text-left text-[12px] font-semibold text-lima-dark hover:underline"
                >
                  {l.aMano ? "Buscar en la agenda" : "Escribir a mano"}
                </button>
                <button
                  type="button"
                  aria-label="Quitar"
                  onClick={() => setLineas((ls) => (ls.length > 1 ? ls.filter((x) => x.clave !== l.clave) : [{ ...l, persona: null, nombre: "", telefono: "", papel: "" }]))}
                  className="text-lg leading-none text-carbon/55 hover:text-alerta"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={lineas.some(vacia)}
            onClick={() => setLineas((ls) => [...ls, { clave: otra.current++, persona: null, nombre: "", telefono: "", papel: "", aMano: false }])}
            className="mt-2 text-[13px] font-semibold text-lima-dark hover:underline disabled:cursor-not-allowed disabled:text-carbon/40 disabled:no-underline"
          >
            + Otra persona
          </button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[3fr_2fr]">
          <label>
            <span className={ETIQUETA}>Notas</span>
            <textarea name="notas" rows={3} defaultValue={cita?.notas ?? ""} className={CAMPO + " resize-y"} />
          </label>
          <div>
            <span className={ETIQUETA}>Adjuntos</span>
            <input
              ref={elegirFichero}
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
              {yaAdjuntos.map((a) => (
                <span key={a.tipo + a.id} className="inline-flex items-center gap-1.5 rounded-lg border border-lima/60 bg-lima-soft px-2.5 py-1 text-[12px] font-semibold text-lima-dark">
                  📄 {a.nombre}
                  {/* Quitar, solo los ficheros subidos: la hoja o la viabilidad no se borran desde aqui. */}
                  {a.tipo === "fichero" && (
                    <button
                      type="button"
                      aria-label={`Quitar ${a.nombre}`}
                      onClick={async () => {
                        if (!window.confirm(`¿Quitar «${a.nombre}» de la cita? El archivo se borra.`)) return;
                        const r = await accionQuitarAdjunto(a.id).catch((e: Error) => ({ ok: false as const, error: e.message }));
                        if (!r.ok) return setError(r.error);
                        setYaAdjuntos((xs) => xs.filter((x) => x !== a));
                        router.refresh();
                      }}
                      className="text-carbon/55 hover:text-alerta"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
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
                onClick={() => elegirFichero.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-lima/60 bg-white px-2.5 py-1 text-[12px] font-semibold text-lima-dark hover:border-lima-dark"
              >
                📄 Adjuntar archivo
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
