"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

// El formulario de una plantilla, para crearla y para retocarla. Lo de la guia
// de formularios: Guardar y Cancelar arriba, Enter pasa al campo siguiente (no
// envia), la pista dentro del recuadro y el texto que se estira.

const ETQ = "block text-[10px] font-bold uppercase tracking-[0.05em] text-carbon/70";
const CAMPO =
  "mt-1 w-full rounded-lg border border-carbon/40 bg-white px-3 py-1.5 text-sm text-carbon outline-none placeholder:text-carbon/55 focus:border-lima";

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-lg bg-lima px-5 py-2 text-sm font-extrabold text-carbon transition hover:bg-lima-dark hover:text-white disabled:opacity-50">
      {pending ? "Guardando…" : "Guardar"}
    </button>
  );
}

/** Enter en un campo de una linea pasa al siguiente; en el texto, salto de linea. */
function siguiente(e: React.KeyboardEvent<HTMLFormElement>) {
  const t = e.target as HTMLElement;
  if (e.key !== "Enter" || t.tagName !== "INPUT") return;
  e.preventDefault();
  const campos = [...e.currentTarget.querySelectorAll<HTMLElement>("input:not([type=hidden]):not([type=radio]), textarea")];
  campos[campos.indexOf(t) + 1]?.focus();
}

export function FormPlantilla({
  titulo,
  accion,
  cancelar,
  inicial,
  areas,
  falta,
}: {
  titulo: string;
  accion: (fd: FormData) => void | Promise<void>;
  cancelar: string;
  inicial?: { nombre: string; asunto: string; texto: string };
  /** Solo al crear: las areas que ve (y en cuales puede hacer generales). Al retocar, null: el area no cambia. */
  areas: { valor: string; texto: string; general: boolean }[] | null;
  falta: boolean;
}) {
  return (
    <form action={accion} onKeyDown={siguiente} className="rounded-2xl border border-[#5c5c5c] bg-form-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-carbon">{titulo}</h1>
        <div className="flex items-center gap-2.5">
          <Link href={cancelar} className="rounded-lg border border-carbon/30 bg-white px-4 py-2 text-sm font-bold text-carbon/75 transition hover:border-carbon">
            Cancelar
          </Link>
          <Guardar />
        </div>
      </div>
      {falta && <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">Faltan datos: hacen falta los tres.</p>}

      {areas && areas.length > 1 && (
        <label className="mt-4 block">
          <span className={ETQ}>De qué área</span>
          <select name="area" defaultValue={areas[0].valor} className={CAMPO + " max-w-[260px]"}>
            {areas.map((a) => <option key={a.valor} value={a.valor}>{a.texto}</option>)}
          </select>
        </label>
      )}
      {areas && areas.length === 1 && <input type="hidden" name="area" value={areas[0].valor} />}
      {areas?.some((a) => a.general) && (
        <fieldset className="mt-4">
          <legend className={ETQ}>Para quién</legend>
          <div className="mt-1 flex flex-wrap gap-4 text-sm text-carbon">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="clase" value="personal" defaultChecked /> Personal, solo mía
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="clase" value="general" /> General, para todos
            </label>
          </div>
        </fieldset>
      )}

      <label className="mt-4 block">
        <span className={ETQ}>Para qué es</span>
        <input name="nombre" defaultValue={inicial?.nombre} required placeholder="Envío de la viabilidad y el presupuesto" className={CAMPO} />
      </label>
      <label className="mt-3 block">
        <span className={ETQ}>Asunto</span>
        <input name="asunto" defaultValue={inicial?.asunto} required placeholder="Lo que se lee en la bandeja antes de abrirlo" className={CAMPO} />
      </label>
      <label className="mt-3 block">
        <span className={ETQ}>Texto</span>
        <textarea
          name="texto"
          defaultValue={inicial?.texto}
          required
          rows={12}
          placeholder="El cuerpo del correo, tal como lo leerá la comunidad"
          className={CAMPO + " resize-y leading-relaxed"}
        />
      </label>
    </form>
  );
}
