const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const html=fs.readFileSync(process.env.SIM_HTML||path.resolve(__dirname,'..','dist/index.html'),'utf8').replace('window.__sim={','window.__accounting={stepFire,DS,OFF};window.__sim={');
(async()=>{const b=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH});try{const p=await b.newPage();await p.evaluate(()=>window.requestAnimationFrame=()=>0);await p.setContent(html,{waitUntil:'domcontentloaded'});
 const r=await p.evaluate(()=>{const w=window.__sim,t=window.__accounting;w.F.s=2000;w.F.kmRolled=2;w.F.gust=false;w.S.t=600;w.F.hwL.fill(0);w.F.hwR.fill(0);let expected=0;for(let i=t.OFF;i<=t.OFF+50;i++){w.F.hwL[i]=w.F.hwR[i]=i%2?500:100;w.F.hL[i]=w.F.hR[i]=1;if(i>t.OFF)expected+=2*Math.hypot(t.DS,400)}const complete=w.measures();t.stepFire();const contained=!!w.F.contained;w.F.hL.fill(0);w.F.hR.fill(0);w.F.hL[t.OFF+1]=w.F.hL[t.OFF+2]=1;const partial=w.measures();return{complete,expected,contained,partial,oneSegment:Math.hypot(t.DS,400)}});
 assert.ok(Math.abs(r.complete.per-r.expected)<.001,JSON.stringify(r));assert.ok(Math.abs(r.complete.held-r.expected)<.001);assert.ok(Math.abs(r.complete.edge-100)<1e-6);console.log('OK secured and total edges use the same curved-segment distances');
 assert.equal(r.contained,true);console.log('OK a fully secured irregular fire can reach the existing containment threshold');
 assert.ok(Math.abs(r.partial.held-r.oneSegment)<.001,JSON.stringify(r));assert.ok(r.partial.edge>0&&r.partial.edge<100);console.log('OK a single marked endpoint does not claim its neighbouring unheld segments');await p.close();
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
