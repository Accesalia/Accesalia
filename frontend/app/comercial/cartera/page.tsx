import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { letraMenu } from "../../components/letraMenu";
import { comercialDe, puedeEntrar, quienSoy } from "../../../lib/sesion";
import { listarComerciales } from "../../../lib/comercial";
import { carteraGestores } from "../../../lib/carteraGestores";
import { CANALES, opcionesEntrada } from "../../../lib/entradaDiario";
import { guardarEntrada } from "../acciones";
import { CarteraClara } from "./CarteraClara";

export const dynamic = "force-dynamic";

// LA CARTERA DE ADMINISTRADORES, CON LA ESTETICA NUEVA (Monica, 26-oct-2026; maqueta validada
// docs/figma/cartera-administradores-clara.html). Es la de siempre (lib/carteraGestores.ts, las mismas piezas y
// acciones) con otra piel: fondo grafito, paneles claros, cifras de cristal. Se entra por la tarjeta «Cartera de
// administradores» del submenu del area; la de antes sigue en «Navegacion rapida» (/comercial?ver=administradores).
// Quien ve que, como en /comercial: direccion y supervision comercial, todas las carteras con el selector; un
// comercial, la suya.

const FECHA_LARGA = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" });

export default async function Pagina({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/cartera");
  const direccion = yo.veTodo || puedeEntrar(yo, "comercial", "supervisar");
  const mio = await comercialDe(yo.id);
  if (!direccion && !mio) redirect(puedeEntrar(yo, "comercial") ? "/comercial" : "/menu");

  const comerciales = await listarComerciales();
  const elegido = direccion ? (comerciales.find((x) => x.id === c) ?? null) : (comerciales.find((x) => x.id === mio!.id) ?? null);
  const todos = direccion && !elegido;
  const [cartera, paraGrabar] = await Promise.all([carteraGestores(elegido?.id ?? null), opcionesEntrada()]);
  const hoy = FECHA_LARGA.format(new Date());
  const nombre = elegido && direccion ? elegido.nombre : yo.nombre;

  return (
    <div className={`${letraMenu.variable} min-h-screen bg-[#2e3236]`}>
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1900px] px-6 pb-16 pt-4">
        <Salida href={`/comercial${c ? `?c=${c}` : ""}`}>← Accesos del área comercial</Salida>
        <CarteraClara
          c={cartera}
          todos={todos}
          saludo={{ nombre: todos ? null : nombre, hoy: hoy.charAt(0).toUpperCase() + hoy.slice(1) }}
          carteras={direccion ? { elegido: elegido?.id ?? null, lista: comerciales.map((m) => ({ id: m.id, nombre: m.nombre })) } : null}
          grabar={{
            hoy: new Date().toLocaleDateString("sv-SE"),
            canales: CANALES,
            oportunidades: paraGrabar.oportunidades,
            personas: paraGrabar.personas,
            miComercialId: direccion ? null : (mio?.id ?? null),
            guardar: guardarEntrada,
          }}
        />
      </main>
    </div>
  );
}
