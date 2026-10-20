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


const MINUSCULAS = new Set(["DE", "DEL", "LA", "LAS", "EL", "LOS", "Y", "A", "EN"]);

// Las abreviaturas de Catastro, enteras; las tildes, como Catastro (Monica, 20-oct-2026).
const ABREVIATURAS: Record<string, string> = {
  NTRA: "NUESTRA", NTRO: "NUESTRO", SRA: "SEÑORA", SR: "SEÑOR", STA: "SANTA", STO: "SANTO", FCO: "FRANCISCO",
  FCA: "FRANCISCA", CGDOR: "CORREGIDOR", DR: "DOCTOR", DRA: "DOCTORA", GRAL: "GENERAL", PDTE: "PRESIDENTE",
  MTRO: "MAESTRO", HNOS: "HERMANOS", VDA: "VIUDA", PROF: "PROFESOR", ARQ: "ARQUITECTO", ING: "INGENIERO",
  CAP: "CAPITAN", CTE: "COMANDANTE", TTE: "TENIENTE", CNEL: "CORONEL", MQS: "MARQUES", MARQ: "MARQUES",
  CDE: "CONDE", DQUE: "DUQUE", PDRE: "PADRE", MA: "MARIA", JE: "JOSE", D: "DE",
};

/** "NTRA SRA D L ALMUDENA" -> "NUESTRA SEÑORA DE LA ALMUDENA"; "RECONQUISTA (DE LA)" -> "DE LA RECONQUISTA". */
export function viaEntera(via: string): string {
  const m = via.trim().match(/^(.*?)\s*\((DE LA|DE LAS|DE LOS|DEL|LA|LAS|LOS|EL)\)\s*$/);
  const v = m ? `${m[2]} ${m[1]}` : via.trim();
  return v.split(/\s+/).filter(Boolean)
    .map((p, i, ps) => (p === "L" && ps[i - 1] === "D" ? "LA" : ABREVIATURAS[p] ?? p))
    .join(" ");
}

/** "PRESIDENTE CARMONA" -> "Presidente Carmona"; "LILOS LOS" -> "Los Lilos". */
export function bonito(nombre: string): string {
  let ps = nombre.trim().split(/\s+/).filter(Boolean);
  // Catastro pone el articulo detras: CL ARBOLEDA LA, CL PALMAS DE LAS.
  let k = ps.length;
  while (k > 1 && MINUSCULAS.has(ps[k - 1])) k -= 1;
  if (k < ps.length) ps = [...ps.slice(k), ...ps.slice(0, k)];
  return ps
    .map((p, i) => {
      // Los numeros romanos, en mayusculas: "Alfonso XII", no "Alfonso Xii" (20-oct-2026).
      if (p.length >= 2 && /^X{0,3}(IX|IV|V?I{0,3})$/.test(p)) return p;
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
  // Los numeros de menor a mayor, no en el orden en que llegan de Catastro
  // ("Porvenir 9, 11 y 13", no "13, 9 y 11"; 13-oct-2026).
  const orden = (a: string, b: string) => parseInt(a) - parseInt(b) || a.localeCompare(b, "es");
  const trozos = Array.from(porVia, ([via, numeros]) => {
    const partes = Array.from(numeros).sort(([a], [b]) => orden(a, b)).map(([num, escaleras]) => {
      const n = num.replace(/\((\w+)\)/, " $1");
      const delNumero = todos.filter((t) => t.nombre_via === via && t.numero === num);
      const conViv = delNumero.filter((t) => t.viviendas > 0);
      // Solo garaje o local (lo que no tiene viviendas): que se diga en el nombre.
      // Las escaleras tambien de menor a mayor ("escaleras 1, 2 y 3", no "3, 1 y 2"; 20-oct-2026).
      const elegidasConViv = escaleras.filter((e) => conViv.some((t) => t.escalera === e))
        .sort((a, b) => a.length - b.length || a.localeCompare(b, "es"));
      if (conViv.length > 0 && elegidasConViv.length === 0) return `${n} (garaje o local)`;
      const todas = elegidasConViv.length >= conViv.length || elegidasConViv.every((e) => !e);
      return todas ? n : `${n} ${elegidasConViv.length > 1 ? "escaleras" : "escalera"} ${y(elegidasConViv)}`;
    });
    return `${bonito(viaEntera(via))} ${y(partes)}`;
  });
  // El tipo de via: si es calle no se dice; si es otra cosa, al final y entre parentesis,
  // para no afectar al orden alfabetico: "Paris 5, Fuenlabrada (plaza)" (Monica, 20-oct-2026).
  const tipos = [...new Set(elegidos.map((p) => (p.tipo_via || "CL").toUpperCase()).filter((t) => t !== "CL"))]
    .map((t) => (NOMBRE_TIPO[t] ?? t).toLowerCase());
  return `${trozos.join(" + ")}, ${bonito(municipio)}${tipos.length ? ` (${tipos.join(", ")})` : ""}`;
}

// ============================================================ el aviso

/**
 * LO QUE LE FALTA A LA DIRECCION DE UNA OPP. No se guarda: se CALCULA al
 * momento con lo que la opp tiene (Monica, 3-oct-2026: "muchisimo mejor que
 * algo que haya que marcar y desmarcar"). Asi no se queda nunca desfasado: en
 * cuanto alguien enlaza los accesos, el aviso se va solo.
 *
 *   tiene accesos vivos (relacion_oportunidad_accesos)-> nada que avisar
 *   tiene parcela pero ningun acceso        -> falta elegir que escaleras
 *   ni parcela ni accesos                   -> la direccion no esta confirmada
 */
export function avisoDireccion(accesosVivos: number, referenciaCatastral: string | null): string | null {
  if (accesosVivos > 0) return null;
  return referenciaCatastral ? "Pendiente de confirmar alcance" : "Pendiente de confirmar dirección";
}

/** PostgREST devuelve el conteo de una relacion como [{ count: n }]. */
export const cuenta = (x: { count: number }[] | null | undefined) => x?.[0]?.count ?? 0;
