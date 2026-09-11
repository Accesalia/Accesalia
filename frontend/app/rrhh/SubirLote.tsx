"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prepararSubidaLote, procesarLote } from "./accionesNominas";

// Subir el PDF de nominas de la gestoria, el de todas juntas. Va directo al
// almacen privado; luego la app lo lee y abre la revision.

export function SubirLote() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [fichero, setFichero] = useState<File | null>(null);
  const [estado, setEstado] = useState<{ tono: "mal" | "espera"; texto: string } | null>(null);

  async function subir() {
    if (!fichero) return;
    setEstado({ tono: "espera", texto: "Subiendo el PDF…" });
    try {
      const p = await prepararSubidaLote(fichero.name);
      if (!p.ok) return setEstado({ tono: "mal", texto: p.error });
      const r = await fetch(p.url, { method: "PUT", headers: { "Content-Type": "application/pdf", "x-upsert": "false" }, body: fichero });
      if (!r.ok) return setEstado({ tono: "mal", texto: "No se ha podido subir. Vuelve a intentarlo." });
      setEstado({ tono: "espera", texto: "Leyendo las nóminas…" });
      const l = await procesarLote(p.ruta);
      if (!l.ok) return setEstado({ tono: "mal", texto: l.error });
      router.push(`/rrhh?lote=${l.id}#lote`);
    } catch {
      setEstado({ tono: "mal", texto: "No se ha podido subir. Revisa la conexión y vuelve a intentarlo." });
    }
  }

  return (
    <div className="grid gap-2 rounded-xl bg-hueso p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid min-w-0 flex-1 gap-1 text-xs font-semibold text-carbon/55">
          PDF de la gestoría (todas las nóminas del mes juntas)
          <input
            ref={input}
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              setFichero(e.target.files?.[0] ?? null);
              setEstado(null);
            }}
            className="w-full min-w-0 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-carbon"
          />
        </label>
        <button
          type="button"
          onClick={subir}
          disabled={!fichero || estado?.tono === "espera"}
          className="rounded-full bg-lima px-4 py-2 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          Subir y leer
        </button>
      </div>
      {estado && <p className={`text-sm ${estado.tono === "mal" ? "text-alerta" : "text-carbon/60"}`}>{estado.texto}</p>}
      <p className="text-xs text-carbon/50">Nada se publica hasta que lo revises: primero verás de quién es cada página.</p>
    </div>
  );
}
