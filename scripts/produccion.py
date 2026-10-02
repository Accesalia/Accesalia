# -*- coding: utf-8 -*-
"""
LA PUERTA A PRODUCCION, Y LA UNICA.

Monica, 2-oct-2026, a voces y con razon: "NO TRABAJAMOS EN LOCAL, JAMAS DE LOS
JAMASES. LOCAL NO EXISTE, ES EL DEMONIO. SOLO TRABAJAMOS EN PRODUCCION."

El peligro no es teorico. En esta maquina hay un `frontend/.env.local` que apunta
a 127.0.0.1:54321. Si un script coge ese fichero por error, escribe en la base
local, NO FALLA, y los dos nos quedamos creyendo que esta hecho. Por eso:

  1. Las llaves viven en `.env.produccion` -nombre en castellano a proposito:
     Next.js carga `.env.local` y `.env.production` (en ingles), pero NUNCA
     `.env.produccion`. Asi este fichero es solo para scripts y no se cuela en
     la aplicacion ni por accidente.
  2. Antes de devolver nada, se comprueba a donde apunta. Si no es el proyecto
     de produccion, ABORTA. La norma la cumple el codigo, no la memoria.

Uso:
    from produccion import base
    filas = base.leer("comunidades?select=id,nombre&municipio=eq.ALCORCON")
"""
import io
import json
import os
import sys
import urllib.error
import urllib.request

# El proyecto de produccion. Si algun dia cambia, se cambia AQUI y en ningun
# otro sitio, y cualquier script que apunte a otro lado deja de funcionar.
PROYECTO = "kbsucauoubqglkypwulv"
FICHERO = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       ".env.produccion")

PROHIBIDO = ("127.0.0.1", "localhost", "0.0.0.0", "host.docker.internal",
             "::1", "supabase_kong", ".local")


class NoEsProduccion(SystemExit):
    pass


def _leer_fichero():
    if not os.path.exists(FICHERO):
        raise NoEsProduccion(
            f"\nNo encuentro {FICHERO}.\n"
            "Ahi van las dos llaves de produccion. Sin eso no se escribe en ningun sitio.\n"
        )
    valores = {}
    with io.open(FICHERO, encoding="utf-8") as fh:
        for linea in fh:
            linea = linea.strip()
            if not linea or linea.startswith("#") or "=" not in linea:
                continue
            k, v = linea.split("=", 1)
            valores[k.strip()] = v.strip().strip('"').strip("'")
    return valores


def _comprobar(url, clave):
    """El guardia. Cualquier duda, no pasa."""
    if not url or not clave:
        raise NoEsProduccion(
            f"\nFaltan SUPABASE_URL o SUPABASE_SECRET_KEY en {FICHERO}.\n")
    bajo = url.lower()
    for malo in PROHIBIDO:
        if malo in bajo:
            raise NoEsProduccion(
                f"\n*** ALTO ***\nLa URL apunta a LOCAL: {url}\n"
                "Local no existe. No se escribe. Corrige .env.produccion.\n")
    if PROYECTO not in bajo:
        raise NoEsProduccion(
            f"\n*** ALTO ***\nLa URL no es la de produccion ({PROYECTO}): {url}\n")
    if not bajo.startswith("https://"):
        raise NoEsProduccion(f"\n*** ALTO ***\nLa URL no es https: {url}\n")
    if len(clave) < 30:
        raise NoEsProduccion(
            "\n*** ALTO ***\nLa clave es demasiado corta: parece la publica o un "
            "pegado a medias. Hace falta la de SERVICIO.\n")


class _Base(object):
    def __init__(self):
        v = _leer_fichero()
        self.url = (v.get("SUPABASE_URL") or "").rstrip("/")
        self.clave = v.get("SUPABASE_SECRET_KEY") or ""
        _comprobar(self.url, self.clave)
        self.cab = {"apikey": self.clave, "Authorization": "Bearer " + self.clave}

    # ------------------------------------------------------------ lectura
    def leer(self, consulta, por_tramos=True):
        """PostgREST corta en 1.000 filas Y NO LO DICE. Aqui se pide por tramos
           siempre, porque ya nos ha mordido dos veces hoy."""
        todo, desde = [], 0
        while True:
            peticion = urllib.request.Request(
                self.url + "/rest/v1/" + consulta, headers=dict(self.cab))
            if por_tramos:
                peticion.add_header("Range", "%d-%d" % (desde, desde + 999))
            with urllib.request.urlopen(peticion) as r:
                trozo = json.loads(r.read().decode("utf-8"))
            todo.extend(trozo)
            if not por_tramos or len(trozo) < 1000:
                return todo
            desde += 1000

    # ------------------------------------------------------------ ficheros
    def subir(self, almacen, ruta_destino, datos, tipo="application/pdf",
              reemplazar=False):
        """Sube un fichero al almacen. Devuelve la ruta guardada."""
        destino = "%s/storage/v1/object/%s/%s" % (self.url, almacen, ruta_destino)
        cab = dict(self.cab)
        cab["Content-Type"] = tipo
        if reemplazar:
            cab["x-upsert"] = "true"
        peticion = urllib.request.Request(destino, data=datos, headers=cab, method="POST")
        try:
            with urllib.request.urlopen(peticion) as r:
                r.read()
            return ruta_destino
        except urllib.error.HTTPError as e:
            cuerpo = e.read().decode("utf-8", "replace")
            raise RuntimeError("subir %s -> %s: %s" % (ruta_destino, e.code, cuerpo))


base = None


def arrancar():
    """Se llama explicitamente: asi un `import` no abre la puerta solo."""
    global base
    if base is None:
        base = _Base()
        sys.stderr.write("[produccion] conectado a %s\n" % base.url)
    return base
