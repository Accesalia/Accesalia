import { detalleCobro } from "../../../../lib/cobros";
import { opcionesFicha } from "../../../../lib/fichaFinanciera";
import { Buscador } from "./Buscador";
import { HojasDeLaOpp } from "./HojasDeLaOpp";

// LO COMUN DE «MODIFICAR HITOS» Y «BUSCAR DIRECCION»: el buscador y, elegida una
// direccion, sus hojas firmadas vigentes con sus lineas e hitos. Solo el libro
// de Accesalia y Daniel: las lineas de Ecobalance no las ve Alexandra.

export async function Pantalla({ ruta, oppId, modificar, titulo }: { ruta: string; oppId: string | null; modificar: boolean; titulo: string }) {
  // La lista del buscador: las opps con hoja firmada, como en la ficha financiera.
  const [d, opciones] = await Promise.all([oppId ? detalleCobro(oppId, "accesalia") : null, opcionesFicha()]);
  return (
    <>
      {!d && <h1 className="mb-4 text-[28px] font-bold leading-tight text-carbon">{titulo}</h1>}
      <Buscador ruta={ruta} opciones={opciones} inicial={d?.opp.nombre ?? undefined} />
      {oppId && !d && <p className="mt-6 text-[14px] text-carbon/60">No se ha encontrado esa dirección.</p>}
      {d && (
        <>
          <h1 className="mt-6 text-[28px] font-bold leading-tight text-carbon">{d.opp.nombre ?? d.opp.codigo}</h1>
          <p className="mt-1 text-[14.5px] text-carbon/65">
            {d.documentos.length === 0
              ? "Ninguna hoja de encargo firmada."
              : `${d.documentos.length} ${d.documentos.length === 1 ? "hoja de encargo firmada vigente" : "hojas de encargo firmadas vigentes"}`}
            {modificar ? " · «+ modificar» en cada hito que aún no se ha facturado" : " · para cambiar algo, en «Modificar Hitos»"}
          </p>
          <HojasDeLaOpp oppId={d.opp.id} documentos={d.documentos} modificar={modificar} />
        </>
      )}
    </>
  );
}
