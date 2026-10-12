import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { comercialDe, puedeEntrar, quienSoy } from "../../../lib/sesion";
import { opcionesEntrada } from "../../../lib/entradaDiario";
import { tiposParaMovil } from "../../../lib/oportunidadMovil";
import { listarComerciales } from "../../../lib/comercial";
import { FormEstudio } from "./FormEstudio";

export const dynamic = "force-dynamic";

// SUBVENCIONES POSIBLES (Monica, 12-oct-2026). Para una direccion y una obra:
// las ayudas a las que podria acceder (que cubren, cuanto dan, cuando se
// convocan, cuanto tardan), lo concedido cerca, lo que cuesta la obra y como
// sube, y el resumen: "estas subvenciones podriais tener, pero si esperais a
// tenerlas la obra se encarece, y al final os ahorrais menos; si lo haceis
// ahora, la subvencion llega igual, pero os ha costado menos en total".

export default async function Subvenciones() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/referencia/subvenciones");
  const [listas, tipos, mio, comerciales] = await Promise.all([
    opcionesEntrada(),
    tiposParaMovil().catch(() => []),
    comercialDe(yo.id),
    listarComerciales(),
  ]);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1000px] px-4 py-6 sm:px-6">
        <Salida href="/referencia">← Documentación de referencia</Salida>
        <h1 className="mt-3 text-3xl font-bold text-carbon">Subvenciones posibles</h1>
        <p className="mt-1 max-w-[75ch] text-carbon/65">
          Para una dirección y una obra: a qué ayudas podría acceder, lo que darían, cuándo llegarían y lo que habrá subido la obra
          mientras tanto. Sale un estudio para la comunidad, que queda guardado.
        </p>
        <FormEstudio
          oportunidades={listas.oportunidades.map((o) => ({ valor: o.valor, texto: o.texto, pista: o.pista }))}
          personas={listas.personas}
          tipos={tipos}
          puedeCrear={puedeEntrar(yo, "comercial", "trabajar")}
          comerciales={mio ? null : comerciales.map((c) => ({ valor: c.id, texto: [c.nombre, c.apellidos].filter(Boolean).join(" ") }))}
        />
      </main>
    </div>
  );
}
