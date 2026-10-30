"use client";

import { useEffect, useState, useTransition } from "react";
import type { ParaPreguntar } from "../../lib/preguntasEscaneo";
import { accionCerrarPregunta, accionMirarRespuestas, accionParaPreguntar, accionPreguntar } from "./acciones";

// PREGUNTAR A QUIEN MANDO EL POLYCAM (Monica, 30-oct-2026, lo que pidio el
// arquitecto): «esta direccion no esta creada», «¿tienes el patio escaneado?».
// Va al remitente del escaneo, no al comercial de la opp; las copias se eligen
// al enviar. Sale de tecnicos@ y las respuestas se ven aqui debajo.

const ajeno =
  "inline-flex h-[30px] items-center justify-center rounded-[8px] border border-[#3f5f80] bg-ajeno px-3.5 text-[12px] font-bold uppercase tracking-wide text-white transition hover:bg-[#4a6d91] disabled:opacity-50";
const ajenoClaro =
  "inline-flex h-[30px] items-center justify-center rounded-[8px] border border-ajeno/40 bg-ajeno-soft px-3.5 text-[12px] font-bold uppercase tracking-wide text-[#3f5f80] transition hover:bg-[#dde7f1] disabled:opacity-50";
const campo =
  "w-full rounded-[10px] border border-carbon/25 bg-white px-3 py-2 text-[14px] text-carbon outline-none transition focus:border-lima-dark focus:ring-2 focus:ring-lima/40";
const etq = "block text-[10.5px] font-bold uppercase tracking-[0.06em] text-carbon/70";

const cuando = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

