"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Elegir, type Opcion } from "../../components/Elegir";
import { CLAUSULA_ICIO, ESTILO_PAPEL, esqueletoHoja } from "../../../lib/hojaPapel";
import { ESTILOS } from "./estilosArbol";
import { montarArbol } from "./motorArbol";
import { accionGuardarBorrador } from "./acciones";
import type { FilaHoja, LineaGuardada } from "../../../lib/hojaCompromisos";

/** Lo que el catalogo de bloques da por defecto a cada linea, por el codigo del bloque. forma = id en he_formas_pago.
 *  titulo y puntos = su texto en el papel (texto_plantilla), para la vista previa. */
export type Defecto = { cobra: boolean; importe: number | null; forma: string | null; pct: number | null; titulo: string; puntos: string[] };

/** La oportunidad: se elige aqui y la pagina se recarga con ella. */
export function ElegirOpp({ opciones, valor }: { opciones: Opcion[]; valor: string | null }) {
  const router = useRouter();
  return (
    <div className="w-full max-w-[520px]">
      <Elegir id="opp" nombre="Oportunidad" opciones={opciones} valor={valor ?? ""} vacio="Elige una oportunidad" conPista alElegir={(v) => router.push(`/gestiones/hoja-prueba?opp=${v}`)} />
    </div>
  );
}

/** La hoja en arbol de la maqueta validada, montada sobre los datos de la base. Guarda en borrador en las tablas nuevas,
 *  previsualiza el papel y, con un borrador, lo carga para seguir editandolo. */
export function ArbolHoja({ oppId, defectos, interesa, accesos, formas, comunidad, municipio, borrador }: {
  oppId: string; defectos: Record<string, Defecto>; interesa: string[]; accesos: { id: string; texto: string }[];
  formas: { id: string; nombre: string; frases: string[] }[]; comunidad: { nombre: string; cif: string | null } | null; municipio: string | null;
  borrador: { id: string; lineas: LineaGuardada[] } | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const alGuardar = async (filas: FilaHoja[]) => {
      setAviso(null);
      const r = await accionGuardarBorrador(oppId, filas, borrador?.id ?? null);
      if (!r.ok) return setAviso({ ok: false, texto: `No se ha guardado: ${r.error}` });
      setAviso({ ok: true, texto: "Guardada en borrador. Debajo, lo que ha quedado en la base." });
      // Lo guardado se queda abierto para seguir con el (cargado desde la base: asi se comprueba tambien la vuelta).
      if (borrador?.id === r.id) router.refresh();
      else router.replace(`/gestiones/hoja-prueba?opp=${oppId}&borrador=${r.id}`);
    };
    return montarArbol(ref.current, {
      defectos, interesa, accesos, formas, alGuardar, inicial: borrador?.lineas ?? null,
      papel: { esqueleto: esqueletoHoja(), icio: CLAUSULA_ICIO, municipio, razon: comunidad?.nombre ?? "", cif: comunidad?.cif ?? "" },
    });
  }, [oppId, defectos, interesa, accesos, formas, comunidad, municipio, borrador, router]);
  return (
    <div className="ah rounded-lg bg-white p-3">
      <style dangerouslySetInnerHTML={{ __html: ESTILOS + ESTILO_PAPEL }} />
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
              {aviso && <span className={`mr-2 text-sm ${aviso.ok ? "text-carbon/70" : "text-red-800"}`}>{aviso.texto}</span>}
              <button type="button" className="secundario" id="previsualizar" disabled>Previsualizar</button>
              <button type="button" className="generar" id="generar" disabled>Guardar como borrador</button>
            </div>
            <div id="faltan" />
            <div id="confirma" />
            <div id="previa" />
          </div>
        </div>
      </div>
    </div>
  );
}
