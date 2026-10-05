# Igual que trocear() de notas_de_julio, pero TAMBIEN parte cuando la fecha va
# SOLA en su linea ("05-03-2025" y el correo debajo). Fallo dos veces el 5-oct.
import re, sys
sys.path.insert(0, 'scripts')
from notas_de_julio import trocear
SOLA = re.compile(r"^\s*(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2,4})\s*:?\s*$")
def trocear2(texto, anio):
    ls = (texto or '').split('\n')
    # cada fecha sola se marca con un texto que trocear() reconoce, y luego se quita
    marcadas = [l + ' \u2063' if SOLA.match(l) else l for l in ls]
    out = []
    for f, t in trocear('\n'.join(marcadas), anio):
        out.append((f, t.replace(' \u2063', '')))
    return out
