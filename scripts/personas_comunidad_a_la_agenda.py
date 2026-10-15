# -*- coding: utf-8 -*-
"""
UNA SOLA AGENDA: FUERA personas_comunidad          (Monica, 15-oct-2026)

"Vamos a quedarnos con UNA sola tabla, la agenda. Es mil veces mejor tener una
sola fuente de datos que pedirle a la pantalla que deduplique." En Montesa 27
salia dos veces la misma vecina: una en la tabla vieja ("MERCEDES CARABANTE
(VECINA)") y otra en la agenda ("MERCEDES CARABANTE").

Que hace:
  1. Empareja cada fila vieja con su persona de la agenda en LA MISMA comunidad
     (puesto con figura_legal_propietaria_id = la comunidad): por el telefono y,
     si no, por el nombre (sin parentesis ni telefonos pegados). Apunta a quien
     corresponde en migrado_puesto_id / migrado_persona_id.
  2. La que no esta, se crea: persona + puesto en la comunidad, con su cargo; el
     telefono y el correo, al PUESTO ("son del puesto").
  3. Re-apunta lo que colgaba de la tabla vieja: el interlocutor de la opp
     (persona_comunidad_id -> puesto_id) y quien la trajo
     (quien_persona_comunidad_id -> quien_lo_trae, la persona).
La tabla se queda como archivo: nadie la lee ni la escribe.

    python scripts/personas_comunidad_a_la_agenda.py            <- en seco
    python scripts/personas_comunidad_a_la_agenda.py --escribir
"""
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from produccion import arrancar  # noqa: E402

ESCRIBIR = "--escribir" in sys.argv
b = arrancar()


def k(s):
    return re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFD", s or "").encode("ascii", "ignore").decode().lower())


def limpio(s):
    return re.sub(r"\s{2,}", " ", re.sub(r"\(.*?\)|\d[\d .\-]{6,}", " ", s or "")).strip(" .,-/")


def tel(s):
    return re.sub(r"\D", "", s or "")[-9:]


CARGO = {"presidente": "Presidente", "vicepresidente": "Vicepresidente", "secretario": "Secretario", "tesorero": "Tesorero",
         "vocal": "Vocal", "vecino": "Vecino", "conserje": "Conserje"}

pc = b.leer("personas_comunidad?select=id,comunidad_id,nombre,rol,telefono,email,documento,notas,migrado_puesto_id", por_tramos=True)
pu = b.leer("puesto?select=id,figura_legal_propietaria_id,telefono_empresa,hasta,persona_id,"
            "persona:persona_id(id,nombre,apellidos,telefono_personal)&figura_legal_propietaria_id=not.is.null", por_tramos=True)
porcp = {}
for p in pu:
    porcp.setdefault(p["figura_legal_propietaria_id"], []).append(p)

casan, crear = [], []
for f in pc:
    if f.get("migrado_puesto_id"):
        continue
    cands = porcp.get(f["comunidad_id"], [])
    # Los vigentes primero: si hay dos, vale el que sigue en el cargo.
    cands = sorted(cands, key=lambda c: c.get("hasta") is not None)
    t = tel(f.get("telefono"))
    hallado = None
    if t:
        hallado = next((c for c in cands if t == tel((c["persona"] or {}).get("telefono_personal") or c.get("telefono_empresa"))), None)
    if not hallado:
        n = k(limpio(f["nombre"]))
        if n:
            hallado = next((c for c in cands if (lambda m: m and (m in n or n in m))(
                k(((c["persona"] or {}).get("nombre") or "") + ((c["persona"] or {}).get("apellidos") or "")))), None)
    if hallado:
        casan.append((f, hallado))
    else:
        crear.append(f)

print("filas viejas: %d · ya en la agenda: %d · a crear: %d" % (len(pc), len(casan), len(crear)))
for f in crear:
    print("   crear:", f["nombre"], "|", f.get("rol"), "|", f.get("telefono"), "| cp", f["comunidad_id"])

refs_int = b.leer("oportunidades?select=id,puesto_id,persona_comunidad_id&persona_comunidad_id=not.is.null", por_tramos=True)
refs_quien = b.leer("oportunidades?select=id,quien_persona_comunidad_id&quien_persona_comunidad_id=not.is.null", por_tramos=True)
print("opps con interlocutor viejo: %d · con 'quien la trae' viejo: %d" % (len(refs_int), len(refs_quien)))

if not ESCRIBIR:
    print("(en seco: --escribir para hacerlo)")
    sys.exit(0)

for f, c in casan:
    b.actualizar("personas_comunidad?id=eq.%s" % f["id"], {"migrado_puesto_id": c["id"], "migrado_persona_id": c["persona_id"]})
# Las que no estan en la agenda NO se crean a ciegas: la unica que quedaba (15-oct)
# era una nota en el campo del nombre ("Pedidos datos a admin 18/01/22"), no una
# persona. Se quedan en el archivo, sin migrar, y se dicen.
for f in crear:
    print("   no se migra (no es una persona de la agenda):", f["nombre"])

# Re-apuntar lo que colgaba de la tabla vieja.
mapa = {x["id"]: x for x in b.leer("personas_comunidad?select=id,migrado_puesto_id,migrado_persona_id", por_tramos=True)}
for o in refs_int:
    m = mapa.get(o["persona_comunidad_id"]) or {}
    cambio = {"persona_comunidad_id": None}
    if not o.get("puesto_id") and m.get("migrado_puesto_id"):
        cambio["puesto_id"] = m["migrado_puesto_id"]
    b.actualizar("oportunidades?id=eq.%s" % o["id"], cambio)
for o in refs_quien:
    m = mapa.get(o["quien_persona_comunidad_id"]) or {}
    b.actualizar("oportunidades?id=eq.%s" % o["id"], {"quien_persona_comunidad_id": None, "quien_lo_trae": m.get("migrado_persona_id")})

print("HECHO. Quedan sin migrar:", len([x for x in mapa.values() if not x.get("migrado_puesto_id")]),
      "· opps aun con interlocutor viejo:", len(b.leer("oportunidades?select=id&persona_comunidad_id=not.is.null")),
      "· con quien viejo:", len(b.leer("oportunidades?select=id&quien_persona_comunidad_id=not.is.null")))
