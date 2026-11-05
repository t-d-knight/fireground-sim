import json,math
LON0,LAT0=144.0686,-36.682
KX=111320*math.cos(math.radians(LAT0));KY=110574
g=json.load(open(__import__('sys').argv[1]))
old=json.load(open('map_old.json'))
def pr(c):return [round((c[0]-LON0)*KX),round((c[1]-LAT0)*KY)]
def dp(pts,tol):
    if len(pts)<3:return pts
    a,b=pts[0],pts[-1];dx,dy=b[0]-a[0],b[1]-a[1];L=math.hypot(dx,dy);dm=-1;im=0
    for i in range(1,len(pts)-1):
        p=pts[i];d=abs(dy*(p[0]-a[0])-dx*(p[1]-a[1]))/L if L else math.hypot(p[0]-a[0],p[1]-a[1])
        if d>dm:dm=d;im=i
    if dm>tol:return dp(pts[:im+1],tol)[:-1]+dp(pts[im:],tol)
    return [a,b]
def simp(c,tol):
    p=[pr(q) for q in c];q=[p[0]]
    for r in p[1:]:
        if r!=q[-1]:q.append(r)
    return dp(q,tol) if len(q)>2 else q
def area(p):
    s=0
    for i in range(len(p)):
        x1,y1=p[i];x2,y2=p[(i+1)%len(p)];s+=x1*y2-x2*y1
    return abs(s)/2
CLS={'motorway':'a','motorway_link':'a','trunk':'a','trunk_link':'a','primary':'a','primary_link':'a','secondary':'b','secondary_link':'b','tertiary':'c','tertiary_link':'c','unclassified':'d','residential':'r'}
roads=[];water=[];creeks=[];wood=[];res=[];pow_=[];farm=[]
IN=lambda p:abs(p[0]-5800)<9000 and -14000<p[1]<9000  # inner (detail) zone
for f in g['features']:
    p=f['properties'];gm=f['geometry'];t=gm['type']
    if t=='LineString':
        if 'highway' in p and p['highway'] in CLS:
            pts=simp(gm['coordinates'],2.5)
            if len(pts)>1:roads.append([CLS[p['highway']],p.get('name',''),pts])
        elif p.get('waterway') in ('river','stream','canal'):
            pts=simp(gm['coordinates'],4)
            if len(pts)>1:creeks.append(['d' if p['waterway']=='canal' else 's',p.get('name',''),pts])
        elif p.get('power')=='line':
            pts=simp(gm['coordinates'],6)
            if len(pts)>1:pow_.append(pts)
    elif t=='Polygon':
        ring=simp(gm['coordinates'][0],4)
        if len(ring)<4:continue
        a=area(ring);c=ring[0]
        if p.get('natural')=='water':
            if IN(c) or a>3000:water.append([p.get('name',''),ring])
        elif p.get('natural')=='wood' or p.get('landuse')=='forest':
            if a>2000:wood.append(ring)
        elif p.get('landuse')=='residential':
            if a>3000:res.append(ring)
        elif p.get('landuse') in ('farmland','grass','meadow','orchard','vineyard','farmyard'):
            if a>20000:farm.append([p['landuse'][0],ring])
# keep old tracks and service roads
nt=0
for r in old['roads']:
    if r[0]=='t' or 'ervice' in (r[1] or ''):
        roads.append(r);nt+=1
out={'roads':roads,'water':water,'creeks':creeks,'wood':wood,'res':res,'pow':pow_,'farm':farm}
json.dump(out,open('map.json','w'),separators=(',',':'))
import os;print({k:len(v) for k,v in out.items()},nt,os.path.getsize('map.json')/1e6,'MB')
