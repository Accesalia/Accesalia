# -*- coding: utf-8 -*-
"""
LEER LA HOJA "DATOS del Proyecto" Y EL PRESUPUESTO DE CADA OBRA (Monica, 10-oct-2026)

Es el futuro PASO 3 del circuito (el tecnico devuelve el Excel y la app lo
guarda como registro), hecho en lote sobre las obras ya hechas.

De cada obra:
  · la hoja "DATOS del Proyecto_<obra>.xlsx": solo lo que EXISTE EN EL PROYECTO
    (docs/datos-del-proyecto-fuentes.md). Lo que la base ya sabe (Catastro,
    comunidad, equipo...) no se toma como dato: queda en `hoja`, la copia.
  · el presupuesto con importes (PDF del proyecto): los capitulos, reconocidos
    por el NOMBRE (el numero cambia de una obra a otra).
  · el enlace con la oportunidad: por la referencia catastral de la hoja ->
    portales -> oportunidad. Si hay varias, por el tipo de obra; si sigue sin
    estar claro, se guarda sin enlazar y se dice por que.

La plantilla ha cambiado con los años (47 campos en 2021, 266 en 2025; en 2026
la pestaña se llama "1 es para WORD"): todo se lee por NOMBRE de campo.

Uso:
  python scripts/historico/leer_datos_proyecto.py --prueba            # en seco, 11 obras
  python scripts/historico/leer_datos_proyecto.py --prueba --escribir # y las guarda
"""
import datetime
import json
import os
import random
import re
import sys
import unicodedata

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import openpyxl  # noqa: E402

DROPBOX = r"C:\accesalia Dropbox\D SM\Ascensores y rehabilitaciones"
# Las que ella ha dicho que no entran (10-oct-2026), con el porque.
DESCARTADAS = {
    "virgendelafuencisla8": "antigua (2022), su presupuesto es de 2019: descartada por Mónica",
    "Andarrios9": "de un particular (Nicolás Mediavilla): fuera por decisión de Mónica",
}
MESES = {m: i for i, m in enumerate(
    ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO",
     "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"], 1)}


def llano(s):
    s = unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"[\s_.:]+", " ", s).strip().upper()


VACIO = {"", ".", "·", "0", "NONE", "INTRODUCIR AQUI O", "A DEFINIR", "SELECCIONA"}


