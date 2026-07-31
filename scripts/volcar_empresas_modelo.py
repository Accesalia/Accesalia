# -*- coding: utf-8 -*-
r"""
Vuelca al modelo limpio (empresa · empresa_departamento · correo) lo que ya
esta consolidado y revisado en la migracion.

De donde sale cada cosa:
  empresa               una fila por empresa real del cotejo, con el nombre que
                        Monica dio por definitivo
  correo (de empresa)   los correos que NO parecen de un departamento
  empresa_departamento  los buzones compartidos (info@, facturas@, obras@...),
                        que no son de nadie sino de la casa
  correo (de departamento)  el buzon de cada uno

Los correos de PERSONA no entran aqui: van con su puesto, en el paso siguiente.

Idempotente: casa por nombre, no duplica. No borra nada que ya este.

DRY-RUN por defecto. --apply para escribir.
Uso: python scripts/volcar_empresas_modelo.py [--apply]
"""
import sys, io, re, csv, subprocess
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

APPLY = "--apply" in sys.argv
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"]

# Buzones que son de la casa, no de una persona. Sale de mirar los 724 correos
# reales: son los prefijos que se repiten en empresas distintas.
DEPARTAMENTOS = {
    "info": "informacion", "informacion": "informacion", "oficina": "informacion",
    "atencion": "informacion", "administracion": "administracion",
    "admon": "administracion", "administraciondefincas": "administracion",
    "comunidades": "comunidades", "fincas": "comunidades", "juntas": "comunidades",
    "factura": "facturacion", "facturas": "facturacion", "facturacion": "facturacion",
    "contabilidad": "contabilidad", "proveedores": "proveedores",
    "obras": "obras", "incidencias": "incidencias", "mantenimiento": "incidencias",
    "secretaria": "secretaria", "tramites": "tramites", "gestion": "gestion",
    "avisos": "incidencias", "rgpd": "rgpd", "rgdp": "rgpd",
}

