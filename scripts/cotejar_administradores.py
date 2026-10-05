# -*- coding: utf-8 -*-
"""
COTEJAR LOS ADMINISTRADORES DE LAS FICHAS CONTRA LA LISTA BUENA
(Monica, 4-oct-2026)

Su encargo, que manda sobre todo lo demas de esta pasada:

    "yo lo primero que haria es cotejar nombres: sobre todo, y esto es critico,
     los administradores: estan ya en la lista o son nuevos. Si son nuevos, los
     reviso yo y me los miro a mano, porque si no, nuestra lista limpia de
     administradores se va a perder."

ESTO NO ESCRIBE NADA EN PRODUCCION.

TRES LLAVES, NO UNA. El nombre solo no vale, y ella dio la segunda:

    "cuando tengo dudas, confirmo por el telefono fijo publicado:
     mismo telefono = misma empresa"

Y hay una tercera que sale gratis de las fichas y cubre mas que el telefono: el
DOMINIO DEL CORREO. Mismo dominio propio = misma empresa. Los dominios
genericos (gmail, hotmail...) no cuentan, que ahi cabe cualquiera.

Lo que destapan las dos llaves nuevas y el nombre jamas habria visto:
  * mupan.es y el fijo 912271180 unen MUPAN con GESTION MAFER y con
    "Adm Mafer Maria Angeles Fernandez". Por nombre no se parecen en nada.
  * marcalasesores.com une GRUPO MARCAL con EMILIO y EMILIO JAVIER PEREZ
    MONTERO: "Emilio" no es un administrador nuevo, es el de Marcal.

COMO SE AGRUPA: por contagio. Si A y B comparten telefono, y B y C comparten
dominio, los tres son la misma casa. Es un union-find de toda la vida, y es
importante que sea transitivo: si no, cada pareja se resolveria suelta y el
mismo despacho acabaria en tres montones distintos.

POR QUE EL NOMBRE SE COMPARA POR CONJUNTO DE PALABRAS Y NO POR PARECIDO DE
TEXTO: su aviso de septiembre, "en nombres de empresa hay que comparar palabra
a palabra o gana la palabra administracion". Dos despachos sin nada que ver se
parecen muchisimo si los dos se llaman "Administracion de Fincas X".
"""
import collections
import csv
import glob
import io
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from produccion import arrancar  # noqa: E402

VACIAS = {"ADMINISTRACION", "ADMINISTRACIONES", "ADMON", "FINCAS", "ASESORES",
          "ASESORIA", "GESTION", "GESTORIA", "SL", "SA", "SLU", "SLL", "SCP",
          "SLP", "SLUP", "SOCIEDAD", "LIMITADA", "CB", "Y", "DE", "DEL", "LA",
          "EL", "LOS", "LAS", "ADMINISTRADOR", "ADMINISTRADORES", "PATRIMONIO",
          "SERVICIOS", "GRUPO", "ASOCIADOS", "ABOGADOS", "CONSULTING",
          "INMOBILIARIA", "BUFETE", "DPTO", "COMUNIDADES"}

GENERICOS = {"gmail.com", "hotmail.com", "hotmail.es", "yahoo.es", "yahoo.com",
             "outlook.es", "outlook.com", "telefonica.net", "terra.es",
             "live.com", "icloud.com", "msn.com", "ya.com", "wanadoo.es",
             # COLEGIOS PROFESIONALES. Esto costo un susto: `icam.es` es el
             # Colegio de Abogados de Madrid y `cafmadrid.es` el de
             # Administradores de Fincas. Como dominio "propio" pegaban a
             # MARCAL con NAYFER y con Addendum -tres despachos distintos que
             # solo comparten colegio-. Un dominio de colegio identifica a la
             # profesion, nunca a la empresa.
             "icam.es", "cafmadrid.es", "coam.es", "cgcafe.org",
             "serviciosjuridicos.com"}

PUENTE = re.compile(r"^\s*(a\s+trav[eé]s\s+de|contacto\s+a\s+trav[eé]s|"
                    r"tr[aá]mites?\s+a\s+trav[eé]s|v[ií]a\s+)", re.I)
NO_ES_NADA = re.compile(r"^\s*(no\s+tienen?|no\s+hay|ninguno|sin\s+|[-x\.\s]+$)", re.I)
SEGUIMIENTO = re.compile(r"pedid|docs?\b|\d{1,2}[/\-]\d{1,2}|consultar|enviad|solicit", re.I)
PINTA_EMPRESA = re.compile(r"\b(S\.?L|S\.?A|S\.?C\.?P|ASESOR|ADMINISTRA|FINCAS|GESTI|"
                           r"ABOGADO|ASOCIAD|CONSULT|GRUPO|INMOBILIARIA|PATRIMONI|"
                           r"SERVICIOS|ESTUDIO|DESPACHO|&)\b", re.I)


