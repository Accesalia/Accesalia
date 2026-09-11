"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmarSubida, prepararSubida } from "./accionesDocumentos";

// Subir un documento de RRHH. El fichero va directo del navegador al almacen
// privado, con un permiso de un solo uso que da la app; luego la app lo
// comprueba y lo apunta. Hasta 25 MB: PDF, fotos, Word o Excel.

const MAX = 25 * 1024 * 1024;

export function SubirDocumento({
  personaId,
  tipos,
  mesPorDefecto,
}: {
  personaId: string | null;
  tipos: { valor: string; etiqueta: string }[];
  mesPorDefecto: string; // YYYY-MM, para las nominas
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState(tipos[0]?.valor ?? "");
  const [mes, setMes] = useState(mesPorDefecto);
  const [fichero, setFichero] = useState<File | null>(null);
  const [estado, setEstado] = useState<{ tono: "bien" | "mal" | "espera"; texto: string } | null>(null);

  async function subir() {
    if (!fichero) return;
    if (fichero.size > MAX) return setEstado({ tono: "mal", texto: "Pesa más de 25 MB. Si es un escaneo, prueba a guardarlo con menos calidad." });
    setEstado({ tono: "espera", texto: "Subiendo…" });
    try {
      const p = await prepararSubida({ personaId, tipo, nombre: fichero.name });
      if (!p.ok) return setEstado({ tono: "mal", texto: p.error });
      const r = await fetch(p.url, {
        method: "PUT",
        headers: { "Content-Type": fichero.type || "application/octet-stream", "x-upsert": "false" },
        body: fichero,
      });
      if (!r.ok) {
        const t = await r.text();
        return setEstado({
          tono: "mal",
          texto: /mime|type/i.test(t) ? "Ese tipo de fichero no se admite: sube un PDF, una foto, un Word o un Excel." : "No se ha podido subir. Vuelve a intentarlo.",
        });
      }
      const c = await confirmarSubida({ personaId, tipo, ruta: p.ruta, nombre: fichero.name, periodo: tipo === "nomina" ? mes : null });
      if (!c.ok) return setEstado({ tono: "mal", texto: c.error ?? "No se ha podido apuntar." });
      setEstado({ tono: "bien", texto: `Subido: ${fichero.name}` });
      setFichero(null);
      if (input.current) input.current.value = "";
      router.refresh();
    } catch {
      setEstado({ tono: "mal", texto: "No se ha podido subir. Revisa la conexión y vuelve a intentarlo." });
    }
  }

  const campo = "rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-lima focus:ring-2 focus:ring-lima/30";
  if (tipos.length === 0) return null;
  return (
    <div className="grid gap-2 rounded-xl bg-hueso p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs font-semibold text-carbon/55">
          Qué es
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={campo}>
            {tipos.map((t) => (
              <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
            ))}
          </select>
        </label>
        {tipo === "nomina" && (
          <label className="grid gap-1 text-xs font-semibold text-carbon/55">
            Mes
            <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className={campo} />
          </label>
        )}
        <label className="grid min-w-0 flex-1 gap-1 text-xs font-semibold text-carbon/55">
          Fichero
          <input
            ref={input}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx"
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
          Subir
        </button>
      </div>
      {estado && (
        <p className={`text-sm ${estado.tono === "mal" ? "text-alerta" : estado.tono === "bien" ? "text-lima-dark" : "text-carbon/60"}`}>{estado.texto}</p>
      )}
    </div>
  );
}
