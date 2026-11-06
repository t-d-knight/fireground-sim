// Exercise route correctness and playback responsiveness without changing the shipped API.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const html = fs.readFileSync(path.resolve(__dirname, '..', 'dist', 'index.html'), 'utf8').replace('window.__sim={', `const originalDrawFire=drawFire;window.__fireDraws=0;drawFire=(...args)=>{window.__fireDraws++;return originalDrawFire(...args)};window.__performanceTest={draw,mkUnit,commandResources,flushOrders:()=>{advancingFrame=true;try{passPendingOrders(performance.now())}finally{advancingFrame=false}},NX,NY,ADJ,fireRouteField,fireRouteRisk,firePathClear,fireApproachNode,roadWork:()=>roadWork,stepFire,loop,backlog:()=>acc,setSlowTick:()=>{tick=()=>{const start=performance.now();while(performance.now()-start<4){}S.t++;renderUnits();mapLogRender()}}};window.__sim={`);
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(()=>window.requestAnimationFrame=()=>0);await page.setContent(html,{waitUntil:'domcontentloaded'});
  const routes=await page.evaluate(()=>{
   const w=window.__sim,r=window.__performanceTest,points=[[0,0],[5830,-5574],[12134,-6801],[-11175,8750],[7926,-16968],[19341,-8274]];
   const ids=new Map(r.NX.map((x,i)=>[x+','+r.NY[i],i]));
   const cost=(route,rough)=>{if(!route)return null;const pen=rough?{a:1,b:1,c:1.1,d:1.2,t:1.6,r:1.8,w:1}:{a:1,b:1.1,c:1.3,d:1.8,t:5,r:3,w:1};let total=0;for(let i=1;i<route.path.length;i++){const a=ids.get(route.path[i-1].join(',')),b=ids.get(route.path[i].join(','));total+=Math.min(...r.ADJ[a].filter(e=>e[0]===b).map(e=>e[1]/e[2]*pen[e[3]]))}return total};
   const results=[];for(const rough of[false,true])for(let i=1;i<points.length;i++){const a=w.nearestNode(...points[i-1]),b=w.nearestNode(...points[i]);results.push({astar:cost(w.route(a,b,rough),rough),dijkstra:cost(w.route(a,b,rough,true),rough)})}return results;
  });
  for(const r of routes){assert.notEqual(r.astar,null);assert.ok(Math.abs(r.astar-r.dijkstra)<1e-6,JSON.stringify(r))}
  console.log('OK goal-directed road routes match Dijkstra weighted costs');
  const isolated=await page.evaluate(()=>{
   const w=window.__sim,r=window.__performanceTest,a=w.nearestNode(0,0),b=w.nearestNode(5830,-5574),field=r.fireRouteField(),gen=r.roadWork().gen;
   for(const e of r.ADJ[b])field.blocked[e[4]]=3;
   delete field.connectivity;const noRoute=w.route(a,b),searched=r.roadWork().gen!==gen;
   w.S.t++;const recovered=w.route(a,b);return{blocked:noRoute===null,searched,recovered:!!recovered};
  });
  assert.deepEqual(isolated,{blocked:true,searched:false,recovered:true});
  console.log('OK isolated road goals are rejected before a full search and reopening invalidates connectivity');
  const approach=await page.evaluate(()=>{
   const w=window.__sim,r=window.__performanceTest;w.reset();const a=w.nearestNode(0,0),b=w.nearestNode(5830,-5574),field=r.fireRouteField();for(const e of r.ADJ[b])field.blocked[e[4]]=3;delete field.connectivity;
   const chosen=r.fireApproachNode(r.NX[b],r.NY[b],a);return{different:chosen!==b,reachable:chosen>=0&&!!w.route(a,chosen)};
  });
  assert.deepEqual(approach,{different:true,reachable:true});
  console.log('OK long approaches choose a reachable road instead of an isolated nearest road');
  const escape=await page.evaluate(()=>{
   const w=window.__sim,r=window.__performanceTest;w.reset();const a=w.nearestNode(0,0),x=r.NX[a],y=r.NY[a];w.F.lobes.push({ox:x-200,oy:y,dx:1,dy:0,s:200,lb:4,held:false,kind:'s'});
   const exposed=r.fireRouteRisk(x,y)>0,goals=[[2000,0],[0,2000],[-2000,0],[0,-2000]];
   const escaped=goals.some(q=>{const b=w.nearestNode(x+q[0],y+q[1]),route=w.route(a,b);return route&&r.firePathClear(route.path)});return{exposed,escaped};
  });
  assert.deepEqual(escape,{exposed:true,escaped:true});
  console.log('OK exposed road starts retain one-way escape routes');
  const weather=await page.evaluate(()=>{
   const w=window.__sim,r=window.__performanceTest;w.reset();w.F.s=2000;w.F.kmRolled=2;w.F.gust=true;w.F.gustUntil=2;w.F.brk={id:'test-road',name:'test road',x:Math.SQRT1_2*2000,y:-Math.SQRT1_2*2000};w.S.t=3;r.stepFire();return{eased:!w.F.gust,heldAtSameKm:w.F.kmRolled===2};
  });
  assert.deepEqual(weather,{eased:true,heldAtSameKm:true});
  console.log('OK a gust expires even when the head remains held in the same kilometre');
  const commands=await page.evaluate(()=>{
   const w=window.__sim,r=window.__performanceTest;w.reset();w.NV.spd=new Float32Array(w.NV.w*w.NV.h).fill(12/3.6);
   const a=r.mkUnit({type:'TK',name:'first order',x:5830,y:-5574}),b=r.mkUnit({type:'TK',name:'second order',x:5600,y:-5800});w.units.push(a,b);w.S.sel.add(a.id);w.S.sel.add(b.id);
   r.commandResources([a,b],'go',5000,-5000,undefined,true);r.commandResources([a,b],'go',5200,-6200,undefined,true);const pending=w.pendingOrders;
   document.getElementById('cv').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));const cleared=w.S.sel.size===0&&w.pendingOrders===2;
   for(let i=0;i<100&&w.pendingOrders;i++)r.flushOrders();const latest=[a,b].every(u=>u.tgt&&u.tgt.px===5200&&u.tgt.py===-6200);
   r.commandResources([a,b],'go',5100,-6100,undefined,true);w.issue(a,'go',5400,-6500);for(let i=0;i<100&&w.pendingOrders;i++)r.flushOrders();
   return{pending,cleared,latest,newerWins:a.tgt&&a.tgt.px===5400&&a.tgt.py===-6500,drained:w.pendingOrders===0};
  });
  assert.equal(commands.pending,2);assert.equal(commands.cleared,true);assert.equal(commands.latest,true);assert.equal(commands.newerWins,true);assert.equal(commands.drained,true);
  console.log('OK deferred group orders keep latest intent, survive deselection and respect newer direct orders');
  const radio=await page.evaluate(()=>{
   const w=window.__sim,r=window.__performanceTest;w.reset();w.NV.spd=new Float32Array(w.NV.w*w.NV.h).fill(12/3.6);w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;w.S.comms=false;
   const u=r.mkUnit({type:'TK',name:'radio tanker',x:0,y:0,cap:3000,water:1000,res:600}),sup=r.mkUnit({type:'SUP',name:'radio water',x:0,y:0,state:'wpoint',stock:5000});w.units.push(u,sup);
   w.issue(u,'fill',0,0,{src:{kind:'sup',unit:sup}});w.issue(u,'direct',Math.SQRT1_2*6000,-Math.SQRT1_2*6000,{playerClick:true});const queued=w.S.queued.length;
   const cb=document.getElementById('fCom');cb.checked=true;cb.dispatchEvent(new Event('change',{bubbles:true}));for(let i=0;i<100&&w.pendingOrders;i++)r.flushOrders();
   return{queued,fill:u.state==='moving'&&u.tgt&&u.tgt.kind==='fill',resume:u.resume&&u.resume.playerClick&&u.resume.headRequest&&u.resume.headRequest.focusMain,pending:w.pendingOrders};
  });
  assert.deepEqual(radio,{queued:2,fill:true,resume:true,pending:0});
  console.log('OK restored radio orders preserve fill-then-head sequencing for the same tanker');
  const drawing=await page.evaluate(()=>{
   const w=window.__sim,r=window.__performanceTest;w.reset();w.F.s=3000;w.F.hwL.fill(200);w.F.hwR.fill(200);const u=r.mkUnit({type:'TK',name:'visible tanker',x:2000,y:-2000});w.units.push(u);
   const cv=document.getElementById('cv');r.draw();const first=cv.toDataURL(),count=window.__fireDraws;r.draw();const same=first===cv.toDataURL(),reused=window.__fireDraws===count;
   w.S.sel.add(u.id);r.draw();const overlayChanged=cv.toDataURL()!==first,overlayReused=window.__fireDraws===count;
   w.S.t++;r.draw();const tickInvalidated=window.__fireDraws===count+1;w.view().cx+=200;r.draw();const panInvalidated=window.__fireDraws===count+2;
   return{same,reused,overlayChanged,overlayReused,tickInvalidated,panInvalidated};
  });
  assert.ok(Object.values(drawing).every(Boolean),JSON.stringify(drawing));
  console.log('OK cached map/fire pixels stay identical while live selection, tick and pan changes redraw correctly');
  const playback=await page.evaluate(()=>{
   const w=window.__sim,r=window.__performanceTest;w.reset();r.setSlowTick();w.S.running=true;w.S.speed=60;r.loop(1000);r.loop(1250);const first=w.S.t,pending=r.backlog();
   for(let i=0;i<20&&r.backlog()>=1;i++)r.loop(1250);
   const final=w.S.t;w.reset();return{first,pending,final,reset:r.backlog()};
  });
  assert.ok(playback.first>0&&playback.first<15,JSON.stringify(playback));assert.ok(playback.pending>=1);assert.equal(playback.final,15);assert.equal(playback.reset,0);
  console.log('OK accelerated playback yields between batches without dropping simulation ticks');
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