def valor(v):
    """El valor tal cual, o None si es un hueco de la plantilla."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return v
    t = str(v).replace("\u200e", "").strip()
    return None if llano(t) in VACIO else t


def numero(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    m = re.search(r"-?\d+(?:[.,]\d+)*", str(v))
    if not m:
        return None
    t = m.group(0)
    if "," in t and "." in t:
        t = t.replace(".", "").replace(",", ".") if t.rfind(",") > t.rfind(".") else t.replace(",", "")
    elif "," in t:
        t = t.replace(",", ".")
    try:
        return float(t)
    except ValueError:
        return None


def entero(v):
    n = numero(v)
    return int(round(n)) if n is not None else None


# ------------------------------------------------------------- la hoja
def leer_hoja(ruta):
    wb = openpyxl.load_workbook(ruta, read_only=True, data_only=True)
    nombre = next((h for h in wb.sheetnames if llano(h).endswith("ES PARA WORD")), None)
    campos = {}
    if nombre:
        filas = list(wb[nombre].iter_rows(min_row=1, max_row=2, values_only=True))
        if len(filas) == 2:
            for k, v in zip(filas[0], filas[1]):
                if k not in (None, 0, "0") and str(k).strip():
                    campos[str(k).strip()] = v
    caso, sate = None, {}
    dur = next((h for h in wb.sheetnames if llano(h) == "DURACIONES"), None)
    if dur:
        for fila in wb[dur].iter_rows(values_only=True):
            celdas = [c for c in fila if c is not None]
            for i, c in enumerate(celdas):
                t = llano(c)
                m = re.match(r"CASO ([A-F]) ", t + " ")
                if m and i + 1 < len(celdas) and llano(celdas[i + 1]) == "SI":
                    caso = m.group(1)
                for clave, rot in (("normal", "SATE NORMAL"), ("antivandalico", "SATE ANTIVANDALICO"),
                                   ("cubierta", "CUBIERTA"), ("andamio", "MONTAJE ANDAMIO")):
                    if t == rot and i + 1 < len(celdas) and clave not in sate:
                        sate[clave] = numero(celdas[i + 1])
    plan = None
    pl = next((h for h in wb.sheetnames if llano(h).startswith("PLANEAMIENTO")), None)
    if pl:
        plan = [(r[0], r[1]) for r in wb[pl].iter_rows(min_row=2, values_only=True) if r and r[0] and r[1]]
    version = "%s · %d campos" % (" | ".join(wb.sheetnames), len(campos))
    return campos, caso, sate, plan, version


def campo(campos, *nombres):
    """El primer campo que exista con alguno de esos nombres (sin tildes ni espacios)."""
    idx = {llano(k): v for k, v in campos.items()}
    for n in nombres:
        v = valor(idx.get(llano(n)))
        if v is not None:
            return v
    return None


def fecha_de(texto):
    if not texto:
        return None
    if isinstance(texto, datetime.datetime):
        return texto.date().replace(day=1)
    t = llano(texto)
    m = re.search(r"(" + "|".join(MESES) + r")\D*(20\d\d)", t)
    return datetime.date(int(m.group(2)), MESES[m.group(1)], 1) if m else None


def datos(campos, caso, sate):
    c = lambda *n: campo(campos, *n)  # noqa: E731
    plazo = c("EBSS Plazo_de_ejecución_previsto")
    pd = re.search(r"\((\d+)\s*d", str(plazo or ""))
    paradas = c("AS_Número de paradas")
    sup = {k: numero(v) for k, v in campos.items() if llano(k).startswith("SS ") and numero(valor(v)) not in (None, 0)}
    return {
        "fecha_texto": str(c("FECHA")) if c("FECHA") is not None else None,
        "fecha_documento": (fecha_de(c("FECHA")) or None) and fecha_de(c("FECHA")).isoformat(),
        "fase": c("PROY_Fase"),
        "tipo_obra": c("PROY_Tipo_de_Obra"),
        "tipo_obra_sate": c("PROY_Tipo_de_Obra_SATE"),
        "unidades": c("PROY_Uds"),
        "caso_actuacion": caso,
        "pem": numero(c("EBSS PEM", "PEM")),
        "plazo_texto": plazo,
        "plazo_dias": int(pd.group(1)) if pd else None,
        "operarios": entero(c("EBSS Nº_máximo_de_operarios")),
        "jornadas": entero(c("EBSS Volumen_de_mano_de_obra_estimado")),
        "residuos_asc_superficie": numero(c("GR ASC Superficie Construida Total")),
        "residuos_asc_m3": numero(c("GR ASC Volumen de residuos (S x 0,10)")),
        "residuos_asc_t": numero(c("GR ASC Estimación de toneladas de residuos originados", "GR ASC Toneladas de residuos")),
        "residuos_asc_coste": numero(c("GR ASC Coste de Gestión de Residuos")),
        "residuos_sate_superficie": numero(c("GR SATE Superficie Construida Total")),
        "residuos_sate_m3": numero(c("GR SATE Volumen de residuos (S x 0,10)")),
        "residuos_sate_t": numero(c("GR SATE Estimación de toneladas de residuos originados", "GR SATE Toneladas de residuos")),
        "residuos_sate_coste": numero(c("GR SATE Coste de Gestión de Residuos")),
        "m2_asc": numero(c("SS ACS Total", "SS ASC Total")),
        "m2_sate": numero(c("SS SATE Total")),
        "m2_total": numero(c("SS ASC+SATE Total")),
        "superficies_planta": sup or None,
        "sate_m2_normal": sate.get("normal"),
        "sate_m2_antivandalico": sate.get("antivandalico"),
        "sate_m2_cubierta": sate.get("cubierta"),
        "sate_m2_andamio": sate.get("andamio"),
        "primer_nivel": c("DC Estado Actual_primer nivel"),
        "ultimo_nivel": c("DC Estado Actual_último nivel"),
        "peldanos_planta": c("DC Estado Actual_peldaños por PLANTA"),
        "altura_cornisa": numero(c("ED Altura de la Edificación a cornisa")),
        "altura_libre": numero(c("ED Altura libre de plantas")),
        "superficie_por_planta": numero(c("ED Superficie construida por planta")),
        "patios": entero(c("ED Número de patios")),
        "acceso": c("ED Acceso a la edificación"),
        "nucleos_escalera": c("ED Núcleos de escalera"),
        "asc_tipo": c("AS_Tipo de ascensor"),
        "asc_carga_kg": entero(c("AS_Carga nominal")),
        "asc_pasajeros": entero(c("AS_Número de pasajeros")),
        "asc_paradas": entero(paradas),
        "asc_paradas_texto": str(paradas) if paradas is not None else None,
        "asc_recorrido_m": numero(c("AS_Recorrido")),
        "asc_foso": c("AS_Profundidad del foso"),
        "asc_huida": c("AS_Huída"),
        "asc_hueco": c("AS_Dimensiones de hueco: A x F"),
        "asc_cuarto_maquinas": c("AS_Cuarto de máquinas"),
        "asc_cabina": c("AS_Dimensiones de cabina: A x F x H"),
        "asc_puertas": c("AS_Dimensiones de puertas A x H"),
        "cee_ahorro_global": numero(c("CEE_Porcentaje ahorro global")),
        "cee_ahorro_demanda": numero(c("CEE_Porcentaje ahorro demanda energía")),
        "cee_registro": c("CEE_Núm_Registro_CAM"),
        "subvencion_pct": numero(c("CEE_Porcentaje subvención")),
        "subvencion_cuantia_vivienda": numero(c("CEE_Cuantía máx vivienda")),
        "hospital": c("EBSS Asistencia_Especializada_(Hospital)"),
    }


# ------------------------------------------------------------- el presupuesto
CAPITULOS = [  # (clave, palabras que lo reconocen en el nombre)
    ("sate_fachadas", "AISLAMIENTO TERMICO EN FACHADA"), ("sate_cubiertas", "AISLAMIENTO TERMICO EN CUBIERTA"),
    ("medios_auxiliares", "MEDIOS AUXILIARES"), ("movimientos_tierras", "MOVIMIENTOS DE TIERRA"),
    ("demoliciones", "DEMOLICION"), ("albanileria", "ALBANILERIA"), ("estructura", "ESTRUCTURA"),
    ("medios_elevacion", "MEDIOS DE ELEVACION"), ("medios_elevacion", "PLATAFORMA ELEVADORA"), ("medios_elevacion", "ASCENSOR"),
    ("movimientos_tierras", "ACONDICIONAMIENTO DEL TERRENO"), ("estructura", "CIMENTACION"), ("pinturas", "ACABADOS"),
    ("cerrajeria", "CERRAJERIA"), ("proteccion_incendio", "INCENDIO"),
    ("electricidad", "ELECTRICIDAD"), ("cubierta_montera", "MONTERA"), ("pinturas", "PINTURA"),
    ("seguridad_salud", "SEGURIDAD Y SALUD"), ("gestion_residuos", "RESIDUOS"), ("control_calidad", "CONTROL DE CALIDAD"),
]
IMPORTE = r"(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})"
# El nombre de un capitulo puede llevar puntos ("CERRAJERIA EN E.P") y partirse
# en dos lineas; Presto rellena hasta el importe con puntos que a veces van
# partidos por espacios ("....... ........ 7.736,47").
_L = "A-Za-zÁÉÍÓÚÑáéíóúñ"
NOMBRE = r"((?:[^.\n]|\.(?=[" + _L + r"]))+(?:\n(?:[^.\n]|\.(?=[" + _L + r"]))+)?)"
RELLENO = r"[\s.]*?\.{3,}[\s.]*"


def importe(t):
    t = t.strip()
    dec = t[-3]
    ent = re.sub(r"[.,]", "", t[:-3])
    return float(ent + "." + t[-2:]) if dec in ".," else None


def capitulo_de(nombre):
    n = llano(nombre)
    parte = None
    m = re.search(r"\s(ET|ASC)$", n)
    if m:
        parte = m.group(1).lower()
        n = n[: m.start()]
    for clave, palabras in CAPITULOS:
        if palabras in n:
            return clave, parte
    return "otro", parte


def buscar_presupuesto(obra):
    """El PDF del presupuesto del proyecto: SOLO el que va al colegio
    (2.PROYECTO/3.PDF/COLEGIO/..., o PROYECTO/PDF/COLEGIO/ESCRITOS en la
    estructura antigua). Fuera de ahi hay presupuestos de contratas, de
    subvenciones o de versiones viejas: no se adivina, se dice que no esta.
    Primero el sin firmar (el _F es el mismo, firmado)."""
    cand = []
    for raiz, _, ficheros in os.walk(obra):
        if not re.search(r"PROYECTO[\\/](\d\.\s*)?PDF[\\/]COLEGIO", raiz.upper()):
            continue
        for f in ficheros:
            fl = f.lower()
            if fl.endswith(".pdf") and "presupuesto" in fl:
                r = os.path.join(raiz, f)
                peso = (1 if re.search(r"_f\.pdf$|firmad", fl) else 0, -os.path.getmtime(r))
                cand.append((peso, r))
    return [r for _, r in sorted(cand)]


def leer_presupuesto(ruta):
    from pypdf import PdfReader
    texto = "\n".join(p.extract_text() or "" for p in PdfReader(ruta).pages)
    caps = []
    for m in re.finditer(r"TOTAL CAP[ÍI]TULO\s+(\S+)\s+" + NOMBRE + RELLENO + IMPORTE, texto):
        clave, parte = capitulo_de(m.group(2).replace("\n", " "))
        caps.append({"numero_documento": m.group(1), "capitulo": clave, "parte": parte,
                     "nombre_documento": " ".join(m.group(2).split()), "importe": importe(m.group(3))})
    # El TOTAL final (no los TOTAL CAPITULO); a veces va pegado a la linea anterior.
    tot = re.findall(r"TOTAL(?!\s*CAP)" + RELLENO + IMPORTE, texto)
    total = importe(tot[-1]) if tot else None
    fechas = re.findall(r"(\d{1,2}) de (" + "|".join(m.lower() for m in MESES) + r") de (20\d\d)", texto.lower())
    fecha = None
    if fechas:
        d, mes, a = fechas[-1]
        fecha = datetime.date(int(a), MESES[mes.upper()], int(d)).isoformat()
    suma = round(sum(c["importe"] for c in caps), 2)
    return {"capitulos": caps, "pem": total if total is not None else (suma or None), "fecha": fecha,
            "cuadra": (abs(suma - total) < 0.05) if (total is not None and caps) else None}


# ------------------------------------------------------------- el enlace
def _calle_numero(campos):
    """'PONTEVEDRA 1' de la hoja, sin tipo de via ni articulos, para desempatar."""
    calle = llano(campo(campos, "PROY_Dirección_Calle") or "")
    calle = re.sub(r"^(DE LA|DE LOS|DE LAS|DEL|DE|LA|EL|LOS|LAS)\s+", "", calle)
    num = str(campo(campos, "PROY_Dirección_Nº") or "").strip()
    return calle, num


def _carpeta(ruta_obra):
    """El nombre de la carpeta de la direccion (la de debajo del municipio)."""
    partes = [p for p in ruta_obra.replace("\\", "/").split("/") if p]
    for p in reversed(partes):
        if not re.match(r"^\d\s", p):  # "1 SATE", "1 Cambio de..." son subproyectos
            return p
    return partes[-1]


def enlazar(base, campos, tipo_obra, ruta_obra):
    """Dos caminos. 1) La referencia catastral de la hoja -> portales ->
    oportunidad; si la finca tiene varias (un portal por oportunidad), desempata
    la direccion de la hoja. 2) Las oportunidades que vienen de la clon guardan
    el nombre de la carpeta de Dropbox en comunidad_provisional ("carpeta
    (MUNICIPIO)"): Martin Vegue 22 no tenia portales y se encuentra asi."""
    motivo = "sin referencia catastral en la hoja"
    ref = campo(campos, "PROY_Referencia_Catastral")
    if ref:
        ref = re.sub(r"\s", "", str(ref)).upper()[:14]
        accesos = base.leer("accesos?select=id&ref_catastral=like.%s*" % ref)
        motivo = "refcat %s: ningún portal" % ref
        if accesos:
            ids = ",".join(a["id"] for a in accesos)
            rel = base.leer("relacion_oportunidad_accesos?select=opp_id,acceso_id&hasta=is.null&acceso_id=in.(%s)" % ids)
            oids = sorted({r["opp_id"] for r in rel})
            motivo = "refcat %s: portal sin oportunidad" % ref
            if len(oids) == 1:
                return oids[0], "refcat %s" % ref
            if len(oids) > 1:
                calle, num = _calle_numero(campos)
                opps = base.leer("oportunidades?select=id,codigo,nombre&id=in.(%s)" % ",".join(oids))
                port = {a["id"]: a for a in base.leer("accesos?select=id,nombre_via,numero&id=in.(%s)" % ids)}
                buenas = set()
                for r in rel:
                    a = port.get(r["acceso_id"]) or {}
                    if calle and calle in llano(a.get("nombre_via") or "") and num and re.match(r"^%s\b" % re.escape(num), str(a.get("numero") or "")):
                        buenas.add(r["opp_id"])
                if len(buenas) != 1 and calle and num:
                    n = llano(num)
                    buenas = {o["id"] for o in opps
                              if calle in llano(o.get("nombre") or "") and re.search(r"\b%s\b" % re.escape(n), llano(o.get("nombre") or ""))}
                if len(buenas) == 1:
                    return buenas.pop(), "refcat %s + dirección" % ref
                motivo = "refcat %s: varias oportunidades (%s)" % (ref, ", ".join(sorted(o["codigo"] or "?" for o in opps)))
    carpeta = _carpeta(ruta_obra)
    por_carpeta = base.leer("oportunidades?select=id,codigo&comunidad_provisional=ilike.%s" %
                            __import__("urllib.parse").parse.quote(carpeta.replace("*", "") + " (*"))
    if len(por_carpeta) == 1:
        return por_carpeta[0]["id"], "carpeta %s" % carpeta
    if len(por_carpeta) > 1:
        motivo += " · carpeta %s: varias (%s)" % (carpeta, ", ".join(sorted(o["codigo"] or "?" for o in por_carpeta)))
    return None, motivo


# ------------------------------------------------------------- la obra
def carpeta_obra(ruta):
    partes = ruta.replace("\\", "/").split("/")
    for i, p in enumerate(partes):
        if re.match(r"^(\d\.\s*)?(DATOS|PROYECTO|OBRA)S?$", p.upper()):
            return "/".join(partes[:i])
    return os.path.dirname(ruta)


def obras_con_hoja():
    """Una hoja por obra: la de 2.PROYECTO/1.ESCRITOS si existe, la mas reciente."""
    por_obra = {}
    for raiz, _, ficheros in os.walk(DROPBOX):
        # Las carpetas "_..." (documentos utiles, formatos) y "PROYECTO X" son plantillas, no obras.
        if os.path.basename(raiz).startswith("_") or "PROYECTO X" in raiz.upper() or "\_" in raiz:
            continue
        for f in ficheros:
            if f.lower().startswith("datos del proyecto") and f.lower().endswith(".xlsx") and not f.startswith("~$"):
                r = os.path.join(raiz, f)
                o = carpeta_obra(r)
                peso = (0 if "1.ESCRITOS" in r.upper() else 1, -os.path.getmtime(r))
                if o not in por_obra or peso < por_obra[o][0]:
                    por_obra[o] = (peso, r)
    return {o: r for o, (_, r) in por_obra.items()}


def main():
    escribir = "--escribir" in sys.argv
    todas = obras_con_hoja()
    if "--prueba" in sys.argv:
        camarena = [o for o in todas if o.replace("\\", "/").endswith("MADRID/camarena200")]
        random.seed(10)
        resto = sorted(set(todas) - set(camarena))
        porAnio = {}
        for o in resto:
            porAnio.setdefault(datetime.date.fromtimestamp(os.path.getmtime(todas[o])).year, []).append(o)
        elegidas = camarena + [random.choice(porAnio[a]) for a in sorted(porAnio)] + random.sample(resto, 4)
        obras = list(dict.fromkeys(elegidas))[:11]
    else:
        obras = sorted(todas)
        # Por tandas: --tanda 1 = las 100 primeras, --tanda 2 = las 100 siguientes...
        if "--tanda" in sys.argv:
            n = int(sys.argv[sys.argv.index("--tanda") + 1])
            obras = obras[(n - 1) * 100: n * 100]
            print("Tanda %d: obras %d a %d de %d" % (n, (n - 1) * 100 + 1, (n - 1) * 100 + len(obras), len(todas)))

    base = None
    if escribir or True:
        from produccion import arrancar
        base = arrancar()

    plan_guardado = False
    for o in obras:
        ruta = todas[o]
        rel = os.path.relpath(ruta, DROPBOX)
        try:
            campos, caso, sate, plan, version = leer_hoja(ruta)
        except Exception as e:
            print("\n✗ %s: no se puede leer (%s)" % (rel, e))
            continue
        d = datos(campos, caso, sate)
        fuera = next((m for c, m in DESCARTADAS.items() if c.lower() in o.lower()), None)
        if fuera:
            print("\n· %s: descartada (%s)" % (os.path.relpath(o, DROPBOX), fuera))
            continue
        # Una memoria valorada no es un proyecto completo (Monica, 10-oct): fuera.
        if "MEMORIA VALORADA" in llano(d["fase"] or ""):
            print("\n· %s: memoria valorada, no se vuelca" % os.path.relpath(o, DROPBOX))
            continue
        opp, enlace = enlazar(base, campos, d["tipo_obra"], o)
        # De los presupuestos de la carpeta, el que da el PEM de la hoja; si
        # ninguno (o la hoja trae el de plantilla), el de fecha mas reciente.
        leidos = []
        for cand in buscar_presupuesto(o)[:12]:
            try:
                p = leer_presupuesto(cand)
            except Exception:
                continue
            if p["capitulos"]:
                leidos.append((p, cand))
        pres, pres_ruta = None, None
        if leidos:
            casa = [x for x in leidos if d["pem"] and x[0]["pem"] and abs(x[0]["pem"] - d["pem"]) <= max(1.0, d["pem"] * 0.005)]
            pres, pres_ruta = casa[0] if casa else max(leidos, key=lambda x: x[0]["fecha"] or "")
        # EL PEM BUENO ES EL DEL PRESUPUESTO: el de la hoja puede ser el de
        # plantilla (100.000) o de una version anterior.
        avisos = []
        if d["pem"] == 100000:
            avisos.append("PEM de la hoja = 100.000 (valor de plantilla)")
            d["pem"] = None
        if pres and pres["pem"] and d["pem"] and abs(pres["pem"] - d["pem"]) > max(1.0, d["pem"] * 0.005):
            avisos.append("PEM de la hoja %.2f distinto del presupuesto %.2f" % (d["pem"], pres["pem"]))
        if pres and pres["pem"]:
            d["pem"] = pres["pem"]
        es_sate = bool(d["m2_sate"]) or "SATE" in llano(d.get("tipo_obra_sate") or "") or "ENVOLVENTE" in llano(d.get("tipo_obra") or "")
        if not es_sate:
            for k in ("residuos_sate_superficie", "residuos_sate_m3", "residuos_sate_t", "residuos_sate_coste"):
                d[k] = None
        if not d["residuos_asc_coste"]:
            for k in ("residuos_asc_superficie", "residuos_asc_m3", "residuos_asc_t", "residuos_asc_coste"):
                d[k] = None
        for k, v in list(d.items()):
            if isinstance(v, float):
                d[k] = round(v, 2)
        print("\n■ %s" % os.path.relpath(o, DROPBOX))
        print("  plantilla: %s" % version)
        print("  %s · %s · caso %s · PEM hoja %s · fecha %s" % (d["tipo_obra"], d["fase"], d["caso_actuacion"], d["pem"], d["fecha_texto"]))
        print("  residuos ASC %s m³ / %s € · SATE %s m³ / %s € · m² ASC %s · m² SATE %s" % (
            d["residuos_asc_m3"], d["residuos_asc_coste"], d["residuos_sate_m3"], d["residuos_sate_coste"], d["m2_asc"], d["m2_sate"]))
        print("  ascensor: %s paradas · %s m · %s kg · %s" % (d["asc_paradas"], d["asc_recorrido_m"], d["asc_carga_kg"], d["asc_tipo"]))
        print("  enlace: %s" % enlace)
        if avisos:
            print("  AVISOS: " + " · ".join(avisos))
        if pres:
            print("  presupuesto: %s · PEM %s · %s capítulos · cuadra %s · fecha %s" % (
                os.path.relpath(pres_ruta, o), pres["pem"], len(pres["capitulos"]), pres["cuadra"], pres["fecha"]))
            print("    " + " | ".join("%s%s %.0f" % (c["capitulo"], "/" + c["parte"] if c["parte"] else "", c["importe"]) for c in pres["capitulos"]))
        else:
            print("  presupuesto: NO ENCONTRADO o sin capítulos legibles")

        if escribir:
            import uuid
            did = str(uuid.uuid4())
            fila = {"id": did, "oportunidad_id": opp, "enlace": enlace, "ruta": rel,
                    "fichero_modificado_en": datetime.datetime.fromtimestamp(os.path.getmtime(ruta)).isoformat(),
                    "version_plantilla": version,
                    "hoja": json.loads(json.dumps(campos, default=str)),
                    "avisos": avisos + ([] if pres else ["presupuesto del colegio no localizado"]) + (["los capítulos no suman el total del presupuesto"] if pres and pres["cuadra"] is False else []) or None}
            fila.update(d)
            ya = base.leer("datos_proyecto?select=id,oportunidad_id&ruta=eq.%s" % __import__("urllib.parse").parse.quote(rel))
            if ya:
                # Ya guardada: no se toca, salvo para completarle el enlace.
                if not ya[0]["oportunidad_id"] and opp:
                    base.actualizar("datos_proyecto?id=eq.%s" % ya[0]["id"], {"oportunidad_id": opp, "enlace": enlace})
                    base.actualizar("presupuestos_proyecto?datos_proyecto_id=eq.%s" % ya[0]["id"], {"oportunidad_id": opp})
                    print("  ✓ ya estaba guardada: enlace completado (%s)" % enlace)
                else:
                    print("  (ya estaba guardada: no se toca)")
                continue
            base.insertar("datos_proyecto", [fila])
            if pres:
                pid = str(uuid.uuid4())
                base.insertar("presupuestos_proyecto", [{"id": pid, "oportunidad_id": opp, "datos_proyecto_id": did,
                                                         "ruta": os.path.relpath(pres_ruta, DROPBOX), "formato": "pdf",
                                                         "fecha": pres["fecha"], "pem": pres["pem"], "cuadra": pres["cuadra"]}])
                vistos, caps = set(), []
                for c in pres["capitulos"]:
                    if c["numero_documento"] in vistos:
                        continue
                    vistos.add(c["numero_documento"])
                    caps.append(dict(c, presupuesto_id=pid))
                base.insertar("presupuesto_proyecto_capitulos", caps)
            if plan and not plan_guardado and len(plan) > 30:
                munis = {llano(m["nombre"]): m["id"] for m in base.leer("municipios_catastro?select=id,nombre")}
                filas = []
                for nombre, fecha in plan:
                    mid = munis.get(llano(nombre)) or munis.get(llano(nombre).replace("SAN LORENZO DEL ESCORIAL", "SAN LORENZO DE EL ESCORIAL"))
                    if mid and not base.leer("planeamiento_municipal?select=municipio_id&municipio_id=eq.%s" % mid):
                        filas.append({"municipio_id": mid, "fecha_texto": str(fecha).strip(),
                                      "fuente": "Pestaña Planeamiento Urb. de la hoja DATOS del Proyecto (" + rel + ")"})
                if filas:
                    base.insertar("planeamiento_municipal", filas)
                    print("  planeamiento: %d municipios guardados" % len(filas))
                plan_guardado = True
            print("  ✓ guardada")


if __name__ == "__main__":
    main()
