import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { quienSoy } from "../../../lib/sesion";
import { datosHoja, oppsParaHoja } from "../../../lib/hojaEncargo";
import { FORMAS_PAGO } from "../../../lib/hojaPapel";
import { ArbolHoja, ElegirOpp, type Defecto } from "./ArbolHoja";

export const dynamic = "force-dynamic";

// CREAR HOJA DE ENCARGO · PRUEBA (Monica, 22-oct-2026): «en un apartado solo para mi, para probarlo con la base».
// La maqueta validada (docs/figma/hoja-encargo-arbol.md) sobre una opp de verdad: lo que les interesa y el catalogo de
// bloques salen de la base, con la misma lectura que el generador de hojas (datosHoja). NO GUARDA NADA. Solo direccion.

// Lo que les interesa (oportunidad_tipos) -> el paquete del catalogo que lo cubre.
const PAQUETE: Record<string, string> = {
  Ascensor: "asc", Subvenciones: "subv", CSS: "css", IEE: "iee", DF: "df", CAES: "caes", Financiación: "fin",
  "Consulta urbanística": "cons", "Informe técnico": "inf", "Informe pericial": "per", "Memoria técnica valorada": "mem", "3 Presupuestos": "tres",
  Plataforma: "acc", Rampa: "acc", Accesibilidad: "acc", "Cota cero": "acc", "Modificación asc.": "acc", "Sustitución de ascensor": "acc",
  "Accesibilidad portal": "acc", "Añadir parada": "acc", "Cambio de puertas": "acc", "Cambio de cabina": "acc",
  "SATE envolvente completa": "efi", "SATE fachada": "efi", "SATE cubierta": "efi", Aerotermia: "efi", Fotovoltaica: "efi", "Eficiencia energética": "efi",
};

export default async function HojaPrueba({ searchParams }: { searchParams: Promise<{ opp?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/gestiones/hoja-prueba");
  if (!yo.veTodo) redirect("/gestiones");
  const sp = await searchParams;
  const [opps, d] = await Promise.all([oppsParaHoja(yo), sp.opp ? datosHoja(sp.opp) : Promise.resolve(null)]);

  const defectos: Record<string, Defecto> = {};
  for (const b of d?.bloques ?? [])
    defectos[b.codigo] = {
      cobra: b.desglose === "se_cobra",
      importe: b.importe != null ? Number(b.importe) : null,
      // Sin forma de pago en el bloque, los proyectos llevan la habitual del generador.
      forma: b.formaPagoDefecto ?? (b.naturaleza === "proyecto" ? FORMAS_PAGO[0] : null),
      pct: b.exito?.porcentaje ?? null,
    };
  const interesa = [...new Set((d?.interes ?? []).map((t) => PAQUETE[t.nombre]).filter(Boolean))];
  const sinPaquete = (d?.interes ?? []).filter((t) => !PAQUETE[t.nombre]).map((t) => t.nombre);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-5 sm:px-6">
        <Salida href="/gestiones">← Gestiones de la app</Salida>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-black/10 pb-3">
          <h1 className="text-2xl font-bold text-carbon">Crear hoja de encargo</h1>
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-900/80">Prueba · no guarda nada</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <ElegirOpp opciones={opps} valor={sp.opp ?? null} />
          {d && (
            <span className="text-sm text-carbon/70">
              Para: <b className="text-carbon">{d.comunidad?.nombre ?? "sin comunidad"}</b>
              {d.interes.length > 0 && <> · Les interesa: <b className="text-carbon">{d.interes.map((t) => t.nombre).join(", ")}</b></>}
              {sinPaquete.length > 0 && <span className="text-amber-800/80"> (sin paquete en el catálogo: {sinPaquete.join(", ")})</span>}
            </span>
          )}
        </div>
        <div className="mt-4">
          {d ? <ArbolHoja key={d.opp.id} defectos={defectos} interesa={interesa} /> : sp.opp ? <p className="text-sm text-amber-800/80">No encuentro esa oportunidad.</p> : null}
        </div>
      </main>
    </div>
  );
}
