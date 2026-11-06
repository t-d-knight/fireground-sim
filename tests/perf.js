// Perf profile: times tick() and draw() in windows over a long run, plus a CPU profile of hot functions.
const {chromium}=require('playwright');
const seed=+process.argv[2]||1234, END=+process.argv[3]||14400, CPU=process.argv[4]==='cpu';
(async()=>{const b=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH});const p=await b.newPage({viewport:{width:1600,height:900}});
await p.goto('file://'+require('path').resolve(__dirname,'..','dist','index.html'));await p.waitForTimeout(1200);
const c=await p.context().newCDPSession(p);if(CPU){await c.send('Profiler.enable');await c.send('Profiler.setSamplingInterval',{interval:500});await c.send('Profiler.start')}
const r=await p.evaluate(([seed,END])=>{const w=window.__sim,$=id=>document.getElementById(id);w.S.seed=seed;w.reset();w.S.running=true;
 const rows=[];let tt=0,dt=0,tn=0,sight=null,mx=0;
 for(let t=0;t<END;t++){const a=performance.now();w.tick();const d=performance.now()-a;tt+=d;tn++;if(d>mx)mx=d;
  if(t%10===0){const a2=performance.now();w.draw();dt+=performance.now()-a2}
  if(sight===null&&w.F.s>1){sight=w.S.t;$('bMT').click();$('bAIR').click()}
  if(sight!==null){if(w.S.t>=sight+120&&(w.S.mtLevel||0)<15)$('bMT').click();if(w.S.t>=sight+240&&(w.S.mtLevel||0)<20)$('bMT').click();if(w.S.t>=sight+300&&(w.S.mtLevel||0)<30)$('bMT').click()}
  if(t%1200===1199){rows.push(`t=${t+1}s tick avg ${(tt/tn).toFixed(2)}ms max ${mx.toFixed(1)} | draw avg ${(dt/(tn/10)).toFixed(2)}ms | units ${w.units.length} lobes ${w.F.lobes.length} s=${Math.round(w.F.s)}`);tt=dt=tn=mx=0}}
 return rows.join('\n')},[seed,END]);console.log(r);
if(CPU){const {profile}=await c.send('Profiler.stop');const self=new Map(),dtm=profile.timeDeltas;const byId=new Map(profile.nodes.map(n=>[n.id,n]));
 profile.samples.forEach((id,i)=>{const n=byId.get(id),k=n.callFrame.functionName+':'+n.callFrame.lineNumber;self.set(k,(self.get(k)||0)+(dtm[i]||0))});
 const tot=[...self.values()].reduce((a,b)=>a+b,0);console.log('--- self time top 15');[...self.entries()].sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([k,v])=>console.log((v/tot*100).toFixed(1)+'%',k))}
await b.close()})()
