"use client";

import { useState, useTransition } from "react";
import { anadirMania } from "./acciones";

// EL FORMULARIO DE "AÑADIR NUEVA". "¿De quien es?" se elige de las entidades
// que ya hay (o se escribe una nueva): asi no nacen otra vez 55 formas de
// escribir lo mismo. El municipio SALE DE LA ENTIDAD (Monica: "las entidades
// ya tienen un ambito de actuacion claro"); se puede corregir. Una ECU, el COAM
// o Patrimonio no tienen municipio fijo. Quien y cuando, solos.

export type EntidadConocida = { nombre: string; municipio: string | null };
type Municipio = { nombre: string; bonito: string };

const etq = "block text-[10.5px] font-bold uppercase tracking-[0.06em] text-carbon/70";
const campo =
  "mt-1 w-full rounded-[10px] border border-carbon/25 bg-white px-3 py-2 text-[14px] text-carbon outline-none transition focus:border-lima-dark focus:ring-2 focus:ring-lima/40";
const llano = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

/** El municipio que le toca a una entidad: la conocida dice el suyo; una nueva
 *  "Ayuntamiento de X" es X; una junta de distrito, Madrid. */
function municipioDe(entidad: string, conocidas: EntidadConocida[], municipios: Municipio[]): string {
  const e = llano(entidad);
  const ya = conocidas.find((c) => llano(c.nombre) === e);
  if (ya) return ya.municipio ?? "";
  const ayto = e.match(/^ayuntamiento de (.+)$/);
  if (ayto) return municipios.find((m) => llano(m.nombre) === ayto[1])?.nombre ?? "";
  if (e.startsWith("junta de distrito")) return "MADRID";
  return "";
}

export function Anadir({
  entidades,
  municipios,
  tecnicos,
}: {
  entidades: EntidadConocida[];
  municipios: Municipio[];
  tecnicos: string[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [entidad, setEntidad] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState(false);
  const [guardando, empezar] = useTransition();

  if (!abierto) {
    return (
      <div className="mt-4 flex items-center justify-end gap-3">
        {hecho && <span className="text-[13px] font-semibold text-lima-dark">Guardada. Ya sale en la lista.</span>}
        <button
          type="button"
          onClick={() => {
            setAbierto(true);
            setHecho(false);
          }}
          className="inline-flex items-center rounded-xl bg-lima px-5 py-2 text-[14px] font-extrabold text-carbon transition hover:bg-lima-dark hover:text-white"
        >
          + Añadir nueva
        </button>
      </div>
    );
  }

  return (
    <form
      action={(fd) =>
        empezar(async () => {
          setError(null);
          const fallo = await anadirMania(fd);
          if (fallo) return setError(fallo);
          setEntidad("");
          setMunicipio("");
          setAbierto(false);
          setHecho(true);
        })
      }
      className="mt-4 rounded-2xl border border-lima/50 bg-white p-5 shadow-sm"
    >
      <h2 className="text-[16px] font-bold text-carbon">Nueva manía</h2>
      <p className="mt-0.5 text-[12.5px] text-carbon/55">
        Solo las que afectan a la ejecución técnica: organismos y sus técnicos. Quién la pone y cuándo se guarda solo.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={etq}>¿De quién es? *</span>
          <input
            name="entidad"
            list="manias-entidades"
            required
            value={entidad}
            onChange={(e) => {
              setEntidad(e.target.value);
              setMunicipio(municipioDe(e.target.value, entidades, municipios));
            }}
            placeholder="Ayuntamiento de Leganés, ECU ACTECU, Junta de Distrito de Latina…"
            className={campo}
          />
          <datalist id="manias-entidades">
            {entidades.map((e) => (
              <option key={e.nombre} value={e.nombre} />
            ))}
          </datalist>
        </label>

        <label className="block">
          <span className={etq}>Departamento</span>
          <input name="departamento" placeholder="licencias, mesa de ascensores… (si se sabe)" className={campo} />
        </label>

        <label className="block">
          <span className={etq}>Persona (técnico)</span>
          <input name="tecnico" list="manias-tecnicos" placeholder="si es de alguien concreto" className={campo} />
          <datalist id="manias-tecnicos">
            {tecnicos.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>

        <label className="block sm:col-span-2">
          <span className={etq}>Municipio</span>
          <select name="municipio" value={municipio} onChange={(e) => setMunicipio(e.target.value)} className={campo}>
            <option value="">Sin municipio fijo (ECU, COAM, Patrimonio…)</option>
            {municipios.map((m) => (
              <option key={m.nombre} value={m.nombre}>
                {m.bonito}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className={etq}>La manía *</span>
          <textarea
            name="mania"
            required
            rows={3}
            placeholder="Qué piden o cómo lo hacen, en corto, para que lo entienda quien vaya a presentar"
            className={campo + " resize-y"}
          />
        </label>
      </div>

      {error && <p className="mt-3 text-[13px] font-semibold text-[#B91C1C]">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setAbierto(false);
            setError(null);
          }}
          className="rounded-xl border border-carbon/20 px-4 py-2 text-[14px] font-semibold text-carbon/70 transition hover:text-carbon"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando}
          className="rounded-xl bg-lima px-5 py-2 text-[14px] font-extrabold text-carbon transition hover:bg-lima-dark hover:text-white disabled:opacity-60"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
