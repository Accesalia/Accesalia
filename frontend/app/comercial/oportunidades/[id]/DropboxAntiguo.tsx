import { enlaceDeLaApp } from "../../../../lib/dropbox";

// LO ANTIGUO DE DROPBOX, debajo de los bloques y solo cuando lo hay (Monica,
// 19-oct-2026): "son cosas historicas, a veces estan mal migradas y son
// demasiadas para ir una a una, pero tener el enlace a la carpeta lo facilita".
// Pasan por la app (28-oct-2026): el enlace directo solo lo abria Daniel.

const ANTIGUO =
  "inline-flex h-[32px] items-center rounded-[6px] border border-[#d9d9d9] bg-white px-3.5 text-[12px] font-bold uppercase text-carbon/80 transition hover:bg-[#fbf3d9]";

export function DropboxAntiguo({ ficha, carpeta }: { ficha: string | null; carpeta: string | null }) {
  if (!ficha && !carpeta) return null;
  return (
    <div className="mt-[10px] flex flex-wrap gap-2">
      {ficha && (
        <a href={enlaceDeLaApp(ficha, true)} target="_blank" rel="noopener noreferrer" className={ANTIGUO}>
          Ficha de datos antigua ↗
        </a>
      )}
      {carpeta && (
        <a href={enlaceDeLaApp(carpeta)} target="_blank" rel="noopener noreferrer" className={ANTIGUO}>
          Carpeta antigua ↗
        </a>
      )}
    </div>
  );
}
