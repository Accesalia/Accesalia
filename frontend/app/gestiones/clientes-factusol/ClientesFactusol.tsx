"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ESTILOS_COBRO_AJUSTES } from "../estilosCobroAjustes";
import type { FilaCliente } from "../../../lib/factusolClientes";

// CLIENTES DE FACTUSOL (Monica, 25-oct-2026), la maqueta validada tal cual: una pestaña por empresa, buscador y
// filtros, y «Revisar ahora», que relee Factusol (la misma lectura que la de cada noche).

const EMPRESAS = [{ clave: "accesalia", nombre: "Accesalia" }, { clave: "daniel", nombre: "Daniel autónomo" }, { clave: "ecobalance", nombre: "Ecobalance" }] as const;
type Filtro = "todos" | "casan" | "no" | "sinnif";
const limpio = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const FECHA = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const HORA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const enlace = (c: NonNullable<FilaCliente["casa"]>) =>
  c.tipo === "comunidad" ? `/administracion/comunidades/${c.id}` : c.tipo === "contrata" ? `/consulta/contratas/${c.id}` : `/consulta/personas/${c.id}`;

export function ClientesFactusol({ clientes }: { clientes: FilaCliente[] }) {
  const router = useRouter();
  const [empresa, setEmpresa] = useState<(typeof EMPRESAS)[number]["clave"]>("accesalia");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [q, setQ] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [leyendo, empezar] = useTransition();

  const deEmpresa = useMemo(() => clientes.filter((c) => c.empresa === empresa), [clientes, empresa]);
  const cuenta = (e: string) => clientes.filter((c) => c.empresa === e).length;
  const r = {
    total: deEmpresa.length,
    com: deEmpresa.filter((c) => c.casa?.tipo === "comunidad").length,
    con: deEmpresa.filter((c) => c.casa?.tipo === "contrata").length,
    sinCasar: deEmpresa.filter((c) => !c.casa && c.nif).length,
    sinNif: deEmpresa.filter((c) => !c.nif).length,
  };
  const ultima = clientes.reduce((m, c) => (c.leidoEn > m ? c.leidoEn : m), "");
  const filas = deEmpresa
    .filter((c) => filtro === "todos" || (filtro === "casan" && c.casa) || (filtro === "no" && !c.casa && c.nif) || (filtro === "sinnif" && !c.nif))
    .filter((c) => !q || limpio(`${c.codigo} ${c.nif ?? ""} ${c.nombre}`).includes(limpio(q)))
    .sort((a, b) => b.codigo - a.codigo);

  const revisar = () => {
    setAviso(null);
    empezar(async () => {
      try {
        const res = await fetch("/api/factusol/clientes", { method: "POST" });
        const j = (await res.json()) as { ok: boolean; dice?: string };
        if (!j.ok) return setAviso(j.dice ?? "No se ha podido leer Factusol.");
        router.refresh();
      } catch {
        setAviso("No se ha podido leer Factusol.");
      }
    });
  };

  return (
    <div className="cc">
      <style dangerouslySetInnerHTML={{ __html: ESTILOS_COBRO_AJUSTES }} />
      <main className="mx-auto max-w-[1300px] px-4 pb-16 pt-5 sm:px-6">
        <a className="salida" href="/facturacion/cobrar">← Cobrar</a>
        <div className="cab">
          <div>
            <h1>Clientes de Factusol</h1>
            <p>Una copia para consultar. Se lee de Factusol cada noche: aquí no se cambia nada.</p>
          </div>
          <div className="der"><button type="button" className="btn" onClick={revisar} disabled={leyendo}>{leyendo ? "Leyendo Factusol…" : "Revisar ahora"}</button></div>
        </div>
        <div className="estado"><span>Última lectura: <b>{ultima ? HORA.format(new Date(ultima)) : "nunca"}</b></span><span>Cada noche a las 4:30</span></div>
        {aviso && <div className="aviso">{aviso}</div>}

        <div className="pests" role="tablist">
          {EMPRESAS.map((e) => (
            <button key={e.clave} type="button" className="pest" role="tab" aria-selected={empresa === e.clave} onClick={() => setEmpresa(e.clave)}>
              {e.nombre} <small>{cuenta(e.clave)}</small>
            </button>
          ))}
        </div>
        <div className="estado">
          <span><b>{r.total}</b> clientes</span><span><b>{r.com}</b> casan con una comunidad</span><span><b>{r.con}</b> con una contrata</span>
          <span><b>{r.sinCasar}</b> con NIF sin casar</span><span><b>{r.sinNif}</b> sin NIF en Factusol</span>
        </div>
        <div className="filtros">
          <input type="text" id="cf-buscar" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, NIF o código" aria-label="Buscar" />
          {([["todos", "Todos"], ["casan", "Casan con la app"], ["no", "No casan"], ["sinnif", "Sin NIF"]] as [Filtro, string][]).map(([f, t]) => (
            <button key={f} type="button" className="chip" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>{t}</button>
          ))}
        </div>
        <div className="caja"><table>
          <thead><tr><th>Código</th><th>NIF</th><th>Nombre en Factusol</th><th>Población</th><th>Alta</th><th>En la app</th></tr></thead>
          <tbody>{filas.length ? filas.map((c) => (
            <tr key={c.id}>
              <td className="corto mono" style={{ textAlign: "right" }}>{c.codigo}</td>
              <td className="corto mono">{c.nif ?? <span className="falta">sin NIF</span>}</td>
              <td className="largo" style={{ color: "var(--carbon)" }}>{c.nombre}</td>
              <td className="corto">{c.poblacion ?? ""}</td>
              <td className="corto">{c.fechaAlta ? FECHA.format(new Date(c.fechaAlta)) : ""}</td>
              <td className="casa corto">{c.casa ? <><span className="tipo">{c.casa.tipo}</span><a href={enlace(c.casa)}>{c.casa.nombre}</a></> : <span className="falta">{c.nif ? "no casa con nada de la app" : "no se puede casar sin NIF"}</span>}</td>
            </tr>
          )) : <tr><td colSpan={6} className="falta">Nada con ese filtro.</td></tr>}</tbody>
        </table></div>
      </main>
    </div>
  );
}
