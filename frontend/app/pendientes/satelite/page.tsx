import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";
import { misApuntes, type TipoApunte } from "../../../lib/apuntesSatelite";
import { ListaApuntes } from "./ListaApuntes";

export const dynamic = "force-dynamic";

// LO QUE SE APUNTO EN EL SATELITE Y AUN NO ESTA CREADO (Monica, 13-oct-2026). A
// esta lista llevan dos tarjetas de Pendientes: las opps y los administradores
// nuevos lanzados desde el movil. Se completan y se dan de alta, o se descartan.

const TEXTO: Record<TipoApunte, { titulo: string; sub: string; color: string }> = {
  oportunidad: {
    titulo: "Opps nuevas que has lanzado desde el satélite",
    sub: "No están creadas, solo apuntadas: les faltan datos para poder darlas de alta.",
    color: "rgba(120, 182, 184, 0.5)",
  },
  administrador: {
    titulo: "Administradores nuevos creados desde el satélite",
    sub: "Me pasaste el dato, todo anotado, pero para crearlos hay que completar algunas cosas.",
    color: "rgba(124, 109, 178, 0.5)",
  },
};

export default async function ApuntesSatelite({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/pendientes/satelite");
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/pendientes");
  const { tipo: t } = await searchParams;
  const tipo: TipoApunte = t === "administrador" ? "administrador" : "oportunidad";
  const apuntes = await misApuntes(yo, tipo);
  const x = TEXTO[tipo];

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1100px] px-6 pb-20 pt-5 text-sm">
        <Salida href="/pendientes">← Pendientes</Salida>
        <div className="mt-3 rounded-[20px] px-6 py-5" style={{ background: x.color }}>
          <h1 className="text-[24px] font-bold uppercase leading-[1.35] tracking-[1.32px] text-black">{x.titulo}</h1>
          <p className="mt-1 text-[16px] font-bold leading-[1.35] text-black">{x.sub}</p>
        </div>
        <ListaApuntes apuntes={apuntes} tipo={tipo} />
      </main>
    </div>
  );
}
