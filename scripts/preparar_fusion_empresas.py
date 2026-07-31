# -*- coding: utf-8 -*-
r"""
Genera la migracion que lleva el cotejo de empresas a PRODUCCION.

Lo que hace la migracion generada:
  1. Crea las administraciones nuevas (las que no casan con ninguna).
  2. Renombra las que Monica pidio renombrar (erratas, franquicias).
  3. Vincula las comunidades a su administracion, SOLO donde este vacio.
  4. Rellena email/telefono/direccion SOLO donde estén vacios.

Nunca pisa un valor que ya exista. Si el nuestro y el de la app discrepan, se
queda el de la app: puede estar actualizado a mano y el de la ficha ser de 2022.

Los UUID de local y de produccion NO coinciden: la comunidad viaja por
migracion_monday.monday_item_id, que es el unico puente comun. La
administracion viaja por su UUID de produccion, que es lo que guarda el cotejo.

Uso: python scripts/preparar_fusion_empresas.py
"""
import sys, io, re, csv, subprocess
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

V2 = r"C:\accesalia-fichas\cotejo_empresas_v2.csv"
COL_FINAL = "nombre definitivo para la app, sea o no el mismo que esta (por las erratas)"
SALIDA = r"c:\Users\mfavi\ACCESALIA\supabase\migrations\20260729120000_fusion_empresas_admin.sql"
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "--csv"]

