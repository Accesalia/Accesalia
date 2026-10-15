import type { Gestion } from "../../../../lib/gestionOportunidad";
import { CAJA, ROT_CAJA } from "./estilo";

// LO ESTABLE DE LA FICHA (Monica, 15-oct-2026): el codigo, el distrito y la
// referencia catastral. Solo informa: no se toca a mano. Va el ultimo de los tres
// de arriba del bloque 1. Las cuatro casillas de antes (viabilidad, 3D, 3
// presupuestos, financiacion) se fueron: el 3D y la viabilidad tienen su sitio,
// y los 3 presupuestos y la financiacion se eligen en la hoja de encargo.
export function DatosOpp({ g, distrito }: { g: Gestion; distrito: string | null }) {
  return (
    <div className={CAJA + " px-3 py-2"}>
      <div className={ROT_CAJA}>La ficha</div>
      <div className="flex flex-col gap-0.5 text-[12.5px] text-carbon/75">
        {g.codigo && <b className="text-carbon/85">{g.codigo}</b>}
        {distrito && <span>{distrito}</span>}
        {g.referenciaCatastral ? <span className="font-mono text-[12px]">{g.referenciaCatastral}</span> : <span className="text-amber-700/70">sin referencia catastral</span>}
      </div>
    </div>
  );
}
