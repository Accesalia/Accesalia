"use client";

// Captura por VOZ (STT nativo del navegador/movil, Web Speech API) conviviendo con
// un textarea de toda la vida. El comercial dicta o escribe, como prefiera. Lo que
// se dicta se AÑADE al texto; nada se pierde. Si el navegador no soporta voz, se
// queda solo el textarea (degradacion elegante).
//
// Se ve lo que se esta oyendo MIENTRAS hablas, no al terminar la frase. Antes iba
// con interimResults en false y el texto aparecia a golpes, asi que parecia roto:
// dictabas, no pasaba nada, y de pronto salia todo junto. Sin retorno inmediato no
// te fias de un microfono.

import { useEffect, useRef, useState } from "react";

// Tipos minimos de la Web Speech API (no vienen en lib.dom por defecto).
type SpeechRecognitionLike = {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void;
  onresult: ((e: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

export function DictadoVoz({ name, placeholder }: { name: string; placeholder?: string }) {
  const [texto, setTexto] = useState("");
  // lo que se esta oyendo ahora y el navegador aun no da por cerrado
  const [parcial, setParcial] = useState("");
  const [escuchando, setEscuchando] = useState(false);
  const [soporta, setSoporta] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    setSoporta(true);
    const rec = new Ctor();
    rec.lang = "es-ES";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let cerrado = "";
      let enCurso = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) cerrado += e.results[i][0].transcript;
        else enCurso += e.results[i][0].transcript;
      }
      // lo cerrado baja al texto de verdad; lo demas se ensena en gris y se
      // reemplaza en cuanto el navegador se decide
      if (cerrado) setTexto((t) => (t ? t + " " : "") + cerrado.trim());
      setParcial(enCurso.trim());
    };
    rec.onend = () => { setEscuchando(false); setParcial(""); };
    rec.onerror = () => { setEscuchando(false); setParcial(""); };
    recRef.current = rec;
    return () => { try { rec.stop(); } catch {} };
  }, []);

  const alternar = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (escuchando) { rec.stop(); setEscuchando(false); setParcial(""); }
    else { try { rec.start(); setEscuchando(true); } catch {} }
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {soporta && (
          <button type="button" onClick={alternar}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${escuchando ? "bg-red-500 text-white animate-pulse" : "bg-lima-soft text-lima-dark hover:bg-lima"}`}>
            {escuchando ? "● Grabando… (pulsa para parar)" : "🎤 Dictar"}
          </button>
        )}
        <span className="text-xs text-carbon/40">{soporta ? "Dicta o escribe; se combinan." : "Escribe la nota (este navegador no soporta voz)."}</span>
      </div>

      <div className="relative">
        <textarea
          name={name}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={8}
          placeholder={placeholder}
          className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-lima ${
            escuchando ? "border-red-300 ring-2 ring-red-100" : "border-black/15"
          }`}
        />
        {escuchando && (
          <span className="pointer-events-none absolute right-3 top-2 text-[11px] font-semibold uppercase tracking-wide text-red-500">
            escuchando
          </span>
        )}
      </div>

      {/* Lo que se esta oyendo ahora mismo. Se ve al instante aunque el navegador
          tarde en dar la frase por buena: asi sabes que el microfono te oye. */}
      {escuchando && (
        <p className="mt-1.5 min-h-[1.25rem] text-sm italic text-carbon/45">
          {parcial || "…"}
        </p>
      )}
    </div>
  );
}
