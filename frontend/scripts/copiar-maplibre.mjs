// MapLibre dibuja el mapa con ayuda de un "worker" (un hilo aparte) que busca
// junto a su propio fichero. Al empaquetarlo Next.js esa ruta se pierde y el
// mapa se queda sin teselas (en blanco). Por eso se copian el worker y el
// fichero compartido que usa a public/maplibre/, y el mapa se lo indica con
// setWorkerUrl. Se ejecuta antes de dev y de build, asi siempre coinciden con
// la version instalada.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const origen = join(raiz, "node_modules", "maplibre-gl", "dist");
const destino = join(raiz, "public", "maplibre");
mkdirSync(destino, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(join(origen, f), join(destino, f));
console.log("maplibre: worker copiado a public/maplibre");
