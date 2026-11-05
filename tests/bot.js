const {chromium}=require('playwright');
const seed=+process.argv[2]||1234, END=+process.argv[3]||7200;
(async()=>{const b=await chromium.launch();const p=await b.newPage();const er=[];p.on('pageerror',e=>er.push(e.message));await p.goto(''+'file://'+require('path').resolve(__dirname,'..','dist','index.html')+'');await p.waitForTimeout(1200);
const r=await p.evaluate(([seed,END])=>{const w=window.__sim;w.S.seed=seed;w.reset();w.S.running=true;const $=id=>document.getElementById(id);
 const rows=[];let done=false,sight=null;const WPS=[25,15,24,14];WPS.forEach(n=>{const d=w.DAMS.find(d=>d.wp===n);if(d){d.known=3;d.usable=true}});w.S.autoBF=false;let bfi=0;const A=[.7071,-.7071],L=[.7071,.7071];
 for(let t=0;t<END;t++){w.tick();const F=w.F,S=w.S;
  if(sight===null&&F.s>1){const first=w.units.some(u=>u.type!=='SUP'&&u.state!=='wait'&&w.edgeDist(u.x,u.y).d<1500);if(first){sight=S.t;$('bMT').click();$('bAIR').click()}}
  if(sight!==null){if(S.t>=sight+120&&(S.mtLevel||0)<15)$('bMT').click();if(S.t>=sight+240&&(S.mtLevel||0)<20)$('bMT').click();if(S.t>=sight+300&&(S.mtLevel||0)<30)$('bMT').click()}
  if(t%30===0&&sight!==null){w.units.filter(u=>u.type==='SUP'&&u.bf&&u.state==='idle'&&!u.__wp).forEach(u=>{const d=w.DAMS.find(d=>d.wp===WPS[bfi%WPS.length]);bfi++;u.__wp=1;if(d)w.issue(u,'wp',d.x,d.y)});
   const T=w.units.filter(u=>u.type!=='SUP'&&!u.fcv&&['idle','moving','attack','head','indirect'].includes(u.state));
   const cnt=new Map();let headN=0,ne=0,sw=0;
   for(const u of T){const tg=u.target;if(tg&&tg.type==='lobe'&&!tg.lobe.held)cnt.set(tg.lobe,(cnt.get(tg.lobe)||0)+1);else if(tg&&tg.type==='head')headN++;else if(tg&&tg.type==='flank'){(u.__side>0?ne++:sw++)}}
   const hd=w.realHead();
   for(const u of T){const tg=u.target;const busy=u.state!=='idle'&&tg&&!(tg.type==='lobe'&&tg.lobe.held);if(busy)continue;if(u.__a&&S.t-u.__a<120)continue;u.__a=S.t;
    let best=null,bd=4000;for(const l of F.lobes){if(l.held||!l.reported)continue;if((cnt.get(l)||0)>=(l.s>=120?3:2))continue;const g=[l.ox+l.dx*l.s*.6,l.oy+l.dy*l.s*.6];const d=Math.hypot(g[0]-u.x,g[1]-u.y);if(d<bd){bd=d;best={l,g}}}
    if(best){cnt.set(best.l,(cnt.get(best.l)||0)+1);w.issue(u,'direct',best.g[0],best.g[1]);continue}
    if(headN<6){headN++;w.issue(u,'direct',hd[0],hd[1]);continue}
    const side=(ne<=sw*1.9)?1:-1;u.__side=side;if(side>0)ne++;else sw++;const us=Math.max(200,F.s-700-((ne+sw)%4)*250),hw=side>0?F.hwL[Math.floor(us/40)+25]:F.hwR[Math.floor(us/40)+25];
    w.issue(u,'direct',A[0]*us+L[0]*side*(hw||150),A[1]*us+L[1]*side*(hw||150))}
  }
  if(t%300===0){const m=w.measures();const st={};w.units.forEach(u=>st[u.state]=(st[u.state]||0)+1);rows.push([t,Math.round(F.s),F.lobes.filter(l=>!l.held).length,Math.round(m.edge),F.pinched?'P':'-',F.contained?'C':'-',(F.urbLog?'URB':'ok'),Math.round(m.ha||F.area||0),JSON.stringify(st)].join(' '))}
  if(F.contained&&!done){done=true;rows.push('CONTAINED '+t)}
  if(done&&t>1e9)break}
 return `seed ${seed} sight ${sight}\n`+rows.join('\n')+'\nMT '+w.S.mtLevel+' hit '+w.S.hitM},[seed,END]);console.log(r.slice(0,3500));console.log(er);await b.close()})()
