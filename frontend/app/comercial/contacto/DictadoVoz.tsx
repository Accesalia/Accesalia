"use client";

// Captura por VOZ (STT nativo del navegador/movil, Web Speech API) conviviendo con
// un textarea de toda la vida. El comercial dicta o escribe, como prefiera. Lo que
// se dicta se AÑADE al texto; nada se pierde. Si el navegador no soporta voz, se
// queda solo el textarea (degradacion elegante).

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
    rec.interimResults = false;
    rec.onresult = (e) => {
      let add = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) add += e.results[i][0].transcript;
      }
      if (add) setTexto((t) => (t ? t + " " : "") + add.trim());
    };
    rec.onend = () => setEscuchando(false);
    rec.onerror = () => setEscuchando(false);
    recRef.current = rec;
    return () => { try { rec.stop(); } catch {} };
  }, []);

  const alternar = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (escuchando) { rec.stop(); setEscuchando(false); }
    else { try { rec.start(); setEscuchando(true); } catch {} }
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {soporta && (
          <button type="button" onClick={alternar}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${escuchando ? "bg-red-500 text-white animate-pulse" : "bg-lima-soft text-lima-dark hover:bg-lima"}`}>
            {escuchando ? "● Grabando… (pulsa para parar)" : "🎤 Dictar"}
          </button>
        )}
        <span className="text-xs text-carbon/40">{soporta ? "Dicta o escribe; se combinan." : "Escribe la nota (este navegador no soporta voz)."}</span>
      </div>
      <textarea
        name={name}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={8}
        placeholder={placeholder}
        className="block w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-lima"
      />
      {/* Marca el origen: si hay dictado, nota_voz; si no, manual (lo ajusta el server con el radio). */}
    </div>
  );
}
