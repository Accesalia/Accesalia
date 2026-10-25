"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Elegir, type Opcion } from "../../components/Elegir";
import { CLAUSULA_ICIO, ESTILO_PAPEL, esqueletoHoja } from "../../../lib/hojaPapel";
import { ESTILOS } from "./estilosArbol";
import { montarArbol } from "./motorArbol";
import { accionGuardarBorrador } from "./acciones";
import type { CasoForma, FilaHoja, LineaGuardada, Pagador } from "../../../lib/hojaCompromisos";

/** Lo que el catalogo de bloques da por defecto a cada linea, por el codigo del bloque (si no hay tarifa que lo diga).
 *  titulo y puntos = su texto en el papel (texto_plantilla), para la vista previa. */
export type Defecto = { cobra: boolean; importe: number | null; pct: number | null; titulo: string; puntos: string[] };

/** Una opcion de «a quien va»: comunidad, persona:<id> o contrata:<id>. tarifaId = el convenio de la contrata. */
export type PagadorOpcion = { valor: string; texto: string; pista: string; cif: string | null; tarifaId: string | null };

/** Un precio vigente de una tarifa, con el bloque por su codigo, el tipo por su nombre y lo que incluye por codigos. */
export type PrecioArbol = {
  tarifaId: string; tarifa: string; bloque: string; tipo: string | null; desde: number | null; hasta: number | null;
  forma: string; importe: number | null; porcentaje: number | null; incluye: string[];
};

/** La comision del administrador de la comunidad: por proyecto y por subvenciones, en euros (una vez por hoja) o en %
 *  (de cada linea). sobre = sobre que cobra cada bloque, por su codigo. */
export type ComisionArbol = {
  persona: string;
  proyecto: { forma: "eur" | "pct"; valor: number } | null;
  subvenciones: { forma: "eur" | "pct"; valor: number } | null;
  sobre: Record<string, "proyecto" | "subvenciones">;
};

const valorDe = (p: Pagador) => (p.tipo === "comunidad" ? "comunidad" : `${p.tipo}:${p.id}`);
const pagadorDe = (v: string): Pagador => {
  const [tipo, id] = v.split(":");
  return tipo === "contrata" || tipo === "persona" ? { tipo, id } : { tipo: "comunidad" };
};

/** La oportunidad: se elige aqui y la pagina se recarga con ella. */
export function ElegirOpp({ opciones, valor }: { opciones: Opcion[]; valor: string | null }) {
  const router = useRouter();
  return (
    <div className="w-full max-w-[520px]">
      <Elegir id="opp" nombre="Oportunidad" opciones={opciones} valor={valor ?? ""} vacio="Elige una oportunidad" conPista alElegir={(v) => router.push(`/gestiones/hoja-prueba?opp=${v}`)} />
    </div>
  );
}

/** La hoja en arbol de la maqueta validada, montada sobre los datos de la base. Guarda en borrador en las tablas nuevas,
 *  previsualiza el papel y, con un borrador, lo carga para seguir editandolo. */
