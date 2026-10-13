"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Elegir } from "../../components/Elegir";
import { VentanaDireccion, type DireccionResuelta } from "../../comercial/oportunidades/nueva/VentanaDireccion";
import type { EntradaCostes } from "../../../lib/informeCostes";
import { emitirParaOportunidad, emitirSinGuardar } from "./acciones";

// EL INFORME, ¿PARA QUIEN? (Monica, 12-oct-2026). Un buscador entre nuestras
// oportunidades. Si la direccion no esta, se busca en Catastro (hace falta el
// edificio para las plantas y las ayudas) y se emite: queda el informe, sin
// oportunidad, y la direccion en Pendientes ("Direcciones para las que has
// generado informes") por si se le sigue la pista. AQUI NO SE CREAN OPPS
// (Monica, 13-oct-2026: "estimacion de costes no deberia crear opps").
// Cada informe se EMITE: se guarda tal cual salio y se abre para verlo,
// imprimirlo y, mas adelante, enviarlo.

type Opcion = { valor: string; texto: string; pista?: string };

const ETQ = "block text-[10.5px] font-bold uppercase tracking-[0.06em] text-carbon/60";
const CAMPO =
  "h-[38px] w-full rounded-[10px] border border-carbon/25 bg-white px-3 text-[14px] text-carbon outline-none placeholder:text-carbon/55 focus:border-lima-dark";
const PASOS = [
  { clave: "primer_contacto", texto: "Primer contacto" },
  { clave: "visita", texto: "Visita" },
  { clave: "envio_documentos", texto: "Envío de documentos" },
];
const bOscuro =
  "inline-flex h-[40px] items-center rounded-xl bg-carbon px-5 text-[14px] font-extrabold text-white transition hover:bg-carbon/85 disabled:cursor-not-allowed disabled:bg-carbon/25";
const bLima =
  "inline-flex h-[40px] items-center rounded-xl bg-lima px-5 text-[14px] font-extrabold text-carbon transition hover:bg-lima-dark hover:text-white disabled:cursor-not-allowed disabled:bg-black/10 disabled:text-carbon/40";
const bBlanco =
  "inline-flex h-[40px] items-center rounded-xl border border-carbon/30 bg-white px-5 text-[14px] font-bold text-carbon transition hover:border-carbon disabled:opacity-50";

export function EmitirInforme({
  entrada,
  oportunidades,
  personas,
  tipos,
  puedeCrear,
  comerciales,
  clase = "estimacion_costes",
}: {
  entrada: EntradaCostes | null;
  oportunidades: Opcion[];
  personas: Opcion[];
  tipos: Opcion[];
  puedeCrear: boolean;
  /** Solo si quien crea no es comercial: tiene que elegir de quien es. */
  comerciales: Opcion[] | null;
  /** Que se emite: el informe de costes o el estudio de ayudas (12-oct-2026). */
  clase?: "estimacion_costes" | "estudio_ayudas";
}) {
  const router = useRouter();
  const [opp, setOpp] = useState("");
  const [buscando, setBuscando] = useState<string | null>(null);
  const [nueva, setNueva] = useState<DireccionResuelta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enCurso, empezar] = useTransition();

  const lanzar = (accion: () => Promise<{ ok: true; id: string } | { ok: false; error: string }>) => {
    setError(null);
    empezar(async () => {
      const r = await accion();
      if (r.ok) router.push(clase === "estudio_ayudas" ? `/referencia/subvenciones/estudio/${r.id}` : `/referencia/estimacion/informe/${r.id}`);
      else setError(r.error);
    });
  };
  const sinEntrada = !entrada;

  return (
    <div className="mt-4 border-t border-black/5 pt-4">
      <span className={ETQ}>Con las ayudas de su edificio: ¿para qué dirección?</span>
      <div className="mt-1 flex flex-wrap items-start gap-3">
        <div className="min-w-[300px] flex-1">
          <Elegir
            id="estimacion_opp"
            nombre=""
            opciones={oportunidades}
            valor={opp}
            alElegir={(v) => {
              setOpp(v);
              setNueva(null);
            }}
            vacio="busca entre nuestras oportunidades…"
            conPista
            noEsta={(q) => {
              setOpp("");
              setBuscando(q);
            }}
          />
        </div>
        {opp && (
          <button type="button" disabled={sinEntrada || enCurso} onClick={() => lanzar(() => emitirParaOportunidad(opp, entrada!, clase))} className={bOscuro}>
            {enCurso ? "Emitiendo…" : "Emitir y guardar en la oportunidad"}
          </button>
        )}
      </div>
      {!opp && !nueva && (
        <p className="mt-1.5 text-[12px] text-carbon/65">
          ¿No está? Escríbela y pulsa «No está en la lista»: se busca en Catastro.
        </p>
      )}

      {/* Una direccion que no es de nadie, ya buscada en Catastro. */}
      {nueva && !opp && (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50/70 p-3.5">
          <p className="text-[14px] text-carbon">
            <b>{nueva.nombre}</b> <span className="text-carbon/70">· no es de ninguna oportunidad nuestra.</span>{" "}
            <button type="button" onClick={() => setBuscando(nueva.nombre)} className="text-[13px] font-semibold text-carbon/65 underline hover:text-carbon">
              cambiar
            </button>
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2.5">
            <button type="button" disabled={sinEntrada || enCurso} onClick={() => lanzar(() => emitirSinGuardar(nueva, entrada!, clase))} className={bLima}>
              {enCurso ? "Emitiendo…" : "Emitir"}
            </button>
          </div>
          <p className="mt-2 text-[12px] text-carbon/70">
            No crea ninguna oportunidad (Monica, 13-oct-2026: «estimación de costes no debería crear opps»). La dirección queda
            apuntada, con fecha y hora, en tus Pendientes («Direcciones para las que has generado informes»), por si quieres
            seguirle la pista.
          </p>
        </div>
      )}

      {sinEntrada && (opp || nueva) && (
        <p className="mt-2 text-[12px] font-semibold text-amber-800">Antes, completa arriba la obra (paradas o m²): sin eso no hay estimación.</p>
      )}
      {error && <p className="mt-2 rounded-lg border border-alerta/30 bg-alerta/5 px-3 py-2 text-[13px] text-alerta">{error}</p>}

      {buscando !== null && (
        <VentanaDireccion
          escrito={buscando}
          alListo={(r) => {
            setBuscando(null);
            setNueva(r);
          }}
          alCerrar={() => setBuscando(null)}
        />
      )}

    </div>
  );
}
