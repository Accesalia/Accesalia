# -*- coding: utf-8 -*-
r"""
Genera la migracion que arregla en PRODUCCION lo que quedo pendiente:

  1. Las 11 direcciones a las que hay que devolver el portal/escalera. En
     produccion siguen 3 "Santa Cruz de Marcenado, 1" identicas y 2 "Cuesta
     Blanca, 2": indistinguibles en pantalla.
  2. Las 3 comunidades duplicadas (Isturiz 11, Eras 9, Virgen de Iciar 17). Son
     UNA comunidad con dos encargos partida en dos filas, y hoy la mitad de la
     historia esta en una fila y la otra mitad en la otra.
  3. El reparto de las notas a su encargo (proyecto_id), que en produccion falta.
  4. Las observaciones y presidentes que no llegaron por colgar de esas filas.

NO se borra y recrea la comunidad: se FUSIONA (mover lo que cuelga + borrar la
sobrante). El resultado es el mismo -una comunidad con sus dos encargos y cada
nota en el suyo- sin destruir filas de produccion, que ademas tiene datos que
local no tiene (administradores 308 vs 98).

Todo se traduce por `migracion_monday.monday_item_id`: los UUID no coinciden.

Uso: python scripts/preparar_arreglo_remoto.py   (luego: supabase db push)
"""
import os, sys, io, csv, subprocess
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-q", "--csv"]
SALIDA = os.path.join("supabase", "migrations", "20260727140000_arreglo_direcciones_esc.sql")

REFERENCIAS = ["beneficiarios_reparto_caes", "condicionantes_comunidad",
               "destinatarios_informe", "documentos", "expedientes", "hojas_encargo",
               "interaccion_comunidad", "migracion_ficha", "observaciones_expediente",
               "operaciones_caes", "oportunidades", "personas_comunidad", "proyectos",
               "resumenes_ia"]

