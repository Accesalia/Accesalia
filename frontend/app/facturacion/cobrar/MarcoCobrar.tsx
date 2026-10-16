import type { Yo } from "../../../lib/sesion";
import { MarcoDinero } from "../MarcoDinero";

// EL MARCO DE COBRAR: el marco comun del dinero (../MarcoDinero.tsx), en el area
// Cobrar. Se queda por las paginas que ya lo usan.

export async function MarcoCobrar({ yo, activo, nuevas, children }: { yo: Yo; activo: string; nuevas: number; children: React.ReactNode }) {
  return (
    <MarcoDinero yo={yo} area="cobrar" activo={activo} cuentas={{ nuevas }}>
      {children}
    </MarcoDinero>
  );
}
