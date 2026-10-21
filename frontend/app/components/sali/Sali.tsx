"use client";

import { Fragment, useState, useTransition } from "react";
import { accionPreguntarSali, type Consulta } from "./acciones";

// PREGÚNTALE A SALI (Monica, 21-oct-2026: «que aqui haya una forma de acceder a la IA, para hacerle consultas sobre
// estos datos y que pueda buscar en ellos»). Una conversacion: cada respuesta, con «cómo lo he mirado» debajo.

type Msg = { role: "user" | "assistant"; content: string; consultas?: Consulta[] };

const EJEMPLOS = [
  "¿Por qué el resultado de 2025 no sube si se facturó más?",
  "¿Qué partidas de gasto han crecido más de 2024 a 2025?",
  "¿Cuánto nos cuesta cada persona en nómina al mes, y cómo ha cambiado?",
  "¿Qué clientes nos han facturado más este año?",
];

/** Un markdown minimo: negritas, listas y tablas (lo que suele escribir Sali). */
function Texto({ t }: { t: string }) {
  const negrita = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <Fragment key={i}>{p}</Fragment>));
  const lineas = t.split("\n");
  const out: React.ReactNode[] = [];
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    if (l.trim().startsWith("|")) {
      const filas: string[][] = [];
      while (i < lineas.length && lineas[i].trim().startsWith("|")) {
        const celdas = lineas[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!celdas.every((c) => /^:?-{2,}:?$/.test(c))) filas.push(celdas);
        i++;
      }
      i--;
      out.push(
        <table key={i} className="my-1.5 w-auto border-collapse text-[12.5px] tabular-nums">
          <tbody>
            {filas.map((f, k) => (
              <tr key={k} className={k === 0 ? "font-bold text-carbon/80" : "border-t border-black/10"}>
                {f.map((c, j) => <td key={j} className={`px-2 py-0.5 ${j > 0 ? "text-right" : ""}`}>{negrita(c)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>,
      );
    } else if (/^\s*[-•·]\s+/.test(l)) out.push(<li key={i} className="ml-5 list-disc">{negrita(l.replace(/^\s*[-•·]\s+/, ""))}</li>);
    else if (/^#{1,4}\s/.test(l)) out.push(<p key={i} className="mt-1.5 font-bold">{negrita(l.replace(/^#+\s/, ""))}</p>);
    else if (l.trim()) out.push(<p key={i} className="my-0.5">{negrita(l)}</p>);
  }
  return <div className="text-[13.5px] leading-relaxed text-carbon">{out}</div>;
}

export function Sali({ pantalla }: { pantalla: string }) {
  const [abierto, setAbierto] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pregunta, setPregunta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pend, empezar] = useTransition();

  const preguntar = (q: string) => {
    const texto = q.trim();
    if (!texto || pend) return;
    const nuevos: Msg[] = [...msgs, { role: "user", content: texto }];
    setMsgs(nuevos);
    setPregunta("");
    setError(null);
    empezar(async () => {
      const r = await accionPreguntarSali(nuevos.map(({ role, content }) => ({ role, content })), pantalla);
      if (!r.ok) return setError(r.error);
      setMsgs((m) => [...m, { role: "assistant", content: r.respuesta, consultas: r.consultas }]);
    });
  };

  if (!abierto)
    return (
      <button type="button" onClick={() => setAbierto(true)}
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-ajeno/40 bg-ajeno-soft px-4 py-2 text-[14px] font-bold text-ajeno hover:border-ajeno">
        💬 Pregúntale a Sali sobre estos datos
      </button>
    );

  return (
    <section className="mt-4 max-w-[980px] rounded-2xl border border-ajeno/40 bg-white px-4 py-3">
      <div className="mb-2 flex items-center gap-3">
        <h2 className="text-[13px] font-extrabold uppercase tracking-widest text-ajeno">💬 Pregúntale a Sali</h2>
        <span className="text-[12px] text-carbon/60">Mira la base entera (dinero, nóminas, opps, hojas…), solo para leer. Tarda un poco: consulta antes de contestar.</span>
        <button type="button" onClick={() => setAbierto(false)} className="ml-auto text-[12.5px] font-semibold text-carbon/60 hover:text-carbon">cerrar</button>
      </div>

      {!msgs.length && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {EJEMPLOS.map((e) => (
            <button key={e} type="button" onClick={() => preguntar(e)} className="rounded-lg border border-black/10 bg-[#f7f7f5] px-2.5 py-1 text-left text-[12.5px] text-carbon/80 hover:border-ajeno/50">{e}</button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <p key={i} className="self-end rounded-xl bg-ajeno-soft px-3 py-2 text-[13.5px] font-semibold text-carbon">{m.content}</p>
          ) : (
            <div key={i} className="rounded-xl border border-black/10 bg-[#fcfcfa] px-3 py-2">
              <Texto t={m.content} />
              {!!m.consultas?.length && (
                <details className="mt-1.5">
                  <summary className="cursor-pointer text-[11.5px] font-semibold text-carbon/55">cómo lo he mirado · {m.consultas.length} consultas</summary>
                  <ul className="mt-1 space-y-1">
                    {m.consultas.map((c, k) => (
                      <li key={k} className="text-[11.5px] text-carbon/70">
                        <span className="font-semibold">{c.para_que ?? "consulta"}</span>
                        {c.error ? <span className="text-alerta"> · error: {c.error}</span> : <span> · {c.filas} filas</span>}
                        <pre className="mt-0.5 overflow-x-auto whitespace-pre-wrap rounded bg-black/[.04] px-2 py-1 text-[10.5px] text-carbon/65">{c.sql}</pre>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ),
        )}
        {pend && <p className="text-[13px] text-carbon/60">Sali está mirando los datos… (puede tardar un minuto)</p>}
        {error && <p className="text-[13px] font-semibold text-alerta">{error}</p>}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea value={pregunta} onChange={(e) => setPregunta(e.target.value)} rows={2}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); preguntar(pregunta); } }}
          placeholder="Escribe tu pregunta… (Enter envía; Mayúsculas+Enter, salto de línea)"
          className="w-full resize-y rounded-xl border border-black/15 bg-white px-3 py-2 text-[13.5px] focus:border-ajeno focus:outline-none" />
        <button type="button" disabled={pend || !pregunta.trim()} onClick={() => preguntar(pregunta)}
          className="rounded-xl bg-ajeno px-4 py-2 text-[13.5px] font-bold text-white disabled:opacity-40">Preguntar</button>
        {!!msgs.length && <button type="button" onClick={() => { setMsgs([]); setError(null); }} className="text-[12px] font-semibold text-carbon/55 hover:text-carbon">empezar de nuevo</button>}
      </div>
    </section>
  );
}