export function PreguntarAlComercial({ escaneoId }: { escaneoId: string }) {
  const [d, setD] = useState<ParaPreguntar | null | "cargando" | { fallo: string }>("cargando");
  const [abierta, setAbierta] = useState(false);
  const [asunto, setAsunto] = useState("");
  const [texto, setTexto] = useState("");
  const [paras, setParas] = useState<string[]>([]);
  const [copias, setCopias] = useState<string[]>([]);
  // Lo tecleado y aun sin Intro: se manda igual.
  const [otroPara, setOtroPara] = useState("");
  const [otra, setOtra] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  useEffect(() => {
    setD("cargando");
    setAbierta(false);
    accionParaPreguntar(escaneoId)
      .then(setD)
      .catch((e) => setD({ fallo: e instanceof Error ? e.message : String(e) }));
  }, [escaneoId]);

  if (d === "cargando" || d === null) return null;
  // Si no carga, se dice: una caja que desaparece en silencio no se echa en falta.
  if ("fallo" in d)
    return <p className="mt-3 rounded-lg border border-alerta/40 bg-[#fbeeee] px-3 py-1.5 text-[12.5px] text-alerta">No se ha podido cargar «Preguntar a quien lo mandó»: {d.fallo}</p>;
  const nombre = d.quien ?? d.para;

  const abrir = () => {
    setAsunto(d.asunto);
    setTexto("");
    setParas(d.para ? [d.para] : []);
    setCopias([]);
    setOtroPara("");
    setOtra("");
    setAviso(null);
    setHecho(null);
    setAbierta(true);
  };
  const parasTodos = otroPara.trim() ? [...paras, otroPara.trim().toLowerCase()] : paras;
  const enviar = () =>
    empezar(async () => {
      setAviso(null);
      const copiasTodas = otra.trim() ? [...copias, otra] : copias;
      const fallo = await accionPreguntar(escaneoId, asunto, texto, parasTodos, copiasTodas);
      if (fallo) return setAviso(fallo);
      setAbierta(false);
      setHecho(`Enviada a ${parasTodos.map((c) => d.equipo.find((p) => p.email === c)?.nombre ?? c).join(", ")}.`);
      setD(await accionParaPreguntar(escaneoId));
    });
  const mirar = () =>
    empezar(async () => {
      const r = await accionMirarRespuestas(escaneoId);
      setAviso(r.aviso);
      if (r.datos) setD(r.datos);
    });
  const cerrar = (id: string, si: boolean) =>
    empezar(async () => {
      await accionCerrarPregunta(id, si);
      setD(await accionParaPreguntar(escaneoId));
    });

  return (
    <div className="mt-3 rounded-xl border border-ajeno/30 bg-[#f6f9fc] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[12.5px] text-carbon/75">
          {d.para ? (
            <>
              Escaneo mandado por <b className="text-carbon">{nombre}</b>
              {d.quien && <span className="text-carbon/50"> · {d.para}</span>}
            </>
          ) : (
            "No se sabe quién mandó este escaneo (llegó del propio Polycam): elige tú a quién preguntar."
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {d.preguntas.some((p) => !p.cerradaEn) && (
            <button type="button" onClick={mirar} disabled={pendiente} className={ajenoClaro}>
              Mirar si ha contestado
            </button>
          )}
          {!abierta && (
            <button type="button" onClick={abrir} className={ajeno}>
              {d.para ? `Preguntar a ${d.quien?.split(" ")[0] ?? "quien lo mandó"}` : "Preguntar"}
            </button>
          )}
        </div>
      </div>

      {hecho && <p className="mt-2 text-[12.5px] font-semibold text-lima-dark">{hecho}</p>}
      {aviso && <p className="mt-2 rounded-lg border border-alerta/40 bg-[#fbeeee] px-3 py-1.5 text-[12.5px] text-alerta">{aviso}</p>}

      {abierta && (
        <div className="mt-3 space-y-2.5 rounded-lg border border-black/5 bg-white p-3">
          {/* PARA, TAMBIEN CAMBIABLE (Monica, 30-oct-2026): si el Polycam lo mando
              Abraham por Daniel, la pregunta puede ir a Daniel y quitar a Abraham. */}
          <Correos titulo="Para" lista={paras} cambiar={setParas} otro={otroPara} setOtro={setOtroPara} equipo={d.equipo} fuera={copias} />
          <Correos titulo="En copia" lista={copias} cambiar={setCopias} otro={otra} setOtro={setOtra} equipo={d.equipo} fuera={paras} />
          <label className="block">
            <span className={etq}>Asunto</span>
            <input value={asunto} onChange={(e) => setAsunto(e.target.value)} className={`${campo} mt-1`} />
          </label>
          <label className="block">
            <span className={etq}>Qué le preguntas</span>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={4}
              placeholder="Esta dirección no está dada de alta… / ¿Tienes un escaneado del patio o del sótano?"
              className={`${campo} mt-1`}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={enviar} disabled={pendiente || !texto.trim() || !parasTodos.length} className={ajeno}>
              {pendiente ? "Enviando…" : "Enviar"}
            </button>
            <button type="button" onClick={() => setAbierta(false)} className={ajenoClaro}>
              Cancelar
            </button>
          </div>
          <p className="text-[11.5px] text-carbon/55">Sale de técnicos@ con tu nombre; la respuesta aparecerá aquí.</p>
        </div>
      )}

      {d.preguntas.length > 0 && (
        <ul className="mt-3 space-y-2">
          {d.preguntas.map((p) => {
            const contestada = !!p.cerradaEn || p.respuestas.length > 0;
            return (
              <li key={p.id} className="rounded-lg border border-black/5 bg-white p-2.5 text-[13px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12px] text-carbon/60">
                    {cuando(p.creadoEn)} · {p.autor ?? "?"} → {p.para}
                    {p.copias.length > 0 && ` · copia a ${p.copias.join(", ")}`}
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide " +
                        (contestada ? "border border-lima bg-lima-soft text-lima-dark" : "border border-amber-300 bg-amber-50 text-amber-800")
                      }
                    >
                      {p.respuestas.length ? "contestada" : p.cerradaEn ? "dada por contestada" : "esperando respuesta"}
                    </span>
                    {!p.respuestas.length && (
                      <button type="button" onClick={() => cerrar(p.id, !p.cerradaEn)} disabled={pendiente} className="text-[11.5px] font-semibold text-[#3f5f80] hover:underline">
                        {p.cerradaEn ? "Reabrir" : "Dar por contestada"}
                      </button>
                    )}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-line text-carbon">{p.texto}</p>
                {p.respuestas.map((r) => (
                  <div key={r.id} className="mt-2 border-l-2 border-lima pl-2.5">
                    <div className="text-[12px] text-carbon/60">
                      {r.de} · {cuando(r.fecha)}
                    </div>
                    {r.texto && <p className="mt-0.5 whitespace-pre-line text-carbon">{r.texto}</p>}
                    {r.adjuntos.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {r.adjuntos.map((a) =>
                          a.url ? (
                            <a key={a.nombre} href={a.url} target="_blank" rel="noreferrer" className="text-[12px] font-semibold text-[#3f5f80] underline">
                              {a.nombre}
                            </a>
                          ) : (
                            <span key={a.nombre} className="text-[12px] text-carbon/55">
                              {a.nombre}
                            </span>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Una fila de correos: los elegidos, con su ×, alguien del equipo o cualquier
 *  otro correo tecleado (con Intro, o se manda tal cual al enviar). */
function Correos({
  titulo,
  lista,
  cambiar,
  otro,
  setOtro,
  equipo,
  fuera,
}: {
  titulo: string;
  lista: string[];
  cambiar: (l: string[]) => void;
  otro: string;
  setOtro: (s: string) => void;
  equipo: { nombre: string; email: string }[];
  /** Los que ya estan en la otra fila. */
  fuera: string[];
}) {
  const añadir = (c: string) => {
    const x = c.trim().toLowerCase();
    if (x && !lista.includes(x) && !fuera.includes(x)) cambiar([...lista, x]);
  };
  return (
    <div>
      <span className={etq}>{titulo}</span>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {lista.map((c) => (
          <span key={c} className="inline-flex items-center gap-1 rounded-full border border-ajeno/40 bg-ajeno-soft px-2.5 py-0.5 text-[12px] text-[#3f5f80]">
            {equipo.find((p) => p.email === c)?.nombre ?? c}
            <button type="button" onClick={() => cambiar(lista.filter((x) => x !== c))} className="font-bold" title="Quitar">
              ×
            </button>
          </span>
        ))}
        <select value="" onChange={(e) => añadir(e.target.value)} className="rounded-lg border border-dashed border-ajeno/60 bg-transparent px-2 py-1 text-[12px] font-bold text-[#3f5f80]">
          <option value="">+ Alguien del equipo</option>
          {equipo
            .filter((p) => !lista.includes(p.email) && !fuera.includes(p.email))
            .map((p) => (
              <option key={p.email} value={p.email}>
                {p.nombre}
              </option>
            ))}
        </select>
        <input
          value={otro}
          onChange={(e) => setOtro(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              añadir(otro);
              setOtro("");
            }
          }}
          placeholder="u otro correo (Intro)"
          className="w-[200px] rounded-lg border border-carbon/20 px-2 py-1 text-[12.5px] outline-none focus:border-lima-dark"
        />
      </div>
    </div>
  );
}
