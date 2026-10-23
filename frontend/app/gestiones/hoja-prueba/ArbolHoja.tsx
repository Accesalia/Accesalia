"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Elegir, type Opcion } from "../../components/Elegir";
import { ESTILOS } from "./estilosArbol";
import { montarArbol } from "./motorArbol";

/** Lo que el catalogo de bloques da por defecto a cada linea, por el codigo del bloque. */
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

/** La hoja en arbol de la maqueta validada, montada sobre los datos de la base. No guarda nada. */
export function ArbolHoja({ defectos, interesa, accesos }: { defectos: Record<string, Defecto>; interesa: string[]; accesos: { id: string; texto: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => (ref.current ? montarArbol(ref.current, { defectos, interesa, accesos }) : undefined), [defectos, interesa, accesos]);
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
              <button type="button" className="generar" id="generar" disabled title="Es una prueba: todavía no guarda nada">Generar la hoja</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
