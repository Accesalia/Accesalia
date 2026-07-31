# -*- coding: utf-8 -*-
r"""
Vuelca el apartado NOTAS de las fichas a `observaciones_expediente`.

Solo las fichas TRAZADAS (las que tienen comunidad resuelta). Entran como
fase='historico': en la ficha todo iba junto — comercial, licencia, obra y
economico en el mismo hilo — y eso es justo lo que las hace valiosas.

REGLA DE FECHAS (Monica). La fecha nunca queda vacia, y las inventadas son
DIAS DISTINTOS para que al ordenar por fecha vuelvan a su orden original:
  - la que trae fecha escrita        -> esa, tal cual (dato real, no se toca)
  - sin fecha, entre dos fechadas    -> dias repartidos en el hueco
  - sin fecha, antes de la primera   -> dias anteriores a esa primera
  - sin fecha, despues de la ultima  -> dias siguientes a esa ultima
  - ficha sin NINGUNA fecha          -> la del encargo, un dia cada una
  - si no caben dias distintos (fechas invertidas por error humano, 22 fichas
    de 333) -> repite dia y desempata `orden`, que guarda la posicion original

El texto se guarda TAL CUAL, con su fecha delante: el crudo no se destruye.

DRY-RUN por defecto. --apply para escribir.
Uso: python scripts/importar_notas_ficha.py [--apply]
"""
import os, sys, io, re, csv, subprocess
from datetime import date, timedelta
from collections import defaultdict, Counter
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

APPLY = "--apply" in sys.argv
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "--csv"]

