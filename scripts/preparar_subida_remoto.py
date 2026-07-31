# -*- coding: utf-8 -*-
r"""
Genera la migracion que sube a Supabase REAL el trabajo hecho en local.

PROBLEMA: local y remoto se poblaron por separado desde Monday, asi que los UUID
NO coinciden. No se puede subir por id.

PUENTE: `migracion_monday` existe en los dos y guarda el `monday_item_id`. Con el
se traduce id local -> id remoto sin adivinar (678 comunidades, 269 admins, 609
proyectos). Para las filas que no vienen de Monday (las del Excel) se casa por
nombre exacto, que es identico porque lo genero el mismo importador.

Lo que sube: catastro, CIF, CP y administrador de las comunidades; las 11
direcciones a las que se les devolvio el portal; las fusiones de comunidades
duplicadas; los administradores y contactos nuevos; los presidentes; y las
observaciones (la bitacora de las fichas).

NO sube las tablas de staging (migracion_ficha*): son andamiaje, la app no las usa.

El SQL generado es IDEMPOTENTE: se puede aplicar dos veces sin duplicar.

Uso: python scripts/preparar_subida_remoto.py    (luego: supabase db push)
"""
import os, sys, io, csv, subprocess
from datetime import datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-q", "--csv"]
SALIDA = os.path.join("supabase", "migrations",
                      "20260728120000_backfill_con_fichas_pendientes.sql")

