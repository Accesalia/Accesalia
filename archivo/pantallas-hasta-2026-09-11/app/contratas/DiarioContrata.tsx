"use client";

import { useRef, useState } from "react";
import { crearNotaContrata, editarNotaContrata } from "./acciones";

// El diario del mundo contrata. Mismo comportamiento que el de administraciones:
// se escribe, se corrige y las entradas se apilan, la mas nueva arriba.
//
// Sirve para las dos fichas: en la de la contrata cuelga de la empresa (o de
// alguien de su gente); en la de una persona, de la persona.
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
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return dias === 0 ? `hoy · ${soloFecha(iso)}` : dias === 1 ? `ayer · ${soloFecha(iso)}` : soloFecha(iso);
};

export function DiarioContrata({
  entradas,
  volver,
  contrataId,
  personaId,
  gente,
  sobreQuien,
}: {
  entradas: EntradaDiario[];
  volver: string;
  contrataId?: string;
  personaId?: string;
  gente?: { id: string; nombre: string }[];
  sobreQuien: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);

  return (
    /* Alto a proposito: es una columna, no una tarjeta. Es lo que cambia todos
       los dias, asi que ocupa su sitio aunque este vacio. */
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
            await crearNotaContrata(fd);
            form.current?.reset();
            setAbierto(false);
          }}
          className="shrink-0 border-b border-black/5 bg-hueso/60 p-4"
        >
          <input type="hidden" name="volver" value={volver} />
          {contrataId && <input type="hidden" name="contrata_id" value={contrataId} />}
          {personaId && <input type="hidden" name="persona_id" value={personaId} />}
          <textarea
            name="texto"
            required
            rows={3}
            autoFocus
            placeholder="Lo que sea: una llamada, un aviso, algo que conviene recordar…"
            className="w-full resize-y rounded-xl border border-black/10 bg-white px-3 py-2 text-base outline-none focus:border-lima"
          />
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {gente && gente.length > 0 && (
              <select
                name="puesto_id"
                defaultValue=""
                className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm text-carbon/70 outline-none focus:border-lima"
              >
                <option value="">Sobre {sobreQuien}</option>
                {gente.map((g) => (
                  <option key={g.id} value={g.id}>Sobre {g.nombre}</option>
                ))}
              </select>
            )}
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
            Todavía no hay nada escrito sobre {sobreQuien}.
            <br />
            Aquí irá lo que vaya pasando: llamadas, avisos, lo que convenga recordar.
          </p>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-black/5 overflow-y-auto">
          {entradas.map((e) => (
            <li key={e.id} className="group px-5 py-3.5">
              {editando === e.id ? (
                <form
                  action={async (fd) => {
                    await editarNotaContrata(fd);
                    setEditando(null);
                  }}
                >
                  <input type="hidden" name="nota_id" value={e.id} />
                  <input type="hidden" name="volver" value={volver} />
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
                    {e.editadoEn && <span className="italic text-carbon/45">editada el {soloFecha(e.editadoEn)}</span>}
                    <button
                      onClick={() => setEditando(e.id)}
                      className="ml-auto text-sm text-carbon/40 underline-offset-2 transition hover:text-lima-dark hover:underline group-hover:text-carbon/70"
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
