import Link from "next/link";
import { redirect } from "next/navigation";
import { quienSoy } from "../../lib/sesion";
import { calendarioFiscal, EMPRESAS, LIBRO_LABEL, librosFiscales, type Empresa, type LibroFiscal } from "../../lib/fiscal";
import { MarcoDinero } from "../facturacion/MarcoDinero";
import { hoyMadrid, Impuestos } from "./Impuestos";

export const dynamic = "force-dynamic";

// PAGAR › IMPUESTOS (Monica, 16-oct-2026): la pantalla de la maqueta validada
// (docs/figma/area-dinero-v1.html, marco 5) dentro del marco comun del dinero.
// El menu de la izquierda filtra por empresa (?empresa=). Cada libro aparte, como
// la facturacion: Accesalia y Daniel juntos; Ecobalance solo para Ana y direccion
// (?libro=ecobalance). Nominas, proveedores y gastos fijos: «luego» en el menu.

const ACTIVO_EMPRESA: Record<string, string> = { accesalia: "emp-accesalia", daniel_autonomo: "emp-daniel" };

export default async function PaginaPagar({ searchParams }: { searchParams: Promise<{ empresa?: string; libro?: string; todo?: string }> }) {
  const sp = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/pagar");
  const libros = librosFiscales(yo);
  if (!libros.length) redirect("/menu");
  const libro: LibroFiscal = libros.includes(sp.libro as LibroFiscal) ? (sp.libro as LibroFiscal) : libros[0];
  const deLibro = EMPRESAS[libro];
  const empresa = deLibro.includes(sp.empresa as Empresa) ? (sp.empresa as Empresa) : null;
  const empresas = empresa ? [empresa] : deLibro;
  const todo = sp.todo === "1";
  const hoy = hoyMadrid();
  const pagos = (await calendarioFiscal(libro)).filter((p) => empresas.includes(p.empresa));

  const q = (extra: Record<string, string | null>) => {
    const u = new URLSearchParams();
    const v = { libro: libro === libros[0] ? null : libro, empresa, todo: todo ? "1" : null, ...extra };
    for (const [k, x] of Object.entries(v)) if (x) u.set(k, x);
    const s = u.toString();
    return s ? `/pagar?${s}` : "/pagar";
  };
  const otro = libros.find((l) => l !== libro);
  const BTN = "inline-flex h-10 items-center gap-2 rounded-[9px] border border-[#d6dad2] bg-white px-[18px] text-[14px] font-bold text-carbon-soft";

  return (
    <MarcoDinero yo={yo} area="pagar" activo={libro === "accesalia" ? ["impuestos", empresa ? ACTIVO_EMPRESA[empresa] : "emp-todas"] : "impuestos"}>
      <div className="mb-[22px] flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[30px] font-[750] leading-[1.1] tracking-[-.5px] text-carbon">Impuestos</h1>
          <div className="mt-1.5 text-[14.5px] text-carbon/65">
            {empresa ? (empresa === "daniel_autonomo" ? "Daniel de Soto" : "Accesalia") : LIBRO_LABEL[libro]}
            {libro === "accesalia" ? " · los presenta GMA · domiciliados" : ""}
            {otro && (
              <>
                {" · "}
                <Link href={`/pagar${otro === libros[0] ? "" : `?libro=${otro}`}`} className="font-semibold text-lima-dark hover:underline">
                  ver {LIBRO_LABEL[otro]} →
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2.5">
          <span className={BTN + " cursor-default opacity-50"} title="Se monta cuando esté: el correo a GMA pidiendo los importes del trimestre">
            Pedir importes a GMA <span className="text-[10px] font-semibold uppercase tracking-wide">luego</span>
          </span>
          <Link href={q({ todo: todo ? null : "1" })} className={BTN + " hover:border-carbon/40"}>
            {todo ? "Solo los próximos meses" : "Calendario completo"}
          </Link>
        </div>
      </div>
      <Impuestos pagos={pagos} empresas={empresas} hoy={hoy} todo={todo} hrefTodo={q({ todo: "1" })} />
    </MarcoDinero>
  );
}
