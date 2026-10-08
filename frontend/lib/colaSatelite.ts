// lib/colaSatelite.ts
//
// LO QUE EL SATELITE GUARDA EN EL MOVIL (Monica, 8-oct-2026): "lo guardaria en
// el movil, sincronizado desde Supabase, para que este disponible incluso sin
// conexion". Dos cosas:
//   · las LISTAS (oportunidades abiertas y agenda), para buscar sin cobertura;
//   · la COLA de notas escritas: cada una espera aqui, con sus fotos, hasta que
//     llega a Supabase. "Sin conexion, esperan a que la haya y mientras se
//     quedan tan tranquilas en el movil".
//
// Corre en el navegador, con IndexedDB: aguanta fotos (localStorage no) y no se
// borra al cerrar la app.

import type { Opcion } from "../app/components/Elegir";

export type OppSat = Opcion & { comercialId: string | null; comercial: string | null };
export type Listas = { oportunidades: OppSat[]; personas: Opcion[]; miComercialId: string | null; quien: string; cuando: string };

export type NotaEnCola = {
  id: string;
  creada: string;
  texto: string;
  canal: string;
  fecha: string;
  oportunidadId: string | null;
  persona: string | null;
  dondeTexto: string | null;
  /** Para enseñarla en la lista de "esperando" sin buscar en las listas. */
  resumen: string;
  fotos: { foto: Blob; mini: Blob }[];
  /** Las rutas en el almacen, cuando ya se han subido: no se suben dos veces. */
  rutas?: string[];
  /** Si el servidor la rechazo por lo escrito (no por la red), el porque. */
  error?: string;
};

const BD = "accesalia-satelite";

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const r = indexedDB.open(BD, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("listas")) db.createObjectStore("listas");
      if (!db.objectStoreNames.contains("cola")) db.createObjectStore("cola", { keyPath: "id" });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
}

async function hacer<T>(almacen: string, modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await abrir();
  return new Promise((ok, mal) => {
    const t = db.transaction(almacen, modo);
    const r = f(t.objectStore(almacen));
    t.oncomplete = () => {
      db.close();
      ok(r.result as T);
    };
    t.onerror = () => {
      db.close();
      mal(t.error);
    };
  });
}

export const leerListas = () => hacer<Listas | undefined>("listas", "readonly", (s) => s.get("ultima"));
export const guardarListas = (l: Listas) => hacer("listas", "readwrite", (s) => s.put(l, "ultima"));
export const leerCola = async () =>
  ((await hacer<NotaEnCola[]>("cola", "readonly", (s) => s.getAll())) ?? []).sort((a, b) => a.creada.localeCompare(b.creada));
export const meterEnCola = (n: NotaEnCola) => hacer("cola", "readwrite", (s) => s.put(n));
export const sacarDeCola = (id: string) => hacer("cola", "readwrite", (s) => s.delete(id));

export type ResultadoEnvio = "enviadas" | "sin_red" | "sin_sesion";

/** Envia lo que espera, en orden. Para en cuanto falla la red (ya lo intentara
 *  la proxima vez) o la sesion (hay que volver a entrar). Lo que el servidor
 *  rechaza por lo escrito se queda marcado con su porque, para corregirlo. */
export async function enviarCola(): Promise<ResultadoEnvio> {
  for (const n of await leerCola()) {
    if (n.error) continue;
    try {
      // 1 · las fotos, directas al almacen
      if (n.fotos.length && !n.rutas) {
        const p = await fetch("/api/satelite/fotos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ n: n.fotos.length }),
        });
        // Sin sesion, el guardian de la puerta redirige al login: eso no es un
        // "vale", es que hay que volver a entrar.
        if (p.status === 401 || p.redirected) return "sin_sesion";
        if (!p.ok) return "sin_red";
        const permisos = (await p.json()) as { ruta: string; url: string; urlMini: string }[];
        for (const [i, f] of n.fotos.entries()) {
          const subir = (url: string, b: Blob) =>
            fetch(url, { method: "PUT", headers: { "Content-Type": "image/jpeg", "x-upsert": "false" }, body: b });
          const [a, b] = await Promise.all([subir(permisos[i].url, f.foto), subir(permisos[i].urlMini, f.mini)]);
          if (!a.ok || !b.ok) return "sin_red";
        }
        n.rutas = permisos.map((x) => x.ruta);
        await meterEnCola(n);
      }

      // 2 · la nota
      const r = await fetch("/api/satelite/nota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: n.id,
          texto: n.texto,
          canal: n.canal,
          fecha: n.fecha,
          oportunidadId: n.oportunidadId,
          persona: n.persona,
          dondeTexto: n.dondeTexto,
          fotos: n.rutas ?? [],
        }),
      });
      if (r.status === 401 || r.redirected) return "sin_sesion";
      if (r.status === 422) {
        n.error = ((await r.json().catch(() => ({}))) as { error?: string }).error ?? "No se ha podido guardar.";
        await meterEnCola(n);
        continue;
      }
      if (!r.ok) return "sin_red";
      // Solo se borra del movil si el servidor dice, en su idioma, que la tiene.
      const dice = (await r.json().catch(() => null)) as { ok?: boolean } | null;
      if (!dice?.ok) return "sin_sesion";
      await sacarDeCola(n.id);
    } catch {
      return "sin_red";
    }
  }
  return "enviadas";
}
