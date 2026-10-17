import Link from "next/link";
import { redirect } from "next/navigation";
import { quienSoy } from "../../lib/sesion";
import { calendarioFiscal, EMPRESAS, LIBRO_LABEL, librosFiscales, obligacionesFiscales, type Empresa, type LibroFiscal } from "../../lib/fiscal";
import { MarcoDinero } from "../facturacion/MarcoDinero";
import { hoyMadrid, Impuestos } from "./Impuestos";

export const dynamic = "force-dynamic";

// PAGAR › IMPUESTOS (Monica, 17-oct-2026, rehecha): cada empresa por separado.
// Accesalia por defecto; Daniel y «las dos juntas» (solo para la caja de un dia)
// desde el menu. Cada libro lo suyo: Alexandra, Accesalia y Daniel; Ana,
// Ecobalance; direccion, todo (?libro=ecobalance). Ver Impuestos.tsx.

const ACTIVO: Record<string, string> = { accesalia: "emp-accesalia", daniel_autonomo: "emp-daniel", todas: "emp-todas" };
const TITULO: Record<string, string> = { accesalia: "Accesalia", daniel_autonomo: "Daniel de Soto", todas: "Accesalia y Daniel de Soto, juntas" };

export default async function PaginaPagar({ searchParams }: { searchParams: Promise<{ empresa?: string; libro?: string }> }) {
  const sp = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/pagar");
  const libros = librosFiscales(yo);
  if (!libros.length) redirect("/menu");
  const libro: LibroFiscal = libros.includes(sp.libro as LibroFiscal) ? (sp.libro as LibroFiscal) : libros[0];
  const deLibro = EMPRESAS[libro];
  const sel = libro === "accesalia" ? (sp.empresa === "todas" || sp.empresa === "daniel_autonomo" ? sp.empresa : "accesalia") : null;
  const empresas: Empresa[] = sel === "todas" || !sel ? deLibro : [sel as Empresa];
  const hoy = hoyMadrid();
  const [pagos, obligaciones] = await Promise.all([calendarioFiscal(libro), obligacionesFiscales(libro)]);
  const otro = libros.find((l) => l !== libro);

  return (
    <MarcoDinero yo={yo} area="pagar" activo={sel ? ["impuestos", ACTIVO[sel]] : "impuestos"}>
      <div className="mb-4">
        <h1 className="text-[22px] font-bold leading-tight text-carbon">Impuestos · {sel ? TITULO[sel] : LIBRO_LABEL[libro]}</h1>
        <p className="mt-0.5 text-[13px] text-carbon/65">
          {libro === "accesalia" ? "Los presenta GMA y van domiciliados. " : ""}
          Lo previsto sale de tu Excel de impuestos; lo real, de lo que se paga.
          {otro && (
            <>
              {" "}
              <Link href={`/pagar${otro === libros[0] ? "" : `?libro=${otro}`}`} className="font-semibold text-lima-dark hover:underline">
                Ver {LIBRO_LABEL[otro]} →
              </Link>
            </>
          )}
        </p>
      </div>
      <Impuestos pagos={pagos} obligaciones={obligaciones} empresas={empresas} hoy={hoy} />
    </MarcoDinero>
  );
}
