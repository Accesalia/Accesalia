import Link from "next/link";
import { redirect } from "next/navigation";
import { quienSoy } from "../../../lib/sesion";
import { comercialesConsulta, listadoOportunidades } from "../../../lib/consulta";
import { CAJA, ENLACE, FiltroComercial, Marco } from "../Marco";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// EL LISTADO DE OPORTUNIDADES, DE UN VISTAZO (Monica, 7-oct-2026): "en plan
// listado tipo excel, cuadro de vista rapida". Lo minimo: nombre, en que punto
// esta y quien es el admin. Por comercial o todos. Pinchar el nombre abre la
// ficha de la comunidad; pinchar el admin deja solo las suyas.

// El color del bloque por el que va, como en el carril.
const BLOQUE: Record<number, string> = {
  0: "bg-amber-50 text-amber-800",
  1: "bg-[#E3EAF0] text-[#104269]",
  2: "bg-[#E9F3EC] text-[#0C8124]",
  3: "bg-[#fdf6e3] text-[#8a5a00]",
  4: "bg-[#F7EAEA] text-[#820707]",
};

export default async function ListadoOportunidades({ searchParams }: { searchParams: Promise<{ c?: string; admin?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/consulta/oportunidades");
  const { c, admin } = await searchParams;
  const [filas, comerciales] = await Promise.all([listadoOportunidades(), comercialesConsulta()]);

  const delAdmin = admin ? filas.filter((f) => f.admin?.id === admin) : filas;
  const nombreAdmin = admin ? filas.find((f) => f.admin?.id === admin)?.admin?.nombre ?? "este administrador" : null;
  const lista = c ? delAdmin.filter((f) => f.comercialId === c) : delAdmin;
  const cuenta = (id: string | null) => (id ? delAdmin.filter((f) => f.comercialId === id).length : delAdmin.length);

  return (
    <Marco aqui="/consulta/oportunidades">
      <div className="flex flex-wrap items-center gap-3">
        <FiltroComercial base="/consulta/oportunidades" comerciales={comerciales} elegido={c ?? null} cuenta={cuenta} extra={admin ? `admin=${admin}` : ""} />
        {nombreAdmin && (
          <Link
            href={`/consulta/oportunidades${c ? `?c=${c}` : ""}`}
            className="rounded-full border border-[#104269] bg-[#E3EAF0] px-3 py-1 text-[12.5px] font-semibold text-[#104269]"
            title="Quitar el filtro del administrador"
          >
            Administrador: {nombreAdmin} ×
          </Link>
        )}
      </div>

      <section className={CAJA + " mt-3 overflow-hidden"}>
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 bg-[#f4f4f1]">
            <tr className="text-left text-[10px] uppercase tracking-[0.07em] text-[#6e6e6e]">
              <th className="border-b border-[#d9d9d9] px-3 py-2 font-bold">Oportunidad · {lista.length}</th>
              <th className="border-b border-[#d9d9d9] px-3 py-2 font-bold">En qué punto está</th>
              <th className="border-b border-[#d9d9d9] px-3 py-2 font-bold">Administrador</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-carbon/60">
                  No hay ninguna.
                </td>
              </tr>
            )}
            {lista.map((f) => (
              <tr key={f.id} className="odd:bg-white even:bg-[#fafaf8] hover:bg-[#f1f5ee]">
                <td className="border-b border-[#f0f0f0] px-3 py-1.5">
                  {f.comunidadId ? (
                    <Link href={`/administracion/comunidades/${f.comunidadId}`} className={ENLACE}>
                      {f.nombre}
                    </Link>
                  ) : (
                    <span className="font-semibold text-carbon/80" title="Sin comunidad todavía: no hay ficha que abrir">
                      {f.nombre}
                    </span>
                  )}
                  {f.codigo && <span className="ml-2 text-[11px] text-[#8a8a8a]">{f.codigo}</span>}
                </td>
                <td className="border-b border-[#f0f0f0] px-3 py-1.5">
                  <span className={"rounded-[5px] px-2 py-0.5 text-[12px] " + (BLOQUE[f.bloque] ?? "")}>{f.punto}</span>
                </td>
                <td className="border-b border-[#f0f0f0] px-3 py-1.5">
                  {f.admin ? (
                    <Link href={`/consulta/oportunidades?admin=${f.admin.id}${c ? `&c=${c}` : ""}`} className={ENLACE} title="Ver solo las suyas">
                      {f.admin.nombre}
                    </Link>
                  ) : (
                    <span className="text-[#8a8a8a]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Marco>
  );
}
