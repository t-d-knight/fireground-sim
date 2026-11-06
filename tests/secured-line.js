// Wind change must distinguish completed follow-up from temporary/legacy holds.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const html=fs.readFileSync(process.env.SIM_HTML||path.resolve(__dirname,'..','dist/index.html'),'utf8')
 .replace('window.__sim={','window.__securedTest={windChange,lineState,mkUnit,edgePt};window.__sim={');
(async()=>{const b=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH});try{
 const p=await b.newPage();await p.evaluate(()=>window.requestAnimationFrame=()=>0);await p.setContent(html,{waitUntil:'domcontentloaded'});
 const r=await p.evaluate(()=>{const w=window.__sim,t=window.__securedTest;w.F.s=1200;w.F.hwL.fill(200);w.F.hwR.fill(200);
  const d=t.lineState(1);for(const i of[26,27,28])w.F.hL[i]=1;d.knock[26]=d.knock[27]=1;d.mop[26]=1;d.mop[27]=.5;
  t.windChange();return{complete:w.F.hL[26],partial:w.F.hL[27],legacy:w.F.hL[28],untouched:w.F.hL[29],contained:!!w.F.contained};
 });
 assert.equal(r.complete,1);assert.equal(r.partial,0);assert.equal(r.legacy,0);assert.equal(r.untouched,0);assert.equal(r.contained,false);
 console.log('OK completed blackout survives wind change while incomplete unattended holds fail');await p.close();
 const q=await b.newPage();await q.evaluate(()=>window.requestAnimationFrame=()=>0);await q.setContent(html,{waitUntil:'domcontentloaded'});
 const fallback=await q.evaluate(()=>{const w=window.__sim,t=window.__securedTest;w.F.s=1200;w.F.hwL.fill(400);w.F.hwR.fill(200);const d=t.lineState(1);w.F.hL[26]=1;d.knock[26]=d.mop[26]=1;
  const v=t.edgePt(26,1),u=t.mkUnit({type:'TK',name:'withdrawn follow-up',state:'idle',x:v[0]-Math.SQRT1_2*200,y:v[1]-Math.SQRT1_2*200,safetyHold:true});w.units.push(u);const before=[u.x,u.y];t.windChange();return{held:w.F.hL[26],idle:u.state==='idle',safeHold:u.safetyHold,positionUnchanged:u.x===before[0]&&u.y===before[1],unheld:w.F.hL[27]};
 });
 assert.deepEqual(fallback,{held:1,idle:true,safeHold:true,positionUnchanged:true,unheld:0});console.log('OK protecting crews in burnt ground does not erase completed line or reopen their attack');await q.close();
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