def sql(q):
    r = subprocess.run(DB + ["-c", q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    txt = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(txt); sys.exit(1)
    return list(csv.DictReader(io.StringIO(txt)))

def esc(s):
    return "'" + (s or "").replace("'", "''") + "'"

FECHA = re.compile(r"^\s*(\d{1,2})\s*[/.\-]\s*(\d{1,2})\s*[/.\-]\s*(\d{2,4})")

def fecha_de(texto):
    m = FECHA.match(texto or "")
    if not m:
        return None
    d, mes, a = int(m.group(1)), int(m.group(2)), int(m.group(3))
    a = a + 2000 if a < 100 else a
    if not (2000 <= a <= 2100):
        return None
    try:
        return date(a, mes, d)
    except ValueError:
        return None

# ---------- notas de las fichas trazadas ----------
filas = sql("""
select f.ficha_ref, f.comunidad_id, f.modificado_en::date modificado, c.orden, c.valor
  from migracion_ficha_campo c join migracion_ficha f on f.id = c.ficha_id
 where f.comunidad_id is not null and c.seccion = 'notas' and c.valor <> ''
 order by f.ficha_ref, c.orden""")
por_ficha = defaultdict(list)
mod_ficha = {}
for x in filas:
    por_ficha[x["ficha_ref"]].append((int(x["orden"]), x["valor"], x["comunidad_id"]))
    mod_ficha[x["ficha_ref"]] = x["modificado"]
print(f"Fichas con notas: {len(por_ficha)}   notas: {len(filas)}")

# ---------- fecha del encargo, para las fichas sin ninguna ----------
enc = {x["comunidad_id"]: x["fecha"] for x in sql("""
select comunidad_id, min(f)::text fecha from (
  select comunidad_id, fecha_contratado f from proyectos where fecha_contratado is not null
  union all
  select comunidad_id, fecha_firma from hojas_encargo where fecha_firma is not null
) t group by 1""")}

# ---------- un proyecto por comunidad: se puede enganchar sin adivinar ----------
proy = defaultdict(list)
for x in sql("select id, comunidad_id from proyectos where comunidad_id is not null"):
    proy[x["comunidad_id"]].append(x["id"])

# ---------- reparto de fechas ----------
def repartir(notas, fecha_encargo):
    """notas = [(orden, texto)] en orden original -> [(fecha, estimada)]"""
    escritas = [fecha_de(t) for _, t in notas]
    out = [None] * len(notas)
    if not any(escritas):                       # ninguna trae fecha
        base = fecha_encargo or date(2000, 1, 1)
        return [(base + timedelta(days=i), True) for i in range(len(notas))]

    for i, f in enumerate(escritas):
        if f:
            out[i] = (f, False)

    i = 0
    while i < len(notas):
        if out[i]:
            i += 1; continue
        j = i
        while j < len(notas) and not out[j]:
            j += 1
        n = j - i
        antes = out[i - 1][0] if i > 0 else None
        despues = out[j][0] if j < len(notas) else None
        if antes is None:                        # antes de la primera fechada
            for k in range(n):
                out[i + k] = (despues - timedelta(days=n - k), True)
        elif despues is None:                    # despues de la ultima
            for k in range(n):
                out[i + k] = (antes + timedelta(days=k + 1), True)
        else:
            hueco = (despues - antes).days - 1
            if hueco >= n:                       # caben dias distintos
                paso = max(1, (hueco + 1) // (n + 1))
                for k in range(n):
                    out[i + k] = (min(antes + timedelta(days=paso * (k + 1)),
                                      despues - timedelta(days=1)), True)
            else:                                # no caben: repite dia, desempata `orden`
                for k in range(n):
                    out[i + k] = (antes, True)
        i = j
    return out

stats = Counter()
insert = []
for ref, notas in por_ficha.items():
    notas.sort()
    cid = notas[0][2]
    fe = enc.get(cid)
    fe = date.fromisoformat(fe) if fe else None
    if not any(fecha_de(t) for _, t, _ in notas):
        stats["fichas sin ninguna fecha (usa la del encargo)"] += 1
        if not fe:
            # Ultimo recurso antes que perder la nota: la fecha del propio
            # fichero. Es una fecha real, aunque no sea la del hecho narrado.
            m = mod_ficha.get(ref)
            fe = date.fromisoformat(m) if m else None
            stats["  ...sin encargo: se usa la fecha del fichero" if fe
                  else "  ...sin encargo ni fecha de fichero: fuera"] += 1
            if not fe:
                continue
    fechas = repartir([(o, t) for o, t, _ in notas], fe)
    pid = proy[cid][0] if len(proy.get(cid, [])) == 1 else None
    stats["notas"] += len(notas)
    stats["con proyecto resuelto" if pid else "sin proyecto (comunidad con 0 o varios)"] += len(notas)
    for (orden, texto, _), (f, est) in zip(notas, fechas):
        stats["fecha propia" if not est else "fecha asignada"] += 1
        insert.append((cid, pid, f.isoformat(), est, orden, texto, ref))

# Cuando abren un encargo nuevo COPIAN la ficha anterior, y las notas viajan con
# ella: el mismo hecho aparece una vez por ficha. Es el mismo suceso, no tres:
# se conserva una sola (la primera) para que la bitacora no lo repita.
vistas, unicas = set(), []
for reg in sorted(insert, key=lambda x: (x[0], x[2], x[4])):
    k = (reg[0], re.sub(r"\s+", " ", reg[5]).strip().lower())
    if k in vistas:
        stats["repetidas al copiar la ficha (se descartan)"] += 1
        continue
    vistas.add(k); unicas.append(reg)
insert = unicas

print()
for k, v in stats.most_common():
    print(f"  {v:6}  {k}")

if insert:
    ejemplo = sorted(insert, key=lambda x: (x[0], x[2], x[4]))[:6]
    print("\n--- muestra de como queda ---")
    for cid, pid, f, est, orden, texto, ref in ejemplo:
        print(f"  {f} {'(estimada)' if est else '          '} #{orden:<3} {texto[:66]}")

if not APPLY:
    print("\nDRY-RUN. --apply para escribir.")
    sys.exit(0)

sentencias = ["begin;", "delete from observaciones_expediente where origen = 'ficha_dropbox';"]
for cid, pid, f, est, orden, texto, ref in insert:
    sentencias.append(
        "insert into observaciones_expediente "
        "(comunidad_id, proyecto_id, fase, fecha, fecha_estimada, orden, texto, origen, ficha_ref) "
        f"values ({esc(cid)}, {esc(pid) if pid else 'null'}, 'historico', {esc(f)}, "
        f"{'true' if est else 'false'}, {orden}, {esc(texto)}, 'ficha_dropbox', {esc(ref)});")
sentencias.append("commit;")

r = subprocess.run(DB[:-1], input="\n".join(sentencias).encode("utf-8"),
                   stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
salida = r.stdout.decode("utf-8", "replace").strip()
print(salida[-600:] if salida else "ok")
if r.returncode:
    sys.exit(1)
print(f"\nHECHO: {len(insert)} observaciones.")
