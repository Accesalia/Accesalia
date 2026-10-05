import sys,os; sys.path.insert(0,'scripts'); sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from leer_fichas import PROVINCIA, fichas_de, texto_del_docx
from trocear2 import trocear2
import os as _os
D=os.path.join(PROVINCIA, _os.environ.get('MUNICIPIO','TORREJON DE ARDOZ'))
def ficha(c):
    fs=[f for f in fichas_de(os.path.join(D,c)) if 'conflicto' not in f]
    return texto_del_docx(fs[0])
def notas(c, anio):
    ls=ficha(c)
    ini=[k for k,l in enumerate(ls) if l.strip() in ('NOTAS','NOTAS ENCARGO Y PROYECTO')]
    if not ini: return []
    i=max(ini)+1; j=next((k for k,l in enumerate(ls) if k>i and l.strip()=='NOTAS SUBVENCIONES'),len(ls))
    return trocear2('\n'.join(ls[i:j]).strip(), anio)
