# -*- coding: utf-8 -*-
"""Saca el texto de la ficha de una carpeta, para LEERLA. Sin parsear nada."""
import io, os, re, sys, zipfile
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
BASE = r"C:\accesalia Dropbox\D SM\Ascensores y rehabilitaciones\MADRID\1APROVINCIA"
PINTA = re.compile(r"ficha|datos", re.I)

def texto(ruta):
    with zipfile.ZipFile(ruta) as z:
        x = z.read("word/document.xml").decode("utf-8", "replace")
    x = re.sub(r"</w:p>", "\n", x)
    x = re.sub(r"<w:tab[^>]*/>", " | ", x)
    t = re.sub(r"<[^>]+>", "", x)
    for a, b in (("&amp;","&"),("&lt;","<"),("&gt;",">"),("&quot;",'"'),("&apos;","'")):
        t = t.replace(a, b)
    return [l.strip() for l in t.split("\n")]

def ficha_de(municipio, carpeta):
    d = os.path.join(BASE, municipio, carpeta)
    if not os.path.isdir(d):
        return None
    mejor = None
    for b, _, fs in os.walk(d):
        for f in fs:
            n, e = os.path.splitext(f)
            if e.lower() == ".docx" and PINTA.search(n) and not n.startswith("~"):
                r = os.path.join(b, f)
                if mejor is None or (r.count(os.sep), len(r)) < (mejor.count(os.sep), len(mejor)):
                    mejor = r
    return mejor

if __name__ == "__main__":
    for arg in sys.argv[1:]:
        mun, carp = arg.split("/", 1)
        f = ficha_de(mun.strip(), carp.strip())
        print("\n" + "=" * 78)
        print("### %s / %s" % (mun.strip(), carp.strip()))
        if not f:
            print("   (sin ficha)"); continue
        ls = [l for l in texto(f) if l]
        # del bloque del administrador hasta el de la comunidad
        ini = next((i for i,l in enumerate(ls) if re.search(r"ADMINISTRADOR|MEDIADOR", l, re.I)), 0)
        fin = next((i for i,l in enumerate(ls[ini+1:], ini+1)
                    if re.search(r"DATOS (COMUNIDAD|DEL PROYECTO)|PROMOTOR|NOTAS", l, re.I)), len(ls))
        for l in ls[ini:min(fin+1, ini+26)]:
            print("   " + l[:110])
