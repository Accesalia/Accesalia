"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Elegir } from "../../components/Elegir";
import { VentanaDireccion, type DireccionResuelta } from "../../comercial/oportunidades/nueva/VentanaDireccion";
import type { EntradaCostes } from "../../../lib/informeCostes";
import { crearOportunidadYEmitir, emitirParaOportunidad, emitirSinGuardar, type DatosRapidos } from "./acciones";

// EL INFORME, ¿PARA QUIEN? (Monica, 12-oct-2026). Un buscador entre nuestras
// oportunidades. Si la direccion no esta, se busca en Catastro (hace falta el
// edificio para las plantas y las ayudas) y salen dos botones:
//   - "Emitir sin guardar": queda solo el rastro, con fecha y hora;
//   - "Crear oportunidad y emitir": una ventana rapida, la del satelite del
//     movil ("la he probado en la app de escritorio y funciona genial"). Todo
//     opcional: la oportunidad nace coja y se completa en el PC.
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
}: {
  entrada: EntradaCostes | null;
  oportunidades: Opcion[];
  personas: Opcion[];
  tipos: Opcion[];
  puedeCrear: boolean;
}) {
  const router = useRouter();
  const [opp, setOpp] = useState("");
  const [buscando, setBuscando] = useState<string | null>(null);
  const [nueva, setNueva] = useState<DireccionResuelta | null>(null);
  const [rapida, setRapida] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enCurso, empezar] = useTransition();

  // La ventana rapida.
  const [admin, setAdmin] = useState("");
  const [contacto, setContacto] = useState("");
  const [cNombre, setCNombre] = useState("");
  const [cTel, setCTel] = useState("");
  const [nTipos, setNTipos] = useState<string[]>([]);
  const [paso, setPaso] = useState("");

  const lanzar = (accion: () => Promise<{ ok: true; id: string } | { ok: false; error: string }>) => {
    setError(null);
    empezar(async () => {
      const r = await accion();
      if (r.ok) router.push(`/referencia/estimacion/informe/${r.id}`);
      else setError(r.error);
    });
  };
  const sinEntrada = !entrada;
  const datos = (): DatosRapidos => ({ administrador: admin, contacto, contactoNombre: cNombre, contactoTelefono: cTel, tipos: nTipos, paso });

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
              setRapida(false);
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
          <button type="button" disabled={sinEntrada || enCurso} onClick={() => lanzar(() => emitirParaOportunidad(opp, entrada!))} className={bOscuro}>
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
            <button type="button" disabled={sinEntrada || enCurso} onClick={() => lanzar(() => emitirSinGuardar(nueva, entrada!))} className={bBlanco}>
              {enCurso && !rapida ? "Emitiendo…" : "Emitir sin guardar"}
            </button>
            {puedeCrear && (
              <button type="button" disabled={sinEntrada || enCurso} onClick={() => setRapida(true)} className={bLima}>
                Crear oportunidad y emitir
              </button>
            )}
          </div>
          <p className="mt-2 text-[12px] text-carbon/70">
            «Sin guardar» no crea nada: solo queda apuntada la dirección, con fecha y hora, en «Direcciones vistas que no
            llegaron a mayores».
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

      {/* LA VENTANA RAPIDA: la de "Es nueva" del satelite. */}
      {rapida && nueva && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[8vh]" onClick={() => !enCurso && setRapida(false)}>
          <div className="w-full max-w-[520px] rounded-2xl border border-[#8a6410] bg-form-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[17px] font-bold text-carbon">Oportunidad nueva</h3>
                <p className="text-[13px] text-carbon/70">{nueva.nombre}</p>
              </div>
              <button type="button" disabled={enCurso} onClick={() => setRapida(false)} className="text-[13px] font-semibold text-carbon/65 hover:text-carbon">
                Cancelar
              </button>
            </div>
            <p className="mt-2 text-[13px] text-carbon/70">Lo que sepas ahora. Todo es opcional: lo demás se completa en su ficha.</p>

            <span className={ETQ + " mt-3"}>Administrador</span>
            <Elegir
              id="est_n_admin"
              nombre=""
              opciones={personas.filter((p) => p.valor.startsWith("puesto:"))}
              valor={admin}
              alElegir={setAdmin}
              vacio="de la lista…"
              conPista
              clase="mt-1"
            />
            <span className={ETQ + " mt-3"}>Persona de contacto en la comunidad</span>
            <Elegir
              id="est_n_contacto"
              nombre=""
              opciones={personas.filter((p) => p.valor.startsWith("puesto:") || p.valor.startsWith("pc:"))}
              valor={contacto}
              alElegir={setContacto}
              vacio="de la lista…"
              conPista
              clase="mt-1"
            />
            {!contacto && (
              <div className="mt-1.5 grid grid-cols-[1fr_140px] gap-1.5">
                <input value={cNombre} onChange={(e) => setCNombre(e.target.value)} placeholder="o escríbelo: nombre" className={CAMPO} />
                <input value={cTel} onChange={(e) => setCTel(e.target.value)} placeholder="teléfono" inputMode="tel" className={CAMPO} />
              </div>
            )}
            <span className={ETQ + " mt-3"}>Qué quieren</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {tipos.map((t) => {
                const on = nTipos.includes(t.valor);
                return (
                  <button
                    key={t.valor}
                    type="button"
                    onClick={() => setNTipos((a) => (on ? a.filter((x) => x !== t.valor) : [...a, t.valor]))}
                    className={
                      "rounded-full border px-3 py-1 text-[13px] font-semibold " +
                      (on ? "border-[#5c4208] bg-[#5c4208] text-white" : "border-carbon/25 bg-white text-carbon/75 hover:border-carbon/50")
                    }
                  >
                    {t.texto}
                  </button>
                );
              })}
            </div>
            <span className={ETQ + " mt-3"}>Siguiente paso</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {PASOS.map((p) => (
                <button
                  key={p.clave}
                  type="button"
                  onClick={() => setPaso(paso === p.clave ? "" : p.clave)}
                  className={
                    "rounded-xl border px-3.5 py-1.5 text-[13px] font-semibold " +
                    (paso === p.clave ? "border-[#5c4208] bg-[#5c4208] text-white" : "border-carbon/25 bg-white text-carbon/75 hover:border-carbon/50")
                  }
                >
                  {p.texto}
                </button>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <button type="button" disabled={enCurso} onClick={() => setRapida(false)} className={bBlanco}>
                Cancelar
              </button>
              <button type="button" disabled={enCurso || sinEntrada} onClick={() => lanzar(() => crearOportunidadYEmitir(nueva, datos(), entrada!))} className={bLima}>
                {enCurso ? "Creando…" : "Crear y emitir"}
              </button>
            </div>
            {error && <p className="mt-2 text-[13px] text-alerta">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
