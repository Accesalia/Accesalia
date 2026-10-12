import Link from "next/link";
import type { Yo } from "../../lib/sesion";
import { puedeVerCobros } from "../../lib/cobros";
import { librosFiscales } from "../../lib/fiscal";

// LOS CUATRO BOTONES DEL DINERO (Monica, 12-oct-2026): quien lleva la
// facturacion hace trabajos separados, y al entrar tiene que verlos separados:
// COBRAR, PAGAR, PREVER y ASIGNAR. En la entrada salen grandes; dentro de cada
// area, arriba y en pequeno, para saltar de una a otra.

export type Area = "cobrar" | "pagar" | "prever" | "asignar";

const AREAS: { clave: Area; titulo: string; href: string; desc: string; ve: (yo: Yo) => boolean }[] = [
  {
    clave: "cobrar", titulo: "Cobrar", href: "/facturacion/cobrar",
    desc: "Las hojas firmadas, sus líneas e hitos, proformas y facturas.",
    ve: puedeVerCobros,
  },
  {
    clave: "pagar", titulo: "Pagar", href: "/pagar",
    desc: "Impuestos, nóminas y Seguridad Social, proveedores y gastos fijos.",
    ve: (yo) => librosFiscales(yo).length > 0,
  },
  {
    clave: "prever", titulo: "Prever", href: "/prever",
    desc: "Lo que entra y lo que sale cada mes: ¿llegamos?",
    ve: (yo) => yo.veTodo || yo.funciones.some((f) => f.clave === "facturacion"),
  },
  {
    clave: "asignar", titulo: "Asignar", href: "/facturacion/caja",
    desc: "El trabajo de los técnicos y cuándo se alcanza cada hito.",
    ve: puedeVerCobros,
  },
];

export const areasDe = (yo: Yo) => AREAS.filter((a) => a.ve(yo));

/** Los cuatro botones: grandes en la entrada, en pequeño dentro de cada área. */
export function Areas({ yo, activa }: { yo: Yo; activa?: Area }) {
  const areas = areasDe(yo);
  if (!activa)
    return (
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {areas.map((a) => (
          <Link
            key={a.clave}
            href={a.href}
            className="group rounded-3xl border border-black/10 bg-white p-7 shadow-sm transition hover:border-lima hover:shadow-md"
          >
            <div className="text-4xl font-bold text-carbon group-hover:text-lima-dark">{a.titulo}</div>
            <p className="mt-2 text-[15px] text-carbon/70">{a.desc}</p>
          </Link>
        ))}
      </div>
    );
  return (
    <nav className="flex flex-wrap gap-2">
      {areas.map((a) =>
        a.clave === activa ? (
          <span key={a.clave} className="rounded-xl bg-carbon px-4 py-2 text-[14px] font-bold text-white">
            {a.titulo}
          </span>
        ) : (
          <Link
            key={a.clave}
            href={a.href}
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-[14px] font-semibold text-carbon/75 hover:border-carbon/40"
          >
            {a.titulo}
          </Link>
        ),
      )}
    </nav>
  );
}
