"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { modelarCasillas } from "../acciones";

function Pulso() {
  return (
    <span className="relative flex h-3 w-3">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lima opacity-75" />
      <span className="relative inline-flex h-3 w-3 rounded-full bg-lima" />
    </span>
  );
}

function Marco({ titulo, sub }: { titulo: string; sub: string }) {
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <div className="mx-auto flex flex-col items-center gap-4">
        <Pulso />
        <h1 className="text-2xl font-bold text-carbon">{titulo}</h1>
        <p className="text-carbon/60">{sub}</p>
      </div>
    </div>
  );
}

// La IA esta leyendo la convocatoria (prompt 1). Refresca cada 5s hasta que el
// estado deja de ser 'procesando'.
export function Procesando() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [router]);
  return (
    <Marco
      titulo="Leyendo la convocatoria…"
      sub="La IA está extrayendo requisitos, documentos y fechas del PDF. Suele tardar 1–2 minutos."
    />
  );
}

// Ya hay borrador del prompt 1 pero faltan las casillas (prompt 2). Las dispara
// una sola vez y refresca al terminar.
export function ModelandoCasillas({ convocatoriaId }: { convocatoriaId: string }) {
  const router = useRouter();
  const lanzado = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lanzado.current) return;
    lanzado.current = true;
    modelarCasillas(convocatoriaId)
      .then(() => router.refresh())
      .catch((e) => setError(String(e?.message ?? e)));
  }, [convocatoriaId, router]);

  if (error) {
    return <Marco titulo="No se pudieron modelar las casillas" sub={error} />;
  }
  return (
    <Marco
      titulo="Organizando la documentación…"
      sub="Convirtiendo los documentos en casillas (partes, alternativas, ejemplares). Un momento."
    />
  );
}
