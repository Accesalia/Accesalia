import re, unicodedata, csv, collections
def norm(s):
    s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().upper()
    return s
RUIDO={'HOJA','DE','ENCARGO','HE','C','CL','CALLE','AV','AVDA','AVENIDA','PASEO','PS','PZA','PLAZA','DEL','LA','EL','LOS','LAS','Y','BORRADOR','DOCX','PDF','GDOC','DOC'}
def clave(nombre):
    n=norm(re.sub(r'\.[a-z]+$','',nombre,flags=re.I))
    n=re.sub(r'\d{1,2}[-./ ]\d{1,2}[-./ ](20)?\d{2}','',n)   # fechas fuera
    m=re.search(r'^(.*?)(\d+)',n)
    if not m: return None
    calle=[w for w in re.findall(r'[A-Z]+',m.group(1)) if w not in RUIDO]
    if not calle: return None
    return (frozenset(calle), m.group(2))
def fecha(nombre):
    m=re.search(r'(\d{1,2})[-./ ](\d{1,2})[-./ ]((?:20)?\d{2})(?!\d)',nombre)
    if not m: return None
    y=m.group(3); y=('20'+y) if len(y)==2 else y
    return f"{y}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
fuentes=collections.defaultdict(list)
for row in csv.reader(open('fuentes.tsv',encoding='utf-8'),delimiter='\t'):
    ruta=row[2]; nom=ruta.split('/')[-1]; k=clave(nom)
    if k: fuentes[k].append((ruta.split('/')[1], nom))
res=collections.Counter(); sin=[]; filas=[]
for row in csv.reader(open('firmados.tsv',encoding='utf-8'),delimiter='\t'):
    nom=row[2].split('/')[-1]
    if nom.lower().endswith(('.ini','.gsheet','.tmp')): continue
    f=fecha(nom); reciente = f is not None and f>='2024-10-06'
    k=clave(nom)
    c=fuentes.get(k,[]) if k else []
    estado='sin_clave' if not k else ('ninguna' if not c else ('una' if len(c)==1 else 'varias'))
    res[(estado, 'reciente' if reciente else ('antigua' if f else 'sin_fecha'))]+=1
    filas.append((nom,f or '',estado,len(c),' | '.join(n for _,n in c[:4])))
    if estado in('ninguna','sin_clave'): sin.append((f or '',nom))
for k in sorted(res): print(k,res[k])
csv.writer(open('cruce.tsv','w',encoding='utf-8',newline=''),delimiter='\t').writerows(filas)
print('\n-- sin pareja, muestra recientes'); 
for f,n in sorted(sin,reverse=True)[:25]: print(f,n)