def plano(s):
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").upper()
    return re.sub(r"[^A-Z0-9 ]", " ", s)


def clave(s):
    return frozenset(p for p in plano(s).split() if p and p not in VACIAS and len(p) > 2)


def un_telefono(t, solo_fijo=True):
    """SOLO FIJOS para cotejar, y es literal de ella: "confirmo por el telefono
       FIJO publicado: mismo telefono = misma empresa". Un fijo es la oficina;
       un movil es de una persona y se lo lleva cuando cambia de despacho. Con
       moviles dentro, un 687... mandaba media lista a "Torres & Asociados"."""
    d = re.sub(r"\D", "", t or "")
    if d.startswith("34") and len(d) == 11:
        d = d[2:]
    if len(d) != 9:
        return ""
    if solo_fijo:
        return d if d[0] == "9" else ""
    return d if d[0] in "6789" else ""


def telefonos(t):
    fuera = set()
    for trozo in re.findall(r"[\d\s\.\-\+]{9,20}", t or ""):
        n = un_telefono(trozo)
        if n:
            fuera.add(n)
    return fuera


def dominio(c):
    m = re.search(r"@([\w\.\-]+)", (c or "").lower())
    if not m:
        return ""
    d = m.group(1).strip(".")
    return "" if d in GENERICOS else d


def limpiar(n):
    """Quita el correo pegado y el diario metido entre parentesis. El parentesis
       con el municipio o la persona -(LEGANES), (JUAN DE LEON)- se respeta."""
    quitado = []
    n = (n or "").strip()
    m = re.search(r"\s*<?[\w\.\-\+]+@[\w\.\-]+", n)
    if m:
        quitado.append("correo")
        n = n[:m.start()].strip()

    def recorta(mm):
        if SEGUIMIENTO.search(mm.group(1)):
            quitado.append("seguimiento")
            return ""
        return mm.group(0)

    n = re.sub(r"\(([^)]*)\)?", recorta, n).strip()
    m = re.match(r"^([^(]+)\(", n)
    if m and SEGUIMIENTO.search(n[m.end():]):
        quitado.append("seguimiento")
        n = m.group(1).strip()
    return re.sub(r"\s{2,}", " ", n).strip(" ,;.-"), "+".join(sorted(set(quitado)))


class Contagio(object):
    """Union-find: si A toca a B y B toca a C, los tres son el mismo."""
    def __init__(self):
        self.padre = {}

    def raiz(self, x):
        self.padre.setdefault(x, x)
        while self.padre[x] != x:
            self.padre[x] = self.padre[self.padre[x]]
            x = self.padre[x]
        return x

    def unir(self, a, b):
        ra, rb = self.raiz(a), self.raiz(b)
        if ra != rb:
            self.padre[rb] = ra