export function ArbolHoja({ oppId, defectos, interesa, accesos, formas, casos, pagadores, comision, comisionAviso, tarifas, pem, municipio, borrador }: {
  oppId: string; defectos: Record<string, Defecto>; interesa: string[];
  accesos: { id: string; texto: string; portalId: string | null; viviendas: number | null }[];
  formas: { id: string; nombre: string; frases: string[] }[]; casos: CasoForma[]; pagadores: PagadorOpcion[];
  comision: ComisionArbol | null; comisionAviso: string | null;
  tarifas: { generalId: string | null; precios: PrecioArbol[] }; pem: number | null; municipio: string | null;
  borrador: { id: string; lineas: LineaGuardada[]; pagador: Pagador } | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  // A QUIEN VA: el del borrador; si no, su comunidad; si no, el primer particular titular.
  const [aQuien, setAQuien] = useState<string>(() => (borrador ? valorDe(borrador.pagador) : pagadores[0]?.valor ?? ""));
  const quien = pagadores.find((p) => p.valor === aQuien) ?? null;
  const tarifaId = quien?.tarifaId ?? tarifas.generalId;
  const tarifa = tarifas.precios.find((p) => p.tarifaId === tarifaId)?.tarifa ?? null;
  // El motor se monta una vez; quien paga le llega por aqui (cambia la tarifa, las formas por defecto y el papel).
  const motor = useRef<{ quitar: () => void; ponerPagador: (p: object) => void } | null>(null);
  const pagadorMotor = (v: string) => {
    const q = pagadores.find((p) => p.valor === v);
    const p = pagadorDe(v);
    return { tipo: p.tipo, contrataId: p.tipo === "contrata" ? p.id : null, tarifaId: q?.tarifaId ?? tarifas.generalId, razon: q?.texto ?? "", cif: q?.cif ?? "" };
  };
  const aQuienRef = useRef(aQuien);
  aQuienRef.current = aQuien;
  useEffect(() => { motor.current?.ponerPagador(pagadorMotor(aQuien)); }, [aQuien]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!ref.current) return;
    const alGuardar = async (filas: FilaHoja[]) => {
      setAviso(null);
      if (!aQuienRef.current) return setAviso({ ok: false, texto: "No se ha guardado: elige a quién va la hoja." });
      const r = await accionGuardarBorrador(oppId, filas, borrador?.id ?? null, pagadorDe(aQuienRef.current));
      if (!r.ok) return setAviso({ ok: false, texto: `No se ha guardado: ${r.error}` });
      setAviso({ ok: true, texto: "Guardada en borrador. Debajo, lo que ha quedado en la base." });
      // Lo guardado se queda abierto para seguir con el (cargado desde la base: asi se comprueba tambien la vuelta).
      if (borrador?.id === r.id) router.refresh();
      else router.replace(`/gestiones/hoja-prueba?opp=${oppId}&borrador=${r.id}`);
    };
    const m = montarArbol(ref.current, {
      defectos, interesa, accesos, formas, casos, tarifas: tarifas.precios, pem, comision, comisionAviso, alGuardar, inicial: borrador?.lineas ?? null,
      pagador: pagadorMotor(aQuienRef.current),
      papel: { esqueleto: esqueletoHoja(), icio: CLAUSULA_ICIO, municipio },
    });
    motor.current = m;
    return () => { motor.current = null; m.quitar(); };
  }, [oppId, defectos, interesa, accesos, formas, casos, tarifas, pem, comision, comisionAviso, municipio, borrador, router]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="ah rounded-lg bg-white p-3">
      <style dangerouslySetInnerHTML={{ __html: ESTILOS + ESTILO_PAPEL }} />
      <div className="mb-3 flex flex-wrap items-end gap-x-4 gap-y-1">
        <div className="w-full max-w-[520px]">
          <Elegir id="aquien" nombre="A quién va" opciones={pagadores} valor={aQuien} vacio="Elige a quién va la hoja" conPista
            alElegir={(v) => v && setAQuien(v)} />
        </div>
        {quien && <span className="pb-2 text-sm text-carbon/70">Tarifa: <b className="text-carbon">{tarifa ?? "sin tarifa"}</b>{quien.tarifaId ? " (su convenio)" : ""}</span>}
      </div>
      <div ref={ref}>
        <div className="dos">
          <nav className="cat" id="cat" aria-label="Catálogo" />
          <div className="der">
            <div id="avisos" />
            <div className="marco">
              <table>
                <thead>
                  <tr><th>Qué</th><th>En el papel</th><th>Se cobra</th><th>Importe</th><th>Cómo se cobra</th><th /></tr>
                </thead>
                <tbody id="hoja" />
              </table>
            </div>
            <div id="comision" />
            <div className="pie">
              {aviso && <span className={`mr-2 text-sm ${aviso.ok ? "text-carbon/70" : "text-red-800"}`}>{aviso.texto}</span>}
              <button type="button" className="secundario" id="previsualizar" disabled>Previsualizar</button>
              <button type="button" className="secundario" id="generar" disabled>Guardar como borrador</button>
              {/* Ya en su sitio para no tocar la pantalla: se cablea con el ciclo de la hoja (pide el ok de Daniel). */}
              <button type="button" className="generar" id="emitir" disabled title="Pide el ok de Daniel. Todavía no está conectado.">Generar la hoja</button>
            </div>
            <div id="faltan" />
            <div id="confirma" />
            <div id="previa" />
          </div>
        </div>
      </div>
    </div>
  );
}
