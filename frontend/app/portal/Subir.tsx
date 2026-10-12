"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionPermisoSubida, accionRegistrar } from "./acciones";

// SUBIR UN DOCUMENTO desde el portal: se arrastra o se elige (en el movil, la
// camara tambien vale). Va al almacen y queda "recibido, por revisar".

export function Subir({ comunidadId, hojaId, texto, conDescripcion }: { comunidadId: string; hojaId: string | null; texto: string; conDescripcion: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [encima, setEncima] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [nombre, setNombre] = useState("");
  const [hecho, setHecho] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, empezar] = useTransition();

  const subir = (f: File | undefined) => {
    if (!f) return;
    setError(null);
    setHecho(null);
    if (conDescripcion && !descripcion.trim()) return setError("Escribe primero qué documento es.");
    empezar(async () => {
      const p = await accionPermisoSubida(comunidadId, f.name, f.type, f.size);
      if (!p.ok) return setError(p.error);
      const put = await fetch(p.url, { method: "PUT", headers: { "Content-Type": f.type || "application/octet-stream", "x-upsert": "false" }, body: f });
      if (!put.ok) return setError("No se ha podido subir el fichero. Vuelve a intentarlo.");
      const r = await accionRegistrar({ comunidadId, hojaId, descripcion: descripcion.trim() || null, ruta: p.ruta, nombreFichero: f.name, nombre: nombre.trim() || null });
      if (!r.ok) return setError(r.error);
      setHecho(r.aceptada ? "Recibido y dado por bueno. Gracias." : "Recibido. Lo revisamos y te avisamos si falta algo. Gracias.");
      setDescripcion("");
      router.refresh();
    });
  };

  return (
    <div className="mt-2">
      {conDescripcion && (
        <input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Qué documento es: acta de la junta, DNI del presidente…"
          className="mb-2 w-full rounded-lg border border-carbon/30 bg-white px-3 py-2 text-[14px] outline-none placeholder:text-carbon/55 focus:border-lima"
        />
      )}
      <div
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
        onClick={() => input.current?.click()}
        className={
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition " +
          (encima ? "border-lima bg-lima-soft" : "border-carbon/25 bg-white hover:border-lima")
        }
      >
        <span className="text-[15px] font-semibold text-carbon">{subiendo ? "Subiendo…" : texto}</span>
        <span className="mt-1 text-[12.5px] text-carbon/65">Arrástralo aquí o pulsa para elegirlo. PDF o foto, hasta 25 MB.</span>
        <input ref={input} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => subir(e.target.files?.[0])} />
      </div>
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Tu nombre (opcional)"
        className="mt-2 w-full max-w-[320px] rounded-lg border border-carbon/20 bg-white px-3 py-1.5 text-[13px] outline-none placeholder:text-carbon/55 focus:border-lima"
      />
      {hecho && <p className="mt-2 text-[13px] font-semibold text-lima-dark">{hecho}</p>}
      {error && <p className="mt-2 text-[13px] font-semibold text-alerta">{error}</p>}
    </div>
  );
}
