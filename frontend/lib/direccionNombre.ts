// lib/direccionNombre.ts
//
// Lo que necesitan LAS DOS ORILLAS de la ventana "Buscar la direccion": la
// pantalla (que propone el nombre segun se marcan escaleras) y el servidor.
// Por eso no lleva "server-only". Ver lib/buscarDireccion.ts.

/** Un portal de Catastro (numero + escalera) antes de guardarlo. */
export type Portal = {
  /** parcela|numero|escalera: lo que identifica el portal antes de guardarlo. */
  clave: string;
  parcela: string;
  tipo_via: string;
  nombre_via: string;
  numero: string;
  escalera: string;
  viviendas: number;
};

export const NOMBRE_TIPO: Record<string, string> = {
  CL: "Calle", AV: "Avenida", PZ: "Plaza", PL: "Plaza", PS: "Paseo", TR: "Travesía",
  CM: "Camino", CR: "Carretera", RD: "Ronda", GL: "Glorieta", PJ: "Pasaje",
  CJ: "Callejón", UR: "Urbanización", BO: "Barrio", CO: "Colonia", PQ: "Parque",
  VR: "Vereda", SD: "Senda", CA: "Cañada", DS: "Diseminado", AR: "Arroyo",
  CT: "Cuesta", VI: "Vía", LG: "Lugar", EN: "Entrada", PA: "Pasadizo",
};


const MINUSCULAS = new Set(["DE", "DEL", "LA", "LAS", "EL", "LOS", "Y"]);

/** "PRESIDENTE CARMONA" -> "Presidente Carmona"; "LILOS LOS" -> "Los Lilos". */
export function bonito(nombre: string): string {
  let ps = nombre.trim().split(/\s+/).filter(Boolean);
  // Catastro pone el articulo detras: CL ARBOLEDA LA, CL PALMAS DE LAS.
  let k = ps.length;
  while (k > 1 && MINUSCULAS.has(ps[k - 1])) k -= 1;
  if (k < ps.length) ps = [...ps.slice(k), ...ps.slice(0, k)];
  return ps
    .map((p, i) => {
      const l = p.toLowerCase();
      if (i > 0 && MINUSCULAS.has(p)) return l;
      return l.charAt(0).toUpperCase() + l.slice(1);
    })
    .join(" ");
}

/**
 * El nombre que PROPONE la app (el comercial lo cambia cuando quiera):
 * por calle, sus numeros; y las escaleras solo cuando no van todas.
 *   "Carretas 15, Madrid"
 *   "Presidente Carmona 3 escaleras A y B, Madrid"
 *   "Etruria 26 y 28 + Lucano 65, Madrid"
 */
export function nombrePropuesto(elegidos: Portal[], todos: Portal[], municipio: string): string {
  const y = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`);
  const porVia = new Map<string, Map<string, string[]>>();
  for (const p of elegidos) {
    const v = porVia.get(p.nombre_via) ?? new Map<string, string[]>();
    v.set(p.numero, [...(v.get(p.numero) ?? []), p.escalera]);
    porVia.set(p.nombre_via, v);
  }
  const trozos = Array.from(porVia, ([via, numeros]) => {
    const partes = Array.from(numeros, ([num, escaleras]) => {
      const n = num.replace(/\((\w+)\)/, " $1");
      const delNumero = todos.filter((t) => t.nombre_via === via && t.numero === num);
      const conViv = delNumero.filter((t) => t.viviendas > 0);
      // Solo garaje o local (lo que no tiene viviendas): que se diga en el nombre.
      const elegidasConViv = escaleras.filter((e) => conViv.some((t) => t.escalera === e));
      if (conViv.length > 0 && elegidasConViv.length === 0) return `${n} (garaje o local)`;
      const todas = elegidasConViv.length >= conViv.length || elegidasConViv.every((e) => !e);
      return todas ? n : `${n} ${elegidasConViv.length > 1 ? "escaleras" : "escalera"} ${y(elegidasConViv)}`;
    });
    return `${bonito(via)} ${y(partes)}`;
  });
  return `${trozos.join(" + ")}, ${bonito(municipio)}`;
}
