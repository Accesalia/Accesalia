"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { accionApuntarCajon, accionPermisosCajon } from "./acciones";

// SUBIR DESDE SU HUECO (Monica, 29-oct-2026: «hay que dejar el hueco para completarlo si viene»). Un documento que se sabe
// lo que es (el presupuesto de la contrata) se sube aqui mismo y queda en Documentos ya archivado con su tipo. Lo mismo que
// el cajon (CajonOpp): permiso, subida directa al almacen y apunte.

const ACEPTA = ".pdf,.doc,.docx,.xls,.xlsx,.odt,.ods,image/*";
const MAX = 25 * 1024 * 1024;

export function SubirConTipo({ oppId, tipoId, rotulo }: { oppId: string; tipoId: string; rotulo: string }) {
  const router = useRouter();
  const elegir = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(f: File | undefined) {
    if (!f) return;
    if (f.size > MAX) return setError("Puede pesar como mucho 25 MB.");
    setError(null);
    setSubiendo(true);
    try {
      const p = await accionPermisosCajon(oppId, [f.name]);
      if (!p.ok) throw new Error(p.error);
      const r = await fetch(p.permisos[0].url, { method: "PUT", headers: { "Content-Type": f.type || "application/octet-stream", "x-upsert": "false" }, body: f });
      if (!r.ok) throw new Error(`No se ha podido subir «${f.name}».`);
      const a = await accionApuntarCajon(oppId, [{ ruta: p.permisos[0].ruta, nombre: f.name }], tipoId);
      if (!a.ok) throw new Error(a.error);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubiendo(false);
      if (elegir.current) elegir.current.value = "";
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <input ref={elegir} type="file" accept={ACEPTA} className="hidden" onChange={(e) => subir(e.target.files?.[0])} aria-label={rotulo} />
      <button
        type="button"
        disabled={subiendo}
        onClick={() => elegir.current?.click()}
        className="rounded-[6px] border border-dashed border-carbon/40 bg-white px-3 py-1 text-[12.5px] font-semibold text-carbon/75 transition hover:border-carbon hover:text-carbon disabled:opacity-50"
      >
        {subiendo ? "Subiendo…" : rotulo}
      </button>
      {error && <span className="text-[12px] text-alerta">{error}</span>}
    </span>
  );
}