def sql(q):
    r = subprocess.run(DB + ["--csv", "-c", q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    t = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(t); sys.exit(1)
    return list(csv.DictReader(io.StringIO(t)))

def esc(s):
    return "'" + (s or "").replace("'", "''") + "'"

def lim(v, n=200):
    v = re.sub(r"\s+", " ", (v or "")).strip()
    return v[:n]

RE_MAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")

# ---------- de donde salen las empresas ----------
filas = sql("""
select c.empresa_id, coalesce(nullif(c.nombre_final,''), e.nombre) nombre,
       c.decision, e.email, e.telefono, e.direccion, e.n_comunidades
  from migracion_admin_cotejo c
  join migracion_admin_empresa e on e.id = c.empresa_id
 order by e.n_comunidades desc""")

# varias empresas nuestras pueden acabar en la misma: se juntan por nombre final
por_nombre = defaultdict(list)
for f in filas:
    n = lim(f["nombre"], 160)
    if n:
        por_nombre[n.lower()].append(f)

empresas, correos_emp, deptos = [], [], []
for clave, fs in por_nombre.items():
    nombre = lim(fs[0]["nombre"], 160)
    tel = next((lim(f["telefono"], 60) for f in fs if f["telefono"]), "")
    dire = next((lim(f["direccion"], 200) for f in fs if f["direccion"]), "")
    vistos = set()
    for f in fs:
        for m in RE_MAIL.findall(f["email"] or ""):
            m = m.lower().rstrip(".,;")
            if m in vistos:
                continue
            vistos.add(m)
            buzon = re.sub(r"[^a-z]", "", m.split("@")[0])
            depto = DEPARTAMENTOS.get(buzon)
            # un buzon con numero (colegiado9971@) no es un departamento
            if depto and not re.search(r"\d", m.split("@")[0]):
                deptos.append((nombre, depto, m))
            else:
                correos_emp.append((nombre, m))
    empresas.append({"nombre": nombre, "telefono": tel, "direccion": dire,
                     "n": sum(int(f["n_comunidades"]) for f in fs)})

print(f"empresas a crear            : {len(empresas)}")
print(f"  (vienen de {len(filas)} filas del cotejo, agrupadas por nombre definitivo)")
print(f"departamentos con buzon     : {len(deptos)}  ({len({(n,d) for n,d,_ in deptos})} distintos)")
print(f"correos directos de empresa : {len(correos_emp)}")
print("\n  departamentos que salen:")
for d, n in sorted(defaultdict(int, {d: sum(1 for x in deptos if x[1] == d)
                                     for _, d, _ in deptos}).items(), key=lambda x: -x[1])[:12]:
    print(f"     {d:16} {n}")

if not APPLY:
    print("\nDRY-RUN. --apply para escribir.")
    sys.exit(0)

# ---------- escritura ----------
ve = ",".join(f"({esc(e['nombre'])},{esc(e['telefono'])},{esc(e['direccion'])})" for e in empresas)
vd = ",".join(f"({esc(n)},{esc(d)})" for n, d, _ in {(n, d, "") for n, d, _ in deptos})
vc = ",".join(f"({esc(n)},{esc(m)})" for n, m in correos_emp)
vcd = ",".join(f"({esc(n)},{esc(d)},{esc(m)})" for n, d, m in deptos)

stmt = f"""
create temp table _e (nombre text, telefono text, direccion text);
insert into _e values {ve};
insert into empresa (nombre_accesalia, telefono, direccion)
select e.nombre, nullif(e.telefono,''), nullif(e.direccion,'') from _e e
 where not exists (select 1 from empresa x
                    where lower(btrim(x.nombre_accesalia)) = lower(btrim(e.nombre)));

create temp table _d (nombre text, departamento text);
insert into _d values {vd};
insert into empresa_departamento (empresa_id, departamento)
select x.id, d.departamento from _d d
  join empresa x on lower(btrim(x.nombre_accesalia)) = lower(btrim(d.nombre))
 where not exists (select 1 from empresa_departamento y
                    where y.empresa_id = x.id and lower(btrim(y.departamento)) = lower(btrim(d.departamento)));

create temp table _c (nombre text, direccion text);
insert into _c values {vc};
insert into correo (empresa_id, direccion)
select x.id, c.direccion from _c c
  join empresa x on lower(btrim(x.nombre_accesalia)) = lower(btrim(c.nombre))
 where not exists (select 1 from correo y where y.empresa_id = x.id
                    and lower(btrim(y.direccion)) = lower(btrim(c.direccion)));

create temp table _cd (nombre text, departamento text, direccion text);
insert into _cd values {vcd};
insert into correo (departamento_id, direccion)
select dp.id, c.direccion from _cd c
  join empresa x on lower(btrim(x.nombre_accesalia)) = lower(btrim(c.nombre))
  join empresa_departamento dp on dp.empresa_id = x.id
       and lower(btrim(dp.departamento)) = lower(btrim(c.departamento))
 where not exists (select 1 from correo y where y.departamento_id = dp.id
                    and lower(btrim(y.direccion)) = lower(btrim(c.direccion)));

-- el primero de cada dueno queda como principal
update correo c set principal = true
 where c.id in (select distinct on (coalesce(empresa_id, departamento_id)) id
                  from correo where puesto_id is null
                 order by coalesce(empresa_id, departamento_id), creado_en, id)
   and not exists (select 1 from correo o where o.principal
                    and coalesce(o.empresa_id, o.departamento_id)
                      = coalesce(c.empresa_id, c.departamento_id));
"""
r = subprocess.run(DB, input=("begin;\n" + stmt + "commit;").encode("utf-8"),
                   stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
if r.returncode:
    print(r.stdout.decode("utf-8", "replace")); sys.exit(1)

c = sql("""select (select count(*) from empresa) empresas,
                  (select count(*) from empresa_departamento) departamentos,
                  (select count(*) from correo) correos,
                  (select count(*) from correo where principal) principales""")[0]
print(f"\nHECHO: {c['empresas']} empresas, {c['departamentos']} departamentos, "
      f"{c['correos']} correos ({c['principales']} principales)")
