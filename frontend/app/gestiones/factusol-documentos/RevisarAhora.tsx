"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// «Revisar ahora»: la misma lectura de Factusol que la de cada noche (clientes, pedidos y facturas).
export function RevisarAhora() {
  const router = useRouter();
  const [leyendo, empezar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const revisar = () => {
    setAviso(null);
    empezar(async () => {
      try {
        const res = await fetch("/api/factusol/clientes", { method: "POST" });
        const j = (await res.json()) as { ok: boolean; dice?: string };
        if (!j.ok) return setAviso(j.dice ?? "No se ha podido leer Factusol.");
        router.refresh();
      } catch {
        setAviso("No se ha podido leer Factusol.");
      }
    });
  };
  return (
    <>
      <button type="button" className="btn" onClick={revisar} disabled={leyendo}>{leyendo ? "Leyendo Factusol…" : "Revisar ahora"}</button>
      {aviso && <div className="aviso">{aviso}</div>}
    </>
  );
}
