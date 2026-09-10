import { BarraSuperior } from "../components/BarraSuperior";
import { PestanasMaestros } from "../components/PestanasMaestros";
import { EnObras } from "../components/EnObras";

export default function Contratas() {
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <PestanasMaestros activa="contratas" />
      <main className="mx-auto max-w-[1200px] px-6 pb-16 pt-7">
        <EnObras
          titulo="Contratas"
          hay="154 contratas, 117 personas y su historia laboral, 268 obras y 181 presupuestos pedidos"
          falta="la pantalla: listado, ficha de empresa y ficha de persona, como en administraciones"
        />
      </main>
    </div>
  );
}
