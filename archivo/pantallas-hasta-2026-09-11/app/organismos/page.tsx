import { BarraSuperior } from "../components/BarraSuperior";
import { PestanasMaestros } from "../components/PestanasMaestros";
import { EnObras } from "../components/EnObras";

export default function Organismos() {
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <PestanasMaestros activa="organismos" />
      <main className="mx-auto max-w-[1200px] px-6 pb-16 pt-7">
        <EnObras
          titulo="Organismos"
          hay="el organismo escrito a mano en cada licencia, como texto libre"
          falta="decidir si es una sola lista o se separan ayuntamientos, juntas de distrito, COAM y ECUs"
        />
      </main>
    </div>
  );
}
