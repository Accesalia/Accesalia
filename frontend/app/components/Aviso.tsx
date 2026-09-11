"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

// Confirmacion visible (Monica, 11-sep-2026: al publicar "no parece ocurrir
// nada"). El aviso aparece en el centro, fijo, este donde este la pagina, y
// se va solo a los pocos segundos. Los errores se quedan hasta cerrarlos.

export function Aviso({ texto, tono = "bien" }: { texto: string; tono?: "bien" | "mal" }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    if (tono === "bien") {
      const t = setTimeout(() => setVisible(false), 3200);
      return () => clearTimeout(t);
    }
  }, [texto, tono]);
  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-24 z-50 flex justify-center px-4" role="status" aria-live="polite">
      <div
        className={
          "pointer-events-auto flex max-w-lg items-start gap-3 rounded-2xl px-5 py-4 text-base shadow-2xl " +
          (tono === "bien" ? "bg-carbon text-white" : "border border-amber-300 bg-amber-50 text-amber-900")
        }
      >
        <span
          className={
            "mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full text-sm font-bold " +
            (tono === "bien" ? "bg-lima text-carbon" : "bg-amber-200 text-amber-900")
          }
        >
          {tono === "bien" ? "✓" : "!"}
        </span>
        <span className="flex-1">{texto}</span>
        {tono === "mal" && (
          <button type="button" onClick={() => setVisible(false)} className="text-sm font-semibold opacity-60 hover:opacity-100" aria-label="Cerrar">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

/** Boton de envio que dice lo que esta haciendo mientras el servidor trabaja. */
export function BotonEnviar({
  children,
  pendiente,
  className,
  name,
  value,
}: {
  children: React.ReactNode;
  pendiente: string;
  className: string;
  name?: string;
  value?: string;
}) {
  const { pending, data } = useFormStatus();
  // Si el formulario tiene varios botones, solo el pulsado cambia de texto.
  const esteBoton = !name || data?.get(name) === value;
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={className + " disabled:cursor-wait disabled:opacity-60"}>
      {pending && esteBoton ? pendiente : children}
    </button>
  );
}