def main():
    # ------------------------------------------------ lo que dicen las fichas
    datos = collections.defaultdict(
        lambda: {"veces": 0, "tel": set(), "dom": set(), "donde": []})
    for f in sorted(glob.glob("fichas_*.csv")):
        mun = os.path.basename(f)[7:-4].upper().replace("_", " ")
        for r in csv.DictReader(io.open(f, encoding="utf-8")):
            if r.get("lectura") != "ok":
                continue
            crudo = (r.get("administrador") or "").strip()
            if not crudo:
                continue
            d = datos[crudo]
            d["veces"] += 1
            d["tel"] |= telefonos(r.get("admin_telefono"))
            dm = dominio(r.get("admin_correo"))
            if dm:
                d["dom"].add(dm)
            d["donde"].append("%s / %s" % (mun, r.get("carpeta") or ""))

    # ------------------------------------------------ agrupar por contagio
    c = Contagio()
    por_tel, por_dom, por_pal = (collections.defaultdict(list),
                                 collections.defaultdict(list),
                                 collections.defaultdict(list))
    for n, d in datos.items():
        c.raiz(n)
        limpio, _ = limpiar(n)
        for t in d["tel"]:
            por_tel[t].append(n)
        for dm in d["dom"]:
            por_dom[dm].append(n)
        k = clave(limpio)
        if k:
            por_pal[k].append(n)
    for indice in (por_tel, por_dom, por_pal):
        for _, nombres in indice.items():
            for otro in nombres[1:]:
                c.unir(nombres[0], otro)

    grupos = collections.defaultdict(list)
    for n in datos:
        grupos[c.raiz(n)].append(n)

    # ------------------------------------------------ tu lista buena
    b = arrancar()
    emp = b.leer("empresa?select=id,nombre_accesalia,nombre_legal,telefono")
    nombre_de = {e["id"]: (e["nombre_accesalia"] or e["nombre_legal"] or "") for e in emp}
    tel_tuyo, dom_tuyo, pal_tuyo = {}, {}, []
    for e in emp:
        for t in telefonos(e.get("telefono")):
            tel_tuyo[t] = nombre_de[e["id"]]
        for nom in (e["nombre_accesalia"], e["nombre_legal"]):
            if nom and nom.strip():
                pal_tuyo.append((clave(nom), nom.strip()))
    for co in b.leer("correo?select=email,empresa_id"):
        if co.get("empresa_id") in nombre_de:
            dm = dominio(co["email"])
            if dm:
                dom_tuyo[dm] = nombre_de[co["empresa_id"]]

    # ------------------------------------------------ cotejar grupo a grupo
    filas = []
    for raiz, miembros in grupos.items():
        veces = sum(datos[m]["veces"] for m in miembros)
        tels = set().union(*(datos[m]["tel"] for m in miembros))
        doms = set().union(*(datos[m]["dom"] for m in miembros))
        donde = sorted(set(sum((datos[m]["donde"] for m in miembros), [])))
        limpios = collections.Counter()
        quitados = set()
        for m in miembros:
            l, q = limpiar(m)
            limpios[l or m] += datos[m]["veces"]
            if q:
                quitados.add(q)
        nombre = limpios.most_common(1)[0][0]
        otras = [x for x, _ in limpios.most_common()[1:]]

        por_que, suyo = "", ""
        for t in tels:
            if t in tel_tuyo:
                por_que, suyo = "mismo telefono (%s)" % t, tel_tuyo[t]
                break
        if not suyo:
            for dm in doms:
                if dm in dom_tuyo:
                    por_que, suyo = "mismo dominio (%s)" % dm, dom_tuyo[dm]
                    break
        punt = 0.0
        parecido_a = ""
        k = clave(nombre)
        for ks, nom in pal_tuyo:
            if not ks or not k:
                continue
            j = len(k & ks) / float(len(k | ks))
            if j > punt:
                parecido_a, punt = nom, j
        if not suyo and punt >= 0.99:
            por_que, suyo = "mismo nombre", parecido_a

        if NO_ES_NADA.match(nombre):
            monton = "0 no es nada"
        elif PUENTE.match(nombre):
            monton = "5 no hay administrador: lo trae un tercero"
        elif suyo:
            monton = "1 ya esta en tu lista"
        elif punt >= 0.40:
            monton = "2 se parece a uno tuyo: confirmar"
        elif PINTA_EMPRESA.search(nombre) or len(nombre.split()) >= 3:
            monton = "3 NUEVO, parece una empresa"
        else:
            monton = "4 NUEVO, nombre suelto: empresa o contacto?"

        filas.append({
            "monton": monton, "administrador": nombre, "veces": veces,
            "es_tuyo": suyo, "por_que": por_que,
            "se_parece_a": parecido_a if not suyo else "",
            "parecido": round(punt, 2) if not suyo else "",
            "telefonos": ", ".join(sorted(tels)),
            "dominios": ", ".join(sorted(doms)),
            "donde_sale": " ; ".join(donde),
            "otras_grafias": " | ".join(otras[:6]),
            "se_limpio": "+".join(sorted(quitados)),
        })

    filas.sort(key=lambda r: (r["monton"], -r["veces"]))
    cols = ["monton", "administrador", "veces", "es_tuyo", "por_que",
            "se_parece_a", "parecido", "telefonos", "dominios", "donde_sale",
            "otras_grafias", "se_limpio"]
    with io.open("cotejo_administradores.csv", "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        w.writerows(filas)

    print("nombres crudos en las fichas :", len(datos))
    print("empresas tras agrupar        :", len(filas))
    print("  (el contagio junto %d nombres en uno)" % (len(datos) - len(filas)))
    print("\nen tu lista hay %d telefonos y %d dominios con los que cruzar"
          % (len(tel_tuyo), len(dom_tuyo)))
    print()
    cuenta = collections.Counter(r["monton"] for r in filas)
    for m in sorted(cuenta):
        print("  %-46s %3d  (%d fichas)" % (m, cuenta[m],
              sum(r["veces"] for r in filas if r["monton"] == m)))
    porq = collections.Counter(r["por_que"].split(" (")[0]
                               for r in filas if r["es_tuyo"])
    print("\n  de los que SI son tuyos, como se supo:")
    for k, n in porq.most_common():
        print("     %-22s %d" % (k, n))
    print("\nguardado: cotejo_administradores.csv")


if __name__ == "__main__":
    main()
