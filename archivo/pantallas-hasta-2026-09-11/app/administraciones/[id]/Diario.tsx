"use client";

import { useRef, useState } from "react";
import { crearNotaAdministracion, editarNotaAdministracion } from "../acciones";

// El diario de la administracion. Una caja de texto y ya: "donde alguien pueda
// meter una entrada de texto con lo que sea".
//
// Se puede colgar de la administracion o de una persona concreta. Por defecto,
// de la administracion, que es lo mas frecuente.
export type EntradaDiario = {
  id: string;
  texto: string;
  autor: string | null;
  origen: string;
  creadoEn: string;
  editadoEn: string | null;
  sobre: string | null;
};

const soloFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });

const cuando = (iso: string) => {
  const d = new Date(iso);
  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  const fecha = d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  return dias === 0 ? `hoy · ${fecha}` : dias === 1 ? `ayer · ${fecha}` : fecha;
};

export function Diario({
  empresaId,
  entradas,
  gente,
}: {
  empresaId: string;
  entradas: EntradaDiario[];
  gente: { id: string; nombre: string }[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);

  return (
    /* Alto a proposito: es una columna, no una tarjeta. Monica: "que se
       prolongue hacia abajo, rebosando la del titulo; digamos el doble de largo
       que la del nombre de la empresa". Aunque este vacio ocupa su sitio, para
       que se vea que ahi va lo que va pasando y no parezca un apunte al margen. */
    <section className="flex min-h-[27rem] flex-col rounded-2xl border border-black/5 bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/5 px-5 py-3.5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-carbon/65">Diario</h2>
        <span className="text-sm text-carbon/55">
          {entradas.length === 0 ? "sin entradas" : `${entradas.length} ${entradas.length === 1 ? "entrada" : "entradas"}`}
        </span>
      </div>

      {abierto ? (
        <form
          ref={form}
          action={async (fd) => {
            await crearNotaAdministracion(fd);
            form.current?.reset();
            setAbierto(false);
          }}
          className="shrink-0 border-b border-black/5 bg-hueso/60 p-4"
        >
          <input type="hidden" name="empresa_id" value={empresaId} />
          <textarea
            name="texto"
            required
            rows={3}
            autoFocus
            placeholder="Lo que sea: una llamada, un aviso, algo que conviene recordar…"
            className="w-full resize-y rounded-xl border border-black/10 bg-white px-3 py-2 text-base outline-none focus:border-lima"
          />
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <select
              name="puesto_id"
              defaultValue=""
              className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm text-carbon/70 outline-none focus:border-lima"
            >
              <option value="">Sobre la administración</option>
              {gente.map((g) => (
                <option key={g.id} value={g.id}>Sobre {g.nombre}</option>
              ))}
            </select>
            <input
              name="autor"
              placeholder="Quién escribe"
              className="w-36 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-lima"
            />
            <span className="text-sm text-carbon/55">lo pondrá el inicio de sesión</span>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded-full px-3 py-1.5 text-sm text-carbon/70 hover:text-carbon"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-full bg-lima px-4 py-1.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
              >
                Guardar
              </button>
            </div>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAbierto(true)}
          className="w-full shrink-0 border-b border-dashed border-black/10 px-5 py-3 text-left text-base text-carbon/60 transition hover:bg-hueso/60 hover:text-lima-dark"
        >
          + Escribir una entrada
        </button>
      )}

      {entradas.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 py-10 text-center">
          <p className="text-base italic leading-relaxed text-carbon/50">
            Todavía no hay nada escrito sobre esta administración.
            <br />
            Aquí irá lo que vaya pasando con ellos: llamadas, avisos, lo que convenga recordar.
          </p>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-black/5 overflow-y-auto">
          {entradas.map((e) => (
            <li key={e.id} className="group px-5 py-3.5">
              {editando === e.id ? (
                /* Corregir en su sitio: se ve el texto donde estaba y se arregla. */
                <form
                  action={async (fd) => {
                    await editarNotaAdministracion(fd);
                    setEditando(null);
                  }}
                >
                  <input type="hidden" name="nota_id" value={e.id} />
                  <input type="hidden" name="empresa_id" value={empresaId} />
                  <textarea
                    name="texto"
                    defaultValue={e.texto}
                    rows={3}
                    autoFocus
                    className="w-full resize-y rounded-xl border border-lima bg-white px-3 py-2 text-base outline-none"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditando(null)}
                      className="rounded-full px-3 py-1.5 text-sm text-carbon/70 hover:text-carbon"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="rounded-full bg-lima px-4 py-1.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="text-base leading-relaxed text-carbon/85">{e.texto}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-carbon/55">
                    <span
                      className={
                        "rounded px-1.5 py-px font-bold uppercase tracking-wide " +
                        (e.origen === "sali" ? "bg-blue-50 text-blue-700" : "bg-black/5 text-carbon/70")
                      }
                    >
                      {e.origen === "sali" ? "Sali" : "Persona"}
                    </span>
                    {e.autor && <span>{e.autor}</span>}
                    <span>{cuando(e.creadoEn)}</span>
                    {e.sobre && <span className="text-carbon/70">sobre {e.sobre}</span>}
                    {e.editadoEn && (
                      <span className="italic text-carbon/45">editada el {soloFecha(e.editadoEn)}</span>
                    )}
                    <button
                      onClick={() => setEditando(e.id)}
                      className="ml-auto text-sm text-carbon/40 underline-offset-2 transition hover:text-lima-dark hover:underline focus:opacity-100 group-hover:text-carbon/70"
                    >
                      corregir
                    </button>
                  </p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