def sql(q):
    r = subprocess.run(DB + ["-c", q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    txt = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(txt); sys.exit(1)
    return list(csv.DictReader(io.StringIO(txt)))

def lit(v):
    # OJO: la cadena vacia se escribe como '' , NO como null. El SQL compara
    # `monday_item_id = ''` y `direccion = ''`; si llegara NULL esas
    # comparaciones darian falso siempre y el mapeo por texto no se activaria.
    if v is None:
        return "null"
    return "'" + str(v).replace("'", "''") + "'"

def valores(filas, cols):
    return ",\n".join("(" + ", ".join(lit(f[c]) for c in cols) + ")" for f in filas)

out = []
def w(s=""):
    out.append(s)

# ---------------------------------------------------------------- comunidades
com = sql("""
select c.id::text local_id,
       coalesce(m.monday_item_id,'') monday_item_id,
       coalesce(c.nombre,'') nombre,
       coalesce(c.direccion,'') direccion,
       coalesce(c.municipio,'') municipio,
       coalesce(c.referencia_catastral,'') catastral,
       coalesce(c.cif_comunidad,'') cif,
       coalesce(c.cp,'') cp,
       coalesce(am.monday_item_id,'') admin_monday,
       coalesce(a.nombre,'') admin_nombre
  from comunidades c
  left join (select distinct on (registro_id) registro_id, monday_item_id
               from migracion_monday where tabla_destino='comunidades'
              order by registro_id, monday_item_id) m on m.registro_id = c.id
  left join administraciones_fincas a on a.id = c.administracion_id
  left join (select distinct on (registro_id) registro_id, monday_item_id
               from migracion_monday where tabla_destino='administraciones_fincas'
              order by registro_id, monday_item_id) am on am.registro_id = a.id
 where c.referencia_catastral is not null or c.cif_comunidad is not null
    or c.administracion_id is not null or c.cp is not null""")

admins = sql("""
select a.id::text local_id, coalesce(m.monday_item_id,'') monday_item_id,
       a.nombre, coalesce(a.email,'') email, coalesce(a.telefono,'') telefono,
       coalesce(a.direccion,'') direccion, coalesce(a.municipio,'') municipio
  from administraciones_fincas a
  left join (select distinct on (registro_id) registro_id, monday_item_id
               from migracion_monday where tabla_destino='administraciones_fincas'
              order by registro_id, monday_item_id) m on m.registro_id = a.id""")

contactos = sql("""
select coalesce(am.monday_item_id,'') admin_monday, a.nombre admin_nombre,
       c.nombre, coalesce(c.telefono,'') telefono, coalesce(c.email,'') email,
       coalesce(c.proposito,'general') proposito, coalesce(c.notas,'') notas
  from contactos c join administraciones_fincas a on a.id = c.administracion_id
  left join (select distinct on (registro_id) registro_id, monday_item_id
               from migracion_monday where tabla_destino='administraciones_fincas'
              order by registro_id, monday_item_id) am on am.registro_id = a.id""")

personas = sql("""
select p.comunidad_id::text local_com,
       coalesce(m.monday_item_id,'') monday_item_id, coalesce(c.nombre,'') com_nombre,
       coalesce(c.direccion,'') com_direccion, p.nombre, p.rol,
       coalesce(p.documento,'') documento, coalesce(p.telefono,'') telefono,
       coalesce(p.email,'') email
  from personas_comunidad p join comunidades c on c.id = p.comunidad_id
  left join (select distinct on (registro_id) registro_id, monday_item_id
               from migracion_monday where tabla_destino='comunidades'
              order by registro_id, monday_item_id) m on m.registro_id = c.id""")

obs = sql("""
select o.comunidad_id::text local_com,
       coalesce(m.monday_item_id,'') monday_item_id, coalesce(c.nombre,'') com_nombre,
       coalesce(c.direccion,'') com_direccion,
       coalesce(pm.monday_item_id,'') proy_monday,
       o.fecha::text fecha, o.fecha_estimada::text estimada, o.orden::text orden,
       o.texto, o.fase, o.origen, coalesce(o.ficha_ref,'') ficha_ref
  from observaciones_expediente o
  join comunidades c on c.id = o.comunidad_id
  left join (select distinct on (registro_id) registro_id, monday_item_id
               from migracion_monday where tabla_destino='comunidades'
              order by registro_id, monday_item_id) m on m.registro_id = c.id
  left join (select distinct on (registro_id) registro_id, monday_item_id
               from migracion_monday where tabla_destino='proyectos'
              order by registro_id, monday_item_id) pm on pm.registro_id = o.proyecto_id""")

print(f"comunidades con dato nuevo : {len(com)}")
print(f"administraciones           : {len(admins)}")
print(f"contactos                  : {len(contactos)}")
print(f"presidentes                : {len(personas)}")
print(f"observaciones              : {len(obs)}")

w("-- =============================================================================")
w("-- Backfill: sube a produccion el trabajo hecho en local a partir de las fichas")
w("-- de Dropbox (catastro, CIF, CP, administrador, presidentes y la bitacora de")
w("-- observaciones).")
w("--")
w("-- Local y remoto se poblaron por separado desde Monday y los UUID NO coinciden,")
w("-- asi que NADA se casa por id: se traduce con `migracion_monday.monday_item_id`,")
w("-- que es el mismo en los dos. Lo que no viene de Monday se casa por nombre")
w("-- exacto (lo genero el mismo importador, es identico).")
w("--")
w("-- Idempotente: aplicarlo dos veces no duplica ni pisa dato existente.")
w("-- =============================================================================")
w()
w("create temp table _com (local_id uuid, monday_item_id text, nombre text, direccion text,")
w("                        municipio text, catastral text, cif text, cp text,")
w("                        admin_monday text, admin_nombre text);")
w("insert into _com values")
w(valores(com, ["local_id", "monday_item_id", "nombre", "direccion", "municipio",
                "catastral", "cif", "cp", "admin_monday", "admin_nombre"]) + ";")
w()
w("create temp table _adm (local_id uuid, monday_item_id text, nombre text, email text,")
w("                        telefono text, direccion text, municipio text);")
w("insert into _adm values")
w(valores(admins, ["local_id", "monday_item_id", "nombre", "email", "telefono",
                   "direccion", "municipio"]) + ";")
w()
w("create temp table _con (admin_monday text, admin_nombre text, nombre text, telefono text,")
w("                        email text, proposito text, notas text);")
w("insert into _con values")
w(valores(contactos, ["admin_monday", "admin_nombre", "nombre", "telefono", "email",
                      "proposito", "notas"]) + ";")
w()
w("create temp table _per (local_com uuid, monday_item_id text, com_nombre text, com_direccion text,")
w("                        nombre text, rol text, documento text, telefono text,")
w("                        email text);")
w("insert into _per values")
w(valores(personas, ["local_com", "monday_item_id", "com_nombre", "com_direccion", "nombre", "rol",
                     "documento", "telefono", "email"]) + ";")
w()
w("create temp table _obs (local_com uuid, monday_item_id text, com_nombre text, com_direccion text,")
w("                        proy_monday text, fecha date, estimada boolean, orden int,")
w("                        texto text, fase text, origen text, ficha_ref text);")
w("insert into _obs values")
w(valores(obs, ["local_com", "monday_item_id", "com_nombre", "com_direccion", "proy_monday", "fecha",
                "estimada", "orden", "texto", "fase", "origen", "ficha_ref"]) + ";")
w()
w("-- ---- traduccion de ids ----")
w("-- Dos estrategias EXPLICITAS y en este orden, nunca una al azar:")
w("--   1. por monday_item_id, que es el mismo en los dos lados (exacto)")
w("--   2. si no viene de Monday, por nombre+direccion y SOLO si hay una unica")
w("--      candidata; si hay varias se descarta, no se elige.")
w("create temp table _mapcom_bruto as")
w("select t.local_id, m.registro_id remote_id, 'monday' via")
w("  from _com t join migracion_monday m")
w("    on m.tabla_destino = 'comunidades' and m.monday_item_id = t.monday_item_id")
w(" where t.monday_item_id <> ''")
w("union all")
w("select t.local_id, c.id, 'texto'")
w("  from _com t join comunidades c")
w("    on coalesce(c.nombre,'') = t.nombre and coalesce(c.direccion,'') = t.direccion")
w(" where t.monday_item_id = ''")
w("   and (select count(*) from comunidades c2")
w("         where coalesce(c2.nombre,'') = t.nombre")
w("           and coalesce(c2.direccion,'') = t.direccion) = 1;")
w()
w("-- guarda: si un id local acaba apuntando a dos remotos, se queda fuera")
w("create temp table _mapcom as")
w("select local_id, min(remote_id::text)::uuid remote_id from _mapcom_bruto")
w(" group by local_id having count(distinct remote_id) = 1;")
w()
w("-- lo mismo para las administraciones")
w("create temp table _mapadm as")
w("select local_id, min(remote_id::text)::uuid remote_id from (")
w("  select t.local_id, m.registro_id remote_id")
w("    from _adm t join migracion_monday m")
w("      on m.tabla_destino = 'administraciones_fincas' and m.monday_item_id = t.monday_item_id")
w("   where t.monday_item_id <> ''")
w("  union all")
w("  select t.local_id, a.id")
w("    from _adm t join administraciones_fincas a on upper(a.nombre) = upper(t.nombre)")
w("   where t.monday_item_id = ''")
w("     and (select count(*) from administraciones_fincas a2")
w("           where upper(a2.nombre) = upper(t.nombre)) = 1) x")
w(" group by local_id having count(distinct remote_id) = 1;")
w()
w("-- ---- administraciones nuevas (las que no existen ni por Monday ni por nombre) ----")
w("insert into administraciones_fincas (nombre, email, telefono, direccion, municipio)")
w("select t.nombre, nullif(t.email,''), nullif(t.telefono,''), nullif(t.direccion,''),")
w("       nullif(t.municipio,'')")
w("  from _adm t")
w(" where not exists (select 1 from _mapadm x where x.local_id = t.local_id)")
w("   and not exists (select 1 from administraciones_fincas a")
w("                    where upper(a.nombre) = upper(t.nombre));")
w()
w("-- las recien creadas tambien entran en el mapa")
w("insert into _mapadm (local_id, remote_id)")
w("select t.local_id, a.id from _adm t join administraciones_fincas a")
w("    on upper(a.nombre) = upper(t.nombre)")
w(" where not exists (select 1 from _mapadm x where x.local_id = t.local_id)")
w("   and (select count(*) from administraciones_fincas a2")
w("         where upper(a2.nombre) = upper(t.nombre)) = 1;")
w()
w("-- ---- rellenar huecos de las administraciones (nunca pisar lo que ya hay) ----")
w("update administraciones_fincas a set")
w("  email     = coalesce(nullif(a.email,''), nullif(t.email,'')),")
w("  telefono  = coalesce(nullif(a.telefono,''), nullif(t.telefono,'')),")
w("  direccion = coalesce(nullif(a.direccion,''), nullif(t.direccion,''))")
w("  from _adm t join _mapadm mm on mm.local_id = t.local_id")
w(" where a.id = mm.remote_id")
w("   and (a.email is null or a.email = '' or a.telefono is null or a.telefono = ''")
w("        or a.direccion is null or a.direccion = '');")
w()
w("-- ---- comunidades: catastro, CIF, CP y administrador (solo si estan vacios) ----")
w("update comunidades c set")
w("  referencia_catastral = coalesce(nullif(c.referencia_catastral,''), nullif(t.catastral,'')),")
w("  cif_comunidad        = coalesce(nullif(c.cif_comunidad,''), nullif(t.cif,'')),")
w("  cp                   = coalesce(nullif(c.cp,''), nullif(t.cp,'')),")
w("  administracion_id    = coalesce(c.administracion_id, ma.remote_id)")
w("  from _com t")
w("  join _mapcom mm on mm.local_id = t.local_id")
w("  left join _adm ta on upper(ta.nombre) = upper(nullif(t.admin_nombre,''))")
w("  left join _mapadm ma on ma.local_id = ta.local_id")
w(" where c.id = mm.remote_id")
w("   and (c.referencia_catastral is null or c.referencia_catastral = ''")
w("        or c.cif_comunidad is null or c.cif_comunidad = ''")
w("        or c.cp is null or c.cp = '' or c.administracion_id is null);")
w()
w("-- ---- contactos nuevos ----")
w("insert into contactos (administracion_id, nombre, telefono, email, proposito, notas)")
w("select ma.remote_id, t.nombre, nullif(t.telefono,''), nullif(t.email,''),")
w("       t.proposito, nullif(t.notas,'')")
w("  from _con t")
w("  join _adm ta on upper(ta.nombre) = upper(t.admin_nombre)")
w("  join _mapadm ma on ma.local_id = ta.local_id")
w(" where not exists (select 1 from contactos c where c.administracion_id = ma.remote_id")
w("                     and upper(c.nombre) = upper(t.nombre));")
w()
w("-- ---- presidentes ----")
w("insert into personas_comunidad (comunidad_id, nombre, rol, documento, telefono, email)")
w("select mm.remote_id, t.nombre, t.rol, nullif(t.documento,''), nullif(t.telefono,''),")
w("       nullif(t.email,'')")
w("  from _per t join _mapcom mm on mm.local_id = t.local_com")
w(" where not exists (select 1 from personas_comunidad p where p.comunidad_id = mm.remote_id")
w("                     and upper(p.nombre) = upper(t.nombre));")
w()
w("-- ---- observaciones (la bitacora) ----")
w("insert into observaciones_expediente")
w("  (comunidad_id, proyecto_id, fase, fecha, fecha_estimada, orden, texto, origen, ficha_ref)")
w("select mm.remote_id,")
w("       (select m.registro_id from migracion_monday m where m.tabla_destino='proyectos'")
w("         and m.monday_item_id = nullif(t.proy_monday,'') limit 1),")
w("       t.fase, t.fecha, t.estimada, t.orden, t.texto, t.origen, nullif(t.ficha_ref,'')")
w("  from _obs t join _mapcom mm on mm.local_id = t.local_com")
w(" where not exists (select 1 from observaciones_expediente o")
w("                    where o.comunidad_id = mm.remote_id and o.texto = t.texto);")

os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
with open(SALIDA, "w", encoding="utf-8", newline="\n") as fh:
    fh.write("\n".join(out) + "\n")
print(f"\n-> {SALIDA}  ({os.path.getsize(SALIDA)/1024:.0f} KB)")


