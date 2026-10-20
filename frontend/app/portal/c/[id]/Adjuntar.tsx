"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionPermisoSubida, accionRegistrar } from "../../acciones";
import type { ClavePortal } from "../../../../lib/portal";

// «+ ADJUNTAR DOCUMENTO» DE UNA VENTANITA (Monica, 21-oct-2026): se pulsa para
// elegirlo o se suelta encima de la ventanita. Llega ya sabiendo que papel es.
// En «Otros documentos» se pide antes que documento es.

export function Adjuntar({
  comunidadId, clave, hojaId = null, oportunidadId = null, estado = null, children,
}: {
  comunidadId: string; clave: ClavePortal | "hoja_firmada" | "otro"; hojaId?: string | null; oportunidadId?: string | null;
  /** El simbolo del estado, abajo a la derecha. */
  estado?: React.ReactNode; children: React.ReactNode;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [encima, setEncima] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [subiendo, empezar] = useTransition();
  const esOtro = clave === "otro";

  const subir = (f: File | undefined) => {
    if (!f) return;
    setError(null);
    if (esOtro && !descripcion.trim()) return setError("Escribe primero qué documento es.");
    empezar(async () => {
      const p = await accionPermisoSubida(comunidadId, f.name, f.type, f.size);
      if (!p.ok) return setError(p.error);
      const put = await fetch(p.url, { method: "PUT", headers: { "Content-Type": f.type || "application/octet-stream", "x-upsert": "false" }, body: f });
      if (!put.ok) return setError("No se ha podido subir el fichero. Vuelve a intentarlo.");
      const r = await accionRegistrar({
        comunidadId,
        hojaId: clave === "hoja_firmada" ? hojaId : null,
        clave: clave === "hoja_firmada" || esOtro ? null : clave,
        oportunidadId: clave === "votacion" ? oportunidadId : null,
        descripcion: esOtro ? descripcion.trim() : null,
        ruta: p.ruta,
        nombreFichero: f.name,
        nombre: null,
      });
      if (!r.ok) return setError(r.error);
      setDescripcion("");
      router.refresh();
    });
  };

  return (
    <div
      className={"flex min-h-full flex-col rounded-[inherit] transition " + (encima ? "ring-2 ring-[#3f7a1c] ring-offset-2" : "")}
      onDragOver={(e) => {
        e.preventDefault();
        setEncima(true);
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={(e) => {
        e.preventDefault();
        setEncima(false);
        subir(e.dataTransfer.files?.[0]);
      }}
    >
      {children}
      {esOtro && (
        <input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Qué documento es"
          className="mt-3 w-full rounded-md border border-black/20 bg-white px-2.5 py-1.5 text-[13px] outline-none placeholder:text-black/45 focus:border-[#3f7a1c]"
        />
      )}
      {error && <p className="mt-2 text-[12.5px] font-semibold text-[#c8102e]">{error}</p>}
      <div className="mt-auto flex items-end justify-between gap-2.5 pt-3">
        <button
          type="button"
          disabled={subiendo}
          onClick={() => input.current?.click()}
          className="flex items-center gap-1.5 whitespace-nowrap text-[13.5px] text-[#3f7a1c] disabled:opacity-60"
        >
          <span className="inline-flex h-[13px] w-[13px] flex-none items-center justify-center rounded-full border border-[#3f7a1c] text-[10px]">+</span>
          <span className="underline">{subiendo ? "Subiendo…" : "Adjuntar documento"}</span>
        </button>
        {estado}
      </div>
      <input ref={input} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => subir(e.target.files?.[0])} />
    </div>
  );
}
