"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Elegir, type Opcion } from "../../components/Elegir";
import { ESTILOS } from "./estilosArbol";
import { montarArbol } from "./motorArbol";
import { accionGuardarBorrador } from "./acciones";
import type { FilaHoja } from "../../../lib/hojaCompromisos";

/** Lo que el catalogo de bloques da por defecto a cada linea, por el codigo del bloque. forma = id en he_formas_pago. */
export type Defecto = { cobra: boolean; importe: number | null; forma: string | null; pct: number | null };

/** La oportunidad: se elige aqui y la pagina se recarga con ella. */
export function ElegirOpp({ opciones, valor }: { opciones: Opcion[]; valor: string | null }) {
  const router = useRouter();
  return (
    <div className="w-full max-w-[520px]">
      <Elegir id="opp" nombre="Oportunidad" opciones={opciones} valor={valor ?? ""} vacio="Elige una oportunidad" conPista alElegir={(v) => router.push(`/gestiones/hoja-prueba?opp=${v}`)} />
    </div>
  );
}

/** La hoja en arbol de la maqueta validada, montada sobre los datos de la base. Guarda en borrador en las tablas nuevas. */
export function ArbolHoja({ oppId, defectos, interesa, accesos, formas }: {
  oppId: string; defectos: Record<string, Defecto>; interesa: string[]; accesos: { id: string; texto: string }[]; formas: { id: string; nombre: string }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const alGuardar = async (filas: FilaHoja[]) => {
      setAviso(null);
      const r = await accionGuardarBorrador(oppId, filas);
      setAviso(r.ok ? { ok: true, texto: "Guardada en borrador. Debajo, lo que ha quedado en la base." } : { ok: false, texto: `No se ha guardado: ${r.error}` });
      if (r.ok) router.refresh();
    };
    return montarArbol(ref.current, { defectos, interesa, accesos, formas, alGuardar });
  }, [oppId, defectos, interesa, accesos, formas, router]);
  return (
    <div className="ah rounded-lg bg-white p-3">
      <style dangerouslySetInnerHTML={{ __html: ESTILOS }} />
      <div ref={ref}>
        <div className="dos">
          <nav className="cat" id="cat" aria-label="Catálogo" />
          <div className="der">
            <div id="avisos" />
            <div className="marco">
              <table>
                <thead>
                  <tr><th>Qué</th><th>En el papel</th><th>Se cobra</th><th>Importe</th><th>Cómo se cobra</th><th /></tr>
                </thead>
                <tbody id="hoja" />
              </table>
            </div>
            <div className="pie">
              {aviso && <span className={`mr-4 self-center text-sm ${aviso.ok ? "text-carbon/70" : "text-red-800"}`}>{aviso.texto}</span>}
              <button type="button" className="generar" id="generar" disabled>Guardar en borrador</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