def sql(q):
    r = subprocess.run(DB + ["-c", q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    t = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(t); sys.exit(1)
    return list(csv.DictReader(io.StringIO(t)))

def lit(v):
    return "null" if v is None else "'" + str(v).replace("'", "''") + "'"

out = []
def w(s=""):
    out.append(s)

# ---- 1. direcciones con portal, identificadas por su item de Monday ----
dirs = sql("""
select m.monday_item_id, c.direccion
  from comunidades c join migracion_monday m
    on m.registro_id = c.id and m.tabla_destino = 'comunidades'
 where c.direccion ~* '(portal|escalera|esc|bloque|fase)\s'""")

# ---- 2. las 3 fusiones: en local sobrevivio una fila con DOS items Monday ----
fusiones = sql("""
select c.id::text local_id, coalesce(nullif(c.direccion,''),c.nombre) etiqueta,
       string_agg(m.monday_item_id, ',' order by m.monday_item_id) items
  from comunidades c join migracion_monday m
    on m.registro_id = c.id and m.tabla_destino = 'comunidades'
 group by 1,2 having count(*) > 1""")

# ---- 3. reparto de notas: nota -> proyecto, ambos por su item de Monday ----
notas = sql("""
select mc.monday_item_id com_item, mp.monday_item_id proy_item, o.texto
  from observaciones_expediente o
  join migracion_monday mc on mc.registro_id = o.comunidad_id and mc.tabla_destino='comunidades'
  join migracion_monday mp on mp.registro_id = o.proyecto_id  and mp.tabla_destino='proyectos'
 where o.proyecto_id is not null""")

print(f"direcciones a corregir : {len(dirs)}")
print(f"comunidades a fusionar : {len(fusiones)}")
print(f"notas con encargo      : {len(notas)}")

w("-- =============================================================================")
w("-- Arreglo en produccion de lo que quedo pendiente del volcado de fichas:")
w("--   1. devolver el portal/escalera a las direcciones que lo perdieron")
w("--   2. fusionar las comunidades duplicadas (una comunidad, varios encargos)")
w("--   3. repartir cada nota a su encargo")
w("--")
w("-- Los UUID de local y produccion NO coinciden: todo se traduce por")
w("-- migracion_monday.monday_item_id, que si es el mismo en los dos lados.")
w("-- Idempotente.")
w("-- =============================================================================")
w()
w("-- ---------- 1. direcciones ----------")
w("create temp table _dir (monday_item_id text, direccion text);")
w("insert into _dir values")
w(",\n".join(f"({lit(d['monday_item_id'])}, {lit(d['direccion'])})" for d in dirs) + ";")
w("update comunidades c set direccion = d.direccion")
w("  from _dir d join migracion_monday m")
w("    on m.tabla_destino='comunidades' and m.monday_item_id = d.monday_item_id")
w(" where c.id = m.registro_id and c.direccion is distinct from d.direccion;")
w()
w("-- ---------- 2. fusiones ----------")
w("-- En local la comunidad superviviente quedo con los DOS items de Monday. En")
w("-- produccion esos dos items apuntan a dos filas distintas: se unifican en una.")
w("-- Un grupo = los items de Monday que en LOCAL comparten comunidad. Puede tener")
w("-- 2, 3 o 4 items (Hernan Cortes tiene 4 encargos). Se resuelve cada item a su")
w("-- fila de produccion y, si el grupo cae en varias filas, se unifican.")
w("create temp table _fus (grupo int, monday_item_id text);")
w("insert into _fus values")
filas_fus = []
for i, f in enumerate(fusiones):
    for item in f["items"].split(","):
        filas_fus.append(f"({i}, {lit(item)})")
w(",\n".join(filas_fus) + ";")
w()
w("create temp table _res as")
w("select f.grupo, m.registro_id comunidad_id,")
w("       (select count(*) from proyectos p where p.comunidad_id = m.registro_id) proyectos")
w("  from _fus f join migracion_monday m")
w("    on m.tabla_destino = 'comunidades' and m.monday_item_id = f.monday_item_id;")
w()
w("-- sobrevive la que mas proyectos tiene colgando; a igualdad, la de id menor")
w("create temp table _merge as")
w("select r.comunidad_id absorbida, s.sobrevive")
w("  from _res r")
w("  join (select grupo, (array_agg(comunidad_id order by proyectos desc, comunidad_id))[1] sobrevive")
w("          from _res group by grupo having count(distinct comunidad_id) > 1) s")
w("    on s.grupo = r.grupo")
w(" where r.comunidad_id <> s.sobrevive;")
for t in REFERENCIAS:
    w(f"update {t} x set comunidad_id = mg.sobrevive from _merge mg where x.comunidad_id = mg.absorbida;")
w("update migracion_monday x set registro_id = mg.sobrevive")
w("  from _merge mg where x.tabla_destino='comunidades' and x.registro_id = mg.absorbida;")
w("delete from comunidades c using _merge mg where c.id = mg.absorbida;")
w()
w("-- ---------- 3. reparto de notas a su encargo ----------")
w("create temp table _nota (com_item text, proy_item text, texto text);")
w("insert into _nota values")
w(",\n".join(f"({lit(n['com_item'])}, {lit(n['proy_item'])}, {lit(n['texto'])})" for n in notas) + ";")
w("update observaciones_expediente o set proyecto_id = mp.registro_id")
w("  from _nota n")
w("  join migracion_monday mc on mc.tabla_destino='comunidades' and mc.monday_item_id = n.com_item")
w("  join migracion_monday mp on mp.tabla_destino='proyectos'   and mp.monday_item_id = n.proy_item")
w(" where o.comunidad_id = mc.registro_id and o.texto = n.texto")
w("   and o.proyecto_id is distinct from mp.registro_id;")

with open(SALIDA, "w", encoding="utf-8", newline="\n") as fh:
    fh.write("\n".join(out) + "\n")
print(f"\n-> {SALIDA}  ({os.path.getsize(SALIDA)/1024:.0f} KB)")
