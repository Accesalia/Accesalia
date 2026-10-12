"use client";

import { useState } from "react";
import { CASOS, esSate, TIPOS, type TipoObra } from "../../../lib/estimacionCalculo";
import type { EntradaCostes } from "../../../lib/informeCostes";
import { EmitirInforme } from "../estimacion/EmitirInforme";

// SUBVENCIONES POSIBLES (Monica, 12-oct-2026): se elige la obra y la direccion,
// y sale el estudio de ayudas. La direccion, como en la estimacion de costes:
// una de las nuestras, o una nueva buscada en Catastro (sin guardar, o creando
// la oportunidad en la ventana rapida).

type Opcion = { valor: string; texto: string; pista?: string };
const ETQ = "block text-[10.5px] font-bold uppercase tracking-[0.06em] text-carbon/60";
const CAMPO =
  "mt-1 h-[40px] w-full rounded-[10px] border border-carbon/25 bg-white px-3 text-[14px] text-carbon outline-none focus:border-lima-dark focus:ring-2 focus:ring-lima/40";
const num = (s: string) => Number(s.replace(/\./g, "").replace(",", ".")) || 0;

export function FormEstudio(props: { oportunidades: Opcion[]; personas: Opcion[]; tipos: Opcion[]; puedeCrear: boolean; comerciales: Opcion[] | null }) {
  const [tipo, setTipo] = useState<TipoObra>("ascensor");
  const [caso, setCaso] = useState("B");
  const [paradas, setParadas] = useState("");
  const [m2f, setM2f] = useState("");
  const [m2c, setM2c] = useState("");

  // El SATE necesita sus m²; el ascensor, si no se dan las paradas, las saca de Catastro.
  const faltanM2 = esSate(tipo) && !(tipo !== "cubierta" && num(m2f)) && !(tipo !== "fachada" && num(m2c));
  const entrada: EntradaCostes | null = faltanM2
    ? null
    : { tipo, caso, paradas: tipo === "ascensor" ? num(paradas) || null : null, m2f: num(m2f), m2c: num(m2c) };

  return (
    <section className="mt-5 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <h2 className="text-[17px] font-bold text-carbon">La obra</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className={ETQ}>Tipo de obra</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoObra)} className={CAMPO}>
            {TIPOS.map((t) => (
              <option key={t.clave} value={t.clave}>
                {t.nombre}
              </option>
            ))}
          </select>
        </label>
        {tipo === "ascensor" && (
          <>
            <label className="block">
              <span className={ETQ}>Caso</span>
              <select value={caso} onChange={(e) => setCaso(e.target.value)} className={CAMPO}>
                {CASOS.map(([c, t]) => (
                  <option key={c} value={c}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={ETQ}>Paradas</span>
              <input value={paradas} onChange={(e) => setParadas(e.target.value)} inputMode="numeric" placeholder="vacío: las de Catastro" className={CAMPO} />
            </label>
          </>
        )}
        {esSate(tipo) && tipo !== "cubierta" && (
          <label className="block">
            <span className={ETQ}>m² de fachada</span>
            <input value={m2f} onChange={(e) => setM2f(e.target.value)} inputMode="decimal" className={CAMPO} />
          </label>
        )}
        {esSate(tipo) && tipo !== "fachada" && (
          <label className="block">
            <span className={ETQ}>m² de cubierta</span>
            <input value={m2c} onChange={(e) => setM2c(e.target.value)} inputMode="decimal" className={CAMPO} />
          </label>
        )}
      </div>
      {faltanM2 && <p className="mt-2 text-[12px] font-semibold text-amber-800">Para el SATE hacen falta los m².</p>}

      <EmitirInforme entrada={entrada} clase="estudio_ayudas" {...props} />
    </section>
  );
}