def sql(q):
    r = subprocess.run(DB + ["-c", q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    t = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(t); sys.exit(1)
    return list(csv.DictReader(io.StringIO(t)))

def lit(v):
    if v is None or v == "":
        return "''"
    return "'" + str(v).replace("'", "''") + "'"

g = lambda f, k: (f.get(k) or "").strip()

# Renombrados que no vienen de la hoja v2 pero tienen igual autoridad: los que
# Monica dijo en la primera hoja y los apellidos de franquicia, decididos con la
# direccion de la ficha como prueba.
AUTORIDAD_EXTRA = {"Lozano Masipie SLP", "INMHO GESTION de La propiedad SLU",
                   "MARCAL ASESORES", "MARCAL LEGANES", "AEA FINCAS"}

# Que nombres finales los escribio ELLA: son los que mandan si hay choque.
suyos = set()
for f in csv.DictReader(open(V2, encoding="utf-8-sig")):
    if g(f, COL_FINAL) and g(f, "empresa_id"):
        suyos.add(g(f, "empresa_id"))

cot = sql("""
select c.empresa_id, c.decision, coalesce(c.administracion_id::text,'') aid,
       c.administracion, c.nombre_final, e.nombre nuestra,
       e.email, e.telefono, e.direccion, e.n_comunidades
  from migracion_admin_cotejo c join migracion_admin_empresa e on e.id=c.empresa_id""")

vinculos = sql("""
select m.monday_item_id, r.empresa_id, r.comunidad
  from migracion_admin_revision r
  join migracion_monday m on m.registro_id = r.comunidad_id and m.tabla_destino='comunidades'
 where r.empresa_id is not null""")

# ---------- 1. nuevas ----------
nuevas = [c for c in cot if c["decision"] != "es_la_misma"]

# ---------- 2. renombrados ----------
por_admin = defaultdict(list)
for c in cot:
    if c["decision"] == "es_la_misma" and c["aid"]:
        por_admin[c["aid"]].append(c)

renombrar, choques = [], []
for aid, cs in por_admin.items():
    actual = cs[0]["administracion"]
    quiere = {c["nombre_final"] for c in cs
              if (c["empresa_id"] in suyos or re.sub(r"[^A-Z0-9]","",c["nuestra"].upper()) in {re.sub(r"[^A-Z0-9]","",x.upper()) for x in AUTORIDAD_EXTRA})
              and c["nombre_final"]}
    if len(quiere) > 1:
        choques.append((actual, sorted(quiere)))
        continue
    if quiere:
        nuevo = quiere.pop()
        if nuevo != actual:
            renombrar.append((aid, actual, nuevo))

# ---------- 3. vinculos ----------
admin_de = {c["empresa_id"]: c for c in cot}
pares = []
for v in vinculos:
    c = admin_de.get(v["empresa_id"])
    if not c:
        continue
    pares.append((v["monday_item_id"], c["aid"], c["nombre_final"] or c["nuestra"]))

print(f"administraciones nuevas   : {len(nuevas)}")
print(f"renombrados               : {len(renombrar)}")
print(f"vinculos comunidad->admin : {len(pares)}")
print(f"\nCHOQUES de nombre (no se renombran, se dejan como estan): {len(choques)}")
for actual, q in choques:
    print(f"   {actual[:34]:34} <- {' || '.join(x[:40] for x in q)}")
print("\nrenombrados que se aplicarian:")
for aid, a, n in renombrar:
    print(f"   {a[:40]:40} -> {n}")

# ---------- SQL ----------
NORM = ("regexp_replace(upper(translate(%s,'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNAEIOUUN')),"
        "'[^A-Z0-9]','','g')")

filas_nuevas = ",\n    ".join(
    f"({lit(c['nombre_final'] or c['nuestra'])}, {lit(c['email'])}, "
    f"{lit(c['telefono'])}, {lit(c['direccion'])})" for c in nuevas)
filas_pares = ",\n    ".join(
    f"({lit(mi)}, {('%s::uuid' % lit(aid)) if aid else 'null'}, {lit(nom)})"
    for mi, aid, nom in pares)
filas_relleno = ",\n    ".join(
    f"({lit(c['aid'])}::uuid, {lit(c['email'])}, {lit(c['telefono'])}, {lit(c['direccion'])})"
    for c in cot if c["decision"] == "es_la_misma" and c["aid"]
    and (c["email"] or c["telefono"] or c["direccion"]))

sql_txt = f"""-- =============================================================================
-- ERP Accesalia — Fusion de las administraciones sacadas de las fichas
--
-- Sale del puente migracion_admin_cotejo, ya revisado por Monica: 313 empresas
-- nuestras que se resuelven en 206 de las que ya existen + {len(nuevas)} nuevas.
--
-- REGLA: no se pisa NUNCA un valor que ya exista. Los huecos se rellenan; una
-- discrepancia se deja como esta. El dato de la app puede estar actualizado a
-- mano y el de la ficha ser de hace tres anos.
--
-- La comunidad viaja por monday_item_id porque los UUID de local y produccion
-- no coinciden. La administracion viaja por su UUID de produccion.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Administraciones nuevas ({len(nuevas)})
--    El "not exists" compara con la MISMA normalizacion con la que se agrupo.
--    Comparar el nombre en crudo fue lo que creo 150 empresas duplicadas.
-- ---------------------------------------------------------------------------
insert into administraciones_fincas (nombre, email, telefono, direccion)
select v.nombre, nullif(v.email,''), nullif(v.telefono,''), nullif(v.direccion,'')
from (values
    {filas_nuevas}
) v(nombre, email, telefono, direccion)
where not exists (
  select 1 from administraciones_fincas a
   where {NORM % 'a.nombre'} = {NORM % 'v.nombre'});

-- ---------------------------------------------------------------------------
-- 2. Renombrados que pidio Monica ({len(renombrar)})
-- ---------------------------------------------------------------------------
"""
for aid, actual, nuevo in renombrar:
    sql_txt += (f"update administraciones_fincas set nombre = {lit(nuevo)}\n"
                f" where id = {lit(aid)}::uuid and nombre = {lit(actual)};\n")

sql_txt += f"""
-- ---------------------------------------------------------------------------
-- 3. Vinculo comunidad -> administracion ({len(pares)} pares)
--    Solo donde la comunidad NO tiene administracion. La aportacion de esta
--    migracion es justamente este vinculo: la app no lo tenia.
-- ---------------------------------------------------------------------------
create temp table _vinc (monday_item_id text, admin_id uuid, admin_nombre text) on commit drop;
insert into _vinc values
    {filas_pares};

-- las nuevas no tienen UUID hasta que se crean: se resuelven por nombre
update _vinc v set admin_id = a.id
  from administraciones_fincas a
 where v.admin_id is null
   and {NORM % 'a.nombre'} = {NORM % 'v.admin_nombre'};

update comunidades c
   set administracion_id = v.admin_id
  from _vinc v
  join migracion_monday m on m.monday_item_id = v.monday_item_id
                         and m.tabla_destino = 'comunidades'
 where c.id = m.registro_id
   and c.administracion_id is null
   and v.admin_id is not null;

-- ---------------------------------------------------------------------------
-- 4. Rellenar SOLO huecos vacios
-- ---------------------------------------------------------------------------
create temp table _dato (admin_id uuid, email text, telefono text, direccion text) on commit drop;
insert into _dato values
    {filas_relleno};

update administraciones_fincas a
   set email     = coalesce(nullif(a.email,''),     nullif(d.email,'')),
       telefono  = coalesce(nullif(a.telefono,''),  nullif(d.telefono,'')),
       direccion = coalesce(nullif(a.direccion,''), nullif(d.direccion,''))
  from _dato d
 where a.id = d.admin_id
   and (coalesce(a.email,'') = '' or coalesce(a.telefono,'') = ''
        or coalesce(a.direccion,'') = '');
"""

with open(SALIDA, "w", encoding="utf-8") as fh:
    fh.write(sql_txt)
print(f"\n-> {SALIDA}  ({len(sql_txt) // 1024} KB)")
