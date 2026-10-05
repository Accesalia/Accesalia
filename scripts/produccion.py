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

    # ------------------------------------------------------------ escritura
    def insertar(self, tabla, filas, de_cuantas_en_cuantas=200):
        """Mete filas en una tabla por la API. Se usa para NO tener que teclear
           miles de lineas de SQL a mano: los datos suben por aqui y la
           migracion que viene detras se queda corta y legible.

           Va por tandas porque una peticion de 45 KB con 300 filas es un
           disgusto esperando: si falla, no se sabe cual."""
        metidas = 0
        for i in range(0, len(filas), de_cuantas_en_cuantas):
            tanda = filas[i:i + de_cuantas_en_cuantas]
            cab = dict(self.cab)
            cab["Content-Type"] = "application/json"
            cab["Prefer"] = "return=minimal"
            peticion = urllib.request.Request(
                self.url + "/rest/v1/" + tabla,
                data=json.dumps(tanda, ensure_ascii=False).encode("utf-8"),
                headers=cab, method="POST")
            try:
                with urllib.request.urlopen(peticion) as r:
                    r.read()
                metidas += len(tanda)
            except urllib.error.HTTPError as e:
                cuerpo = e.read().decode("utf-8", "replace")
                raise RuntimeError("insertar en %s (fila %d): %s %s"
                                   % (tabla, i, e.code, cuerpo))
        return metidas

    def actualizar(self, consulta, cambios):
        """PATCH. La consulta LLEVA EL FILTRO DENTRO, igual que en `leer`:
               base.actualizar("oportunidades?id=eq." + oid, {"estado": "cerrada"})

           Y si no lleva filtro, PostgREST actualiza LA TABLA ENTERA sin avisar.
           Por eso aqui se exige que haya un '?' con algo detras: mas vale un
           error tonto que repintar 1.228 filas."""
        if "?" not in consulta or not consulta.split("?", 1)[1].strip():
            raise ValueError(
                "actualizar() sin filtro: '%s'. Eso tocaria la tabla entera." % consulta)
        cab = dict(self.cab)
        cab["Content-Type"] = "application/json"
        cab["Prefer"] = "return=minimal"
        peticion = urllib.request.Request(
            self.url + "/rest/v1/" + consulta,
            data=json.dumps(cambios, ensure_ascii=False).encode("utf-8"),
            headers=cab, method="PATCH")
        try:
            with urllib.request.urlopen(peticion) as r:
                r.read()
        except urllib.error.HTTPError as e:
            cuerpo = e.read().decode("utf-8", "replace")
            raise RuntimeError("actualizar %s: %s %s" % (consulta, e.code, cuerpo))

    def borrar(self, consulta):
        """DELETE. Mismo cuidado que `actualizar`: la consulta LLEVA EL FILTRO,
           y sin filtro PostgREST vacia la tabla entera sin avisar.

           Existe porque la capa de permisos del MCP rechaza los DELETE y a veces
           hay que quitar una fila concreta -tipicamente una que uno mismo acaba
           de crear mal-. Se usa poco y siempre apuntando a un id."""
        if "?" not in consulta or not consulta.split("?", 1)[1].strip():
            raise ValueError(
                "borrar() sin filtro: '%s'. Eso vaciaria la tabla." % consulta)
        cab = dict(self.cab)
        cab["Prefer"] = "return=minimal"
        peticion = urllib.request.Request(
            self.url + "/rest/v1/" + consulta, headers=cab, method="DELETE")
        try:
            with urllib.request.urlopen(peticion) as r:
                r.read()
        except urllib.error.HTTPError as e:
            raise RuntimeError("borrar %s: %s %s"
                               % (consulta, e.code, e.read().decode("utf-8", "replace")))

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
