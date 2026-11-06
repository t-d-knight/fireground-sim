// Air and ground effects must follow the new NE front after the wind change.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const html=fs.readFileSync(path.resolve(__dirname,'..','dist','index.html'),'utf8').replace('window.__sim={','window.__postwind={edgePt,airInit,airDrop,lineState,lineWork,lineTask,mkUnit,playerHeadGoal,assignPlayerHeadRoles,stepFire,fireRouteRisk,neFrontSupported,updateWx,DS,OFF};window.__sim={');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH});
 async function page(){const p=await browser.newPage();await p.evaluate(()=>window.requestAnimationFrame=()=>0);await p.setContent(html,{waitUntil:'domcontentloaded'});return p}
 try{
  const p=await page(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const effect=await p.evaluate(()=>{
   const w=window.__sim,r=window.__postwind;w.F.s=w.F.wcS=6000;w.F.kmRolled=6;w.F.wc=true;w.F.wcAt=4800;w.F.hwL.fill(800);w.F.hwR.fill(400);w.S.t=5000;w.F.gust=false;r.airInit();
   const i=r.OFF+75,q=r.edgePt(i,1),far=r.edgePt(i+20,1),probe=[q[0]-Math.SQRT1_2*100,q[1]-Math.SQRT1_2*100],other=[far[0]-Math.SQRT1_2*100,far[1]-Math.SQRT1_2*100],before=r.fireRouteRisk(...probe);
   r.airDrop({k:'head',x:q[0],y:q[1]});r.updateWx();
   const supported={local:r.neFrontSupported(i),far:r.neFrontSupported(i+20),risk:r.fireRouteRisk(...probe),farRisk:r.fireRouteRisk(...other),knock:r.lineState(1).knock[i],held:w.F.hL[i],oldAxisSlow:!!(w.F.airSlow>w.S.t),globalProgress:w.F.prog,hud:document.getElementById('wxHA').textContent,spread:document.getElementById('mBox').textContent};
   w.S.t+=241;const expired={window:r.neFrontSupported(i),risk:r.fireRouteRisk(...probe)};return{before,supported,expired};
  });
  assert.ok(effect.before>0);assert.equal(effect.supported.local,true);assert.equal(effect.supported.far,false);assert.equal(effect.supported.risk,0);assert.ok(effect.supported.farRisk>0);assert.equal(effect.supported.knock,1);assert.equal(effect.supported.held,0);assert.equal(effect.supported.oldAxisSlow,false);assert.equal(effect.supported.globalProgress,0);assert.match(effect.supported.hud,/NE front/);assert.match(effect.supported.hud,/air-supported/);assert.match(effect.supported.spread,/NE front up to/);assert.equal(effect.expired.window,false);assert.ok(effect.expired.risk>0);assert.deepEqual(errors,[]);await p.close();
  console.log('OK post-change head drops open only a local temporary NE follow-up window, without false secured line');
  const boundaryPage=await page();
  const boundary=await boundaryPage.evaluate(()=>{
   const w=window.__sim,r=window.__postwind;w.F.s=w.F.wcS=6000;w.F.kmRolled=6;w.F.wc=true;w.F.wcAt=4800;w.F.hwL.fill(800);w.F.hwR.fill(400);w.S.t=5000;w.F.gust=false;r.airInit();
   const i=r.OFF+75;for(let k=r.OFF;k<i;k++)w.F.hL[k]=1;const q=r.edgePt(i,1);r.airDrop({k:'head',x:q[0],y:q[1]});
   const behind=r.edgePt(i-1,1),unsupported=r.edgePt(i+6,1),inside=[behind[0]-Math.SQRT1_2*60,behind[1]-Math.SQRT1_2*60];
   return{supported:r.neFrontSupported(i),burntApproach:r.fireRouteRisk(...inside),unsupported:r.fireRouteRisk(...unsupported)};
  });
  assert.equal(boundary.supported,true);assert.equal(boundary.burntApproach,0);assert.ok(boundary.unsupported>0);await boundaryPage.close();
  console.log('OK completed line permits a burnt-side approach to a local drop while unsupported fire retains its head buffer');
  const groundPage=await page();
  const wet=await groundPage.evaluate(()=>{
   const w=window.__sim,r=window.__postwind;w.F.s=w.F.wcS=6000;w.F.kmRolled=6;w.F.wc=true;w.F.wcAt=4800;w.F.hwL.fill(800);w.F.hwR.fill(400);w.S.t=5000;w.F.gust=false;r.airInit();const i=r.OFF+75,q=r.edgePt(i,1);r.airDrop({k:'head',x:q[0],y:q[1]});
   const u=r.mkUnit({type:'TK',name:'air follow-up',state:'attack',tac:'direct',target:{type:'head',playerHead:true,focusMain:true,headIndex:i}});w.units.push(u);r.assignPlayerHeadRoles();const goal=r.playerHeadGoal(u);u.x=goal[0]-Math.SQRT1_2*60;u.y=goal[1]-Math.SQRT1_2*60;const task=r.lineTask(u,u.target),until=task.data.wet[task.i];r.lineWork(u,1);return{until,after:task.data.wet[task.i],mop:task.data.mop[task.i]||0};
  });
  assert.ok(wet.mop>0);assert.ok(wet.until>=5240);assert.ok(wet.after>=wet.until);await groundPage.close();
  console.log('OK ground follow-up never shortens an aircraft drop’s existing wet-coverage timer');
  async function growth(drop){const p=await page();try{return await p.evaluate(drop=>{
   const w=window.__sim,r=window.__postwind;w.F.s=w.F.wcS=6000;w.F.kmRolled=6;w.F.wc=true;w.F.wcAt=4800;w.F.hwL.fill(800);w.F.hwR.fill(400);w.S.t=5001;w.F.gust=false;
   const i=r.OFF+75,far=i+20,before=w.F.hwL[i],farBefore=w.F.hwL[far];if(drop){r.airInit();const q=r.edgePt(i,1);r.airDrop({k:'head',x:q[0],y:q[1]})}r.stepFire();return{near:w.F.hwL[i]-before,far:w.F.hwL[far]-farBefore};
  },drop)}finally{await p.close()}}
  const baseline=await growth(false),supported=await growth(true);assert.ok(baseline.near>0);assert.ok(supported.near<baseline.near*.25,JSON.stringify({baseline,supported}));assert.ok(Math.abs(supported.far-baseline.far)<.001);
  console.log('OK provisional knockdown slows the actual NE spread locally instead of the obsolete old-axis tip');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
