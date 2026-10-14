import { EscaneoPrevisto } from "./EscaneoPrevisto";
import type { Gestion } from "../../../../lib/gestionOportunidad";

// LOS DATOS QUE BAJAN DE LA CABECERA AL BLOQUE 1 (Monica, 14-oct-2026): "son
// datos: no desaparecen, cambian de sitio. Si estoy en fase de junta no tiene
// sentido ver la fecha de escaneado, y ocupaba pantalla". El codigo, el
// distrito, la referencia catastral, el escaneo y las cuatro casillas. Como
// queda este bloque se ve despues; de momento, una tira.
export function DatosOpp({
  id,
  g,
  quieren,
  distrito,
  escaneo,
}: {
  id: string;
  g: Gestion;
  quieren: string[];
  distrito: string | null;
  /** La visita de escaneo apuntada, "AAAA-MM-DDTHH:MM" en hora de Madrid. */
  escaneo: string;
}) {
  const casillas = [
    { que: "Necesita viabilidad", si: g.hitos.find((h) => h.clave === "viabilidad_arquitecto")?.aplicable ?? false },
    { que: "Necesita 3D", si: g.hitos.find((h) => h.clave === "tresd")?.aplicable ?? false },
    { que: "Necesita 3 presupuestos", si: quieren.some((q) => /presupuesto/i.test(q)) },
    { que: "Necesita financiación", si: quieren.some((q) => /financiaci/i.test(q)) },
  ];
  return (
    <div className="mb-[10px] flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[10px] border border-[#d9d9d9] bg-white px-3.5 py-2.5 text-[12px]">
      <span className="text-carbon/60">
        {g.codigo && <b className="text-carbon/80">{g.codigo}</b>}
        {distrito && <> &nbsp;·&nbsp; {distrito}</>}
        {g.referenciaCatastral && (
          <>
            {" "}
            &nbsp;·&nbsp; <span className="font-mono">{g.referenciaCatastral}</span>
          </>
        )}
      </span>
      <EscaneoPrevisto id={id} inicial={escaneo} />
      <span className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#8a8a8a]">Recibido</span>
        <span className="text-[11px] text-[#8a8a8a]">
          {g.hitos.find((h) => h.clave === "polycam")?.estado === "hecho" ? "sí" : "todavía no ha llegado"}
        </span>
      </span>
      {/* Las cuatro casillas: se MARCAN en "Qué contratan", aquí se leen. */}
      <span className="flex flex-wrap gap-x-4 gap-y-1">
        {casillas.map((c) => (
          <span key={c.que} className="flex items-center gap-1.5 text-[12px] text-carbon">
            <i className={"inline-block h-3 w-3 shrink-0 rounded-[2px] border-[1.5px] " + (c.si ? "border-[#2b2b2b] bg-[#2b2b2b]" : "border-[#6a6a6a]")} />
            {c.que}
          </span>
        ))}
      </span>
    </div>
  );
}
