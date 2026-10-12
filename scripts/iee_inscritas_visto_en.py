# -*- coding: utf-8 -*-
"""
LAS IEE YA INSCRITAS, A SU FECHA (Monica, 12-oct-2026: "2, por favor").

El registro da dos clases de nota: la del expediente en tramite trae "Fecha
emision informe"; la de la IEE ya inscrita trae "Fecha ultimo IEE registrado".
El lector solo conocia la primera, asi que 240 IEE (todas de buscar nuestras
direcciones, ninguna del barrido nocturno) se guardaron sin fecha y con
visto_en = el dia en que se buscaron (1, 2 y 9-oct), y en el radar parecia que
habian aparecido esos dias. Aqui se les pone visto_en = su fecha de inscripcion,
sacada de lo que ya se guardo (bruto). fecha_emision NO se toca: no es esa.

Antes de escribir guarda la copia de como estaban en docs/.
Uso:  python scripts/iee_inscritas_visto_en.py [escribir]
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from produccion import arrancar  # noqa: E402

COPIA = os.path.join(os.path.dirname(__file__), "..", "docs", "iee_inscritas_visto_en_antes_12oct.json")

if __name__ == "__main__":
    b = arrancar()
    filas = b.leer("iee_registrado?select=codigo,visto_en,fecha_emision,bruto&fecha_emision=is.null")
    cambios = []
    for f in filas:
        m = re.match(r"(\d{2})/(\d{2})/(\d{4})$", ((f.get("bruto") or {}).get("Fecha último IEE registrado") or "").strip())
        if m:
            # A mediodia de Madrid, para que el dia no se corra al pasarlo a UTC.
            cambios.append((f["codigo"], f["visto_en"], "%s-%s-%sT12:00:00+02:00" % (m.group(3), m.group(2), m.group(1))))
    print("sin fecha de emision:", len(filas), "| con fecha de inscripcion:", len(cambios))
    for c in cambios[:5]:
        print("  ", c)
    if sys.argv[1:] != ["escribir"]:
        sys.exit("(solo mirar; para escribir: escribir)")
    json.dump([{"codigo": c, "visto_en_antes": a, "visto_en_nuevo": n} for c, a, n in cambios],
              open(COPIA, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for codigo, _, nuevo in cambios:
        b.actualizar("iee_registrado?codigo=eq.%s&fecha_emision=is.null" % codigo, {"visto_en": nuevo})
    print("actualizadas", len(cambios), "| copia en", COPIA)
